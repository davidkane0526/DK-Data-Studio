#!/usr/bin/env python3
"""DKDS Table Transform IR -> bounded JavaScript Core Task lowering.

This compiler is authoring-time only. It does not execute Python/Pandas and does
not ship a Pandas-compatible runtime. A closed structural subset becomes one
ordinary DKDSTaskDefinition operating on detached artifact-table snapshots.
"""
from __future__ import annotations

import json
import re
from typing import Any

from dkds_portable_task import CompiledPortableTask, PortableTaskError, compile_portable_scalar_callback

EXECUTION_SCHEMA="dkds.table-transform-execution.v1"
TASK_ID=re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
_EXECUTABLE={
    "source.table","value.bind","value.alias",
    "series.select","series.apply","fit.curve","groupby.create","groupby.aggregate",
    "array.literal","array.from-value","array.range","array.unary","array.binary","array.diff","array.reduce","array.slice",
    "table.slice","table.abs","table.copy","table.reset-index",
    "table.diff","table.dropna","table.sort-index","table.concat",
    "table.mean","table.median","table.std",
}
_AGGREGATES={"table.mean":"mean","table.median":"median","table.std":"std"}
_GROUPBY_REDUCERS={"mean","median","std"}
_ARRAY_MAX_LENGTH=65536
_ARRAY_DTYPES={"float","float32","float64","double","int","int32","int64"}
_ARRAY_UNARY={"abs","sqrt","log","log10","exp","neg","pos"}
_ARRAY_BINARY={"add","sub","mul","div","pow","mod"}
_ARRAY_REDUCERS={"mean","median","std"}
_TABLE_UNARY={
    "table.slice","table.abs","table.copy","table.reset-index",
    "table.diff","table.dropna","table.sort-index",
}
_MAPPABLE_HOST={"view.plot","host.clipboard","host.export"}
_PENDING_HOST=set()

def _literal_kind(value:Any)->str:
    return "scalar" if value is None or isinstance(value,(bool,int,float,str)) else "value"

def _series_apply_config(op:dict[str,Any])->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    callback=op.get("callback")
    if not isinstance(callback,dict):
        return None,("TABLE_TASK_APPLY_CALLBACK_INVALID","Series.apply requires one bounded callback descriptor.")
    source=str(callback.get("source","") or "")
    name=str(callback.get("name","") or "")
    if not source or not name:
        return None,("TABLE_TASK_APPLY_CALLBACK_INVALID","Series.apply callback source/name is missing.")
    try:
        compiled=compile_portable_scalar_callback(source,function_name=name)
    except PortableTaskError as exc:
        return None,("TABLE_TASK_APPLY_CALLBACK_UNSUPPORTED",str(exc))
    args=list(op.get("args") or [])
    if len(args)>7:
        return None,("TABLE_TASK_APPLY_ARGS_EXCEEDED","Series.apply bounded v1 supports at most seven extra scalar args.")
    supplied=1+len(args)
    total=len(compiled.parameters)
    if supplied<compiled.required_parameters or supplied>total:
        return None,("TABLE_TASK_APPLY_ARITY",f"Series.apply callback {name} expects {compiled.required_parameters}..{total} argument(s), but value + args= supplies {supplied}.")
    for value in args:
        if value is not None and not isinstance(value,(str,int,float,bool)):
            return None,("TABLE_TASK_APPLY_ARGS_LITERAL","Series.apply extra args must be scalar literals.")
    return {"callbackSource":compiled.source,"parameters":list(compiled.parameters),"required":compiled.required_parameters,"args":args},None

def _curve_fit_config(op:dict[str,Any])->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    model=op.get("model")
    if not isinstance(model,dict):
        return None,("TABLE_TASK_CURVE_FIT_MODEL_INVALID","curve_fit requires one bounded model descriptor.")
    source=str(model.get("source","") or "");name=str(model.get("name","") or "")
    if not source or not name:
        return None,("TABLE_TASK_CURVE_FIT_MODEL_INVALID","curve_fit model source/name is missing.")
    try:
        compiled=compile_portable_scalar_callback(source,function_name=name)
    except PortableTaskError as exc:
        return None,("TABLE_TASK_CURVE_FIT_MODEL_UNSUPPORTED",str(exc))
    parameter_count=len(compiled.parameters)-1
    if parameter_count<1 or parameter_count>6:
        return None,("TABLE_TASK_CURVE_FIT_MODEL_ARITY","bounded curve_fit requires x plus 1..6 fit parameters.")
    p0=op.get("p0")
    if p0 is None:
        initial=[1.0]*parameter_count
    else:
        if not isinstance(p0,list) or len(p0)!=parameter_count:
            return None,("TABLE_TASK_CURVE_FIT_P0_ARITY",f"curve_fit p0 must contain exactly {parameter_count} value(s).")
        initial=[]
        for value in p0:
            if isinstance(value,bool) or not isinstance(value,(int,float)):
                return None,("TABLE_TASK_CURVE_FIT_P0_INVALID","curve_fit p0 values must be numeric literals.")
            value=float(value)
            if not __import__("math").isfinite(value):
                return None,("TABLE_TASK_CURVE_FIT_P0_INVALID","curve_fit p0 values must be finite.")
            initial.append(value)
    return {
        "modelSource":compiled.source,
        "parameterNames":list(compiled.parameters[1:]),
        "parameterCount":parameter_count,
        "p0":initial,
        "maxIterations":200,
    },None

def _aggregate_config(op:dict[str,Any],input_kind:str)->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    kind=str(op.get("kind",""))
    method=_AGGREGATES.get(kind,"")
    args=list(op.get("args") or [])
    kwargs=dict(op.get("kwargs") or {})
    allowed={"axis","skipna","numeric_only"}|({"ddof"} if method=="std" else set())
    unknown=sorted(set(kwargs)-allowed)
    if unknown:return None,("TABLE_TASK_AGGREGATE_KWARGS_UNSUPPORTED","Unsupported aggregate keyword(s): "+", ".join(unknown))
    if len(args)>1:return None,("TABLE_TASK_AGGREGATE_ARGS_UNSUPPORTED",f"{method} supports at most one positional axis argument in SDK 1.51.77.")
    axis=kwargs.get("axis",args[0] if args else 0)
    if input_kind=="table":
        if axis not in {0,1,"index","columns"}:
            return None,("TABLE_TASK_AGGREGATE_AXIS_UNSUPPORTED","DataFrame aggregate axis must be 0/index or 1/columns.")
        axis=1 if axis in {1,"columns"} else 0
    elif input_kind=="series":
        if axis not in {None,0,"index"}:
            return None,("TABLE_TASK_AGGREGATE_AXIS_UNSUPPORTED","Series aggregate axis must be None, 0 or index.")
        axis=0
    else:
        return None,("TABLE_TASK_AGGREGATE_INPUT_UNSUPPORTED",f"{method} requires a DataTable or Series input.")
    skipna=kwargs.get("skipna",True)
    numeric_only=kwargs.get("numeric_only",False)
    if not isinstance(skipna,bool):
        return None,("TABLE_TASK_AGGREGATE_SKIPNA_INVALID","aggregate skipna must be a literal boolean.")
    if not isinstance(numeric_only,bool):
        return None,("TABLE_TASK_AGGREGATE_NUMERIC_ONLY_INVALID","aggregate numeric_only must be a literal boolean.")
    ddof=kwargs.get("ddof",1)
    if method=="std":
        if isinstance(ddof,bool) or not isinstance(ddof,int):
            return None,("TABLE_TASK_STD_DDOF_INVALID","std ddof must be a literal integer.")
    else:ddof=1
    return {"axis":axis,"skipna":skipna,"numericOnly":numeric_only,"ddof":ddof},None

def _groupby_config(op:dict[str,Any])->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    args=list(op.get("args") or [])
    kwargs=dict(op.get("kwargs") or {})
    allowed={"by","sort","dropna","as_index"}
    unknown=sorted(set(kwargs)-allowed)
    if unknown:return None,("TABLE_TASK_GROUPBY_KWARGS_UNSUPPORTED","Unsupported groupby keyword(s): "+", ".join(unknown))
    if len(args)>1:return None,("TABLE_TASK_GROUPBY_ARGS_UNSUPPORTED","groupby() supports one positional by argument in SDK 1.51.78.")
    if args and "by" in kwargs:return None,("TABLE_TASK_GROUPBY_BY_DUPLICATE","groupby by must be supplied once.")
    by=args[0] if args else kwargs.get("by")
    if isinstance(by,(list,tuple)):
        keys=list(by)
    else:
        keys=[by]
    if not keys or any(isinstance(value,bool) or not isinstance(value,(str,int)) for value in keys):
        return None,("TABLE_TASK_GROUPBY_BY_UNSUPPORTED","groupby by must be one literal column label or a non-empty literal list/tuple of labels.")
    if len({str(value) for value in keys})!=len(keys):
        return None,("TABLE_TASK_GROUPBY_BY_DUPLICATE_LABEL","groupby keys must be unique in bounded GroupBy v1.")
    sort=kwargs.get("sort",True);dropna=kwargs.get("dropna",True);as_index=kwargs.get("as_index",True)
    if not isinstance(sort,bool):return None,("TABLE_TASK_GROUPBY_SORT_INVALID","groupby sort must be a literal boolean.")
    if not isinstance(dropna,bool):return None,("TABLE_TASK_GROUPBY_DROPNA_INVALID","groupby dropna must be a literal boolean.")
    if not isinstance(as_index,bool):return None,("TABLE_TASK_GROUPBY_AS_INDEX_INVALID","groupby as_index must be a literal boolean.")
    return {"keys":keys,"sort":sort,"dropna":dropna,"asIndex":as_index},None

def _groupby_reduce_config(op:dict[str,Any])->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    method=_AGGREGATES.get(str(op.get("kind","")),"")
    args=list(op.get("args") or [])
    kwargs=dict(op.get("kwargs") or {})
    allowed={"numeric_only"}|({"ddof"} if method=="std" else set())
    unknown=sorted(set(kwargs)-allowed)
    if unknown:return None,("TABLE_TASK_GROUPBY_REDUCER_KWARGS_UNSUPPORTED","Unsupported GroupBy reducer keyword(s): "+", ".join(unknown))
    if method=="std":
        if len(args)>1:return None,("TABLE_TASK_GROUPBY_REDUCER_ARGS_UNSUPPORTED","GroupBy.std supports at most one positional ddof argument.")
        ddof=kwargs.get("ddof",args[0] if args else 1)
        if isinstance(ddof,bool) or not isinstance(ddof,int):
            return None,("TABLE_TASK_GROUPBY_STD_DDOF_INVALID","GroupBy.std ddof must be a literal integer.")
    else:
        if args:return None,("TABLE_TASK_GROUPBY_REDUCER_ARGS_UNSUPPORTED",f"GroupBy.{method} does not accept positional arguments in bounded v1.")
        ddof=1
    numeric_only=kwargs.get("numeric_only",False)
    if not isinstance(numeric_only,bool):
        return None,("TABLE_TASK_GROUPBY_NUMERIC_ONLY_INVALID","GroupBy numeric_only must be a literal boolean.")
    return {"method":method,"numericOnly":numeric_only,"ddof":ddof},None

