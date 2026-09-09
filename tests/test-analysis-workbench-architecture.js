const fs=require('fs');
const path=require('path');
const assert=require('assert');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const ui=read('src/generated/runtime/ui-infrastructure.js');
const cap=read('src/core/host/capability-runtime.js');
const kernel=read('src/generated/runtime/plugin-kernel.js');
const main=read('desktop/main.js');
const preload=read('desktop/preload.js');
const app=read('src/generated/runtime/app.js');
const winRuntime=read('src/plugin-window/runtime.js');
const pluginContract=read('src/core/plugins/contract-runtime.js');

assert(/const VERSION\s*=\s*'[7-9][0-9]*\.[0-9]+\.[0-9]+'/.test(ui)||/const VERSION\s*=\s*'6\.[0-9]+\.[0-9]+'/.test(ui),'UI infrastructure must ship the v6+ PluginWorkspace/scientific interaction runtime.');
for(const token of ['class AnalysisWorkbench','class PluginWorkspace extends AnalysisWorkbench','class ScientificCurveSurface','mountPrimary(spec={})','registerSurface(spec={})','compose(spec={})','registerPrime(spec={})','registerSub(spec={})','openPrime(id,placement)','openSub(id)','class GridController']){
  assert(ui.includes(token),`Analysis Workbench missing ${token}`);
}
assert(ui.includes("roles:Object.freeze({PRIMARY:'primary',PRIME:'prime',SUB:'sub'})")||kernel.includes("roles:Object.freeze({PRIMARY:'primary',PRIME:'prime',SUB:'sub'})"),'Plugin API must expose PRIMARY/PRIME/SUB roles.');
assert(kernel.includes("const API_VERSION = '1.19.0'"),'Plugin API must be v1.19.0.');
assert(kernel.includes('workspaceSurface: infrastructureScope?.pluginWorkspace')&& !kernel.includes('pluginWorkspace: infrastructureScope?.pluginWorkspace'),'Kernel must expose only the canonical workspaceSurface facade; the old public pluginWorkspace alias must be absent.');
assert(pluginContract.includes("'ui.workspace':api=>!!api?.ui?.workspaceSurface")&&!pluginContract.includes("'ui.workspace':api=>!!api?.ui?.pluginWorkspace"),'Plugin requirement ui.workspace must validate the canonical workspaceSurface facade, not the removed pluginWorkspace alias.');
assert(kernel.includes('scientificPlot: infrastructureScope?.scientificPlot'),'Kernel must expose Core ScientificCurveSurface to plugins.');
assert(kernel.includes('interaction: infrastructureScope?.interactionRuntime'),'Kernel must expose the typed Interaction Runtime.');
assert(kernel.includes('layoutResizeDispatching')&&kernel.includes("name !== 'layout:resize'")&&kernel.includes('infrastructureScope.emitResize'),'Plugin kernel must globally coalesce layout:resize and route plugin layout requests through the scoped scheduler.');
assert(ui.includes('class DataTypeRegistry')&&ui.includes('class SelectionModel')&&ui.includes('class InteractionRuntime')&&ui.includes('class SelectionViewBinding')&&ui.includes('class HorizontalWheelScroller'),'Core must own plugin-registered data types, typed selection, linked view focus and horizontal strip interaction.');
assert(kernel.includes('capabilities: {'),'Kernel must expose Capability Runtime to plugins.');
for(const token of ['function register(owner, id, spec={})','function importRemote(payload, invoker)','async function invoke(id, method=','function proxy(id)','function requireCapability(id, options={})','function subscribe(fn,','function snapshot({remoteOnly=false}={})']){
  assert(cap.includes(token),`Capability Runtime missing ${token}`);
}
for(const token of ['capabilities:publishSnapshot','capabilities:invokeOwner','capabilities:invokeResponse'])assert(main.includes(token),`Main-process capability bridge missing ${token}.`);
for(const token of ['publishCapabilitySnapshot','invokeOwnerCapability','onCapabilityInvokeRequest','respondCapabilityInvoke'])assert(preload.includes(token),`Preload capability bridge missing ${token}.`);
assert(app.includes('publishCapabilitySnapshot()'),'Main renderer must publish its current capability registry.');
assert(winRuntime.includes('DKDSCapabilities?.importRemote'),'Dedicated TOP runtime must import the owner capability snapshot.');
assert(winRuntime.includes('invokeOwnerCapability'),'Dedicated TOP runtime must proxy capability invocations to the owner renderer.');

