#!/usr/bin/env python3
"""Static notebook/script workflow analysis for DK Data Studio authoring.

This module never imports or executes user code. It reconstructs top-level
symbol/dataflow and classifies host effects so Python/Jupyter authoring can
separate DKDS host replacements from compute semantics that still need lowering.
"""
from __future__ import annotations

import ast
import builtins
import json
import re
from pathlib import Path
from typing import Any

WORKFLOW_SCHEMA="dkds.source-workflow.v1"
_BUILTINS=set(dir(builtins))
_HOST_RULES=(
    ("data.import", re.compile(r"(?:^|\.)(?:read_csv|read_excel)$"), "DKDS DataTable source"),
    ("scientific.plot", re.compile(r"(?:^|\.)(?:plot|scatter|semilogx|semilogy|loglog)$"), "DKDS ScientificPlot"),
    ("host.clipboard.write", re.compile(r"(?:^|\.)to_clipboard$"), "DKDS Host clipboard"),
    ("data.export", re.compile(r"(?:^|\.)(?:to_csv|to_excel)$"), "DKDS export"),
)
_LIBRARY_FAMILIES={
    "pd":"pandas.dataframe","pandas":"pandas.dataframe",
    "np":"numpy.array","numpy":"numpy.array",
    "scipy":"scipy.scientific","plt":"matplotlib.presentation","matplotlib":"matplotlib.presentation",
}
_PRESENTATION_ATTRS={"plot","scatter","semilogx","semilogy","loglog","set_xlabel","set_ylabel","legend","show"}
_IO_ATTRS={"read_csv","read_excel","to_csv","to_excel","to_clipboard"}

def _source(cell:dict[str,Any])->str:
    raw=cell.get("source","")
    return "".join(raw) if isinstance(raw,list) else str(raw or "")

def _sanitize(source:str)->str:
    rows=source.splitlines()
    if rows and rows[0].lstrip().startswith("%%"):
        return "\n".join("pass" if row.strip() else "" for row in rows)
    out=[]
    for row in rows:
        stripped=row.lstrip()
        out.append(row[:len(row)-len(stripped)]+"pass" if stripped.startswith(("%","!","?")) else row)
    return "\n".join(out)

def _call_path(node:ast.AST)->str:
    try:return ast.unparse(node)
    except Exception:return ""

def _root_name(node:ast.AST)->str:
    current=node
    while isinstance(current,ast.Attribute):current=current.value
    if isinstance(current,ast.Name):return current.id
    return ""

def _target_names(node:ast.AST)->set[str]:
    if isinstance(node,ast.Name):return {node.id}
    if isinstance(node,(ast.Tuple,ast.List)):
        out=set()
        for item in node.elts:out|=_target_names(item)
        return out
    return set()

def _top_level_definitions(tree:ast.Module)->set[str]:
    out=set()
    for node in tree.body:
        if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef)):
            out.add(node.name)
        elif isinstance(node,ast.Import):
            for alias in node.names:out.add(alias.asname or alias.name.split(".",1)[0])
        elif isinstance(node,ast.ImportFrom):
            for alias in node.names:out.add(alias.asname or alias.name)
        elif isinstance(node,(ast.Assign,ast.AnnAssign,ast.AugAssign)):
            targets=node.targets if isinstance(node,ast.Assign) else [node.target]
            for target in targets:out|=_target_names(target)
        elif isinstance(node,(ast.For,ast.AsyncFor)):
            out|=_target_names(node.target)
    return out

def _loaded_names(tree:ast.Module)->set[str]:
    return {node.id for node in ast.walk(tree) if isinstance(node,ast.Name) and isinstance(node.ctx,ast.Load)}

def _imports(tree:ast.Module)->list[dict[str,Any]]:
    rows=[]
    for node in tree.body:
        if isinstance(node,ast.Import):
            for alias in node.names:
                rows.append({"module":alias.name,"alias":alias.asname or alias.name.split(".",1)[0],"line":int(node.lineno)})
        elif isinstance(node,ast.ImportFrom):
            module=node.module or ""
            for alias in node.names:
                rows.append({"module":module,"name":alias.name,"alias":alias.asname or alias.name,"line":int(node.lineno)})
    return rows

