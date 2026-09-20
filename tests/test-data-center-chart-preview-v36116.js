'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const pkg=JSON.parse(read('package.json'));


const modules=new Map();
const sandbox={
  console,
  window:{DKDSPluginModules:{define:(id,name,obj)=>modules.set(`${id}:${name}`,obj),get:(id,name)=>modules.get(`${id}:${name}`)||null},confirm:()=>true,prompt:()=>null},
  document:{},setTimeout,clearTimeout,requestAnimationFrame:fn=>fn()
};
sandbox.window.window=sandbox.window;sandbox.globalThis=sandbox.window;
vm.createContext(sandbox);
vm.runInContext(read('src/plugins/data-center/artifact-selection.js'),sandbox,{filename:'data-center/artifact-selection.js'});
vm.runInContext(read('src/plugins/data-center/command-runtime.js'),sandbox,{filename:'data-center/command-runtime.js'});
vm.runInContext(read('src/plugins/data-center/domain-runtime.js'),sandbox,{filename:'data-center/domain-runtime.js'});
vm.runInContext(read('src/plugins/data-center/chart-runtime.js'),sandbox,{filename:'data-center/chart-runtime.js'});
vm.runInContext(read('src/plugins/data-center/live-domain-bridge.js'),sandbox,{filename:'data-center/live-domain-bridge.js'});
vm.runInContext(read('src/plugins/data-center/feature-runtime.js'),sandbox,{filename:'data-center/feature-runtime.js'});
const feature=modules.get('builtin.data-center:feature-runtime');
assert(feature?.mount,'Data Center feature runtime must register a mount function.');

class FakeNode{
  constructor(name='node'){
    this.name=name;this.dataset={};this.style={};this.attrs={};this._innerHTML='';this.textContent='';this.value='';this.disabled=false;this.children=[];this.map=new Map();this.options=[];
    this.classList={contains:()=>false,toggle(){},add(){},remove(){}};
  }
  set innerHTML(value){
    this._innerHTML=String(value??'');this.children=[];
    if(this.name==='#dcChartProvider'||this.name==='#dcAssignmentFilter'){
      const rows=[...this._innerHTML.matchAll(/<option value="([^"]*)"[^>]*>/g)].map(m=>({value:m[1]}));
      this.options=rows;if(rows.length&&!rows.some(row=>row.value===this.value))this.value=rows[0].value;
    }
  }
  get innerHTML(){return this._innerHTML;}
  querySelector(selector){if(!this.map.has(selector))this.map.set(selector,new FakeNode(selector));return this.map.get(selector);}
  setAttribute(name,value){this.attrs[String(name)]=String(value);}
  getAttribute(name){return this.attrs[String(name)]??null;}
  querySelectorAll(){return [];}
  appendChild(node){this.children.push(node);return node;}
  before(){} closest(){return new FakeNode('closest');} remove(){} replaceChildren(...nodes){this.children=[...nodes];}
  addEventListener(){} removeEventListener(){}
  getBoundingClientRect(){return {left:0,bottom:0};}
}

