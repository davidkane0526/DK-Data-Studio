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
_AGGREGATE_METHODS={"mean","median","std"}
_GROUPBY_AGG_METHODS={"agg","aggregate"}
_NUMPY_NAMES={"np","numpy"}
_NUMPY_UNARY={"abs","sqrt","log","log10","exp"}
_NUMPY_REDUCE={"mean","median","std"}
_ARRAY_BINOPS={ast.Add:"add",ast.Sub:"sub",ast.Mult:"mul",ast.Div:"div",ast.Pow:"pow",ast.Mod:"mod"}

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

def _positional_literals(call:ast.Call)->tuple[bool,list[Any]]:
    out=[]
    for node in call.args:
        ok,value=_literal(node)
        if not ok:return False,[]
        out.append(value)
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

def _series_selection(node:ast.AST)->tuple[str,dict[str,Any]]|None:
    if not isinstance(node,ast.Subscript) or not isinstance(node.value,ast.Name):return None
    ok,selector=_selector(node.slice)
    if not ok or selector.get("kind")!="literal":return None
    value=selector.get("value")
    if isinstance(value,bool) or not isinstance(value,(str,int)):return None
    return node.value.id,selector

def _call_literals(cell:int,node:ast.AST,call:ast.Call,method:str)->tuple[list[Any],dict[str,Any],dict[str,Any]|None]:
    ok_args,args=_positional_literals(call)
    if not ok_args:
        return [],{},_diag(cell,node,"TABLE_IR_ARGUMENT_UNRESOLVED",f"{method} positional arguments must be literal in IR v1.")
    ok_kwargs,kwargs=_keyword_literals(call)
    if not ok_kwargs:
        return [],{},_diag(cell,node,"TABLE_IR_KEYWORD_UNRESOLVED",f"{method} keyword arguments must be literal in IR v1.")
    return args,kwargs,None

def _callback_sources(cells:list[dict[str,Any]])->tuple[dict[str,dict[str,Any]],set[str]]:
    callbacks={}
    duplicates=set()
    for cell in cells:
        try:tree=ast.parse(_sanitize(cell["source"]),mode="exec")
        except SyntaxError:continue
        for node in tree.body:
            if not isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)):continue
            if node.name in callbacks:
                duplicates.add(node.name)
                continue
            callbacks[node.name]={
                "name":node.name,
                "source":_unparse(node),
                "async":isinstance(node,ast.AsyncFunctionDef),
                "cellIndex":int(cell["index"]),
                "line":int(getattr(node,"lineno",0) or 0),
            }
    return callbacks,duplicates

def _scipy_curve_fit_symbols(cells:list[dict[str,Any]])->dict[str,set[str]]:
    direct=set();scipy_roots=set();optimize_roots=set();numpy_roots=set()
    for cell in cells:
        try:tree=ast.parse(_sanitize(cell["source"]),mode="exec")
        except SyntaxError:continue
        for node in tree.body:
            if isinstance(node,ast.Import):
                for alias in node.names:
                    if alias.name=="scipy":
                        scipy_roots.add(alias.asname or "scipy")
                    elif alias.name=="scipy.optimize":
                        if alias.asname:optimize_roots.add(alias.asname)
                        else:scipy_roots.add("scipy")
                    elif alias.name=="numpy":
                        numpy_roots.add(alias.asname or "numpy")
            elif isinstance(node,ast.ImportFrom):
                module=node.module or ""
                if module=="scipy.optimize":
                    for alias in node.names:
                        if alias.name=="curve_fit":direct.add(alias.asname or alias.name)
                elif module=="scipy":
                    for alias in node.names:
                        if alias.name=="optimize":optimize_roots.add(alias.asname or alias.name)
    return {"direct":direct,"scipy":scipy_roots,"optimize":optimize_roots,"numpy":numpy_roots}

