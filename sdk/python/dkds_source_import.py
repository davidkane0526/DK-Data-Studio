#!/usr/bin/env python3
"""Static Python/Jupyter source import for DK Data Studio plugin authoring.

User source is never executed. Python AST parsing normalizes .py and .ipynb code
cells into one Source Model, the existing portable-task compiler supplies the
fail-closed compatibility decision, and a selected function can be lowered into
one ordinary declarative Plugin API package.
"""
from __future__ import annotations

import argparse
import ast
import json
import re
import sys
import textwrap
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from dkds_plugin_gen import PluginBuilder, SpecError
from dkds_portable_task import PortableTaskError, compile_portable_task

SOURCE_MODEL_SCHEMA="dkds.python-source-model.v1"
BLUEPRINT_SCHEMA="dkds.declarative-blueprint.v1"
REPORT_SCHEMA="dkds.python-authoring-report.v1"
_IDENT_SAFE=re.compile(r"[^A-Za-z0-9._-]+")
_IDENT=re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
_ERROR_LINE=re.compile(r"\(line\s+(\d+)\)")
_SCALAR_ROOTS={"int","float","bool","str"}
_ARTIFACT_ROOTS={"list"}

@dataclass(frozen=True)
class SourceFunction:
    id:str
    name:str
    source:str
    source_kind:str
    source_name:str
    line:int
    end_line:int
    cell_index:int|None
    node:ast.FunctionDef|ast.AsyncFunctionDef

def _json_write(path:Path,value:Any)->None:
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

def _slug(value:str,fallback:str="generated")->str:
    text=_IDENT_SAFE.sub("-",str(value or "").strip()).strip("-._").lower()
    return text or fallback

def _annotation_text(node:ast.AST|None)->str:
    if node is None:return ""
    try:return ast.unparse(node)
    except Exception:return ""

def _annotation_root(node:ast.AST|None)->str:
    text=_annotation_text(node)
    return text.split("[",1)[0].split(".")[-1] if text else ""

def _literal_default(node:ast.AST|None)->tuple[bool,Any]:
    if node is None:return False,None
    try:return True,ast.literal_eval(node)
    except Exception:return False,None

def _function_source(source:str,node:ast.FunctionDef|ast.AsyncFunctionDef)->tuple[str,int,int]:
    lines=source.splitlines()
    start=int(getattr(node,"lineno",1) or 1)
    if node.decorator_list:
        start=min(start,*(int(getattr(row,"lineno",start) or start) for row in node.decorator_list))
    end=int(getattr(node,"end_lineno",start) or start)
    return textwrap.dedent("\n".join(lines[start-1:end]))+"\n",start,end

def _magic_diagnostics(source:str,*,cell_index:int)->tuple[str,list[dict[str,Any]]]:
    rows=source.splitlines()
    diagnostics=[]
    if rows and rows[0].lstrip().startswith("%%"):
        diagnostics.append({"severity":"error","code":"NOTEBOOK_CELL_MAGIC_UNSUPPORTED","message":"Jupyter cell magics cannot be converted to a portable DKDS task.","cellIndex":cell_index,"line":1})
        return "\n".join("pass" if row.strip() else "" for row in rows),diagnostics
    sanitized=[]
    for index,row in enumerate(rows,start=1):
        stripped=row.lstrip()
        if stripped.startswith(("%","!","?")):
            sanitized.append(row[:len(row)-len(stripped)]+"pass")
            diagnostics.append({"severity":"error","code":"NOTEBOOK_MAGIC_UNSUPPORTED","message":"Jupyter magic/shell syntax is not part of portable Python.","cellIndex":cell_index,"line":index})
        else:sanitized.append(row)
    return "\n".join(sanitized),diagnostics

