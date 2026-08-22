(() => {
  const manifest={
    id:'com.dkds.transfer-vth-lab',name:'Transfer Curve Vth Lab',version:'3.0.1',apiVersion:'1.15.0',entry:'plugin.js',scripts:['plugin.js'],styles:['plugin.css'],enabled:true,order:420,
    description:'Threshold-voltage extraction TOP workbench using scoped project sources, Core-owned import and bounded ScientificPlot layout.',pluginType:'workbench',
    requiresCore:['events','status','state','project','workspace','data.model','data.types','data.sources','data.artifacts','analysis.algorithms','ui.dom','ui.workspace','ui.scientific-plot','ui.table','ui.settings','ui.actions','ui.interaction-behavior','ui.activities','ui.top-workspace','ui.pages'],
    capabilities:['analysis.threshold-voltage','ui.page','ui.analysis-workbench','ui.interaction-behavior','ui.scientific-plot','ui.batch-results','data.scoped-sources','ui.top-workspace'],
    workspace:{role:'top',activity:'transfer-vth-lab',icon:'Vₜ',title:'Vth 工作台'},
    window:{activity:'transfer-vth-lab',title:'Vth 工作台',width:1420,height:900,minWidth:900,minHeight:620,dependencies:['d3','data-model'],prewarm:false,reuse:true,persistence:'project',artifactHydration:'live'},
    data:{accepts:['science.transport.iv','science.transport.transfer']},algorithmProvider:true,algorithmCategories:['transfer-curve'],
    algorithmProvides:[{category:'transfer-curve',id:'transfer.vth-constant-current',version:'2.0.0',title:'Threshold voltage by constant-current neighborhood'}],
    compatibility:{app:'>=3.61.18 <4.0.0',pluginApi:'^1.15.0'}
  };
  DKDSPlugins.define(manifest, async ctx => {
    const finite=v=>Number.isFinite(Number(v));
    const num=(v,f=NaN)=>finite(v)?Number(v):f;
    const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
    const escape=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const defaults=()=>({method:'linear-window',branch:'auto',targetCurrent:4e-10,lowCurrent:2e-10,highCurrent:2e-9,absoluteCurrent:true,logY:true,showAllCurves:true});

    function pointsOfArtifact(artifact){
      if(!artifact)return [];
      if(artifact.kind==='data.table'){
        const columns=Array.isArray(artifact.columns)?artifact.columns:[];
        const x=columns.find(c=>c.role==='x')||columns.find(c=>/^(vg|gate|gate.?voltage|voltage|vd|x)$/i.test(String(c.key||c.name||'')))||columns[0];
        const y=columns.find(c=>c.role==='y')||columns.find(c=>/^(id|drain.?current|current|i|y)$/i.test(String(c.key||c.name||'')))||columns[1];
        if(!x||!y)return [];
        const n=Math.min(x.values?.length||0,y.values?.length||0),out=[];
        for(let i=0;i<n;i++){const xv=num(x.values[i]),yv=num(y.values[i]);if(finite(xv)&&finite(yv))out.push({x:xv,y:yv,index:i});}
        return out;
      }
      const xs=artifact.x||artifact.voltage||artifact.vg,ys=artifact.y||artifact.current||artifact.id;
      if(Array.isArray(xs)&&Array.isArray(ys)){const out=[];for(let i=0;i<Math.min(xs.length,ys.length);i++){const x=num(xs[i]),y=num(ys[i]);if(finite(x)&&finite(y))out.push({x,y,index:i});}return out;}
      return [];
    }
    function findTurn(points){let direction=0,opposite=0;for(let i=1;i<points.length;i++){const dx=points[i].x-points[i-1].x;if(Math.abs(dx)<1e-15)continue;const sign=Math.sign(dx);if(!direction){direction=sign;continue;}if(sign===-direction)opposite++;else opposite=0;if(opposite>=2)return Math.max(1,i-opposite);}return -1;}
    function branches(points){const turn=findTurn(points);if(turn<1||turn>=points.length-2)return[{id:'single',label:'单扫描',points}];return[{id:'first',label:'第一扫描段',points:points.slice(0,turn+1)},{id:'second',label:'第二扫描段',points:points.slice(turn)}];}
    function regress(rows){const n=rows.length;if(n<2)return null;let sx=0,sy=0,sxx=0,sxy=0;for(const p of rows){sx+=p.x;sy+=p.current;sxx+=p.x*p.x;sxy+=p.x*p.current;}const den=n*sxx-sx*sx;if(Math.abs(den)<1e-30)return null;const slope=(n*sxy-sx*sy)/den,intercept=(sy-slope*sx)/n,mean=sy/n;let ssTot=0,ssRes=0;for(const p of rows){const predicted=slope*p.x+intercept;ssTot+=(p.current-mean)**2;ssRes+=(p.current-predicted)**2;}return{slope,intercept,r2:ssTot>0?1-ssRes/ssTot:1,n};}
    function analyzeSegment(segment,p,manualWindow=null){
      const target=num(p.targetCurrent),low=num(p.lowCurrent),high=num(p.highCurrent),useAbs=p.absoluteCurrent!==false;
      if(!finite(target)||(useAbs&&target<=0))return{ok:false,status:'目标电流无效',branch:segment.label};
      let rows=segment.points.map(q=>({...q,current:useAbs?Math.abs(q.y):q.y})).filter(q=>finite(q.current));
      if(Array.isArray(manualWindow)&&manualWindow.length>=2){const a=Math.min(num(manualWindow[0]),num(manualWindow[1])),b=Math.max(num(manualWindow[0]),num(manualWindow[1]));if(finite(a)&&finite(b))rows=rows.filter(q=>q.x>=a&&q.x<=b);}
      if(p.method==='interpolation'){
        for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i],da=a.current-target,db=b.current-target;if(da===0)return{ok:true,method:'interpolation',vth:a.x,n:1,r2:null,branch:segment.label,branchId:segment.id,targetCurrent:target,fitWindow:[a.x,a.x],fitPoints:[a],status:'完成'};if(da*db<=0&&b.current!==a.current){const v=a.x+(target-a.current)*(b.x-a.x)/(b.current-a.current);return{ok:true,method:'interpolation',vth:v,n:2,r2:null,branch:segment.label,branchId:segment.id,targetCurrent:target,fitWindow:[Math.min(a.x,b.x),Math.max(a.x,b.x)],fitPoints:[a,b],status:'完成'};}}
        return{ok:false,status:'目标电流未被扫描段跨越',branch:segment.label,n:rows.length};
      }
      if(!finite(low)||!finite(high)||low>=high)return{ok:false,status:'拟合电流范围无效',branch:segment.label};
      const selected=rows.filter(q=>q.current>=low&&q.current<=high),fit=regress(selected);if(!fit||Math.abs(fit.slope)<1e-30)return{ok:false,status:'拟合区间有效点不足',branch:segment.label,n:selected.length};
      const vth=(target-fit.intercept)/fit.slope;if(!finite(vth))return{ok:false,status:'无法计算 Vth',branch:segment.label,n:selected.length};const xs=selected.map(q=>q.x);
      return{ok:true,method:'linear-window',vth,n:fit.n,r2:fit.r2,slope:fit.slope,intercept:fit.intercept,branch:segment.label,branchId:segment.id,targetCurrent:target,fitWindow:[Math.min(...xs),Math.max(...xs)],fitPoints:selected,status:'完成'};
    }
    function analyzeCurve(curve,p,manualWindow=null){const segs=branches(curve.points);if(p.branch==='all'||segs.length===1)return analyzeSegment({id:'all',label:segs.length===1?'单扫描':'全部数据',points:curve.points},p,manualWindow);if(p.branch==='first')return analyzeSegment(segs[0],p,manualWindow);if(p.branch==='second')return analyzeSegment(segs[1]||segs[0],p,manualWindow);const results=segs.map(seg=>analyzeSegment(seg,p,manualWindow)),valid=results.filter(r=>r.ok);if(!valid.length)return results[0]||{ok:false,status:'无有效扫描段'};if(p.method==='linear-window')valid.sort((a,b)=>(num(b.r2,-Infinity)-num(a.r2,-Infinity))||(b.n-a.n));return valid[0];}

    ctx.analysis.algorithms.register('transfer.vth-constant-current',{version:'2.0.0',category:'transfer-curve',title:'Threshold voltage by constant-current neighborhood',default:true,parameterSchema:{fields:[{id:'method',type:'select',label:'方法',default:'linear-window',options:['linear-window','interpolation']},{id:'branch',type:'select',label:'扫描段',default:'auto',options:['auto','first','second','all']},{id:'targetCurrent',type:'number',label:'目标电流 / A',default:4e-10},{id:'lowCurrent',type:'number',label:'拟合下限 / A',default:2e-10},{id:'highCurrent',type:'number',label:'拟合上限 / A',default:2e-9},{id:'absoluteCurrent',type:'boolean',label:'使用 |I|',default:true}]},run(input,{parameters={},manualWindow=null}={}){const curve={points:Array.isArray(input?.points)?input.points:pointsOfArtifact(input)};return analyzeCurve(curve,{...defaults(),...parameters},manualWindow);}});
    ctx.data.types.register('analysis.threshold-voltage',{title:'Threshold-voltage extraction result',parents:['result.analysis'],kind:'result',key:v=>v?.curveId?`${v.curveId}:${v.method||'vth'}`:undefined});

    const settings=ctx.ui.settings.define('defaults',{title:'Vth 工作台默认设置',defaults:defaults(),fields:[{id:'method',label:'默认方法',type:'select',options:['linear-window','interpolation']},{id:'branch',label:'默认扫描段',type:'select',options:['auto','first','second','all']},{id:'targetCurrent',label:'默认目标电流 / A',type:'number'},{id:'lowCurrent',label:'默认拟合下限 / A',type:'number'},{id:'highCurrent',label:'默认拟合上限 / A',type:'number'},{id:'absoluteCurrent',label:'默认使用 |I|',type:'boolean'},{id:'logY',label:'默认对数显示',type:'boolean'},{id:'showAllCurves',label:'默认显示全部曲线',type:'boolean'}]});
    const initial={schema:3,parameters:{...defaults(),...(settings.get()||{})},selectedCurveId:null,manualWindows:{},view:null};
    const state=ctx.state.create(initial);
    ctx.project.registerSlice('workspace',{serialize:()=>clone(state.get()),restore:data=>{if(!data||typeof data!=='object')return;state.set({...initial,...data,parameters:{...initial.parameters,...(data.parameters||{})},manualWindows:data.manualWindows&&typeof data.manualWindows==='object'?data.manualWindows:{}});},reset:()=>state.set(clone(initial))});

    let curves=[],sourceMode='empty',workbench=null,plotSurface=null,tableSurface=null,root=null,main=null,left=null,plotTarget=null,controls={},metrics={};
    function demoCurve(){const points=[];for(const [a,b,shift,label] of [[-2,2,0,'first'],[2,-2,.14,'second']])for(let i=0;i<100;i++){const x=a+(b-a)*i/99,center=.42+shift,current=2e-12+1.3e-9*Math.exp((x-center)*3.4);points.push({x,y:Math.min(current,8e-8),segment:label});}return{id:'demo-transfer',name:'示例 · 双向转移曲线',points,artifactId:'',source:{kind:'demo'}};}
    function sourceDescriptors(){const rows=ctx.data.sources.list();return Array.isArray(rows)?rows:[];}
    function loadAssignedCurves(){const out=[];for(const descriptor of sourceDescriptors()){if(descriptor?.excluded)continue;const artifact=ctx.data.artifacts.get(descriptor.artifactId);const points=pointsOfArtifact(artifact);if(points.length>=2)out.push({id:String(artifact?.id||descriptor.artifactId),artifactId:String(descriptor.artifactId||artifact?.id||''),name:String(descriptor.name||artifact?.name||descriptor.artifactId),points,source:descriptor});}return out;}
    function selected(){const id=state.get().selectedCurveId;return curves.find(c=>c.id===id)||curves[0]||null;}
    function resultFor(curve){if(!curve)return null;return analyzeCurve(curve,state.get().parameters,state.get().manualWindows?.[curve.id]||null);}
    function currentResult(){return resultFor(selected());}
    function displayY(v){const p=state.get().parameters,raw=Number(v);return p.absoluteCurrent!==false?Math.abs(raw):raw;}
    function inverseDisplayY(v){return Number(v);}
    function yTitle(){const p=state.get().parameters;return p.absoluteCurrent!==false?'|I| (A)':'I (A)';}
    function fmt(v,d=5){if(!finite(v))return'—';const n=Number(v),a=Math.abs(n);return a&&((a>=1e4)||(a<1e-3))?n.toExponential(Math.max(2,d-1)):n.toPrecision(d);}
    function plotCurves(){const active=selected(),p=state.get().parameters,rows=p.showAllCurves?curves:(active?[active]:[]);const traces=rows.map(c=>({id:`data:${c.id}`,entityId:c.id,points:c.points,strokeWidth:c.id===active?.id?2.3:1.2,opacity:c.id===active?.id?1:.32,source:{curveId:c.id,role:'data'}}));const r=currentResult();if(active&&r?.ok&&r.method==='linear-window'&&finite(r.slope)&&finite(r.intercept)&&r.fitWindow){const [a,b]=r.fitWindow;traces.push({id:'fit-line',points:[{x:a,y:r.slope*a+r.intercept},{x:b,y:r.slope*b+r.intercept}],dash:'7 4',strokeWidth:2,source:{role:'fit'}});}return traces;}
    function plotManipulators(){const curve=selected(),r=currentResult();if(!curve||!r?.ok)return[];const out=[];if(r.fitWindow)out.push({id:'fit-window',kind:'range',axis:'x',geometry:{start:r.fitWindow[0],end:r.fitWindow[1]},constraints:{minSpan:1e-12},presentation:{band:true}});if(finite(r.targetCurrent))out.push({id:'target-current',kind:'axis',axis:'y',geometry:{value:displayY(r.targetCurrent)}});return out;}
    function patchParameters(patch,reason='parameters'){const before=state.get().parameters,parameters={...before,...patch};if(parameters.absoluteCurrent===false)parameters.logY=false;const scaleChanged=parameters.logY!==before.logY||parameters.absoluteCurrent!==before.absoluteCurrent;state.patch({parameters});if(scaleChanged&&plotTarget)createPlotSurface();renderAll(reason);ctx.project.capture();}
    function applyManualWindow(window){const curve=selected();if(!curve||!Array.isArray(window)||window.length<2)return;const a=num(window[0]),b=num(window[1]);if(!finite(a)||!finite(b))return;state.patch({manualWindows:{...state.get().manualWindows,[curve.id]:[Math.min(a,b),Math.max(a,b)]}});renderAll('fit-window');ctx.project.capture();}
    function refreshSources({announce=false,keepDemo=false}={}){const loaded=loadAssignedCurves();if(loaded.length){curves=loaded;sourceMode='project';const saved=state.get().selectedCurveId;state.patch({selectedCurveId:curves.some(c=>c.id===saved)?saved:curves[0].id});if(announce)ctx.status.set(`Vth 工作台已同步 ${curves.length} 条已分配转移曲线`);}else if(!keepDemo){curves=[];sourceMode='empty';state.patch({selectedCurveId:null});if(announce)ctx.status.set('当前 Vth 工作台没有已分配数据；请使用顶部“导入数据”。');}renderAll('sources');return loaded.length;}
    function loadDemo(){curves=[demoCurve()];sourceMode='demo';state.patch({selectedCurveId:curves[0].id,manualWindows:{}});renderAll('demo');ctx.status.set('已载入 Vth 示例双向转移曲线');}
    function renderControls(){if(!controls.curve)return;const active=selected();controls.curve.innerHTML=curves.length?curves.map(c=>`<option value="${escape(c.id)}">${escape(c.name)}</option>`).join(''):'<option value="">未分配数据</option>';controls.curve.value=active?.id||'';const p=state.get().parameters;for(const [key,el] of Object.entries(controls)){if(!el||key==='curve')continue;if(el.type==='checkbox')el.checked=!!p[key];else if(Object.prototype.hasOwnProperty.call(p,key))el.value=String(p[key]);}const badge=root?.querySelector('[data-vth="source-badge"]');if(badge)badge.textContent=sourceMode==='project'?`${curves.length} 组工程数据`:sourceMode==='demo'?'示例数据':'等待导入';}
    function renderMetrics(){const r=currentResult(),curve=selected();metrics.vth.textContent=r?.ok?`${fmt(r.vth,7)} V`:'—';metrics.branch.textContent=r?.branch||'—';metrics.r2.textContent=r?.ok&&finite(r.r2)?Number(r.r2).toFixed(6):(r?.method==='interpolation'?'插值':'—');metrics.n.textContent=r?.n!=null?String(r.n):'—';const title=root?.querySelector('[data-vth="plot-title"]');if(title)title.textContent=curve?.name||'转移曲线';const status=root?.querySelector('[data-vth="plot-status"]');if(status)status.textContent=r?(r.ok?`${r.method==='linear-window'?'线性回归':'插值'} · ${r.status}`:r.status):'未加载数据';}
    function renderTable(){if(!tableSurface)return;const rows=curves.map(c=>{const r=resultFor(c);return{curve:c.name,branch:r?.branch||'',vth:r?.ok?fmt(r.vth,8):'—',r2:r?.ok&&finite(r.r2)?Number(r.r2).toFixed(6):'',n:r?.n??'',status:r?.status||''};});tableSurface.setData([{key:'curve',label:'曲线'},{key:'branch',label:'扫描段'},{key:'vth',label:'Vth / V'},{key:'r2',label:'R²'},{key:'n',label:'N'},{key:'status',label:'状态'}],rows);}
    function renderPlot(reason='render'){if(!plotSurface||!plotTarget)return;plotSurface.requestRender(reason);}
    function renderAll(reason='render'){if(!root)return;renderControls();renderMetrics();renderTable();renderPlot(reason);}

    ctx.commands.register('com.dkds.transfer-vth-lab.refresh',()=>refreshSources({announce:true}));
    ctx.commands.register('com.dkds.transfer-vth-lab.demo',()=>loadDemo());
    ctx.commands.register('com.dkds.transfer-vth-lab.fit-view',()=>plotSurface?.fitToData?.({source:'vth-command'})??false);
    ctx.commands.register('com.dkds.transfer-vth-lab.reset-window',()=>{const c=selected();if(!c)return false;const next={...state.get().manualWindows};delete next[c.id];state.patch({manualWindows:next});renderAll('reset-window');ctx.project.capture();return true;});
    ctx.ui.interactionBehaviors.create('transfer-vth-lab-keys',{activity:'transfer-vth-lab',bindings:[{gesture:'key',target:'keyboard',chord:'Ctrl+R',command:'com.dkds.transfer-vth-lab.refresh'},{gesture:'key',target:'keyboard',chord:'Ctrl+0',command:'com.dkds.transfer-vth-lab.fit-view'},{gesture:'key',target:'keyboard',chord:'Ctrl+Shift+R',command:'com.dkds.transfer-vth-lab.reset-window'}]});

    ctx.ui.activities.add({id:'transfer-vth-lab',label:'Vth 工作台',contextLabel:'Vth 工作台',icon:'Vₜ',order:50,primary:true,openMode:'window',artifactHydration:'live',description:'转移曲线阈值电压提取',onActivate:()=>{ctx.workspace.openPage('transferVthLabPage');refreshSources({announce:false,keepDemo:true});}});
    const page=ctx.ui.pages.add({id:'transfer-vth-lab-page',pageId:'transferVthLabPage',label:'Vth 工作台',title:'Transfer Curve Vth Lab',order:50,toolbar:false,activity:'transfer-vth-lab',className:'transfer-vth-lab-page',html:'<div class="analysis-page-header"><div><h2>Vth 工作台</h2><div class="analysis-subtitle">恒流邻域 Vth · 双向扫描 · 交互拟合窗口</div></div><div data-dkds-slot="workbench-import"></div><div class="dkds-plugin-header-actions" data-vth="header-actions"></div><button type="button" class="analysis-page-close">关闭窗口</button></div><div class="analysis-page-body dkds-vth-page-body"><div class="dkds-vth-workbench" data-vth="workbench"></div></div>'});
    const host=ctx.ui.dom.query('[data-vth="workbench"]',page);
    workbench=ctx.ui.pluginWorkspace.create(host,{header:false,activity:'transfer-vth-lab',primaryScroll:'contained',canvasLeftWidth:300});
    left=ctx.ui.dom.create('div',{className:'dkds-vth-sidebar'});main=ctx.ui.dom.create('div',{className:'dkds-vth-main'});
    left.innerHTML=`<section class="dkds-vth-card"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><h3>数据</h3><span class="dkds-vth-source-badge" data-vth="source-badge">—</span></div><div class="dkds-vth-field"><label>当前曲线</label><select data-vth="curve"></select></div><p class="dkds-vth-hint">数据导入由 Core 统一提供；这里只显示分配给 Vth 工作台的数据。</p><div style="display:flex;gap:6px;margin-top:8px"><button type="button" data-vth="refresh">刷新</button><button type="button" data-vth="demo">示例</button></div></section><section class="dkds-vth-card"><h3>阈值提取</h3><div class="dkds-vth-field"><label>方法</label><select data-vth="method"><option value="linear-window">恒流邻域线性回归</option><option value="interpolation">恒流插值</option></select></div><div class="dkds-vth-field"><label>扫描段</label><select data-vth="branch"><option value="auto">自动</option><option value="first">第一扫描段</option><option value="second">第二扫描段</option><option value="all">全部数据</option></select></div><div class="dkds-vth-field"><label>目标电流 / A</label><input data-vth="targetCurrent" type="number" step="any"></div><div class="dkds-vth-field"><label>拟合下限 / A</label><input data-vth="lowCurrent" type="number" step="any"></div><div class="dkds-vth-field"><label>拟合上限 / A</label><input data-vth="highCurrent" type="number" step="any"></div><label class="dkds-vth-check"><input data-vth="absoluteCurrent" type="checkbox">使用 |I|</label><label class="dkds-vth-check"><input data-vth="logY" type="checkbox">对数显示</label><label class="dkds-vth-check"><input data-vth="showAllCurves" type="checkbox">显示全部曲线</label></section>`;
    main.innerHTML=`<div class="dkds-vth-metrics"><div class="dkds-vth-metric"><span>Vth</span><strong data-vth="metric-vth">—</strong></div><div class="dkds-vth-metric"><span>扫描段</span><strong data-vth="metric-branch">—</strong></div><div class="dkds-vth-metric"><span>R²</span><strong data-vth="metric-r2">—</strong></div><div class="dkds-vth-metric"><span>拟合点数</span><strong data-vth="metric-n">—</strong></div></div><section class="dkds-vth-plot-card"><div class="dkds-vth-plot-head"><strong data-vth="plot-title">转移曲线</strong><span data-vth="plot-status">未加载数据</span></div><div class="dkds-vth-plot-target" data-vth="plot"></div></section><section class="dkds-vth-results"><table data-vth="results"><thead></thead><tbody></tbody></table></section>`;
    workbench.mountPrimary({id:'vth-main',label:'Vth 分析',scroll:'contained',leftNode:left,mainNode:main});
    root=workbench.shell||host;plotTarget=main.querySelector('[data-vth="plot"]');
    controls={curve:left.querySelector('[data-vth="curve"]'),method:left.querySelector('[data-vth="method"]'),branch:left.querySelector('[data-vth="branch"]'),targetCurrent:left.querySelector('[data-vth="targetCurrent"]'),lowCurrent:left.querySelector('[data-vth="lowCurrent"]'),highCurrent:left.querySelector('[data-vth="highCurrent"]'),absoluteCurrent:left.querySelector('[data-vth="absoluteCurrent"]'),logY:left.querySelector('[data-vth="logY"]'),showAllCurves:left.querySelector('[data-vth="showAllCurves"]')};
    metrics={vth:main.querySelector('[data-vth="metric-vth"]'),branch:main.querySelector('[data-vth="metric-branch"]'),r2:main.querySelector('[data-vth="metric-r2"]'),n:main.querySelector('[data-vth="metric-n"]')};
    tableSurface=ctx.ui.tables.bind('vth-results',main.querySelector('[data-vth="results"]'),{persistKey:'transfer-vth-results'});
    function createPlotSurface(){
      plotSurface?.dispose?.();
      plotSurface=null;
      if(!plotTarget)return null;
      plotSurface=ctx.ui.scientificPlot.create(plotTarget,{minHeight:0,xTitle:'Gate voltage (V)',yTitle:yTitle(),yScaleType:(state.get().parameters.logY&&state.get().parameters.absoluteCurrent!==false)?'log':'linear',xValue:p=>num(p?.x),yValue:p=>displayY(p?.y),navigationTools:true,source:'transfer-vth-lab',renderPriority:'frame',interactionBehavior:{activity:'transfer-vth-lab',bindings:[{gesture:'box',target:'background',modifiers:['shift'],intent:'select-region',priority:30},{gesture:'box',target:'background',modifiers:['ctrl'],intent:'zoom-box',priority:20}]},getCurves:()=>plotCurves(),getMarkers:()=>[],getManipulators:()=>plotManipulators(),getView:()=>state.get().view||{},setView:view=>state.patch({view}),showMarkers:()=>true,onCurveSelect:payload=>{const id=payload?.curve?.source?.curveId||payload?.curve?.entityId||String(payload?.curve?.id||'').replace(/^data:/,'');if(id&&curves.some(c=>c.id===id)){state.patch({selectedCurveId:id});renderAll('curve-select');ctx.project.capture();}},onManipulationCommit:payload=>{if(payload?.manipulator?.id==='fit-window'){const g=payload.geometry||{};applyManualWindow([g.start,g.end]);}else if(payload?.manipulator?.id==='target-current'){const value=inverseDisplayY(payload?.geometry?.value);if(finite(value))patchParameters({targetCurrent:value},'target-current');}},onManipulationReset:payload=>{if(payload?.manipulator?.id==='fit-window')ctx.commands.run('com.dkds.transfer-vth-lab.reset-window');},onRangeSelect:payload=>{const values=[payload?.x0,payload?.x1,payload?.range?.x0,payload?.range?.x1,payload?.range?.[0],payload?.range?.[1]].filter(finite).map(Number);if(values.length>=2)applyManualWindow([values[0],values[1]]);},onReset:()=>state.patch({view:null})});
      return plotSurface;
    }
    createPlotSurface();

    controls.curve.addEventListener('change',()=>{state.patch({selectedCurveId:controls.curve.value||null});renderAll('curve');ctx.project.capture();});
    for(const key of ['method','branch'])controls[key].addEventListener('change',()=>patchParameters({[key]:controls[key].value},key));
    for(const key of ['targetCurrent','lowCurrent','highCurrent'])controls[key].addEventListener('change',()=>patchParameters({[key]:num(controls[key].value,state.get().parameters[key])},key));
    for(const key of ['absoluteCurrent','logY','showAllCurves'])controls[key].addEventListener('change',()=>patchParameters({[key]:controls[key].checked},key));
    left.querySelector('[data-vth="refresh"]').addEventListener('click',()=>ctx.commands.run('com.dkds.transfer-vth-lab.refresh'));
    left.querySelector('[data-vth="demo"]').addEventListener('click',()=>ctx.commands.run('com.dkds.transfer-vth-lab.demo'));
    const actions=ctx.ui.dom.query('[data-vth="header-actions"]',page);ctx.ui.actions.mount(actions,{activity:'transfer-vth-lab',actions:[{id:'refresh',icon:'↻',label:'刷新数据',order:10,onInvoke:()=>ctx.commands.run('com.dkds.transfer-vth-lab.refresh')},{id:'fit',icon:'⌂',label:'适应视图',order:20,onInvoke:()=>ctx.commands.run('com.dkds.transfer-vth-lab.fit-view')},{id:'settings',icon:'⚙',label:'默认设置',order:30,onInvoke:()=>settings.open()}]});
    ctx.ui.topWorkspace.register({id:'transfer-vth-lab',activity:'transfer-vth-lab',label:'Vth 工作台',icon:'Vₜ',layout:{mode:'native',root:{selector:'#transferVthLabPage .dkds-plugin-workspace'},primary:{id:'vth-main',role:'analysis-primary'},prime:[],sub:[]}});

    const offArtifacts=ctx.events.on('data:artifacts-changed',()=>refreshSources({announce:false,keepDemo:true}));
    curves=loadAssignedCurves();if(curves.length){sourceMode='project';state.patch({selectedCurveId:curves[0].id});}else{curves=[demoCurve()];sourceMode='demo';state.patch({selectedCurveId:curves[0].id});}
    renderAll('initial');
    return{deactivate(){offArtifacts?.();workbench?.dispose?.();plotSurface?.dispose?.();tableSurface?.dispose?.();settings?.dispose?.();}};
  });
})();