def _effect(node:ast.Call)->dict[str,Any]|None:
    path=_call_path(node.func)
    for capability,pattern,replacement in _HOST_RULES:
        if pattern.search(path):
            return {"kind":"host-mapping","capability":capability,"call":path,"replacement":replacement,"line":int(getattr(node,"lineno",0) or 0)}
    root=_root_name(node.func)
    family=_LIBRARY_FAMILIES.get(root)
    if family:
        return {"kind":"transform","family":family,"call":path,"line":int(getattr(node,"lineno",0) or 0)}
    if isinstance(node.func,ast.Attribute):
        attr=node.func.attr
        if attr in _PRESENTATION_ATTRS:
            return {"kind":"host-mapping","capability":"scientific.plot","call":path,"replacement":"DKDS ScientificPlot","line":int(getattr(node,"lineno",0) or 0)}
        if attr in _IO_ATTRS:
            capability="host.clipboard.write" if attr=="to_clipboard" else "data.export" if attr.startswith("to_") else "data.import"
            replacement="DKDS Host clipboard" if attr=="to_clipboard" else "DKDS export" if attr.startswith("to_") else "DKDS DataTable source"
            return {"kind":"host-mapping","capability":capability,"call":path,"replacement":replacement,"line":int(getattr(node,"lineno",0) or 0)}
    return None

def _role(tree:ast.Module,effects:list[dict[str,Any]])->str:
    executable=[
        node for node in tree.body
        if not isinstance(node,(ast.Import,ast.ImportFrom,ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef))
    ]
    if not executable:return "definitions"
    host={row.get("capability","") for row in effects if row.get("kind")=="host-mapping"}
    transform={row.get("family","") for row in effects if row.get("kind")=="transform"}
    if host and not transform:return "host-effects"
    if transform and not host:return "compute"
    if host or transform:return "mixed"
    return "compute"

def _read_cells(path:Path)->tuple[str,list[dict[str,Any]],dict[str,Any]]:
    suffix=path.suffix.lower()
    if suffix==".py":
        source=path.read_text(encoding="utf-8-sig")
        return "python",[{"index":0,"kind":"code","source":source,"executionCount":None}],{}
    notebook=json.loads(path.read_text(encoding="utf-8-sig"))
    cells=[]
    for index,cell in enumerate(notebook.get("cells",[])):
        if not isinstance(cell,dict) or cell.get("cell_type")!="code":continue
        cells.append({"index":index,"kind":"code","source":_source(cell),"executionCount":cell.get("execution_count")})
    return "jupyter",cells,{"nbformat":notebook.get("nbformat"),"nbformatMinor":notebook.get("nbformat_minor")}

