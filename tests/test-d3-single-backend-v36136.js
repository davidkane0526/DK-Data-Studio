'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const mobile=json('mobile/package.json');
const index=read('src/index.html');
const charts=read('src/core/scientific/chart-runtime.js');
const d3Renderer=read('src/core/scientific/d3-chart-renderer.js');
const dedicated=read('src/plugin-window/runtime.js');
const manager=read('desktop/plugin-window-manager.js');
const ui=read('src/generated/runtime/ui-infrastructure.js');
const scientific=read('src/core/scientific/plot-runtime.js');


assert(pkg.dependencies?.d3,'Desktop runtime must ship D3.');
assert(!Object.keys(pkg.dependencies||{}).some(k=>/plotly/i.test(k)),'Desktop dependencies must be Plotly-free.');
assert(!Object.keys(pkg.optionalDependencies||{}).some(k=>/plotly/i.test(k)),'Desktop optional dependencies must be Plotly-free.');
assert(mobile.dependencies?.d3,'Mobile runtime must ship D3.');
assert(!Object.keys(mobile.dependencies||{}).some(k=>/plotly/i.test(k)),'Mobile dependencies must be Plotly-free.');
assert(index.includes('../node_modules/d3/dist/d3.min.js'),'Main renderer must load D3.');
assert(index.includes('core/scientific/d3-chart-renderer.js')&&index.indexOf('core/scientific/d3-chart-renderer.js')<index.indexOf('core/scientific/chart-runtime.js'),'D3 adapter must load before the chart facade.');
assert(!/plotly/i.test(index),'Main renderer entry must contain no Plotly loader or script.');
assert(charts.includes("const VERSION='2.0.0'")&&charts.includes("preferredRenderer:'d3'")&&charts.includes('singleBackend:true'),'Chart Runtime 2.0 must declare a single D3 backend.');
assert(!/ensurePlotly|plotlyPromise|plotlyAllowed|plotlyFallback|window\.Plotly|plotly_/i.test(charts),'Chart Runtime must contain no Plotly loader, state or event bridge.');
assert(d3Renderer.includes("new Set(['scatter','scattergl','heatmap'])"),'D3 adapter must cover every first-party trace family.');
for(const token of ['layout?.shapes','layout?.annotations','yaxis2','dkds-d3-colorbar','hovertemplate','restyle','relayout','toImage'])assert(d3Renderer.includes(token),`D3 parity capability missing: ${token}`);
assert(dedicated.includes("requestedIds.includes('scientific-renderer')")&&dedicated.includes("if(key==='scientific-renderer')continue"),'Dedicated TOP must accept only the vendor-neutral scientific-renderer dependency and keep vendor modules inside Core composition.');
assert(dedicated.includes("preferredRenderer:'d3',host:'dedicated-top'"),'Dedicated TOP must configure D3 only.');
assert(!/plotly/i.test(dedicated),'Dedicated TOP runtime must contain no Plotly compatibility loader.');
assert(!manager.includes("'plotly'")&&!manager.includes("'d3',"),'Plugin window dependency allowlist must not expose renderer vendors.');
assert(!ui.includes('createPlotly')&&!ui.includes('js-plotly')&&!ui.includes('dkds-plotly'),'Core UI must expose only renderer-neutral scientific surfaces.');
assert(!scientific.includes('plotly_')&&!scientific.includes('dkds-scientific-plotly'),'ScientificPlot must consume only neutral chart events and D3 presentation classes.');

for(const id of ['data-center','pulse-analysis','resonance-workbench','ter-analysis']){
  const manifest=json(`src/plugins/${id}/plugin.json`),deps=manifest.window?.dependencies||[];
  assert(deps.includes('scientific-renderer'),`${id} must declare scientific-renderer.`);
  assert(!deps.includes('plotly')&&!deps.includes('d3'),`${id} must not declare renderer vendors.`);
}

const target={nodeType:1,id:'d3-only',dataset:{},style:{},isConnected:true,offsetParent:{},clientWidth:640,clientHeight:360,classList:{add(){},remove(){}},getBoundingClientRect(){return {width:640,height:360,left:0,top:0};},addEventListener(){},removeEventListener(){},appendChild(){},querySelector(){return null;},querySelectorAll(){return [];}};
let d3React=0;
const context={console,structuredClone,setTimeout,clearTimeout,queueMicrotask,performance:{now:()=>1},location:{href:'file:///src/index.html'},URL,
 d3:{},DKDSTheme:{subscribeRevision(){return()=>{};}},DKDSD3Renderer:{supports:data=>Array.isArray(data)&&data.every(row=>['scatter','scattergl','heatmap'].includes(String(row?.type||'scatter'))),react:async(el,data,layout,config)=>{d3React++;el.data=data;el.layout=layout;el._context=config;el.dataset.dkdsChartRenderer='d3';return el;},restyle:async()=>true,relayout:async()=>true,resize:()=>true,purge:()=>true,toImage:async()=>''},
 document:{currentScript:{src:'file:///src/core/scientific/chart-runtime.js'},documentElement:{dataset:{dkdsTheme:'light'}},getElementById:id=>id==='d3-only'?target:null,querySelector:()=>null,querySelectorAll:()=>[]},
 matchMedia:()=>({matches:false}),addEventListener(){},requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
context.DKDSStyleGate={set(_el,_prop,value){return value;},remove(){return true;}};
context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(charts,context,{filename:'chart-runtime.js'});
(async()=>{
  const state=context.DKDSCharts.configureRuntime({preferredRenderer:'d3',host:'d3-single-backend-test'});
  assert.equal(state.singleBackend,true);assert.equal(state.renderer,'d3');
  assert.throws(()=>context.DKDSCharts.configureRuntime({preferredRenderer:'plotly'}),/D3-only/,'A vendor fallback request must be rejected rather than opening a second backend.');
  await context.DKDSCharts.react(target,[{type:'scatter',x:[0,1],y:[1,2],name:'A'}],{showlegend:false},{staticPlot:true});
  assert.equal(d3React,1);assert.equal(context.DKDSCharts.rendererFor(target),'d3');
  console.log('v3.61.38 D3 single-backend runtime PASS');
})().catch(err=>{console.error(err);process.exit(1);});
