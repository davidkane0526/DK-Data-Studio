'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const manifest=JSON.parse(fs.readFileSync('src/plugins/resonance-workbench/plugin.json','utf8'));
const entry=fs.readFileSync('src/plugins/resonance-workbench/plugin.js','utf8');
const source=fs.readFileSync('src/plugins/resonance-workbench/domain-adapter.js','utf8');
const markerProjectionSource=fs.readFileSync('src/plugins/resonance-workbench/main-marker-projection.js','utf8');
const inspectorProjectionSource=fs.readFileSync('src/plugins/resonance-workbench/inspector-detail-projection.js','utf8');

assert(manifest.scripts.includes('domain-adapter.js'),'Resonance main host must load the live domain adapter.');
assert(!(manifest.window?.scripts||[]).includes('domain-adapter.js'),'Auxiliary window must consume the existing runtime service instead of publishing a second domain owner.');
assert(entry.includes("if(!ctx.runtime.isAuxiliaryWindow)ctx.modules.require('domain-adapter')?.provide?.(ctx,service)"),'Resonance must publish the adapter only from the owned production runtime.');
assert(source.includes("ctx.services.domain.provide('live'"),'Resonance adapter must use the generic Core Domain Adapter registry.');
assert(!/createTop|createController|analysisService\.create|feature\.create/.test(source),'Domain adapter must never instantiate a second service/controller.');
for(const forbidden of ['renderGroup','renderInspection','renderPhysics','renderSpacing','renderGate'])
  assert(!source.includes(forbidden+':'),'Adapter actions must not expose production presentation renderers: '+forbidden);

