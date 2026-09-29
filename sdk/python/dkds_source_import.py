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
from dkds_source_workflow import analyze_workflow
from dkds_table_transform import analyze_table_transform
from dkds_table_transform_task import analyze_table_transform_execution, compile_table_transform_task

SOURCE_MODEL_SCHEMA="dkds.python-source-model.v2"
BLUEPRINT_SCHEMA="dkds.declarative-blueprint.v1"
REPORT_SCHEMA="dkds.python-authoring-report.v2"
WORKFLOW_CANDIDATE_ID="workflow:table-transform"
MULTI_ACTION_CANDIDATE_ID="workflow:multi-action"
WORKFLOW_COMPOSITION_SCHEMA="dkds.workflow-composition.v1"
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


def _workflow_blueprint(source_name:str,workflow:dict[str,Any],*,candidate_id:str=WORKFLOW_CANDIDATE_ID,id_prefix:str="workflow",action_id:str="run",action_label:str="运行工作流",task_id:str="run-workflow",input_binding_overrides:dict[str,dict[str,Any]]|None=None,publish_overrides:dict[str,dict[str,Any]]|None=None)->dict[str,Any]:
    plan=workflow.get("tableTransformPlan") or {}
    execution=plan.get("execution") or {}
    diagnostics=[dict(row) for row in execution.get("diagnostics",[])]
    source_inputs=list(execution.get("sourceInputs") or [])
    result_symbols=list(execution.get("resultSymbols") or [])
    result_kinds=dict(execution.get("resultKinds") or {})
    result_projections=dict(execution.get("resultProjections") or {})
    host_effects=list(execution.get("hostEffects") or [])
    input_binding_overrides={str(key):dict(value) for key,value in (input_binding_overrides or {}).items()}
    publish_overrides={str(key):dict(value) for key,value in (publish_overrides or {}).items()}
    source_ops={
        str(row.get("output","")):row
        for row in plan.get("operations",[])
        if row.get("kind") in {"source.table","source.value"} and row.get("output")
    }
    stem=_slug(Path(source_name).stem)
    title=f"{Path(source_name).stem} · Workflow"
    fields=[]
    bindings={}
    source_bindings=[]
    for symbol in source_inputs:
        override=input_binding_overrides.get(symbol)
        if override is not None:
            bindings[symbol]=dict(override)
            source=dict(override.get("source") or {})
            source_bindings.append({"symbol":symbol,"field":str(override.get("sourceField","") or ""),"hint":str(override.get("sourceHint","") or ""),"scope":str(source.get("scope","sources") or "sources"),"artifactId":str(source.get("artifactId","") or ""),"semanticType":str(source.get("semanticType","") or "")})
            continue
        source_op=source_ops.get(symbol,{})
        source_hint=str(source_op.get("sourceHint","") or "")
        hint_label=source_hint.replace("\\","/").split("/")[-1] if source_hint else symbol
        field_id="source-"+_slug(symbol).replace(".","-")
        fields.append({
            "id":field_id,"type":"select","label":f"数据源 · {hint_label}",
            "value":"","options":[{"value":"","label":"请选择数据源"}],
        })
        bindings[symbol]={
            "kind":"artifact-table",
            "source":{"kind":"data.table","index":0,"includeExcluded":False},
            "sourceField":field_id,"sourceHint":source_hint,
            "maxRows":65536,"maxColumns":1024,
        }
        source_bindings.append({"symbol":symbol,"field":field_id,"hint":source_hint,"scope":"sources","artifactId":"","semanticType":""})
    content=[{"kind":"note","variant":"meta","text":f"Generated from {source_name}; Python/Pandas/NumPy are authoring-time only. External sources use scoped DKDS DataTables; selected Stage boundaries may bind exact canonical table/Series/Array/scalar Artifacts while Unit result projections remain unchanged."}]
    dynamic_plots=[]
    task_host_effects=[]
    for effect_index,effect in enumerate(host_effects):
        input_symbol=str(effect.get("input",""))
        result_path="tables."+input_symbol
        if effect.get("kind")=="scientific-plot":
            kwargs=dict(effect.get("kwargs") or {})
            plot_id=f"{id_prefix}-plot-{effect_index+1}"
            content.append({
                "kind":"plot","id":plot_id,
                "title":str(kwargs.get("title") or f"Workflow plot · {input_symbol}"),
                "xTitle":str(kwargs.get("xlabel") or kwargs.get("x") or "Index"),
                "yTitle":str(kwargs.get("ylabel") or ""),
                "source":"generated-workflow-table","points":[],
            })
            dynamic_plots.append({"id":plot_id,"resultPath":result_path,"x":kwargs.get("x"),"y":kwargs.get("y")})
        elif effect.get("kind")=="clipboard-table":
            task_host_effects.append({
                "kind":"clipboard-table","resultPath":result_path,
                "index":bool(effect.get("index",True)),"header":bool(effect.get("header",True)),
                "sep":str(effect.get("sep","\t")),
            })
        elif effect.get("kind")=="csv-export-table":
            task_host_effects.append({
                "kind":"csv-export-table","resultPath":"rawTables."+input_symbol,
                "defaultName":str(effect.get("defaultName","export.csv")),
                "sep":str(effect.get("sep",",")),"naRep":str(effect.get("naRep","")),
                "header":bool(effect.get("header",True)),"index":bool(effect.get("index",True)),
                "columns":effect.get("columns"),"encoding":str(effect.get("encoding","utf-8")),
                "lineTerminator":str(effect.get("lineTerminator","\n")),
            })

    result_tables=[]
    result_metrics=[]
    metric_items=[]
    for index,symbol in enumerate(result_symbols):
        kind=result_kinds.get(symbol,"")
        projection=result_projections.get(symbol) or {}
        projection_key=str(projection.get("key",""))
        if kind in {"series","array"}:
            table_id=f"{id_prefix}-{kind}-{index+1}"
            content.append({
                "kind":"table","id":table_id,"title":f"{'Series' if kind=='series' else 'Array'} · {symbol}",
                "columns":[{"key":"index","label":"Index"},{"key":"value","label":"Value"}],"rows":[],
            })
            result_tables.append({"id":table_id,"key":projection_key})
        elif kind=="scalar":
            metric_id=f"{id_prefix}-metric-{index+1}"
            metric_items.append({"id":metric_id,"label":symbol,"value":"—"})
            result_metrics.append({"id":metric_id,"key":projection_key})
    if metric_items:
        content.append({"kind":"metrics","id":f"{id_prefix}-scalars","items":metric_items})

    spec={
        "schema":"dkds.declarative-plugin.v1",
        "plugin":{"id":f"generated.{stem}.workflow","name":title,"version":"1.0.0","description":f"Generated from {source_name} Table Transform workflow.","order":940},
        "page":{"id":f"{stem}-workflow","label":"Workflow","title":title,"subtitle":"Python/Jupyter Source Workflow → Core Task","variant":"analysis","close":True},
        "workspace":{"activity":f"{stem}-workflow","primaryRole":"scientific-primary","primaryLabel":"主界面","primaryScroll":"safe","mainLayout":"stack-comfortable"},
        "host":{"kind":"top","label":"Workflow","contextLabel":title,"icon":"◇","window":{"title":title,"width":1280,"height":820,"minWidth":860,"minHeight":560,"reuse":True,"persistence":"project","artifactHydration":"live"}},
        "data":{"accepts":["data.table"],"produces":["generated.table-transform"]},
        "actions":[{"id":action_id,"label":action_label,"variant":"primary","statusMessage":f"正在执行 {action_label}…"}],
        "content":content,
    }
    if fields:
        spec["parameters"]={"id":"sources","label":"数据源","fields":fields,"priority":10,"embedded":False,"autoOpen":True,"stateVersion":"1"}
    dynamic=[]
    dynamic_artifacts=[]
    for symbol in result_symbols:
        value_kind=result_kinds.get(symbol)
        override=publish_overrides.get(symbol) or {}
        if value_kind=="table":
            dynamic.append({
                "id":str(override.get("id") or (f"{id_prefix}-result-"+_slug(symbol).replace(".","-"))),
                "name":str(override.get("name") or f"Workflow result · {symbol}"),
                "semanticType":str(override.get("semanticType") or "generated.table-transform"),
                "resultPath":"tables."+symbol,"maxRows":65536,"maxColumns":1024,
            })
        elif override and value_kind in {"series","array","scalar"}:
            result_bucket={"series":"series","array":"arrays","scalar":"values"}[value_kind]
            dynamic_artifacts.append({
                "id":str(override.get("id")),
                "name":str(override.get("name") or f"Workflow result · {symbol}"),
                "semanticType":str(override.get("semanticType")),
                "resultPath":result_bucket+"."+symbol,"valueKind":value_kind,
                "maxRows":65536 if value_kind!="scalar" else 1,
            })
    produced_types=list(dict.fromkeys([row["semanticType"] for row in [*dynamic,*dynamic_artifacts]])) or ["generated.table-transform"]
    spec["data"]["produces"]=produced_types
    return {
        "schema":BLUEPRINT_SCHEMA,
        "candidateId":candidate_id,
        "buildable":bool(execution.get("executable") and source_inputs and (result_symbols or host_effects) and not diagnostics),
        "diagnostics":diagnostics,
        "spec":spec,
        "task":{
            "id":task_id,"actionId":action_id,"inputBindings":bindings,
            "resultTables":result_tables,"resultMetrics":result_metrics,
            "dynamicPublishTables":dynamic,"dynamicPublishArtifacts":dynamic_artifacts,"dynamicTablePlots":dynamic_plots,
            "hostEffects":task_host_effects,"successStatus":f"{action_label}完成",
        },
        "preview":{
            "title":title,"source":source_name,"kind":"workflow",
            "sourceInputs":source_inputs,"sourceBindings":source_bindings,
            "resultSymbols":result_symbols,"resultKinds":result_kinds,
            "hostEffects":host_effects,"workflowSlice":dict(plan.get("workflowSlice") or {}),"unitFirst":True,"privateCss":False,
        },
    }



