'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

class ClassList{constructor(){this.rows=new Set();}add(...v){for(const x of v)this.rows.add(String(x));}remove(...v){for(const x of v)this.rows.delete(String(x));}contains(v){return this.rows.has(String(v));}}
class Element{
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.children=[];this.parentNode=null;this.parentElement=null;this.dataset={};this.attributes={};this.classList=new ClassList();this.textContent='';this.innerHTML='';this.value='';this.checked=false;this.disabled=false;this.type='';this.listeners={};this.style={};}
  appendChild(node){if(node){this.children.push(node);node.parentNode=this;node.parentElement=this;}return node;}
  append(...rows){for(const row of rows){if(row&&typeof row==='object')this.appendChild(row);else if(row!=null){const t=new Element('span');t.textContent=String(row);this.appendChild(t);}}}
  replaceChildren(...rows){this.children=[];for(const row of rows)this.appendChild(row);}
  setAttribute(k,v){this.attributes[String(k)]=String(v);}
  getAttribute(k){return this.attributes[String(k)]??null;}
  addEventListener(type,fn){(this.listeners[type]||(this.listeners[type]=[])).push(fn);}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=this.parentElement=null;}
}
const append=(host,node)=>{host?.appendChild?.(node);return node;};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

const modules=new Map();
const context={console,structuredClone,setTimeout,clearTimeout,queueMicrotask,Promise,document:{createTextNode:text=>({nodeType:3,textContent:String(text)})}};
context.window=context;context.globalThis=context;context.DKDSPluginModules={define:(owner,id,value)=>modules.set(`${owner}:${id}`,value),require:(owner,id)=>modules.get(`${owner}:${id}`),get:(owner,id)=>modules.get(`${owner}:${id}`)};
vm.createContext(context);
for(const rel of ['src/core/services/service-runtime.js','src/plugins/transfer-vth-lab/analysis-runtime.js','src/plugins/transfer-vth-lab/live-domain.js','src/plugins/transfer-vth-lab/domain-adapter.js','src/plugins/transfer-vth-lab/unit-presentation.js'])vm.runInContext(read(rel),context,{filename:rel});
const Analysis=modules.get('com.dkds.transfer-vth-lab:analysis-runtime');

function curveArtifact(id,name,shift){const xs=[],ys=[];for(const [a,b,delta] of [[-2,2,0],[2,-2,.14]])for(let i=0;i<80;i++){const x=a+(b-a)*i/79,center=.42+shift+delta,current=2e-12+1.3e-9*Math.exp((x-center)*3.4);xs.push(x);ys.push(Math.min(current,8e-8));}return{id,name,kind:'data.table',columns:[{key:'Vg',role:'x',values:xs},{key:'Id',role:'y',values:ys}]};}
const artifacts=new Map([['curve-a',curveArtifact('curve-a','device83 · forward/reverse',0)],['curve-b',curveArtifact('curve-b','device1 · forward/reverse',.08)]]);
const descriptors=[{artifactId:'curve-a',name:'device83 · forward/reverse'},{artifactId:'curve-b',name:'device1 · forward/reverse'}];


