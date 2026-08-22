(() => {
  if(window.DKDSCharts)return;
  const VERSION='1.6.0';
  const ownerBindings=new Map();
  const displayScaleStates=new WeakMap();
  const chartScriptUrl=document.currentScript?.src||globalThis.location?.href||'file:///src/core/chart-runtime.js';
  const defaultPlotlySource=typeof URL==='function'?new URL('../../node_modules/plotly.js-cartesian-dist-min/plotly-cartesian.min.js',chartScriptUrl).href:'../../node_modules/plotly.js-cartesian-dist-min/plotly-cartesian.min.js';
  let runtimeConfig={plotlyAllowed:true,plotlySource:defaultPlotlySource,host:'main'};
  let plotlyPromise=null;
  const now=()=>globalThis.performance?.now?.()??Date.now();
  const plotlyRuntime={status:window.Plotly?.react?'ready':'idle',requestedAt:0,readyAt:window.Plotly?.react?now():0,loadDurationMs:0,requests:0,reuses:0,lastReason:'',error:''};
  const element=value=>{
    if(value?.nodeType===1)return value;
    if(typeof value==='string')return document.getElementById(value)||document.querySelector(value);
    return null;
  };
  const plotly=()=>window.Plotly;
  function configureRuntime(options={}){
    if(Object.prototype.hasOwnProperty.call(options,'plotlyAllowed'))runtimeConfig.plotlyAllowed=options.plotlyAllowed!==false;
    if(options.plotlySource)runtimeConfig.plotlySource=String(options.plotlySource);
    if(options.host)runtimeConfig.host=String(options.host);
    if(window.Plotly?.react){plotlyRuntime.status='ready';plotlyRuntime.error='';}
    return runtimeState();
  }
  function ensurePlotly(options={}){
    const current=plotly();
    plotlyRuntime.requests+=1;plotlyRuntime.lastReason=String(options.reason||'chart');
    if(current?.react){plotlyRuntime.status='ready';return Promise.resolve(current);}
    if(runtimeConfig.plotlyAllowed===false)return Promise.reject(new Error('Plotly runtime is not declared by this plugin window.'));
    if(plotlyPromise){plotlyRuntime.reuses+=1;return plotlyPromise;}
    const started=now();plotlyRuntime.requestedAt=started;plotlyRuntime.status='loading';plotlyRuntime.error='';
    plotlyPromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-dkds-plotly-runtime="1"]');
      const script=existing||document.createElement('script');
      const finish=()=>{
        const P=plotly();
        if(!P?.react){const err=new Error('Plotly runtime loaded without a usable Plotly API.');plotlyRuntime.status='error';plotlyRuntime.error=err.message;plotlyPromise=null;reject(err);return;}
        plotlyRuntime.status='ready';plotlyRuntime.readyAt=now();plotlyRuntime.loadDurationMs=Math.round((plotlyRuntime.readyAt-started)*10)/10;plotlyRuntime.error='';resolve(P);
      };
      const fail=()=>{const err=new Error(`无法按需加载 Plotly：${runtimeConfig.plotlySource||defaultPlotlySource}`);plotlyRuntime.status='error';plotlyRuntime.error=err.message;plotlyPromise=null;reject(err);};
      if(existing){if(plotly()?.react)finish();else{existing.addEventListener('load',finish,{once:true});existing.addEventListener('error',fail,{once:true});}}
      else{script.dataset.dkdsPlotlyRuntime='1';script.src=runtimeConfig.plotlySource||defaultPlotlySource;script.async=true;script.addEventListener('load',finish,{once:true});script.addEventListener('error',fail,{once:true});document.head.appendChild(script);}
    });
    return plotlyPromise;
  }
  function runtimeState(){return {version:VERSION,host:runtimeConfig.host,plotlyAllowed:runtimeConfig.plotlyAllowed,plotlySource:runtimeConfig.plotlySource,status:plotlyRuntime.status,requests:plotlyRuntime.requests,reuses:plotlyRuntime.reuses,lastReason:plotlyRuntime.lastReason,loadDurationMs:plotlyRuntime.loadDurationMs,error:plotlyRuntime.error,ready:!!plotly()?.react};}
  function track(owner,off){const id=String(owner||'plugin');if(!ownerBindings.has(id))ownerBindings.set(id,new Set());ownerBindings.get(id).add(off);return()=>{try{off();}finally{ownerBindings.get(id)?.delete(off);}};}
  const TOOLTIP_THEME=Object.freeze({bgcolor:'rgba(31,41,55,0.92)',bordercolor:'rgba(255,255,255,0.20)',align:'left',font:Object.freeze({color:'#ffffff',size:12,family:'Inter, Segoe UI, sans-serif'})});
  function themeLayout(layout={}){
    const source=layout&&typeof layout==='object'?layout:{};const hover=source.hoverlabel&&typeof source.hoverlabel==='object'?source.hoverlabel:{};
    return {...source,hoverlabel:{...hover,...TOOLTIP_THEME,font:{...(hover.font||{}),...TOOLTIP_THEME.font}}};
  }
  function normalizeHoverTemplate(value){
    const text=String(value??'');if(!text||!/<extra>[\s\S]*?<\/extra>/i.test(text))return text;
    return text.replace(/<extra>([\s\S]*?)<\/extra>/gi,(_all,extra)=>{const label=String(extra||'').replace(/<[^>]*>/g,'').trim();return label?`<br><b>${label}</b><extra></extra>`:'<extra></extra>';});
  }
  function themeTrace(trace={}){
    if(!trace||typeof trace!=='object')return trace;
    const hover=trace.hoverlabel&&typeof trace.hoverlabel==='object'?trace.hoverlabel:{};
    const next={...trace,hoverlabel:{...hover,...TOOLTIP_THEME,font:{...(hover.font||{}),...TOOLTIP_THEME.font}}};
    if(typeof trace.hovertemplate==='string')next.hovertemplate=normalizeHoverTemplate(trace.hovertemplate);
    return next;
  }
  function themeData(data=[]){return (Array.isArray(data)?data:[]).map(themeTrace);}
  function normalizeConfig(config={}){
    const source=config&&typeof config==='object'?config:{};
    if(source.staticPlot===true)return {responsive:true,displaylogo:false,...source,displayModeBar:false,scrollZoom:false};
    // Common chart navigation is Core-owned. Plugins can extend the modebar but
    // cannot silently remove basic zoom/home controls from interactive plots.
    return {responsive:true,displaylogo:false,displayModeBar:'hover',scrollZoom:true,doubleClick:'reset+autosize',...source,displayModeBar:'hover'};
  }
  const cloneLayout=value=>{try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return {...(value||{})};}}};
  const axisType=layout=>String(layout?.yaxis?.type||'linear').toLowerCase();
  const toggleableAxisType=type=>!['category','date','multicategory'].includes(String(type||'').toLowerCase());
  const absNumber=value=>{const n=Number(value);return Number.isFinite(n)?Math.abs(n):value;};
  const isHeatmapTrace=trace=>String(trace?.type||'').toLowerCase()==='heatmap';
  const hasHeatmap=data=>(Array.isArray(data)?data:[]).some(isHeatmapTrace);
  const displayAxisFor=(data,layout)=>hasHeatmap(data)?'z':(toggleableAxisType(axisType(layout))?'y':'');
  const finitePositiveAbs=value=>{const n=Math.abs(Number(value));return Number.isFinite(n)&&n>0?n:null;};
  const flattenNumbers=value=>{const out=[];const visit=row=>{if(Array.isArray(row)){for(const item of row)visit(item);return;}const n=finitePositiveAbs(row);if(n!==null)out.push(n);};visit(value);return out;};
  const decadeValues=(lo,hi,{multipliers=[1]}={})=>{
    const a=finitePositiveAbs(lo),b=finitePositiveAbs(hi);if(a===null||b===null)return [];
    const min=Math.min(a,b),max=Math.max(a,b),from=Math.floor(Math.log10(min)),to=Math.ceil(Math.log10(max)),rows=[];
    for(let exp=from;exp<=to;exp++)for(const factor of multipliers){const value=factor*Math.pow(10,exp);if(value>=min*(1-1e-12)&&value<=max*(1+1e-12))rows.push(value);}
    return rows;
  };
  const formatLogValue=value=>{
    const n=Number(value);if(!Number.isFinite(n))return '';
    const a=Math.abs(n);if(a===0)return '0';
    if(a>=1e4||a<1e-3)return n.toExponential(0).replace('e+','e');
    if(a>=100)return String(Math.round(n));
    if(a>=10)return String(Math.round(n*10)/10);
    if(a>=1)return String(Math.round(n*100)/100);
    return String(Number(n.toPrecision(2)));
  };
  function heatmapDisplayTrace(trace,mode){
    if(mode!=='log'||!isHeatmapTrace(trace))return trace;
    const next={...trace};
    const rawZ=Array.isArray(trace.z)?trace.z:[];
    const positives=flattenNumbers(rawZ);
    if(!positives.length)return next;
    const min=Math.min(...positives),max=Math.max(...positives);
    const project=value=>{const n=finitePositiveAbs(value);return n===null?null:Math.log10(n);};
    next.z=rawZ.map(row=>Array.isArray(row)?row.map(project):project(row));
    const magnitudeZ=rawZ.map(row=>Array.isArray(row)?row.map(value=>finitePositiveAbs(value)):finitePositiveAbs(row));
    const logMin=Math.log10(min),logMax=Math.log10(max);next.zmin=logMin===logMax?logMin-.5:logMin;next.zmax=logMin===logMax?logMax+.5:logMax;
    delete next.zmid;
    const tickOriginal=decadeValues(min,max,{multipliers:[1,2,5]});
    const ticks=tickOriginal.length>=2?tickOriginal:decadeValues(min,max,{multipliers:[1,1.5,2,3,5,7]});
    next.colorbar={...(trace.colorbar||{}),tickmode:'array',tickvals:ticks.map(value=>Math.log10(value)),ticktext:ticks.map(formatLogValue)};
    if(typeof trace.hovertemplate==='string'){
      if(trace.customdata===undefined){next.customdata=magnitudeZ;next.hovertemplate=trace.hovertemplate.replace(/%\{z(?::([^}]+))?\}/g,(_all,fmt)=>`%{customdata${fmt?`:${fmt}`:''}}`);}
      else if(trace.text===undefined){next.text=magnitudeZ;next.hovertemplate=trace.hovertemplate.replace(/%\{z(?::([^}]+))?\}/g,(_all,fmt)=>`%{text${fmt?`:${fmt}`:''}}`);}
    }
    return next;
  }
  function displayTrace(trace,mode,axis='y'){
    if(mode!=='log'||!trace||typeof trace!=='object')return trace;
    if(axis==='z')return heatmapDisplayTrace(trace,mode);
    const next={...trace};
    if(Array.isArray(trace.y))next.y=trace.y.map(absNumber);
    else if(Number.isFinite(Number(trace.y0)))next.y0=Math.abs(Number(trace.y0));
    return next;
  }
  function displayLayout(source,mode,axis='y'){
    const layout=cloneLayout(source||{});
    if(axis!=='y')return layout;
    const base=axisType(source);if(!toggleableAxisType(base))return layout;
    layout.yaxis={...(layout.yaxis||{}),type:mode};
    if(mode==='log'){
      delete layout.yaxis.range;layout.yaxis.autorange=true;
      delete layout.yaxis.tickvals;delete layout.yaxis.ticktext;delete layout.yaxis.tick0;
      layout.yaxis.tickmode='linear';layout.yaxis.dtick=1;
      if(Array.isArray(layout.shapes))layout.shapes=layout.shapes.map(shape=>{if(!shape||typeof shape!=='object'||!/^y(?:\d+)?$/.test(String(shape.yref||'y')))return shape;return {...shape,y0:absNumber(shape.y0),y1:absNumber(shape.y1)};});
      if(Array.isArray(layout.annotations))layout.annotations=layout.annotations.map(row=>{if(!row||typeof row!=='object'||!/^y(?:\d+)?$/.test(String(row.yref||'y')))return row;return {...row,y:absNumber(row.y)};});
    }
    return layout;
  }
  function displayState(el){let state=displayScaleStates.get(el);if(!state){state={axis:'y',mode:null,baseType:'linear',sourceData:[],sourceLayout:{},sourceConfig:{},handler:null};displayScaleStates.set(el,state);}return state;}
  function isYAxisInteraction(el,event){
    let current=event?.target;while(current&&current!==el){const cls=typeof current.getAttribute==='function'?String(current.getAttribute('class')||''):'';if(/(^|\s)(ytick|ytitle|yaxislayer-above|yaxislayer-below|g-ytitle)(\s|$)/.test(cls)||/yaxis/i.test(cls))return true;current=current.parentNode;}
    const rect=el?.getBoundingClientRect?.(),size=el?._fullLayout?._size;if(!rect||!size||!Number.isFinite(Number(event?.clientX))||!Number.isFinite(Number(event?.clientY)))return false;
    const x=Number(event.clientX)-rect.left,y=Number(event.clientY)-rect.top,left=Number(size.l)||0,top=Number(size.t)||0,height=Number(size.h)||0;
    return x>=0&&x<=left+12&&y>=Math.max(0,top-14)&&y<=top+height+14;
  }
  function isColorScaleInteraction(el,event){
    let current=event?.target;while(current&&current!==el){const cls=typeof current.getAttribute==='function'?String(current.getAttribute('class')||''):'';if(/(^|\s)(cbaxis|cbtitle|cbbg|cbfill|cboutline|cbline|colorbar)(\s|$)/i.test(cls)||/colorbar/i.test(cls))return true;current=current.parentNode;}
    const rect=el?.getBoundingClientRect?.(),size=el?._fullLayout?._size;if(!rect||!size||!Number.isFinite(Number(event?.clientX))||!Number.isFinite(Number(event?.clientY)))return false;
    const x=Number(event.clientX)-rect.left,y=Number(event.clientY)-rect.top,right=(Number(size.l)||0)+(Number(size.w)||0),top=Number(size.t)||0,height=Number(size.h)||0;
    return x>=right-4&&x<=rect.width&&y>=Math.max(0,top-18)&&y<=top+height+18;
  }
  function renderDisplay(el,P,state){const mode=String(state.mode||state.baseType||'linear').toLowerCase(),axis=String(state.axis||'y'),rows=(state.sourceData||[]).map(trace=>displayTrace(trace,mode,axis)),layout=displayLayout(state.sourceLayout,mode,axis);if(el?.dataset){el.dataset.dkdsDisplayAxis=axis;el.dataset[axis==='z'?'dkdsZScale':'dkdsYScale']=mode;}return Promise.resolve(P.react(el,rows,layout,state.sourceConfig||{}));}
  function installDisplayScale(el){
    if(!el)return;const state=displayState(el);if(state.handler)return;
    state.handler=event=>{const axis=String(state.axis||'y'),hit=axis==='z'?isColorScaleInteraction(el,event):isYAxisInteraction(el,event);if(!hit||!toggleableAxisType(state.baseType))return;event.preventDefault?.();event.stopPropagation?.();event.stopImmediatePropagation?.();state.mode=(String(state.mode||state.baseType).toLowerCase()==='log')?'linear':'log';const P=plotly();const done=P?.react?renderDisplay(el,P,state):ensurePlotly({reason:'display-scale'}).then(next=>renderDisplay(el,next,state));Promise.resolve(done).then(()=>{try{el.dispatchEvent(new CustomEvent('dkds:display-scale-changed',{detail:{axis,type:state.mode}}));}catch{}}).catch(()=>{});};
    el.addEventListener?.('dblclick',state.handler,true);
  }
  function displayScaleState(target){const el=element(target)||target,state=el?displayScaleStates.get(el):null;return state?{axis:String(state.axis||'y'),type:String(state.mode||state.baseType||'linear'),baseType:String(state.baseType||'linear')}:null;}
  function adoptDisplayScale(target,data=null,layout=null,config=null){const el=element(target)||target;if(!el)return null;const state=displayState(el);state.sourceData=themeData(data||el.data||[]);state.sourceLayout=themeLayout(layout||el.layout||{});state.sourceConfig=normalizeConfig(config||el._context||{});const nextAxis=displayAxisFor(state.sourceData,state.sourceLayout)||'y';if(state.axis!==nextAxis)state.mode=null;state.axis=nextAxis;state.baseType=state.axis==='z'?'linear':axisType(state.sourceLayout);if(state.mode&&!toggleableAxisType(state.baseType))state.mode=null;installDisplayScale(el);if(el?.dataset){el.dataset.dkdsDisplayAxis=state.axis;el.dataset[state.axis==='z'?'dkdsZScale':'dkdsYScale']=String(state.mode||state.baseType||'linear');}return displayScaleState(el);}
  function toggleDisplayScale(target,requestedAxis=''){const el=element(target)||target;if(!el)return Promise.resolve(false);const state=displayState(el),axis=String(requestedAxis||state.axis||'y');if(requestedAxis&&axis!==String(state.axis||'y'))return Promise.resolve(false);if(!toggleableAxisType(state.baseType))return Promise.resolve(false);state.mode=(String(state.mode||state.baseType).toLowerCase()==='log')?'linear':'log';const run=P=>renderDisplay(el,P,state).then(()=>{try{el.dispatchEvent(new CustomEvent('dkds:display-scale-changed',{detail:{axis,type:state.mode}}));}catch{}return state.mode;});const P=plotly();return P?.react?run(P):ensurePlotly({reason:'display-scale'}).then(run);}
  function toggleYAxisDisplay(target){return toggleDisplayScale(target,'y');}
  function react(target,data=[],layout={},config={}){const el=element(target)||target,rows=themeData(data),cfg=normalizeConfig(config),themedLayout=themeLayout(layout),state=displayState(el);state.sourceData=rows;state.sourceLayout=themedLayout;state.sourceConfig=cfg;const nextAxis=displayAxisFor(rows,themedLayout)||'y';if(state.axis!==nextAxis)state.mode=null;state.axis=nextAxis;state.baseType=state.axis==='z'?'linear':axisType(themedLayout);if(state.mode&&!toggleableAxisType(state.baseType))state.mode=null;installDisplayScale(el);const P=plotly();if(P?.react)return renderDisplay(el,P,state);return ensurePlotly({reason:'react'}).then(next=>renderDisplay(el,next,state));}
  function restyle(target,update,traces){const el=element(target)||target;const P=plotly();return P?.restyle?P.restyle(el,update,traces):ensurePlotly({reason:'restyle'}).then(next=>next.restyle(el,update,traces));}
  function relayout(target,update){const el=element(target)||target;const P=plotly();return P?.relayout?P.relayout(el,update):ensurePlotly({reason:'relayout'}).then(next=>next.relayout(el,update));}
  function resize(target){const el=element(target);if(!el||el.offsetParent===null||!plotly()?.Plots?.resize)return false;try{plotly().Plots.resize(el);return true;}catch{return false;}}
  function purge(target){const el=element(target);if(!el||!plotly()?.purge)return false;const state=displayScaleStates.get(el);if(state?.handler)try{el.removeEventListener?.('dblclick',state.handler,true);}catch{}displayScaleStates.delete(el);try{plotly().purge(el);return true;}catch{return false;}}
  function bind(owner,target,event,handler,{replace=false}={}){
    const el=element(target);if(!el||typeof el.on!=='function')return()=>{};
    if(replace){try{el.removeAllListeners?.(event);}catch{}}
    el.on(event,handler);
    return track(owner,()=>{try{el.removeListener?.(event,handler);}catch{}});
  }
  async function toImage(target,{format='png',width,height,scale=2}={}){
    const el=element(target);if(!el)throw new Error('Plot target not found.');
    const P=plotly()?.toImage?plotly():await ensurePlotly({reason:'to-image'});
    return P.toImage(el,{format,width,height,scale});
  }
  async function saveImage(target,baseName='plot',format='png'){
    if(typeof window.DKDSIO?.saveBase64!=='function'&&typeof window.DKDSIO?.saveText!=='function')throw new Error('Core I/O runtime unavailable.');
    const type=String(format||'png').toLowerCase();
    if(type==='svg'){
      const uri=await toImage(target,{format:'svg',scale:1});
      const content=decodeURIComponent(String(uri).split(',').slice(1).join(','));
      return window.DKDSIO.saveText({defaultName:`${baseName}.svg`,content,filters:[{name:'SVG',extensions:['svg']}]});
    }
    const uri=await toImage(target,{format:'png',scale:2});
    return window.DKDSIO.saveBase64({defaultName:`${baseName}.png`,base64:String(uri).split(',')[1]||'',mimeType:'image/png',filters:[{name:'PNG',extensions:['png']}]});
  }
  function d3Symbol(name='circle'){
    const d3=window.d3;if(!d3)return null;
    const map={circle:d3.symbolCircle,diamond:d3.symbolDiamond,triangle:d3.symbolTriangle,square:d3.symbolSquare,cross:d3.symbolCross,star:d3.symbolStar,'triangle-down':d3.symbolTriangle,kite:d3.symbolDiamond,hexagon:d3.symbolCircle};
    return map[String(name||'').toLowerCase()]||d3.symbolCircle;
  }
  function symbolPath(name='circle',size=105){const d3=window.d3;const type=d3Symbol(name);return d3?.symbol&&type?d3.symbol().type(type).size(Number(size)||105)():'';}
  function createScope(owner){
    const id=String(owner||'plugin');
    return Object.freeze({
      version:VERSION,owner:id,element,ensurePlotly,runtimeState,
      react,restyle,relayout,resize,purge,toImage,saveImage,themeLayout,themeData,normalizeConfig,displayScaleState,adoptDisplayScale,toggleDisplayScale,toggleYAxisDisplay,tooltipTheme:TOOLTIP_THEME,
      bind:(target,event,handler,options)=>bind(id,target,event,handler,options),
      symbols:Object.freeze({type:d3Symbol,path:symbolPath}),
      raw:Object.freeze({get plotly(){return plotly();},get d3(){return window.d3;}})
    });
  }
  function disposeOwner(owner){const id=String(owner||'');for(const off of [...(ownerBindings.get(id)||[])])try{off();}catch{}ownerBindings.delete(id);}
  window.DKDSCharts=Object.freeze({VERSION,configureRuntime,runtimeState,ensurePlotly,createScope,disposeOwner,element,react,restyle,relayout,resize,purge,bind,toImage,saveImage,themeLayout,themeData,normalizeConfig,displayScaleState,adoptDisplayScale,toggleDisplayScale,toggleYAxisDisplay,tooltipTheme:TOOLTIP_THEME,symbols:Object.freeze({type:d3Symbol,path:symbolPath})});
})();