def _groupby_agg_spec(op:dict[str,Any],input_kind:str)->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    args=list(op.get("args") or [])
    kwargs=dict(op.get("kwargs") or {})
    if kwargs:
        return None,("TABLE_TASK_GROUPBY_NAMED_AGG_PENDING","Named aggregation/keyword aggregate syntax is outside SDK 1.51.78.")
    if len(args)!=1:
        return None,("TABLE_TASK_GROUPBY_AGG_ARGS_UNSUPPORTED","GroupBy agg/aggregate requires exactly one literal reducer string or column->reducer mapping.")
    spec=args[0]
    if isinstance(spec,str):
        if spec not in _GROUPBY_REDUCERS:
            return None,("TABLE_TASK_GROUPBY_REDUCER_UNSUPPORTED",f"Unsupported GroupBy reducer: {spec}")
        return {"kind":"single","method":spec},None
    if input_kind=="groupby.series":
        return None,("TABLE_TASK_GROUPBY_SERIES_AGG_UNSUPPORTED","SeriesGroupBy agg/aggregate accepts one reducer string in SDK 1.51.78.")
    if not isinstance(spec,dict) or not spec:
        return None,("TABLE_TASK_GROUPBY_AGG_SPEC_UNSUPPORTED","DataFrameGroupBy agg/aggregate requires a non-empty literal column->reducer mapping.")
    items=[]
    for column,reducer in spec.items():
        if isinstance(column,bool) or not isinstance(column,(str,int)):
            return None,("TABLE_TASK_GROUPBY_AGG_COLUMN_UNSUPPORTED","GroupBy aggregate mapping keys must be literal column labels.")
        if not isinstance(reducer,str) or reducer not in _GROUPBY_REDUCERS:
            return None,("TABLE_TASK_GROUPBY_REDUCER_UNSUPPORTED",f"Unsupported GroupBy reducer for {column}: {reducer}")
        items.append({"column":column,"method":reducer})
    return {"kind":"mapping","items":items},None

def _array_kwargs(op:dict[str,Any])->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    kwargs=dict(op.get("kwargs") or {})
    unknown=sorted(set(kwargs)-{"dtype","copy"})
    if unknown:return None,("TABLE_TASK_ARRAY_KWARGS_UNSUPPORTED","Unsupported array/asarray keyword(s): "+", ".join(unknown))
    dtype=kwargs.get("dtype")
    if dtype is not None and (not isinstance(dtype,str) or dtype not in _ARRAY_DTYPES):
        return None,("TABLE_TASK_ARRAY_DTYPE_UNSUPPORTED","bounded Array IR dtype must be one supported numeric dtype string or omitted.")
    copy=kwargs.get("copy")
    if copy is not None and not isinstance(copy,bool):
        return None,("TABLE_TASK_ARRAY_COPY_INVALID","array/asarray copy must be a literal boolean when supplied.")
    return {"dtype":dtype or "float64","copy":copy},None

def _array_literal_config(op:dict[str,Any])->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    values=list(op.get("values") or [])
    if len(values)>_ARRAY_MAX_LENGTH:
        return None,("TABLE_TASK_ARRAY_LENGTH_EXCEEDED",f"Array length exceeds bounded maximum {_ARRAY_MAX_LENGTH}.")
    for value in values:
        if isinstance(value,bool) or not isinstance(value,(int,float)):
            return None,("TABLE_TASK_ARRAY_LITERAL_NON_NUMERIC","bounded Array IR literals must contain numeric scalar values only.")
    kwargs,error=_array_kwargs(op)
    if error:return None,error
    return {"values":values,**(kwargs or {})},None

def _array_range_config(op:dict[str,Any])->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    method=str(op.get("sourceMethod",""))
    args=list(op.get("args") or [])
    kwargs=dict(op.get("kwargs") or {})
    if method=="linspace":
        allowed={"num","endpoint"}
        unknown=sorted(set(kwargs)-allowed)
        if unknown:return None,("TABLE_TASK_ARRAY_RANGE_KWARGS_UNSUPPORTED","Unsupported np.linspace keyword(s): "+", ".join(unknown))
        if len(args)<2 or len(args)>3:return None,("TABLE_TASK_ARRAY_LINSPACE_ARGS","np.linspace requires start, stop and optional num in bounded v1.")
        start,stop=args[0],args[1]
        if any(isinstance(v,bool) or not isinstance(v,(int,float)) for v in (start,stop)):
            return None,("TABLE_TASK_ARRAY_RANGE_NON_NUMERIC","np.linspace start/stop must be numeric literals.")
        if len(args)==3 and "num" in kwargs:return None,("TABLE_TASK_ARRAY_RANGE_DUPLICATE","np.linspace num must be supplied once.")
        num=kwargs.get("num",args[2] if len(args)==3 else 50)
        endpoint=kwargs.get("endpoint",True)
        if isinstance(num,bool) or not isinstance(num,int) or num<0 or num>_ARRAY_MAX_LENGTH:
            return None,("TABLE_TASK_ARRAY_RANGE_LENGTH","np.linspace num must be an integer between 0 and 65536.")
        if not isinstance(endpoint,bool):return None,("TABLE_TASK_ARRAY_RANGE_ENDPOINT","np.linspace endpoint must be a literal boolean.")
        return {"method":"linspace","start":start,"stop":stop,"num":num,"endpoint":endpoint},None
    if method=="arange":
        allowed={"start","stop","step"}
        unknown=sorted(set(kwargs)-allowed)
        if unknown:return None,("TABLE_TASK_ARRAY_RANGE_KWARGS_UNSUPPORTED","Unsupported np.arange keyword(s): "+", ".join(unknown))
        if len(args)>3:return None,("TABLE_TASK_ARRAY_ARANGE_ARGS","np.arange supports at most start, stop, step in bounded v1.")
        if args and kwargs:return None,("TABLE_TASK_ARRAY_RANGE_DUPLICATE","Use positional or keyword np.arange range arguments, not both, in bounded v1.")
        if args:
            if len(args)==1:start,stop,step=0,args[0],1
            elif len(args)==2:start,stop,step=args[0],args[1],1
            else:start,stop,step=args
        else:
            if "stop" not in kwargs:return None,("TABLE_TASK_ARRAY_ARANGE_ARGS","np.arange keyword form requires stop.")
            start,stop,step=kwargs.get("start",0),kwargs["stop"],kwargs.get("step",1)
        if any(isinstance(v,bool) or not isinstance(v,(int,float)) for v in (start,stop,step)):
            return None,("TABLE_TASK_ARRAY_RANGE_NON_NUMERIC","np.arange start/stop/step must be numeric literals.")
        if step==0:return None,("TABLE_TASK_ARRAY_ARANGE_STEP","np.arange step must be non-zero.")
        span=(stop-start)/step
        length=max(0,int(__import__("math").ceil(span))) if span>0 else 0
        if length>_ARRAY_MAX_LENGTH:return None,("TABLE_TASK_ARRAY_LENGTH_EXCEEDED",f"np.arange output exceeds bounded maximum {_ARRAY_MAX_LENGTH}.")
        return {"method":"arange","start":start,"stop":stop,"step":step,"length":length},None
    return None,("TABLE_TASK_ARRAY_RANGE_METHOD","Unknown bounded array range constructor.")

def _array_unary_config(op:dict[str,Any])->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    method=str(op.get("sourceMethod",""))
    if method not in _ARRAY_UNARY:return None,("TABLE_TASK_ARRAY_UNARY_UNSUPPORTED",f"Unsupported bounded array unary operation: {method}")
    if op.get("args") or op.get("kwargs"):return None,("TABLE_TASK_ARRAY_UNARY_ARGS",f"{method} takes no extra arguments in bounded Array IR v1.")
    return {"method":method},None

def _array_diff_config(op:dict[str,Any])->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    args=list(op.get("args") or [])
    kwargs=dict(op.get("kwargs") or {})
    unknown=sorted(set(kwargs)-{"n","axis"})
    if unknown:return None,("TABLE_TASK_ARRAY_DIFF_KWARGS_UNSUPPORTED","Unsupported np.diff keyword(s): "+", ".join(unknown))
    if len(args)>1:return None,("TABLE_TASK_ARRAY_DIFF_ARGS","np.diff supports one optional positional n argument in bounded v1.")
    if args and "n" in kwargs:return None,("TABLE_TASK_ARRAY_DIFF_DUPLICATE","np.diff n must be supplied once.")
    n=kwargs.get("n",args[0] if args else 1)
    axis=kwargs.get("axis",-1)
    if isinstance(n,bool) or not isinstance(n,int) or n<0:return None,("TABLE_TASK_ARRAY_DIFF_N","np.diff n must be a non-negative literal integer.")
    if axis not in {-1,0}:return None,("TABLE_TASK_ARRAY_AXIS_UNSUPPORTED","bounded 1D Array IR supports axis -1 or 0 only.")
    return {"n":n},None

def _array_reduce_config(op:dict[str,Any])->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    method=str(op.get("sourceMethod",""))
    args=list(op.get("args") or [])
    kwargs=dict(op.get("kwargs") or {})
    allowed={"axis"}|({"ddof"} if method=="std" else set())
    unknown=sorted(set(kwargs)-allowed)
    if unknown:return None,("TABLE_TASK_ARRAY_REDUCE_KWARGS_UNSUPPORTED","Unsupported NumPy reducer keyword(s): "+", ".join(unknown))
    if len(args)>1:return None,("TABLE_TASK_ARRAY_REDUCE_ARGS","bounded NumPy reducers support at most one positional axis argument.")
    if args and "axis" in kwargs:return None,("TABLE_TASK_ARRAY_REDUCE_DUPLICATE","NumPy reducer axis must be supplied once.")
    axis=kwargs.get("axis",args[0] if args else None)
    if axis not in {None,-1,0}:return None,("TABLE_TASK_ARRAY_AXIS_UNSUPPORTED","bounded 1D Array IR supports axis None, -1 or 0 only.")
    if method not in _ARRAY_REDUCERS:return None,("TABLE_TASK_ARRAY_REDUCER_UNSUPPORTED",f"Unsupported NumPy reducer: {method}")
    ddof=kwargs.get("ddof",0)
    if method=="std" and (isinstance(ddof,bool) or not isinstance(ddof,(int,float))):
        return None,("TABLE_TASK_ARRAY_STD_DDOF","np.std ddof must be a numeric literal.")
    return {"method":method,"ddof":ddof if method=="std" else 0},None

