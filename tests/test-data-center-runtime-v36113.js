'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const pkg=JSON.parse(read('package.json'));


// Execute the real Data Center feature module, then drive Core events. v3.61.12
// failed this lifecycle with `ReferenceError: dom is not defined`; its earlier
// string/data-model tests never executed the renderer mount/refresh path.
const modules=new Map();
const sandbox={
  console,
  window:{DKDSPluginModules:{define:(id,name,obj)=>modules.set(`${id}:${name}`,obj),get:(id,name)=>modules.get(`${id}:${name}`)||null},confirm:()=>true,prompt:()=>null},
  document:{},
  setTimeout,clearTimeout,
  requestAnimationFrame:fn=>fn()
};
sandbox.window.window=sandbox.window;
sandbox.globalThis=sandbox.window;
vm.createContext(sandbox);
vm.runInContext(read('src/plugins/data-center/artifact-selection.js'),sandbox,{filename:'data-center/artifact-selection.js'});
vm.runInContext(read('src/plugins/data-center/command-runtime.js'),sandbox,{filename:'data-center/command-runtime.js'});
vm.runInContext(read('src/plugins/data-center/domain-runtime.js'),sandbox,{filename:'data-center/domain-runtime.js'});
vm.runInContext(read('src/plugins/data-center/chart-runtime.js'),sandbox,{filename:'data-center/chart-runtime.js'});
vm.runInContext(read('src/plugins/data-center/live-domain-bridge.js'),sandbox,{filename:'data-center/live-domain-bridge.js'});
vm.runInContext(read('src/plugins/data-center/feature-runtime.js'),sandbox,{filename:'data-center/feature-runtime.js'});
const feature=modules.get('builtin.data-center:feature-runtime');
assert(feature?.mount,'Data Center feature runtime must register a mount function.');

