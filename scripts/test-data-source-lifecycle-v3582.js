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
const resonance=read('src/plugins/resonance-workbench/feature-runtime.js');
const resonanceViews=read('src/plugins/resonance-workbench/view-components.js');
const resonanceEntry=read('src/plugins/resonance-workbench/plugin.js');

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
assert(dcFeature.includes('const sourceCapability=ctx.data.sources')&&dcFeature.includes('sourceCapability.remove([ref])'),'Data Center must consume the public scoped data.sources lifecycle API rather than mutate host state directly.');
assert(dcViews.includes('id="dcDataActionsBtn"')&&dcViews.includes('数据操作'),'Data Center must expose source lifecycle through the aligned data-actions menu.');
assert(dcFeature.includes('openDataActions')&&dcFeature.includes('修改标签')&&dcFeature.includes('排除')&&dcFeature.includes('删除'),'Data Center data objects must expose the shared rename/exclude/delete action set.');
assert(dcFeature.includes('artifactContextBehavior?.bind?.')&&!dcFeature.includes('artifactList.oncontextmenu'),'Data Center data objects must route row context actions through Interaction Behavior.');
assert(resonance.includes('datasetActionItems(path)')&&resonance.includes('datasetContextBehavior.bind(list')&&!resonance.includes("addEventListener('contextmenu'")&&resonance.includes('修改标签')&&resonance.includes('排除')&&resonance.includes('删除'),'Resonance source-data rows must expose the same lifecycle actions through Interaction Behavior.');
assert(resonance.includes('setDataSourceRuntime(runtime)')&&resonanceViews.includes('R.setDataSourceRuntime?.(ctx.data.sources)')&&!resonanceEntry.includes("ctx.capabilities.proxy('core.data-sources')"),'Resonance shared View/runtime wiring must consume the public scoped data.sources API without bloating the thin plugin entry.');
assert(!resonance.includes('state.datasets.splice'),'Resonance must not duplicate source deletion inside plugin state.');
assert(!dcFeature.includes('state.datasets.splice')&&!dcFeature.includes('legacyDatasetPath)=null'),'Data Center must not duplicate imported-source ownership inside plugin state.');

console.log('v3.58.2 data-source lifecycle checks passed.');