def _operation_inputs(op:dict[str,Any])->list[str]:
    out=[]
    if op.get("input"):out.append(str(op["input"]))
    out.extend(str(value) for value in op.get("inputs",[]) if value)
    for key in ("x","y"):
        if op.get(key):out.append(str(op[key]))
    for key in ("left","right"):
        value=op.get(key)
        if isinstance(value,dict) and value.get("kind")=="symbol" and value.get("name"):out.append(str(value["name"]))
    return list(dict.fromkeys(out))


def _artifact_chained_plan(plan:dict[str,Any],boundaries:list[dict[str,Any]])->dict[str,Any]:
    if not boundaries:return plan
    execution=dict(plan.get("execution") or analyze_table_transform_execution(plan))
    operations=[dict(row) for row in plan.get("operations",[])]
    boundary_by_symbol={str(row.get("symbol","")):dict(row) for row in boundaries if row.get("symbol")}
    producer={str(row.get("output","")):index for index,row in enumerate(operations) if row.get("output")}
    required=set();used=set();visiting=set()
    def require_symbol(symbol:str)->None:
        name=str(symbol or "")
        if not name:return
        if name in boundary_by_symbol:
            used.add(name);return
        index=producer.get(name)
        if index is None or index in required:return
        if index in visiting:raise ValueError(f"Artifact stage chain encountered an operation cycle at {name}.")
        visiting.add(index);required.add(index)
        for dependency in _operation_inputs(operations[index]):require_symbol(dependency)
        visiting.remove(index)
    for symbol in execution.get("taskOutputSymbols") or []:require_symbol(str(symbol))
    for index,op in enumerate(operations):
        if str(op.get("kind","")) in {"view.plot","host.clipboard","host.export"}:
            required.add(index)
            for dependency in _operation_inputs(op):require_symbol(dependency)
    used_boundaries=[boundary_by_symbol[name] for name in boundary_by_symbol if name in used]
    synthetic=[]
    for row in used_boundaries:
        symbol=str(row["symbol"]);synthetic.append({"id":f"artifact-source:{symbol}","kind":"source.value","valueKind":str(row.get("valueKind","value")),"cellIndex":int(row.get("consumerCellIndex",0)),"line":0,"output":symbol,"originalFormat":"artifact","sourceHint":str(row.get("artifactId","")),"hostCapability":"data.artifacts","replacement":"canonical DKDS Artifact input","artifactBoundary":{"producerStageId":str(row.get("producerStageId","")),"producerRootId":str(row.get("producerRootId","")),"artifactId":str(row.get("artifactId","")),"semanticType":str(row.get("semanticType","")),"valueKind":str(row.get("valueKind","value"))}})
    kept=[operations[index] for index in range(len(operations)) if index in required and str(operations[index].get("output","")) not in used]
    chained={**plan,"operations":[*synthetic,*kept]}
    old_slice=dict(plan.get("workflowSlice") or {})
    retained_cells=[]
    for row in kept:
        cell=int(row.get("cellIndex",0))
        if cell not in retained_cells:retained_cells.append(cell)
    delegated_cells=[int(value) for value in old_slice.get("includedCells",[]) if int(value) not in retained_cells]
    chained["workflowSlice"]={**old_slice,"includedCells":retained_cells,"delegatedCells":delegated_cells,"artifactBoundaries":[dict(row) for row in used_boundaries]}
    chained["artifactChain"]={"schema":"dkds.artifact-stage-chain.v1","boundaries":[dict(row) for row in used_boundaries],"retainedOperationIds":[str(row.get("id","")) for row in kept],"delegatedOperationIds":[str(row.get("id","")) for index,row in enumerate(operations) if index not in required or str(row.get("output","")) in used]}
    chained["execution"]=analyze_table_transform_execution(chained)
    chained["buildable"]=bool(chained["execution"].get("executable"))
    return chained