const migrated={
  'ter-analysis':{prime:null},
  'pulse-analysis':{prime:'raw-diagnostic'},
  'data-center':{prime:'chart-preview'},
};
for(const [folder,{prime}] of Object.entries(migrated)){
  const views=read(`src/plugins/${folder}/shared-views.js`);
  const feature=read(`src/plugins/${folder}/feature-runtime.js`);
  const manifest=JSON.parse(read(`src/plugins/${folder}/plugin.json`));
  if(folder==='data-center'){
    const mobilePresentation=read('src/plugins/data-center/mobile-presentation.js');
    assert(!views.includes('ctx.ui.workspaceSurface.create'),'data-center: Desktop shared views must preserve the established static two-column composition and must not be remapped through the Mobile WorkspaceSurface.');
    assert(mobilePresentation.includes('ctx.ui.workspaceSurface.create'),'data-center: Mobile platform presentation must mount through the canonical Core workspaceSurface.');
    assert(mobilePresentation.includes('wb.compose')||mobilePresentation.includes('wb.mountPrimary'),'data-center: Mobile platform presentation must compose a semantic PRIMARY surface.');
    assert.equal(manifest.platformPresentation?.desktop?.mode,'shared','data-center: Desktop must explicitly retain the shared/static presentation.');
    assert.equal(manifest.platformPresentation?.mobile?.mode,'custom','data-center: Mobile must explicitly own a custom platform presentation.');
    assert((manifest.platformPresentation?.mobile?.scripts||[]).includes('mobile-presentation.js'),'data-center: Mobile platform presentation script must be declared in the SDK 1.25 contract.');
  }else{
    assert(views.includes('ctx.ui.workspaceSurface.create'),`${folder}: shared views must mount through the canonical Core workspaceSurface without compatibility fallbacks.`);
    assert(views.includes('wb.compose')||views.includes('wb.mountPrimary'),`${folder}: shared views must compose a semantic PRIMARY surface.`);
  }
  assert(!views.includes('ctx.ui.workbench.create'),`${folder}: transitional existing-DOM Workbench must no longer be the layout owner.`);
  if(prime)assert(feature.includes(`id:'${prime}'`)&&feature.includes('registerPrime'),`${folder}: expected PRIME view ${prime}.`);
  else assert(!feature.includes("id:'resistance-inspector'")&&!feature.includes('registerPrime({'),`${folder}: titleless multi-plot workspace must keep R–V as an ordinary Core PlotView rather than a dedicated PRIME.`);
  assert(feature.includes("mode:'native'"),`${folder}: TOP/SUPER contract must be native to the unified workbench, not a second split composition.`);
  assert.equal(manifest.apiVersion,'1.19.0',`${folder}: manifest must target current Plugin API 1.19.`);
  assert((manifest.capabilities||[]).includes('ui.plugin-workspace'),`${folder}: manifest must declare the canonical PluginWorkspace capability.`);
}