def _read_document(path:Path)->tuple[dict[str,Any],list[SourceFunction],list[dict[str,Any]]]:
    suffix=path.suffix.lower()
    if suffix not in {".py",".ipynb"}:raise ValueError("Source import accepts only .py or .ipynb files")
    diagnostics=[]
    functions=[]
    if suffix==".py":
        source=path.read_text(encoding="utf-8-sig")
        try:tree=ast.parse(source,filename=path.name,mode="exec")
        except SyntaxError as exc:
            diagnostics.append({"severity":"error","code":"PYTHON_SYNTAX_ERROR","message":exc.msg,"line":int(exc.lineno or 0),"column":int(exc.offset or 0)})
            tree=ast.Module(body=[],type_ignores=[])
        for node in tree.body:
            if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)):
                fn_source,start,end=_function_source(source,node)
                functions.append(SourceFunction(f"py:{start}:{node.name}",node.name,fn_source,"python",path.name,start,end,None,node))
        return {"schema":SOURCE_MODEL_SCHEMA,"kind":"python","name":path.name,"path":str(path),"cells":[{"index":0,"kind":"code","lineCount":len(source.splitlines())}]},functions,diagnostics

    notebook=json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(notebook,dict) or not isinstance(notebook.get("cells"),list):
        raise ValueError("Invalid Jupyter notebook: cells array is missing")
    cells=[]
    for cell_index,cell in enumerate(notebook["cells"]):
        if not isinstance(cell,dict):continue
        cell_type=str(cell.get("cell_type",""))
        raw=cell.get("source","")
        source="".join(raw) if isinstance(raw,list) else str(raw or "")
        cells.append({"index":cell_index,"kind":cell_type or "unknown","lineCount":len(source.splitlines()),"executionCount":cell.get("execution_count")})
        if cell_type!="code":continue
        sanitized,magic_rows=_magic_diagnostics(source,cell_index=cell_index)
        diagnostics.extend(magic_rows)
        try:tree=ast.parse(sanitized,filename=f"{path.name}#cell-{cell_index}",mode="exec")
        except SyntaxError as exc:
            diagnostics.append({"severity":"error","code":"PYTHON_SYNTAX_ERROR","message":exc.msg,"cellIndex":cell_index,"line":int(exc.lineno or 0),"column":int(exc.offset or 0)})
            continue
        for node in tree.body:
            if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)):
                fn_source,start,end=_function_source(sanitized,node)
                functions.append(SourceFunction(f"cell:{cell_index}:{start}:{node.name}",node.name,fn_source,"jupyter",path.name,start,end,cell_index,node))
    return {"schema":SOURCE_MODEL_SCHEMA,"kind":"jupyter","name":path.name,"path":str(path),"nbformat":notebook.get("nbformat"),"nbformatMinor":notebook.get("nbformat_minor"),"cells":cells},functions,diagnostics

def _parameter_row(arg:ast.arg,kind:str,default:ast.AST|None)->dict[str,Any]:
    literal_ok,literal=_literal_default(default)
    row={"name":arg.arg,"kind":kind,"annotation":_annotation_text(arg.annotation),"annotationRoot":_annotation_root(arg.annotation),"required":default is None and kind not in {"var-positional","var-keyword"}}
    if default is not None:
        row["defaultSource"]=ast.unparse(default)
        if literal_ok:row["default"]=literal
    return row

def _parameters(node:ast.FunctionDef|ast.AsyncFunctionDef)->list[dict[str,Any]]:
    positional=[*node.args.posonlyargs,*node.args.args]
    first_default=len(positional)-len(node.args.defaults)
    defaults={}
    for index,arg in enumerate(positional):
        defaults[arg.arg]=node.args.defaults[index-first_default] if index>=first_default else None
    for arg,default in zip(node.args.kwonlyargs,node.args.kw_defaults):defaults[arg.arg]=default
    out=[*[_parameter_row(arg,"positional-only",defaults.get(arg.arg)) for arg in node.args.posonlyargs],*[_parameter_row(arg,"positional",defaults.get(arg.arg)) for arg in node.args.args]]
    if node.args.vararg:out.append(_parameter_row(node.args.vararg,"var-positional",None))
    out.extend(_parameter_row(arg,"keyword-only",defaults.get(arg.arg)) for arg in node.args.kwonlyargs)
    if node.args.kwarg:out.append(_parameter_row(node.args.kwarg,"var-keyword",None))
    return out

