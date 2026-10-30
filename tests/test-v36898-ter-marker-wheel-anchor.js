'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const chartExportCode=fs.readFileSync(path.join(root,'src/core/scientific/chart-export-runtime.js'),'utf8');
const chartsCode=fs.readFileSync(path.join(root,'src/core/scientific/chart-runtime.js'),'utf8');
const d3Code=fs.readFileSync(path.join(root,'src/core/scientific/d3-chart-renderer.js'),'utf8');

function classList(){return {add(){},remove(){},toggle(){},contains(){return false;}};}
function nestedPatch(target,path,value){const parts=String(path).split('.');let node=target;for(let i=0;i<parts.length-1;i++){node[parts[i]]??={};node=node[parts[i]];}node[parts.at(-1)]=value;}
function applyRestyle(data,update,indices){const ids=Array.isArray(indices)?indices:[indices],count=ids.length;ids.forEach((id,j)=>{const trace=data[id];if(!trace)return;for(const [key,raw] of Object.entries(update)){let value=raw;if(Array.isArray(raw)&&count>1)value=raw[j];else if(Array.isArray(raw)&&count===1&&raw.length===1&&Array.isArray(raw[0]))value=raw[0];nestedPatch(trace,key,structuredClone(value));}});}

(async()=>{
  const target={nodeType:1,id:'ter-rv',dataset:{},style:{},classList:classList(),isConnected:true,offsetParent:{},clientWidth:640,clientHeight:360,addEventListener(){},removeEventListener(){},dispatchEvent(){},appendChild(){},querySelector(){return null;},querySelectorAll(){return [];},getBoundingClientRect(){return {width:640,height:360,left:0,top:0};}};
  const renders=[];
  const renderer={supports:()=>true,react(el,data,layout,config){el.data=structuredClone(data);el.layout=structuredClone(layout);el._context=config;el.dataset.dkdsChartRenderer='d3';renders.push({data:structuredClone(el.data),layout:structuredClone(el.layout)});return Promise.resolve(el);},restyle(el,update,indices){applyRestyle(el.data,update,indices);return Promise.resolve(el);},relayout(el,update){for(const [key,value] of Object.entries(update))nestedPatch(el.layout,key,structuredClone(value));return Promise.resolve(el);},resize(){return true;},purge(){return true;},toImage(){return Promise.resolve('');}};
  const styleGate={set(_el,_prop,value){return value;},remove(){return true;}};
  const document={currentScript:{src:'file:///src/core/scientific/chart-runtime.js'},documentElement:{dataset:{dkdsTheme:'light'},classList:classList()},getElementById:id=>id==='ter-rv'?target:null,querySelector:()=>null,querySelectorAll:()=>[]};
  const context={console,structuredClone,setTimeout,clearTimeout,queueMicrotask,Promise,WeakMap,Map,Set,URL,performance:{now:()=>0},document,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},CustomEvent:function(){},DKDSStyleGate:styleGate,DKDSTheme:{subscribeRevision(){return()=>{};}},DKDSD3Renderer:renderer,d3:{}};
  context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(chartExportCode,context,{filename:'chart-export-runtime.js'});vm.runInContext(chartsCode,context,{filename:'chart-runtime.js'});
  const traces=[{x:[-.5,.5],y:[1e5,2e5],mode:'lines',name:'up'},{x:[-.5,.5],y:[1.1e5,2.1e5],mode:'lines',name:'down'},{x:[],y:[],mode:'markers',showlegend:false,marker:{size:12}}];
  await context.DKDSCharts.react(target,traces,{showlegend:false,xaxis:{range:[-1,1]},yaxis:{type:'log'}},{staticPlot:true});
  await context.DKDSCharts.restyle(target,{x:[[.62]],y:[[135830]]},[2]);
  assert.deepStrictEqual(Array.from(target.data[2].x),[.62],'TER marker restyle must reach the rendered trace');
  await context.DKDSCharts.relayout(target,{'xaxis.range':[-.25,.75],'xaxis.autorange':false});
  await context.DKDSCharts.toggleYAxisDisplay(target);
  const last=renders.at(-1);
  assert.deepStrictEqual(Array.from(last.data[2].x),[.62],'a display rerender must preserve a domain-owned marker restyle instead of reverting to the original empty marker trace');
  assert.deepStrictEqual(Array.from(last.data[2].y),[135830],'a display rerender must preserve the selected TER marker Y value');
  assert.deepStrictEqual(Array.from(last.layout.xaxis.range),[-.25,.75],'a display rerender must preserve the current relayout/viewport instead of restoring stale layout state');

  const d3Context={console,structuredClone,WeakMap,Map,Set,Number,Math,DKDSStyleGate:{set(){},remove(){},setPaint(){},removePaint(){}},DKDSScientificDisplay:{},DKDSScientificHeatmapCanvas:{},DKDSScientificHeatmapSelection:{}};
  d3Context.window=d3Context;d3Context.globalThis=d3Context;vm.createContext(d3Context);vm.runInContext(d3Code,d3Context,{filename:'d3-chart-renderer.js'});
  const zoomRange=d3Context.DKDSD3Renderer.geometry.zoomRange;
  const linear={domain:()=>[0,10],invert:px=>px/10};
  assert.deepStrictEqual(Array.from(zoomRange(linear,{type:'linear'},20,.5)),[1,6],'wheel zoom near the left side must stay anchored at the mouse data coordinate, not the plot center');
  assert.deepStrictEqual(Array.from(zoomRange(linear,{type:'linear'},80,.5)),[4,9],'moving the mouse anchor must move the zoom center with it');
  const log={domain:()=>[1,1000],invert:()=>10};
  assert.deepStrictEqual(Array.from(zoomRange(log,{type:'log'},50,.5)),[.5,2],'log-axis wheel zoom must anchor in log-coordinate space around the mouse value');
  assert.strictEqual((d3Code.match(/installWheelZoom\(state,scales\)/g)||[]).length,2,'mouse-anchored wheel zoom must be installed for both scatter and heatmap views');
  console.log('v3.68.98 TER marker persistence + mouse-anchored wheel zoom PASS');
})().catch(err=>{console.error(err);process.exit(1);});