def _apply_callback(cell:int,node:ast.AST,expr:ast.AST,callbacks:dict[str,dict[str,Any]],duplicates:set[str])->tuple[dict[str,Any]|None,dict[str,Any]|None]:
    if isinstance(expr,ast.Name):
        if expr.id in duplicates:
            return None,_diag(cell,node,"TABLE_IR_APPLY_CALLBACK_AMBIGUOUS",f"Series.apply callback {expr.id} has multiple top-level definitions.")
        callback=callbacks.get(expr.id)
        if callback is None:
            return None,_diag(cell,node,"TABLE_IR_APPLY_CALLBACK_UNRESOLVED",f"Series.apply callback {expr.id} must be one top-level function in the imported source.")
        if callback.get("async"):
            return None,_diag(cell,node,"TABLE_IR_APPLY_CALLBACK_ASYNC","Series.apply callbacks must be synchronous.")
        return {"name":callback["name"],"source":callback["source"],"kind":"named"},None
    if isinstance(expr,ast.Lambda):
        args=expr.args
        if args.posonlyargs or args.kwonlyargs or args.vararg or args.kwarg:
            return None,_diag(cell,node,"TABLE_IR_APPLY_LAMBDA_SIGNATURE","Inline Series.apply lambda supports positional parameters only.")
        params=list(args.args)
        if not 1<=len(params)<=8:
            return None,_diag(cell,node,"TABLE_IR_APPLY_LAMBDA_SIGNATURE","Inline Series.apply lambda requires between 1 and 8 positional parameters.")
        first_default=len(params)-len(args.defaults)
        parts=[]
        for index,arg in enumerate(params):
            if index>=first_default:
                ok,default=_literal(args.defaults[index-first_default])
                if not ok or (default is not None and not isinstance(default,(str,int,float,bool))):
                    return None,_diag(cell,node,"TABLE_IR_APPLY_LAMBDA_DEFAULT","Inline Series.apply lambda defaults must be scalar literals.")
                parts.append(arg.arg+"="+repr(default))
            else:parts.append(arg.arg)
        name="__dkds_inline_apply"
        source="def "+name+"("+",".join(parts)+"):\n    return "+_unparse(expr.body)
        return {"name":name,"source":source,"kind":"lambda"},None
    return None,_diag(cell,node,"TABLE_IR_APPLY_CALLBACK_UNSUPPORTED","Series.apply callback must be a top-level function name or an inline lambda.")

def _series_apply_op(cell:int,node:ast.AST,index:int,output:str,call:ast.Call,callbacks:dict[str,dict[str,Any]],duplicates:set[str])->tuple[list[dict[str,Any]],dict[str,Any]|None]:
    if not isinstance(call.func,ast.Attribute) or call.func.attr!="apply":
        return [],_diag(cell,node,"TABLE_IR_APPLY_CALL_INVALID","Expected Series.apply call.")
    if len(call.args)!=1:
        return [],_diag(cell,node,"TABLE_IR_APPLY_ARGS","Series.apply bounded v1 requires exactly one callback positional argument.")
    callback,error=_apply_callback(cell,node,call.args[0],callbacks,duplicates)
    if error:return [],error
    kwargs={}
    for keyword in call.keywords:
        if keyword.arg!="args":
            return [],_diag(cell,node,"TABLE_IR_APPLY_KWARGS_UNSUPPORTED",f"Series.apply keyword {keyword.arg or '**kwargs'} is outside bounded v1; only literal args= is supported.")
        ok,value=_literal(keyword.value)
        if not ok or not isinstance(value,(list,tuple)):
            return [],_diag(cell,node,"TABLE_IR_APPLY_ARGS_LITERAL","Series.apply args= must be a literal list/tuple.")
        values=list(value)
        if any(item is not None and not isinstance(item,(str,int,float,bool)) for item in values):
            return [],_diag(cell,node,"TABLE_IR_APPLY_ARGS_LITERAL","Series.apply args= values must be scalar literals.")
        kwargs["args"]=values
    owner_expr=call.func.value
    emitted=[]
    selected=_series_selection(owner_expr)
    if selected:
        source,selector=selected
        input_name=f"__dkds_apply_series_{cell}_{int(getattr(node,'lineno',0) or 0)}_{index}"
        emitted.append({"id":_op_id(cell,int(getattr(node,"lineno",0) or 0),index),"kind":"series.select","cellIndex":cell,"line":int(getattr(node,"lineno",0) or 0),"output":input_name,"input":source,"selector":selector})
    elif isinstance(owner_expr,ast.Name):
        input_name=owner_expr.id
    else:
        return [],_diag(cell,node,"TABLE_IR_APPLY_INPUT_UNRESOLVED","Series.apply input must be one Series symbol or literal single-column DataFrame selection.")
    emitted.append({
        "id":_op_id(cell,int(getattr(node,"lineno",0) or 0),index+len(emitted)),
        "kind":"series.apply","cellIndex":cell,"line":int(getattr(node,"lineno",0) or 0),
        "output":output,"input":input_name,"callback":callback,"args":kwargs.get("args",[]),
    })
    return emitted,None

def _curve_fit_call(node:ast.AST,symbols:dict[str,set[str]])->ast.Call|None:
    if not isinstance(node,ast.Call):return None
    func=node.func
    if isinstance(func,ast.Name) and func.id in symbols.get("direct",set()):return node
    if isinstance(func,ast.Attribute) and func.attr=="curve_fit":
        owner=func.value
        if isinstance(owner,ast.Name) and owner.id in symbols.get("optimize",set()):return node
        if isinstance(owner,ast.Attribute) and owner.attr=="optimize" and isinstance(owner.value,ast.Name) and owner.value.id in symbols.get("scipy",set()):return node
    return None

