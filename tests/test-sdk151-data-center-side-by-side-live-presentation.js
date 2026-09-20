'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

class ClassList{
  constructor(){this.rows=new Set();}
  add(...rows){for(const row of rows)this.rows.add(String(row));}
  remove(...rows){for(const row of rows)this.rows.delete(String(row));}
  toggle(row,on){if(on===undefined)on=!this.rows.has(String(row));on?this.rows.add(String(row)):this.rows.delete(String(row));return !!on;}
  contains(row){return this.rows.has(String(row));}
}
class Element{
  constructor(tag='div'){
    this.tagName=String(tag).toUpperCase();this.nodeType=1;this.children=[];this.parentNode=null;this.parentElement=null;this.dataset={};this.attributes={};this.listeners={};this.classList=new ClassList();this.textContent='';this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.role='';this.id='';
  }
  appendChild(node){if(!node)return node;this.children.push(node);node.parentNode=this;node.parentElement=this;return node;}
  append(...rows){for(const row of rows){if(row&&typeof row==='object')this.appendChild(row);else if(row!=null){const text=new Element('span');text.textContent=String(row);this.appendChild(text);}}}
  replaceChildren(...rows){this.children=[];for(const row of rows)this.appendChild(row);}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(row=>row!==this);this.parentNode=this.parentElement=null;}
  setAttribute(k,v){this.attributes[String(k)]=String(v);if(k==='role')this.role=String(v);if(k==='id')this.id=String(v);}
  getAttribute(k){return this.attributes[String(k)]??null;}
  addEventListener(k,fn){(this.listeners[k]||(this.listeners[k]=[])).push(fn);}
  dispatchEvent(event){for(const fn of this.listeners[event?.type]||[])fn.call(this,event);return true;}
  querySelectorAll(selector){const out=[];const match=node=>selector==='[role=tab]'?node.getAttribute?.('role')==='tab':false;const walk=node=>{for(const child of node.children||[]){if(match(child))out.push(child);walk(child);}};walk(this);return out;}
}
const find=(rootEl,predicate)=>{if(!rootEl)return null;if(predicate(rootEl))return rootEl;for(const child of rootEl.children||[]){const hit=find(child,predicate);if(hit)return hit;}return null;};

const context={console,structuredClone,setTimeout,clearTimeout,Promise};context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(read('src/core/services/service-runtime.js'),context,{filename:'service-runtime.js'});
const modules=new Map();context.DKDSPluginModules={define:(owner,name,value)=>modules.set(`${owner}:${name}`,value),get:(owner,name)=>modules.get(`${owner}:${name}`)||null};
vm.runInContext(read('src/plugins/data-center/domain-runtime.js'),context,{filename:'data-center/domain-runtime.js'});
vm.runInContext(read('src/plugins/data-center/domain-adapter.js'),context,{filename:'data-center/domain-adapter.js'});
const DomainRuntime=modules.get('builtin.data-center:domain-runtime'),DomainAdapter=modules.get('builtin.data-center:domain-adapter');
assert(DomainRuntime?.create&&DomainAdapter?.provide,'Data Center live-domain modules must load.');