def _csv_export_config(op:dict[str,Any])->tuple[dict[str,Any]|None,tuple[str,str]|None]:
    method=str(op.get("sourceMethod",""))
    if method!="to_csv":
        return None,("TABLE_TASK_EXPORT_METHOD_PENDING",f"{method or 'export'} is outside SDK 1.51.80; only DataFrame.to_csv is mapped.")
    args=list(op.get("args") or [])
    kwargs=dict(op.get("kwargs") or {})
    if len(args)>1:return None,("TABLE_TASK_CSV_EXPORT_ARGS","to_csv supports exactly one optional path_or_buf positional argument in bounded Host Export v1.")
    if args and "path_or_buf" in kwargs:return None,("TABLE_TASK_CSV_EXPORT_PATH_DUPLICATE","to_csv path_or_buf must be supplied once.")
    path=args[0] if args else kwargs.pop("path_or_buf",None)
    if not isinstance(path,str) or not path.strip():
        return None,("TABLE_TASK_CSV_EXPORT_PATH_REQUIRED","to_csv Host Export requires one non-empty literal filename/path string; DKDS uses only its basename as the save-dialog suggestion.")
    default_name=path.replace("\\","/").split("/")[-1].strip()
    if not default_name:return None,("TABLE_TASK_CSV_EXPORT_PATH_REQUIRED","to_csv literal path must include a filename.")
    allowed={"sep","na_rep","header","index","columns","encoding","lineterminator"}
    unknown=sorted(set(kwargs)-allowed)
    if unknown:return None,("TABLE_TASK_CSV_EXPORT_KWARGS_UNSUPPORTED","Unsupported to_csv keyword(s): "+", ".join(unknown))
    sep=kwargs.get("sep",",")
    if not isinstance(sep,str) or len(sep)!=1:return None,("TABLE_TASK_CSV_EXPORT_SEPARATOR","to_csv sep must be one literal character in Host Export v1.")
    na_rep=kwargs.get("na_rep","")
    if not isinstance(na_rep,str):return None,("TABLE_TASK_CSV_EXPORT_NA_REP","to_csv na_rep must be a literal string.")
    header=kwargs.get("header",True);index=kwargs.get("index",True)
    if not isinstance(header,bool):return None,("TABLE_TASK_CSV_EXPORT_HEADER","to_csv header must be a literal boolean in Host Export v1.")
    if not isinstance(index,bool):return None,("TABLE_TASK_CSV_EXPORT_INDEX","to_csv index must be a literal boolean in Host Export v1.")
    columns=kwargs.get("columns")
    if columns is not None:
        if not isinstance(columns,(list,tuple)) or not columns or any(isinstance(value,bool) or not isinstance(value,(str,int)) for value in columns):
            return None,("TABLE_TASK_CSV_EXPORT_COLUMNS","to_csv columns must be a non-empty literal list/tuple of column labels.")
        columns=list(columns)
    encoding=kwargs.get("encoding","utf-8")
    if encoding is None:encoding="utf-8"
    if not isinstance(encoding,str):return None,("TABLE_TASK_CSV_EXPORT_ENCODING","to_csv encoding must be utf-8/utf8/utf-8-sig in Host Export v1.")
    normalized_encoding=encoding.strip().lower().replace("_","-")
    if normalized_encoding=="utf8":normalized_encoding="utf-8"
    if normalized_encoding not in {"utf-8","utf-8-sig"}:
        return None,("TABLE_TASK_CSV_EXPORT_ENCODING","to_csv Host Export currently supports utf-8 and utf-8-sig only.")
    line_terminator=kwargs.get("lineterminator","\n")
    if line_terminator not in {"\n","\r\n"}:
        return None,("TABLE_TASK_CSV_EXPORT_LINE_TERMINATOR","to_csv lineterminator must be \\n or \\r\\n in Host Export v1.")
    return {
        "defaultName":default_name,"sep":sep,"naRep":na_rep,"header":header,"index":index,
        "columns":columns,"encoding":normalized_encoding,"lineTerminator":line_terminator,
    },None