const ter=read('src/plugins/ter-analysis/feature-runtime.js');
assert(ter.includes('workbench.groupArea('),'TER related multi-plot arrangement must use the formal Core GroupArea controller.');
assert(ter.includes('responsive:true'),'TER grid presets are preferred maxima and must clamp to the actual Surface width so cards never overlap or become unusably narrow.');
assert(ter.includes("items:()=>[")&&ter.includes("id:'layout'"),'TER Layout must use the core declarative ActionGroup menu path.');
assert(ter.includes("minItemWidth:260"),'TER must declare responsive grid intent instead of hard-coded DOM coordinates.');
assert(ui.includes("classList.add('is-sticky')")&&ui.includes("case 'sticky'")===false,'Portable placement grammar must support sticky as a home-layout state rather than a dock region.');
assert(ter.includes("{key:'resistance',plotId:'terResistancePlot',fileBase:'TER_resistance_voltage_all_Vg',resistance:true}")&&ter.includes("placements:['home','left','right','bottom','float','global']"),'TER R–V must use the same ordinary PlotView placement contract as sibling plots; Core injects group-only sticky availability.');
assert(!ter.includes("id:'rv-visibility'")&&!ter.includes('toggleResistanceVisibility'),'TER R–V must not retain a plugin-private visibility linkage; it is an ordinary shared PlotView.');
const resonanceViews=read('src/plugins/resonance-workbench/view-components.js');
const resonancePresentation=read('src/plugins/resonance-workbench/workbench-shared.js');
for(const token of ["id:'data-control'","id:'curve-inspector'","id:'group-analysis'","id:'physics'","id:'spacing'","id:'gate-analysis'"]){
  assert(resonancePresentation.includes(token),`Resonance shared Presentation Contract missing semantic view ${token}.`);
}
assert(resonanceViews.includes('mountUnified')&&resonanceViews.includes('wb.compose')&&resonanceViews.includes("hostMode:isTop?'top':'super'"),'Resonance SUPER/TOP must use one host-invariant PluginWorkspace composition.');
const resonanceFeature=read('src/plugins/resonance-workbench/feature-runtime.js');
assert(resonanceViews.includes("ctx.analysis.algorithms?.list?.({category:'peak-detector'})"),'Resonance dedicated TOP must consume versioned Algorithm Providers rather than a private detector list.');



// SUPER and TOP must consume the same plugin-owned runtime/service layers.
{
  const terManifest=JSON.parse(read('src/plugins/ter-analysis/plugin.json'));
  const pulseManifest=JSON.parse(read('src/plugins/pulse-analysis/plugin.json'));
  const terEntry=read('src/plugins/ter-analysis/plugin.js');
  const pulseEntry=read('src/plugins/pulse-analysis/plugin.js');
  const terTop=read('src/plugins/ter-analysis/window-runtime.js');
  const pulseTop=read('src/plugins/pulse-analysis/window-runtime.js');
  assert((terManifest.scripts||[]).includes('analysis-service.js')&&(terManifest.window?.scripts||[]).includes('analysis-service.js'),'TER main/SUPER and TOP must load the same plugin-owned analysis service.');
  assert((pulseManifest.scripts||[]).includes('analysis-service.js')&&(pulseManifest.window?.scripts||[]).includes('analysis-service.js'),'Pulse main/SUPER and TOP must load the same plugin-owned analysis service.');
  assert(terEntry.includes("ctx.modules.require('analysis-service')")&&terTop.includes("modules.require('builtin.ter-analysis','analysis-service')"),'TER SUPER/TOP must share the same Core-registered analysis-service module.');
  assert(pulseEntry.includes("ctx.modules.require('analysis-service')")&&pulseTop.includes("modules.require('builtin.pulse-analysis','analysis-service')"),'Pulse SUPER/TOP must share the same Core-registered analysis-service module.');
  const resonanceEntry=read('src/plugins/resonance-workbench/plugin.js');
  assert(resonanceEntry.includes('feature.createTop')&&resonanceEntry.includes("ctx.services.require('builtin.resonance-workbench.runtime')"),'Resonance SUPER/TOP must use the plugin-owned runtime and must not mirror state through a host domain service.');
  const dataCenterEntry=read('src/plugins/data-center/plugin.js');
  assert(dataCenterEntry.includes("ctx.modules.require('controller')")&&dataCenterEntry.includes("ctx.modules.require('shared-views')")&&dataCenterEntry.includes("ctx.modules.require('super-layout')"),'Data Center must stay on the same Core-registered Controller/Shared Views/Feature Runtime stack.');
}

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
