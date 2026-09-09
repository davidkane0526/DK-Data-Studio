'use strict';
const {resolveElement}=require('../foundation/shortcuts');
const {seriesColor, compactSeriesLabel}=require('./primitives');

  class SeriesRegistry {
    constructor(owner='core'){this.owner=String(owner||'core');this.rows=new Map();this.order=[];}
    stableId(spec={},index=0){const raw=spec?.seriesId??spec?.id??spec?.key??spec?.entityId??spec?.uid??spec?.name??spec?.label??`series-${index+1}`;return String(raw||`series-${index+1}`);}
    register(spec={},index=0){if(typeof spec==='string')spec={id:spec};const id=this.stableId(spec,index);let row=this.rows.get(id);const explicitColor=String(spec?.color||spec?.line?.color||spec?.marker?.color||'');const label=compactSeriesLabel(spec?.label??spec?.legendLabel??spec?.name??spec?.title??id)||id;if(!row){row={id,index:this.order.length,label,color:explicitColor||seriesColor(this.order.length),explicitColor:!!explicitColor,group:String(spec?.legendGroup??spec?.legendgroup??spec?.group??''),visible:spec?.visible!==false,metadata:{...(spec?.metadata||{})}};this.rows.set(id,row);this.order.push(id);}else{row={...row,label:label||row.label,color:explicitColor||(!row.explicitColor?seriesColor(row.index):row.color),explicitColor:!!explicitColor||row.explicitColor,group:String(spec?.legendGroup??spec?.legendgroup??spec?.group??row.group??''),visible:spec?.visible!==false,metadata:{...(row.metadata||{}),...(spec?.metadata||{})}};this.rows.set(id,row);}return this.get(id);}
    normalize(series=[]){return (Array.isArray(series)?series:[]).map((spec,index)=>this.register(spec,index));}
    get(id){const row=this.rows.get(String(id||''));if(!row)return null;const {explicitColor,...publicRow}=row;return Object.freeze({...publicRow,color:explicitColor?row.color:seriesColor(row.index)});}
    color(id,fallback=''){return this.get(id)?.color||fallback||seriesColor(0);}
    label(id,fallback=''){return this.get(id)?.label||compactSeriesLabel(fallback)||String(id||'');}
    setVisible(id,visible=true){const key=String(id||''),row=this.rows.get(key);if(!row)return false;row.visible=visible!==false;this.rows.set(key,row);return row.visible;}
    list(query={}){const rows=this.order.map(id=>this.get(id)).filter(Boolean);if(!query||typeof query!=='object')return rows;return rows.filter(row=>(!query.group||row.group===query.group)&&(query.visible===undefined||row.visible===query.visible));}
    snapshot(){return Object.freeze({owner:this.owner,count:this.rows.size,rows:Object.freeze(this.list()),series:Object.freeze(this.list())});}
    clear(){this.rows.clear();this.order=[];}
  }

  class LegendGroup {
    constructor(scope,id,spec={}){this.scope=scope;this.owner=scope?.owner||'core';this.id=String(id||'legend');this.spec={interaction:'isolate',...spec};this.members=new Map();this.soloId='';this.visibility=new Map();this.listeners=new Set();}
    register(surface,series=[]){const key=surface?.target||surface;if(!key)return()=>{};this.members.set(key,{surface,series:Array.isArray(series)?series:[]});this.notify('register');return()=>{this.members.delete(key);this.notify('unregister');};}
    setSeries(surface,series=[]){const key=surface?.target||surface;const row=this.members.get(key)||{surface};row.series=Array.isArray(series)?series:[];this.members.set(key,row);for(const item of row.series){const id=String(item?.id||item?.seriesId||item?.name||'');if(id&&!this.visibility.has(id))this.visibility.set(id,item?.visible!==false);}this.notify('series');return this.entries();}
    entries(){const map=new Map();for(const member of this.members.values())for(const item of member.series||[]){const id=String(item?.id||item?.seriesId||item?.name||'');if(!id||map.has(id))continue;map.set(id,{...item,id,visible:this.visibility.get(id)!==false});}return [...map.values()];}
    apply(reason='legend-group'){for(const member of this.members.values()){const surface=member.surface;if(surface&&'legendSoloId' in surface){surface.legendSoloId=this.soloId;surface.requestRender?.(reason);}else if(surface?.setLegendSolo)surface.setLegendSolo(this.soloId);}}
    isolate(id=''){const key=String(id||'');this.soloId=this.soloId===key?'':key;this.apply();this.notify('isolate');return this.soloId;}
    setVisible(id,visible=true){const key=String(id||'');if(!key)return false;this.visibility.set(key,visible!==false);if(visible===false&&this.soloId===key)this.soloId='';this.apply('legend-group-visible');this.notify('visible');return this.visibility.get(key);}
    toggle(id){const key=String(id||'');return this.setVisible(key,this.visibility.get(key)===false);}
    showAll(){this.soloId='';for(const entry of this.entries())this.visibility.set(entry.id,true);this.apply('legend-group-show-all');this.notify('show-all');return true;}
    visibleIds(){return this.entries().filter(x=>x.visible!==false&&(this.soloId?x.id===this.soloId:true)).map(x=>x.id);}
    subscribe(fn,{immediate=false}={}){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);if(immediate)fn(this.snapshot(),{reason:'subscribe'});return()=>this.listeners.delete(fn);}
    notify(reason){const snapshot=this.snapshot();for(const fn of [...this.listeners])try{fn(snapshot,{reason});}catch(err){console.warn('[DKDS LegendGroup]',err);}}
    snapshot(){return Object.freeze({id:this.id,owner:this.owner,soloId:this.soloId,count:this.entries().length,visibleIds:Object.freeze(this.visibleIds()),entries:Object.freeze(this.entries().map(x=>Object.freeze({...x})))});}
    dispose(){this.members.clear();this.visibility.clear();this.listeners.clear();}
  }

  class ActiveLayoutSolver {
    constructor(scope=null){this.scope=scope;}
    solve(spec={}){const width=Math.max(0,Number(spec.width)||Number(resolveElement(spec.container)?.clientWidth)||0),height=Math.max(0,Number(spec.height)||Number(resolveElement(spec.container)?.clientHeight)||0),count=Math.max(0,Number(spec.count)||0),gap=Math.max(0,Number(spec.gap)||12),minWidth=Math.max(120,Number(spec.minItemWidth)||280),minHeight=Math.max(100,Number(spec.minItemHeight)||220),maxColumns=Math.max(1,Number(spec.maxColumns)||6),preferred=String(spec.columns??'auto');let columns=preferred!=='auto'&&Number.isFinite(Number(preferred))?Math.max(1,Math.min(maxColumns,Math.floor(Number(preferred)))):Math.max(1,Math.min(maxColumns,Math.floor((width+gap)/(minWidth+gap))||1));if(count)columns=Math.min(columns,count);let itemWidth=columns?Math.max(0,(width-gap*Math.max(0,columns-1))/columns):width;while(columns>1&&itemWidth<minWidth){columns-=1;itemWidth=Math.max(0,(width-gap*(columns-1))/columns);}const rows=count?Math.ceil(count/columns):0,itemHeight=Math.max(minHeight,Math.min(Number(spec.maxItemHeight)||420,Number(spec.aspectRatio)>0?itemWidth/Number(spec.aspectRatio):Math.round(itemWidth*.62)));const neededHeight=rows?rows*itemHeight+gap*Math.max(0,rows-1):0;return Object.freeze({width,height,count,columns,rows,gap,itemWidth:Math.round(itemWidth),itemHeight:Math.round(itemHeight),neededHeight,overflowY:height>0&&neededHeight>height,mode:preferred==='auto'?'auto':'fixed'});}
  }


  class ResizeScheduler {
    constructor(scope){this.scope=scope;this.pending=null;this.raf=0;this.dispatching=false;this.disposed=false;this.suspended=false;}
    request(payload={},options={}){
      if(this.disposed)return;
      const emit=options.emit!==false;
      // Never allow a listener handling layout:resize to synchronously create
      // another layout event. Such requests are reduced to a chart-only refresh.
      const effectiveEmit=this.dispatching?false:emit;
      const previous=this.pending||{};
      this.pending={...previous,...payload,_emit:previous._emit===true||effectiveEmit};
      if(this.suspended){window.DKDSPerformance?.skip?.('ui.suspended-resize');return;}
      if(typeof document!=='undefined'&&document.hidden){window.DKDSPerformance?.skip?.('ui.hidden-resize');return;}
      if(this.raf)return;
      const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));
      this.raf=raf(()=>this.flush());
    }
    flush(){
      if(this.disposed||this.suspended){this.raf=0;return;}this.raf=0;
      const payload=this.pending||{};this.pending=null;this.dispatching=true;
      try{
        if(payload._emit===true)this.scope.options.events?.emit?.('layout:resize',{pluginId:this.scope.owner,...Object.fromEntries(Object.entries(payload).filter(([k])=>k!=='_emit'))});
      }catch{}finally{this.dispatching=false;}
      for(const chart of this.scope.charts){try{if(!chart?.container||chart.container.offsetParent===null)continue;chart.resize?.();}catch{}}
      for(const surface of this.scope.scientificCurves||[]){try{if(surface?.disposed||!surface?.container||surface.container.offsetParent===null)continue;surface.clampNavigationTools?.();surface.requestRender?.('scope-resize');surface.scheduleNavigationCollisionCheck?.();}catch{}}
      if(this.pending&&!this.raf){const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));this.raf=raf(()=>this.flush());}
    }
    suspend(){if(this.disposed||this.suspended)return false;this.suspended=true;if(this.raf){const cancel=globalThis.cancelAnimationFrame||clearTimeout;try{cancel(this.raf);}catch{}}this.raf=0;return true;}
    resume(){if(this.disposed||!this.suspended)return false;this.suspended=false;if(this.pending&&!this.raf){const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));this.raf=raf(()=>this.flush());}return true;}
    state(){return {suspended:this.suspended,pending:!!this.pending,scheduled:!!this.raf};}
    dispose(){this.disposed=true;if(this.raf){const cancel=globalThis.cancelAnimationFrame||clearTimeout;try{cancel(this.raf);}catch{}}this.raf=0;this.pending=null;this.suspended=false;}
  }

module.exports=Object.freeze({SeriesRegistry, LegendGroup, ActiveLayoutSolver, ResizeScheduler});
