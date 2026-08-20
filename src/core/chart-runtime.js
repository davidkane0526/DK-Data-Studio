(() => {
  if(window.DKDSCharts)return;
  const VERSION='1.2.0';
  const ownerBindings=new Map();
  const chartScriptUrl=document.currentScript?.src||globalThis.location?.href||'file:///src/core/chart-runtime.js';
  const defaultPlotlySource=typeof URL==='function'?new URL('../../node_modules/plotly.js-dist-min/plotly.min.js',chartScriptUrl).href:'../../node_modules/plotly.js-dist-min/plotly.min.js';
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
  const TOOLTIP_THEME=Object.freeze({bgcolor:'rgba(31,41,55,0.90)',bordercolor:'rgba(255,255,255,0.22)',align:'left',font:Object.freeze({color:'#ffffff',size:12})});
  function themeLayout(layout={}){
    const source=layout&&typeof layout==='object'?layout:{};const hover=source.hoverlabel&&typeof source.hoverlabel==='object'?source.hoverlabel:{};
    return {...source,hoverlabel:{...hover,...TOOLTIP_THEME,font:{...(hover.font||{}),...TOOLTIP_THEME.font}}};
  }
  function react(target,data=[],layout={},config={}){const el=element(target)||target;const P=plotly();if(P?.react)return Promise.resolve(P.react(el,data,themeLayout(layout),{responsive:true,displaylogo:false,...config}));return ensurePlotly({reason:'react'}).then(next=>next.react(el,data,themeLayout(layout),{responsive:true,displaylogo:false,...config}));}
  function restyle(target,update,traces){const el=element(target)||target;const P=plotly();return P?.restyle?P.restyle(el,update,traces):ensurePlotly({reason:'restyle'}).then(next=>next.restyle(el,update,traces));}
  function relayout(target,update){const el=element(target)||target;const P=plotly();return P?.relayout?P.relayout(el,update):ensurePlotly({reason:'relayout'}).then(next=>next.relayout(el,update));}
  function resize(target){const el=element(target);if(!el||el.offsetParent===null||!plotly()?.Plots?.resize)return false;try{plotly().Plots.resize(el);return true;}catch{return false;}}
  function purge(target){const el=element(target);if(!el||!plotly()?.purge)return false;try{plotly().purge(el);return true;}catch{return false;}}
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
      react,restyle,relayout,resize,purge,toImage,saveImage,themeLayout,tooltipTheme:TOOLTIP_THEME,
      bind:(target,event,handler,options)=>bind(id,target,event,handler,options),
      symbols:Object.freeze({type:d3Symbol,path:symbolPath}),
      raw:Object.freeze({get plotly(){return plotly();},get d3(){return window.d3;}})
    });
  }
  function disposeOwner(owner){const id=String(owner||'');for(const off of [...(ownerBindings.get(id)||[])])try{off();}catch{}ownerBindings.delete(id);}
  window.DKDSCharts=Object.freeze({VERSION,configureRuntime,runtimeState,ensurePlotly,createScope,disposeOwner,element,react,restyle,relayout,resize,purge,bind,toImage,saveImage,themeLayout,tooltipTheme:TOOLTIP_THEME,symbols:Object.freeze({type:d3Symbol,path:symbolPath})});
})();
