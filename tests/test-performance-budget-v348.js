const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {performance}=require('perf_hooks');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const context={console,performance,structuredClone,setTimeout,clearTimeout,Map,Set,WeakMap,Date,Math,JSON,Number,String,Array,Object};
context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(read('src/core/performance-runtime.js'),context,{filename:'src/core/performance-runtime.js'});
const perf=context.DKDSPerformance;
assert(perf&&perf.VERSION==='1.2.0','Performance Runtime v1.2.0 must load.');

const ns='test.stage';
perf.configure(ns,{limit:3,ttlMs:0});
let calls=0;
for(let i=0;i<4;i++)perf.stage(ns,`rev-${i}`,'same-params',()=>{calls+=1;return i;});
assert.strictEqual(calls,4);
let row=perf.metric(ns);
assert.strictEqual(row.entries,3,'stage cache must respect namespace LRU limit');
assert(row.evictions>=1,'stage cache must report LRU eviction');
assert.strictEqual(perf.stage(ns,'rev-3','same-params',()=>99),3,'latest stage result must be reused');
row=perf.metric(ns);assert(row.hits>=1,'stage cache hit must be observable');

const trim=perf.trim(ns,{targetEntries:1,reason:'test'});
assert.strictEqual(trim.removed,2,'trim must remove oldest bounded value-cache entries');
row=perf.metric(ns);assert.strictEqual(row.entries,1);assert(row.trims>=1&&row.trimmedEntries>=2,'trim metrics must be observable');

const weakNs='test.weak';const target={id:'source'};
perf.memoWeak(weakNs,target,'a',()=>({a:1}),{limit:4});
perf.memoWeak(weakNs,target,'b',()=>({b:2}),{limit:4});
assert.strictEqual(perf.metric(weakNs).entries,2,'weak cache entry accounting must be observable');
const hidden=perf.lifecycle('hidden',{retainRatio:0,dropWeak:true,reason:'test-hidden'});
assert(hidden.namespaces.some(item=>item.namespace===weakNs&&item.dropWeak===true),'hidden lifecycle must reset weak scientific caches');
assert.strictEqual(perf.metric(weakNs).entries,0,'weak entry count must reset after hidden lifecycle trim');
assert(perf.metric(weakNs).weakResets>=1,'weak reset must be recorded');


const resourceNs='test.resource';const disposed=[];
perf.configure(resourceNs,{limit:1,ttlMs:0});
perf.memo(resourceNs,'a',()=>({id:'a'}),{dispose:(value,meta)=>disposed.push([value.id,meta.reason])});
perf.memo(resourceNs,'b',()=>({id:'b'}),{dispose:(value,meta)=>disposed.push([value.id,meta.reason])});
assert(disposed.some(row=>row[0]==='a'&&row[1]==='lru'),'bounded value cache must dispose evicted resources');
perf.trim(resourceNs,{targetEntries:0,reason:'test-trim'});
assert(disposed.some(row=>row[0]==='b'&&row[1]==='test-trim'),'trim must dispose retained resources');
assert(perf.metric(resourceNs).disposedEntries>=2&&!perf.metric(resourceNs).disposeErrors,'resource disposal metrics must be observable');

const snapshot=perf.snapshot('test.');
assert(snapshot.namespaces.length>=2,'prefix snapshot must expose scoped cache diagnostics');
assert(snapshot.totals.trims>=1&&snapshot.totals.weakResets>=1,'snapshot totals must include lifecycle metrics');
console.log('v3.49 cache budget, resource disposal and hidden lifecycle trim checks passed.');
