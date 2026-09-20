'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const productionSource=read('src/plugins/pulse-sampler-tool/plugin.js');
const shadowSource=read('examples/sdk151-unit-pulse-sampler-shadow/plugin.js');
const productionManifest=JSON.parse(read('src/plugins/pulse-sampler-tool/plugin.json'));
assert(productionManifest.requiresCore.includes('services')&&productionManifest.requiresCore.includes('modules'),'Pulse Sampler production owner must expose the live-domain seam through canonical services/modules.');
assert.deepStrictEqual(productionManifest.scripts.slice(0,2),['live-domain.js','domain-adapter.js']);
for(const token of ["ctx.modules.require('live-domain')","ctx.modules.require('domain-adapter')","snapshot:liveSnapshot","generate,addSegment,clearChannel,removeSegment,setAnalysis,extract:runExtraction","actions:liveDomain.actions"])assert(productionSource.includes(token),`production Pulse Sampler missing live-domain wiring: ${token}`);
for(const forbidden of ['function pulseGenerator','function concatSegments','function mergeChannels','function inferSampleStep'])assert(!shadowSource.includes(forbidden),`Unit shadow must not duplicate production numerical owner: ${forbidden}`);
assert(shadowSource.includes("connect?.('com.dkds.tools.pulse-sampler/live')"),'Unit shadow must connect only through the production live domain adapter.');

class ClassList{constructor(){this.rows=new Set();}add(...rows){for(const row of rows)this.rows.add(String(row));}remove(...rows){for(const row of rows)this.rows.delete(String(row));}toggle(row,on){if(on===undefined)on=!this.rows.has(String(row));on?this.rows.add(String(row)):this.rows.delete(String(row));return !!on;}contains(row){return this.rows.has(String(row));}}
class Element{
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.children=[];this.parentNode=null;this.parentElement=null;this.dataset={};this.attributes={};this.listeners={};this.classList=new ClassList();this.textContent='';this.value='';this.checked=false;this.disabled=false;}
  appendChild(node){if(!node)return node;this.children.push(node);node.parentNode=this;node.parentElement=this;return node;}
  replaceChildren(...rows){this.children=[];for(const row of rows)this.appendChild(row);}
  setAttribute(k,v){this.attributes[String(k)]=String(v);}getAttribute(k){return this.attributes[String(k)]??null;}
  querySelectorAll(selector){const out=[];const walk=node=>{for(const child of node.children||[]){if(selector==='[role=tab]'&&child.getAttribute?.('role')==='tab')out.push(child);walk(child);}};walk(this);return out;}
}
const append=(host,node)=>{host?.appendChild?.(node);return node;};
const controls=new Map(),fieldRows=[],actions=new Map(),tables=new Map(),surfaces=new Map(),tabs=[];
const units={
  page:{create:host=>({element:append(host,new Element('section'))})},
  pageHeader:{create:host=>({element:append(host,new Element('header'))})},
  workspace:{create:()=>({compose(){},dispose(){}})},
  layout:{create:(host,spec={})=>append(host,new Element(spec.tagName||'div')),apply:target=>target},
  panel:{detached:()=>({element:new Element('section')}),create:host=>({element:append(host,new Element('section'))})},
  header:{create:(host,spec={})=>{const element=append(host,new Element('header')),title=append(element,new Element('strong')),meta=append(element,new Element('span')),actionsHost=append(element,new Element('div'));title.textContent=String(spec.title||'');meta.textContent=String(spec.meta||'');return {element,title,meta,actions:actionsHost,actionHost:actionsHost};}},
  tabs:{create:(host,spec={})=>{const element=append(host,new Element('div')),tabHost=append(element,new Element('div'));for(const row of spec.items||[]){const button=append(tabHost,new Element('button'));button.textContent=String(row.label||row.id||'');button.setAttribute('role','tab');button.onInvoke=()=>spec.onChange?.(row.id);tabs.push(button);}return {element,tabs:tabHost};}},
  field:{create:(host,spec={})=>{const control=append(host,new Element(spec.kind==='select'?'select':'input'));control.value=String(spec.value??'');control.onChange=spec.onChange;for(const row of spec.options||[]){const option=append(control,new Element('option'));if(typeof row==='object'){option.value=String(row.value??row.id??'');option.textContent=String(row.label??row.value??row.id??'');}else{option.value=String(row);option.textContent=String(row);}}if(spec.label)controls.set(String(spec.label),control);fieldRows.push({spec,control});return {element:control,control};}},
  action:{create:(host,spec={})=>{const button=append(host,new Element('button'));button.textContent=String(spec.label||spec.id||'');button.onInvoke=spec.onInvoke;actions.set(String(spec.id),{spec,button});return {button,element:button};}},
  toolbar:{create:host=>({element:append(host,new Element('div'))})},
  table:{mount:(id,_host,spec={})=>{const table={id,columns:structuredClone(spec.columns||[]),rows:structuredClone(spec.rows||[]),setData(columns,rows){this.columns=structuredClone(columns||[]);this.rows=structuredClone(rows||[]);},dispose(){}};tables.set(id,table);return table;}},
  scientificPlot:{create:(_host,spec={})=>{const surface={source:spec.source,spec,renderCount:0,lastCurves:[],requestRender(){this.renderCount+=1;this.lastCurves=structuredClone(spec.getCurves?.()||[]);return this;},dispose(){}};surfaces.set(String(spec.source||''),surface);return surface;}},
  prime:{build:spec=>spec},state:{set(){}}
};
const dom={create:(tag,spec={})=>{const el=new Element(tag);if(spec.textContent!==undefined)el.textContent=String(spec.textContent);if(spec.text!==undefined)el.textContent=String(spec.text);return el;}};

