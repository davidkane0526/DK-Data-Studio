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
DEPENDENCY_GRAPH_SCHEMA="dkds.cell-dependency-graph.v1"
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
_LITERAL_NAMES={"True","False","None"}

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

def _statement_definitions(node:ast.AST)->set[str]:
    if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef)):
        return {node.name}
    if isinstance(node,ast.Import):
        return {alias.asname or alias.name.split(".",1)[0] for alias in node.names}
    if isinstance(node,ast.ImportFrom):
        return {alias.asname or alias.name for alias in node.names}
    if isinstance(node,ast.Assign):
        out=set()
        for target in node.targets:out|=_target_names(target)
        return out
    if isinstance(node,(ast.AnnAssign,ast.AugAssign)):
        return _target_names(node.target)
    if isinstance(node,(ast.For,ast.AsyncFor)):
        return _target_names(node.target)
    return set()

def _top_level_definitions(tree:ast.Module)->set[str]:
    out=set()
    for node in tree.body:out|=_statement_definitions(node)
    return out

class _ImmediateLoadVisitor(ast.NodeVisitor):
    """Collect names evaluated immediately by one top-level statement.

    Function/lambda bodies are deliberately not descended into: defining a callback
    does not read its globals yet. Decorators/default expressions are immediate and
    therefore remain dependencies. This keeps the cell DAG about executable authoring
    order instead of confusing deferred callback semantics with notebook state.
    """
    def __init__(self)->None:
        self.names:set[str]=set()

    def visit_Name(self,node:ast.Name)->None:
        if isinstance(node.ctx,ast.Load):self.names.add(node.id)

    def _function_header(self,node:ast.FunctionDef|ast.AsyncFunctionDef)->None:
        for row in node.decorator_list:self.visit(row)
        for row in node.args.defaults:self.visit(row)
        for row in node.args.kw_defaults:
            if row is not None:self.visit(row)

    def visit_FunctionDef(self,node:ast.FunctionDef)->None:self._function_header(node)
    def visit_AsyncFunctionDef(self,node:ast.AsyncFunctionDef)->None:self._function_header(node)
    def visit_Lambda(self,node:ast.Lambda)->None:
        for row in node.args.defaults:self.visit(row)
        for row in node.args.kw_defaults:
            if row is not None:self.visit(row)
    def visit_ClassDef(self,node:ast.ClassDef)->None:
        for row in node.decorator_list:self.visit(row)
        for row in node.bases:self.visit(row)
        for row in node.keywords:self.visit(row.value)

def _statement_loads(node:ast.AST)->set[str]:
    visitor=_ImmediateLoadVisitor();visitor.visit(node)
    if isinstance(node,ast.AugAssign):visitor.names|=_target_names(node.target)
    return visitor.names

def _cell_symbols(tree:ast.Module)->tuple[set[str],set[str],dict[str,int]]:
    """Return definitions plus immediate external reads with first-use lines."""
    defines=set();available=set();external=set();read_sites={}
    for node in tree.body:
        loads=_statement_loads(node)-_BUILTINS-_LITERAL_NAMES
        missing=loads-available
        external|=missing
        line=int(getattr(node,"lineno",0) or 0)
        for name in missing:read_sites.setdefault(name,line)
        current=_statement_definitions(node)
        defines|=current;available|=current
    return defines,external,read_sites

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