def _curve_fit_model(cell:int,node:ast.AST,expr:ast.AST,callbacks:dict[str,dict[str,Any]],duplicates:set[str],symbols:dict[str,set[str]])->tuple[dict[str,Any]|None,dict[str,Any]|None]:
    if isinstance(expr,ast.Name):
        if expr.id in duplicates:
            return None,_diag(cell,node,"TABLE_IR_CURVE_FIT_MODEL_AMBIGUOUS",f"curve_fit model {expr.id} has multiple top-level definitions.")
        callback=callbacks.get(expr.id)
        if callback is None:
            return None,_diag(cell,node,"TABLE_IR_CURVE_FIT_MODEL_UNRESOLVED",f"curve_fit model {expr.id} must be one top-level function in the imported source.")
        if callback.get("async"):
            return None,_diag(cell,node,"TABLE_IR_CURVE_FIT_MODEL_ASYNC","curve_fit model must be synchronous.")
        return {"name":callback["name"],"source":callback["source"],"kind":"named","scalarMathRoots":["math",*sorted(symbols.get("numpy",set()))]},None
    if isinstance(expr,ast.Lambda):
        args=expr.args
        if args.posonlyargs or args.kwonlyargs or args.vararg or args.kwarg:
            return None,_diag(cell,node,"TABLE_IR_CURVE_FIT_MODEL_SIGNATURE","Inline curve_fit lambda supports positional parameters only.")
        params=list(args.args)
        if not 2<=len(params)<=7:
            return None,_diag(cell,node,"TABLE_IR_CURVE_FIT_MODEL_SIGNATURE","Inline curve_fit lambda requires x plus 1..6 fit parameters.")
        if args.defaults:
            return None,_diag(cell,node,"TABLE_IR_CURVE_FIT_MODEL_DEFAULTS","Inline curve_fit lambda defaults are not supported in bounded fitting v1.")
        name="__dkds_inline_curve_fit"
        source="def "+name+"("+",".join(arg.arg for arg in params)+"):\n    return "+_unparse(expr.body)
        return {"name":name,"source":source,"kind":"lambda","scalarMathRoots":["math",*sorted(symbols.get("numpy",set()))]},None
    return None,_diag(cell,node,"TABLE_IR_CURVE_FIT_MODEL_UNSUPPORTED","curve_fit model must be a top-level function name or inline lambda.")

def _curve_fit_data_input(cell:int,node:ast.AST,index:int,expr:ast.AST,label:str)->tuple[list[dict[str,Any]],str|None,dict[str,Any]|None]:
    if isinstance(expr,ast.Name):return [],expr.id,None
    selected=_series_selection(expr)
    if selected:
        source,selector=selected
        temporary=f"__dkds_fit_{label}_series_{cell}_{int(getattr(node,'lineno',0) or 0)}_{index}"
        return [{"id":_op_id(cell,int(getattr(node,"lineno",0) or 0),index),"kind":"series.select","cellIndex":cell,"line":int(getattr(node,"lineno",0) or 0),"output":temporary,"input":source,"selector":selector}],temporary,None
    ok,literal=_literal(expr)
    if ok and isinstance(literal,(list,tuple)):
        values=list(literal)
        if any(isinstance(value,bool) or not isinstance(value,(int,float)) for value in values):
            return [],None,_diag(cell,node,"TABLE_IR_CURVE_FIT_DATA_NON_NUMERIC",f"curve_fit {label} literal data must be numeric.")
        temporary=f"__dkds_fit_{label}_array_{cell}_{int(getattr(node,'lineno',0) or 0)}_{index}"
        return [{"id":_op_id(cell,int(getattr(node,"lineno",0) or 0),index),"kind":"array.literal","cellIndex":cell,"line":int(getattr(node,"lineno",0) or 0),"output":temporary,"sourceMethod":"fit-literal","values":values,"kwargs":{}}],temporary,None
    return [],None,_diag(cell,node,"TABLE_IR_CURVE_FIT_DATA_UNRESOLVED",f"curve_fit {label} must be a Series/Array symbol, literal single-column selection, or numeric literal list.")

