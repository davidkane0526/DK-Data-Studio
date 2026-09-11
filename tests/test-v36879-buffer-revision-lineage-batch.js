'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const context={console,structuredClone,ArrayBuffer,Float64Array,Date,Math,JSON,Number,String,Array,Object,Map,Set,WeakMap,Promise};
context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'src/core/data/model.js'),'utf8'),context,{filename:'model.js'});
const D=context.DKDSData;

const source=D.createTable({
  id:'rev:table',name:'Revision table',metadata:{dataAssignments:['*']},
  columns:[
    {id:'col:x',key:'x',dtype:'float64',values:[0,1,2,3]},
    {id:'col:y',key:'y',dtype:'float64',values:[10,11,12,13]}
  ]
});
const store=D.createStore([source]);
assert.strictEqual(typeof store.columnRevision,'function','Store must expose one canonical column/buffer revision lookup.');
const x0=store.columnRevision(source.id,'x'),y0=store.columnRevision(source.id,'y'),a0=store.artifactRevision(source.id);
assert(x0>0&&y0>0,'Initial Store-owned columns must receive Store-local buffer revisions.');
const meta0=store.columnMetadata(source.id);
assert.strictEqual(meta0[0].bufferRevision,x0);assert.strictEqual(meta0[1].bufferRevision,y0);
const range0=store.readColumnRange(source.id,'x',{start:0,limit:2});
assert.strictEqual(range0.bufferRevision,x0,'Bounded reads must expose the payload-local invalidation stamp.');
const buffer0=store.columnBuffer(source.id,'x');
assert.strictEqual(buffer0.bufferRevision,x0,'Transactional snapshots must expose the payload-local invalidation stamp.');

// An unrestricted full-Artifact upsert is conservative: Core cannot trust which payloads the caller changed.
const renamed=store.get(source.id);renamed.name='Renamed';renamed.metadata.note='metadata only';store.upsert(renamed);
assert(store.artifactRevision(source.id)>a0,'Artifact revision semantics from 3.68.76 must remain: any Artifact write advances the Artifact stamp.');
assert(store.columnRevision(source.id,'x')>x0&&store.columnRevision(source.id,'y')>y0,'Unrestricted upsert must conservatively invalidate all table buffers instead of scanning million-point payloads to guess what changed.');
assert.throws(()=>store.transactColumn(buffer0,draft=>{draft[0]=5;}),/stale/i,'A snapshot from before an unrestricted Artifact write must be rejected.');

// Precise invalidation belongs to trusted bounded mutation paths: changing Y must not stale X.
const xStable=store.columnBuffer(source.id,'x'),xStableRevision=xStable.bufferRevision,artifactBeforeY=store.artifactRevision(source.id);
const yStable=store.columnBuffer(source.id,'y'),yBefore=store.columnRevision(source.id,'y');
assert.strictEqual(store.transactColumn(yStable,draft=>{draft[1]=99;}).changed,true);
assert(store.artifactRevision(source.id)>artifactBeforeY,'A column transaction still changes the owning Artifact revision.');
assert.strictEqual(store.columnRevision(source.id,'x'),xStableRevision,'Y transaction must preserve X buffer revision.');
assert(store.columnRevision(source.id,'y')>yBefore,'Y transaction must advance only Y buffer revision.');
assert.strictEqual(store.transactColumn(xStable,draft=>{draft[1]=6;}).changed,true,'X transaction must remain valid after a Y-only transaction.');
assert.throws(()=>store.transactColumn(xStable,draft=>{draft[2]=7;}),/stale/i,'The same snapshot must become stale once X itself changes.');

// Any unrestricted schema/dtype write invalidates all buffers without payload-wide comparison.
const x2=store.columnRevision(source.id,'x');const retyped=store.get(source.id);retyped.columns.find(c=>c.id==='col:x').dtype='number';store.upsert(retyped);
assert(store.columnRevision(source.id,'x')>x2,'Changing dtype through unrestricted upsert must invalidate X.');