function createProdUnits(prodPlots,tables){
  return {
    page:{create:host=>({element:append(host,new Element('div'))})},
    pageHeader:{create:(host)=>({element:append(host,new Element('header'))})},
    layout:{create:(host)=>append(host,new Element('div')),apply:target=>target},
    workspace:{create:host=>({shell:host,compose(){},dispose(){}})},
    panel:{create:(host)=>{const el=append(host,new Element('section')),header={element:append(el,new Element('header')),actions:new Element('span')};header.element.appendChild(header.actions);const body=append(el,new Element('div'));return{element:el,header,body};},detached:()=>{const el=new Element('section'),body=append(el,new Element('div'));return{element:el,body,header:null};}},
    header:{create:(host,spec={})=>{const element=append(host,new Element('header')),title=append(element,new Element('span')),meta=append(element,new Element('small'));title.textContent=String(spec.title||'');meta.textContent=String(spec.meta||'');return{element,title,meta,actions:new Element('span')};}},
    chip:{create:(host,spec={})=>{const el=append(host,new Element('span'));el.textContent=String(spec.text||'');return el;}},
    note:{create:(host,spec={})=>{const el=append(host,new Element('div'));el.textContent=String(spec.text||'');return el;}},
    toolbar:{create:()=>({})},
    field:{create:(host,spec={})=>{const control=append(host,new Element(spec.kind==='select'?'select':'input'));control.type=spec.kind==='select'?'select-one':String(spec.inputType||'text');control.value=spec.value===undefined?'':String(spec.value);return{element:control,control};}},
    check:{create:(host,spec={})=>{const input=append(host,new Element('input'));input.type='checkbox';input.checked=!!spec.checked;return{element:input,input};}},
    prime:{build:spec=>spec},
    metric:{create:(host,spec={})=>{const element=append(host,new Element('div')),label=append(element,new Element('span')),value=append(element,new Element('strong'));label.textContent=String(spec.label||'');value.textContent=String(spec.value||'');return{element,label,value};}},
    scientificPlot:{create:(_target,spec)=>{const surface={spec,requestRender(){},fitToData(){return true;},dispose(){}};prodPlots.push(surface);return surface;}},
    table:{mount:(id,_host,spec={})=>{const row={columns:spec.columns||[],rows:spec.rows||[],setData(c,r){this.columns=structuredClone(c);this.rows=structuredClone(r);},dispose(){}};tables.set(id,row);return row;}},
    splitPane:{create:(_host,spec)=>{const element=new Element('div');append(element,spec.first);append(element,spec.second);return{element,spec,dispose(){}};}}
  };
}
function createProdDom(){
  const map=new Map();
  const types={curve:'select',method:'select',branch:'select',targetCurrent:'number',lowCurrent:'number',highCurrent:'number',absoluteCurrent:'checkbox',logY:'checkbox',showAllCurves:'checkbox'};
  const get=selector=>{if(!map.has(selector)){const el=new Element(selector.includes('button')?'button':'div');const m=/data-vth="([^"]+)"/.exec(selector);if(m){el.dataset.vth=m[1];el.type=types[m[1]]||'';}map.set(selector,el);}return map.get(selector);};
  return {map,api:{create:(tag,spec={})=>{const el=new Element(tag);Object.assign(el,spec);return el;},query:(selector)=>get(selector),html:(el,html)=>{el.innerHTML=String(html);},on:(el,type,fn)=>{el.addEventListener(type,fn);return()=>{};},microtask:fn=>queueMicrotask(fn)}};
}