def _curve_fit_op(cell:int,node:ast.AST,index:int,output:str,call:ast.Call,callbacks:dict[str,dict[str,Any]],duplicates:set[str],symbols:dict[str,set[str]])->tuple[list[dict[str,Any]],dict[str,Any]|None]:
    if len(call.args)<3 or len(call.args)>4:
        return [],_diag(cell,node,"TABLE_IR_CURVE_FIT_ARGS","bounded curve_fit requires model, xdata, ydata and optional positional p0.")
    model,error=_curve_fit_model(cell,node,call.args[0],callbacks,duplicates,symbols)
    if error:return [],error
    kwargs={}
    for keyword in call.keywords:
        if keyword.arg!="p0":
            return [],_diag(cell,node,"TABLE_IR_CURVE_FIT_KWARGS_UNSUPPORTED",f"curve_fit keyword {keyword.arg or '**kwargs'} is outside bounded fitting v1; only literal p0 is supported.")
        ok,value=_literal(keyword.value)
        if not ok:
            return [],_diag(cell,node,"TABLE_IR_CURVE_FIT_P0_LITERAL","curve_fit p0 must be a literal numeric list/tuple or None.")
        kwargs["p0"]=value
    if len(call.args)==4 and "p0" in kwargs:
        return [],_diag(cell,node,"TABLE_IR_CURVE_FIT_P0_DUPLICATE","curve_fit p0 must be supplied once.")
    if len(call.args)==4:
        ok,p0=_literal(call.args[3])
        if not ok:
            return [],_diag(cell,node,"TABLE_IR_CURVE_FIT_P0_LITERAL","curve_fit p0 must be a literal numeric list/tuple or None.")
    else:p0=kwargs.get("p0")
    if p0 is not None:
        if not isinstance(p0,(list,tuple)) or not p0:
            return [],_diag(cell,node,"TABLE_IR_CURVE_FIT_P0_LITERAL","curve_fit p0 must be a non-empty literal numeric list/tuple or None.")
        p0=list(p0)
        if any(isinstance(value,bool) or not isinstance(value,(int,float)) for value in p0):
            return [],_diag(cell,node,"TABLE_IR_CURVE_FIT_P0_LITERAL","curve_fit p0 values must be numeric literals.")
    emitted=[]
    x_ops,x_name,error=_curve_fit_data_input(cell,node,index,call.args[1],"x")
    if error:return [],error
    emitted.extend(x_ops)
    y_ops,y_name,error=_curve_fit_data_input(cell,node,index+len(emitted),call.args[2],"y")
    if error:return [],error
    emitted.extend(y_ops)
    emitted.append({
        "id":_op_id(cell,int(getattr(node,"lineno",0) or 0),index+len(emitted)),
        "kind":"fit.curve","cellIndex":cell,"line":int(getattr(node,"lineno",0) or 0),
        "output":output,"inputs":[x_name,y_name],"x":x_name,"y":y_name,
        "model":model,"p0":p0,
    })
    return emitted,None

def _curve_fit_assignment(node:ast.Assign|ast.AnnAssign,symbols:dict[str,set[str]])->tuple[str,ast.Call|None,str|None]:
    target=node.targets[0] if isinstance(node,ast.Assign) and len(node.targets)==1 else node.target if isinstance(node,ast.AnnAssign) else None
    value=node.value
    if isinstance(target,ast.Name) and isinstance(value,ast.Subscript):
        call=_curve_fit_call(value.value,symbols)
        ok,index=_literal(value.slice)
        if call and ok and index==0:return target.id,call,None
        if call:return "",call,"curve_fit tuple extraction supports only [0] (optimal parameters) in bounded fitting v1."
    if isinstance(node,ast.Assign) and len(node.targets)==1 and isinstance(target,(ast.Tuple,ast.List)):
        call=_curve_fit_call(value,symbols)
        names=[_name(item) for item in target.elts]
        if call and len(names)==2 and names[0] and names[1]=="_":
            return names[0],call,None
        if call:
            return "",call,"curve_fit covariance output pcov is 2D and remains outside bounded fitting v1; use popt, _ = curve_fit(...) or curve_fit(...)[0]."
    if _curve_fit_call(value,symbols):
        return "",value,"curve_fit returns (popt, pcov); bounded fitting v1 requires explicit popt extraction with [0] or popt, _ unpacking."
    return "",None,None

def _groupby_call(node:ast.AST)->ast.Call|None:
    if not isinstance(node,ast.Call) or not isinstance(node.func,ast.Attribute):return None
    if node.func.attr!="groupby" or not isinstance(node.func.value,ast.Name):return None
    return node

def _groupby_chain(node:ast.AST)->tuple[ast.Call,dict[str,Any]|None]|None:
    call=_groupby_call(node)
    if call:return call,None
    if isinstance(node,ast.Subscript):
        call=_groupby_call(node.value)
        if not call:return None
        ok,selector=_selector(node.slice)
        if not ok or selector.get("kind")!="literal":return None
        value=selector.get("value")
        if isinstance(value,bool) or not isinstance(value,(str,int)):return None
        return call,selector
    return None

def _groupby_create_op(cell:int,node:ast.AST,index:int,output:str,call:ast.Call)->tuple[dict[str,Any]|None,dict[str,Any]|None]:
    args,kwargs,error=_call_literals(cell,node,call,"groupby")
    if error:return None,error
    source=_name(call.func.value)
    if not source:return None,_diag(cell,node,"TABLE_IR_GROUPBY_SOURCE_UNRESOLVED","groupby() must target a simple DataFrame symbol in IR v1.")
    return {"id":_op_id(cell,int(getattr(node,"lineno",0) or 0),index),"kind":"groupby.create","cellIndex":cell,"line":int(getattr(node,"lineno",0) or 0),"output":output,"input":source,"args":args,"kwargs":kwargs},None