let provided=null,reactiveListener=null;
const modules={};
const window={DKDSPluginModules:{
  define(owner,id,value){modules[owner+':'+id]=value;},
  require(owner,id){return modules[owner+':'+id];}
}};
vm.runInNewContext(markerProjectionSource,{window,console},{filename:'main-marker-projection.js'});
vm.runInNewContext(inspectorProjectionSource,{window,console},{filename:'inspector-detail-projection.js'});
vm.runInNewContext(source,{window,console},{filename:'resonance-domain-adapter.js'});
const adapter=modules['builtin.resonance-workbench:domain-adapter'];
assert(adapter?.provide,'Adapter module must publish provide().');
let state={workspace:{groupColumns:'auto',peakDisplay:{showPoints:true,showRejected:false},peaks:[{id:'p1',sweepId:'s1',v:0.1,i:2,accepted:true,peakOrder:1,direction:1,primaryAlgorithm:'manual',manual:true,confidence:0.9},{id:'p2',sweepId:'s2',v:0.2,i:3,accepted:true,peakOrder:1,direction:1}]},datasets:[{id:'d1'}],sweeps:[{id:'s1',datasetName:'sample.csv',vg:1,direction:1,points:[{v:0.1,i:2}]},{id:'s2',points:[{v:0.2,i:3}]}],selectedSweep:{id:'s1',datasetName:'sample.csv',vg:1,direction:1,points:[{v:0.1,i:2}]},selectedPeak:{id:'p1',sweepId:'s1',v:0.1,i:2,vg:1,direction:1,accepted:true,peakOrder:1,manual:true,confidence:0.9},activeView:'main'};
const calls=[];
const service={
  getState:()=>state,visibleSweepIds:()=>['s1'],colorForPeakOrder:()=> '#123456',sweepById:id=>state.sweeps.find(row=>row.id===id)||null,metrics:()=>({fwhm:0.02,fwhmLeft:0.09,fwhmRight:0.11,baselineMode:'constant',analysisLeft:0.08,analysisRight:0.12,amplitude:1,area:0.01}),getCurrentGroupColumnPreference:()=>state.workspace.groupColumns,getEffectiveGroupColumns:()=>state.workspace.groupColumns==='auto'?'2':state.workspace.groupColumns,getGroupContext:()=> '2 series',getGroupDiagnostics:()=>({series:2}),
  setGroupColumns:value=>{state={...state,workspace:{...state.workspace,groupColumns:String(value)}};calls.push(['setGroupColumns',String(value)]);return String(value);},
  setPeakDisplay:(key,value)=>calls.push(['setPeakDisplay',key,value]),setTransform:value=>calls.push(['setTransform',value]),setPreset:value=>calls.push(['setPreset',value]),setAllVisibility:value=>calls.push(['setAllVisibility',value]),
  selectPeak:(id,opt)=>calls.push(['selectPeak',id,opt.source,opt.additive,opt.openInspector]),selectSweep:(id,opt)=>calls.push(['selectSweep',id,opt.source]),selectRange:(range,opt)=>calls.push(['selectRange',range,opt.source]),
  assignSelectedPeakCategory:order=>calls.push(['assignSelectedPeakCategory',order]),createCategoryForSelectedPeak:()=>calls.push(['createCategoryForSelectedPeak']),renameSelectedPeakCategory:label=>calls.push(['renameSelectedPeakCategory',label]),
  toggleSelectedPeakAccepted:()=>calls.push(['toggleSelectedPeakAccepted']),toggleSelectedPeakLocked:()=>calls.push(['toggleSelectedPeakLocked']),resetSelectedPeakFwhmWindow:()=>calls.push(['resetSelectedPeakFwhmWindow']),deleteSelectedPeak:()=>calls.push(['deleteSelectedPeak']),selectSelectedPeakSweep:()=>calls.push(['selectSelectedPeakSweep']),
  clearSelection:()=>calls.push(['clearSelection']),resetMainView:()=>calls.push(['resetMainView']),reset:()=>calls.push(['reset']),refreshData:()=>calls.push(['refreshData'])
};
const ctx={services:{domain:{provide(id,spec){provided={id,spec};return {id};}}},data:{reactive:{subscribe(fn){reactiveListener=fn;return()=>{reactiveListener=null;};}}}};
adapter.provide(ctx,service);
assert.strictEqual(provided.id,'live');
assert.strictEqual(provided.spec.snapshot().group.preference,'auto');
assert.strictEqual(provided.spec.snapshot().group.effective,'2');
const projected=provided.spec.snapshot().visibleSweeps;
assert.deepStrictEqual(projected.map(row=>row.id),['s1'],'Adapter must project only sweeps selected by the authoritative visibleSweepIds owner.');
assert.deepStrictEqual(projected[0].points,[{v:0.1,i:2}],'Adapter must preserve production sweep point values without recalculation.');
const markers=provided.spec.snapshot().mainMarkers;
assert.strictEqual(markers.length,1,'Adapter marker projection must reuse production-visible sweep ownership.');
assert.strictEqual(markers[0].id,'p1');
assert.strictEqual(markers[0].shape,'star','Marker shape must come from the shared projection owner.');
assert.strictEqual(markers[0].color,'#123456','Marker color must remain sourced from the production color owner.');
const inspector=provided.spec.snapshot().inspector;
assert.strictEqual(inspector.kind,'peak');
assert.strictEqual(inspector.title,'选中峰');
assert(inspector.rows.some(row=>row.key==='fwhm'&&row.value.includes('0.020000 V')),'Inspector adapter projection must reuse the shared production detail model.');
assert(inspector.rows.some(row=>row.key==='status'&&row.value.includes('手动')),'Inspector status row must preserve production peak state semantics.');
provided.spec.actions.setGroupColumns({value:'3'});
assert.deepStrictEqual(calls[0],['setGroupColumns','3']);
assert.strictEqual(provided.spec.snapshot().group.preference,'3','Snapshot must project the same authoritative production service after actions.');
provided.spec.actions.selectPeak({id:'p1',additive:true,openInspector:true});
assert.strictEqual(calls.at(-1)[2],'resonance-domain-adapter');
assert.strictEqual(calls.at(-1)[3],true);
assert.strictEqual(calls.at(-1)[4],true);
provided.spec.actions.assignSelectedPeakCategory({order:3});
assert.deepStrictEqual(calls.at(-1),['assignSelectedPeakCategory',3]);
provided.spec.actions.renameSelectedPeakCategory({label:'主峰'});
assert.deepStrictEqual(calls.at(-1),['renameSelectedPeakCategory','主峰']);
for(const action of ['createCategoryForSelectedPeak','toggleSelectedPeakAccepted','toggleSelectedPeakLocked','resetSelectedPeakFwhmWindow','deleteSelectedPeak','selectSelectedPeakSweep']){
  provided.spec.actions[action]();
  assert.strictEqual(calls.at(-1)[0],action,'Inspector domain action must delegate directly to the production service owner: '+action);
}
let events=0;const off=provided.spec.subscribe(()=>events++);reactiveListener?.({type:'touch',touched:['resonance.group.settings'],meta:[{reason:'group-columns'}]});assert.strictEqual(events,1);off();assert.strictEqual(reactiveListener,null);
console.log('Phase F Resonance live Domain Adapter seam PASS: one production service owner -> serializable snapshot + whitelisted domain actions.');