def analyze_table_transform_execution(plan:dict[str,Any])->dict[str,Any]:
    diagnostics=[]
    if not isinstance(plan,dict) or plan.get("schema")!="dkds.table-transform-plan.v1":
        diagnostics.append({"severity":"blocker","code":"TABLE_TASK_PLAN_INVALID","message":"Expected dkds.table-transform-plan.v1."})
        return {"schema":EXECUTION_SCHEMA,"executable":False,"diagnostics":diagnostics,"sourceInputs":[],"resultSymbols":[],"resultKinds":{}}
    if plan.get("diagnostics"):
        for row in plan["diagnostics"]:
            diagnostics.append({
                "severity":"blocker","code":"TABLE_TASK_PLAN_HAS_BLOCKERS",
                "cellIndex":int(row.get("cellIndex",0)),"line":int(row.get("line",0)),
                "message":str(row.get("message","Table Transform plan is not closed.")),
            })
    symbols=set()
    symbol_kinds={}
    symbol_meta={}
    sources=[]
    consumed=set()
    host_effects=[]
    host_required=set()
    for op in plan.get("operations",[]):
        kind=str(op.get("kind",""))
        if kind in _MAPPABLE_HOST:
            input_name=str(op.get("input",""))
            if not input_name or input_name not in symbols:
                diagnostics.append(_diag(op,"TABLE_TASK_HOST_INPUT_UNRESOLVED",f"{kind} input must reference a previously defined table symbol."))
                continue
            if symbol_kinds.get(input_name)!="table":
                diagnostics.append(_diag(op,"TABLE_TASK_HOST_INPUT_TYPE_UNSUPPORTED",f"{kind} currently accepts DataFrame/DataTable input only."))
                continue
            method=str(op.get("sourceMethod",""))
            args=list(op.get("args") or [])
            kwargs=dict(op.get("kwargs") or {})
            if kind=="view.plot":
                if method!="plot":
                    diagnostics.append(_diag(op,"TABLE_TASK_PLOT_METHOD_PENDING",f"{method or 'plot'} is not mapped by ScientificPlot host projection v1."))
                    continue
                if args:
                    diagnostics.append(_diag(op,"TABLE_TASK_PLOT_ARGS_UNSUPPORTED","DataFrame.plot positional arguments are not supported by host projection v1."))
                    continue
                allowed={"x","y","title","xlabel","ylabel"}
                unknown=sorted(set(kwargs)-allowed)
                if unknown:
                    diagnostics.append(_diag(op,"TABLE_TASK_PLOT_KWARGS_UNSUPPORTED","Unsupported DataFrame.plot keyword(s): "+", ".join(unknown)))
                    continue
                invalid_selector=False
                for key in ("x","y"):
                    value=kwargs.get(key)
                    if value is not None and not isinstance(value,(str,int,list,tuple)):
                        diagnostics.append(_diag(op,"TABLE_TASK_PLOT_SELECTOR_UNSUPPORTED",f"plot {key} must be a literal column name/index or list."))
                        invalid_selector=True
                if invalid_selector:continue
                host_effects.append({"kind":"scientific-plot","input":input_name,"cellIndex":int(op.get("cellIndex",0)),"line":int(op.get("line",0)),"kwargs":kwargs})
                host_required.add(input_name)
                continue
            if kind=="host.export":
                config,error=_csv_export_config(op)
                if error:
                    diagnostics.append(_diag(op,error[0],error[1]))
                    continue
                if any(effect.get("kind")=="csv-export-table" for effect in host_effects):
                    diagnostics.append(_diag(op,"TABLE_TASK_CSV_EXPORT_MULTIPLE","SDK 1.51.80 permits one to_csv Host Export per generated workflow action so one explicit user save intent owns one native save dialog."))
                    continue
                host_effects.append({
                    "kind":"csv-export-table","input":input_name,
                    "cellIndex":int(op.get("cellIndex",0)),"line":int(op.get("line",0)),**config,
                })
                host_required.add(input_name)
                continue
            if method!="to_clipboard":
                diagnostics.append(_diag(op,"TABLE_TASK_CLIPBOARD_METHOD_PENDING",f"{method or 'clipboard'} is not mapped by clipboard host effect v1."))
                continue
            if args:
                diagnostics.append(_diag(op,"TABLE_TASK_CLIPBOARD_ARGS_UNSUPPORTED","to_clipboard positional arguments are not supported by host effect v1."))
                continue
            allowed={"index","header","sep","excel"}
            unknown=sorted(set(kwargs)-allowed)
            if unknown:
                diagnostics.append(_diag(op,"TABLE_TASK_CLIPBOARD_KWARGS_UNSUPPORTED","Unsupported to_clipboard keyword(s): "+", ".join(unknown)))
                continue
            if kwargs.get("excel",True) is False:
                diagnostics.append(_diag(op,"TABLE_TASK_CLIPBOARD_TEXT_MODE_PENDING","to_clipboard(excel=False) repr semantics are not mapped."))
                continue
            sep=kwargs.get("sep","\t")
            if sep is None:sep="\t"
            if not isinstance(sep,str) or not sep:
                diagnostics.append(_diag(op,"TABLE_TASK_CLIPBOARD_SEPARATOR_INVALID","to_clipboard sep must be a non-empty literal string."))
                continue
            host_effects.append({"kind":"clipboard-table","input":input_name,"cellIndex":int(op.get("cellIndex",0)),"line":int(op.get("line",0)),"index":bool(kwargs.get("index",True)),"header":bool(kwargs.get("header",True)),"sep":sep})
            host_required.add(input_name)
            continue
        if kind in _PENDING_HOST:
            diagnostics.append(_diag(op,"TABLE_TASK_HOST_OPERATION_PENDING",f"{op.get('sourceMethod') or kind} requires an explicit DKDS file-export destination contract and remains fail-closed."))
            continue
        if kind not in _EXECUTABLE:
            diagnostics.append(_diag(op,"TABLE_TASK_OPERATION_UNSUPPORTED",f"{kind or 'unknown operation'} is not executable in Table Transform Task v1."))
            continue
        if kind=="source.table":
            output=str(op.get("output",""))
            if not output:
                diagnostics.append(_diag(op,"TABLE_TASK_SOURCE_INVALID","source.table requires an output symbol."))
            elif output in symbols:
                diagnostics.append(_diag(op,"TABLE_TASK_SYMBOL_REDEFINED",f"Symbol {output} is defined more than once."))
            else:
                symbols.add(output);sources.append(output);symbol_kinds[output]="table";symbol_meta[output]={}
            continue

        inputs=[]
        if op.get("input"):inputs.append(str(op["input"]))
        inputs.extend(str(v) for v in op.get("inputs",[]) if v)
        for name in inputs:
            consumed.add(name)
            if name not in symbols:
                diagnostics.append(_diag(op,"TABLE_TASK_INPUT_UNRESOLVED",f"Input symbol {name} is not defined before this operation."))
        output=str(op.get("output",""))
        duplicate=bool(output and output in symbols and kind!="value.alias")
        if duplicate:diagnostics.append(_diag(op,"TABLE_TASK_SYMBOL_REDEFINED",f"Symbol {output} is defined more than once."))

        output_kind="value"
        input_kind=symbol_kinds.get(inputs[0],"") if inputs else ""
        output_meta={}
        if kind=="value.bind":
            output_kind=_literal_kind(op.get("value"))
        elif kind=="value.alias":
            output_kind=input_kind or "value"
            output_meta=dict(symbol_meta.get(inputs[0],{})) if inputs else {}
        elif kind=="groupby.create":
            config,error=_groupby_config(op)
            if input_kind!="table":
                diagnostics.append(_diag(op,"TABLE_TASK_GROUPBY_INPUT_UNSUPPORTED","groupby() requires a DataFrame/DataTable input."))
            if error:diagnostics.append(_diag(op,error[0],error[1]))
            output_kind="groupby.table"
            if config:output_meta=dict(config)
        elif kind=="series.select":
            selector=op.get("selector") or {}
            value=selector.get("value") if isinstance(selector,dict) else None
            if input_kind=="array":
                if not isinstance(selector,dict) or selector.get("kind")!="literal" or isinstance(value,bool) or not isinstance(value,int):
                    diagnostics.append(_diag(op,"TABLE_TASK_ARRAY_INDEX_UNSUPPORTED","1D array scalar selection requires one literal integer index."))
                output_kind="scalar"
            else:
                if input_kind not in {"table","groupby.table"}:
                    diagnostics.append(_diag(op,"TABLE_TASK_SERIES_INPUT_UNSUPPORTED","Column selection requires a DataFrame/DataTable or DataFrameGroupBy input."))
                if not isinstance(selector,dict) or selector.get("kind")!="literal" or isinstance(value,bool) or not isinstance(value,(str,int)):
                    diagnostics.append(_diag(op,"TABLE_TASK_SERIES_SELECTOR_UNSUPPORTED","Column selection requires one literal string/integer column label."))
                if input_kind=="groupby.table":
                    output_kind="groupby.series"
                    output_meta=dict(symbol_meta.get(inputs[0],{}))
                else:
                    output_kind="series"
        elif kind=="series.apply":
            config,error=_series_apply_config(op)
            if error:diagnostics.append(_diag(op,error[0],error[1]))
            if input_kind!="series":
                diagnostics.append(_diag(op,"TABLE_TASK_APPLY_INPUT_UNSUPPORTED","SDK 1.51.81 supports Series.apply only; DataFrame.apply and GroupBy.apply remain fail-closed."))
            output_kind="series"
        elif kind=="fit.curve":
            config,error=_curve_fit_config(op)
            if error:diagnostics.append(_diag(op,error[0],error[1]))
            if len(inputs)!=2:
                diagnostics.append(_diag(op,"TABLE_TASK_CURVE_FIT_INPUT_COUNT","curve_fit requires exactly xdata and ydata inputs."))
            else:
                for position,input_name in enumerate(inputs):
                    input_type=symbol_kinds.get(input_name,"")
                    if input_type not in {"series","array"}:
                        diagnostics.append(_diag(op,"TABLE_TASK_CURVE_FIT_INPUT_UNSUPPORTED",f"curve_fit {'xdata' if position==0 else 'ydata'} must be a Series or bounded Array."))
            output_kind="array"
        elif kind=="array.literal":
            config,error=_array_literal_config(op)
            if error:diagnostics.append(_diag(op,error[0],error[1]))
            output_kind="array"
        elif kind=="array.from-value":
            config,error=_array_kwargs(op)
            if error:diagnostics.append(_diag(op,error[0],error[1]))
            if input_kind not in {"series","array"}:
                diagnostics.append(_diag(op,"TABLE_TASK_ARRAY_SOURCE_UNSUPPORTED","array/asarray/to_numpy requires a Series or bounded Array input; 2D DataFrame conversion is outside v1."))
            if op.get("args"):
                diagnostics.append(_diag(op,"TABLE_TASK_ARRAY_SOURCE_ARGS","to_numpy takes no positional arguments in bounded Array IR v1."))
            output_kind="array"
        elif kind=="array.range":
            config,error=_array_range_config(op)
            if error:diagnostics.append(_diag(op,error[0],error[1]))
            output_kind="array"
        elif kind=="array.unary":
            config,error=_array_unary_config(op)
            if error:diagnostics.append(_diag(op,error[0],error[1]))
            if input_kind!="array":diagnostics.append(_diag(op,"TABLE_TASK_ARRAY_INPUT_UNSUPPORTED","Array unary operations require a bounded Array input."))
            output_kind="array"
        elif kind=="array.binary":
            operator=str(op.get("operator",""))
            if operator not in _ARRAY_BINARY:diagnostics.append(_diag(op,"TABLE_TASK_ARRAY_BINARY_UNSUPPORTED",f"Unsupported array binary operator: {operator}"))
            operand_kinds=[symbol_kinds.get(name,"") for name in inputs]
            if not any(kind_name=="array" for kind_name in operand_kinds):
                diagnostics.append(_diag(op,"TABLE_TASK_ARRAY_BINARY_NO_ARRAY","Array binary IR requires at least one Array operand."))
            if any(kind_name not in {"array","scalar"} for kind_name in operand_kinds):
                diagnostics.append(_diag(op,"TABLE_TASK_ARRAY_BINARY_INPUT_UNSUPPORTED","Array binary symbol operands must be Array or scalar values."))
            output_kind="array"
        elif kind=="array.diff":
            config,error=_array_diff_config(op)
            if error:diagnostics.append(_diag(op,error[0],error[1]))
            if input_kind!="array":diagnostics.append(_diag(op,"TABLE_TASK_ARRAY_INPUT_UNSUPPORTED","np.diff requires a bounded Array input."))
            output_kind="array"
        elif kind=="array.reduce":
            config,error=_array_reduce_config(op)
            if error:diagnostics.append(_diag(op,error[0],error[1]))
            if input_kind!="array":diagnostics.append(_diag(op,"TABLE_TASK_ARRAY_INPUT_UNSUPPORTED","NumPy reducers require a bounded Array input."))
            output_kind="scalar"
        elif kind=="array.slice":
            selector=op.get("selector") or {}
            if input_kind!="array":diagnostics.append(_diag(op,"TABLE_TASK_ARRAY_INPUT_UNSUPPORTED","Array slicing requires a bounded Array input."))
            if not isinstance(selector,dict) or selector.get("kind")!="slice":
                diagnostics.append(_diag(op,"TABLE_TASK_ARRAY_SLICE_UNSUPPORTED","bounded Array IR supports literal one-dimensional slices only."))
            output_kind="array"
        elif kind in _AGGREGATES:
            if input_kind in {"groupby.table","groupby.series"}:
                config,error=_groupby_reduce_config(op)
                if error:diagnostics.append(_diag(op,error[0],error[1]))
                group_meta=dict(symbol_meta.get(inputs[0],{}))
                output_kind="table" if input_kind=="groupby.table" or not group_meta.get("asIndex",True) else "series"
            else:
                config,error=_aggregate_config(op,input_kind)
                if error:diagnostics.append(_diag(op,error[0],error[1]))
                output_kind="series" if input_kind=="table" else "scalar"
        elif kind=="groupby.aggregate":
            spec,error=_groupby_agg_spec(op,input_kind)
            if input_kind not in {"groupby.table","groupby.series"}:
                diagnostics.append(_diag(op,"TABLE_TASK_GROUPBY_AGG_INPUT_UNSUPPORTED","agg/aggregate requires a DataFrameGroupBy or SeriesGroupBy input."))
            if error:diagnostics.append(_diag(op,error[0],error[1]))
            group_meta=dict(symbol_meta.get(inputs[0],{}))
            output_kind="table" if input_kind=="groupby.table" or not group_meta.get("asIndex",True) else "series"
        elif kind=="table.concat":
            if any(symbol_kinds.get(name)!="table" for name in inputs):
                diagnostics.append(_diag(op,"TABLE_TASK_CONCAT_INPUT_UNSUPPORTED","table.concat inputs must all be DataFrame/DataTable values."))
            if int(op.get("axis",0)) not in {0,1}:
                diagnostics.append(_diag(op,"TABLE_TASK_CONCAT_AXIS_UNSUPPORTED","table.concat axis must be 0 or 1."))
            output_kind="table"
        elif kind in _TABLE_UNARY:
            if input_kind!="table":
                diagnostics.append(_diag(op,"TABLE_TASK_TABLE_INPUT_UNSUPPORTED",f"{kind} requires a DataFrame/DataTable input."))
            output_kind="table"

        if kind=="table.slice" and str(op.get("mode",""))!="iloc":
            diagnostics.append(_diag(op,"TABLE_TASK_LOC_PENDING","Executable v1 supports positional iloc only; loc label/index semantics remain fail-closed."))
        if kind=="table.diff":
            args=list(op.get("args") or [])
            kwargs=dict(op.get("kwargs") or {})
            periods=kwargs.get("periods",args[0] if args else 1)
            axis=kwargs.get("axis",args[1] if len(args)>1 else 0)
            if not isinstance(periods,int) or isinstance(periods,bool) or periods==0:
                diagnostics.append(_diag(op,"TABLE_TASK_DIFF_PERIODS_UNSUPPORTED","diff periods must be a non-zero integer."))
            if axis not in {0,"index"}:
                diagnostics.append(_diag(op,"TABLE_TASK_DIFF_AXIS_UNSUPPORTED","Executable v1 supports diff(axis=0) only."))
        if kind=="table.dropna":
            kwargs=dict(op.get("kwargs") or {})
            if kwargs.get("axis",0) not in {0,"index"}:
                diagnostics.append(_diag(op,"TABLE_TASK_DROPNA_AXIS_UNSUPPORTED","Executable v1 supports dropna(axis=0) only."))
            if kwargs.get("how","any") not in {"any","all"}:
                diagnostics.append(_diag(op,"TABLE_TASK_DROPNA_HOW_UNSUPPORTED","dropna how must be any or all."))
            if "subset" in kwargs:
                diagnostics.append(_diag(op,"TABLE_TASK_DROPNA_SUBSET_PENDING","dropna(subset=...) is not executable in v1."))
        if kind=="table.sort-index":
            kwargs=dict(op.get("kwargs") or {})
            if kwargs.get("axis",0) not in {0,"index"}:
                diagnostics.append(_diag(op,"TABLE_TASK_SORT_INDEX_AXIS_UNSUPPORTED","Executable v1 supports sort_index(axis=0) only."))
        if kind=="table.reset-index":
            args=list(op.get("args") or [])
            kwargs=dict(op.get("kwargs") or {})
            if args:
                diagnostics.append(_diag(op,"TABLE_TASK_RESET_INDEX_ARGS_UNSUPPORTED","reset_index positional arguments are not executable in v1."))
            unknown=set(kwargs)-{"drop"}
            if unknown:
                diagnostics.append(_diag(op,"TABLE_TASK_RESET_INDEX_KWARGS_UNSUPPORTED","reset_index supports only literal drop= in executable v1."))
        if kind in {"table.abs","table.copy"} and (op.get("args") or op.get("kwargs")):
            diagnostics.append(_diag(op,"TABLE_TASK_METHOD_ARGS_UNSUPPORTED",f"{kind} takes no arguments in executable v1."))

        if output and not duplicate:
            symbols.add(output)
            symbol_kinds[output]=output_kind
            symbol_meta[output]=output_meta

    results=sorted(name for name in symbols if name not in consumed and name not in sources)
    if not results:
        for op in reversed(plan.get("operations",[])):
            output=str(op.get("output",""))
            if output and output in symbol_kinds:
                results=[output];break
    result_kinds={name:symbol_kinds.get(name,"value") for name in results}
    for name,kind in result_kinds.items():
        if kind not in {"table","series","array","scalar"}:
            diagnostics.append({
                "severity":"blocker","code":"TABLE_TASK_RESULT_KIND_UNSUPPORTED",
                "cellIndex":0,"line":0,"operationId":"","operationKind":"",
                "message":f"Terminal result {name} is an internal {kind} value; GroupBy objects must be reduced before leaving the Task.",
            })
    task_outputs=sorted(set(results)|host_required)
    task_output_kinds={name:symbol_kinds.get(name,"value") for name in task_outputs}
    projections={
        name:{"kind":result_kinds[name],"key":f"dkdsResult{index}"}
        for index,name in enumerate(results)
        if result_kinds[name] in {"series","array","scalar"}
    }
    return {
        "schema":EXECUTION_SCHEMA,
        "executable":bool(plan.get("operations")) and not diagnostics and bool(sources) and bool(task_outputs),
        "diagnostics":diagnostics,
        "sourceInputs":sources,
        "resultSymbols":results,
        "resultKinds":result_kinds,
        "resultProjections":projections,
        "taskOutputSymbols":task_outputs,
        "taskOutputKinds":task_output_kinds,
        "symbolKinds":symbol_kinds,
        "symbolMeta":symbol_meta,
        "hostEffects":host_effects,
        "runtime":"core-task-js",
        "pythonRuntimeRequired":False,
    }