def _numpy_method(call:ast.Call)->str:
    if not isinstance(call.func,ast.Attribute):return ""
    if not isinstance(call.func.value,ast.Name) or call.func.value.id not in _NUMPY_NAMES:return ""
    return call.func.attr

def _numeric_scalar(node:ast.AST)->tuple[bool,int|float|None]:
    ok,value=_literal(node)
    if not ok or isinstance(value,bool) or not isinstance(value,(int,float)):return False,None
    return True,value

def _array_operand(node:ast.AST)->tuple[dict[str,Any]|None,str|None]:
    if isinstance(node,ast.Name):return {"kind":"symbol","name":node.id},node.id
    ok,value=_numeric_scalar(node)
    if ok:return {"kind":"scalar","value":value},None
    return None,None

def _array_input(cell:int,node:ast.AST,index:int,expr:ast.AST)->tuple[list[dict[str,Any]],str|None,dict[str,Any]|None]:
    if isinstance(expr,ast.Name):return [],expr.id,None
    selected=_series_selection(expr)
    if selected:
        source,selector=selected
        temporary=f"__dkds_array_series_{cell}_{int(getattr(node,'lineno',0) or 0)}_{index}"
        return [{"id":_op_id(cell,int(getattr(node,"lineno",0) or 0),index),"kind":"series.select","cellIndex":cell,"line":int(getattr(node,"lineno",0) or 0),"output":temporary,"input":source,"selector":selector}],temporary,None
    return [],None,_diag(cell,node,"TABLE_IR_ARRAY_INPUT_UNRESOLVED","NumPy Array IR input must be a simple symbol or a literal single-column DataFrame selection.")

def _numpy_call_op(cell:int,node:ast.AST,index:int,output:str,call:ast.Call)->tuple[list[dict[str,Any]],dict[str,Any]|None]:
    method=_numpy_method(call)
    line=int(getattr(node,"lineno",0) or 0)
    if method in {"array","asarray"}:
        if not call.args:return [],_diag(cell,node,"TABLE_IR_ARRAY_CONSTRUCTOR_ARGS","np.array/asarray requires one one-dimensional input.")
        if len(call.args)!=1:return [],_diag(cell,node,"TABLE_IR_ARRAY_CONSTRUCTOR_ARGS","np.array/asarray supports exactly one data argument in bounded Array IR v1.")
        ok,value=_literal(call.args[0])
        ok_kwargs,kwargs=_keyword_literals(call)
        if not ok_kwargs:return [],_diag(cell,node,"TABLE_IR_ARRAY_CONSTRUCTOR_KWARGS","np.array/asarray keyword arguments must be literal.")
        if ok and isinstance(value,(list,tuple)):
            return [{"id":_op_id(cell,line,index),"kind":"array.literal","cellIndex":cell,"line":line,"output":output,"sourceMethod":method,"values":list(value),"kwargs":kwargs}],None
        emitted,input_name,error=_array_input(cell,node,index,call.args[0])
        if error:return [],error
        emitted.append({"id":_op_id(cell,line,index+len(emitted)),"kind":"array.from-value","cellIndex":cell,"line":line,"output":output,"input":input_name,"sourceMethod":method,"kwargs":kwargs})
        return emitted,None
    if method in {"linspace","arange"}:
        args,kwargs,error=_call_literals(cell,node,call,method)
        if error:return [],error
        return [{"id":_op_id(cell,line,index),"kind":"array.range","cellIndex":cell,"line":line,"output":output,"sourceMethod":method,"args":args,"kwargs":kwargs}],None
    if method in (_NUMPY_UNARY|_NUMPY_REDUCE|{"diff"}):
        if not call.args:return [],_diag(cell,node,"TABLE_IR_ARRAY_CALL_INPUT","NumPy array operation requires an input array symbol.")
        emitted,input_name,error=_array_input(cell,node,index,call.args[0])
        if error:return [],error
        rest=[]
        for arg in call.args[1:]:
            ok,value=_literal(arg)
            if not ok:return [],_diag(cell,node,"TABLE_IR_ARRAY_ARGUMENT_UNRESOLVED",f"np.{method} additional positional arguments must be literal.")
            rest.append(value)
        ok_kwargs,kwargs=_keyword_literals(call)
        if not ok_kwargs:return [],_diag(cell,node,"TABLE_IR_ARRAY_KEYWORD_UNRESOLVED",f"np.{method} keyword arguments must be literal.")
        kind="array.unary" if method in _NUMPY_UNARY else "array.reduce" if method in _NUMPY_REDUCE else "array.diff"
        emitted.append({"id":_op_id(cell,line,index+len(emitted)),"kind":kind,"cellIndex":cell,"line":line,"output":output,"input":input_name,"sourceMethod":method,"args":rest,"kwargs":kwargs})
        return emitted,None
    return [],_diag(cell,node,"TABLE_IR_NUMPY_CALL_UNSUPPORTED",f"np.{method or 'unknown'} is outside bounded Array IR v1.")