const clone=value=>structuredClone(value);
const tableA={id:'table:a',name:'device83 · sweep',kind:'data.table',artifactRevision:7,rowCount:4,columns:[
  {id:'Vd',key:'Vd',name:'Vd',unit:'V',role:'x',values:[-1,0,1,2]},
  {id:'Id',key:'Id',name:'Id',unit:'A',role:'y',values:[1e-9,2e-9,3e-9,4e-9]},
  {id:'Vg',key:'Vg',name:'Vg',unit:'V',role:'group',values:[20,20,20,20]}
],metadata:{importedSource:true,dataAssignments:['builtin.resonance-workbench']},provenance:[{timestamp:'2026-09-13T10:00:00Z',type:'import',label:'Import',pluginId:'builtin.flexible-import',providerId:'csv',version:'1.0.0',parameters:{delimiter:','}}],lineage:{parents:[]}};
const tableB={...clone(tableA),id:'table:b',name:'device83 · derived resistance',artifactRevision:3,metadata:{importedSource:false,dataAssignments:[]},provenance:[...tableA.provenance,{timestamp:'2026-09-13T10:05:00Z',type:'process',label:'Derived column',pluginId:'builtin.data-center',providerId:'formula.derived-column',version:'1.15.21',parameters:{formula:'abs(Vd / Id)'}}],lineage:{parents:['table:a']}};
const artifacts=new Map([[tableA.id,tableA],[tableB.id,tableB]]);
const artifactStore={
  get:id=>artifacts.get(String(id))||null,
  listMetadata:()=>[...artifacts.values()].map(a=>({...clone(a),columns:a.columns.map(c=>({...c,values:undefined})),provenance:undefined,provenanceCount:a.provenance.length})),
  columnMetadata:id=>(artifacts.get(String(id))?.columns||[]).map(c=>({id:c.id,key:c.key,name:c.name,unit:c.unit,role:c.role,length:c.values.length})),
  readColumnRange:(id,ref,{start=0,limit=18}={})=>{const a=artifacts.get(String(id)),c=(a?.columns||[]).find(row=>String(row.id)===String(ref)||String(row.key)===String(ref));return {values:(c?.values||[]).slice(start,start+limit)};}
};
const D={deepClone:clone,summarize:a=>({rows:a?.rowCount||0,columns:a?.columns?.length||0,provenance:a?.provenance?.length||a?.provenanceCount||0}),isArtifact:value=>!!value?.kind};
let activeId='table:a',filters={assignment:'all',lineage:'all',field:''},multiSelect=true,activeTool='formula';
let selection={schema:'test',revision:1,items:[{type:'data-center.artifact',id:'table:a',ref:{artifactId:'table:a'}}],focus:{type:'data-center.artifact',id:'table:a'},ranges:[],context:{},source:'test'};
let formulaValue={name:'Derived',formula:'abs(Vd / Id)',unit:'',role:'derived',replace:false};
let workflowStatus={state:'idle',text:'尚未运行。'};
const state={schema:1,activeArtifactId:'table:a',recipeName:'我的工作流',steps:[{id:'step-1',type:'processor',provider:'table.finite-rows',parameters:{columns:['Vd','Id'],mode:'all'}}],savedRecipes:[{id:'recipe-1',name:'当前工程 Recipe',nodes:[]}],chart:{provider:'xy-line',parameters:{x:'Vd',ys:['Id'],mode:'lines+markers',showLegend:true}}};
let lastExecution=null,outputArtifact=tableA;const actionCalls=[];
const metadataRows=()=>[...artifacts.values()].map(a=>({id:a.id,name:a.name,kind:a.kind,artifactRevision:a.artifactRevision,rowCount:a.rowCount,provenanceCount:a.provenance.length,metadata:a.metadata,lineage:a.lineage}));
const domain=DomainRuntime.create({model:D,artifacts:artifactStore,controller:{getSelection:()=>clone(selection)},getState:()=>state,getFilters:()=>filters,getMultiSelect:()=>multiSelect,getActiveTool:()=>activeTool,getWorkflowStatus:()=>workflowStatus,formulaState:()=>({value:formulaValue,refs:(artifacts.get(activeId)?.columns||[]).map(c=>c.key)}),workflowStepView:step=>({...clone(step),providerName:step.provider==='table.finite-rows'?'有限值筛选':step.provider,parameterSchema:{fields:[{id:'columns',type:'columns',label:'检查列'},{id:'mode',type:'select',label:'保留条件',options:[{value:'all',label:'全部有限'}]}]}}),workflowProviderOptions:()=>({processors:[{id:'table.finite-rows',name:'有限值筛选'}],analyzers:[{id:'table.summary',name:'列统计摘要'}]}),assignmentTargets:()=>[{id:'builtin.resonance-workbench',label:'共振分析',icon:'∿'}],availableFields:()=>[{field:'Vd',count:2},{field:'Id',count:2},{field:'Vg',count:2}],visibleArtifacts:()=>metadataRows(),activeMeta:()=>metadataRows().find(a=>a.id===activeId)||null,activeArtifact:()=>artifacts.get(activeId)||null,currentOutputArtifact:()=>outputArtifact,lastExecution:()=>lastExecution,chartProviders:()=>[{id:'xy-line',name:'XY 多序列图',inputKinds:['data.table']}],isExcluded:a=>!!a?.metadata?.excluded,artifactAssignments:a=>a?.metadata?.dataAssignments||[],assignmentSummary:a=>(a?.metadata?.dataAssignments||[]).includes('builtin.resonance-workbench')?'共振分析':'仅数据中心',artifactOrigin:a=>a?.lineage?.parents?.length?'derived':'raw',artifactFields:a=>(a?.columns||[]).map(c=>c.name),actions:{
  refresh:()=>true,
  setFilters:p=>{actionCalls.push(['setFilters',clone(p)]);filters={...filters,...p};return true;},
  setMultiSelect:p=>{actionCalls.push(['setMultiSelect',clone(p)]);multiSelect=!!p.value;return true;},
  activateArtifact:p=>{actionCalls.push(['activateArtifact',clone(p)]);activeId=String(p.id);state.activeArtifactId=activeId;outputArtifact=artifacts.get(activeId);selection={...selection,items:[{type:'data-center.artifact',id:activeId,ref:{artifactId:activeId}}],focus:{type:'data-center.artifact',id:activeId}};return true;},
  selectAll:()=>{selection={...selection,items:metadataRows().map(a=>({type:'data-center.artifact',id:a.id,ref:{artifactId:a.id}}))};return true;},invertSelection:()=>true,clearSelection:()=>{selection={...selection,items:[],focus:null};return true;},
  toggleArtifactSelection:p=>{actionCalls.push(['toggleArtifactSelection',clone(p)]);const ids=new Set(selection.items.map(row=>row.id));p.checked?ids.add(String(p.id)):ids.delete(String(p.id));selection={...selection,items:[...ids].map(id=>({type:'data-center.artifact',id,ref:{artifactId:id}}))};return true;},
  renameArtifact:p=>{actionCalls.push(['renameArtifact',clone(p)]);const a=artifacts.get(String(p.id));if(a)a.name=String(p.name);return true;},setArtifactAssignments:()=>true,toggleAssignmentForArtifacts:p=>{actionCalls.push(['toggleAssignmentForArtifacts',clone(p)]);return true;},setArtifactsExcluded:p=>{actionCalls.push(['setArtifactsExcluded',clone(p)]);for(const id of p.ids||[])artifacts.get(id).metadata.excluded=!!p.value;return true;},deleteArtifacts:()=>true,exportActiveTableCsv:()=>{actionCalls.push(['exportActiveTableCsv']);return true;},
  switchTab:p=>{actionCalls.push(['switchTab',clone(p)]);activeTool=String(p.tab||p||'formula');return true;},setFormulaParameters:p=>{actionCalls.push(['setFormulaParameters',clone(p)]);formulaValue=clone(p.value||p);return true;},deriveFormula:p=>{actionCalls.push(['deriveFormula',clone(p)]);lastExecution={id:'exec-formula',status:'done',outputs:{result:outputArtifact}};return outputArtifact;},
  setRecipeName:p=>{actionCalls.push(['setRecipeName',clone(p)]);state.recipeName=String(p.value);return true;},addStep:p=>{actionCalls.push(['addStep',clone(p)]);state.steps.push({id:`step-${state.steps.length+1}`,type:p.type,provider:p.provider,parameters:{}});return true;},setStepParameters:p=>{actionCalls.push(['setStepParameters',clone(p)]);state.steps[p.index].parameters=clone(p.value);return true;},moveStep:p=>{actionCalls.push(['moveStep',clone(p)]);const target=p.index+Math.sign(p.direction);if(target>=0&&target<state.steps.length)[state.steps[p.index],state.steps[target]]=[state.steps[target],state.steps[p.index]];return true;},removeStep:p=>{actionCalls.push(['removeStep',clone(p)]);state.steps.splice(p.index,1);return true;},runWorkflow:()=>{actionCalls.push(['runWorkflow']);workflowStatus={state:'done',text:'完成 · 1 步 · 保存 1 个结果对象'};lastExecution={id:'exec-1',status:'done',outputs:{result:outputArtifact}};return true;},saveRecipe:()=>{actionCalls.push(['saveRecipe']);return true;},loadRecipe:p=>{actionCalls.push(['loadRecipe',clone(p)]);return true;},copyProvenance:()=>{actionCalls.push(['copyProvenance']);return true;},setChartProvider:p=>{actionCalls.push(['setChartProvider',clone(p)]);state.chart.provider=String(p.value||p);return true;},setChartParameters:p=>{actionCalls.push(['setChartParameters',clone(p)]);state.chart.parameters=clone(p.value||p);return true;}
}});
const owner=context.DKDSServices.createScope('builtin.data-center');
DomainAdapter.provide({services:owner,events:{on:()=>()=>{}}},{domain},{subscribe:()=>()=>{}});
const shadowScope=context.DKDSServices.createScope('com.example.unit-data-center-shadow',{dependencies:['builtin.data-center']});

