'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
function assert(v,m){if(!v)throw new Error(m);}
(async()=>{
  const chart=read('src/core/scientific/chart-runtime.js');
  assert(chart.includes("const VERSION='2.0.0'"),'Chart runtime must advance for corrected display-scale semantics.');
  assert(chart.includes("hasHeatmap(data)?'z'")&&chart.includes('isColorScaleInteraction'),'Heatmap display scale must target Z/colorbar rather than the coordinate Y axis.');
  assert(chart.includes('Math.log10(n)')&&chart.includes('const magnitudeZ=rawZ.map'),'Heatmap log view must project log10(|Z|) while retaining display access to original magnitudes.');
  assert(chart.includes("layout.yaxis.tickmode='linear';layout.yaxis.dtick=1"),'Scientific log Y axes must label decade ticks only.');

  let captured=null;
  const plot={nodeType:1,dataset:{},classList:{add(){},remove(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){}};
  const fakeWindow={d3:{},DKDSTheme:{subscribeRevision(){return()=>{};}},DKDSD3Renderer:{supports:()=>true,react(el,data,layout,config){captured={el,data,layout,config};el.data=data;el.layout=layout;el._context=config;el.dataset.dkdsChartRenderer='d3';return Promise.resolve(true);},restyle(){return Promise.resolve(true);},relayout(){return Promise.resolve(true);},resize(){return true;},purge(){return true;},toImage(){return Promise.resolve('');}}};
  const fakeDocument={currentScript:{src:'file:///tmp/src/core/scientific/chart-runtime.js'},getElementById:id=>id==='plot'?plot:null,querySelector:()=>null};
  const styleGate={set(_el,_prop,value){return value;},remove(){return true;}};
  const context={window:fakeWindow,document:fakeDocument,console,Promise,WeakMap,Map,Set,URL,performance:{now:()=>0},structuredClone:global.structuredClone,CustomEvent:function(){},DKDSStyleGate:styleGate};context.globalThis=context;context.DKDSTheme=fakeWindow.DKDSTheme;fakeWindow.DKDSStyleGate=styleGate;fakeWindow.window=fakeWindow;fakeWindow.document=fakeDocument;vm.createContext(context);vm.runInContext(chart,context,{filename:'chart-runtime.js'});

  const lineY=[-1e-5,-1e-6,0,1e-7];
  await fakeWindow.DKDSCharts.react('plot',[{type:'scatter',y:lineY}],{yaxis:{type:'linear'}},{});
  await fakeWindow.DKDSCharts.toggleYAxisDisplay('plot');
  assert(JSON.stringify(captured.data[0].y)===JSON.stringify([1e-5,1e-6,0,1e-7]),'Line log view must use |Y| only for rendering.');
  assert(captured.layout.yaxis.type==='log'&&captured.layout.yaxis.dtick===1,'Line log Y axis must use one labeled tick per decade.');
  assert(JSON.stringify(lineY)===JSON.stringify([-1e-5,-1e-6,0,1e-7]),'Line source values must remain signed and unchanged.');

  const heatY=[10,20,30],heatZ=[[-100,-10,0],[1,10,100],[1000,10000,100000]];
  await fakeWindow.DKDSCharts.react('plot',[{type:'heatmap',y:heatY,z:heatZ,hovertemplate:'Vg=%{y}<br>Z=%{z:.4g}<extra></extra>'}],{yaxis:{type:'linear'}},{});
  assert(fakeWindow.DKDSCharts.displayScaleState('plot').axis==='z','Heatmap must expose Z as its display-scale axis.');
  await fakeWindow.DKDSCharts.toggleDisplayScale('plot');
  assert(JSON.stringify(captured.data[0].y)===JSON.stringify(heatY),'Heatmap log display must never transform coordinate Y values.');
  assert(captured.layout.yaxis.type==='linear','Heatmap log display must leave the coordinate Y axis linear.');
  assert(captured.data[0].z[0][0]===2&&captured.data[0].z[0][1]===1&&captured.data[0].z[0][2]===null,'Heatmap Z display must be log10(|Z|), with zero hidden only in the view.');
  assert(captured.data[0].customdata[0][0]===100&&captured.data[0].hovertemplate.includes('%{customdata:.4g}'),'Heatmap hover must report original |Z| magnitude instead of the logarithm exponent.');
  assert(JSON.stringify(heatZ)===JSON.stringify([[-100,-10,0],[1,10,100],[1000,10000,100000]]),'Heatmap source Z matrix must not be mutated.');

  const projectFormat=require('../src/core/project/format.js');
  require('../src/project-importers/compatibility-gateway.js').register(projectFormat);
  const historical=projectFormat.canonicalizeProject({
    format:'graphene-resonance-studio-project',schemaVersion:1,version:'3.17.0',
    datasets:[{name:'VG=0',path:'historical://VG=0',text:'V,I\n0,1e-9\n1,2e-9',vg:0,points:[{v:0,i:1e-9,index:0},{v:1,i:2e-9,index:1}]}]
  });
  assert(historical.schemaVersion===3&&!Object.prototype.hasOwnProperty.call(historical,'datasets'),'Historical project must cross the Compatibility Gateway into Schema v3 only once.');
  assert(historical.dataModel?.artifacts?.length===1&&historical.dataModel.artifacts[0].kind==='data.table','Historical source data must be materialized as a canonical DataTable.');
  const dataContext={window:{},console,Date,Math,JSON,Map,Set,WeakMap,structuredClone:global.structuredClone,crypto:global.crypto};dataContext.globalThis=dataContext;dataContext.window.window=dataContext.window;vm.createContext(dataContext);vm.runInContext(read('src/core/data/model.js'),dataContext,{filename:'data-model.js'});
  const D=dataContext.window.DKDSData,ownerStore=D.restoreStore(historical.dataModel),liveSnapshot=ownerStore.list({includeTransient:true});
  assert(liveSnapshot.length===1&&liveSnapshot[0].kind==='data.table'&&liveSnapshot[0].transient===false,'Owner live store must restore the canonical persisted source directly.');
  const dataCenterStore=D.restoreStore({schema:2,artifacts:liveSnapshot});assert(dataCenterStore.list({includeTransient:true}).length===1,'Data Center live hydration must restore the owner snapshot without a second dataset reconciliation path.');

  const ui=read('src/generated/runtime/ui-infrastructure.js');
  assert(ui.includes('logDecadeTicks(domain)')&&ui.includes('yAxisGenerator.tickValues(this.logDecadeTicks(y.domain()))'),'D3 ScientificCurveSurface must label only powers of ten in log Y mode.');
  const app=read('src/generated/runtime/app.js'),mainAux=read('desktop/main-modules/auxiliary-window-runtime.js'),aux=read('src/plugin-window/runtime.js');
  assert(app.includes("artifactHydration||''")&&app.includes("==='live'?snapshotArtifactRows():null"),'Activities that declare live Artifact hydration must receive the owner snapshot.');
  const dc=read('src/plugins/data-center/feature-runtime.js');assert(dc.includes("artifactHydration:'live'"),'Data Center must explicitly request live Artifact hydration.');
  assert(mainAux.includes('artifactSnapshot')&&mainAux.includes('artifactDigest')&&mainAux.includes('cachedBootstrap.artifactDigest !== nextBootstrap.artifactDigest'),'Auxiliary-window reuse must track Artifact snapshot changes.');
  assert(aux.includes('const liveSnapshot=Array.isArray(bootstrap?.artifactSnapshot)?bootstrap.artifactSnapshot:null')&&aux.includes('liveSnapshot!==null?{schema:2,artifacts:liveSnapshot}'),'Dedicated live hydration must restore exactly the owner Artifact snapshot.');
  assert(!aux.includes('syncLegacyDatasetArtifacts')&&!aux.includes('project.datasets'),'Dedicated windows must not reconcile a legacy dataset side channel.');
  console.log('v3.62 log display + canonical Data Center bootstrap checks passed.');
})().catch(err=>{console.error(err);process.exit(2);});
