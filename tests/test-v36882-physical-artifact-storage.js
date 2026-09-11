'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const context={console,structuredClone,ArrayBuffer,DataView,Float64Array,Float32Array,Int32Array,Uint32Array,Int16Array,Uint16Array,Int8Array,Uint8Array,Date,Math,JSON,Number,String,Array,Object,Map,Set,WeakMap,Promise};
context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'src/core/data/model.js'),'utf8'),context,{filename:'model.js'});
const D=context.DKDSData;

const table=D.createTable({
  id:'physical:table',name:'Physical backing parity',metadata:{dataAssignments:['*']},
  columns:[
    {id:'col:x',key:'x',dtype:'float64',values:[-0,1,NaN,Infinity,-Infinity,5.5]},
    {id:'col:y',key:'y',dtype:'int16',values:[1,2,3,4,5,6]},
    {id:'col:label',key:'label',dtype:'string',values:['a','b','c','d','e','f']}
  ]
});
const logicalFingerprint=D.fingerprintArtifact(table);
const store=D.createStore([table]);
const profile=store.storageProfile();
assert.strictEqual(profile.typedColumns,2,'Exact numeric table columns should use Store-owned typed backing.');
assert.strictEqual(profile.arrayColumns,1,'Non-numeric/string columns must remain ordinary lossless arrays.');
assert.strictEqual(profile.values,18);
assert(profile.typedBytes>0,'Physical backing profile must report resident typed payload bytes.');

const read=store.get(table.id);
assert(Array.isArray(read.columns[0].values)&&Array.isArray(read.columns[1].values)&&Array.isArray(read.columns[2].values),'Store get() must preserve the public serializable Array Artifact contract.');
assert(Object.is(read.columns[0].values[0],-0),'Typed backing must preserve -0 when materialized.');
assert(Number.isNaN(read.columns[0].values[2]),'Typed backing must preserve NaN when materialized.');
assert.strictEqual(read.columns[0].values[3],Infinity);
assert.strictEqual(read.columns[0].values[4],-Infinity);
assert.strictEqual(store.fingerprint(table.id),logicalFingerprint,'Internal physical storage must not change canonical Artifact fingerprint semantics.');
assert.strictEqual(store.publish(table,{dedupe:true}).changed,false,'Publish dedupe must compare typed backing with ordinary Array Artifacts using identical canonical semantics.');
read.columns[0].values[1]=999;
assert.strictEqual(store.get(table.id).columns[0].values[1],1,'Materialized reads must not mutate Store-owned backing.');

const listed=store.list({includeTransient:true});
assert(Array.isArray(listed[0].columns[0].values),'list() must remain serializable and must not expose typed backing.');
const range=store.readColumnRange(table.id,'x',{start:1,limit:3});
assert(Array.isArray(range.values)&&Object.is(range.values[0],1)&&Number.isNaN(range.values[1])&&range.values[2]===Infinity,'Bounded range reads must preserve ordinary Array payload semantics.');
const buffer=store.columnBuffer(table.id,'y');
assert(Array.isArray(buffer.values)&&Object.isFrozen(buffer.values),'Column Buffer snapshots must remain immutable ordinary Arrays.');
const xRevision=store.columnRevision(table.id,'x');
const tx=store.transactColumn(buffer,draft=>{draft[1]=22;});
assert.strictEqual(tx.changed,true);
assert.strictEqual(store.get(table.id).columns[1].values[1],22);
assert.strictEqual(store.columnRevision(table.id,'x'),xRevision,'A Y-only transaction must still preserve X backing revision.');
assert(store.storageProfile().typedColumns===2,'Typed backing must survive transactional replacement.');

const saved=JSON.parse(JSON.stringify(D.serializeStore(store)));
const restored=D.restoreStore(saved);
const restoredRead=restored.get(table.id);
assert(Array.isArray(restoredRead.columns[0].values),'Save/restore must return the existing serializable Array representation.');
assert.strictEqual(restoredRead.columns[1].values[1],22);
assert.strictEqual(restored.storageProfile().typedColumns,2,'Restored numeric table columns should reacquire Store-owned typed backing.');

