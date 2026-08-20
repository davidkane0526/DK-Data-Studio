(() => {
  if(window.DKDSCharts)return;
  const VERSION='1.1.0';
  const ownerBindings=new Map();
  const element=value=>{
    if(value?.nodeType===1)return value;
    if(typeof value==='string')return document.getElementById(value)||document.querySelector(value);
    return null;
  };
  const plotly=()=>window.Plotly;
  function requirePlotly(){const P=plotly();if(!P)throw new Error('Plotly runtime is unavailable.');return P;}
  function track(owner,off){const id=String(owner||'plugin');if(!ownerBindings.has(id))ownerBindings.set(id,new Set());ownerBindings.get(id).add(off);return()=>{try{off();}finally{ownerBindings.get(id)?.delete(off);}};}
  const TOOLTIP_THEME=Object.freeze({bgcolor:'rgba(31,41,55,0.90)',bordercolor:'rgba(255,255,255,0.22)',align:'left',font:Object.freeze({color:'#ffffff',size:12})});
  function themeLayout(layout={}){
    const source=layout&&typeof layout==='object'?layout:{};const hover=source.hoverlabel&&typeof source.hoverlabel==='object'?source.hoverlabel:{};
    return {...source,hoverlabel:{...hover,...TOOLTIP_THEME,font:{...(hover.font||{}),...TOOLTIP_THEME.font}}};
  }
  function react(target,data=[],layout={},config={}){const el=element(target)||target;return Promise.resolve(requirePlotly().react(el,data,themeLayout(layout),{responsive:true,displaylogo:false,...config}));}
  function restyle(target,update,traces){return requirePlotly().restyle(element(target)||target,update,traces);}
  function relayout(target,update){return requirePlotly().relayout(element(target)||target,update);}
  function resize(target){const el=element(target);if(!el||el.offsetParent===null)return false;try{requirePlotly().Plots.resize(el);return true;}catch{return false;}}
  function purge(target){const el=element(target);if(!el)return false;try{requirePlotly().purge(el);return true;}catch{return false;}}
  function bind(owner,target,event,handler,{replace=false}={}){
    const el=element(target);if(!el||typeof el.on!=='function')return()=>{};
    if(replace){try{el.removeAllListeners?.(event);}catch{}}
    el.on(event,handler);
    return track(owner,()=>{try{el.removeListener?.(event,handler);}catch{}});
  }
  async function toImage(target,{format='png',width,height,scale=2}={}){
    const el=element(target);if(!el)throw new Error('Plot target not found.');
    return requirePlotly().toImage(el,{format,width,height,scale});
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
      version:VERSION,owner:id,element,
      react,restyle,relayout,resize,purge,toImage,saveImage,themeLayout,tooltipTheme:TOOLTIP_THEME,
      bind:(target,event,handler,options)=>bind(id,target,event,handler,options),
      symbols:Object.freeze({type:d3Symbol,path:symbolPath}),
      raw:Object.freeze({get plotly(){return plotly();},get d3(){return window.d3;}})
    });
  }
  function disposeOwner(owner){const id=String(owner||'');for(const off of [...(ownerBindings.get(id)||[])])try{off();}catch{}ownerBindings.delete(id);}
  window.DKDSCharts=Object.freeze({VERSION,createScope,disposeOwner,element,react,restyle,relayout,resize,purge,bind,toImage,saveImage,themeLayout,tooltipTheme:TOOLTIP_THEME,symbols:Object.freeze({type:d3Symbol,path:symbolPath})});
})();