def _stage_dependency_order(stages:list[dict[str,Any]])->tuple[list[dict[str,Any]],list[dict[str,Any]]]:
    by_id={str(row["id"]):row for row in stages};selected_index={str(row["id"]):index for index,row in enumerate(stages)}
    raw_edges=[]
    for child in stages:
        inputs={name for op in child.get("plan",{}).get("operations",[]) for name in _operation_inputs(op)}
        for parent in stages:
            if parent is child:continue
            if str(parent.get("rootSymbol","")) in inputs:
                raw_edges.append({"from":str(parent["id"]),"to":str(child["id"]),"symbol":str(parent["rootSymbol"]),"valueKind":str(parent.get("valueKind","value"))})
    incoming={stage_id:set() for stage_id in by_id};outgoing={stage_id:set() for stage_id in by_id}
    for edge in raw_edges:
        if edge.get("valueKind") not in {"table","series","array","scalar"}:continue
        incoming[edge["to"]].add(edge["from"]);outgoing[edge["from"]].add(edge["to"])
    ready=sorted([stage_id for stage_id,parents in incoming.items() if not parents],key=lambda stage_id:selected_index[stage_id]);ordered=[]
    while ready:
        stage_id=ready.pop(0);ordered.append(by_id[stage_id])
        for child_id in sorted(outgoing[stage_id],key=lambda value:selected_index[value]):
            incoming[child_id].discard(stage_id)
            if not incoming[child_id] and child_id not in [row["id"] for row in ordered] and child_id not in ready:
                ready.append(child_id);ready.sort(key=lambda value:selected_index[value])
    if len(ordered)!=len(stages):raise ValueError("Selected workflow roots form a cyclic stage dependency graph.")
    return ordered,raw_edges