const actions=new Map(),forms=new Map(),tables=new Map(),checks=[],tabButtons=[],menus=[],contributions=[],chartCalls=[];
const rootPage=new Element('div');
const append=(host,node)=>{host?.appendChild?.(node);return node;};
const captureActions=rows=>{for(const row of rows||[])if(row?.id)actions.set(String(row.id),row);};
const units={
  page:{create:host=>({element:append(host,new Element('section'))})},
  pageHeader:{create:(host,spec)=>{captureActions(spec.actions);const element=append(host,new Element('header')),title=append(element,new Element('h2'));title.textContent=spec.title||'';return {element,title};}},
  workspace:{create:()=>({compose(spec){this.spec=spec;},dispose(){}})},
  layout:{create:(host)=>append(host,new Element('div')),apply:target=>target},
  panel:{detached:(spec={})=>{const element=new Element('section');let header=null,body=element;if(spec.header!==false){header=units.header.create(element,{title:spec.title||'',meta:spec.meta,actions:spec.actions||[],actionHost:true});body=append(element,new Element('div'));}return {element,header,body};},create:(host,spec={})=>{const element=append(host,new Element('section')),header=units.header.create(element,{title:spec.title||'',meta:spec.meta,actions:spec.actions||[],actionHost:true}),body=append(element,new Element('div'));return {element,header,body};}},
  header:{create:(host,spec={})=>{captureActions(spec.actions);const element=append(host,new Element('header')),title=append(element,new Element('span'));title.textContent=spec.title||'';let meta=null;if(spec.meta!==undefined){meta=append(title,new Element('small'));meta.textContent=String(spec.meta||'');}const actionsEl=append(element,new Element('span')),actionHost=spec.actionHost?append(actionsEl,new Element('span')):null;return {element,title,meta,actions:actionsEl,actionHost};}},
  toolbar:{create:(host,spec={})=>{captureActions(spec.actions);return {element:append(host,new Element('div'))};}},
  action:{create:(host,spec={})=>{actions.set(String(spec.id),spec);const element=append(host,new Element('button'));element.textContent=String(spec.label||spec.id||'');return {element};}},
  field:{create:(host,spec={})=>{const element=append(host,new Element('div')),control=append(element,new Element(spec.kind==='select'?'select':'input'));control.value=String(spec.value??'');control.onChange=spec.onChange;for(const row of spec.options||[]){const item=row&&typeof row==='object'?row:{value:row,label:row},option=append(control,new Element('option'));option.value=String(item.value??'');option.textContent=String(item.label??item.value??'');}return {element,control};}},
  check:{create:(host,spec={})=>{const element=append(host,new Element('label')),input=append(element,new Element('input'));input.checked=!!spec.checked;input.onChange=spec.onChange;checks.push(input);return {element,input};}},
  chip:{create:(host,spec={})=>{const el=append(host,new Element(spec.interactive?'button':'span'));el.textContent=String(spec.text||'');el.onInvoke=spec.onInvoke;return el;}},
  note:{create:(host,spec={})=>{const el=append(host,new Element('div'));el.textContent=String(spec.text||'');return el;}},
  status:{create:(host,spec={})=>{const el=append(host,new Element('div'));el.textContent=String(spec.text||'');return el;}},
  list:{create:host=>({element:append(host,new Element('div'))}),item:(host,spec={})=>{const el=append(host,new Element(spec.tagName||'div'));for(const row of Array.isArray(spec.content)?spec.content:[spec.content])if(row)el.appendChild(row);el.onInvoke=spec.onInvoke;return el;}},
  section:{create:(host)=>{const element=append(host,new Element('section')),body=append(element,new Element('div'));return {element,body};}},
  tabs:{create:(host,spec={})=>{const element=append(host,new Element('div')),tabs=append(element,new Element('div'));for(const row of spec.items||[]){const b=append(tabs,new Element('button'));b.textContent=String(row.label||'');b.setAttribute('role','tab');b.onClick=row.onClick;tabButtons.push(b);}return {element,tabs};}},
  parameterForm:{mount:(_host,schema={},options={})=>{const id=String(schema.fields?.[0]?.id||`form-${forms.size}`),form={schema,value:clone(options.value||{}),onChange:options.onChange,setValue(value){this.value=clone(value||{});},getValue(){return clone(this.value);},destroy(){},dispose(){}};forms.set(id,form);return form;}},
  table:{mount:(id,_host,spec={})=>{const table={columns:clone(spec.columns||[]),rows:clone(spec.rows||[]),setData(columns,rows){this.columns=clone(columns||[]);this.rows=clone(rows||[]);},dispose(){}};tables.set(id,table);return table;},bind:(id,_table,spec={})=>{const table={columns:clone(spec.columns||[]),rows:clone(spec.rows||[]),setData(columns,rows){this.columns=clone(columns||[]);this.rows=clone(rows||[]);},dispose(){}};tables.set(id,table);return table;}},
  prime:{build:spec=>spec},plotView:{adopt:()=>({dispose(){}})},scientificPlot:{create:(target,spec={})=>({target,spec,dispose(){}})},
  dialog:{prompt:async spec=>spec.value,confirm:async()=>true},menu:{open:spec=>{menus.push(spec);return spec;},contribute:spec=>{contributions.push(spec);return spec;}},
  state:{set:(target,state,value)=>{const node=target?.element||target;if(node?.dataset)node.dataset[`state${state}`]=String(value);return target;}}
};
const dom={create:(tag,spec={})=>{const el=new Element(tag);if(spec.text!==undefined)el.textContent=String(spec.text);if(spec.textContent!==undefined)el.textContent=String(spec.textContent);return el;}};
let shadowActivate=null;context.DKDSPlugins={define:(_manifest,activate)=>{shadowActivate=activate;}};
vm.runInContext(read('examples/sdk151-unit-data-center-shadow/plugin.js'),context,{filename:'unit-data-center-shadow/plugin.js'});
assert.strictEqual(typeof shadowActivate,'function','Data Center Unit shadow activation must be available.');
const chartProvider={id:'xy-line',name:'XY 多序列图',render:({container,artifact,parameters})=>{chartCalls.push({artifactId:artifact.id,parameters:clone(parameters)});container.dataset.renderedArtifact=artifact.id;return true;}};
const shadowCtx={services:shadowScope,status:{set(){}},data:{artifacts:artifactStore},charts:{list:()=>[chartProvider]},ui:{dom,unitTemplates:units,pages:{add:()=>rootPage}}};