// Remove/re-add with the same Artifact/column ids must invalidate old buffer ownership.
const beforeRemove=store.columnBuffer(source.id,'x');const beforeRemoveRevision=beforeRemove.bufferRevision;const saved=store.get(source.id);store.remove(source.id);store.add(saved);
assert(store.columnRevision(source.id,'x')>beforeRemoveRevision,'Re-adding a removed column must receive a fresh buffer revision.');
assert.throws(()=>store.transactColumn(beforeRemove,draft=>{draft[0]=1;}),/stale/i,'A pre-removal snapshot must never authorize a write after re-add.');

// Incremental lineage maintenance: repeated changes inside one batch must update only the changed edges and leave unrelated edges intact.
const parentA=D.createTable({id:'lineage:a',columns:[{key:'v',values:[1]}]});
const parentB=D.createTable({id:'lineage:b',columns:[{key:'v',values:[2]}]});
const parentC=D.createTable({id:'lineage:c',columns:[{key:'v',values:[3]}]});
const child=D.createTable({id:'lineage:child',lineage:{parents:[parentA.id]},columns:[{key:'v',values:[4]}]});
const otherChild=D.createTable({id:'lineage:other',lineage:{parents:[parentC.id]},columns:[{key:'v',values:[5]}]});
const lstore=D.createStore([parentA,parentB,parentC,child,otherChild]);let batchEvent=null;lstore.onChange(event=>{batchEvent=event;});
lstore.batch(api=>{
  const first=api.get(child.id);first.lineage.parents=[parentB.id];api.upsert(first);
  const second=api.get(child.id);second.lineage.parents=[parentA.id,parentB.id];api.upsert(second);
  const final=api.get(child.id);final.lineage.parents=[parentB.id];api.upsert(final);
});
assert(batchEvent&&batchEvent.type==='batch','Store batch notification semantics must remain one outer event.');
assert.deepStrictEqual(Array.from(lstore.children(parentA.id)).map(a=>a.id),[],'Removed lineage edges must disappear after the batch.');
assert.deepStrictEqual(Array.from(lstore.children(parentB.id)).map(a=>a.id),[child.id],'Final changed lineage edge must be indexed exactly once.');
assert.deepStrictEqual(Array.from(lstore.children(parentC.id)).map(a=>a.id),[otherChild.id],'Unrelated lineage edges must remain untouched.');
assert.deepStrictEqual(Array.from(lstore.parents(child.id)).map(a=>a.id),[parentB.id]);
assert(lstore.lineage(child.id).ancestors.some(a=>a.id===parentB.id),'Lineage traversal must use the incrementally maintained index correctly.');

const modelSource=fs.readFileSync(path.join(root,'src/core/data/model.js'),'utf8');
assert(!/function rebuildRelations\(/.test(modelSource),'Mutation paths must not retain a full-Store lineage rebuild helper.');
assert(modelSource.includes('updateLineageEdges'),'Store must maintain changed lineage edges incrementally.');

const hostSource=fs.readFileSync(path.join(root,'src/app/modules/data-artifact-host.js'),'utf8');
const pluginSource=fs.readFileSync(path.join(root,'src/core/plugins/kernel/modules/plugin-api.js'),'utf8');
const windowSource=fs.readFileSync(path.join(root,'src/plugin-window/runtime.js'),'utf8');
const types=fs.readFileSync(path.join(root,'sdk/plugin-api.d.ts'),'utf8');
for(const [name,sourceText] of [['host',hostSource],['plugin',pluginSource],['window',windowSource]])assert(sourceText.includes('columnRevision'),`${name} facade must expose precise buffer revision lookup.`);
assert(types.includes('bufferRevision:number')&&types.includes('columnRevision(id:string,column:string|number):number'),'SDK types must expose the current precise invalidation contract.');
console.log('v3.68.81 per-buffer revision + incremental lineage batch contract PASS.');