def _workflow_composition_blueprint(source_path:Path,source_name:str,workflow:dict[str,Any])->dict[str,Any]:
    current_plan=workflow.get("tableTransformPlan") or {}
    current_slice=current_plan.get("workflowSlice") or {}
    selected_root_ids=list(current_slice.get("selectedRootIds") or [])
    root_candidates=[*(current_slice.get("rootCandidates") or []),*(current_slice.get("stageBoundaryCandidates") or [])]
    root_lookup={str(row.get("id","")):row for row in root_candidates if row.get("id")}
    diagnostics=[]
    if len(selected_root_ids)<2:
        diagnostics.append({"severity":"blocker","code":"WORKFLOW_COMPOSITION_REQUIRES_MULTIPLE_ROOTS","cellIndex":0,"line":0,"message":"Multi-action composition requires at least two selected workflow roots."})
    if len(selected_root_ids)>8:
        diagnostics.append({"severity":"blocker","code":"WORKFLOW_COMPOSITION_ACTION_LIMIT","cellIndex":0,"line":0,"message":"Multi-action composition supports at most 8 selected roots because the public declarative action contract is bounded to 8 actions."})
    if diagnostics:
        return {"schema":WORKFLOW_COMPOSITION_SCHEMA,"candidateId":MULTI_ACTION_CANDIDATE_ID,"buildable":False,"diagnostics":diagnostics,"spec":{},"stages":[],"stageDependencies":[],
                "preview":{"title":f"{Path(source_name).stem} · Multi-action Workflow","source":source_name,"kind":"workflow-composition","stageCount":len(selected_root_ids),"sourceInputs":[],"sourceBindings":[],"selectedRootIds":selected_root_ids,"stageDependencies":[],"stages":[],"unitFirst":True,"privateCss":False}}

    prepared=[]
    for selected_index,root_id in enumerate(selected_root_ids):
        root_row=root_lookup.get(root_id) or {"id":root_id,"symbol":root_id.split(":",1)[-1],"valueKind":"value","reasons":[]}
        symbol=str(root_row.get("symbol") or root_id.split(":",1)[-1])
        stage_plan=analyze_table_transform(source_path,[root_id]);stage_plan["execution"]=analyze_table_transform_execution(stage_plan)
        prepared.append({"id":root_id,"selectedIndex":selected_index,"rootId":root_id,"rootSymbol":symbol,"valueKind":str(root_row.get("valueKind","value")),"producerCellIndex":int(root_row.get("producerCellIndex",0)),"plan":stage_plan})
    try:ordered,raw_edges=_stage_dependency_order(prepared)
    except ValueError as exc:
        diagnostics.append({"severity":"blocker","code":"WORKFLOW_COMPOSITION_STAGE_CYCLE","cellIndex":0,"line":0,"message":str(exc)})
        ordered=prepared;raw_edges=[]

    stage_by_root={};artifact_by_root={}
    for order_index,row in enumerate(ordered):
        symbol=str(row["rootSymbol"]);stage_slug=_slug(symbol).replace(".","-") or f"stage-{order_index+1}"
        prefix=f"stage-{order_index+1}-{stage_slug}"
        stage={**row,"id":prefix,"order":order_index+1,"actionId":f"run-{prefix}","taskId":f"task-{prefix}","actionLabel":f"运行 · {symbol}"}
        stage_by_root[str(row["rootId"])]=stage
        value_kind=str(row.get("valueKind","value"))
        if value_kind in {"table","series","array","scalar"}:
            artifact_kind="data.table" if value_kind=="table" else "data.series" if value_kind=="series" else "result.analysis"
            artifact_by_root[str(row["rootId"])]={"symbol":symbol,"valueKind":value_kind,"artifactKind":artifact_kind,"artifactId":f"{prefix}-artifact-{stage_slug}","semanticType":f"generated.workflow-stage.{value_kind}.{prefix}","producerStageId":prefix,"producerRootId":str(row["rootId"]),"producerCellIndex":int(row.get("producerCellIndex",0))}

    stages=[];action_rows=[];content=[];field_by_id={};source_binding_by_symbol={};external_source_inputs=[];produced_types=[]
    for row in ordered:
        stage=stage_by_root[str(row["rootId"])]
        boundary_candidates=[]
        for edge in raw_edges:
            if edge.get("to")!=row["rootId"] or edge.get("valueKind") not in {"table","series","array","scalar"}:continue
            artifact=artifact_by_root.get(str(edge.get("from")))
            if artifact is not None:boundary_candidates.append({**artifact,"consumerStageId":stage["id"],"consumerRootId":str(row["rootId"]),"consumerCellIndex":int(row.get("producerCellIndex",0))})
        chained_plan=_artifact_chained_plan(row["plan"],boundary_candidates)
        artifact_dependencies=list((chained_plan.get("artifactChain") or {}).get("boundaries") or [])
        binding_overrides={}
        for dep in artifact_dependencies:
            symbol=str(dep["symbol"])
            value_kind=str(dep.get("valueKind","value"))
            source={"scope":"artifacts","artifactId":str(dep["artifactId"]),"semanticType":str(dep["semanticType"]),"kind":str(dep.get("artifactKind") or ("data.table" if value_kind=="table" else "data.series" if value_kind=="series" else "result.analysis")),"index":0,"includeExcluded":False}
            if value_kind=="table":binding_overrides[symbol]={"kind":"artifact-table","source":source,"sourceHint":str(dep["artifactId"]),"maxRows":65536,"maxColumns":1024}
            else:binding_overrides[symbol]={"kind":"artifact-value","valueKind":value_kind,"source":source,"sourceHint":str(dep["artifactId"]),"maxRows":65536 if value_kind!="scalar" else 1}
        publish_overrides={}
        own_artifact=artifact_by_root.get(str(row["rootId"]))
        if own_artifact is not None:
            publish_overrides[str(row["rootSymbol"])]={"id":own_artifact["artifactId"],"name":f"Stage result · {row['rootSymbol']}","semanticType":own_artifact["semanticType"]}
        stage_bp=_workflow_blueprint(source_name,{"tableTransformPlan":chained_plan},candidate_id=MULTI_ACTION_CANDIDATE_ID,id_prefix=stage["id"],action_id=stage["actionId"],action_label=stage["actionLabel"],task_id=stage["taskId"],input_binding_overrides=binding_overrides,publish_overrides=publish_overrides)
        for diagnostic in stage_bp.get("diagnostics",[]):diagnostics.append({**dict(diagnostic),"stageRootId":str(row["rootId"]),"stageRootSymbol":str(row["rootSymbol"])})
        stage_spec=stage_bp["spec"]
        action=dict(stage_spec["actions"][0]);action["variant"]="primary" if stage["order"]==1 else "secondary";action["order"]=stage["order"]*10;action_rows.append(action)
        content.extend(dict(item) for item in stage_spec.get("content",[]) if item.get("kind")!="note")
        for field in (stage_spec.get("parameters") or {}).get("fields",[]):
            field_id=str(field.get("id",""));prior=field_by_id.get(field_id)
            if prior is not None and prior!=field:diagnostics.append({"severity":"blocker","code":"WORKFLOW_COMPOSITION_SOURCE_FIELD_CONFLICT","cellIndex":0,"line":0,"fieldId":field_id,"message":f"Shared source field {field_id} resolved to incompatible stage definitions."})
            else:field_by_id[field_id]=dict(field)
        for binding in stage_bp.get("preview",{}).get("sourceBindings",[]):
            if str(binding.get("scope","sources"))!="sources":continue
            symbol_name=str(binding.get("symbol",""));prior=source_binding_by_symbol.get(symbol_name)
            if prior is not None and prior!=binding:diagnostics.append({"severity":"blocker","code":"WORKFLOW_COMPOSITION_SOURCE_BINDING_CONFLICT","cellIndex":0,"line":0,"symbol":symbol_name,"message":f"Shared source {symbol_name} resolved to incompatible stage bindings."})
            else:source_binding_by_symbol[symbol_name]=dict(binding)
            if symbol_name and symbol_name not in external_source_inputs:external_source_inputs.append(symbol_name)
        for publish in stage_bp.get("task",{}).get("dynamicPublishTables",[]):
            semantic=str(publish.get("semanticType","") or "")
            if semantic and semantic not in produced_types:produced_types.append(semantic)
        for publish in stage_bp.get("task",{}).get("dynamicPublishArtifacts",[]):
            semantic=str(publish.get("semanticType","") or "")
            if semantic and semantic not in produced_types:produced_types.append(semantic)
        execution=chained_plan.get("execution") or {}
        stages.append({"id":stage["id"],"rootId":str(row["rootId"]),"rootSymbol":str(row["rootSymbol"]),"valueKind":str(row.get("valueKind","value")),"order":stage["order"],"actionId":stage["actionId"],"taskId":stage["taskId"],
                       "includedCells":list((chained_plan.get("workflowSlice") or {}).get("includedCells") or []),"delegatedCells":list((chained_plan.get("workflowSlice") or {}).get("delegatedCells") or []),"resultSymbols":list(execution.get("resultSymbols") or []),
                       "hostEffects":list(execution.get("hostEffects") or []),"artifactDependencies":artifact_dependencies,"publishedArtifact":dict(own_artifact) if own_artifact is not None else None,"task":stage_bp["task"],"buildable":bool(stage_bp.get("buildable"))})

    dependency_rows=[]
    for stage in stages:
        for dep in stage.get("artifactDependencies",[]):
            dependency_rows.append({"fromStageId":str(dep.get("producerStageId","")),"toStageId":str(stage.get("id","")),"fromRootId":str(dep.get("producerRootId","")),"toRootId":str(stage.get("rootId","")),"symbol":str(dep.get("symbol","")),"valueKind":str(dep.get("valueKind","value")),"mode":"artifact"})
    source_bindings=[source_binding_by_symbol[name] for name in external_source_inputs if name in source_binding_by_symbol]
    stem=_slug(Path(source_name).stem);title=f"{Path(source_name).stem} · Multi-action Workflow"
    merged_content=[{"kind":"note","variant":"meta","text":f"Generated from {source_name}; selected table/Series/Array/scalar dependencies cross Stage boundaries through canonical DKDS Artifacts. Independent imported inputs remain canonical Unit Source Pickers."},*content]
    spec={"schema":"dkds.declarative-plugin.v1","plugin":{"id":f"generated.{stem}.workflow-composition","name":title,"version":"1.0.0","description":f"Generated from {source_name} multi-action workflow composition.","order":940},
          "page":{"id":f"{stem}-workflow-composition","label":"Workflow","title":title,"subtitle":"Python/Jupyter Roots → Artifact-backed Core Task Actions","variant":"analysis","close":True},
          "workspace":{"activity":f"{stem}-workflow-composition","primaryRole":"scientific-primary","primaryLabel":"主界面","primaryScroll":"safe","mainLayout":"stack-comfortable"},
          "host":{"kind":"top","label":"Workflow","contextLabel":title,"icon":"◇","window":{"title":title,"width":1280,"height":820,"minWidth":860,"minHeight":560,"reuse":True,"persistence":"project","artifactHydration":"live"}},
          "data":{"accepts":["data.table"],**({"produces":produced_types} if produced_types else {})},"actions":action_rows,"content":merged_content}
    if field_by_id:spec["parameters"]={"id":"sources","label":"数据源","fields":list(field_by_id.values()),"priority":10,"embedded":False,"autoOpen":True,"stateVersion":"1"}
    buildable=bool(2<=len(stages)<=8 and all(stage.get("buildable") for stage in stages) and external_source_inputs and not diagnostics)
    return {"schema":WORKFLOW_COMPOSITION_SCHEMA,"candidateId":MULTI_ACTION_CANDIDATE_ID,"buildable":buildable,"diagnostics":diagnostics,"spec":spec,"stages":stages,"stageDependencies":dependency_rows,
            "preview":{"title":title,"source":source_name,"kind":"workflow-composition","stageCount":len(stages),"sourceInputs":external_source_inputs,"sourceBindings":source_bindings,"selectedRootIds":selected_root_ids,"stageDependencies":dependency_rows,
                       "stages":[{"id":row["id"],"rootId":row["rootId"],"rootSymbol":row["rootSymbol"],"valueKind":row["valueKind"],"order":row["order"],"actionId":row["actionId"],"includedCells":row["includedCells"],"delegatedCells":row["delegatedCells"],"resultSymbols":row["resultSymbols"],"hostEffects":row["hostEffects"],"artifactDependencies":row["artifactDependencies"],"publishedArtifact":row["publishedArtifact"]} for row in stages],"unitFirst":True,"privateCss":False}}

