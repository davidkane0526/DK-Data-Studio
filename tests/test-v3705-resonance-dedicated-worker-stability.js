'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function loadPeakRuntime(){
  let exported=null;
  const quietConsole={...console,warn(){}};
  const context={console:quietConsole,setTimeout,clearTimeout,Promise,window:{DKDSPluginModules:{define(_owner,_name,value){exported=value;}}}};
  context.globalThis=context.window;
  vm.createContext(context);
  vm.runInContext(read('src/plugins/resonance-workbench/feature-peak-runtime.js'),context,{filename:'feature-peak-runtime.js'});
  return exported;
}

(async()=>{
  const pkg=JSON.parse(read('package.json'));
  const mobile=JSON.parse(read('mobile/app.json'));
  assert(/^(?:3\.(?:7[1-9]|[89]\d)|[4-9]\d)\./.test(pkg.version)||pkg.version==='3.70.5'||Number(pkg.version.split('.').join(''))>=3705,'v3.70.5 regression must remain active.');
  assert(Number(mobile.expo.android.versionCode)>=136,'Android versionCode must advance for 3.70.5.');

  // Dedicated plugin windows execute Core Tasks from source-composed Blob workers.
  // CSP must therefore authorize Blob workers explicitly. Leaving worker-src
  // absent makes Chromium fall back to script-src, which blocks the worker and
  // emits only a generic Worker error to Task Runtime.
  const html=read('src/plugin-window/index.html');
  const csp=(html.match(/Content-Security-Policy"\s*\n?\s*content="([^"]+)"/)||[])[1]||'';
  assert(csp.includes("worker-src blob:;"),'Dedicated plugin-window CSP must explicitly allow Blob workers.');
  assert(!/worker-src[^;]*(?:https?:|file:|'self')/.test(csp),'Dedicated Task CSP must not authorize arbitrary network/file/self worker URLs.');

  // A failed metric signature must be latched until an explicit invalidation or
  // refresh. Previously every group/inspector render resubmitted the same failed
  // Worker request, producing an endless task -> reactive render -> task loop.
  const PeakRuntime=loadPeakRuntime();
  const sweep={id:'s1',step:.01,points:[{v:-1,i:0},{v:0,i:1},{v:1,i:0}]};
  const workspace={activeMetricAlgorithm:'baseline-fwhm-v1@1.0.0'};
  let providerCalls=0,settledCalls=0,status='';
  const provider={id:'baseline-fwhm-v1',version:'1.0.0',category:'peak-metrics',default:true,run(){providerCalls+=1;return Promise.reject(new Error('simulated worker failure'));}};
  const runtime=PeakRuntime.create({
    live:{workspace,algorithmRuntime:{list:()=>[provider],provenance:ref=>({algorithmId:ref.id,algorithmVersion:ref.version})},pipelineRuntime:null,reactiveRuntime:null,selectedPeakId:''},
    services:{S:{},setStatus:value=>{status=String(value||'');}},
    actions:{sweepById:id=>id===sweep.id?sweep:null,invalidatePhysics(){},metricWaveSettled(){settledCalls+=1;},visibleSweeps:()=>[],selectedSweep:()=>null,normalizeCategories(){},publishPeakSelection(){},render(){},commitWorkspaceEdit(){},assignDetectedOrders:x=>x,peaksInRange:()=>[]},
    utils:{clone:value=>JSON.parse(JSON.stringify(value))}
  });
  const peak={id:'p1',sweepId:sweep.id,v:0,i:1,analysisLeft:-.2,analysisRight:.2,analysisManual:false};
  assert.strictEqual(runtime.peakMetrics(peak),null);
  await tick();await tick();
  assert.strictEqual(providerCalls,1,'Initial metric failure should submit once.');
  for(let i=0;i<30;i++)assert.strictEqual(runtime.peakMetrics({...peak}),null);
  await tick();await tick();
  assert.strictEqual(providerCalls,1,'Repeated render reads must not hot-loop a failed metric signature.');
  assert.strictEqual(runtime.diagnostics().failures,1);
  assert(/simulated worker failure/.test(status));
  assert.strictEqual(settledCalls,1,'One failed metric wave should settle once.');

  // Explicit refresh is allowed to retry after runtime/provider recovery.
  provider.run=()=>{providerCalls+=1;return Promise.resolve({fwhm:.2,amplitude:.8,area:.12});};
  runtime.scheduleMetricRefresh([peak]);
  await tick();await tick();
  const recovered=runtime.peakMetrics({...peak});
  assert(recovered&&recovered.fwhm===.2&&recovered.amplitude===.8&&recovered.area===.12,'Explicit metric refresh must recover a previously failed signature.');
  assert.strictEqual(providerCalls,2,'Recovery should perform exactly one explicit retry.');

  // Raw group plots must not depend on derived metric Worker availability.
  const group=read('src/plugins/resonance-workbench/feature-group-runtime.js');
  assert(group.includes("derived=metric==='fwhm'||metric==='amplitude'||metric==='area'"),'Group runtime must gate peakMetrics() reads to derived metrics only.');

  // Dataset legend DOM must remain selection-stable. It should no longer use the
  // currently selected sweep as the legend row identity, and repeated semantic
  // no-op renders must keep the existing chips rather than clear/rebuild them.
  const main=read('src/plugins/resonance-workbench/feature-main-plot-runtime.js');
  assert(main.includes("legendRenderKey=''"),'Resonance main legend must keep a semantic render key.');
  assert(main.includes('if(!force&&nextKey===legendRenderKey&&host.childElementCount===rows.length)return;'),'Identical legend state must skip DOM rebuild.');
  assert(!main.includes("const host=$('#resparMainLegend');if(!host)return;dom.html(host,'');const current=actions.selectedSweep();"),'Legend rendering must not rebuild from current sweep selection.');
  const selection=read('src/plugins/resonance-workbench/feature-selection-runtime.js');
  assert(selection.includes("publishDatasetSelection(path,'resonance-main-legend')"),'Dataset legend activation must publish dataset identity instead of bouncing through a sweep identity.');
  assert(!selection.includes("publishSweepSelection(sw,'resonance-main-legend')"),'Dataset legend must not remap itself to a sweep on click.');

  console.log('v3.70.5 Resonance dedicated Worker/stability PASS: explicit Blob-worker CSP + bounded metric failure + raw-group independence + stable legend DOM.');
})().catch(err=>{console.error(err);process.exit(1);});
