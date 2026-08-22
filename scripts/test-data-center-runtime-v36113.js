'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const pkg=JSON.parse(read('package.json'));
assert(pkg.version==='3.61.14','Application version must be 3.61.14.');

// Execute the real Data Center feature module, then drive Core events. v3.61.12
// failed this lifecycle with `ReferenceError: dom is not defined`; its earlier
// string/data-model tests never executed the renderer mount/refresh path.
const modules=new Map();
const sandbox={
  console,
  window:{DKDSPluginModules:{define:(id,name,obj)=>modules.set(`${id}:${name}`,obj),get:()=>null},confirm:()=>true,prompt:()=>null},
  document:{},
  setTimeout,clearTimeout,
  requestAnimationFrame:fn=>fn()
};
sandbox.window.window=sandbox.window;
sandbox.globalThis=sandbox.window;
vm.createContext(sandbox);
vm.runInContext(read('src/plugins/data-center/feature-runtime.js'),sandbox,{filename:'data-center/feature-runtime.js'});
const feature=modules.get('builtin.data-center:feature-runtime');
assert(feature?.mount,'Data Center feature runtime must register a mount function.');

class FakeNode {
  constructor(name='node'){
    this.name=name;this.dataset={};this.style={};this._innerHTML='';this.textContent='';this.value='';this.disabled=false;this.options=[];this.children=[];this.map=new Map();
    this.classList={contains:()=>false,toggle(){},add(){},remove(){}};
  }
  set innerHTML(value){this._innerHTML=String(value??'');this.children=[];}
  get innerHTML(){return this._innerHTML;}
  querySelector(selector){if(!this.map.has(selector))this.map.set(selector,new FakeNode(selector));return this.map.get(selector);}
  querySelectorAll(){return [];}
  appendChild(node){this.children.push(node);return node;}
  before(){}
  closest(){return new FakeNode('closest');}
  remove(){}
  replaceChildren(...nodes){this.children=[...nodes];}
  getBoundingClientRect(){return {left:0,bottom:0};}
}
const page=new FakeNode('page');
const handlers=new Map();
const noop=()=>{};
const artifact={
  id:'legacy-table:test',kind:'data.table',name:'VG=0',rowCount:2,transient:true,
  columns:[
    {key:'Vd',name:'Vd',unit:'V',role:'x',values:[0,1]},
    {key:'Id',name:'Id',unit:'A',role:'y',values:[1e-9,2e-9]}
  ],
  provenance:[{type:'import',label:'Legacy project restore'}],
  metadata:{adapter:'legacy-dataset',legacyDatasetPath:'legacy://VG=0',dataAssignments:['*']},
  source:{path:'legacy://VG=0'}
};
const state={schema:1,activeArtifactId:null,recipeName:'我的工作流',steps:[],savedRecipes:[],chart:{provider:'xy-line',parameters:{mode:'lines+markers'}}};
const stateStore={get:()=>state,subscribe:()=>noop};
const controller={store:stateStore,getState:()=>state,interaction:{bindView:()=>({dispose:noop})},select:noop};
let frameCalls=0;
let resizeCalls=0;
const D={
  deepClone:value=>JSON.parse(JSON.stringify(value)),
  summarize:value=>({rows:value?.rowCount??0,columns:value?.columns?.length??0,provenance:value?.provenance?.length??0}),
  column:(table,key)=>(table?.columns||[]).find(c=>c.key===key)||null,
  isArtifact:value=>!!value?.kind,
  hashString:value=>String(value)
};
const ctx={
  data:{
    model:D,formula:{},sources:{targets:()=>[]},
    artifacts:{list:()=>[artifact],get:id=>id===artifact.id?artifact:null,revision:()=>1,lineage:()=>({descendants:[]}),syncLegacy:()=>null}
  },
  ui:{
    activities:{add:noop},pages:{add:()=>page},
    dom:{create:()=>new FakeNode('created'),frame:fn=>{frameCalls+=1;return fn?.();}},
    actions:{mount:noop},topWorkspace:{register:noop},plotViews:{bind:noop},portable:{create:noop},
    scientificPlot:{resize:()=>{resizeCalls+=1;},get:()=>null},styles:{add:noop},
    interactionBehaviors:{create:()=>({bind:noop})},tables:{bind:noop},contextMenus:{open:()=>null}
  },
  workflow:{processors:{register:noop,list:()=>[]},analyzers:{register:noop,list:()=>[]},recipes:{register:noop,list:()=>[]},buildSequentialRecipe:()=>({})},
  charts:{register:noop,list:()=>[]},
  parameters:{defaults:(_schema,value)=>value||{},render:(_host,_schema,{value}={})=>({getValue:()=>value||{},validate:()=>({ok:true}),destroy:noop})},
  runtime:{isAuxiliaryWindow:true},workspace:{openPage:()=>true},status:{set:noop},
  io:{clipboard:{writeText:noop}},platform:{onChange:()=>noop},
  events:{on:(name,fn)=>{const rows=handlers.get(name)||[];rows.push(fn);handlers.set(name,rows);}}
};
const views={pageHtml:()=>'',attach:()=>({registerPrime:noop})};

(async()=>{
  const mounted=await feature.mount(ctx,controller,views,{});
  assert(mounted?.deactivate,'Data Center mount must return a disposable runtime.');

  const layout=(handlers.get('layout:resize')||[])[0];
  assert(typeof layout==='function','Data Center must subscribe to Core layout resize.');
  layout();
  assert(frameCalls>0,'Data Center layout callback must route work through ctx.ui.dom.frame().');
  assert(resizeCalls>0,'Data Center layout callback must reach ScientificPlot resize without throwing.');

  const changed=(handlers.get('data:artifacts-changed')||[])[0];
  assert(typeof changed==='function','Data Center must subscribe to Artifact changes.');
  changed({type:'replace'});
  const list=page.querySelector('#dcArtifactList');
  const count=page.querySelector('#dcArtifactCount');
  assert(count.textContent==='1 个',`Data Center must render the live Artifact count, got ${JSON.stringify(count.textContent)}.`);
  assert(list.children.length===1,'Data Center must render one Artifact row after a Core data refresh.');
  assert(list.children[0].innerHTML.includes('VG=0'),'Rendered Artifact row must expose the source table name.');
  assert(page.querySelector('#dcActiveName').textContent==='VG=0','Data Center preview must activate the first DataTable.');

  mounted.deactivate();
  console.log('v3.61.14 Data Center executable mount + Artifact render smoke passed.');
})().catch(err=>{console.error(err?.stack||err);process.exit(2);});
