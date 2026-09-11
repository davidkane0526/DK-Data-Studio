const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const context={console,structuredClone:global.structuredClone,setTimeout,clearTimeout,crypto:global.crypto,performance:{now:()=>Date.now()}};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['src/core/data/model.js','src/core/performance/runtime.js','src/core/scientific/pipeline-runtime.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}

const D=context.DKDSData;
const Performance=context.DKDSPerformance;
const Pipeline=context.DKDSScientificPipeline;

const typedX=new Float64Array([0,1,2]);
const typedY=new Float32Array([3,4,5]);
const series=D.createSeries({id:'typed-series',x:typedX,y:typedY});
assert.deepStrictEqual(Array.from(series.x),[0,1,2],'Series factories must accept typed numeric sequences.');
assert.deepStrictEqual(Array.from(series.y),[3,4,5],'Typed numeric input must retain every value.');
typedX[0]=99;
assert.strictEqual(series.x[0],0,'Canonical Artifacts must own a copy of caller-provided typed buffers.');

const table=D.createTable({id:'typed-table',columns:[{key:'x',values:new Int16Array([1,2])}]});
assert.deepStrictEqual(Array.from(table.columns[0].values),[1,2],'DataTable columns must accept typed numeric sequences.');
if(typeof BigInt64Array==='function')assert.throws(()=>D.createSeries({id:'bigint-series',x:new BigInt64Array([1n]),y:new BigInt64Array([2n])}),/BigInt TypedArrays/,'Non-serializable BigInt TypedArrays must fail at the factory boundary.');
const matrix=D.createMatrix({id:'typed-matrix',x:new Float64Array([1,2]),y:new Float64Array([10,20]),z:[new Float64Array([3,4]),new Float64Array([5,6])]});
assert(D.validateArtifact(matrix).ok,'A rectangular typed-input matrix must normalize and validate.');
const malformed=D.createMatrix({id:'bad-matrix',x:[1,2],y:[10,20],z:[[3,4]]});
assert(!D.validateArtifact(malformed).ok,'A matrix whose row count differs from y must be rejected.');
const ragged=D.createMatrix({id:'ragged-matrix',x:[1,2],y:[10],z:[[3]]});
assert(!D.validateArtifact(ragged).ok,'A matrix row whose length differs from x must be rejected.');

const store=D.createStore([D.createSeries({id:'immutable-series',x:[1],y:[2]})]);
assert.strictEqual(store.getMutable,undefined,'Artifact Store must not expose an unversioned mutable-data escape hatch.');
const readCopy=store.get('immutable-series');
readCopy.y[0]=100;
assert.strictEqual(store.get('immutable-series').y[0],2,'Mutating a read snapshot must not modify the canonical Artifact.');

const perfScope={
  stage:(namespace,revision,key,compute,options)=>Performance.stage(namespace,revision,key,compute,options),
  trim:(namespace,options)=>Performance.trim(namespace,options)
};

(async()=>{
  let syncComputes=0;
  const scope=Pipeline.createScope('test.pipeline.owner');
  scope.register('shared-entry',{version:'1.0.0',cache:true,publish:false,run:()=>{syncComputes+=1;return D.createAnalysisResult({id:'sync-result',summary:{syncComputes}});}});
  const asyncEntry=await scope.run('shared-entry',[],{performance:perfScope,publish:false});
  const syncEntry=scope.runSync('shared-entry',[],{performance:perfScope,publish:false});
  assert.strictEqual(syncComputes,1,'run() followed by runSync() must share one resolved cache value.');
  assert.strictEqual(asyncEntry.value.summary.syncComputes,1);
  assert.strictEqual(syncEntry.value.summary.syncComputes,1);

  let concurrentComputes=0;
  scope.register('concurrent',{version:'1.0.0',cache:true,publish:false,run:()=>{concurrentComputes+=1;return new Promise(resolve=>setTimeout(()=>resolve(D.createAnalysisResult({id:'concurrent-result',summary:{ok:true}})),5));}});
  const [left,right]=await Promise.all([
    scope.run('concurrent',[],{performance:perfScope,publish:false}),
    scope.run('concurrent',[],{performance:perfScope,publish:false})
  ]);
  assert.strictEqual(concurrentComputes,1,'Concurrent identical runs must share one in-flight computation.');
  assert.strictEqual(left.value.id,right.value.id);
  assert.strictEqual(scope.runSync('concurrent',[],{performance:perfScope,publish:false}).value.id,'concurrent-result','A fulfilled in-flight Promise must become a synchronous cache value.');

  let failures=0;
  const fail=()=>{failures+=1;return Promise.reject(new Error(`failure-${failures}`));};
  await assert.rejects(Performance.memo('test.failed-promise','same',fail),/failure-1/);
  await assert.rejects(Performance.memo('test.failed-promise','same',fail),/failure-2/);
  assert.strictEqual(failures,2,'Rejected Promises must be evicted so retry recomputes.');

  let ownerA=0,ownerB=0;
  const a=Pipeline.createScope('owner.a'),b=Pipeline.createScope('owner.b');
  a.register('same-id',{version:'1.0.0',publish:false,run:()=>D.createAnalysisResult({id:'owner-a',summary:{run:++ownerA}})});
  b.register('same-id',{version:'1.0.0',publish:false,run:()=>D.createAnalysisResult({id:'owner-b',summary:{run:++ownerB}})});
  assert.strictEqual(a.runSync('same-id',[],{performance:perfScope,publish:false}).value.id,'owner-a');
  assert.strictEqual(b.runSync('same-id',[],{performance:perfScope,publish:false}).value.id,'owner-b');
  assert.strictEqual(ownerA,1);assert.strictEqual(ownerB,1);

  let versionOne=0,versionTwo=0;
  const versioned=Pipeline.createScope('owner.versioned');
  versioned.register('stage',{version:'1.0.0',publish:false,run:()=>D.createAnalysisResult({id:'version-one',summary:{run:++versionOne}})});
  assert.strictEqual(versioned.runSync('stage',[],{performance:perfScope,publish:false}).value.id,'version-one');
  versioned.register('stage',{version:'2.0.0',publish:false,run:()=>D.createAnalysisResult({id:'version-two',summary:{run:++versionTwo}})});
  assert.strictEqual(versioned.runSync('stage',[],{performance:perfScope,publish:false}).value.id,'version-two','Re-registering a new stage version must not reuse the previous result.');
  assert.strictEqual(versionOne,1);assert.strictEqual(versionTwo,1);

  console.log('v3.68.67 Core data validation, immutable Store and Pipeline/cache correctness PASS.');
})().catch(error=>{console.error(error);process.exit(1);});
