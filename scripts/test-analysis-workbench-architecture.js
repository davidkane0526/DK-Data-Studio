const fs=require('fs');
const path=require('path');
const assert=require('assert');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const ui=read('src/core/ui-infrastructure.js');
const cap=read('src/core/capability-runtime.js');
const kernel=read('src/core/plugin-kernel.js');
const main=read('main.js');
const preload=read('preload.js');
const app=read('src/app.js');
const winRuntime=read('src/plugin-window/runtime.js');

assert(/const VERSION\s*=\s*'3\.0\.0'/.test(ui),'UI infrastructure must ship the unified v3 workbench.');
for(const token of ['class AnalysisWorkbench','mountPrimary(spec={})','registerPrime(spec={})','registerSub(spec={})','openPrime(id,placement)','openSub(id)','class GridController']){
  assert(ui.includes(token),`Analysis Workbench missing ${token}`);
}
assert(ui.includes("roles:Object.freeze({PRIMARY:'primary',PRIME:'prime',SUB:'sub'})")||kernel.includes("roles:Object.freeze({PRIMARY:'primary',PRIME:'prime',SUB:'sub'})"),'Plugin API must expose PRIMARY/PRIME/SUB roles.');
assert(kernel.includes("const API_VERSION = '1.5.0'"),'Plugin API must be v1.5.0.');
assert(kernel.includes('analysisWorkbench: infrastructureScope?.analysisWorkbench'),'Kernel must expose the unified Analysis Workbench.');
assert(kernel.includes('capabilities: {'),'Kernel must expose Capability Runtime to plugins.');
for(const token of ['function register(owner, id, spec={})','function importRemote(payload, invoker)','async function invoke(id, method=','function proxy(id)','function snapshot({remoteOnly=false}={})']){
  assert(cap.includes(token),`Capability Runtime missing ${token}`);
}
for(const token of ['capabilities:publishSnapshot','capabilities:invokeOwner','capabilities:invokeResponse'])assert(main.includes(token),`Main-process capability bridge missing ${token}.`);
for(const token of ['publishCapabilitySnapshot','invokeOwnerCapability','onCapabilityInvokeRequest','respondCapabilityInvoke'])assert(preload.includes(token),`Preload capability bridge missing ${token}.`);
assert(app.includes('publishCapabilitySnapshot()'),'Main renderer must publish its current capability registry.');
assert(winRuntime.includes('DKDSCapabilities?.importRemote'),'Dedicated TOP runtime must import the owner capability snapshot.');
assert(winRuntime.includes('invokeOwnerCapability'),'Dedicated TOP runtime must proxy capability invocations to the owner renderer.');

const migrated={
  'ter-analysis':{prime:'resistance-inspector'},
  'pulse-analysis':{prime:'raw-diagnostic'},
  'data-center':{prime:'chart-preview'},
};
for(const [folder,{prime}] of Object.entries(migrated)){
  const views=read(`src/plugins/${folder}/shared-views.js`);
  const feature=read(`src/plugins/${folder}/feature-runtime.js`);
  const manifest=JSON.parse(read(`src/plugins/${folder}/plugin.json`));
  assert(views.includes('analysisSurface||ctx.ui.analysisWorkbench'),`${folder}: shared views must mount through AnalysisWorkbench.`);
  assert(views.includes('mountPrimary'),`${folder}: shared views must define a PRIMARY surface.`);
  assert(!views.includes('ctx.ui.workbench.create'),`${folder}: transitional existing-DOM Workbench must no longer be the layout owner.`);
  assert(feature.includes(`id:'${prime}'`)&&feature.includes('registerPrime'),`${folder}: expected PRIME view ${prime}.`);
  assert(feature.includes("mode:'native'"),`${folder}: TOP/SUPER contract must be native to the unified workbench, not a second split composition.`);
  assert(manifest.apiVersion==='1.5.0',`${folder}: manifest must target plugin API 1.5.0.`);
  assert((manifest.capabilities||[]).includes('ui.analysis-workbench'),`${folder}: manifest must declare unified workbench capability.`);
  assert((manifest.capabilities||[]).includes('runtime.capabilities'),`${folder}: manifest must declare Capability Runtime use.`);
}

const ter=read('src/plugins/ter-analysis/feature-runtime.js');
assert(ter.includes('workbench.grid('),'TER chart arrangement must be owned by core GridController.');
assert(ter.includes("minItemWidth:330"),'TER must declare responsive grid intent instead of hard-coded DOM coordinates.');
const resonanceViews=read('src/plugins/resonance-workbench/view-components.js');
for(const token of ["id:'curve-inspector'","id:'group-analysis'","id:'physics'","id:'spacing'","id:'gate-analysis'"]){
  assert(resonanceViews.includes(token),`Resonance unified workbench missing semantic view ${token}.`);
}
assert(resonanceViews.includes('registerPrime')&&resonanceViews.includes('registerSub'),'Resonance TOP must compose PRIME/SUB through AnalysisWorkbench.');
const resonanceFeature=read('src/plugins/resonance-workbench/feature-runtime.js');
assert(resonanceFeature.includes('ctx.analysis.detectors.list()')||resonanceViews.includes('ctx.analysis.detectors.list()'),'Resonance dedicated TOP must consume detector capabilities rather than a private detector list.');


// Exercise the capability bridge contract without Electron: one runtime exports
// a provider, a second imports its serializable descriptor and invokes it through
// the supplied bridge callback.
{
  const makeContext=()=>{
    const listeners=[];
    const window={dispatchEvent:e=>listeners.forEach(fn=>fn(e)),addEventListener:(_n,fn)=>listeners.push(fn)};
    const context={window,structuredClone,console,CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}}};
    window.window=window;vm.createContext(context);vm.runInContext(cap,context,{filename:'capability-runtime.js'});return context;
  };
  const owner=makeContext(),child=makeContext();
  owner.window.DKDSCapabilities.register('provider.plugin','demo.echo',{kind:'test.echo',metadata:{label:'Echo'},methods:{echo:value=>({value})}});
  const snap=owner.window.DKDSCapabilities.snapshot({remoteOnly:true});
  child.window.DKDSCapabilities.importRemote(snap,payload=>owner.window.DKDSCapabilities.invoke(payload.id,payload.method,...payload.args));
  assert(child.window.DKDSCapabilities.get('demo.echo')?.remote===true,'Imported capability must be remote in a dedicated runtime.');
  child.window.__capabilityPromise=child.window.DKDSCapabilities.proxy('demo.echo').echo('ok');
}

console.log('Unified Analysis Workbench + Capability Runtime architecture checks passed.');
