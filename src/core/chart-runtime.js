(() => {
  if(window.DKDSCharts)return;
  const VERSION='1.8.0';
  const ownerBindings=new Map();
  const displayScaleStates=new WeakMap();
  const legendLayoutStates=new WeakMap();
  const legendBaseLayouts=new WeakMap();
  const legendResizeFrames=new WeakMap();
  const plotNavigationStates=new WeakMap();
  const plotLegendStates=new WeakMap();
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
  const UI_FONT='Segoe UI Variable Text, Microsoft YaHei UI, Segoe UI, sans-serif';
  const TOOLTIP_THEME=Object.freeze({bgcolor:'rgba(31,41,55,0.92)',bordercolor:'rgba(255,255,255,0.20)',align:'left',font:Object.freeze({color:'#ffffff',size:12,family:UI_FONT})});
  const PLOT_SERIES_PALETTE=Object.freeze(['#2563eb','#0f9f9a','#dc2626','#f97316','#6d28d9','#db2777','#16a34a','#ca8a04','#0891b2','#7c3aed']);
  const PLOT_THEME_LIGHT=Object.freeze({paper:'#ffffff',plot:'#ffffff',grid:'#e8edf4',zero:'#d3dbe6',axis:'#adb8c7',text:'#46546a',muted:'#6f7d91',legend:'rgba(214,223,235,.72)',colorbar:'#d3dce8'});
  const PLOT_THEME_DARK=Object.freeze({paper:'#1d232e',plot:'#1d232e',grid:'#303a49',zero:'#414d5f',axis:'#5a687c',text:'#d8e0eb',muted:'#9aa7b9',legend:'rgba(72,84,103,.80)',colorbar:'#4b586b'});
  const activeThemeName=()=>String(window.DKDSTheme?.current?.()||document.documentElement?.dataset?.dkdsTheme||'').toLowerCase()|| (globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches?'dark':'light');
  const plotTheme=()=>activeThemeName()==='dark'?PLOT_THEME_DARK:PLOT_THEME_LIGHT;
  const isPlainWhite=value=>['','#fff','#ffffff','white','rgb(255, 255, 255)','rgba(255, 255, 255, 1)'].includes(String(value??'').trim().toLowerCase());
  const oldGrid=value=>['','#edf0f5','#e8edf5','#e5e9f0','#dfe5ef'].includes(String(value??'').trim().toLowerCase());
  function themeAxis(axis={},theme=plotTheme()){
    const source=axis&&typeof axis==='object'?axis:{};const title=source.title&&typeof source.title==='object'?source.title:{text:source.title};const tickfont=source.tickfont&&typeof source.tickfont==='object'?source.tickfont:{};
    return {...source,gridcolor:oldGrid(source.gridcolor)?theme.grid:source.gridcolor,zerolinecolor:oldGrid(source.zerolinecolor)?theme.zero:source.zerolinecolor,linecolor:source.linecolor||theme.axis,tickcolor:source.tickcolor||theme.axis,tickfont:{family:UI_FONT,size:11,color:theme.muted,...tickfont},title:{...title,font:{family:UI_FONT,size:12,color:theme.text,...(title.font||{})}},automargin:source.automargin!==false};
  }
  function themeLayout(layout={}){
    const source=layout&&typeof layout==='object'?layout:{};const hover=source.hoverlabel&&typeof source.hoverlabel==='object'?source.hoverlabel:{};const next={...source},theme=plotTheme();
    for(const [key,value] of Object.entries(source))if(/^[xy]axis\d*$/.test(key))next[key]=themeAxis(value,theme);
    if(!next.xaxis)next.xaxis=themeAxis({},theme);if(!next.yaxis)next.yaxis=themeAxis({},theme);
    const font=source.font&&typeof source.font==='object'?source.font:{};next.font={family:UI_FONT,size:12,color:theme.text,...font};
    if(isPlainWhite(source.paper_bgcolor))next.paper_bgcolor=theme.paper;
    if(isPlainWhite(source.plot_bgcolor))next.plot_bgcolor=theme.plot;
    if(source.legend&&typeof source.legend==='object')next.legend={...source.legend,bgcolor:isPlainWhite(source.legend.bgcolor)?'rgba(255,255,255,0)':source.legend.bgcolor,bordercolor:source.legend.bordercolor||theme.legend,borderwidth:Number(source.legend.borderwidth)||0,font:{family:UI_FONT,size:11,color:theme.text,...(source.legend.font||{})}};
    next.modebar={bgcolor:'rgba(0,0,0,0)',color:theme.muted,activecolor:theme.text,...(source.modebar||{})};
    next.hoverlabel={...hover,...TOOLTIP_THEME,font:{...(hover.font||{}),...TOOLTIP_THEME.font}};
    return next;
  }
  function normalizeHoverTemplate(value){
    const text=String(value??'');if(!text||!/<extra>[\s\S]*?<\/extra>/i.test(text))return text;
    return text.replace(/<extra>([\s\S]*?)<\/extra>/gi,(_all,extra)=>{const label=String(extra||'').replace(/<[^>]*>/g,'').trim();return label?`<br><b>${label}</b><extra></extra>`:'<extra></extra>';});
  }
  function themeTrace(trace={}){
    if(!trace||typeof trace!=='object')return trace;
    const hover=trace.hoverlabel&&typeof trace.hoverlabel==='object'?trace.hoverlabel:{};
    const next={...trace,hoverlabel:{...hover,...TOOLTIP_THEME,font:{...(hover.font||{}),...TOOLTIP_THEME.font}}};
    if(trace.colorbar&&typeof trace.colorbar==='object'){const theme=plotTheme(),title=trace.colorbar.title&&typeof trace.colorbar.title==='object'?trace.colorbar.title:{text:trace.colorbar.title};next.colorbar={...trace.colorbar,outlinecolor:trace.colorbar.outlinecolor||theme.colorbar,tickfont:{family:UI_FONT,size:10,color:theme.muted,...(trace.colorbar.tickfont||{})},title:{...title,font:{family:UI_FONT,size:11,color:theme.text,...(title.font||{})}}};}
    if(typeof trace.hovertemplate==='string')next.hovertemplate=normalizeHoverTemplate(trace.hovertemplate);
    return next;
  }
  function themeData(data=[]){return normalizedLegendData(Array.isArray(data)?data:[]).map(themeTrace);}
  function compactLegendLabel(value=''){let text=String(value??'').trim();if(!text)return '';text=text.replace(/\\/g,'/');if(text.includes('/'))text=text.split('/').filter(Boolean).at(-1)||text;text=text.replace(/\.(csv|txt|dat|tsv|xlsx?|json)$/i,'');return text.length>44?`${text.slice(0,20)}…${text.slice(-20)}`:text;}
  function normalizedLegendData(data=[]){const rows=(Array.isArray(data)?data:[]).map((trace,index)=>{if(!trace||typeof trace!=='object')return trace;const explicit=trace.legendlabel??trace.meta?.legendLabel??trace.meta?.label;let name=compactLegendLabel(explicit??trace.name??'');if(!name)name=`Series ${index+1}`;return {...trace,name};});const counts=new Map();for(const row of rows){const name=String(row?.name||'');counts.set(name,(counts.get(name)||0)+1);}const seen=new Map();return rows.map((row,index)=>{const name=String(row?.name||'');if((counts.get(name)||0)<=1)return row;const ordinal=(seen.get(name)||0)+1;seen.set(name,ordinal);const suffix=row?.meta?.vg!=null?` · ${row.meta.vg} V`:row?.legendgroup?` · ${compactLegendLabel(row.legendgroup)}`:` · ${ordinal}`;return {...row,name:`${name}${suffix}`};});}
  function legendableTrace(trace={}){const type=String(trace?.type||'scatter').toLowerCase();return trace?.showlegend!==false&&!!String(trace?.name||'').trim()&&!['heatmap','contour','surface','image','histogram2d','histogram2dcontour'].includes(type);}
  function legendTextWidth(value=''){let width=0;for(const ch of String(value||''))width+=/[\u2E80-\u9FFF\uF900-\uFAFF]/.test(ch)?10.2:6.15;return Math.min(170,28+width);}
  function packedLegendRows(widths,available,gap=6){let rows=1,used=0;for(const raw of widths){const w=Math.min(available,Math.max(38,Number(raw)||38));if(used>0&&used+gap+w>available){rows+=1;used=w;}else used+=(used?gap:0)+w;}return Math.max(1,rows);}
  function smartLegendLayout(target,data=[],layout={}){
    const source=layout&&typeof layout==='object'?layout:{};const traces=(Array.isArray(data)?data:[]).filter(legendableTrace);const explicitOff=source.showlegend===false;
    if(explicitOff||traces.length<2){const next={...source};legendLayoutStates.set(target,{enabled:false,placement:'none',count:traces.length,rows:0,width:0,height:0,reserve:0,containerWidth:Number(target?.getBoundingClientRect?.().width)||0,containerHeight:Number(target?.getBoundingClientRect?.().height)||0,reason:explicitOff?'explicit-disabled':'single-series'});return next;}
    const current=source.legend&&typeof source.legend==='object'?source.legend:{};const requested=String(current.placement||current.autoplacePlacement||'auto');const explicitPlacement=current.autoplace===false&&(['x','y','orientation'].some(key=>Object.prototype.hasOwnProperty.call(current,key))||!!current.placement);
    if(explicitPlacement){legendLayoutStates.set(target,{enabled:true,placement:'explicit',count:traces.length,rows:0,width:0,height:0,reserve:0,reason:'explicit-layout'});return {...source,showlegend:true,legend:{itemclick:false,itemdoubleclick:false,...current}};}
    const rect=target?.getBoundingClientRect?.()||{};const width=Math.max(240,Number(rect.width)||Number(source.width)||640),height=Math.max(160,Number(rect.height)||Number(source.height)||360);const margin={l:56,r:18,t:18,b:46,...(source.margin||{})};
    const entryWidths=traces.map(trace=>legendTextWidth(trace.name)),availableW=Math.max(140,Math.floor((width-margin.l-margin.r-16)/8)*8),rows=packedLegendRows(entryWidths,availableW,6),horizontalHeight=rows*22+8,maxEntry=Math.max(...entryWidths,82),sideWidth=Math.min(Math.max(maxEntry+12,116),Math.max(116,width*.28));
    const previous=legendLayoutStates.get(target)||{};let placement=['top','bottom','right','left'].includes(requested)?requested:'auto';if(placement==='auto'){const topFits=rows<=2&&horizontalHeight/height<=.24;const bottomFits=rows<=3&&horizontalHeight/height<=.30;placement=topFits?'top':(bottomFits?'bottom':(width>=700?'right':'bottom'));if(['top','bottom'].includes(previous.placement)&&Math.abs((previous.availableW||0)-availableW)<18){if(previous.placement==='top'&&rows<=2)placement='top';if(previous.placement==='bottom'&&rows<=3&&!topFits)placement='bottom';}}
    const nextMargin={...margin};let legend,reserve;if(placement==='top'){reserve=horizontalHeight;nextMargin.t=Math.max(nextMargin.t,Math.ceil(reserve)+12);legend={orientation:'h',x:.5,xanchor:'center',y:1.015,yanchor:'bottom',traceorder:'normal'};}else if(placement==='bottom'){reserve=horizontalHeight;nextMargin.b=Math.max(nextMargin.b,Math.ceil(reserve)+46);legend={orientation:'h',x:.5,xanchor:'center',y:-.14,yanchor:'top',traceorder:'normal'};}else if(placement==='left'){reserve=sideWidth+10;nextMargin.l=Math.max(nextMargin.l,Math.ceil(reserve)+38);legend={orientation:'v',x:-.02,xanchor:'right',y:1,yanchor:'top',traceorder:'normal'};}else{reserve=sideWidth+10;nextMargin.r=Math.max(nextMargin.r,Math.ceil(reserve));legend={orientation:'v',x:1.015,xanchor:'left',y:1,yanchor:'top',traceorder:'normal'};}
    const horizontal=placement==='top'||placement==='bottom',metrics={enabled:true,placement,count:traces.length,rows:horizontal?rows:traces.length,width:horizontal?availableW:sideWidth,height:horizontal?horizontalHeight:Math.min(height-margin.t-margin.b,traces.length*24+6),reserve,availableW,containerWidth:width,containerHeight:height,reason:'active-layout-solver'};legendLayoutStates.set(target,metrics);
    return {...source,showlegend:true,margin:nextMargin,legend:{...current,...legend,autoplace:true,placement,itemclick:false,itemdoubleclick:false,font:{size:10,...(current.font||{})},itemsizing:'constant',tracegroupgap:3}};
  }
  function legendMetrics(target){const el=element(target)||target;return {...(legendLayoutStates.get(el)||{enabled:false,placement:'none',count:0,rows:0,width:0,height:0,reserve:0,reason:'unrendered'})};}
  function normalizeConfig(config={}){
    const source=config&&typeof config==='object'?config:{},staticPlot=source.staticPlot===true,explicitOff=source.displayModeBar===false||source.dkdsNavigationTools===false;
    const next={responsive:true,displaylogo:false,scrollZoom:!staticPlot,doubleClick:'reset+autosize',...source};
    next.__dkdsNavigationTools=!staticPlot&&!explicitOff;
    // Plotly's native modebar is intentionally suppressed. Core renders one compact,
    // theme-aware, draggable navigation strip shared with D3 ScientificCurveSurface.
    next.displayModeBar=false;delete next.dkdsNavigationTools;return next;
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
  function displayState(el){let state=displayScaleStates.get(el);if(!state){state={axis:'y',mode:null,baseType:'linear',sourceData:[],sourceLayout:{},sourceConfig:{},handler:null,legendSoloKey:''};displayScaleStates.set(el,state);}return state;}
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
  function traceSeriesKey(trace,index){return String(trace?.uid??trace?.meta?.seriesId??trace?.meta?.id??trace?.id??`${trace?.name||'series'}#${index}`);}
  function legendFocusedRows(state,rows){const solo=String(state?.legendSoloKey||'');if(!solo)return rows;const keys=rows.map(traceSeriesKey);if(!keys.includes(solo)){state.legendSoloKey='';return rows;}return rows.map((trace,index)=>legendableTrace(trace)?{...trace,visible:keys[index]===solo?true:'legendonly'}:trace);}
  function plotlyConfig(config={}){const next={...(config||{})};delete next.__dkdsNavigationTools;return next;}
  function plotlyRenderLayout(el,layout={}){const next=cloneLayout(layout||{}),metrics=legendLayoutStates.get(el)||{};if(metrics.enabled&&metrics.placement!=='explicit')next.showlegend=false;return next;}
  function plotLegendColor(el,trace,index){const full=el?._fullData?.[index]||{},candidates=[trace?.line?.color,trace?.marker?.color,trace?.fillcolor,full?.line?.color,full?.marker?.color,full?.fillcolor];for(const value of candidates)if(typeof value==='string'&&value.trim())return value;return PLOT_SERIES_PALETTE[Math.abs(Number(index)||0)%PLOT_SERIES_PALETTE.length];}
  function renderPlotLegend(el,state){if(!el||typeof document==='undefined'||typeof document.createElement!=='function'||typeof el.appendChild!=='function')return;const metrics=legendLayoutStates.get(el)||{enabled:false,placement:'none'},entries=(state?.sourceData||[]).map((trace,index)=>({trace,index,key:traceSeriesKey(trace,index),label:String(trace?.name||''),color:plotLegendColor(el,trace,index)})).filter(row=>legendableTrace(row.trace));let binding=plotLegendStates.get(el);if(!metrics.enabled||metrics.placement==='explicit'||entries.length<2){binding?.host?.remove?.();plotLegendStates.delete(el);return;}if(!binding?.host?.isConnected){const host=document.createElement('div');host.className='dkds-plot-legend dkds-scientific-auto-legend dkds-plotly-auto-legend';host.dataset.dkdsLegend='auto';host.dataset.dkdsLegendEngine='plotly';host.setAttribute('aria-label','图例');host.addEventListener('click',event=>{const button=event.target?.closest?.('button[data-series-key]');if(!button||!host.contains(button))return;event.preventDefault();event.stopPropagation();const key=String(button.dataset.seriesKey||'');if(!key)return;const current=displayScaleStates.get(el);if(!current)return;current.legendSoloKey=current.legendSoloKey===key?'':key;const P=plotly();if(P?.react)void renderDisplay(el,P,current);});el.appendChild(host);binding={host};plotLegendStates.set(el,binding);}const host=binding.host;host.classList.remove('hidden','is-top','is-bottom','is-right','is-left');host.classList.add(`is-${metrics.placement}`);for(const name of ['left','right','top','bottom','width','max-height'])host.style.removeProperty(name);if(metrics.placement==='right'||metrics.placement==='left'){host.style[metrics.placement]='6px';host.style.top='8px';host.style.width=`${Math.max(104,(Number(metrics.width)||116)-12)}px`;host.style.maxHeight=`${Math.max(70,Number(metrics.height)||70)}px`;}else{host.style.left='6px';host.style.right='6px';host.style[metrics.placement]='4px';}const fragment=document.createDocumentFragment(),solo=String(state?.legendSoloKey||'');for(const row of entries){const button=document.createElement('button');button.type='button';button.className='dkds-plot-legend-item';button.dataset.seriesKey=row.key;const active=!solo||solo===row.key;button.classList.toggle('is-muted',!active);button.setAttribute('aria-pressed',String(active));button.title=solo===row.key?'再次点击恢复全部通道':`只显示 ${row.label}`;const swatch=document.createElement('span');swatch.className='dkds-plot-legend-swatch';swatch.style.background=row.color;const label=document.createElement('span');label.className='dkds-plot-legend-label';label.textContent=row.label;button.append(swatch,label);fragment.appendChild(button);}host.replaceChildren(fragment);}
  function navigationStorageKey(el){const id=String(el?.id||el?.dataset?.dkdsScientificPlotId||'').trim();return id?`dkds.plot-nav.${id}`:'';}
  function setPlotNavigationPosition(el,tools,x,y,{persist=false,moved=true}={}){const host=el?.getBoundingClientRect?.(),rect=tools?.getBoundingClientRect?.();if(!host||!rect||!(host.width>0&&host.height>0&&rect.width>0&&rect.height>0))return false;const pad=5,nx=Math.max(pad,Math.min(host.width-rect.width-pad,Number(x)||pad)),ny=Math.max(pad,Math.min(host.height-rect.height-pad,Number(y)||pad));tools.style.left=`${Math.round(nx)}px`;tools.style.top=`${Math.round(ny)}px`;tools.style.right='auto';if(moved)tools.dataset.moved='1';else delete tools.dataset.moved;if(persist){const key=navigationStorageKey(el);if(key)try{localStorage.setItem(key,JSON.stringify({x:nx,y:ny}));}catch{}}return true;}
  function positionPlotNavigation(el,state){const nav=plotNavigationStates.get(el),tools=nav?.tools;if(!tools||tools.dataset.moved==='1')return false;const host=el.getBoundingClientRect(),tool=tools.getBoundingClientRect();if(!(host.width>0&&host.height>0&&tool.width>0&&tool.height>0))return false;const metrics=legendLayoutStates.get(el)||{},pad=6;let x=Math.max(pad,host.width-tool.width-pad),y=pad;if(metrics.enabled&&metrics.placement==='top')y=Math.min(Math.max(pad,(Number(metrics.reserve)||0)+7),Math.max(pad,host.height-tool.height-pad));else if(metrics.enabled&&metrics.placement==='right')x=Math.max(pad,host.width-tool.width-(Number(metrics.reserve)||0)-pad);setPlotNavigationPosition(el,tools,x,y,{moved:false});return true;}
  function plotZoom(el,factor){const P=plotly();if(!P?.relayout||!el?._fullLayout)return Promise.resolve(false);const patch={};for(const key of Object.keys(el._fullLayout)){if(!/^[xy]axis\d*$/.test(key))continue;const range=el._fullLayout[key]?.range;if(!Array.isArray(range)||range.length<2||!range.every(v=>Number.isFinite(Number(v))))continue;const a=Number(range[0]),b=Number(range[1]),c=(a+b)/2,span=(b-a)*factor/2;patch[`${key}.range`]=[c-span,c+span];patch[`${key}.autorange`]=false;}return Object.keys(patch).length?Promise.resolve(P.relayout(el,patch)):Promise.resolve(false);}
  function plotHome(el){const P=plotly();if(!P?.relayout||!el?._fullLayout)return Promise.resolve(false);const patch={};for(const key of Object.keys(el._fullLayout))if(/^[xy]axis\d*$/.test(key))patch[`${key}.autorange`]=true;return Object.keys(patch).length?Promise.resolve(P.relayout(el,patch)):Promise.resolve(false);}
  function installPlotNavigation(el,state){if(!el||typeof document==='undefined'||typeof document.createElement!=='function'||typeof el.appendChild!=='function'||!el.classList?.add)return;let nav=plotNavigationStates.get(el);const enabled=state?.sourceConfig?.__dkdsNavigationTools!==false;if(!enabled){nav?.tools?.remove?.();plotNavigationStates.delete(el);return;}if(nav?.tools?.isConnected){requestAnimationFrame(()=>positionPlotNavigation(el,state));return;}el.classList.add('dkds-plotly-surface-host');const tools=document.createElement('div');tools.className='dkds-scientific-nav-tools dkds-plotly-nav-tools';tools.setAttribute('aria-label','图形操作');const drag=document.createElement('span');drag.className='dkds-scientific-nav-drag';drag.setAttribute('role','button');drag.setAttribute('tabindex','0');drag.textContent='⋮';drag.title='拖动工具条；双击恢复默认位置';tools.appendChild(drag);for(const [action,label,title] of [['zoom-in','＋','放大'],['zoom-out','−','缩小'],['home','⌂','恢复全部数据']]){const button=document.createElement('button');button.type='button';button.dataset.action=action;button.textContent=label;button.title=title;button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(action==='home')void plotHome(el);else void plotZoom(el,action==='zoom-in'?.72:1.38);});tools.appendChild(button);}el.appendChild(tools);nav={tools,drag};plotNavigationStates.set(el,nav);let ds=null;drag.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();const host=el.getBoundingClientRect(),r=tools.getBoundingClientRect();ds={id:event.pointerId,cx:event.clientX,cy:event.clientY,x:r.left-host.left,y:r.top-host.top};tools.classList.add('is-dragging');try{drag.setPointerCapture(event.pointerId);}catch{}});drag.addEventListener('pointermove',event=>{if(!ds||event.pointerId!==ds.id)return;event.preventDefault();setPlotNavigationPosition(el,tools,ds.x+event.clientX-ds.cx,ds.y+event.clientY-ds.cy);});const finish=event=>{if(!ds||event.pointerId!==ds.id)return;ds=null;tools.classList.remove('is-dragging');const x=parseFloat(tools.style.left),y=parseFloat(tools.style.top);if(Number.isFinite(x)&&Number.isFinite(y))setPlotNavigationPosition(el,tools,x,y,{persist:true});};drag.addEventListener('pointerup',finish);drag.addEventListener('pointercancel',finish);drag.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();const key=navigationStorageKey(el);if(key)try{localStorage.removeItem(key);}catch{}for(const prop of ['left','top','right'])tools.style.removeProperty(prop);delete tools.dataset.moved;requestAnimationFrame(()=>positionPlotNavigation(el,state));});drag.addEventListener('keydown',event=>{if(event.key==='Home'||event.key==='Escape'){event.preventDefault();const key=navigationStorageKey(el);if(key)try{localStorage.removeItem(key);}catch{}delete tools.dataset.moved;requestAnimationFrame(()=>positionPlotNavigation(el,state));}});const key=navigationStorageKey(el);if(key)try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved)requestAnimationFrame(()=>setPlotNavigationPosition(el,tools,saved.x,saved.y));else requestAnimationFrame(()=>positionPlotNavigation(el,state));}catch{requestAnimationFrame(()=>positionPlotNavigation(el,state));}else requestAnimationFrame(()=>positionPlotNavigation(el,state));}
  function renderDisplay(el,P,state){const mode=String(state.mode||state.baseType||'linear').toLowerCase(),axis=String(state.axis||'y'),rows=legendFocusedRows(state,(state.sourceData||[]).map(trace=>displayTrace(trace,mode,axis))),logicalLayout=displayLayout(state.sourceLayout,mode,axis),layout=plotlyRenderLayout(el,logicalLayout);if(el?.dataset){el.dataset.dkdsDisplayAxis=axis;el.dataset[axis==='z'?'dkdsZScale':'dkdsYScale']=mode;}return Promise.resolve(P.react(el,rows,layout,plotlyConfig(state.sourceConfig||{}))).then(result=>{renderPlotLegend(el,state);installPlotNavigation(el,state);return result;});}
  function installDisplayScale(el){
    if(!el)return;const state=displayState(el);if(state.handler)return;
    state.handler=event=>{const axis=String(state.axis||'y'),hit=axis==='z'?isColorScaleInteraction(el,event):isYAxisInteraction(el,event);if(!hit||!toggleableAxisType(state.baseType))return;event.preventDefault?.();event.stopPropagation?.();event.stopImmediatePropagation?.();state.mode=(String(state.mode||state.baseType).toLowerCase()==='log')?'linear':'log';const P=plotly();const done=P?.react?renderDisplay(el,P,state):ensurePlotly({reason:'display-scale'}).then(next=>renderDisplay(el,next,state));Promise.resolve(done).then(()=>{try{el.dispatchEvent(new CustomEvent('dkds:display-scale-changed',{detail:{axis,type:state.mode}}));}catch{}}).catch(()=>{});};
    el.addEventListener?.('dblclick',state.handler,true);
  }
  function displayScaleState(target){const el=element(target)||target,state=el?displayScaleStates.get(el):null;return state?{axis:String(state.axis||'y'),type:String(state.mode||state.baseType||'linear'),baseType:String(state.baseType||'linear')}:null;}
  function adoptDisplayScale(target,data=null,layout=null,config=null){const el=element(target)||target;if(!el)return null;const state=displayState(el);state.sourceData=themeData(data||el.data||[]);state.sourceLayout=themeLayout(layout||el.layout||{});state.sourceConfig=normalizeConfig(config||el._context||{});const nextAxis=displayAxisFor(state.sourceData,state.sourceLayout)||'y';if(state.axis!==nextAxis)state.mode=null;state.axis=nextAxis;state.baseType=state.axis==='z'?'linear':axisType(state.sourceLayout);if(state.mode&&!toggleableAxisType(state.baseType))state.mode=null;installDisplayScale(el);if(el?.dataset){el.dataset.dkdsDisplayAxis=state.axis;el.dataset[state.axis==='z'?'dkdsZScale':'dkdsYScale']=String(state.mode||state.baseType||'linear');}return displayScaleState(el);}
  function toggleDisplayScale(target,requestedAxis=''){const el=element(target)||target;if(!el)return Promise.resolve(false);const state=displayState(el),axis=String(requestedAxis||state.axis||'y');if(requestedAxis&&axis!==String(state.axis||'y'))return Promise.resolve(false);if(!toggleableAxisType(state.baseType))return Promise.resolve(false);state.mode=(String(state.mode||state.baseType).toLowerCase()==='log')?'linear':'log';const run=P=>renderDisplay(el,P,state).then(()=>{try{el.dispatchEvent(new CustomEvent('dkds:display-scale-changed',{detail:{axis,type:state.mode}}));}catch{}return state.mode;});const P=plotly();return P?.react?run(P):ensurePlotly({reason:'display-scale'}).then(run);}
  function toggleYAxisDisplay(target){return toggleDisplayScale(target,'y');}
  function react(target,data=[],layout={},config={}){const el=element(target)||target,rows=themeData(data),cfg=normalizeConfig(config);if(el)legendBaseLayouts.set(el,cloneLayout(layout||{}));const smartLayout=smartLegendLayout(el,rows,layout),themedLayout=themeLayout(smartLayout),state=displayState(el);state.sourceData=rows;state.sourceLayout=themedLayout;state.sourceConfig=cfg;const nextAxis=displayAxisFor(rows,themedLayout)||'y';if(state.axis!==nextAxis)state.mode=null;state.axis=nextAxis;state.baseType=state.axis==='z'?'linear':axisType(themedLayout);if(state.mode&&!toggleableAxisType(state.baseType))state.mode=null;installDisplayScale(el);const P=plotly();if(P?.react)return renderDisplay(el,P,state);return ensurePlotly({reason:'react'}).then(next=>renderDisplay(el,next,state));}
  function restyle(target,update,traces){const el=element(target)||target;const P=plotly();return P?.restyle?P.restyle(el,update,traces):ensurePlotly({reason:'restyle'}).then(next=>next.restyle(el,update,traces));}
  function relayout(target,update){const el=element(target)||target;const P=plotly();return P?.relayout?P.relayout(el,update):ensurePlotly({reason:'relayout'}).then(next=>next.relayout(el,update));}
  function resize(target){const el=element(target),P=plotly();if(!el||el.offsetParent===null||!P?.Plots?.resize)return false;try{P.Plots.resize(el);const base=legendBaseLayouts.get(el),state=displayScaleStates.get(el);if(base&&state?.sourceData?.length){const previous=legendLayoutStates.get(el)||{},rect=el.getBoundingClientRect?.()||{},dw=Math.abs((previous.containerWidth||0)-(Number(rect.width)||0)),dh=Math.abs((previous.containerHeight||0)-(Number(rect.height)||0));if(previous.enabled&&dw<12&&dh<12){renderPlotLegend(el,state);positionPlotNavigation(el,state);return true;}const smart=smartLegendLayout(el,state.sourceData,base),next=themeLayout(smart),current=legendLayoutStates.get(el)||{},changed=previous.placement!==current.placement||Math.abs((previous.reserve||0)-(current.reserve||0))>2||previous.rows!==current.rows;if(changed){const pending=legendResizeFrames.get(el);if(pending){const cancel=globalThis.cancelAnimationFrame||clearTimeout;try{cancel(pending);}catch{}}const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));legendResizeFrames.set(el,raf(()=>{legendResizeFrames.delete(el);if(!el.isConnected)return;state.sourceLayout=next;const logical=displayLayout(next,String(state.mode||state.baseType||'linear').toLowerCase(),String(state.axis||'y'));Promise.resolve(P.relayout(el,{showlegend:plotlyRenderLayout(el,logical).showlegend,margin:logical.margin,legend:logical.legend})).then(()=>{renderPlotLegend(el,state);positionPlotNavigation(el,state);}).catch(()=>{});}));}else{state.sourceLayout=next;renderPlotLegend(el,state);positionPlotNavigation(el,state);}}return true;}catch{return false;}}
  function purge(target){const el=element(target);if(!el||!plotly()?.purge)return false;const state=displayScaleStates.get(el);if(state?.handler)try{el.removeEventListener?.('dblclick',state.handler,true);}catch{}plotNavigationStates.get(el)?.tools?.remove?.();plotNavigationStates.delete(el);plotLegendStates.get(el)?.host?.remove?.();plotLegendStates.delete(el);displayScaleStates.delete(el);legendLayoutStates.delete(el);legendBaseLayouts.delete(el);const legendFrame=legendResizeFrames.get(el);if(legendFrame){const cancel=globalThis.cancelAnimationFrame||clearTimeout;try{cancel(legendFrame);}catch{}legendResizeFrames.delete(el);}try{plotly().purge(el);return true;}catch{return false;}}
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
      react,restyle,relayout,resize,purge,toImage,saveImage,themeLayout,themeData,normalizeConfig,legendMetrics,displayScaleState,adoptDisplayScale,toggleDisplayScale,toggleYAxisDisplay,tooltipTheme:TOOLTIP_THEME,
      bind:(target,event,handler,options)=>bind(id,target,event,handler,options),
      symbols:Object.freeze({type:d3Symbol,path:symbolPath}),
      raw:Object.freeze({get plotly(){return plotly();},get d3(){return window.d3;}})
    });
  }
  function refreshRenderedTheme(){
    const P=plotly();if(!P?.relayout||typeof document==='undefined')return;
    const theme=plotTheme();
    document.querySelectorAll('.js-plotly-plot').forEach(el=>{
      const layout=el?.layout||{};const patch={paper_bgcolor:theme.paper,plot_bgcolor:theme.plot,'font.color':theme.text,'modebar.bgcolor':'rgba(0,0,0,0)','modebar.color':theme.muted,'modebar.activecolor':theme.text};
      for(const key of Object.keys(layout)){
        if(!/^[xy]axis\d*$/.test(key))continue;
        patch[`${key}.gridcolor`]=theme.grid;patch[`${key}.zerolinecolor`]=theme.zero;patch[`${key}.linecolor`]=theme.axis;patch[`${key}.tickcolor`]=theme.axis;patch[`${key}.tickfont.color`]=theme.muted;patch[`${key}.title.font.color`]=theme.text;
      }
      if(layout.legend){patch['legend.bordercolor']=theme.legend;patch['legend.font.color']=theme.text;}
      Promise.resolve(P.relayout(el,patch)).catch(()=>{});
    });
  }
  try{globalThis.addEventListener?.('dkds:theme-changed',()=>queueMicrotask(refreshRenderedTheme));}catch{}
  function disposeOwner(owner){const id=String(owner||'');for(const off of [...(ownerBindings.get(id)||[])])try{off();}catch{}ownerBindings.delete(id);}
  window.DKDSCharts=Object.freeze({VERSION,configureRuntime,runtimeState,ensurePlotly,createScope,disposeOwner,element,react,restyle,relayout,resize,purge,bind,toImage,saveImage,themeLayout,themeData,normalizeConfig,legendMetrics,displayScaleState,adoptDisplayScale,toggleDisplayScale,toggleYAxisDisplay,tooltipTheme:TOOLTIP_THEME,symbols:Object.freeze({type:d3Symbol,path:symbolPath})});
})();