def _return_shape(node:ast.FunctionDef|ast.AsyncFunctionDef)->dict[str,Any]:
    keys=set()
    metrics=set()
    returned_names={}
    row_columns=set()
    for ret in (row for row in ast.walk(node) if isinstance(row,ast.Return)):
        if not isinstance(ret.value,ast.Dict):continue
        for key_node,value_node in zip(ret.value.keys,ret.value.values):
            if not isinstance(key_node,ast.Constant) or not isinstance(key_node.value,str):continue
            key=key_node.value
            keys.add(key)
            if isinstance(value_node,ast.Name):returned_names[key]=value_node.id
            if key not in {"points","rows"} and not isinstance(value_node,(ast.List,ast.Dict,ast.Tuple,ast.Set)):metrics.add(key)
    rows_var=returned_names.get("rows")
    if rows_var:
        for call in (row for row in ast.walk(node) if isinstance(row,ast.Call)):
            fn=call.func
            if not (isinstance(fn,ast.Attribute) and fn.attr=="append" and isinstance(fn.value,ast.Name) and fn.value.id==rows_var):continue
            if len(call.args)!=1 or not isinstance(call.args[0],ast.Dict):continue
            for key_node in call.args[0].keys:
                if isinstance(key_node,ast.Constant) and isinstance(key_node.value,str):row_columns.add(key_node.value)
    return {"dictKeys":sorted(keys),"metricKeys":sorted(metrics),"hasPoints":"points" in keys,"hasRows":"rows" in keys,"rowColumns":sorted(row_columns)}

def _diag(fn:SourceFunction,code:str,message:str,line:int,local_line:int|None=None)->dict[str,Any]:
    row={"severity":"error","code":code,"message":message,"functionId":fn.id,"function":fn.name,"line":line}
    if local_line is not None:row["functionLine"]=local_line
    if fn.cell_index is not None:
        row["cellIndex"]=fn.cell_index
        if local_line is not None:row["cellLine"]=line
    return row

def _compatibility(fn:SourceFunction)->dict[str,Any]:
    if isinstance(fn.node,ast.AsyncFunctionDef):
        return {"portable":False,"diagnostics":[_diag(fn,"PORTABLE_ASYNC_UNSUPPORTED","Portable tasks must be synchronous.",fn.line)]}
    try:
        compiled=compile_portable_task("probe-"+_slug(fn.name),fn.source,function_name=fn.name)
        return {"portable":True,"taskParameters":list(compiled.parameters),"diagnostics":[]}
    except PortableTaskError as exc:
        message=str(exc)
        match=_ERROR_LINE.search(message)
        local=int(match.group(1)) if match else None
        line=fn.line+local-1 if local else fn.line
        return {"portable":False,"diagnostics":[_diag(fn,"PORTABLE_UNSUPPORTED",message,line,local)]}

def _parameter_mode(row:dict[str,Any])->tuple[str,str|None]:
    root=str(row.get("annotationRoot") or "")
    if root in _SCALAR_ROOTS:return "parameter",None
    if root in _ARTIFACT_ROOTS:return "artifact-column",None
    if not root and "default" in row and isinstance(row["default"],(str,int,float,bool)):return "parameter",None
    return "unresolved",f"Parameter {row['name']} needs an explicit portable scalar or list annotation before automatic blueprint generation."

def _field(row:dict[str,Any])->dict[str,Any]:
    name=row["name"]
    field_id=_slug(name).replace(".","-")
    root=str(row.get("annotationRoot") or "")
    default=row.get("default")
    if root in {"int","float"} or (not root and isinstance(default,(int,float)) and not isinstance(default,bool)):
        return {"id":field_id,"type":"number","label":name,"value":0 if default is None else default}
    if root=="bool" or (not root and isinstance(default,bool)):
        return {"id":field_id,"type":"checkbox","label":name,"value":bool(default) if default is not None else False}
    return {"id":field_id,"type":"text","label":name,"value":"" if default is None else str(default)}