class FakeNode {
  constructor(name='node'){
    this.name=name;this.dataset={};this.style={};this.attrs={};this._innerHTML='';this.textContent='';this.value='';this.disabled=false;this.options=[];this.children=[];this.map=new Map();
    this.classList={contains:()=>false,toggle(){},add(){},remove(){}};
  }
  set innerHTML(value){this._innerHTML=String(value??'');this.children=[];}
  get innerHTML(){return this._innerHTML;}
  querySelector(selector){if(!this.map.has(selector))this.map.set(selector,new FakeNode(selector));return this.map.get(selector);}
  setAttribute(name,value){this.attrs[String(name)]=String(value);}
  getAttribute(name){return this.attrs[String(name)]??null;}
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
  seriesId:(table,key)=>String((table?.columns||[]).find(c=>c.key===key)?.id||(table?.columns||[]).find(c=>c.key===key)?.key||''),
  rowId:(table,index)=>Array.isArray(table?.rowIds)&&table.rowIds[index]!=null?String(table.rowIds[index]):`row:${index}`,
  isArtifact:value=>!!value?.kind,
  hashString:value=>String(value)
};
let catalogRows=[artifact];
const metadataSnapshot=a=>({...a,artifactRevision:1,provenanceCount:a.provenance?.length||0,provenanceTypes:(a.provenance||[]).map(step=>step.type),columns:(a.columns||[]).map(c=>({id:c.key,key:c.key,name:c.name,unit:c.unit,role:c.role,dtype:'number',length:c.values.length,metadata:{}})),provenance:undefined});
const ctx={
  manifest:{id:'builtin.data-center',version:'1.15.37'},
  modules:{require:name=>modules.get(`builtin.data-center:${name}`)},
  commands:{register:()=>noop,run:()=>Promise.resolve(true)},
  data:{
    model:D,formula:{},sources:{targets:()=>[]},
    artifacts:{listMetadata:()=>catalogRows.map(metadataSnapshot),columnMetadata:()=>artifact.columns.map(c=>({id:c.key,key:c.key,name:c.name,unit:c.unit,role:c.role,dtype:'number',length:c.values.length,metadata:{}})),readColumnRange:(_id,ref,{start=0,limit})=>{const c=artifact.columns.find(row=>row.key===ref)||artifact.columns[0];return {values:c.values.slice(start,start+limit),start,end:Math.min(c.values.length,start+limit),length:Math.min(limit,c.values.length-start),totalLength:c.values.length,artifactRevision:1};},get:id=>catalogRows.find(row=>row.id===id)||null,revision:()=>1,artifactRevision:()=>1,lineage:()=>({descendants:[]}),syncLegacy:()=>null}
  },
  ui:{
    activities:{add:noop},pages:{add:()=>page},
    dom:{
      query:(selector,root=page)=>root?.querySelector?.(selector)||null,
      all:(selector,root=page)=>Array.from(root?.querySelectorAll?.(selector)||[]),
      create:(tag='div',spec={})=>{const node=new FakeNode(tag);if(spec.html!==undefined)node.innerHTML=spec.html;if(spec.text!==undefined)node.textContent=String(spec.text);if(spec.dataset)Object.assign(node.dataset,spec.dataset);return node;},
      html:(node,value='')=>{if(node)node.innerHTML=value;return node;},
      append:(parent,...nodes)=>{for(const node of nodes.flat())parent?.appendChild?.(node);return parent;},
      replace:(parent,...nodes)=>{parent?.replaceChildren?.(...nodes.flat());return parent;},
      on:()=>noop,delegate:()=>noop,
      frame:fn=>{frameCalls+=1;return fn?.();}
    },
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
const artifactListNode=page.querySelector('#dcArtifactList');
const artifactListUnit={element:artifactListNode,setItems(specs=[]){artifactListNode.replaceChildren();for(const spec of specs){const row=new FakeNode('row');Object.assign(row.dataset,spec.dataset||{});row.setAttribute('role',String(spec.role||'option'));row.setAttribute('aria-label',String(spec.ariaLabel||spec.title||''));const body=new FakeNode('body'),title=new FakeNode('title'),meta=new FakeNode('meta');title.textContent=String(spec.title||'');meta.textContent=String(spec.meta||'');body.appendChild(title);body.appendChild(meta);if(spec.leading)row.appendChild(spec.leading);row.appendChild(body);artifactListNode.appendChild(row);}return artifactListNode.children.slice();},items(){return artifactListNode.children.slice();}};
const presentationStub={workbench:{},artifactList:artifactListNode,artifactListUnit,objectHeader:{meta:page.querySelector('#dcArtifactCount')},objects:{element:page.querySelector('.dc-artifact-pane')},showPreviewTable:(_columns,rows)=>{const host=page.querySelector('#dcTablePreview');host.replaceChildren();for(const row of rows||[]){const tr=new FakeNode('tr');tr.textContent=JSON.stringify(row);host.appendChild(tr);}return true;},showPreviewEmpty:message=>{page.querySelector('#dcTablePreview').textContent=String(message||'');return true;},showPreviewJson:value=>{page.querySelector('#dcTablePreview').textContent=String(value||'');return true;},renderFormulaRefs:noop,mountParameterForm:(_host,_schema,{value}={})=>({getValue:()=>value||{},validate:()=>({ok:true}),destroy:noop}),dispose:noop};
const views={pageHtml:()=>'',attach:()=>presentationStub};

(async()=>{
  const mounted=await feature.mount(ctx,controller,views,{});
  assert(mounted?.deactivate,'Data Center mount must return a disposable runtime.');

  // A populated canonical Store must seed the production Unit tree during mount.
  // No analysis:opened or data:artifacts-changed event is allowed to be required
  // merely to make already-existing project data visible.
  const seededList=page.querySelector('#dcArtifactList');
  const seededCount=page.querySelector('#dcArtifactCount');
  assert(seededCount.textContent==='1 个',`Data Center mount must seed the current Artifact count, got ${JSON.stringify(seededCount.textContent)}.`);
  assert(seededList.children.length===1,'Data Center mount must render existing Artifacts before any refresh event.');
  assert(seededList.children[0].getAttribute('aria-label')==='VG=0','Initial seeded row must preserve the canonical Artifact label.');

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
  assert(list.children[0].getAttribute('aria-label')==='VG=0','Rendered Artifact row must expose the source table name through its canonical selectable-row label.');
  assert(page.querySelector('#dcActiveName').textContent==='VG=0','Data Center preview must activate the first DataTable.');
  // Store replacement may restart its local revision counter at the same numeric
  // value. The artifacts-changed event must invalidate the catalog by lifecycle,
  // not by revision equality alone, and metadata-only rows must still paint.
  const restored2={...artifact,id:'legacy-table:test-2',name:'VG=5',metadata:{...artifact.metadata,legacyDatasetPath:'legacy://VG=5'},source:{path:'legacy://VG=5'}};
  catalogRows=[artifact,restored2];
  changed({type:'owner-live-replace'});
  assert(count.textContent==='2 个',`Same-revision store replacement must rebuild the catalog, got ${JSON.stringify(count.textContent)}.`);
  assert(list.children.length===2,'Same-revision project/store replacement must repaint all metadata rows.');
  assert(list.children[1].getAttribute('aria-label')==='VG=5','Metadata-only restored row must paint without projectArtifact() side effects.');
  assert(mounted.domain?.snapshot&&mounted.domain?.actions,'Data Center production runtime must expose the live-domain projection/action seam for Unit shadow reconstruction.');
  const liveState=mounted.domain.snapshot();
  assert(Array.isArray(liveState.artifacts)&&liveState.artifacts.length===2,'Data Center live-domain snapshot must project the production Artifact catalog.');
  assert(liveState.active?.id===artifact.id,'Data Center live-domain snapshot must expose the same active production Artifact.');
  assert(liveState.active?.preview?.kind==='table','Data Center live-domain snapshot must expose a bounded table projection for the active DataTable.');
  assert(liveState.active.preview.rows.length===2&&liveState.active.preview.rows.length<=18,'Data Center live-domain preview must use the same bounded <=18 row window as production presentation.');
  assert(liveState.active.preview.columns.length===artifact.columns.length,'Data Center live-domain preview must expose real production column metadata.');

  mounted.deactivate();
  console.log('v3.61.14 Data Center executable mount + Artifact render smoke passed.');
})().catch(err=>{console.error(err?.stack||err);process.exit(2);});
