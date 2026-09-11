'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const context={console,structuredClone,ArrayBuffer,Float64Array,Date,Math,JSON,Number,String,Array,Object,Map,Set,WeakMap};
context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'src/core/data/model.js'),'utf8'),context,{filename:'model.js'});
const D=context.DKDSData;

function legacyCanonicalize(value){
  if(value===null||value===undefined)return value;
  if(Array.isArray(value))return value.map(legacyCanonicalize);
  if(typeof value==='object'){const out={};for(const key of Object.keys(value).sort()){if(['createdAt','updatedAt'].includes(key))continue;out[key]=legacyCanonicalize(value[key]);}return out;}
  if(typeof value==='number'&&Number.isNaN(value))return null;
  return value;
}
function legacyFingerprint(value){return D.hashString(JSON.stringify(legacyCanonicalize(value)));}

const fixtures=[
  undefined,null,true,false,0,-0,NaN,Infinity,-Infinity,'line\nquote"\ud800',
  [1,undefined,NaN,-0,,3],
  {z:1,a:2,createdAt:'ignored',updatedAt:'ignored',nested:{updatedAt:'ignored',value:NaN}},
  {'10':'ten','2':'two','01':'leading',b:1,a:2},
  {keep:1,omit:undefined,alsoOmit(){return false;}}
];
for(const fixture of fixtures)assert.strictEqual(D.fingerprintArtifact(fixture),legacyFingerprint(fixture),'Streaming canonical digest must preserve the previous digest exactly.');
const largeNumeric=Array.from({length:25000},(_,index)=>index%997===0?NaN:index%991===0?Infinity:index%983===0?-0:Math.sin(index/17));
assert.strictEqual(D.fingerprintArtifact(largeNumeric),legacyFingerprint(largeNumeric),'Chunked numeric-array hashing must preserve NaN, Infinity and -0 canonical semantics.');
assert.throws(()=>D.fingerprintArtifact({value:1n}),/BigInt/);
const cyclic={};cyclic.self=cyclic;assert.throws(()=>D.fingerprintArtifact(cyclic),/circular/i);

const source=D.createSeries({
  id:'identity:source',name:'source',x:[0,1,2],y:[1,NaN,-0],
  metadata:{instrument:'A',settings:{gain:2}},
  lineage:{parents:['identity:parent'],role:'source',producer:'test',operation:'capture',parameters:{rate:10}},
  provenance:[{id:'prov:1',timestamp:'2026-01-01T00:00:00.000Z',type:'import',label:'Import',providerId:'test.import',parameters:{delimiter:','}}]
});
assert.strictEqual(D.fingerprintArtifact(source),legacyFingerprint(source));
assert.strictEqual(D.fingerprintArtifact({...source,createdAt:'changed',updatedAt:'changed'}),D.fingerprintArtifact(source),'Wall-clock envelope fields remain outside canonical identity.');
assert.notStrictEqual(D.fingerprintArtifact({...source,metadata:{...source.metadata,instrument:'B'}}),D.fingerprintArtifact(source));
assert.notStrictEqual(D.fingerprintArtifact({...source,lineage:{...source.lineage,operation:'filter'}}),D.fingerprintArtifact(source));
assert.notStrictEqual(D.fingerprintArtifact({...source,provenance:[...source.provenance,{...source.provenance[0],id:'prov:2',note:'next'}]}),D.fingerprintArtifact(source));

const other=D.createSeries({id:'identity:other',name:'other',x:[0,1],y:[2,3]});
const store=D.createStore([source,other]);
const sourceRevision=store.artifactRevision(source.id),otherRevision=store.artifactRevision(other.id),kindRevision=store.revision('data.series');
store.upsert({...other,name:'other changed'});
assert.strictEqual(store.artifactRevision(source.id),sourceRevision,'Changing another Artifact must not invalidate this Artifact revision.');
assert(store.artifactRevision(other.id)>otherRevision);
assert(store.revision('data.series')>kindRevision,'The existing kind revision contract remains intact.');
const deduped=store.publish(store.get(source.id));
assert.strictEqual(deduped.changed,false);
assert.strictEqual(store.artifactRevision(source.id),sourceRevision,'A deduplicated publish must not advance the Artifact revision.');
store.publish({...store.get(source.id),metadata:{...source.metadata,instrument:'C'}});
const changedRevision=store.artifactRevision(source.id);assert(changedRevision>sourceRevision);
store.remove(source.id);const removedRevision=store.artifactRevision(source.id);assert(removedRevision>changedRevision,'Removal must invalidate observers of the removed id.');
store.add(source);assert(store.artifactRevision(source.id)>removedRevision,'Re-adding the same id must receive a new Store-local change stamp.');

const serialized=D.serializeStore(store),restored=D.restoreStore(serialized);
assert(!Object.prototype.hasOwnProperty.call(serialized,'revision')&&!serialized.artifacts.some(row=>Object.prototype.hasOwnProperty.call(row,'artifactRevision')),'Store-local revisions must not enter project persistence.');
assert.strictEqual(restored.fingerprint(source.id),store.fingerprint(source.id),'Save/restore must preserve canonical Artifact identity.');
assert(restored.artifactRevision(source.id)>0,'Restored Artifacts receive a fresh Store-local change stamp.');

const modelSource=fs.readFileSync(path.join(root,'src/core/data/model.js'),'utf8');
const facadeSource=fs.readFileSync(path.join(root,'src/core/plugins/kernel/modules/plugin-api.js'),'utf8');
const dataCenterSource=fs.readFileSync(path.join(root,'src/plugins/data-center/feature-runtime.js'),'utf8');
const types=fs.readFileSync(path.join(root,'sdk/plugin-api.d.ts'),'utf8');
assert(modelSource.includes('artifactRevision:id=>artifactRevisions.get'));
assert(facadeSource.includes('artifactRevision: id => state.host?.artifacts?.artifactRevision?.(id)||0'));
assert(dataCenterSource.includes('ctx.data.artifacts.artifactRevision(artifact.id)')&&!dataCenterSource.includes('artifacts.revision?.(artifact.kind)'),'Data Center render identity must be Artifact-local.');
assert(types.includes('artifactRevision(id:string):number'),'The public SDK type must declare the additive method.');

console.log('v3.68.76 canonical streaming fingerprint and Artifact-local revision contract PASS.');
