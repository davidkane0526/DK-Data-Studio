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

const table=D.createTable({
  id:'buffer:table',name:'buffer table',
  columns:[
    {id:'column:signal',key:'signal',dtype:'float64',values:[Math.PI,NaN,Number.MIN_VALUE,Number.MAX_SAFE_INTEGER]},
    {id:'column:count',key:'count',dtype:'int16',values:[1,2,3,4]}
  ]
});
assert(Array.isArray(table.columns[0].values),'Ordinary Artifact arrays must remain the default representation.');

const store=D.createStore([table]);
const events=[];store.onChange(event=>events.push(event));
const signal=store.columnBuffer(table.id,'signal');
assert(signal&&Object.isFrozen(signal)&&Object.isFrozen(signal.owner)&&Object.isFrozen(signal.values),'A column-buffer read must be an immutable snapshot.');
assert.deepStrictEqual(Array.from(signal.owner.artifactId),Array.from(table.id));
assert.strictEqual(signal.owner.columnId,'column:signal');
assert.strictEqual(signal.owner.columnKey,'signal');
assert.strictEqual(signal.dtype,'float64');
assert.strictEqual(signal.length,4);
const beforeRead=store.get(table.id).columns[0].values[0];
assert.throws(()=>{signal.values[0]=99;},/read only|Cannot assign|object is not extensible/i);
assert.strictEqual(store.get(table.id).columns[0].values[0],beforeRead,'A read snapshot must not mutate the Store-owned source column.');

const beforeRevision=store.artifactRevision(table.id);
const committed=store.transactColumn(signal,draft=>{draft[0]=Math.E;draft[2]=42;});
assert.strictEqual(committed.changed,true);
assert(committed.artifactRevision>beforeRevision,'One successful transaction must advance the owning Artifact revision.');
assert.strictEqual(events.length,1,'One successful transaction must publish one Store event.');
assert.strictEqual(events[0].type,'upsert');
assert.strictEqual(store.get(table.id).columns[0].values[0],Math.E);
assert.strictEqual(store.get(table.id).columns[0].values[2],42);
assert.throws(()=>store.transactColumn(signal,draft=>{draft[0]=1;}),/stale/i,'A consumed snapshot must fail after its Artifact revision changes.');

const noOp=store.columnBuffer(table.id,'signal'),noOpRevision=store.artifactRevision(table.id),eventCount=events.length;
const unchanged=store.transactColumn(noOp,draft=>{draft[0]=draft[0];});
assert.strictEqual(unchanged.changed,false);
assert.strictEqual(store.artifactRevision(table.id),noOpRevision,'A no-op transaction must not advance revision.');
assert.strictEqual(events.length,eventCount,'A no-op transaction must not publish an event.');

const rollback=store.columnBuffer(table.id,'signal'),rollbackValues=store.get(table.id).columns[0].values;
assert.throws(()=>store.transactColumn(rollback,draft=>{draft[0]=100;throw new Error('abort transaction');}),/abort transaction/);
assert.deepStrictEqual(Array.from(store.get(table.id).columns[0].values),Array.from(rollbackValues),'A thrown transaction must leave the source column unchanged.');
assert.throws(()=>store.transactColumn(store.columnBuffer(table.id,'signal'),async draft=>{draft[0]=100;}),/synchronous/i,'Async mutators must not escape the atomic transaction boundary.');
assert.deepStrictEqual(Array.from(store.get(table.id).columns[0].values),Array.from(rollbackValues));
assert.throws(()=>store.transactColumn(store.columnBuffer(table.id,'signal'),draft=>{draft.push(5);}),/length/i,'A column transaction must not change table shape.');

const count=store.columnBuffer(table.id,'count');
assert.throws(()=>store.transactColumn(count,draft=>{draft[0]=32768;}),/int16/i,'A dtype violation must fail instead of silently coercing precision.');
assert.strictEqual(store.get(table.id).columns[1].values[0],1);

const otherStore=D.createStore([table]);
assert.throws(()=>otherStore.transactColumn(store.columnBuffer(table.id,'signal'),draft=>{draft[0]=0;}),/owner/i,'A snapshot from another Store must not authorize a write.');
const unrelated=D.createTable({id:'buffer:other',columns:[{key:'x',dtype:'float64',values:[1]}]});
const current=store.columnBuffer(table.id,'signal');store.add(unrelated);
assert.strictEqual(store.transactColumn(current,draft=>{draft[1]=7;}).changed,true,'An unrelated Artifact change must not stale a column snapshot.');

const beforeSave=store.get(table.id),beforeFingerprint=store.fingerprint(table.id);
const projectText=JSON.stringify(D.serializeStore(store));
const restored=D.restoreStore(JSON.parse(projectText));
const afterSave=restored.get(table.id);
assert.strictEqual(afterSave.columns[0].dtype,'float64');
assert.strictEqual(afterSave.columns[1].dtype,'int16');
assert.strictEqual(afterSave.columns[0].values[0],beforeSave.columns[0].values[0]);
assert.strictEqual(afterSave.columns[0].values[1],beforeSave.columns[0].values[1]);
assert.strictEqual(afterSave.columns[0].values[2],beforeSave.columns[0].values[2]);
assert.strictEqual(afterSave.columns[0].values[3],beforeSave.columns[0].values[3]);
assert.strictEqual(restored.fingerprint(table.id),beforeFingerprint,'JSON save/restore must preserve the complete logical Artifact identity.');

const modelSource=fs.readFileSync(path.join(root,'src/core/data/model.js'),'utf8');
const facadeSource=fs.readFileSync(path.join(root,'src/core/plugins/kernel/modules/plugin-api.js'),'utf8');
const hostSource=fs.readFileSync(path.join(root,'src/app/modules/data-artifact-host.js'),'utf8');
const windowSource=fs.readFileSync(path.join(root,'src/plugin-window/runtime.js'),'utf8');
const types=fs.readFileSync(path.join(root,'sdk/plugin-api.d.ts'),'utf8');
const docs=fs.readFileSync(path.join(root,'docs/DATA_MODEL.md'),'utf8');
assert(modelSource.includes('columnBuffer(id,ref)')&&modelSource.includes('transactColumn(buffer,mutate'));
assert(facadeSource.includes('columnBuffer: (id, ref) =>')&&facadeSource.includes('transactColumn: (buffer, mutate'));
assert(hostSource.includes("operation:'column-transaction'"),'The main-project facade must record an undoable semantic column transaction.');
assert(windowSource.includes('columnBuffer:(id,ref)=>')&&windowSource.includes('transactColumn(buffer,mutate'));
assert(types.includes('DKDSColumnBufferSnapshot')&&types.includes('transactColumn('));
assert(docs.includes('Store-owned Column Buffer'));

console.log('v3.68.77 Store-owned Column Buffer transaction and persistence contract PASS.');