def _assignment_op(cell:int,node:ast.Assign|ast.AnnAssign,index:int,callbacks:dict[str,dict[str,Any]],duplicates:set[str],curve_fit_symbols:dict[str,set[str]])->tuple[list[dict[str,Any]],dict[str,Any]|None]:
    fit_output,fit_call,fit_error=_curve_fit_assignment(node,curve_fit_symbols)
    if fit_call is not None:
        if fit_error:return [],_diag(cell,node,"TABLE_IR_CURVE_FIT_OUTPUT_UNSUPPORTED",fit_error)
        return _curve_fit_op(cell,node,index,fit_output,fit_call,callbacks,duplicates,curve_fit_symbols)
    output=_assign_target(node)
    if not output:return [],_diag(cell,node,"TABLE_IR_TARGET_UNSUPPORTED","Table Transform IR v1 requires a simple assignment target.")
    value=node.value
    if isinstance(value,(ast.Constant,ast.List,ast.Tuple,ast.Dict,ast.Name)):
        ok,literal=_literal(value)
        if ok:return [{"id":_op_id(cell,node.lineno,index),"kind":"value.bind","cellIndex":cell,"line":node.lineno,"output":output,"value":literal}],None
        if isinstance(value,ast.Name):return [{"id":_op_id(cell,node.lineno,index),"kind":"value.alias","cellIndex":cell,"line":node.lineno,"output":output,"input":value.id}],None
    if isinstance(value,ast.Attribute) and value.attr=="values":
        emitted,input_name,error=_array_input(cell,node,index,value.value)
        if error:return [],error
        emitted.append({"id":_op_id(cell,node.lineno,index+len(emitted)),"kind":"array.from-value","cellIndex":cell,"line":node.lineno,"output":output,"input":input_name,"sourceMethod":"values","kwargs":{}})
        return emitted,None
    if isinstance(value,ast.Subscript) and isinstance(value.value,ast.Name):
        ok,selector=_selector(value.slice)
        if ok and selector.get("kind")=="slice":
            return [{"id":_op_id(cell,node.lineno,index),"kind":"array.slice","cellIndex":cell,"line":node.lineno,"output":output,"input":value.value.id,"selector":selector}],None
    if isinstance(value,ast.BinOp) and type(value.op) in _ARRAY_BINOPS:
        left,left_symbol=_array_operand(value.left);right,right_symbol=_array_operand(value.right)
        if left is None or right is None:
            return [],_diag(cell,node,"TABLE_IR_ARRAY_BINARY_UNRESOLVED","Bounded Array IR binary operands must be simple symbols or numeric scalar literals.")
        inputs=[name for name in (left_symbol,right_symbol) if name]
        return [{"id":_op_id(cell,node.lineno,index),"kind":"array.binary","cellIndex":cell,"line":node.lineno,"output":output,"operator":_ARRAY_BINOPS[type(value.op)],"left":left,"right":right,"inputs":inputs}],None
    if isinstance(value,ast.UnaryOp) and isinstance(value.op,(ast.UAdd,ast.USub)) and isinstance(value.operand,ast.Name):
        return [{"id":_op_id(cell,node.lineno,index),"kind":"array.unary","cellIndex":cell,"line":node.lineno,"output":output,"input":value.operand.id,"sourceMethod":"pos" if isinstance(value.op,ast.UAdd) else "neg","args":[],"kwargs":{}}],None
    series_selection=_series_selection(value)
    if series_selection:
        source,selector=series_selection
        return [{"id":_op_id(cell,node.lineno,index),"kind":"series.select","cellIndex":cell,"line":node.lineno,"output":output,"input":source,"selector":selector}],None
    if isinstance(value,ast.Subscript) and isinstance(value.value,ast.Attribute) and value.value.attr in {"iloc","loc"}:
        source=_name(value.value.value)
        ok,selector=_selector(value.slice)
        if source and ok:
            return [{"id":_op_id(cell,node.lineno,index),"kind":"table.slice","cellIndex":cell,"line":node.lineno,"output":output,"input":source,"mode":value.value.attr,"selector":selector}],None
        return [],_diag(cell,node,"TABLE_IR_SLICE_UNRESOLVED","iloc/loc selectors must be static literals/slices or simple symbols.")
    if isinstance(value,ast.Call):
        if isinstance(value.func,ast.Attribute) and value.func.attr=="apply":
            return _series_apply_op(cell,node,index,output,value,callbacks,duplicates)
        if isinstance(value.func,ast.Attribute) and value.func.attr=="to_numpy":
            emitted,input_name,error=_array_input(cell,node,index,value.func.value)
            if error:return [],error
            args,kwargs,error=_call_literals(cell,node,value,"to_numpy")
            if error:return [],error
            emitted.append({"id":_op_id(cell,node.lineno,index+len(emitted)),"kind":"array.from-value","cellIndex":cell,"line":node.lineno,"output":output,"input":input_name,"sourceMethod":"to_numpy","args":args,"kwargs":kwargs})
            return emitted,None
        numpy_method=_numpy_method(value)
        if numpy_method:
            return _numpy_call_op(cell,node,index,output,value)
        source=_source_call(value)
        if source:
            input_format,capability=source
            source_hint=""
            if value.args:
                ok_hint,resolved_hint=_literal(value.args[0])
                if ok_hint and isinstance(resolved_hint,str):source_hint=resolved_hint
            return [{"id":_op_id(cell,node.lineno,index),"kind":"source.table","cellIndex":cell,"line":node.lineno,"output":output,"originalFormat":input_format,"sourceHint":source_hint,"hostCapability":capability,"replacement":"scoped DKDS DataTable input"}],None
        groupby_call=_groupby_call(value)
        if groupby_call:
            operation,error=_groupby_create_op(cell,node,index,output,groupby_call)
            return ([operation] if operation else []),error
        if isinstance(value.func,ast.Attribute) and isinstance(value.func.value,ast.Name) and value.func.value.id in {"pd","pandas"} and value.func.attr=="concat":
            if not value.args or not isinstance(value.args[0],(ast.List,ast.Tuple)):
                return [],_diag(cell,node,"TABLE_IR_CONCAT_UNRESOLVED","pd.concat requires a literal list/tuple of table symbols in IR v1.")
            inputs=[_name(item) for item in value.args[0].elts]
            ok,kwargs=_keyword_literals(value)
            if not all(inputs) or not ok:return [],_diag(cell,node,"TABLE_IR_CONCAT_UNRESOLVED","pd.concat inputs/keywords must be statically resolvable.")
            axis=kwargs.get("axis",0)
            if axis not in {0,1}:return [],_diag(cell,node,"TABLE_IR_CONCAT_AXIS_UNSUPPORTED","pd.concat axis must be 0 or 1.")
            return [{"id":_op_id(cell,node.lineno,index),"kind":"table.concat","cellIndex":cell,"line":node.lineno,"output":output,"inputs":inputs,"axis":axis,"ignoreIndex":bool(kwargs.get("ignore_index",False))}],None
        if isinstance(value.func,ast.Attribute) and value.func.attr in _AGGREGATE_METHODS:
            selected=_series_selection(value.func.value)
            if selected:
                source_name,selector=selected
                args,kwargs,error=_call_literals(cell,node,value,value.func.attr)
                if error:return [],error
                temporary=f"__dkds_series_{cell}_{node.lineno}_{index}"
                return [
                    {"id":_op_id(cell,node.lineno,index),"kind":"series.select","cellIndex":cell,"line":node.lineno,"output":temporary,"input":source_name,"selector":selector},
                    {"id":_op_id(cell,node.lineno,index+1),"kind":_SUPPORTED_METHODS[value.func.attr],"cellIndex":cell,"line":node.lineno,"output":output,"input":temporary,"args":args,"kwargs":kwargs},
                ],None
        if isinstance(value.func,ast.Attribute) and value.func.attr in (_AGGREGATE_METHODS|_GROUPBY_AGG_METHODS):
            chained=_groupby_chain(value.func.value)
            if chained:
                group_call,selector=chained
                group_args,group_kwargs,error=_call_literals(cell,node,group_call,"groupby")
                if error:return [],error
                source_name=_name(group_call.func.value)
                aggregate_args,aggregate_kwargs,error=_call_literals(cell,node,value,value.func.attr)
                if error:return [],error
                group_temp=f"__dkds_groupby_{cell}_{node.lineno}_{index}"
                emitted=[
                    {"id":_op_id(cell,node.lineno,index),"kind":"groupby.create","cellIndex":cell,"line":node.lineno,"output":group_temp,"input":source_name,"args":group_args,"kwargs":group_kwargs},
                ]
                aggregate_input=group_temp
                next_index=index+1
                if selector is not None:
                    series_temp=f"__dkds_groupby_series_{cell}_{node.lineno}_{index}"
                    emitted.append({"id":_op_id(cell,node.lineno,next_index),"kind":"series.select","cellIndex":cell,"line":node.lineno,"output":series_temp,"input":group_temp,"selector":selector})
                    aggregate_input=series_temp
                    next_index+=1
                if value.func.attr in _GROUPBY_AGG_METHODS:
                    emitted.append({"id":_op_id(cell,node.lineno,next_index),"kind":"groupby.aggregate","cellIndex":cell,"line":node.lineno,"output":output,"input":aggregate_input,"sourceMethod":value.func.attr,"args":aggregate_args,"kwargs":aggregate_kwargs})
                else:
                    emitted.append({"id":_op_id(cell,node.lineno,next_index),"kind":_SUPPORTED_METHODS[value.func.attr],"cellIndex":cell,"line":node.lineno,"output":output,"input":aggregate_input,"args":aggregate_args,"kwargs":aggregate_kwargs})
                return emitted,None
        owner,method=_call_owner(value)
        if owner and method in _SUPPORTED_METHODS:
            args,kwargs,error=_call_literals(cell,node,value,method)
            if error:return [],error
            return [{"id":_op_id(cell,node.lineno,index),"kind":_SUPPORTED_METHODS[method],"cellIndex":cell,"line":node.lineno,"output":output,"input":owner,"args":args,"kwargs":kwargs}],None
        if owner and method in _GROUPBY_AGG_METHODS:
            args,kwargs,error=_call_literals(cell,node,value,method)
            if error:return [],error
            return [{"id":_op_id(cell,node.lineno,index),"kind":"groupby.aggregate","cellIndex":cell,"line":node.lineno,"output":output,"input":owner,"sourceMethod":method,"args":args,"kwargs":kwargs}],None
    return [],_diag(cell,node,"TABLE_IR_ASSIGNMENT_UNLOWERED","Assignment is outside the current bounded Table Transform IR.")