def analyze(path:str|Path,selected_root_ids:list[str]|None=None)->dict[str,Any]:
    source_path=Path(path).expanduser().resolve()
    model,functions,diagnostics=_read_document(source_path)
    rows=[]
    for fn in functions:
        row={"id":fn.id,"name":fn.name,"line":fn.line,"endLine":fn.end_line,**({"cellIndex":fn.cell_index} if fn.cell_index is not None else {}),"async":isinstance(fn.node,ast.AsyncFunctionDef),"parameters":_parameters(fn.node),"returnAnnotation":_annotation_text(fn.node.returns),"returnShape":_return_shape(fn.node),"compatibility":_compatibility(fn)}
        row["blueprint"]=_blueprint(model,row,fn)
        rows.append(row)
    workflow=analyze_workflow(source_path)
    table_plan=analyze_table_transform(source_path,selected_root_ids)
    table_plan["execution"]=analyze_table_transform_execution(table_plan)
    workflow["tableTransformPlan"]=table_plan
    workflow["blueprint"]=_workflow_blueprint(source_path.name,workflow)
    workflow["composition"]=_workflow_composition_blueprint(source_path,source_path.name,workflow)
    workflow["candidate"]={
        **dict(workflow.get("candidate") or {}),
        "id":WORKFLOW_CANDIDATE_ID,
        "kind":"table-transform-workflow",
        "buildable":bool(workflow["blueprint"]["buildable"]),
        "status":"buildable-table-transform" if workflow["blueprint"]["buildable"] else "blocked-table-transform",
        "blockers":[dict(row) for row in workflow["blueprint"].get("diagnostics",[])],
    }
    workflow["compositionCandidate"]={"id":MULTI_ACTION_CANDIDATE_ID,"kind":"multi-action-workflow","buildable":bool(workflow["composition"]["buildable"]),"status":"buildable-multi-action" if workflow["composition"]["buildable"] else "blocked-multi-action","blockers":[dict(row) for row in workflow["composition"].get("diagnostics",[])]}
    model={**model,"functionCount":len(rows),"functions":rows,"workflow":workflow}
    all_diagnostics=[*diagnostics]
    for row in rows:
        all_diagnostics.extend(row["compatibility"].get("diagnostics",[]))
        all_diagnostics.extend(row["blueprint"].get("diagnostics",[]))
    return {"schema":REPORT_SCHEMA,"sourceModel":model,"diagnostics":all_diagnostics,"portableFunctionCount":sum(1 for row in rows if row["compatibility"]["portable"]),"buildableFunctionCount":sum(1 for row in rows if row["blueprint"]["buildable"]),"workflowCandidateCount":sum(1 for row in (workflow.get("candidate"),workflow.get("compositionCandidate")) if row)}

