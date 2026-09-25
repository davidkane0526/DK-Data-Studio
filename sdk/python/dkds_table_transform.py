#!/usr/bin/env python3
"""Static Pandas-shaped workflow -> DKDS Table Transform IR planning.

The planner never executes source and does not emulate Pandas. It recognizes a
small structural subset that can later lower onto bounded DKDS DataTable task
inputs. Unknown statements remain exact cell/line blockers.
"""
from __future__ import annotations

import ast
from pathlib import Path
from typing import Any

from dkds_source_workflow import _read_cells, _sanitize

PLAN_SCHEMA="dkds.table-transform-plan.v1"
_SUPPORTED_METHODS={
    "abs":"table.abs",
    "copy":"table.copy",
    "reset_index":"table.reset-index",
    "diff":"table.diff",
    "dropna":"table.dropna",
    "sort_index":"table.sort-index",
    "mean":"table.mean",
    "median":"table.median",
    "std":"table.std",
}
_HOST_METHODS={
    "plot":("view.plot","scientific.plot"),
    "scatter":("view.plot","scientific.plot"),
    "to_clipboard":("host.clipboard","host.clipboard.write"),
    "to_csv":("host.export","data.export"),
    "to_excel":("host.export","data.export"),
}
_DECLARATIONS=(ast.Import,ast.ImportFrom,ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef,ast.Pass)

def _unparse(node:ast.AST|None)->str:
    if node is None:return ""
    try:return ast.unparse(node)
    except Exception:return ""

def _literal(node:ast.AST|None)->tuple[bool,Any]:
    if node is None:return True,None
    try:return True,ast.literal_eval(node)
    except Exception:return False,_unparse(node)

def _keyword_literals(call:ast.Call)->tuple[bool,dict[str,Any]]:
    out={}
    for row in call.keywords:
        if row.arg is None:return False,{}
        ok,value=_literal(row.value)
        if not ok:return False,{}
        out[row.arg]=value
    return True,out

def _selector(node:ast.AST)->tuple[bool,dict[str,Any]]:
    if isinstance(node,ast.Slice):
        values={}
        for key,value in (("start",node.lower),("stop",node.upper),("step",node.step)):
            ok,resolved=_literal(value)
            if not ok:return False,{"kind":"dynamic","source":_unparse(node)}
            values[key]=resolved
        return True,{"kind":"slice",**values}
    if isinstance(node,ast.Tuple):
        rows=[]
        for item in node.elts:
            ok,value=_selector(item)
            if not ok:return False,{"kind":"dynamic","source":_unparse(node)}
            rows.append(value)
        return True,{"kind":"tuple","items":rows}
    ok,value=_literal(node)
    if ok:return True,{"kind":"literal","value":value}
    if isinstance(node,ast.Name):return True,{"kind":"symbol","name":node.id}
    return False,{"kind":"dynamic","source":_unparse(node)}

def _name(node:ast.AST)->str:
    return node.id if isinstance(node,ast.Name) else ""

def _call_owner(call:ast.Call)->tuple[str,str]:
    if not isinstance(call.func,ast.Attribute):return "",""
    return _name(call.func.value),call.func.attr

def _op_id(cell:int,line:int,index:int)->str:
    return f"op:{cell}:{line}:{index}"

def _diag(cell:int,node:ast.AST,code:str,message:str)->dict[str,Any]:
    return {"severity":"blocker","code":code,"cellIndex":cell,"line":int(getattr(node,"lineno",0) or 0),"source":_unparse(node),"message":message}

def _assign_target(node:ast.Assign|ast.AnnAssign)->str:
    target=node.targets[0] if isinstance(node,ast.Assign) and len(node.targets)==1 else node.target if isinstance(node,ast.AnnAssign) else None
    return _name(target) if target is not None else ""

def _source_call(call:ast.Call)->tuple[str,str]|None:
    if not isinstance(call.func,ast.Attribute):return None
    if not isinstance(call.func.value,ast.Name) or call.func.value.id not in {"pd","pandas"}:return None
    if call.func.attr=="read_csv":return "csv","data.import"
    if call.func.attr=="read_excel":return "excel","data.import"
    return None