const page=new FakeNode('page');
const handlers=new Map();
const noop=()=>{};
const artifact={
  id:'legacy-table:chart',kind:'data.table',name:'VG=0',rowCount:3,transient:true,
  columns:[
    {key:'Vd',name:'Vd',unit:'V',role:'x',values:[0,1,2]},
    {key:'Id',name:'Id',unit:'A',role:'y',values:[1e-9,2e-9,3e-9]},
    {key:'Vg',name:'Vg',unit:'V',role:'group',values:[0,0,0]}
  ],
  provenance:[{type:'import',label:'Legacy project restore'}],metadata:{adapter:'legacy-dataset',legacyDatasetPath:'legacy://VG=0',dataAssignments:['*']},source:{path:'legacy://VG=0'}
};
const state={schema:1,activeArtifactId:null,recipeName:'我的工作流',steps:[],savedRecipes:[],chart:{provider:'xy-line',parameters:{x:'missing-old-column',ys:['missing-old-column'],mode:'lines+markers'}}};
const stateStore={get:()=>state,subscribe:()=>noop};
const controller={store:stateStore,getState:()=>state,interaction:{bindView:()=>({dispose:noop})},select:noop};
const providers=[];
let reactCalls=0,lastTraces=null,lastLayout=null,lastSpec=null,resizeCalls=0,purgeCalls=0;
let artifactRows=[artifact];
const D={
  deepClone:value=>JSON.parse(JSON.stringify(value)),summarize:value=>({rows:value?.rowCount??0,columns:value?.columns?.length??0,provenance:value?.provenance?.length??0}),
  column:(table,key)=>(table?.columns||[]).find(c=>c.key===key)||null,
  seriesId:(table,key)=>String((table?.columns||[]).find(c=>c.key===key)?.id||(table?.columns||[]).find(c=>c.key===key)?.key||''),
  rowId:(table,index)=>Array.isArray(table?.rowIds)&&table.rowIds[index]!=null?String(table.rowIds[index]):`row:${index}`,
  isArtifact:value=>!!value?.kind,hashString:value=>String(value)
};
const defaults=(schema,initial={})=>{const out=JSON.parse(JSON.stringify(initial||{}));for(const field of schema?.fields||[])if(out[field.id]===undefined&&field.default!==undefined)out[field.id]=JSON.parse(JSON.stringify(field.default));return out;};
const ctx={
  manifest:{id:'builtin.data-center',version:'1.15.20'},
  modules:{require:name=>modules.get(`builtin.data-center:${name}`)},
  commands:{register:()=>noop,run:()=>Promise.resolve(true)},
  data:{model:D,formula:{},sources:{targets:()=>[]},entities:{projectArtifact:noop},artifacts:{listMetadata:()=>artifactRows.map(a=>({...a,artifactRevision:11,provenanceCount:a.provenance?.length||0,provenanceTypes:(a.provenance||[]).map(step=>step.type),columns:(a.columns||[]).map(c=>({id:c.key,key:c.key,name:c.name,unit:c.unit||'',role:c.role||'',dtype:'number',length:c.values.length,metadata:{}})),provenance:undefined})),columnMetadata:id=>(artifactRows.find(a=>a.id===id)?.columns||[]).map(c=>({id:c.key,key:c.key,name:c.name,unit:c.unit||'',role:c.role||'',dtype:'number',length:c.values.length,metadata:{}})),readColumnRange:(id,ref,{start=0,limit})=>{const a=artifactRows.find(row=>row.id===id),c=a?.columns?.find(row=>row.key===ref);return c?{values:c.values.slice(start,start+limit),start,end:Math.min(c.values.length,start+limit),length:Math.max(0,Math.min(limit,c.values.length-start)),totalLength:c.values.length,artifactRevision:11}:null;},get:id=>artifactRows.find(row=>row.id===id)||null,revision:()=>artifactRows.length?7:8,artifactRevision:()=>11,lineage:()=>({descendants:[]}),syncLegacy:noop}},
  ui:{
    activities:{add:noop},pages:{add:()=>page},dom:{
      query:(selector,root=page)=>root?.querySelector?.(selector)||null,
      all:(selector,root=page)=>Array.from(root?.querySelectorAll?.(selector)||[]),
      create:(tag='div',spec={})=>{const node=new FakeNode(tag);if(spec.html!==undefined)node.innerHTML=spec.html;if(spec.text!==undefined)node.textContent=String(spec.text);if(spec.dataset)Object.assign(node.dataset,spec.dataset);return node;},
      html:(node,value='')=>{if(node)node.innerHTML=value;return node;},append:(parent,...nodes)=>{for(const node of nodes.flat())parent?.appendChild?.(node);return parent;},replace:(parent,...nodes)=>{parent?.replaceChildren?.(...nodes.flat());return parent;},on:()=>noop,delegate:()=>noop,frame:fn=>fn?.()
    },actions:{mount:noop},topWorkspace:{register:noop},plotViews:{bind:noop},portable:{create:noop},styles:{add:noop},
    scientificPlot:{purge:()=>{purgeCalls+=1;return true;},react:async(_container,traces,layout,_config,spec)=>{reactCalls+=1;lastTraces=traces;lastLayout=layout;lastSpec=spec;return {ok:true};},resize:()=>{resizeCalls+=1;},get:()=>null},
    interactionBehaviors:{create:()=>({bind:noop})},tables:{bind:noop},contextMenus:{open:()=>null}
  },
  workflow:{processors:{register:noop,list:()=>[]},analyzers:{register:noop,list:()=>[]},recipes:{register:noop,list:()=>[]},buildSequentialRecipe:()=>({})},
  charts:{register:(id,spec)=>providers.push({id,...spec}),list:()=>providers.slice()},
  parameters:{defaults,render:(_host,_schema,{value}={})=>({getValue:()=>JSON.parse(JSON.stringify(value||{})),validate:()=>({ok:true}),destroy:noop})},
  runtime:{isAuxiliaryWindow:true},workspace:{openPage:()=>true},status:{set:noop},io:{clipboard:{writeText:noop}},platform:{onChange:()=>noop},
  events:{on:(name,fn)=>{const rows=handlers.get(name)||[];rows.push(fn);handlers.set(name,rows);}}
};
const views={pageHtml:()=>'',attach:()=>({
  workbench:{},
  mountParameterForm:(host,schema,options)=>ctx.parameters.render(host,schema,options),
  showPreviewTable:()=>true,
  showPreviewEmpty:message=>{const host=page.querySelector('#dcTablePreview');host.innerHTML=String(message||'');return true;},
  showPreviewJson:value=>{const host=page.querySelector('#dcTablePreview');host.innerHTML=String(value||'');return true;},
  renderFormulaRefs:()=>true
})};

(async()=>{
  const mounted=await feature.mount(ctx,controller,views,{});
  assert(providers.some(row=>row.id==='xy-line'),'Data Center must register the XY chart provider.');
  const changed=(handlers.get('data:artifacts-changed')||[])[0];
  assert(typeof changed==='function','Data Center must subscribe to Artifact refreshes.');
  changed({type:'replace'});
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  assert(reactCalls>0,'Selecting/hydrating a DataTable must automatically render the chart preview.');
  assert(Array.isArray(lastTraces)&&lastTraces.length===1,'Default chart preview must produce one Y trace.');
  assert(lastTraces[0].x.join(',')==='0,1,2','Default preview must select the valid X column after stale project parameters are repaired.');
  assert(lastTraces[0].y.join(',')==='1e-9,2e-9,3e-9','Default preview must select the valid Y column after stale project parameters are repaired.');
  assert(lastLayout?.xaxis?.title?.includes('Vd'),'Preview X axis must be bound to Vd.');
  assert(lastSpec?.renderKey?.includes(artifact.id),'Preview must use a stable ScientificPlot render key.');
  assert(resizeCalls>0,'Completed preview rendering must schedule a resize pass.');
  artifactRows=[];changed({type:'replace'});await Promise.resolve();await Promise.resolve();
  assert(purgeCalls>0,'Removing the last DataTable must purge the stale chart renderer.');
  assert(String(page.querySelector('#dcChart').innerHTML).includes('选择 DataTable'),'Empty Data Center must replace the old chart with an empty-state message.');
  mounted.deactivate();
  console.log('v3.61.18 Data Center automatic chart preview + stale parameter repair passed.');
})().catch(err=>{console.error(err?.stack||err);process.exit(2);});