def _expression_op(cell:int,node:ast.Expr,index:int)->tuple[dict[str,Any]|None,dict[str,Any]|None]:
    call=node.value
    if not isinstance(call,ast.Call):
        return None,_diag(cell,node,"TABLE_IR_EXPRESSION_UNLOWERED","Only mapped host/presentation calls are allowed as standalone workflow expressions.")
    owner,method=_call_owner(call)
    if owner and method in _HOST_METHODS:
        kind,capability=_HOST_METHODS[method]
        ok_args,args=_positional_literals(call)
        ok_kwargs,kwargs=_keyword_literals(call)
        if not ok_args or not ok_kwargs:return None,_diag(cell,node,"TABLE_IR_HOST_CALL_UNRESOLVED",f"{method} arguments must be literal in IR v1.")
        return {"id":_op_id(cell,node.lineno,index),"kind":kind,"cellIndex":cell,"line":node.lineno,"input":owner,"sourceMethod":method,"hostCapability":capability,"args":args,"kwargs":kwargs},None
    return None,_diag(cell,node,"TABLE_IR_CALL_UNLOWERED","Standalone call is not yet mapped to a DKDS Table/Host operation.")

def analyze_table_transform(path:str|Path)->dict[str,Any]:
    source_path=Path(path).expanduser().resolve()
    kind,cells,_=_read_cells(source_path)
    operations=[]
    diagnostics=[]
    statement_count=0
    lowered_statement_count=0
    callbacks,duplicate_callbacks=_callback_sources(cells)
    curve_fit_symbols=_scipy_curve_fit_symbols(cells)
    for cell in cells:
        try:tree=ast.parse(_sanitize(cell["source"]),filename=f"{source_path.name}#cell-{cell['index']}",mode="exec")
        except SyntaxError:continue
        op_index=0
        for node in tree.body:
            if isinstance(node,_DECLARATIONS):continue
            statement_count+=1
            emitted=[]
            diagnostic=None
            if isinstance(node,(ast.Assign,ast.AnnAssign)):
                emitted,diagnostic=_assignment_op(cell["index"],node,op_index,callbacks,duplicate_callbacks,curve_fit_symbols)
            elif isinstance(node,ast.Expr):
                operation,diagnostic=_expression_op(cell["index"],node,op_index)
                if operation:emitted=[operation]
            else:
                diagnostic=_diag(cell["index"],node,"TABLE_IR_STATEMENT_UNLOWERED",f"{type(node).__name__} is not part of Table Transform IR v1.")
            if emitted:
                operations.extend(emitted)
                op_index+=len(emitted)
                lowered_statement_count+=1
            elif diagnostic:diagnostics.append(diagnostic)
    ratio=1.0 if statement_count==0 else lowered_statement_count/statement_count
    return {
        "schema":PLAN_SCHEMA,"source":source_path.name,"sourceKind":kind,
        "operations":operations,"diagnostics":diagnostics,
        "statementCount":statement_count,"lowerableStatementCount":lowered_statement_count,
        "coverage":ratio,"buildable":statement_count>0 and not diagnostics and lowered_statement_count==statement_count,
        "sourceExecuted":False,
    }