def _blueprint(model:dict[str,Any],fn_row:dict[str,Any],fn:SourceFunction)->dict[str,Any]:
    diagnostics=[]
    fields=[]
    bindings={}
    for param in fn_row["parameters"]:
        mode,error=_parameter_mode(param)
        if error:
            diagnostics.append({"severity":"error","code":"BLUEPRINT_INPUT_UNRESOLVED","message":error,"functionId":fn.id,"function":fn.name,"line":fn.line,**({"cellIndex":fn.cell_index} if fn.cell_index is not None else {})})
        elif mode=="parameter":
            field=_field(param);fields.append(field);bindings[param["name"]]={"kind":"parameter","field":field["id"]}
        else:
            bindings[param["name"]]={"kind":"artifact-column","source":{"kind":"data.table","index":0,"includeExcluded":False},"column":{"key":param["name"]},"maxRows":65536}

    stem=_slug(Path(model["name"]).stem)
    fn_slug=_slug(fn.name)
    title=f"{Path(model['name']).stem} · {fn.name}"
    shape=fn_row["returnShape"]
    content=[{"kind":"note","variant":"meta","text":f"Generated from {model['name']}::{fn.name}; Python is authoring-time only."}]
    result_plots=[];result_tables=[];result_metrics=[]
    if shape.get("hasPoints"):
        content.append({"kind":"plot","id":"result-plot","title":"Result","xTitle":"X","yTitle":"Y","source":"generated-result","points":[]})
        result_plots.append({"id":"result-plot","key":"points"})
    if shape.get("hasRows") and shape.get("rowColumns"):
        invalid=[key for key in shape["rowColumns"] if not _IDENT.fullmatch(str(key))]
        if invalid:
            diagnostics.append({"severity":"error","code":"BLUEPRINT_TABLE_KEY_UNSUPPORTED","message":"Automatic result-table generation requires identifier-safe row keys; unsupported: "+", ".join(map(str,invalid)),"functionId":fn.id,"function":fn.name,"line":fn.line,**({"cellIndex":fn.cell_index} if fn.cell_index is not None else {})})
        else:
            content.append({"kind":"table","id":"result-table","title":"Result rows","columns":[{"key":str(key),"label":str(key)} for key in shape["rowColumns"]],"rows":[]})
            result_tables.append({"id":"result-table","key":"rows"})
    if shape.get("metricKeys"):
        items=[]
        for key in shape["metricKeys"]:
            metric_id="metric-"+_slug(key).replace(".","-")
            items.append({"id":metric_id,"label":key,"value":"—"})
            result_metrics.append({"id":metric_id,"key":key})
        content.append({"kind":"metrics","id":"result-metrics","items":items})

    plugin_id=f"generated.{stem}.{fn_slug}"
    page_id=f"{stem}-{fn_slug}"
    spec={
        "schema":"dkds.declarative-plugin.v1",
        "plugin":{"id":plugin_id,"name":title,"version":"1.0.0","description":f"Generated from {model['name']} function {fn.name}.","order":940},
        "page":{"id":page_id,"label":fn.name,"title":title,"subtitle":"Python/Jupyter Source Import → Portable Task","variant":"analysis","close":True},
        "workspace":{"activity":page_id,"primaryRole":"scientific-primary","primaryLabel":"主界面","primaryScroll":"safe","mainLayout":"stack-comfortable"},
        "host":{"kind":"top","label":fn.name,"contextLabel":title,"icon":"◇","window":{"title":title,"width":1280,"height":820,"minWidth":860,"minHeight":560,"reuse":True,"persistence":"project","artifactHydration":"live"}},
        "data":{"accepts":["data.table"]},
        "actions":[{"id":"run","label":"运行","variant":"primary","statusMessage":f"正在执行 {fn.name}…"}],
        "content":content,
    }
    if fields:spec["parameters"]={"id":"parameters","label":"参数","fields":fields}
    task={"id":"run-"+fn_slug,"functionId":fn.id,"functionName":fn.name,"actionId":"run","inputBindings":bindings,"resultPlots":result_plots,"resultTables":result_tables,"resultMetrics":result_metrics,"successStatus":"任务完成"}
    preview={"title":title,"source":model["name"],"function":fn.name,"parameters":fields,"artifactInputs":[name for name,binding in bindings.items() if binding["kind"]=="artifact-column"],"outputs":[*([{"kind":"plot","label":"points"}] if result_plots else []),*([{"kind":"table","label":"rows"}] if result_tables else []),*[{"kind":"metric","label":row["key"]} for row in result_metrics]],"unitFirst":True,"privateCss":False}
    return {"schema":BLUEPRINT_SCHEMA,"buildable":bool(fn_row["compatibility"]["portable"] and not diagnostics),"diagnostics":diagnostics,"spec":spec,"task":task,"preview":preview}