(async()=>{
  const runtime=await shadowActivate(shadowCtx);await runtime.syncLiveState();
  const snap=runtime.shadowState.liveSnapshot,parity=runtime.shadowState.liveParity;
  assert.strictEqual(parity.artifactCount,2,'Unit side-by-side must show the production artifact catalog.');
  assert.strictEqual(parity.activeArtifactId,'table:a','Unit side-by-side must show the production active artifact.');
  assert.strictEqual(parity.previewRows,4,'Unit side-by-side must show the same bounded preview row count.');
  assert.deepStrictEqual(Array.from(parity.selectionIds||[]),['table:a'],'Unit artifact selection must mirror the production controller selection.');
  assert.deepStrictEqual(Array.from(parity.formulaRefs||[]),['Vd','Id','Vg'],'Unit formula refs must mirror production columns.');
  assert.strictEqual(parity.formulaValue.formula,'abs(Vd / Id)','Unit formula controls must mirror production formula state.');
  assert.strictEqual(parity.workflowSteps,1,'Unit workflow list must mirror production steps.');
  assert.strictEqual(parity.provenanceRows,1,'Unit provenance must mirror production provenance.');
  assert.strictEqual(parity.chartProvider,'xy-line','Unit chart provider must mirror production chart state.');
  assert.strictEqual(parity.chartArtifactId,'table:a','Unit chart must consume the same production artifact owner.');
  assert(chartCalls.some(row=>row.artifactId==='table:a'&&row.parameters.x==='Vd'),'Unit chart must invoke the production Chart Provider with production artifact/parameters.');
  assert.strictEqual(tables.get('data-center-shadow-preview').rows.length,4,'Unit Table must contain the same visible bounded rows as production.');

  await actions.get('multi').onInvoke();assert.strictEqual(multiSelect,false,'Visible Unit multi-select action must mutate the production owner.');
  await actions.get('derive').onInvoke();assert(actionCalls.some(row=>row[0]==='deriveFormula'),'Visible Unit derive action must call the production formula owner.');
  await actions.get('add-step').onInvoke();assert.strictEqual(state.steps.length,2,'Visible Unit add-step action must mutate the production workflow owner.');
  await actions.get('copy').onInvoke();assert(actionCalls.some(row=>row[0]==='copyProvenance'),'Visible Unit provenance action must call the production owner.');
  const formulaTab=tabButtons.find(node=>node.textContent==='工作流');assert(formulaTab?.onClick,'Unit workflow tab must be interactive.');await formulaTab.onClick();assert.strictEqual(activeTool,'workflow','Unit tab action must mutate the production view owner.');

  const chartForm=forms.get('x');chartForm.onChange({x:'Vd',ys:['Id'],mode:'lines',showLegend:false});await new Promise(resolve=>setTimeout(resolve,0));assert.strictEqual(state.chart.parameters.mode,'lines','Unit chart parameter change must round-trip to the production chart owner.');
  const firstCheck=checks.slice(-Math.max(1,Number(snap.artifacts?.length)||1))[0];assert(firstCheck,'Unit artifact checkbox must be live.');firstCheck.onChange({target:{checked:false}});await new Promise(resolve=>setTimeout(resolve,0));assert(!selection.items.some(row=>row.id==='table:a'),'Unit artifact checkbox must mutate production Selection.');

  activeId='table:b';state.activeArtifactId='table:b';outputArtifact=tableB;activeTool='provenance';selection={...selection,items:[{type:'data-center.artifact',id:'table:b',ref:{artifactId:'table:b'}}],focus:{type:'data-center.artifact',id:'table:b'}};domain.notify('production-direct-change');await new Promise(resolve=>setTimeout(resolve,0));
  assert.strictEqual(runtime.shadowState.liveParity.activeArtifactId,'table:b','Direct production changes must propagate through live subscription without a shadow action.');
  assert.strictEqual(runtime.shadowState.activeTab,'provenance','Production tab/view state must project into Unit presentation.');
  assert(chartCalls.some(row=>row.artifactId==='table:b'),'Stale chart transition must render the new production artifact instead of retaining the prior chart.');

  workflowStatus={state:'running',text:'正在运行…'};domain.notify('workflow-running');await new Promise(resolve=>setTimeout(resolve,0));assert.strictEqual(runtime.shadowState.liveParity.workflowStatus,'running','Workflow loading/running state must project live.');
  workflowStatus={state:'error',text:'失败：test'};domain.notify('workflow-error');await new Promise(resolve=>setTimeout(resolve,0));assert.strictEqual(runtime.shadowState.liveParity.workflowStatus,'error','Workflow error state must project live.');

  const saved=[...artifacts.entries()];artifacts.clear();activeId='';state.activeArtifactId='';outputArtifact=null;selection={...selection,items:[],focus:null};domain.notify('empty');await new Promise(resolve=>setTimeout(resolve,0));assert.strictEqual(runtime.shadowState.liveParity.artifactCount,0,'Empty production artifact state must project live.');assert.strictEqual(tables.get('data-center-shadow-preview').rows.length,0,'Unit table must clear stale rows when production becomes empty.');
  for(const [id,row] of saved)artifacts.set(id,row);

  assert(runtime.shadowState.chartRenderCount>=2,'Side-by-side chart must re-render across live artifact changes.');
  runtime.deactivate();shadowScope.dispose();owner.dispose();
  console.log('SDK 1.51 Data Center side-by-side live presentation PASS');
})().catch(error=>{console.error(error?.stack||error);process.exit(1);});
