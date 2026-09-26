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

from dkds_portable_task import CompiledPortableTask

EXECUTION_SCHEMA="dkds.table-transform-execution.v1"
TASK_ID=re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
_EXECUTABLE={
    "source.table","value.bind","value.alias",
    "series.select",
    "table.slice","table.abs","table.copy","table.reset-index",
    "table.diff","table.dropna","table.sort-index","table.concat",
    "table.mean","table.median","table.std",
}
_AGGREGATES={"table.mean":"mean","table.median":"median","table.std":"std"}
_TABLE_UNARY={
    "table.slice","table.abs","table.copy","table.reset-index",
    "table.diff","table.dropna","table.sort-index",
}
_MAPPABLE_HOST={"view.plot","host.clipboard"}
_PENDING_HOST={"host.export"}

def _literal_kind(value:Any)->str:
    return "scalar" if value is None or isinstance(value,(bool,int,float,str)) else "value"

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
        if isinstance(ddof,bool) or not isinstance(ddof,int) or ddof<0:
            return None,("TABLE_TASK_STD_DDOF_INVALID","std ddof must be a non-negative literal integer.")
    else:ddof=1
    return {"axis":axis,"skipna":skipna,"numericOnly":numeric_only,"ddof":ddof},None

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
                symbols.add(output);sources.append(output);symbol_kinds[output]="table"
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
        if kind=="value.bind":
            output_kind=_literal_kind(op.get("value"))
        elif kind=="value.alias":
            output_kind=input_kind or "value"
        elif kind=="series.select":
            selector=op.get("selector") or {}
            value=selector.get("value") if isinstance(selector,dict) else None
            if input_kind!="table":
                diagnostics.append(_diag(op,"TABLE_TASK_SERIES_INPUT_UNSUPPORTED","Series selection requires a DataFrame/DataTable input."))
            if not isinstance(selector,dict) or selector.get("kind")!="literal" or isinstance(value,bool) or not isinstance(value,(str,int)):
                diagnostics.append(_diag(op,"TABLE_TASK_SERIES_SELECTOR_UNSUPPORTED","Series selection requires one literal string/integer column label."))
            output_kind="series"
        elif kind in _AGGREGATES:
            config,error=_aggregate_config(op,input_kind)
            if error:diagnostics.append(_diag(op,error[0],error[1]))
            output_kind="series" if input_kind=="table" else "scalar"
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

    results=sorted(name for name in symbols if name not in consumed and name not in sources)
    if not results:
        for op in reversed(plan.get("operations",[])):
            output=str(op.get("output",""))
            if output and output in symbol_kinds:
                results=[output];break
    result_kinds={name:symbol_kinds.get(name,"value") for name in results}
    for name,kind in result_kinds.items():
        if kind=="value":
            diagnostics.append({
                "severity":"blocker","code":"TABLE_TASK_RESULT_KIND_UNSUPPORTED",
                "cellIndex":0,"line":0,"operationId":"","operationKind":"",
                "message":f"Terminal result {name} is not a DataFrame, Series or scalar value.",
            })
    task_outputs=sorted(set(results)|host_required)
    task_output_kinds={name:symbol_kinds.get(name,"value") for name in task_outputs}
    projections={
        name:{"kind":result_kinds[name],"key":f"dkdsResult{index}"}
        for index,name in enumerate(results)
        if result_kinds[name] in {"series","scalar"}
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
      return {kind:'data.table',artifactId:String(value.artifactId||''),index:Array.from({length:rowCount},(_,i)=>i),columns,rowCount};
    };
    const cloneTable=t=>({kind:'data.table',artifactId:String(t?.artifactId||''),index:Array.from(t?.index||[]),columns:(t?.columns||[]).map(cloneColumn),rowCount:Number(t?.rowCount)||0});
    const cloneSeries=s=>({kind:'table.series',artifactId:String(s?.artifactId||''),id:String(s?.id||''),key:String(s?.key||''),name:String(s?.name||s?.key||''),unit:String(s?.unit||''),role:String(s?.role||''),quantity:String(s?.quantity||''),dimension:String(s?.dimension||''),dtype:String(s?.dtype||''),index:Array.from(s?.index||[]),values:Array.from(s?.values||[])});
    const nullish=v=>v===null||v===undefined||(typeof v==='number'&&!Number.isFinite(v));
    const missing=v=>v===null||v===undefined||(typeof v==='number'&&Number.isNaN(v));
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
      return {kind:'data.table',artifactId:t.artifactId,index:rows.map(r=>t.index[r]),columns,rowCount:rows.length};
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
    const absTable=table=>{const t=cloneTable(table);for(const c of t.columns)c.values=c.values.map(v=>{if(nullish(v))return v;if(typeof v!=='number')throw new Error('table.abs requires numeric/null cells');return Math.abs(v);});return t;};
    const diffTable=(table,periods)=>{const t=cloneTable(table),p=Number(periods);for(const c of t.columns)c.values=c.values.map((v,i)=>{const j=i-p;if(j<0||j>=c.values.length||nullish(v)||nullish(c.values[j]))return null;if(typeof v!=='number'||typeof c.values[j]!=='number')throw new Error('table.diff requires numeric/null cells');return v-c.values[j];});return t;};
    const dropnaTable=(table,how)=>{const t=cloneTable(table),keep=[];for(let r=0;r<t.rowCount;r++){const flags=t.columns.map(c=>nullish(c.values[r]));const drop=how==='all'?flags.every(Boolean):flags.some(Boolean);if(!drop)keep.push(r);}for(const c of t.columns)c.values=keep.map(r=>c.values[r]);t.index=keep.map(r=>t.index[r]);t.rowCount=keep.length;return t;};
    const sortIndexTable=(table,ascending)=>{const t=cloneTable(table),order=t.index.map((v,i)=>({v,i})).sort((a,b)=>ascending?(a.v>b.v?1:a.v<b.v?-1:0):(a.v>b.v?-1:a.v<b.v?1:0)).map(x=>x.i);for(const c of t.columns)c.values=order.map(i=>c.values[i]);t.index=order.map(i=>t.index[i]);return t;};
    const resetIndexTable=(table,drop)=>{const t=cloneTable(table);if(!drop)t.columns.unshift({id:'index',key:'index',name:'index',unit:'',role:'index',quantity:'',dimension:'',dtype:'number',values:Array.from(t.index)});t.index=Array.from({length:t.rowCount},(_,i)=>i);return t;};
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
    const exportTable=t=>({kind:'data.table',artifactId:String(t?.artifactId||''),index:Array.from(t?.index||[]),columns:(t?.columns||[]).map(cloneColumn),rowCount:Number(t?.rowCount)||0});
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
        elif kind=="series.select":
            lines.append(f"    env[{_js(output)}]=selectSeries(env[{_js(op['input'])}],{_js(op.get('selector'))});")
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
            config,error=_aggregate_config(op,input_kind)
            if error or config is None:raise ValueError("Aggregate operation was not validated before compilation")
            lines.append(f"    env[{_js(output)}]=aggregateValue(env[{_js(op['input'])}],{_js(_AGGREGATES[kind])},{_js(config)});")
    table_outputs=[name for name in report["taskOutputSymbols"] if report["taskOutputKinds"].get(name)=="table"]
    series_outputs=[name for name in report["resultSymbols"] if report["resultKinds"].get(name)=="series"]
    scalar_outputs=[name for name in report["resultSymbols"] if report["resultKinds"].get(name)=="scalar"]
    tables_expr="{" + ",".join(f"{_js(name)}:exportTable(env[{_js(name)}])" for name in table_outputs) + "}"
    series_expr="{" + ",".join(f"{_js(name)}:exportSeries(env[{_js(name)}])" for name in series_outputs) + "}"
    values_expr="{" + ",".join(f"{_js(name)}:env[{_js(name)}]" for name in scalar_outputs) + "}"
    projected=[]
    for name in report["resultSymbols"]:
        projection=report["resultProjections"].get(name)
        if not projection:continue
        if projection["kind"]=="series":
            projected.append(f"{_js(projection['key'])}:seriesRows(env[{_js(name)}])")
        elif projection["kind"]=="scalar":
            projected.append(f"{_js(projection['key'])}:env[{_js(name)}]")
    suffix=(","+",".join(projected)) if projected else ""
    lines += [f"    return {{tables:{tables_expr},series:{series_expr},values:{values_expr}{suffix}}};","  }","});",""]
    return CompiledPortableTask(task_id=task_id,entry="generated-table-transform-"+re.sub(r"[^A-Za-z0-9._-]","-",task_id)+".js",source="\n".join(lines),parameters=params)