def build_cell_dependency_graph(rows:list[dict[str,Any]])->dict[str,Any]:
    """Build one deterministic, fail-closed cell DAG from analyzed code-cell rows."""
    valid=[row for row in rows if row.get("role")!="invalid"]
    source_order=[int(row["index"]) for row in valid]
    order_position={cell:index for index,cell in enumerate(source_order)}
    producers:dict[str,list[int]]={}
    for row in valid:
        for name in row.get("defines",[]):producers.setdefault(str(name),[]).append(int(row["index"]))

    diagnostics=[];edges=[];dependencies:dict[int,list[dict[str,Any]]]={};unresolved:dict[int,list[str]]={}
    for row in valid:
        consumer=int(row["index"]);dependencies[consumer]=[];unresolved[consumer]=[]
        row_defines=set(map(str,row.get("defines",[])))
        read_sites={str(item.get("symbol","")):int(item.get("line",0) or 0) for item in row.get("readSites",[]) if item.get("symbol")}
        consumer_pos=order_position[consumer]
        for name in sorted(set(map(str,row.get("reads",[])))):
            line=read_sites.get(name,0)
            other=[cell for cell in producers.get(name,[]) if cell!=consumer]
            prior=[cell for cell in other if order_position.get(cell,-1)<consumer_pos]
            future=[cell for cell in other if order_position.get(cell,10**9)>consumer_pos]
            if prior:
                producer=max(prior,key=lambda value:order_position[value])
                edge={"from":f"cell:{producer}","to":f"cell:{consumer}","symbol":name,"producerCellIndex":producer,"consumerCellIndex":consumer,"consumerLine":line}
                edges.append(edge);dependencies[consumer].append({"symbol":name,"cellIndex":producer})
            elif name in row_defines:
                unresolved[consumer].append(name)
                diagnostics.append({
                    "severity":"blocker","code":"WORKFLOW_CELL_FORWARD_REFERENCE","cellIndex":consumer,"line":line,"symbol":name,
                    "message":f"Cell {consumer} reads {name} before that symbol is defined in the same cell."
                })
            elif len(future)==1:
                producer=future[0]
                edge={"from":f"cell:{producer}","to":f"cell:{consumer}","symbol":name,"producerCellIndex":producer,"consumerCellIndex":consumer,"consumerLine":line}
                edges.append(edge);dependencies[consumer].append({"symbol":name,"cellIndex":producer})
            elif len(future)>1:
                unresolved[consumer].append(name)
                diagnostics.append({
                    "severity":"blocker","code":"WORKFLOW_SYMBOL_PRODUCER_AMBIGUOUS","cellIndex":consumer,"line":line,
                    "symbol":name,"producerCellIndexes":sorted(future,key=lambda value:order_position.get(value,value)),
                    "message":f"Cell {consumer} reads {name} before multiple later cells define it; static authoring will not guess notebook execution state."
                })
            else:
                unresolved[consumer].append(name)
                diagnostics.append({
                    "severity":"blocker","code":"WORKFLOW_SYMBOL_UNRESOLVED","cellIndex":consumer,"line":line,"symbol":name,
                    "message":f"Cell {consumer} reads unresolved symbol {name}; generated workflows require a statically owned producer."
                })

    predecessors={cell:set() for cell in source_order};successors={cell:set() for cell in source_order}
    for edge in edges:
        source=int(edge["producerCellIndex"]);target=int(edge["consumerCellIndex"])
        predecessors[target].add(source);successors[source].add(target)
    indegree={cell:len(predecessors[cell]) for cell in source_order}
    ready=[cell for cell in source_order if indegree[cell]==0]
    ready.sort(key=lambda value:order_position[value])
    topological=[]
    while ready:
        cell=ready.pop(0);topological.append(cell)
        for target in sorted(successors[cell],key=lambda value:order_position[value]):
            indegree[target]-=1
            if indegree[target]==0:
                ready.append(target);ready.sort(key=lambda value:order_position[value])
    cyclic=[cell for cell in source_order if cell not in topological]
    if cyclic:
        diagnostics.append({
            "severity":"blocker","code":"WORKFLOW_DEPENDENCY_CYCLE","cellIndex":cyclic[0],"line":0,"cellIndexes":cyclic,
            "message":"Cross-cell symbol dependencies contain a cycle; static authoring cannot derive a deterministic execution order."
        })
        topological.extend(cyclic)

    for row in rows:
        cell=int(row["index"])
        row["dependsOnCells"]=sorted({item["cellIndex"] for item in dependencies.get(cell,[])},key=lambda value:order_position.get(value,value))
        row["dependencies"]=sorted(dependencies.get(cell,[]),key=lambda item:(order_position.get(item["cellIndex"],item["cellIndex"]),item["symbol"]))
        row["unresolvedReads"]=sorted(unresolved.get(cell,[]))

    return {
        "schema":DEPENDENCY_GRAPH_SCHEMA,
        "sourceOrder":source_order,"topologicalOrder":topological,
        "reordered":topological!=source_order,"acyclic":not cyclic,
        "nodeCount":len(source_order),"edgeCount":len(edges),"edges":edges,
        "diagnostics":diagnostics,"buildable":not diagnostics,
    }

