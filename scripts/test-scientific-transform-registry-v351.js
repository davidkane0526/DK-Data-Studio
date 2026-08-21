const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const context={window:{},structuredClone:global.structuredClone,performance:{now:()=>Date.now()},console};context.window.window=context.window;context.globalThis=context.window;context.window.performance=context.performance;
vm.createContext(context);
for(const file of ['src/science/common.js','src/science/peaks.js','src/science/ter.js','src/core/data-model.js','src/core/performance-runtime.js','src/core/scientific-pipeline-runtime.js','src/core/scientific-transform-runtime.js'])vm.runInContext(read(file),context,{filename:file});
const S=context.window.DKDSScience,D=context.window.DKDSData,P=context.window.DKDSScientificPipeline,T=context.window.DKDSScientificTransforms,perf=context.window.DKDSPerformance;
const tv=T.VERSION.split('.').map(Number);assert(tv[0]>1||(tv[0]===1&&tv[1]>=0),'Scientific Transform Runtime must remain v1.x compatible or newer.');
const ids=T.list({public:true}).map(row=>row.id);
for(const id of ['raw','detrend','didv','d2idv2','dlog','dvdi','resistance'])assert(ids.includes(id),`missing transform ${id}`);
assert.strictEqual(T.get('didv').outputType,'science.transport.didv');
assert.strictEqual(T.get('didv').fieldType,'science.transport.conductance-field');
assert.strictEqual(T.get('resistance').diverging,false);

function sweep(id,vg,scale=1){const x=[],y=[];for(let k=0;k<=20;k++){const v=-.5+k*.05;x.push(v);y.push(scale*(1e-9+2e-9*v+4e-9*Math.exp(-(((v-.1)/.12)**2))));}return D.createSweep({id,name:id,semanticType:'science.iv.raw',x,y,xUnit:'V',yUnit:'A',direction:1,scanAxis:'Vd',metadata:{vg},vg});}
const s1=sweep('s1',0,1),s2=sweep('s2',1,1.2);
const direct=T.runCurve('didv',s1,{parameters:{radius:2}}),baseline=S.transformSweep({id:s1.id,points:s1.x.map((v,i)=>({v,i:s1.y[i]})),step:.05,direction:1,vg:0},'didv',{radius:2});
assert.strictEqual(direct.semanticType,'science.transport.didv');
assert.strictEqual(direct.points.length,baseline.points.length);
for(let i=0;i<direct.points.length;i++){const a=direct.points[i].y,b=baseline.points[i].y;if(Number.isFinite(a)||Number.isFinite(b))assert(Math.abs(a-b)<=Math.max(1e-20,Math.abs(b)*1e-12),`curve parity ${i}`);}
const field=T.runScalarField('didv',[s1,s2],{targets:[-.5,-.25,0,.25,.5],vgs:[0,1],direction:1,tolerance:.03});
assert.strictEqual(field.semanticType,'science.transport.conductance-field');
assert.deepStrictEqual(Array.from(field.vgs),[0,1]);
assert.strictEqual(field.matrix.length,2);assert.strictEqual(field.matrix[0].length,5);

const scope=P.createScope('test.transforms'),transformScope=T.createScope('test.transforms');transformScope.installPipeline(scope);
const parents={
  'science.iv.raw':['data.sweep'],
  'science.transport.didv':['data.transform'],
  'science.transport.conductance-field':['science.scalar-field'],
  'science.scalar-field':['result.matrix']
};
const types={get:id=>({id}),infer:value=>value?.semanticType?{id:value.semanticType}:(value?.kind?{id:value.kind}:null),accepts:(actual,accepted)=>accepted.some(target=>actual===target||(parents[actual]||[]).includes(target))};
const store=D.createStore([s1,s2]);const performance={stage:(ns,revision,key,compute,options)=>perf.stage(`test.transforms.${ns}`,revision,key,compute,options)};
const curveStage=transformScope.curveStageId('didv'),fieldStage=transformScope.fieldStageId('didv');
assert(scope.get(curveStage),`pipeline stage ${curveStage} missing`);assert(scope.get(fieldStage),`pipeline stage ${fieldStage} missing`);
const curveResult=scope.runSync(curveStage,[s1],{artifacts:store,dataTypes:types,performance,parameters:{radius:2},publish:false});
assert.strictEqual(curveResult.artifacts[0].semanticType,'science.transport.didv');
const fieldResult=scope.runSync(fieldStage,[s1,s2],{artifacts:store,dataTypes:types,performance,parameters:{targets:[-.5,0,.5],vgs:[0,1],direction:1,tolerance:.03},publish:false});
assert.strictEqual(fieldResult.artifacts[0].semanticType,'science.transport.conductance-field');
assert.strictEqual(fieldResult.viewModel.kind,'heatmap');assert.strictEqual(fieldResult.viewModel.diverging,true);
transformScope.register('abs-current',{title:'|I|',outputType:'science.iv.raw',supportsScalarField:false,run:sw=>({points:sw.points.map(p=>({v:p.v,y:Math.abs(p.i)})),label:'|I|',unit:'A'})});
assert(scope.get('transform.abs-current'),'custom transform registered after pipeline binding must receive a pipeline stage');
T.removeOwner('test.transforms');P.removeOwner('test.transforms');
console.log('Scientific Transform Registry v3.51: canonical curve/scalar-field stages, parity, dynamic registration and pipeline bridge passed.');
