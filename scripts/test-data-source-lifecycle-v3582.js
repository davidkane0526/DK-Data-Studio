const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const dataModel=read('src/core/data-model.js');
const app=read('src/app.js');
const dcFeature=read('src/plugins/data-center/feature-runtime.js');
const dcViews=read('src/plugins/data-center/shared-views.js');

const context={window:{},console,structuredClone,crypto:{randomUUID:()=>`uuid-${Math.random()}`}};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(dataModel,context,{filename:'data-model.js'});
const D=context.window.DKDSData;
assert(D&&typeof D.removeLegacyDatasets==='function','Core Data Model must expose the generic imported-source removal primitive.');

const datasets=[
  {path:'a.csv',name:'a.csv',vg:1,points:[{v:0,i:1},{v:1,i:2}]},
  {path:'b.csv',name:'b.csv',vg:2,points:[{v:0,i:3},{v:1,i:4}]}
];
const store=D.createStore();
D.syncLegacyDatasetArtifacts(store,datasets);
const sourceA=store.list({includeTransient:true}).find(a=>a.metadata?.legacyDatasetPath==='a.csv');
const sourceB=store.list({includeTransient:true}).find(a=>a.metadata?.legacyDatasetPath==='b.csv');
assert(sourceA&&sourceB,'Both imported sources must be projected into the Artifact Store.');
const derived=D.derive(sourceA,{id:'derived-a',kind:'data.transform',name:'derived-a',x:[0,1],y:[2,3],metadata:{}});
store.upsert(derived);
assert(store.lineage(sourceA.id).descendants.some(row=>row.id==='derived-a'),'Test fixture must include a lineage descendant.');

const result=D.removeLegacyDatasets(store,datasets,[{path:'a.csv'}]);
assert.deepStrictEqual(Array.from(result.datasets,row=>row.path),['b.csv'],'Removing one source must leave unrelated imported sources intact.');
assert.deepStrictEqual(Array.from(result.removed,row=>row.path),['a.csv'],'Removal result must identify the canonical project source removed.');
assert(!store.get(sourceA.id)&&!store.get('derived-a'),'Removing an imported source must remove its projected source artifact and derived lineage descendants.');
assert(store.get(sourceB.id),'Removing one imported source must not remove another source artifact.');

assert(app.includes("'core.data-sources'")&&app.includes('methods:dataSourceHostApi()'),'Host must expose source lifecycle through one generic Core capability.');
assert(dcFeature.includes("ctx.capabilities.proxy('core.data-sources')")&&dcFeature.includes('sourceCapability.remove([{path}])'),'Data Center must consume the generic data-source lifecycle capability rather than mutate host state directly.');
assert(dcViews.includes('id="dcRemoveSource"')&&dcViews.includes('移除源数据'),'Data Center must expose the canonical source removal action.');
assert(!dcFeature.includes('state.datasets.splice')&&!dcFeature.includes('legacyDatasetPath)=null'),'Data Center must not duplicate imported-source ownership inside plugin state.');

console.log('v3.58.2 data-source lifecycle checks passed.');