const context={console,structuredClone,setTimeout,clearTimeout,Promise};context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(read('src/core/plugins/module-runtime.js'),context,{filename:'module-runtime.js'});
vm.runInContext(read('src/core/services/service-runtime.js'),context,{filename:'service-runtime.js'});
vm.runInContext(read('src/plugins/pulse-sampler-tool/live-domain.js'),context,{filename:'pulse-sampler/live-domain.js'});
vm.runInContext(read('src/plugins/pulse-sampler-tool/domain-adapter.js'),context,{filename:'pulse-sampler/domain-adapter.js'});
const LiveDomain=context.DKDSPluginModules.require('com.dkds.tools.pulse-sampler','live-domain');
const DomainAdapter=context.DKDSPluginModules.require('com.dkds.tools.pulse-sampler','domain-adapter');
assert(LiveDomain?.create&&DomainAdapter?.provide,'Pulse Sampler live-domain modules must load.');

const PARAMS={voltageMax:4,voltageStep:.5,voltageRead:0,pulseTime:.05,readTime:.05,timeShift:0,cycle:.5,ratio:1};
const state={schema:1,activeChannel:'Vd',channels:{Vd:{params:{...PARAMS},segments:[{index:1,voltageMax:4,step:.5,read:0,pulseTime:.05,readTime:.05,cycle:.5,points:6}],segmentCount:1,hasPreview:true,boundaryPoints:8},Vs:{params:{...PARAMS},segments:[],segmentCount:0,hasPreview:false,boundaryPoints:0},Vg:{params:{...PARAMS},segments:[],segmentCount:0,hasPreview:false,boundaryPoints:0}},active:null,waveform:{totalRows:3,rows:[{time:0,Vd:0,Vs:0,Vg:0},{time:.05,Vd:4,Vs:0,Vg:0},{time:.1,Vd:0,Vs:0,Vg:0}],curves:[{id:'pulse-sampler-vd',label:'Vd',points:[{x:0,y:0},{x:.05,y:4},{x:.1,y:0}]}]},source:{options:[{id:'table:a',label:'device83'}],activeId:'table:a',columns:['Time','Id'],timeKey:'Time',currentKey:'Id',rowCount:3,meta:'device83 · 3 行 · 采样间隔≈0.05 s'},analysis:{sourceId:'table:a',timeKey:'Time',currentKey:'Id',trimLeft:'',trimRight:'',xMode:'readVoltage',yMode:'readCurrent'},result:{available:true,channel:'Vd',sourceId:'table:a',matched:2,totalPulse:2,trimLeft:1,trimRight:1,tolerance:.001,x:[0,1],y:[1e-9,2e-9],xLabel:'Read Voltage (V)',yLabel:'Read Current (A)',rows:[{index:1,x:0,y:1e-9},{index:2,x:1,y:2e-9}],meta:'Vd · 匹配 2/2 · 自动/实际剔除 1/1 点 · 容差 0.001 s'}};
const refreshActive=()=>{state.active=structuredClone(state.channels[state.activeChannel]);state.active.channel=state.activeChannel;};refreshActive();
const actionCalls=[];
const liveDomain=LiveDomain.create({snapshot:()=>state,actions:{
  setChannel:p=>{actionCalls.push(['setChannel',p]);state.activeChannel=String(p.value);refreshActive();return state.activeChannel;},
  setParameters:p=>{actionCalls.push(['setParameters',p]);Object.assign(state.channels[p.channel||state.activeChannel].params,p.value||{});refreshActive();return state.active.params;},
  generate:p=>{actionCalls.push(['generate',p]);state.channels[state.activeChannel].hasPreview=true;state.channels[state.activeChannel].boundaryPoints=10;refreshActive();return true;},
  addSegment:p=>{actionCalls.push(['addSegment',p]);state.channels[state.activeChannel].segments.push({index:2,voltageMax:3,step:.5,read:0,pulseTime:.05,readTime:.05,cycle:.5,points:4});state.channels[state.activeChannel].segmentCount=state.channels[state.activeChannel].segments.length;refreshActive();return true;},
  clearChannel:p=>{actionCalls.push(['clearChannel',p]);state.channels[state.activeChannel].segments=[];state.channels[state.activeChannel].segmentCount=0;refreshActive();return true;},
  removeSegment:p=>{actionCalls.push(['removeSegment',p]);state.channels[state.activeChannel].segments.splice(Number(p.index),1);state.channels[state.activeChannel].segmentCount=state.channels[state.activeChannel].segments.length;refreshActive();return true;},
  setAnalysis:p=>{actionCalls.push(['setAnalysis',p]);Object.assign(state.analysis,p);state.source.activeId=state.analysis.sourceId||state.source.activeId;state.source.timeKey=state.analysis.timeKey||state.source.timeKey;state.source.currentKey=state.analysis.currentKey||state.source.currentKey;return state.analysis;},
  extract:p=>{actionCalls.push(['extract',p]);return state.result;},exportWave:()=>true,copyResult:()=>true,exportResult:()=>true
}});
const owner=context.DKDSServices.createScope('com.dkds.tools.pulse-sampler');DomainAdapter.provide({services:owner},liveDomain);
const consumer=context.DKDSServices.createScope('com.example.unit-pulse-sampler-shadow',{dependencies:['com.dkds.tools.pulse-sampler']});
let activate=null;context.DKDSPlugins={define:(_manifest,fn)=>{activate=fn;}};vm.runInContext(shadowSource,context,{filename:'unit-pulse-sampler-shadow/plugin.js'});assert.strictEqual(typeof activate,'function');
(async()=>{
const pageRoot=new Element('main');
const runtime=await activate({services:consumer,status:{set(){}},ui:{dom,unitTemplates:units,pages:{add:()=>pageRoot},topWorkspace:{register(){}}}});
await runtime.syncLiveState();
assert.strictEqual(runtime.shadowState.liveParity.connected,true);
assert.strictEqual(runtime.shadowState.liveParity.activeChannel,'Vd');
assert.strictEqual(runtime.shadowState.liveParity.segmentRows,1);
assert.strictEqual(runtime.shadowState.liveParity.waveRows,3);
assert.strictEqual(runtime.shadowState.liveParity.resultRows,2);
assert.strictEqual(runtime.shadowState.liveParity.sourceId,'table:a');
assert.strictEqual(tables.get('pulse-sampler-shadow-segments').rows.length,1,'Unit segment table must mirror production owner.');
assert.strictEqual(tables.get('pulse-sampler-shadow-wave').rows.length,3,'Unit waveform table must mirror production owner.');
assert.strictEqual(tables.get('pulse-sampler-shadow-result').rows.length,2,'Unit result table must mirror production owner.');
assert.deepStrictEqual(surfaces.get('pulse-sampler-shadow:waveform').lastCurves[0].points.map(row=>row.x),[0,.05,.1]);
assert.deepStrictEqual(surfaces.get('pulse-sampler-shadow:result').lastCurves[0].points.map(row=>row.y),[1e-9,2e-9]);

const voltageControl=fieldRows[0]?.control;assert(voltageControl?.onChange);await voltageControl.onChange({target:{value:'5'}});await new Promise(resolve=>setTimeout(resolve,0));assert.strictEqual(Number(state.channels.Vd.params.voltageMax),5,'Unit parameter must mutate the single production state owner.');assert.strictEqual(voltageControl.value,'5','production state must round-trip to Unit field.');
const vgTab=tabs.find(row=>row.textContent==='Vg');await vgTab.onInvoke();await new Promise(resolve=>setTimeout(resolve,0));assert.strictEqual(state.activeChannel,'Vg','Unit tabs must mutate production activeChannel.');assert.strictEqual(runtime.shadowState.liveParity.activeChannel,'Vg');
await actions.get('addSegment').spec.onInvoke();await new Promise(resolve=>setTimeout(resolve,0));assert.strictEqual(state.channels.Vg.segmentCount,1,'Unit action must mutate production segment owner.');assert.strictEqual(tables.get('pulse-sampler-shadow-segments').rows.length,1);
const xControl=fieldRows[13]?.control;assert(xControl?.onChange);await xControl.onChange({target:{value:'pulseVoltage'}});await new Promise(resolve=>setTimeout(resolve,0));assert.strictEqual(state.analysis.xMode,'pulseVoltage','Unit result mode must mutate production analysis owner.');

state.waveform={totalRows:1,rows:[{time:0,Vd:1,Vs:2,Vg:3}],curves:[{id:'pulse-sampler-vg',label:'Vg',points:[{x:0,y:3}]}]};state.result={available:false,meta:'尚未执行提取。',rows:[],x:[],y:[],xLabel:'X',yLabel:'Current'};liveDomain.notify('production-direct-change');await new Promise(resolve=>setTimeout(resolve,0));assert.strictEqual(runtime.shadowState.liveParity.waveRows,1,'Direct production changes must propagate through live subscription.');assert.strictEqual(runtime.shadowState.liveParity.resultRows,0,'Stale result rows must clear when production result clears.');assert.strictEqual(tables.get('pulse-sampler-shadow-result').rows.length,0);
assert(actionCalls.some(row=>row[0]==='setParameters')&&actionCalls.some(row=>row[0]==='setChannel')&&actionCalls.some(row=>row[0]==='addSegment')&&actionCalls.some(row=>row[0]==='setAnalysis'),'Side-by-side interactions must route through production actions.');
assert(runtime.shadowState.plotRenderCount>=4,'Waveform/result ScientificPlots must re-render from production snapshots.');
runtime.deactivate();consumer.dispose();owner.dispose();
console.log('SDK 1.51 Pulse Sampler Tool side-by-side live presentation acceptance PASS');
})().catch(error=>{console.error(error?.stack||error);process.exit(1);});