_HELPERS=r"""
    const cloneColumn=c=>({id:String(c?.id||''),key:String(c?.key||''),name:String(c?.name||c?.key||''),unit:String(c?.unit||''),role:String(c?.role||''),quantity:String(c?.quantity||''),dimension:String(c?.dimension||''),dtype:String(c?.dtype||''),values:Array.from(c?.values||[])});
    const normalizeTable=value=>{
      if(!value||value.kind!=='data.table'||!Array.isArray(value.columns))throw new Error('Table Transform input must be a data.table snapshot');
      const columns=value.columns.map(cloneColumn);
      const rowCount=Math.max(Number(value.rowCount)||0,...columns.map(c=>c.values.length),0);
      return {kind:'data.table',artifactId:String(value.artifactId||''),index:Array.from({length:rowCount},(_,i)=>i),indexNames:[],columns,rowCount};
    };
    const cloneTable=t=>({kind:'data.table',artifactId:String(t?.artifactId||''),index:Array.from(t?.index||[]),indexNames:Array.from(t?.indexNames||[]),columns:(t?.columns||[]).map(cloneColumn),rowCount:Number(t?.rowCount)||0});
    const cloneSeries=s=>({kind:'table.series',artifactId:String(s?.artifactId||''),id:String(s?.id||''),key:String(s?.key||''),name:String(s?.name||s?.key||''),unit:String(s?.unit||''),role:String(s?.role||''),quantity:String(s?.quantity||''),dimension:String(s?.dimension||''),dtype:String(s?.dtype||''),index:Array.from(s?.index||[]),indexNames:Array.from(s?.indexNames||[]),values:Array.from(s?.values||[])});
    const nullish=v=>v===null||v===undefined||(typeof v==='number'&&!Number.isFinite(v));
    const missing=v=>v===null||v===undefined||(typeof v==='number'&&Number.isNaN(v));
    const ARRAY_MAX_LENGTH=65536;
    const arrayNumber=v=>{if(typeof v!=='number')throw new Error('bounded Array IR accepts numeric values only');return v;};
    const makeArray=values=>{
      const rows=Array.from(values||[]);
      if(rows.length>ARRAY_MAX_LENGTH)throw new Error('bounded Array length exceeds 65536');
      return {kind:'array.vector',dtype:'number',values:rows.map(arrayNumber)};
    };
    const cloneArray=value=>{if(value?.kind!=='array.vector')throw new Error('Expected bounded array.vector');return makeArray(value.values);};
    const arrayFromValue=value=>{
      if(value?.kind==='array.vector')return cloneArray(value);
      if(value?.kind!=='table.series')throw new Error('Array conversion requires Series or array.vector input');
      return makeArray(Array.from(value.values||[]).map(v=>v===null||v===undefined?NaN:arrayNumber(v)));
    };
    const arrayItem=(value,index)=>{
      const row=cloneArray(value),raw=Number(index);if(!Number.isInteger(raw))throw new Error('Array index must be an integer');
      const resolved=raw<0?row.values.length+raw:raw;
      if(resolved<0||resolved>=row.values.length)throw new Error('Array index out of bounds');
      return row.values[resolved];
    };
    const arraySlice=(value,selector,env)=>{
      const row=cloneArray(value),indices=resolveSelector(selector,env,row.values.length);
      return makeArray(indices.map(index=>row.values[index]));
    };
    const arrayRange=config=>{
      if(config.method==='linspace'){
        const n=Number(config.num);if(!Number.isInteger(n)||n<0||n>ARRAY_MAX_LENGTH)throw new Error('np.linspace num is outside bounded range');
        if(n===0)return makeArray([]);
        if(n===1)return makeArray([Number(config.start)]);
        const start=Number(config.start),stop=Number(config.stop),denom=config.endpoint?(n-1):n,step=(stop-start)/denom;
        return makeArray(Array.from({length:n},(_,i)=>start+step*i));
      }
      if(config.method==='arange'){
        const start=Number(config.start),stop=Number(config.stop),step=Number(config.step);
        if(!Number.isFinite(step)||step===0)throw new Error('np.arange step must be finite and non-zero');
        const out=[];for(let value=start;(step>0?value<stop:value>stop);value+=step){out.push(value);if(out.length>ARRAY_MAX_LENGTH)throw new Error('np.arange output exceeds 65536');}
        return makeArray(out);
      }
      throw new Error('Unknown bounded array range constructor');
    };
    const arrayUnary=(value,method)=>{
      const row=cloneArray(value),fn=method==='abs'?Math.abs:method==='sqrt'?Math.sqrt:method==='log'?Math.log:method==='log10'?Math.log10:method==='exp'?Math.exp:method==='neg'?(v=>-v):method==='pos'?(v=>+v):null;
      if(!fn)throw new Error('Unsupported bounded array unary operation: '+method);
      return makeArray(row.values.map(fn));
    };
    const arrayBinary=(left,right,operator)=>{
      const leftArray=left?.kind==='array.vector',rightArray=right?.kind==='array.vector';
      if(!leftArray&&!rightArray)throw new Error('Array binary operation requires at least one array');
      const a=leftArray?cloneArray(left).values:null,b=rightArray?cloneArray(right).values:null;
      const length=a?a.length:b.length;if(a&&b&&a.length!==b.length)throw new Error('Array binary operands must have equal lengths; only scalar broadcasting is supported');
      const scalar=value=>{if(typeof value!=='number')throw new Error('Array scalar broadcast value must be numeric');return value;};
      const apply=(x,y)=>operator==='add'?x+y:operator==='sub'?x-y:operator==='mul'?x*y:operator==='div'?x/y:operator==='pow'?x**y:operator==='mod'?x%y:NaN;
      if(!['add','sub','mul','div','pow','mod'].includes(operator))throw new Error('Unsupported bounded array binary operator: '+operator);
      return makeArray(Array.from({length},(_,i)=>apply(a?a[i]:scalar(left),b?b[i]:scalar(right))));
    };
    const arrayDiff=(value,n)=>{
      let rows=cloneArray(value).values.slice(),count=Number(n);if(!Number.isInteger(count)||count<0)throw new Error('np.diff n must be a non-negative integer');
      for(let round=0;round<count;round++){const next=[];for(let i=1;i<rows.length;i++)next.push(rows[i]-rows[i-1]);rows=next;}
      return makeArray(rows);
    };
    const arrayReduce=(value,method,ddof=0)=>{
      const rows=cloneArray(value).values;if(!rows.length)return NaN;
      if(rows.some(Number.isNaN))return NaN;
      if(method==='mean')return rows.reduce((sum,v)=>sum+v,0)/rows.length;
      if(method==='median'){const sorted=rows.slice().sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;}
      if(method==='std'){const denominator=rows.length-Number(ddof);if(!(denominator>0))return NaN;const mean=rows.reduce((sum,v)=>sum+v,0)/rows.length;return Math.sqrt(rows.reduce((sum,v)=>sum+(v-mean)*(v-mean),0)/denominator);}
      throw new Error('Unsupported bounded array reducer: '+method);
    };
    const resolveSelector=(selector,env,length)=>{
      if(!selector)return Array.from({length},(_,i)=>i);
      if(selector.kind==='symbol')return resolveSelector({kind:'literal',value:env[selector.name]},env,length);
      if(selector.kind==='literal'){
        const value=selector.value;
        if(Array.isArray(value))return value.map(Number).filter(Number.isInteger).map(i=>i<0?length+i:i).filter(i=>i>=0&&i<length);
        const index=Number(value);if(!Number.isInteger(index))throw new Error('iloc literal selector must be an integer or integer array');
        const normalized=index<0?length+index:index;return normalized>=0&&normalized<length?[normalized]:[];
      }
      if(selector.kind==='slice'){
        const step=selector.step==null?1:Number(selector.step);if(!Number.isInteger(step)||step===0)throw new Error('iloc slice step must be a non-zero integer');
        let start=selector.start==null?(step>0?0:length-1):Number(selector.start);
        let stop=selector.stop==null?(step>0?length:-1):Number(selector.stop);
        if(start<0)start+=length;if(stop<0&&selector.stop!=null)stop+=length;
        const out=[];if(step>0){start=Math.max(0,start);stop=Math.min(length,stop);for(let i=start;i<stop;i+=step)out.push(i);}
        else{start=Math.min(length-1,start);stop=Math.max(-1,stop);for(let i=start;i>stop;i+=step)out.push(i);}return out;
      }
      throw new Error('Unsupported iloc selector');
    };
    const sliceTable=(table,selector,env)=>{
      const t=cloneTable(table);let rowSel=selector,colSel=null;
      if(selector?.kind==='tuple'){rowSel=selector.items?.[0]||null;colSel=selector.items?.[1]||null;}
      const rows=resolveSelector(rowSel,env,t.rowCount);
      const cols=resolveSelector(colSel,env,t.columns.length);
      const columns=cols.map(i=>{const c=cloneColumn(t.columns[i]);c.values=rows.map(r=>c.values[r]);return c;});
      return {kind:'data.table',artifactId:t.artifactId,index:rows.map(r=>t.index[r]),indexNames:Array.from(t.indexNames||[]),columns,rowCount:rows.length};
    };
    const selectSeries=(table,selector)=>{
      const t=cloneTable(table);
      if(selector?.kind!=='literal'||(typeof selector.value!=='string'&&typeof selector.value!=='number'))throw new Error('Series selector must be one literal column label');
      const label=String(selector.value);
      const matches=t.columns.filter(c=>[c.key,c.name,c.id].some(value=>String(value)===label));
      if(matches.length!==1)throw new Error(matches.length?'Series column label is ambiguous: '+label:'Series column not found: '+label);
      const c=cloneColumn(matches[0]);
      return {kind:'table.series',artifactId:t.artifactId,id:c.id,key:c.key,name:c.name,unit:c.unit,role:c.role,quantity:c.quantity,dimension:c.dimension,dtype:c.dtype,index:Array.from(t.index),values:Array.from(c.values)};
    };
    const applySeries=(value,callback,args)=>{
      const row=cloneSeries(value),extra=Array.from(args||[]);
      if(typeof callback!=='function')throw new Error('Series.apply callback is unavailable');
      if(row.values.length>65536)throw new Error('Series.apply input exceeds bounded maximum 65536');
      row.values=row.values.map((cell,index)=>{
        const wasMissing=missing(cell);
        if(!wasMissing&&typeof cell!=='number')throw new Error('SDK 1.51.81 Series.apply accepts numeric Series values only');
        let result;
        try{result=callback(wasMissing?NaN:cell,...extra);}catch(error){throw new Error('Series.apply callback failed at row '+index+': '+String(error?.message||error||'callback error'));}
        if(typeof result!=='number')throw new Error('Series.apply callback must return one numeric scalar at row '+index);
        if(Number.isNaN(result)){
          if(wasMissing)return null;
          throw new Error('Series.apply callback produced NaN for a finite input at row '+index);
        }
        if(!Number.isFinite(result))throw new Error('Series.apply callback produced a non-finite result at row '+index);
        return result;
      });
      row.dtype='number';row.role=row.role||'derived';return row;
    };
    const fitVector=(value,label)=>{
      let rows;
      if(value?.kind==='array.vector')rows=cloneArray(value).values;
      else if(value?.kind==='table.series')rows=cloneSeries(value).values;
      else throw new Error('curve_fit '+label+' must be Series or array.vector');
      if(!rows.length)throw new Error('curve_fit '+label+' must not be empty');
      if(rows.length>65536)throw new Error('curve_fit '+label+' exceeds bounded maximum 65536');
      return rows.map((cell,index)=>{
        if(typeof cell!=='number'||!Number.isFinite(cell))throw new Error('curve_fit '+label+' requires finite numeric values at row '+index);
        return cell;
      });
    };
    const solveLinear=(matrix,vector)=>{
      const n=vector.length,a=matrix.map((row,index)=>[...row,vector[index]]);
      for(let col=0;col<n;col++){
        let pivot=col,best=Math.abs(a[col][col]);
        for(let row=col+1;row<n;row++){const score=Math.abs(a[row][col]);if(score>best){best=score;pivot=row;}}
        if(!(best>1e-18)||!Number.isFinite(best))return null;
        if(pivot!==col){const swap=a[col];a[col]=a[pivot];a[pivot]=swap;}
        const divisor=a[col][col];
        for(let k=col;k<=n;k++)a[col][k]/=divisor;
        for(let row=0;row<n;row++){
          if(row===col)continue;
          const factor=a[row][col];if(factor===0)continue;
          for(let k=col;k<=n;k++)a[row][k]-=factor*a[col][k];
        }
      }
      const out=a.map(row=>row[n]);
      return out.every(Number.isFinite)?out:null;
    };
    const curveFit=(xValue,yValue,model,p0,maxIterations)=>{
      const x=fitVector(xValue,'xdata'),y=fitVector(yValue,'ydata');
      if(x.length!==y.length)throw new Error('curve_fit xdata/ydata lengths must match');
      if(typeof model!=='function')throw new Error('curve_fit model is unavailable');
      let params=Array.from(p0||[]).map(Number);
      if(!params.length||params.length>6||params.some(value=>!Number.isFinite(value)))throw new Error('curve_fit initial parameter vector is invalid');
      if(x.length<params.length)throw new Error('curve_fit requires at least as many observations as fit parameters');
      const predict=vector=>x.map((xv,index)=>{
        let value;
        try{value=Number(model(xv,...vector));}catch(error){throw new Error('curve_fit model failed at row '+index+': '+String(error?.message||error||'model error'));}
        if(!Number.isFinite(value))throw new Error('curve_fit model produced non-finite output at row '+index);
        return value;
      });
      const cost=prediction=>prediction.reduce((sum,value,index)=>{const residual=y[index]-value;return sum+residual*residual;},0);
      let prediction=predict(params),score=cost(prediction),lambda=1e-3,accepted=0,converged=false;
      const iterations=Math.max(1,Math.min(200,Number(maxIterations)||200));
      for(let iteration=0;iteration<iterations;iteration++){
        const m=x.length,n=params.length,jacobian=Array.from({length:m},()=>Array(n).fill(0));
        for(let column=0;column<n;column++){
          const step=Math.sqrt(Number.EPSILON)*(Math.abs(params[column])+1);
          const plus=params.slice(),minus=params.slice();plus[column]+=step;minus[column]-=step;
          const pPlus=predict(plus),pMinus=predict(minus);
          for(let row=0;row<m;row++)jacobian[row][column]=(pPlus[row]-pMinus[row])/(2*step);
        }
        const normal=Array.from({length:n},()=>Array(n).fill(0)),gradient=Array(n).fill(0);
        for(let row=0;row<m;row++){
          const residual=y[row]-prediction[row];
          for(let a=0;a<n;a++){
            const ja=jacobian[row][a];gradient[a]+=ja*residual;
            for(let b=0;b<n;b++)normal[a][b]+=ja*jacobian[row][b];
          }
        }
        for(let j=0;j<n;j++)normal[j][j]+=lambda*(Math.abs(normal[j][j])+1e-12);
        const delta=solveLinear(normal,gradient);
        if(!delta){lambda=Math.min(1e12,lambda*10);continue;}
        const candidate=params.map((value,index)=>value+delta[index]);
        if(candidate.some(value=>!Number.isFinite(value))){lambda=Math.min(1e12,lambda*10);continue;}
        const candidatePrediction=predict(candidate),candidateScore=cost(candidatePrediction);
        if(candidateScore<score){
          const improvement=score-candidateScore,normDelta=Math.sqrt(delta.reduce((sum,value)=>sum+value*value,0)),normParams=Math.sqrt(candidate.reduce((sum,value)=>sum+value*value,0));
          params=candidate;prediction=candidatePrediction;score=candidateScore;accepted++;lambda=Math.max(1e-12,lambda*0.3);
          if(normDelta<=1e-9*(normParams+1)||improvement<=1e-12*(score+1)){converged=true;break;}
        }else lambda=Math.min(1e12,lambda*10);
      }
      if(!converged&&accepted===0)throw new Error('curve_fit bounded LM solver could not improve the initial parameters');
      return makeArray(params);
    };
    const columnByLabel=(table,label)=>{
      const text=String(label);
      const matches=(table?.columns||[]).filter(c=>[c.key,c.name,c.id].some(value=>String(value)===text));
      if(matches.length!==1)throw new Error(matches.length?'Column label is ambiguous: '+text:'Column not found: '+text);
      return matches[0];
    };
    const createGroupBy=(table,options)=>{
      const t=cloneTable(table);
      const keyColumns=Array.from(options?.keys||[]).map(label=>cloneColumn(columnByLabel(t,label)));
      return {kind:'table.groupby',table:t,keyColumns,keyNames:keyColumns.map(c=>String(c.key||c.name||c.id||'')),sort:options?.sort!==false,dropna:options?.dropna!==false,asIndex:options?.asIndex!==false};
    };
    const selectGroupBy=(group,selector)=>{
      if(group?.kind!=='table.groupby')throw new Error('SeriesGroupBy selection requires a DataFrameGroupBy value');
      if(selector?.kind!=='literal'||(typeof selector.value!=='string'&&typeof selector.value!=='number'))throw new Error('SeriesGroupBy selector must be one literal column label');
      const c=cloneColumn(columnByLabel(group.table,selector.value));
      return {kind:'series.groupby',group,column:c};
    };
    const keyToken=value=>missing(value)?'missing':typeof value+':'+JSON.stringify(value);
    const compareScalar=(a,b)=>{
      const am=missing(a),bm=missing(b);if(am||bm)return am===bm?0:(am?1:-1);
      if(typeof a==='number'&&typeof b==='number')return a-b;
      const sa=String(a),sb=String(b);return sa>sb?1:sa<sb?-1:0;
    };
    const compareKeys=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){const cmp=compareScalar(a[i],b[i]);if(cmp)return cmp;}return 0;};
    const groupPartitions=group=>{
      const buckets=new Map(),order=[];
      for(let row=0;row<group.table.rowCount;row++){
        const keys=group.keyColumns.map(c=>c.values[row]);
        if(group.dropna&&keys.some(missing))continue;
        const token=keys.map(keyToken).join('|');
        let bucket=buckets.get(token);
        if(!bucket){bucket={keys,rows:[]};buckets.set(token,bucket);order.push(bucket);}
        bucket.rows.push(row);
      }
      if(group.sort)order.sort((a,b)=>compareKeys(a.keys,b.keys));
      return order;
    };
    const groupIndexValue=keys=>keys.length===1?keys[0]:Array.from(keys);
    const groupKeyColumns=(group,groups)=>group.keyColumns.map((source,keyIndex)=>{
      const c=cloneColumn(source);c.values=groups.map(row=>row.keys[keyIndex]);c.role=c.role||'group';return c;
    });
    const absTable=table=>{const t=cloneTable(table);for(const c of t.columns)c.values=c.values.map(v=>{if(nullish(v))return v;if(typeof v!=='number')throw new Error('table.abs requires numeric/null cells');return Math.abs(v);});return t;};
    const diffTable=(table,periods)=>{const t=cloneTable(table),p=Number(periods);for(const c of t.columns)c.values=c.values.map((v,i)=>{const j=i-p;if(j<0||j>=c.values.length||nullish(v)||nullish(c.values[j]))return null;if(typeof v!=='number'||typeof c.values[j]!=='number')throw new Error('table.diff requires numeric/null cells');return v-c.values[j];});return t;};
    const dropnaTable=(table,how)=>{const t=cloneTable(table),keep=[];for(let r=0;r<t.rowCount;r++){const flags=t.columns.map(c=>nullish(c.values[r]));const drop=how==='all'?flags.every(Boolean):flags.some(Boolean);if(!drop)keep.push(r);}for(const c of t.columns)c.values=keep.map(r=>c.values[r]);t.index=keep.map(r=>t.index[r]);t.rowCount=keep.length;return t;};
    const sortIndexTable=(table,ascending)=>{const t=cloneTable(table),order=t.index.map((v,i)=>({v,i})).sort((a,b)=>ascending?(a.v>b.v?1:a.v<b.v?-1:0):(a.v>b.v?-1:a.v<b.v?1:0)).map(x=>x.i);for(const c of t.columns)c.values=order.map(i=>c.values[i]);t.index=order.map(i=>t.index[i]);return t;};
    const resetIndexTable=(table,drop)=>{
      const t=cloneTable(table);
      if(!drop){
        const names=Array.from(t.indexNames||[]);
        if(names.length){
          const columns=names.map((name,keyIndex)=>({id:String(name||('index_'+keyIndex)),key:String(name||('index_'+keyIndex)),name:String(name||('index_'+keyIndex)),unit:'',role:'index',quantity:'',dimension:'',dtype:'',values:t.index.map(value=>names.length===1?value:(Array.isArray(value)?value[keyIndex]:null))}));
          t.columns.unshift(...columns);
        }else{
          t.columns.unshift({id:'index',key:'index',name:'index',unit:'',role:'index',quantity:'',dimension:'',dtype:'number',values:Array.from(t.index)});
        }
      }
      t.index=Array.from({length:t.rowCount},(_,i)=>i);t.indexNames=[];return t;
    };
    const concatTables=(tables,axis,ignoreIndex)=>{
      if(!tables.length)throw new Error('table.concat requires inputs');
      const rows=tables.map(cloneTable);
      if(axis===1){
        const index=rows[0].index;if(rows.some(t=>t.rowCount!==rows[0].rowCount||t.index.some((v,i)=>v!==index[i])))throw new Error('axis=1 concat requires identical row indexes');
        const columns=[];for(const t of rows)for(const c of t.columns)columns.push(cloneColumn(c));
        return {kind:'data.table',artifactId:'',index:Array.from(index),columns,rowCount:rows[0].rowCount};
      }
      const keys=[];for(const t of rows)for(const c of t.columns)if(!keys.includes(c.key))keys.push(c.key);
      const meta=new Map();for(const t of rows)for(const c of t.columns)if(!meta.has(c.key))meta.set(c.key,c);
      const columns=keys.map(key=>{const base=cloneColumn(meta.get(key));base.values=[];return base;});
      const index=[];let offset=0;
      for(const t of rows){for(let r=0;r<t.rowCount;r++){index.push(ignoreIndex?offset++:t.index[r]);for(const c of columns){const src=t.columns.find(x=>x.key===c.key);c.values.push(src?src.values[r]:null);}}}
      return {kind:'data.table',artifactId:'',index,columns,rowCount:index.length};
    };
    const numericColumn=c=>{
      const values=Array.from(c?.values||[]).filter(v=>!missing(v));
      if(values.length)return values.every(v=>typeof v==='number');
      return /^(?:number|float(?:32|64)?|int(?:8|16|32|64)?|uint(?:8|16|32|64)?)$/i.test(String(c?.dtype||''));
    };
    const aggregateNumbers=(values,method,options)=>{
      const source=Array.from(values||[]);
      if(!options.skipna&&source.some(missing))return null;
      const numbers=source.filter(v=>!missing(v));
      if(!numbers.length)return null;
      if(numbers.some(v=>typeof v!=='number'))throw new Error(method+' requires numeric/null values');
      if(method==='mean')return numbers.reduce((sum,v)=>sum+v,0)/numbers.length;
      if(method==='median'){
        const sorted=Array.from(numbers).sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);
        return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
      }
      const denominator=numbers.length-Number(options.ddof);
      if(denominator<=0)return null;
      const mean=numbers.reduce((sum,v)=>sum+v,0)/numbers.length;
      const variance=numbers.reduce((sum,v)=>sum+(v-mean)*(v-mean),0)/denominator;
      const result=Math.sqrt(variance);
      return Number.isNaN(result)?null:result;
    };
    const aggregateValue=(value,method,options)=>{
      if(value?.kind==='table.series')return aggregateNumbers(value.values,method,options);
      if(value?.kind!=='data.table')throw new Error(method+' requires a DataFrame/DataTable or Series input');
      const t=cloneTable(value);
      let columns=Array.from(t.columns);
      if(options.numericOnly)columns=columns.filter(numericColumn);
      if(options.axis===0){
        return {kind:'table.series',artifactId:t.artifactId,id:'',key:'',name:method,unit:'',role:'aggregate',quantity:'',dimension:'',dtype:'number',
          index:columns.map(c=>String(c.key||c.name||c.id||'')),
          values:columns.map(c=>aggregateNumbers(c.values,method,options))};
      }
      return {kind:'table.series',artifactId:t.artifactId,id:'',key:'',name:method,unit:'',role:'aggregate',quantity:'',dimension:'',dtype:'number',
        index:Array.from(t.index),
        values:Array.from({length:t.rowCount},(_,row)=>aggregateNumbers(columns.map(c=>c.values[row]),method,options))};
    };
    const aggregateGroupBy=(value,spec,options={})=>{
      const group=value?.kind==='series.groupby'?value.group:value;
      if(group?.kind!=='table.groupby')throw new Error('GroupBy aggregate requires a GroupBy value');
      const groups=groupPartitions(group);
      if(value?.kind==='series.groupby'){
        if(spec?.kind!=='single')throw new Error('SeriesGroupBy requires one reducer');
        const method=String(spec.method||'');
        const column=cloneColumn(value.column);
        const values=groups.map(bucket=>aggregateNumbers(bucket.rows.map(row=>column.values[row]),method,{skipna:true,ddof:method==='std'?Number(options.ddof??1):1}));
        if(group.asIndex){
          return {kind:'table.series',artifactId:group.table.artifactId,id:column.id,key:column.key,name:column.name,unit:column.unit,role:'aggregate',quantity:column.quantity,dimension:column.dimension,dtype:'number',index:groups.map(bucket=>groupIndexValue(bucket.keys)),indexNames:Array.from(group.keyNames),values};
        }
        const keyColumns=groupKeyColumns(group,groups);
        column.values=values;column.role='aggregate';column.dtype='number';
        return {kind:'data.table',artifactId:group.table.artifactId,index:Array.from({length:groups.length},(_,i)=>i),indexNames:[],columns:[...keyColumns,column],rowCount:groups.length};
      }
      const keyIds=new Set(group.keyColumns.map(c=>String(c.id||c.key||c.name||'')));
      let targets=[];
      if(spec?.kind==='mapping'){
        targets=Array.from(spec.items||[]).map(item=>{
          const column=cloneColumn(columnByLabel(group.table,item.column));
          if(keyIds.has(String(column.id||column.key||column.name||'')))throw new Error('Grouping keys cannot also be aggregate targets in bounded GroupBy v1');
          return {column,method:String(item.method||'')};
        });
      }else{
        const method=String(spec?.method||'');
        let columns=group.table.columns.filter(c=>!keyIds.has(String(c.id||c.key||c.name||'')));
        if(options.numericOnly)columns=columns.filter(numericColumn);
        targets=columns.map(column=>({column:cloneColumn(column),method}));
      }
      const aggregateColumns=targets.map(target=>{
        const c=cloneColumn(target.column);
        c.values=groups.map(bucket=>aggregateNumbers(bucket.rows.map(row=>target.column.values[row]),target.method,{skipna:true,ddof:target.method==='std'?Number(options.ddof??1):1}));
        c.role='aggregate';c.dtype='number';return c;
      });
      if(group.asIndex){
        return {kind:'data.table',artifactId:group.table.artifactId,index:groups.map(bucket=>groupIndexValue(bucket.keys)),indexNames:Array.from(group.keyNames),columns:aggregateColumns,rowCount:groups.length};
      }
      return {kind:'data.table',artifactId:group.table.artifactId,index:Array.from({length:groups.length},(_,i)=>i),indexNames:[],columns:[...groupKeyColumns(group,groups),...aggregateColumns],rowCount:groups.length};
    };
    const exportTable=t=>{
      const row=(t?.indexNames?.length)?resetIndexTable(t,false):cloneTable(t);
      return {kind:'data.table',artifactId:String(row?.artifactId||''),index:Array.from(row?.index||[]),columns:(row?.columns||[]).map(cloneColumn),rowCount:Number(row?.rowCount)||0};
    };
    const exportSeries=s=>cloneSeries(s);
    const seriesRows=s=>{const row=cloneSeries(s);return row.values.map((value,index)=>({index:row.index[index]??index,value}));};
"""