def _selected(path:Path,function_id:str)->tuple[dict[str,Any],SourceFunction,dict[str,Any]]:
    model,functions,_=_read_document(path)
    report=analyze(path)
    selected=next((row for row in report["sourceModel"]["functions"] if row["id"]==function_id),None)
    fn=next((row for row in functions if row.id==function_id),None)
    if selected is None or fn is None:raise ValueError(f"Selected function no longer exists in source: {function_id}")
    return model,fn,selected

def build_package(path:str|Path,function_id:str,selected_root_ids:list[str]|None=None)->tuple[dict[str,Any],dict[str,Any]]:
    source_path=Path(path).expanduser().resolve()
    if function_id in {WORKFLOW_CANDIDATE_ID,MULTI_ACTION_CANDIDATE_ID}:
        analysis=analyze(source_path,selected_root_ids)
        workflow=analysis["sourceModel"]["workflow"]
        if function_id==MULTI_ACTION_CANDIDATE_ID:
            blueprint=workflow["composition"]
            if not blueprint["buildable"]:
                messages=[str(row.get("message","")) for row in blueprint.get("diagnostics",[])]
                raise ValueError("Selected multi-action workflow is not automatically buildable: "+"; ".join(messages))
            builder=PluginBuilder(blueprint["spec"])
            for stage in blueprint.get("stages",[]):
                task=stage["task"]
                stage_plan=analyze_table_transform(source_path,[stage["rootId"]])
                stage_plan["execution"]=analyze_table_transform_execution(stage_plan)
                stage_plan=_artifact_chained_plan(stage_plan,list(stage.get("artifactDependencies") or []))
                compiled=compile_table_transform_task(stage_plan,task["id"])
                builder.add_compiled_task(compiled,action_id=task["actionId"],input_bindings=task["inputBindings"],result_tables=task["resultTables"],result_metrics=task["resultMetrics"],dynamic_publish_tables=task["dynamicPublishTables"],dynamic_publish_artifacts=task["dynamicPublishArtifacts"],dynamic_table_plots=task["dynamicTablePlots"],host_effects=task["hostEffects"],success_status=task["successStatus"])
            package=builder.package()
            report={"schema":REPORT_SCHEMA,"source":{"name":source_path.name,"kind":analysis["sourceModel"]["kind"],"candidateId":MULTI_ACTION_CANDIDATE_ID,"candidateKind":"multi-action-workflow","selectedRootIds":list(blueprint.get("preview",{}).get("selectedRootIds") or []),"stageCount":len(blueprint.get("stages",[]))},"blueprint":blueprint,"package":{"id":package["manifest"]["id"],"name":package["manifest"]["name"],"version":package["manifest"]["version"],"files":sorted(package["files"])},"sourceExecuted":False,"pythonRuntimeRequiredByPlugin":False}
            return package,report
        blueprint=workflow["blueprint"]
        if not blueprint["buildable"]:
            messages=[str(row.get("message","")) for row in blueprint.get("diagnostics",[])]
            raise ValueError("Selected workflow is not automatically buildable: "+"; ".join(messages))
        compiled=compile_table_transform_task(workflow["tableTransformPlan"],blueprint["task"]["id"])
        builder=PluginBuilder(blueprint["spec"])
        task=blueprint["task"]
        builder.add_compiled_task(compiled,action_id=task["actionId"],input_bindings=task["inputBindings"],result_tables=task["resultTables"],result_metrics=task["resultMetrics"],dynamic_publish_tables=task["dynamicPublishTables"],dynamic_publish_artifacts=task["dynamicPublishArtifacts"],dynamic_table_plots=task["dynamicTablePlots"],host_effects=task["hostEffects"],success_status=task["successStatus"])
        package=builder.package()
        workflow_slice=workflow.get("tableTransformPlan",{}).get("workflowSlice",{})
        report={"schema":REPORT_SCHEMA,"source":{"name":source_path.name,"kind":analysis["sourceModel"]["kind"],"candidateId":WORKFLOW_CANDIDATE_ID,"candidateKind":"table-transform-workflow","selectionMode":workflow_slice.get("selectionMode","all-observable"),"selectedRootIds":list(workflow_slice.get("selectedRootIds") or [])},"blueprint":blueprint,"package":{"id":package["manifest"]["id"],"name":package["manifest"]["name"],"version":package["manifest"]["version"],"files":sorted(package["files"])},"sourceExecuted":False,"pythonRuntimeRequiredByPlugin":False}
        return package,report
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
    analyze_cmd.add_argument("source",type=Path);analyze_cmd.add_argument("--output",type=Path,required=True);analyze_cmd.add_argument("--root-id",action="append",default=None)
    build_cmd=sub.add_parser("build",help="build one selected portable function into a .dkplugin JSON package")
    build_cmd.add_argument("source",type=Path);build_cmd.add_argument("--function-id",required=True);build_cmd.add_argument("--package",type=Path,required=True);build_cmd.add_argument("--report",type=Path,required=True);build_cmd.add_argument("--root-id",action="append",default=None)
    args=parser.parse_args(list(argv) if argv is not None else None)
    try:
        if args.command=="analyze":
            _json_write(args.output,analyze(args.source,args.root_id));print(f"DKDS source import analyzed: {args.source} -> {args.output}");return 0
        package,report=build_package(args.source,args.function_id,args.root_id)
        _json_write(args.package,package);_json_write(args.report,report)
        print(f"DKDS source import built: {report['package']['id']}@{report['package']['version']} -> {args.package}");return 0
    except (OSError,ValueError,json.JSONDecodeError,SpecError,PortableTaskError) as exc:
        print(f"DKDS source import error: {exc}",file=sys.stderr);return 2

if __name__=="__main__":
    raise SystemExit(main())
