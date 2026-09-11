'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

(async()=>{
  const pkg=JSON.parse(read('package.json')),mobile=JSON.parse(read('mobile/app.json'));
  assert.strictEqual(pkg.version,'3.69.4');
  assert(Number(mobile.expo.android.versionCode)>=130,'Android versionCode must advance for the 3.69.4 device fix.');

  const generator=require('../scripts/generate-plugin-index');
  const built=generator.buildPluginIndexSource();
  const resonance=built.plugins.find(row=>row.id==='builtin.resonance-detector-robust');
  assert(resonance,'Resonance algorithm package must be generated.');
  const coreRows=resonance.taskCoreSources?.['resonance-compute']||[];
  assert.deepStrictEqual(coreRows.map(row=>row.file),['science/common.js','science/presets.js'],'Resonance worker must receive exact canonical Core science preludes in declared order.');
  assert(coreRows.every(row=>typeof row.source==='string'&&row.source.length>50),'Canonical Core science bytes must be embedded by the build, not fetched from android_asset at runtime.');

  for(const rel of ['src/plugins/resonance-detector-robust/task-core.js','src/plugins/pulse-analysis/task-core.js','src/plugins/resonance-workbench/task-core.js','src/plugins/ter-analysis/task-core.js']){
    const source=read(rel);
    assert(!source.includes('DKDSTaskAppBase')&&!source.includes('importScripts('),`${rel} must not perform nested app/file URL imports inside a Worker.`);
    assert(source.includes('@dkds-core-task-source'),`${rel} must declare its canonical Core Worker dependencies to the internal build transport.`);
  }

  const packageRuntime=read('src/core/plugins/kernel/modules/package-runtime.js');
  const pluginApi=read('src/core/plugins/kernel/modules/plugin-api.js');
  const taskRuntimeSource=read('src/core/execution/task-runtime.js');
  assert(packageRuntime.includes('definition.taskCoreSources=structuredClone(row.taskCoreSources)'),'Built-in loader must preserve generated Core task preludes.');
  assert(pluginApi.includes('preludeSources:definition.taskCoreSources[row.id]'),'Plugin API task scope must hand canonical preludes to Core Task Runtime.');
  assert(!taskRuntimeSource.includes('importScripts('),'Core Task Runtime must not use nested importScripts for current source-backed tasks.');
  assert(!taskRuntimeSource.includes('moduleUrl')&&!taskRuntimeSource.includes('importUrls')&&!taskRuntimeSource.includes('appBaseUrl'),'Worker messages must not carry runtime URL imports on Android.');

  class CaptureBlob{
    static rows=[];
    constructor(parts){this.source=parts.map(String).join('');CaptureBlob.rows.push(this);}
  }
  const blobs=new Map();let blobSeq=0;
  const FakeURL={createObjectURL(blob){const id=`blob:captured-${++blobSeq}`;blobs.set(id,blob.source);return id;},revokeObjectURL(id){blobs.delete(id);}};
  class FakeWorker{
    static rows=[];
    constructor(url){this.url=String(url);FakeWorker.rows.push(this);}
    postMessage(msg){this.msg=msg;}
    terminate(){this.terminated=true;}
    finish(result){this.onmessage?.({data:{type:'result',result}});}
  }
  const document={baseURI:'file:///android_asset/dkds/index.html',currentScript:{src:'file:///android_asset/dkds/core/execution/task-runtime.js'},documentElement:{dataset:{dkdsHost:'mobile'}}};
  const context={console,document,navigator:{hardwareConcurrency:8,deviceMemory:8},Worker:FakeWorker,URL:FakeURL,Blob:CaptureBlob,Promise,setTimeout,clearTimeout};context.window=context;context.globalThis=context;
  vm.createContext(context);vm.runInContext(taskRuntimeSource,context,{filename:'task-runtime.js'});
  const manifest=resonance.manifest;
  const task=manifest.tasks.find(row=>row.id==='resonance-compute');
  const taskDef={...task,source:resonance.taskSources[task.entry],importSources:Object.fromEntries(task.imports.map(file=>[file,resonance.taskSources[file]])),preludeSources:coreRows};
  const scope=context.DKDSTasks.createScope('builtin.resonance-detector-robust',[taskDef],'file:///android_asset/dkds/plugins/resonance-detector-robust/');
  const syntheticPoints=[];
  for(let n=0;n<=200;n++){
    const v=-1+n*.01,baseline=.20+.12*v,resonancePeak=Math.exp(-4*Math.log(2)*v*v/(.30*.30));
    syntheticPoints.push({v,i:baseline+resonancePeak});
  }
  const input={op:'metrics-batch',items:[{peak:{id:'p1',v:0,i:1.2,widthLeft:-.15,widthRight:.15},sweep:{id:'s1',step:.01,points:syntheticPoints}}]};
  const job=scope.submit('resonance-compute',input,{latest:false});
  assert.strictEqual(FakeWorker.rows.length,1);
  const worker=FakeWorker.rows[0];
  const composed=blobs.get(worker.url)||'';
  assert(composed.includes('function median(')&&composed.includes('function preset(')&&composed.includes('function peakMetrics('),'One Worker blob must contain canonical science + provider algorithm + task entry.');
  assert(!composed.includes('importScripts(')&&!composed.includes('file:///android_asset'),'Composed worker source must be self-contained and URL-independent.');
  assert(!('moduleUrl' in worker.msg)&&!('importUrls' in worker.msg)&&!('appBaseUrl' in worker.msg),'Runtime message must carry input only, not code URLs.');

  let emitted=null;
  const workerContext={console,setTimeout,clearTimeout,Promise};workerContext.self=workerContext;workerContext.globalThis=workerContext;workerContext.postMessage=msg=>{emitted=msg;};
  vm.createContext(workerContext);vm.runInContext(composed,workerContext,{filename:'resonance-single-blob-worker.js'});
  await workerContext.onmessage({data:worker.msg});await tick();
  assert.strictEqual(emitted?.type,'result',`Self-contained Worker must complete, got ${JSON.stringify(emitted)}`);
  const metric=emitted.result?.[0];
  assert(metric&&Number.isFinite(metric.fwhm)&&metric.fwhm>0&&Number.isFinite(metric.amplitude)&&Number.isFinite(metric.area),'Android-equivalent composed Worker must return finite FWHM / amplitude / area.');
  assert(Math.abs(metric.fwhm-.30)<.01,`Expected FWHM near 0.30 V, got ${metric.fwhm}`);
  worker.finish(emitted.result);await job.promise;

  console.log('v3.69.4 Android Worker closure PASS: canonical science/provider/task code executes from one self-contained blob with no nested blob/file importScripts and returns finite FWHM/amplitude/area.');
})().catch(error=>{console.error(error);process.exit(1);});