def _assignment_op(cell:int,node:ast.Assign|ast.AnnAssign,index:int)->tuple[dict[str,Any]|None,dict[str,Any]|None]:
    output=_assign_target(node)
    if not output:return None,_diag(cell,node,"TABLE_IR_TARGET_UNSUPPORTED","Table Transform IR v1 requires a simple assignment target.")
    value=node.value
    if isinstance(value,(ast.Constant,ast.List,ast.Tuple,ast.Dict,ast.Name)):
        ok,literal=_literal(value)
        if ok:return {"id":_op_id(cell,node.lineno,index),"kind":"value.bind","cellIndex":cell,"line":node.lineno,"output":output,"value":literal},None
        if isinstance(value,ast.Name):return {"id":_op_id(cell,node.lineno,index),"kind":"value.alias","cellIndex":cell,"line":node.lineno,"output":output,"input":value.id},None
    if isinstance(value,ast.Subscript) and isinstance(value.value,ast.Attribute) and value.value.attr in {"iloc","loc"}:
        source=_name(value.value.value)
        ok,selector=_selector(value.slice)
        if source and ok:
            return {"id":_op_id(cell,node.lineno,index),"kind":"table.slice","cellIndex":cell,"line":node.lineno,"output":output,"input":source,"mode":value.value.attr,"selector":selector},None
        return None,_diag(cell,node,"TABLE_IR_SLICE_UNRESOLVED","iloc/loc selectors must be static literals/slices or simple symbols.")
    if isinstance(value,ast.Call):
        source=_source_call(value)
        if source:
            input_format,capability=source
            source_hint=""
            if value.args:
                ok_hint,resolved_hint=_literal(value.args[0])
                if ok_hint and isinstance(resolved_hint,str):source_hint=resolved_hint
            return {"id":_op_id(cell,node.lineno,index),"kind":"source.table","cellIndex":cell,"line":node.lineno,"output":output,"originalFormat":input_format,"sourceHint":source_hint,"hostCapability":capability,"replacement":"scoped DKDS DataTable input"},None
        if isinstance(value.func,ast.Attribute) and isinstance(value.func.value,ast.Name) and value.func.value.id in {"pd","pandas"} and value.func.attr=="concat":
            if not value.args or not isinstance(value.args[0],(ast.List,ast.Tuple)):
                return None,_diag(cell,node,"TABLE_IR_CONCAT_UNRESOLVED","pd.concat requires a literal list/tuple of table symbols in IR v1.")
            inputs=[_name(item) for item in value.args[0].elts]
            ok,kwargs=_keyword_literals(value)
            if not all(inputs) or not ok:return None,_diag(cell,node,"TABLE_IR_CONCAT_UNRESOLVED","pd.concat inputs/keywords must be statically resolvable.")
            axis=kwargs.get("axis",0)
            if axis not in {0,1}:return None,_diag(cell,node,"TABLE_IR_CONCAT_AXIS_UNSUPPORTED","pd.concat axis must be 0 or 1.")
            return {"id":_op_id(cell,node.lineno,index),"kind":"table.concat","cellIndex":cell,"line":node.lineno,"output":output,"inputs":inputs,"axis":axis,"ignoreIndex":bool(kwargs.get("ignore_index",False))},None
        owner,method=_call_owner(value)
        if owner and method in _SUPPORTED_METHODS:
            ok,kwargs=_keyword_literals(value)
            if not ok:return None,_diag(cell,node,"TABLE_IR_KEYWORD_UNRESOLVED",f"{method} keyword arguments must be literal in IR v1.")
            if value.args:
                args=[]
                for arg in value.args:
                    ok_arg,resolved=_literal(arg)
                    if not ok_arg:return None,_diag(cell,node,"TABLE_IR_ARGUMENT_UNRESOLVED",f"{method} positional arguments must be literal in IR v1.")
                    args.append(resolved)
            else:args=[]
            return {"id":_op_id(cell,node.lineno,index),"kind":_SUPPORTED_METHODS[method],"cellIndex":cell,"line":node.lineno,"output":output,"input":owner,"args":args,"kwargs":kwargs},None
    return None,_diag(cell,node,"TABLE_IR_ASSIGNMENT_UNLOWERED","Assignment is outside the current bounded Table Transform IR.")

def _expression_op(cell:int,node:ast.Expr,index:int)->tuple[dict[str,Any]|None,dict[str,Any]|None]:
    call=node.value
    if not isinstance(call,ast.Call):
        return None,_diag(cell,node,"TABLE_IR_EXPRESSION_UNLOWERED","Only mapped host/presentation calls are allowed as standalone workflow expressions.")
    owner,method=_call_owner(call)
    if owner and method in _HOST_METHODS:
        kind,capability=_HOST_METHODS[method]
        ok,kwargs=_keyword_literals(call)
        if not ok:return None,_diag(cell,node,"TABLE_IR_HOST_CALL_UNRESOLVED",f"{method} keyword arguments must be literal in IR v1.")
        return {"id":_op_id(cell,node.lineno,index),"kind":kind,"cellIndex":cell,"line":node.lineno,"input":owner,"hostCapability":capability,"kwargs":kwargs},None
    return None,_diag(cell,node,"TABLE_IR_CALL_UNLOWERED","Standalone call is not yet mapped to a DKDS Table/Host operation.")

def analyze_table_transform(path:str|Path)->dict[str,Any]:
    source_path=Path(path).expanduser().resolve()
    kind,cells,_=_read_cells(source_path)
    operations=[]
    diagnostics=[]
    statement_count=0
    for cell in cells:
        try:tree=ast.parse(_sanitize(cell["source"]),filename=f"{source_path.name}#cell-{cell['index']}",mode="exec")
        except SyntaxError:continue
        op_index=0
        for node in tree.body:
            if isinstance(node,_DECLARATIONS):continue
            statement_count+=1
            operation=None
            diagnostic=None
            if isinstance(node,(ast.Assign,ast.AnnAssign)):
                operation,diagnostic=_assignment_op(cell["index"],node,op_index)
            elif isinstance(node,ast.Expr):
                operation,diagnostic=_expression_op(cell["index"],node,op_index)
            else:
                diagnostic=_diag(cell["index"],node,"TABLE_IR_STATEMENT_UNLOWERED",f"{type(node).__name__} is not part of Table Transform IR v1.")
            if operation:
                operations.append(operation);op_index+=1
            elif diagnostic:diagnostics.append(diagnostic)
    lowerable=len(operations)
    ratio=1.0 if statement_count==0 else lowerable/statement_count
    return {
        "schema":PLAN_SCHEMA,"source":source_path.name,"sourceKind":kind,
        "operations":operations,"diagnostics":diagnostics,
        "statementCount":statement_count,"lowerableStatementCount":lowerable,
        "coverage":ratio,"buildable":statement_count>0 and not diagnostics and lowerable==statement_count,
        "sourceExecuted":False,
    }