def analyze(path:str|Path)->dict[str,Any]:
    source_path=Path(path).expanduser().resolve()
    model,functions,diagnostics=_read_document(source_path)
    rows=[]
    for fn in functions:
        row={"id":fn.id,"name":fn.name,"line":fn.line,"endLine":fn.end_line,**({"cellIndex":fn.cell_index} if fn.cell_index is not None else {}),"async":isinstance(fn.node,ast.AsyncFunctionDef),"parameters":_parameters(fn.node),"returnAnnotation":_annotation_text(fn.node.returns),"returnShape":_return_shape(fn.node),"compatibility":_compatibility(fn)}
        row["blueprint"]=_blueprint(model,row,fn)
        rows.append(row)
    model={**model,"functionCount":len(rows),"functions":rows}
    all_diagnostics=[*diagnostics]
    for row in rows:
        all_diagnostics.extend(row["compatibility"].get("diagnostics",[]))
        all_diagnostics.extend(row["blueprint"].get("diagnostics",[]))
    return {"schema":REPORT_SCHEMA,"sourceModel":model,"diagnostics":all_diagnostics,"portableFunctionCount":sum(1 for row in rows if row["compatibility"]["portable"]),"buildableFunctionCount":sum(1 for row in rows if row["blueprint"]["buildable"])}

def _selected(path:Path,function_id:str)->tuple[dict[str,Any],SourceFunction,dict[str,Any]]:
    model,functions,_=_read_document(path)
    report=analyze(path)
    selected=next((row for row in report["sourceModel"]["functions"] if row["id"]==function_id),None)
    fn=next((row for row in functions if row.id==function_id),None)
    if selected is None or fn is None:raise ValueError(f"Selected function no longer exists in source: {function_id}")
    return model,fn,selected

def build_package(path:str|Path,function_id:str)->tuple[dict[str,Any],dict[str,Any]]:
    source_path=Path(path).expanduser().resolve()
    model,fn,selected=_selected(source_path,function_id)
    blueprint=selected["blueprint"]
    if not blueprint["buildable"]:
        messages=[row["message"] for row in [*selected["compatibility"].get("diagnostics",[]),*blueprint.get("diagnostics",[])]]
        raise ValueError("Selected function is not automatically buildable: "+"; ".join(messages))
    builder=PluginBuilder(blueprint["spec"])
    task=blueprint["task"]
    builder.add_portable_task(task["id"],fn.source,action_id=task["actionId"],input_bindings=task["inputBindings"],result_plots=task["resultPlots"],result_tables=task["resultTables"],result_metrics=task["resultMetrics"],success_status=task["successStatus"],function_name=fn.name)
    package=builder.package()
    report={"schema":REPORT_SCHEMA,"source":{"name":model["name"],"kind":model["kind"],"functionId":fn.id,"function":fn.name},"blueprint":blueprint,"package":{"id":package["manifest"]["id"],"name":package["manifest"]["name"],"version":package["manifest"]["version"],"files":sorted(package["files"])},"sourceExecuted":False,"pythonRuntimeRequiredByPlugin":False}
    return package,report

def main(argv:Iterable[str]|None=None)->int:
    parser=argparse.ArgumentParser(description="Static Python/Jupyter source import for DK Data Studio")
    sub=parser.add_subparsers(dest="command",required=True)
    analyze_cmd=sub.add_parser("analyze",help="produce Source Model, signatures, compatibility and blueprints")
    analyze_cmd.add_argument("source",type=Path);analyze_cmd.add_argument("--output",type=Path,required=True)
    build_cmd=sub.add_parser("build",help="build one selected portable function into a .dkplugin JSON package")
    build_cmd.add_argument("source",type=Path);build_cmd.add_argument("--function-id",required=True);build_cmd.add_argument("--package",type=Path,required=True);build_cmd.add_argument("--report",type=Path,required=True)
    args=parser.parse_args(list(argv) if argv is not None else None)
    try:
        if args.command=="analyze":
            _json_write(args.output,analyze(args.source));print(f"DKDS source import analyzed: {args.source} -> {args.output}");return 0
        package,report=build_package(args.source,args.function_id)
        _json_write(args.package,package);_json_write(args.report,report)
        print(f"DKDS source import built: {report['package']['id']}@{report['package']['version']} -> {args.package}");return 0
    except (OSError,ValueError,json.JSONDecodeError,SpecError,PortableTaskError) as exc:
        print(f"DKDS source import error: {exc}",file=sys.stderr);return 2

if __name__=="__main__":
    raise SystemExit(main())