def compile_table_transform_task(plan:dict[str,Any],task_id:str="table-transform")->CompiledPortableTask:
    task_id=str(task_id or "").strip()
    if not TASK_ID.fullmatch(task_id):
        raise ValueError(f"Invalid table transform task id: {task_id!r}")
    report=analyze_table_transform_execution(plan)
    if not report["executable"]:
        messages="; ".join(str(row.get("message","")) for row in report["diagnostics"]) or "plan has no executable source/result path"
        raise ValueError("Table Transform plan is not executable: "+messages)
    params=tuple(report["sourceInputs"])
    operations=plan.get("operations",[])
    lines=[
        "'use strict';",
        "self.DKDSTaskDefinition=Object.freeze({",
        "  async run(input,context){",
        "    const env=Object.create(null);",
        _HELPERS.rstrip(),
    ]
    for name in params:
        lines.append(f"    env[{_js(name)}]=normalizeTable(input?.[{_js(name)}]);")
    for op in operations:
        kind=op["kind"];output=str(op.get("output",""))
        if kind=="source.table":
            continue
        if kind=="value.bind":
            lines.append(f"    env[{_js(output)}]={_js(op.get('value'))};")
        elif kind=="value.alias":
            lines.append(f"    env[{_js(output)}]=env[{_js(op['input'])}];")
        elif kind=="groupby.create":
            config,error=_groupby_config(op)
            if error or config is None:raise ValueError("GroupBy operation was not validated before compilation")
            lines.append(f"    env[{_js(output)}]=createGroupBy(env[{_js(op['input'])}],{_js(config)});")
        elif kind=="series.select":
            input_kind=report["symbolKinds"].get(str(op.get("input","")),"")
            if input_kind=="groupby.table":
                helper="selectGroupBy"
                lines.append(f"    env[{_js(output)}]={helper}(env[{_js(op['input'])}],{_js(op.get('selector'))});")
            elif input_kind=="array":
                lines.append(f"    env[{_js(output)}]=arrayItem(env[{_js(op['input'])}],{_js((op.get('selector') or {}).get('value'))});")
            else:
                lines.append(f"    env[{_js(output)}]=selectSeries(env[{_js(op['input'])}],{_js(op.get('selector'))});")
        elif kind=="series.apply":
            config,error=_series_apply_config(op)
            if error or config is None:raise ValueError("Series.apply callback was not validated before compilation")
            lines.append(f"    env[{_js(output)}]=applySeries(env[{_js(op['input'])}],{config['callbackSource']},{_js(config['args'])});")
        elif kind=="fit.curve":
            config,error=_curve_fit_config(op)
            if error or config is None:raise ValueError("curve_fit model was not validated before compilation")
            x_name=str(op.get("x",""));y_name=str(op.get("y",""))
            lines.append(f"    env[{_js(output)}]=curveFit(env[{_js(x_name)}],env[{_js(y_name)}],{config['modelSource']},{_js(config['p0'])},{int(config['maxIterations'])});")
        elif kind=="array.literal":
            config,error=_array_literal_config(op)
            if error or config is None:raise ValueError("Array literal was not validated before compilation")
            lines.append(f"    env[{_js(output)}]=makeArray({_js(config['values'])});")
        elif kind=="array.from-value":
            config,error=_array_kwargs(op)
            if error or config is None:raise ValueError("Array conversion was not validated before compilation")
            lines.append(f"    env[{_js(output)}]=arrayFromValue(env[{_js(op['input'])}]);")
        elif kind=="array.range":
            config,error=_array_range_config(op)
            if error or config is None:raise ValueError("Array range was not validated before compilation")
            lines.append(f"    env[{_js(output)}]=arrayRange({_js(config)});")
        elif kind=="array.unary":
            config,error=_array_unary_config(op)
            if error or config is None:raise ValueError("Array unary operation was not validated before compilation")
            lines.append(f"    env[{_js(output)}]=arrayUnary(env[{_js(op['input'])}],{_js(config['method'])});")
        elif kind=="array.binary":
            def operand_expr(row:dict[str,Any])->str:
                return f"env[{_js(row['name'])}]" if row.get("kind")=="symbol" else _js(row.get("value"))
            lines.append(f"    env[{_js(output)}]=arrayBinary({operand_expr(op['left'])},{operand_expr(op['right'])},{_js(op.get('operator'))});")
        elif kind=="array.diff":
            config,error=_array_diff_config(op)
            if error or config is None:raise ValueError("Array diff operation was not validated before compilation")
            lines.append(f"    env[{_js(output)}]=arrayDiff(env[{_js(op['input'])}],{_js(config['n'])});")
        elif kind=="array.reduce":
            config,error=_array_reduce_config(op)
            if error or config is None:raise ValueError("Array reducer was not validated before compilation")
            lines.append(f"    env[{_js(output)}]=arrayReduce(env[{_js(op['input'])}],{_js(config['method'])},{_js(config['ddof'])});")
        elif kind=="array.slice":
            lines.append(f"    env[{_js(output)}]=arraySlice(env[{_js(op['input'])}],{_js(op.get('selector'))},env);")
        elif kind=="table.slice":
            lines.append(f"    env[{_js(output)}]=sliceTable(env[{_js(op['input'])}],{_js(op.get('selector'))},env);")
        elif kind=="table.abs":
            lines.append(f"    env[{_js(output)}]=absTable(env[{_js(op['input'])}]);")
        elif kind=="table.copy":
            lines.append(f"    env[{_js(output)}]=cloneTable(env[{_js(op['input'])}]);")
        elif kind=="table.diff":
            args=list(op.get("args") or []);kwargs=dict(op.get("kwargs") or {})
            periods=kwargs.get("periods",args[0] if args else 1)
            lines.append(f"    env[{_js(output)}]=diffTable(env[{_js(op['input'])}],{_js(periods)});")
        elif kind=="table.dropna":
            how=dict(op.get("kwargs") or {}).get("how","any")
            lines.append(f"    env[{_js(output)}]=dropnaTable(env[{_js(op['input'])}],{_js(how)});")
        elif kind=="table.sort-index":
            ascending=bool(dict(op.get("kwargs") or {}).get("ascending",True))
            lines.append(f"    env[{_js(output)}]=sortIndexTable(env[{_js(op['input'])}],{str(ascending).lower()});")
        elif kind=="table.reset-index":
            drop=bool(dict(op.get("kwargs") or {}).get("drop",False))
            lines.append(f"    env[{_js(output)}]=resetIndexTable(env[{_js(op['input'])}],{str(drop).lower()});")
        elif kind=="table.concat":
            inputs="["+",".join(f"env[{_js(name)}]" for name in op.get("inputs",[]))+"]"
            lines.append(f"    env[{_js(output)}]=concatTables({inputs},{int(op.get('axis',0))},{str(bool(op.get('ignoreIndex',False))).lower()});")
        elif kind in _AGGREGATES:
            input_kind=report["symbolKinds"].get(str(op.get("input","")),"")
            if input_kind in {"groupby.table","groupby.series"}:
                config,error=_groupby_reduce_config(op)
                if error or config is None:raise ValueError("GroupBy reducer was not validated before compilation")
                spec={"kind":"single","method":_AGGREGATES[kind]}
                lines.append(f"    env[{_js(output)}]=aggregateGroupBy(env[{_js(op['input'])}],{_js(spec)},{_js(config)});")
            else:
                config,error=_aggregate_config(op,input_kind)
                if error or config is None:raise ValueError("Aggregate operation was not validated before compilation")
                lines.append(f"    env[{_js(output)}]=aggregateValue(env[{_js(op['input'])}],{_js(_AGGREGATES[kind])},{_js(config)});")
        elif kind=="groupby.aggregate":
            input_kind=report["symbolKinds"].get(str(op.get("input","")),"")
            spec,error=_groupby_agg_spec(op,input_kind)
            if error or spec is None:raise ValueError("GroupBy aggregate specification was not validated before compilation")
            lines.append(f"    env[{_js(output)}]=aggregateGroupBy(env[{_js(op['input'])}],{_js(spec)},{{}});")
    table_outputs=[name for name in report["taskOutputSymbols"] if report["taskOutputKinds"].get(name)=="table"]
    series_outputs=[name for name in report["resultSymbols"] if report["resultKinds"].get(name)=="series"]
    array_outputs=[name for name in report["resultSymbols"] if report["resultKinds"].get(name)=="array"]
    scalar_outputs=[name for name in report["resultSymbols"] if report["resultKinds"].get(name)=="scalar"]
    tables_expr="{" + ",".join(f"{_js(name)}:exportTable(env[{_js(name)}])" for name in table_outputs) + "}"
    raw_tables_expr="{" + ",".join(f"{_js(name)}:cloneTable(env[{_js(name)}])" for name in table_outputs) + "}"
    series_expr="{" + ",".join(f"{_js(name)}:exportSeries(env[{_js(name)}])" for name in series_outputs) + "}"
    arrays_expr="{" + ",".join(f"{_js(name)}:cloneArray(env[{_js(name)}])" for name in array_outputs) + "}"
    values_expr="{" + ",".join(f"{_js(name)}:env[{_js(name)}]" for name in scalar_outputs) + "}"
    projected=[]
    for name in report["resultSymbols"]:
        projection=report["resultProjections"].get(name)
        if not projection:continue
        if projection["kind"]=="series":
            projected.append(f"{_js(projection['key'])}:seriesRows(env[{_js(name)}])")
        elif projection["kind"]=="array":
            projected.append(f"{_js(projection['key'])}:cloneArray(env[{_js(name)}]).values.map((value,index)=>({{index,value}}))")
        elif projection["kind"]=="scalar":
            projected.append(f"{_js(projection['key'])}:env[{_js(name)}]")
    suffix=(","+",".join(projected)) if projected else ""
    lines += [f"    return {{tables:{tables_expr},rawTables:{raw_tables_expr},series:{series_expr},arrays:{arrays_expr},values:{values_expr}{suffix}}};","  }","});",""]
    return CompiledPortableTask(task_id=task_id,entry="generated-table-transform-"+re.sub(r"[^A-Za-z0-9._-]","-",task_id)+".js",source="\n".join(lines),parameters=params)