def analyze_workflow(path:str|Path)->dict[str,Any]:
    source_path=Path(path).expanduser().resolve()
    kind,cells,meta=_read_cells(source_path)
    prior_definitions:dict[str,int]={}
    rows=[]
    edges=[]
    capabilities=set()
    transform_families=set()
    libraries=set()
    syntax_errors=[]
    for cell in cells:
        sanitized=_sanitize(cell["source"])
        try:tree=ast.parse(sanitized,filename=f"{source_path.name}#cell-{cell['index']}",mode="exec")
        except SyntaxError as exc:
            syntax_errors.append({"cellIndex":cell["index"],"line":int(exc.lineno or 0),"message":exc.msg})
            rows.append({"id":f"cell:{cell['index']}","index":cell["index"],"lineCount":len(cell["source"].splitlines()),"role":"invalid","defines":[],"reads":[],"dependsOnCells":[],"imports":[],"effects":[]})
            continue
        defines=_top_level_definitions(tree)
        reads=_loaded_names(tree)-defines-_BUILTINS-{"True","False","None"}
        depends={}
        for name in sorted(reads):
            if name in prior_definitions:depends[name]=prior_definitions[name]
        for name,producer in depends.items():edges.append({"from":f"cell:{producer}","to":f"cell:{cell['index']}","symbol":name})
        effects=[]
        for node in ast.walk(tree):
            if isinstance(node,ast.Call):
                row=_effect(node)
                if row:
                    effects.append(row)
                    if row["kind"]=="host-mapping":capabilities.add(row["capability"])
                    elif row["kind"]=="transform":transform_families.add(row["family"])
            elif isinstance(node,(ast.Import,ast.ImportFrom)):
                if isinstance(node,ast.Import):
                    libraries.update(alias.name.split(".",1)[0] for alias in node.names)
                else:libraries.add((node.module or "").split(".",1)[0])
        rows.append({
            "id":f"cell:{cell['index']}","index":cell["index"],"executionCount":cell["executionCount"],
            "lineCount":len(cell["source"].splitlines()),"role":_role(tree,effects),
            "defines":sorted(defines),"reads":sorted(reads),"dependsOnCells":sorted(set(depends.values())),
            "dependencies":[{"symbol":name,"cellIndex":producer} for name,producer in sorted(depends.items())],
            "imports":_imports(tree),"effects":effects,
        })
        for name in defines:prior_definitions[name]=cell["index"]

    library_family={"pandas":"pandas.dataframe","numpy":"numpy.array","scipy":"scipy.scientific"}
    for library in libraries:
        family=library_family.get(library)
        if family:transform_families.add(family)
    host_mappings=[]
    seen=set()
    for cell in rows:
        for effect in cell["effects"]:
            if effect.get("kind")!="host-mapping":continue
            key=(effect["capability"],effect["call"],effect["replacement"])
            if key in seen:continue
            seen.add(key);host_mappings.append({"capability":effect["capability"],"sourceCall":effect["call"],"replacement":effect["replacement"]})
    diagnostics=[]
    for cell in rows:
        for effect in cell["effects"]:
            if effect.get("kind")!="transform":continue
            diagnostics.append({
                "severity":"blocker","code":"WORKFLOW_TRANSFORM_UNLOWERED",
                "cellIndex":cell["index"],"line":effect.get("line",0),
                "family":effect.get("family",""),"call":effect.get("call",""),
                "message":f"{effect.get('call','scientific transform')} requires {effect.get('family','scientific')} lowering before this workflow can be built."
            })
    blockers=[]
    if transform_families:
        blockers.append({"code":"WORKFLOW_TRANSFORM_LOWERING_REQUIRED","message":"Notebook/script compute uses library semantics that require declarative table/array/scientific transform lowering.","families":sorted(transform_families),"diagnosticCount":len(diagnostics)})
    if syntax_errors:
        blockers.append({"code":"WORKFLOW_SYNTAX_ERRORS","message":"One or more code cells cannot be parsed.","count":len(syntax_errors)})
    executable=sum(1 for row in rows if row["role"] not in {"definitions","invalid"})
    return {
        "schema":WORKFLOW_SCHEMA,"kind":kind,"source":source_path.name,**meta,
        "codeCellCount":len(rows),"executableCellCount":executable,
        "crossCellDependencyCount":len(edges),"cells":rows,"edges":edges,
        "libraries":sorted(x for x in libraries if x),"hostCapabilities":sorted(capabilities),
        "transformFamilies":sorted(transform_families),"hostMappings":host_mappings,
        "syntaxErrors":syntax_errors,"diagnostics":diagnostics,
        "candidate":{
            "id":"workflow:main","kind":"notebook-workflow" if kind=="jupyter" else "script-workflow",
            "label":source_path.stem,"buildable":not blockers and executable==0,
            "status":"requires-transform-lowering" if transform_families else "host-mapping-only" if capabilities else "definitions-only" if executable==0 else "portable-analysis-required",
            "blockers":blockers,
        },
        "sourceExecuted":False,
    }