let eventArtifact=null;const unsubscribe=store.onChange(event=>{if(event?.artifact)eventArtifact=event.artifact;});
const edit=store.get(table.id);edit.name='Renamed';store.upsert(edit);unsubscribe();
assert(eventArtifact&&Array.isArray(eventArtifact.columns[0].values),'Store events must never leak internal typed backing.');


const series=D.createSeries({id:'physical:series',x:[-0,1,2,NaN],y:[3,4,5,Infinity]});
const matrix=D.createMatrix({id:'physical:matrix',x:[0,1],y:[10,20],z:[[-0,2],[NaN,4]]});
const numericStore=D.createStore([series,matrix]);
const numericProfile=numericStore.storageProfile();
assert.strictEqual(numericProfile.typedSequences,6,'Series axes plus matrix axes/rows should use the same Store-owned numeric backing.');
const seriesRead=numericStore.get(series.id),matrixRead=numericStore.get(matrix.id);
assert(Array.isArray(seriesRead.x)&&Array.isArray(seriesRead.y)&&Array.isArray(matrixRead.x)&&Array.isArray(matrixRead.z)&&Array.isArray(matrixRead.z[0]),'Series/matrix public reads must remain ordinary nested Arrays.');
assert(Object.is(seriesRead.x[0],-0)&&Number.isNaN(seriesRead.x[3])&&seriesRead.y[3]===Infinity,'Series typed backing must preserve numeric edge semantics.');
assert(Object.is(matrixRead.z[0][0],-0)&&Number.isNaN(matrixRead.z[1][0]),'Matrix typed row backing must preserve numeric edge semantics.');
assert.strictEqual(numericStore.fingerprint(series.id),D.fingerprintArtifact(series),'Series fingerprint must remain storage-representation independent.');
assert.strictEqual(numericStore.fingerprint(matrix.id),D.fingerprintArtifact(matrix),'Matrix fingerprint must remain storage-representation independent.');
const numericSaved=JSON.parse(JSON.stringify(D.serializeStore(numericStore)));const numericRestored=D.restoreStore(numericSaved);
assert(Array.isArray(numericRestored.get(matrix.id).z[0]),'Matrix persistence must retain nested serializable Arrays.');

const sparse=[];sparse.length=3;sparse[0]=1;sparse[2]=3;const sparseTable=D.createTable({id:'physical:sparse',columns:[{key:'v',dtype:'float64',values:sparse}]});const sparseStore=D.createStore([sparseTable]);
assert.strictEqual(sparseStore.storageProfile().typedColumns,0,'Sparse arrays must not be coerced into dense typed storage.');
assert.strictEqual(sparseStore.get(sparseTable.id).columns[0].values[1],undefined,'Sparse/missing payload semantics must stay lossless.');

const invalidInt=D.createTable({id:'physical:invalid-int',columns:[{key:'v',dtype:'int16',values:[1,2.5,3]}]});
const fallback=D.createStore([invalidInt]);
assert.strictEqual(fallback.storageProfile().typedColumns,0,'Values that are not exact for the declared integer dtype must stay on lossless Array backing rather than being coerced.');
assert.deepStrictEqual(Array.from(fallback.get(invalidInt.id).columns[0].values),[1,2.5,3]);

const source=fs.readFileSync(path.join(root,'src/core/data/model.js'),'utf8');
assert(source.includes('createColumnBacking')&&source.includes('materializeStoreArtifact'),'Physical backing must remain an internal Store concern behind the existing Artifact API.');
assert(!/get\(id\).*Float64Array/.test(source),'Public Store get() must not become a typed-array API.');
console.log('v3.68.82 Store-owned typed physical table backing + public Artifact parity PASS.');
