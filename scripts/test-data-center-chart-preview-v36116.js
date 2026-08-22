'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const pkg=JSON.parse(read('package.json'));
assert(pkg.version==='3.61.18','Application version must be 3.61.18.');

const modules=new Map();
const sandbox={
  console,
  window:{DKDSPluginModules:{define:(id,name,obj)=>modules.set(`${id}:${name}`,obj),get:()=>null},confirm:()=>true,prompt:()=>null},
  document:{},setTimeout,clearTimeout,requestAnimationFrame:fn=>fn()
};
sandbox.window.window=sandbox.window;sandbox.globalThis=sandbox.window;
vm.createContext(sandbox);
vm.runInContext(read('src/plugins/data-center/feature-runtime.js'),sandbox,{filename:'data-center/feature-runtime.js'});
const feature=modules.get('builtin.data-center:feature-runtime');
assert(feature?.mount,'Data Center feature runtime must register a mount function.');

class FakeNode{
  constructor(name='node'){
    this.name=name;this.dataset={};this.style={};this._innerHTML='';this.textContent='';this.value='';this.disabled=false;this.children=[];this.map=new Map();this.options=[];
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
  column:(table,key)=>(table?.columns||[]).find(c=>c.key===key)||null,isArtifact:value=>!!value?.kind,hashString:value=>String(value)
};
const defaults=(schema,initial={})=>{const out=JSON.parse(JSON.stringify(initial||{}));for(const field of schema?.fields||[])if(out[field.id]===undefined&&field.default!==undefined)out[field.id]=JSON.parse(JSON.stringify(field.default));return out;};
const ctx={
  data:{model:D,formula:{},sources:{targets:()=>[]},entities:{projectArtifact:noop},artifacts:{list:()=>artifactRows.slice(),get:id=>artifactRows.find(row=>row.id===id)||null,revision:()=>7,lineage:()=>({descendants:[]}),syncLegacy:noop}},
  ui:{
    activities:{add:noop},pages:{add:()=>page},dom:{create:()=>new FakeNode('created'),frame:fn=>fn?.()},actions:{mount:noop},topWorkspace:{register:noop},plotViews:{bind:noop},portable:{create:noop},styles:{add:noop},
    scientificPlot:{purge:()=>{purgeCalls+=1;return true;},react:async(_container,traces,layout,_config,spec)=>{reactCalls+=1;lastTraces=traces;lastLayout=layout;lastSpec=spec;return {ok:true};},resize:()=>{resizeCalls+=1;},get:()=>null},
    interactionBehaviors:{create:()=>({bind:noop})},tables:{bind:noop},contextMenus:{open:()=>null}
  },
  workflow:{processors:{register:noop,list:()=>[]},analyzers:{register:noop,list:()=>[]},recipes:{register:noop,list:()=>[]},buildSequentialRecipe:()=>({})},
  charts:{register:(id,spec)=>providers.push({id,...spec}),list:()=>providers.slice()},
  parameters:{defaults,render:(_host,_schema,{value}={})=>({getValue:()=>JSON.parse(JSON.stringify(value||{})),validate:()=>({ok:true}),destroy:noop})},
  runtime:{isAuxiliaryWindow:true},workspace:{openPage:()=>true},status:{set:noop},io:{clipboard:{writeText:noop}},platform:{onChange:()=>noop},
  events:{on:(name,fn)=>{const rows=handlers.get(name)||[];rows.push(fn);handlers.set(name,rows);}}
};
const views={pageHtml:()=>'',attach:()=>({registerPrime:noop})};

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