def analyze_workflow(path:str|Path)->dict[str,Any]:
    source_path=Path(path).expanduser().resolve()
    kind,cells,meta=_read_cells(source_path)
    rows=[]
    capabilities=set()
    transform_families=set()
    libraries=set()
    syntax_errors=[]
    for cell in cells:
        sanitized=_sanitize(cell["source"])
        try:tree=ast.parse(sanitized,filename=f"{source_path.name}#cell-{cell['index']}",mode="exec")
        except SyntaxError as exc:
            syntax_errors.append({"cellIndex":cell["index"],"line":int(exc.lineno or 0),"message":exc.msg})
            rows.append({"id":f"cell:{cell['index']}","index":cell["index"],"executionCount":cell.get("executionCount"),"lineCount":len(cell["source"].splitlines()),"role":"invalid","defines":[],"reads":[],"readSites":[],"dependsOnCells":[],"dependencies":[],"unresolvedReads":[],"imports":[],"effects":[]})
            continue
        defines,reads,read_sites=_cell_symbols(tree)
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
            "defines":sorted(defines),"reads":sorted(reads),"readSites":[{"symbol":name,"line":read_sites[name]} for name in sorted(read_sites)],
            "dependsOnCells":[],"dependencies":[],"unresolvedReads":[],"imports":_imports(tree),"effects":effects,
        })

    graph=build_cell_dependency_graph(rows)
    edges=list(graph["edges"])
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
    diagnostics=[dict(row) for row in graph.get("diagnostics",[])]
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
    if not graph.get("buildable",False):
        blockers.append({"code":"WORKFLOW_DEPENDENCY_GRAPH_BLOCKED","message":"Cell dependency graph is not statically deterministic.","diagnosticCount":len(graph.get("diagnostics",[]))})
    if transform_families:
        blockers.append({"code":"WORKFLOW_TRANSFORM_LOWERING_REQUIRED","message":"Notebook/script compute uses library semantics that require declarative table/array/scientific transform lowering.","families":sorted(transform_families),"diagnosticCount":sum(1 for row in diagnostics if row.get("code")=="WORKFLOW_TRANSFORM_UNLOWERED")})
    if syntax_errors:
        blockers.append({"code":"WORKFLOW_SYNTAX_ERRORS","message":"One or more code cells cannot be parsed.","count":len(syntax_errors)})
    executable=sum(1 for row in rows if row["role"] not in {"definitions","invalid"})
    return {
        "schema":WORKFLOW_SCHEMA,"kind":kind,"source":source_path.name,**meta,
        "codeCellCount":len(rows),"executableCellCount":executable,
        "crossCellDependencyCount":len(edges),"cells":rows,"edges":edges,"dependencyGraph":graph,
        "libraries":sorted(x for x in libraries if x),"hostCapabilities":sorted(capabilities),
        "transformFamilies":sorted(transform_families),"hostMappings":host_mappings,
        "syntaxErrors":syntax_errors,"diagnostics":diagnostics,
        "candidate":{
            "id":"workflow:main","kind":"notebook-workflow" if kind=="jupyter" else "script-workflow",
            "label":source_path.stem,"buildable":not blockers and executable==0,
            "status":"blocked-dependency-graph" if not graph.get("buildable",False) else "requires-transform-lowering" if transform_families else "host-mapping-only" if capabilities else "definitions-only" if executable==0 else "portable-analysis-required",
            "blockers":blockers,
        },
        "sourceExecuted":False,
    }