(async()=>{
  const owner=context.DKDSServices.createScope('com.dkds.transfer-vth-lab');
  const prodDom=createProdDom(),commands=new Map(),tables=new Map(),prodPlots=[];
  let prodActivate=null;context.DKDSPlugins={define:(_manifest,activate)=>{prodActivate=activate;}};
  vm.runInContext(read('src/plugins/transfer-vth-lab/plugin.js'),context,{filename:'transfer-vth-lab/plugin.js'});
  assert.strictEqual(typeof prodActivate,'function');
  const settings={get:()=>({}),open:()=>true,subscribe:()=>()=>{},dispose(){}};
  const stateFactory=initial=>{let value=structuredClone(initial);const listeners=new Set();return{get:()=>value,set:next=>{value=structuredClone(next);for(const fn of [...listeners])fn(value,{reason:'set'});return value;},patch:(patch,meta={})=>{value={...value,...structuredClone(patch)};for(const fn of [...listeners])fn(value,meta);return value;},subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}};};
  const prodCtx={
    manifest:{id:'com.dkds.transfer-vth-lab',version:'3.2.2'},runtime:{isAuxiliaryWindow:false},services:owner,
    modules:{require:id=>modules.get(`com.dkds.transfer-vth-lab:${id}`)},
    tasks:{submit:(_id,input)=>({promise:Promise.resolve().then(()=>Analysis.analyzeCurve({points:input.curve.points},{...Analysis.defaults(),...(input.parameters||{})},input.manualWindow||null))}),cancelAll(){}},
    analysis:{algorithms:{register(){}}},data:{types:{register(){}},sources:{list:()=>descriptors},artifacts:{get:id=>artifacts.get(String(id))}},
    state:{create:stateFactory},project:{registerSlice(){},capture(){}},status:{set(){}},workspace:{openPage(){}},events:{on:()=>()=>{}},
    commands:{register:(id,fn)=>commands.set(id,fn),run:(id,payload)=>commands.get(id)?.(payload)},
    ui:{dom:prodDom.api,unitTemplates:createProdUnits(prodPlots,tables),settings:{define:()=>settings},interactionBehaviors:{create(){}},activities:{add(){}},pages:{add:()=>new Element('main')},workspaceSurface:{create:()=>({shell:new Element('div'),mountPrimary(){},registerPrime(){},dispose(){}})},layout:{split(){}},tables:{mount:(id,_host,spec={})=>{const row={columns:spec.columns||[],rows:[],setData(c,r){this.columns=structuredClone(c);this.rows=structuredClone(r);},dispose(){}};tables.set(id,row);return row;}},scientificPlot:{create:(_target,spec)=>{const surface={spec,requestRender(){},fitToData(){return true;},dispose(){}};prodPlots.push(surface);return surface;}},actions:{mount(){}},topWorkspace:{register(){}}}
  };
  const prodRuntime=await prodActivate(prodCtx);await delay(20);
  const shadowService=context.DKDSServices.createScope('com.example.unit-vth-shadow',{dependencies:['com.dkds.transfer-vth-lab']});
  const live=shadowService.domain.connect('com.dkds.transfer-vth-lab/live');
  await live.invoke('analyzeAll');await delay(20);
  const prodSnapshot=live.snapshot().state;
  assert.strictEqual(prodSnapshot.curves.length,2,'production Vth live snapshot must expose both assigned curves');
  assert(prodSnapshot.curves.every(row=>row.result),'production Vth analyzeAll must populate the authoritative result cache');

  const fieldSpecs=new Map(),checkSpecs=new Map(),metricRefs=new Map(),shadowTables=new Map(),shadowPlots=[];
  const actionSpecs=new Map();
  const units={
    page:{create:host=>({element:append(host,new Element('div'))})},pageHeader:{create:(host,spec)=>{for(const a of spec.actions||[])actionSpecs.set(a.id,a);return{element:append(host,new Element('header'))};}},
    layout:{create:(host)=>append(host,new Element('div')),apply:target=>target},workspace:{create:()=>({compose(){},dispose(){}})},
    panel:{create:(host,spec={})=>{const el=append(host,new Element('section')),header={element:append(el,new Element('header')),actions:new Element('span')};header.element.appendChild(header.actions);const body=append(el,new Element('div'));return{element:el,header,body};},detached:()=>{const el=new Element('section'),body=append(el,new Element('div'));return{element:el,body,header:null};}},
    header:{create:(host,spec={})=>{const element=append(host,new Element('header')),title=append(element,new Element('span')),meta=append(element,new Element('small'));title.textContent=String(spec.title||'');meta.textContent=String(spec.meta||'');return{element,title,meta,actions:new Element('span')};}},
    chip:{create:(host,spec={})=>{const el=append(host,new Element('span'));el.textContent=String(spec.text||'');return el;}},note:{create:(host,spec={})=>{const el=append(host,new Element('div'));el.textContent=String(spec.text||'');return el;}},
    toolbar:{create:(_host,spec={})=>{for(const a of spec.actions||[])actionSpecs.set(a.id,a);return{};}},
    field:{create:(host,spec={})=>{const control=append(host,new Element(spec.kind==='select'?'select':'input'));control.type=spec.kind==='select'?'select-one':String(spec.inputType||'text');control.value=spec.value===undefined?'':String(spec.value);fieldSpecs.set(spec.label,{spec,control});return{element:control,control};}},
    check:{create:(host,spec={})=>{const input=append(host,new Element('input'));input.type='checkbox';input.checked=!!spec.checked;checkSpecs.set(spec.label,{spec,input});return{element:input,input};}},
    prime:{build:spec=>spec},metric:{create:(host,spec={})=>{const element=append(host,new Element('div')),label=append(element,new Element('span')),value=append(element,new Element('strong'));label.textContent=String(spec.label||'');value.textContent=String(spec.value||'');const ref={element,label,value};metricRefs.set(spec.label,ref);return ref;}},
    scientificPlot:{create:(_target,spec)=>{const s={spec,renderCount:0,requestRender(){this.renderCount++;},dispose(){}};shadowPlots.push(s);return s;}},
    table:{mount:(id,_host,spec={})=>{const t={columns:spec.columns||[],rows:spec.rows||[],setData(c,r){this.columns=structuredClone(c);this.rows=structuredClone(r);},dispose(){}};shadowTables.set(id,t);return t;}},
    splitPane:{create:(_host,spec)=>({element:new Element('div'),spec,dispose(){}})}
  };
  const shadowPage=new Element('main');let shadowActivate=null;context.DKDSPlugins={define:(_manifest,activate)=>{shadowActivate=activate;}};
  vm.runInContext(read('examples/sdk151-unit-vth-shadow/plugin.js'),context,{filename:'unit-vth-shadow/plugin.js'});
  const shadowCtx={services:shadowService,status:{set(){}},ui:{dom:{create:(tag,spec={})=>{const el=new Element(tag);Object.assign(el,spec);return el;}},unitTemplates:units,pages:{add:()=>shadowPage},topWorkspace:{register(){}}}};
  const shadowRuntime=await shadowActivate(shadowCtx);await delay(30);await shadowRuntime.syncLiveState();
  const snapshot=live.snapshot().state,p=snapshot.state.parameters;
  assert.strictEqual(fieldSpecs.get('方法').control.value,p.method);assert.strictEqual(fieldSpecs.get('扫描段').control.value,p.branch);assert.strictEqual(fieldSpecs.get('目标电流 / A').control.value,String(p.targetCurrent));assert.strictEqual(checkSpecs.get('使用 |I|').input.checked,p.absoluteCurrent);assert.strictEqual(checkSpecs.get('对数显示').input.checked,p.logY);assert.strictEqual(checkSpecs.get('显示全部曲线').input.checked,p.showAllCurves);
  assert.strictEqual(metricRefs.get('Vth').value.textContent,snapshot.presentation.metrics.vth);assert.strictEqual(metricRefs.get('扫描段').value.textContent,snapshot.presentation.metrics.branch);assert.strictEqual(metricRefs.get('R²').value.textContent,snapshot.presentation.metrics.r2);assert.strictEqual(metricRefs.get('拟合点数').value.textContent,snapshot.presentation.metrics.n);
  assert.deepStrictEqual(shadowTables.get('vth-shadow-results').rows,snapshot.presentation.tableRows,'Unit result table must consume the production live presentation rows');
  const activePlot=shadowPlots.at(-1);assert.deepStrictEqual(activePlot.spec.getCurves(),snapshot.presentation.plot.curves,'Unit plot must consume production live curve/fit payload');assert.deepStrictEqual(activePlot.spec.getManipulators(),snapshot.presentation.plot.manipulators,'Unit plot manipulators must consume production result geometry');assert.strictEqual(activePlot.spec.yScaleType,snapshot.presentation.plot.yScaleType);

  fieldSpecs.get('目标电流 / A').spec.onChange({target:{value:'6e-10'}});await delay(40);const afterParameter=live.snapshot().state;assert.strictEqual(afterParameter.state.parameters.targetCurrent,6e-10,'Unit field must mutate the single production state owner');assert.strictEqual(fieldSpecs.get('目标电流 / A').control.value,'6e-10','production state notification must round-trip to the Unit field');
  fieldSpecs.get('当前曲线').spec.onChange({target:{value:'curve-b'}});await delay(30);assert.strictEqual(live.snapshot().state.selectedCurveId,'curve-b','Unit curve selector must update production selectedCurveId');
  const plotAfterSelect=shadowPlots.at(-1);plotAfterSelect.spec.onRangeSelect({x0:-.1,x1:.7});await delay(40);assert.deepStrictEqual(live.snapshot().state.state.manualWindows['curve-b'],[-.1,.7],'Unit range selection must update the production manual-window owner');
  plotAfterSelect.spec.setView({xDomain:[-1,1],yDomain:null});await delay(30);assert.deepStrictEqual(live.snapshot().state.state.view,{xDomain:[-1,1],yDomain:null},'Unit plot view must round-trip through production state');
  assert(shadowRuntime.shadowState.liveParity.numericDigest&&shadowRuntime.shadowState.liveParity.presentationDigest,'shadow must expose live numeric/presentation parity digests');

  shadowRuntime.deactivate();shadowService.dispose();prodRuntime.deactivate();owner.dispose();
  console.log(`SDK 1.51 Vth side-by-side live presentation PASS: curves=${snapshot.curves.length}, tableRows=${snapshot.presentation.tableRows.length}, Vth=${snapshot.result.vth}.`);
})().catch(error=>{console.error(error);process.exit(1);});
