const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/core/entity-runtime.js'),'utf8');
const context={console,structuredClone};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'entity-runtime.js'});
const {EntityRegistry}=context.DKDSEntities;
const r=new EntityRegistry();
let events=[];r.onChange(e=>events.push(e));
r.transact(()=>{
  r.upsert({id:'dataset:A',type:'data.table',label:'A'});
  r.upsert({id:'sweep:A:up',type:'data.sweep',parents:['dataset:A']});
  r.upsert({id:'peak:A:1',type:'result.peak',parents:['sweep:A:up'],locked:true});
});
assert.strictEqual(events.length,1,'entity transaction should emit one batched change');
assert.strictEqual(events[0].type,'batch');
assert(r.isRelated('peak:A:1','dataset:A'),'peak must relate to dataset through sweep');
assert.strictEqual(r.closestInSet('peak:A:1',new Set(['dataset:A'])),'dataset:A','focus projection must find nearest displayed ancestor');
assert.strictEqual(r.get('peak:A:1').state.locked,true);
r.setVisible('sweep:A:up',false);assert.strictEqual(r.get('sweep:A:up').state.hidden,true);
r.applySelection('view:one',{items:[{id:'peak:A:1'}],focus:{id:'peak:A:1'}});assert.strictEqual(r.get('peak:A:1').state.focused,true);
r.applySelection('view:two',{items:[{id:'sweep:A:up'}],focus:{id:'sweep:A:up'}});assert.strictEqual(r.get('peak:A:1').state.focused,true);assert.strictEqual(r.get('sweep:A:up').state.focused,true);
r.clearSelectionChannel('view:one');assert.strictEqual(r.get('peak:A:1').state.focused,false);assert.strictEqual(r.get('sweep:A:up').state.focused,true);
const rev=r.revision;r.upsert({id:'dataset:A',type:'data.table',label:'A'});assert.strictEqual(r.revision,rev,'identical upsert must be a no-op');

// Artifact-backed entities must survive plugin deactivation by falling back to Core ownership.
const shared=context.DKDSEntities.registry;
shared.upsert({id:'artifact:shared',type:'domain.matrix',owner:'plugin.owner',label:'Shared matrix'});
context.DKDSEntities.projectArtifact({id:'artifact:shared',kind:'result.matrix',name:'Shared matrix',lineage:{parents:[]},provenance:[]});
shared.removeOwner('plugin.owner');
const retained=shared.get('artifact:shared');assert(retained,'artifact-backed entity must survive plugin owner disposal');assert.strictEqual(retained.owner,'core.data');assert.strictEqual(retained.type,'result.matrix');
// A plugin may enrich a projected Artifact with a domain type; later Artifact refreshes must preserve that domain identity.
shared.upsert({id:'artifact:shared',type:'domain.matrix',owner:'plugin.owner',label:'Domain matrix'});
context.DKDSEntities.projectArtifact({id:'artifact:shared',kind:'result.matrix',name:'Shared matrix refreshed',lineage:{parents:[]},provenance:[]});
const enriched=shared.get('artifact:shared');assert.strictEqual(enriched.type,'domain.matrix','Artifact refresh must not overwrite an enriched domain entity type');assert.strictEqual(enriched.owner,'plugin.owner','Artifact refresh must preserve the active domain owner');
let perfEvents=0;r.onChange(()=>perfEvents++);r.transact(()=>{for(let i=0;i<1200;i++)r.upsert({id:`bulk:${i}`,type:'data.point',parents:['dataset:A'],value:{i}});});assert.strictEqual(perfEvents,1,'bulk entity registration must collapse to one event');assert.strictEqual(r.childrenOf('dataset:A').length,1201);
console.log('v3.42 Entity Runtime relation/selection/batch/dedupe checks passed.');
