const fs=require('fs');
const path=require('path');
const os=require('os');
const vm=require('vm');
const {readBuiltinPluginWindows,listBuiltinPluginWindows,readPluginWindows}=require('../plugin-window-manager');
const {normalizePluginPackage}=require('../plugin-package');

const root=path.resolve(__dirname,'..');
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function fail(message){console.error(`PLUGIN WINDOW ERROR: ${message}`);process.exitCode=2;}
function assert(ok,message){if(!ok)fail(message);}

const shellHtml=read('src/plugin-window/index.html');
const shellRuntime=read('src/plugin-window/runtime.js');
const shellStyle=read('src/plugin-window/style.css');
const main=read('main.js');
const preload=read('preload.js');
const manager=read('plugin-window-manager.js');
const kernel=read('src/core/plugin-kernel.js');
const app=read('src/app.js');
const pulseRuntime=read('src/plugins/pulse-analysis/window-runtime.js');
const pulseService=read('src/plugins/pulse-analysis/analysis-service.js');
const terRuntime=read('src/plugins/ter-analysis/window-runtime.js');
const terService=read('src/plugins/ter-analysis/analysis-service.js');
const terFeature=read('src/plugins/ter-analysis/feature-runtime.js');
const resonanceRuntime=read('src/plugins/resonance-workbench/window-runtime.js');
const resonanceFeatureRuntime=read('src/plugins/resonance-workbench/feature-runtime.js');

assert(!shellHtml.includes('../app.js'),'Dedicated plugin window must not load the full src/app.js renderer.');
assert(!shellHtml.includes('plugin-index'),'Dedicated plugin window must not load the full generated plugin index.');
assert(!shellHtml.includes('正在打开插件'),'Dedicated plugin window must not show a startup/loading page.');
assert(!shellHtml.includes('plotly.min.js'),'Plugin dependencies must be loaded on demand, not statically by the shell.');
assert(!shellHtml.includes('../science/'),'Plugin science dependencies must be loaded on demand.');
assert(!shellHtml.includes('../core/plugin-kernel.js'),'Plugin kernel must be loaded on demand with the target plugin dependencies.');
assert(!shellStyle.includes('.plugin-window-loading'),'Startup loading overlay CSS must be removed.');
assert(shellRuntime.includes('DEPENDENCY_SCRIPTS'),'Dedicated runtime must have an allowlisted shared dependency map.');
assert(shellRuntime.includes('loadDependencies(spec)'),'Dedicated runtime must load dependencies declared by the target plugin.');
assert(shellRuntime.includes('for(const file of (spec.scripts||[]))'),'Dedicated runtime must support plugin-local support scripts without host changes.');
assert(shellRuntime.includes('onActivityWillHide'),'Dedicated runtime must flush its project snapshot before a cached window is hidden.');
assert(shellRuntime.includes('pushSnapshot(true);'),'Dedicated runtime must persist a final snapshot before hiding/closing.');
assert(shellRuntime.includes('artifactDeltaPayload()'),'Dedicated runtime must send artifact deltas instead of relying on whole-project replacement.');
assert(shellRuntime.includes('pluginState:pluginId'),'Dedicated runtime must send only its namespaced project-slice state.');

assert(main.includes("src', 'plugin-window', 'index.html"),'main.js must route dedicated activities to src/plugin-window/index.html.');
assert(main.includes("pluginWindow?.mode !== 'compatibility'")&&main.includes("src', 'index.html"),'compatibility TOPs must use the full renderer while keeping the generic window lifecycle.');
assert(main.includes('resolveConfiguredPluginWindow'),'main.js must resolve built-in and external plugin-owned window manifests.');
assert(main.includes('listConfiguredPluginWindows'),'main.js must enumerate built-in and external dedicated windows from manifests.');
assert(main.includes("ipcMain.handle('windows:listPluginWindows'"),'renderer must be able to discover all dedicated-window policies.');
assert(main.includes('hideDedicatedAuxiliaryWindow'),'Dedicated windows must support hide/reuse.');
assert(main.includes("win.on('close', event =>")&&main.includes('pluginWindow?.reuse !== false'),'native close interception must follow generic manifest reuse policy.');
assert(main.includes('projectSnapshotDigest'),'Cached windows must avoid renderer/project replacement when the snapshot is unchanged.');
assert(main.includes('synchronized:projectChanged'),'Reuse result must record whether a hidden renderer required project synchronization.');
assert(main.includes("windows:syncPluginActivities"),'disabled independent plugins must dispose cached windows generically.');
assert(main.includes('pluginState: payload?.pluginState'),'main process must forward namespaced plugin state.');
assert(main.includes('artifactDelta: payload?.artifactDelta'),'main process must forward incremental artifact changes.');

assert(preload.includes('onActivityWillHide'),'preload must expose the hide/snapshot lifecycle event.');
assert(preload.includes('listPluginWindows'),'preload must expose manifest-driven dedicated-window discovery.');
assert(preload.includes('prewarmActivityWindow'),'preload must expose background plugin-window prewarming.');
assert(preload.includes('syncPluginActivityWindows'),'preload must expose cached-window synchronization after plugin enable/disable.');
assert(preload.includes('markActivityWindowReady'),'preload must let the dedicated renderer report readiness.');
assert(preload.includes('onActivityWillShow'),'preload must expose cached-window show/resize lifecycle events.');

assert(app.includes('function prewarmDedicatedPluginWindows()'),'main renderer must have generic dedicated-window prewarming.');
assert(app.includes('window.electronAPI.listPluginWindows()'),'prewarming must discover manifests instead of using an activity whitelist.');
assert(app.includes("activity?.openMode==='window'"),'prewarming must intersect manifest windows with currently enabled activities.');
assert(!app.includes("const activities=['data-center','ter','pulse']"),'dedicated prewarming must never hard-code the current three activities.');
assert(app.includes('function applyDedicatedActivitySnapshot'),'main renderer must merge independent-window state by plugin namespace.');
assert(app.includes('tab.pluginState[pluginId]'),'dedicated snapshots must update only their owning plugin namespace.');
assert(app.includes('applyArtifactDeltaToTab'),'dedicated artifact changes must merge incrementally.');
assert(app.includes('function mergeCompatibilityActivityProject')&&app.includes('merged.plugins=cloneAuxSnapshot(tab?.pluginState||{})'),'compatibility TOP snapshots must preserve the newest namespaced plugin caches.');
assert(app.includes('merged.dataModel=window.DKDSData.serializeStore(tab?.artifactStore'),'compatibility TOP snapshots must preserve the newest artifact store.');
assert(kernel.includes("if(value.primary===undefined&&(role==='top'||value.openMode==='window'))value.primary=true"),'TOP/independent activities must default to first-level navigation without shell whitelists.');

assert(shellRuntime.includes('markActivityWindowReady'),'dedicated runtime must signal completion after the target plugin is mounted.');
assert(shellRuntime.includes('markActivityWindowFailed'),'dedicated runtime must report startup failure instead of remaining hidden forever.');
assert(preload.includes("markActivityWindowFailed: payload => ipcRenderer.send('windows:activityFailed'"),'preload must expose dedicated-window startup failure reporting.');
assert(preload.includes('onActivityWindowFailed'),'owner renderer must receive dedicated-window startup failures.');
assert(main.includes('markAuxiliaryWindowFailed')&&main.includes('auxiliaryFailures'),'main process must track failed dedicated windows separately from ready windows.');
assert(shellRuntime.includes('const sameProject = bootstrap?.projectDigest'),'prewarm -> first-open must not restore/re-render an unchanged project.');
assert(shellRuntime.includes('onActivityWillShow'),'dedicated runtime must relayout Plotly when a prewarmed/cached window becomes visible.');
assert(manager.includes('manifest?.window'),'plugin-window-manager must read manifest.window.');
assert(manager.includes('normalizePackagedPluginWindow')&&manager.includes('packageFiles'),'plugin-window-manager must support packaged external and trusted-override dedicated windows.');
assert(shellRuntime.includes("spec?.source==='external'||spec?.source==='override'")&&shellRuntime.includes('packageScripts'),'dedicated runtime must execute external and trusted-override .dkplugin windows without the legacy full-workspace renderer.');
assert(manager.includes('WINDOW_PERSISTENCE_MODES'),'plugin-window-manager must validate persistence policy.');
assert(manager.includes('windowSpec.prewarm !== false')&&manager.includes('windowSpec.reuse !== false'),'all dedicated windows must get prewarm/reuse defaults.');
assert(manager.includes('normalizePluginScripts'),'dedicated plugins must be able to carry private support scripts.');

const expected={
  'resonance-workbench':{activity:'resonance',mode:'dedicated',runtime:'window-runtime.js',prewarm:false,manifestDeps:['data-model','plotly','d3','science-common','science-presets','science-import','science-peaks','science-identity','science-physics','science-gate','science-ter','platform','ui-infrastructure','plugin-kernel'],deps:['data-model','plotly','d3','science-common','science-presets','science-import','science-peaks','science-identity','science-physics','science-gate','science-ter','platform','ui-infrastructure','plugin-kernel','parameter-schema']},
  'data-center':{activity:'data-center',mode:'dedicated',runtime:'',prewarm:false,deps:['plotly','data-model','formula-engine','parameter-schema','workflow-engine','platform','state-store','ui-infrastructure','plugin-kernel']},
  'ter-analysis':{activity:'ter',mode:'dedicated',runtime:'window-runtime.js',prewarm:false,deps:['data-model','plotly','science-common','science-peaks','science-ter','parameter-schema','platform','ui-infrastructure','plugin-kernel']},
  'pulse-analysis':{activity:'pulse',mode:'dedicated',runtime:'window-runtime.js',prewarm:false,deps:['plotly','science-common','science-import','science-pulse','platform','ui-infrastructure','plugin-kernel']}
};
for(const [folder,spec] of Object.entries(expected)){
  const manifest=JSON.parse(read(`src/plugins/${folder}/plugin.json`));
  assert(manifest.window?.activity===spec.activity,`${folder}: window.activity must be ${spec.activity}`);
  assert((manifest.window?.mode||'dedicated')===spec.mode,`${folder}: window.mode must be ${spec.mode}`);
  assert(manifest.window?.prewarm===spec.prewarm,`${folder}: window.prewarm must match the built-in memory policy`);
  assert(manifest.window?.reuse===true,`${folder}: window.reuse must explicitly use the generic hide/reuse contract`);
  assert(manifest.window?.persistence==='project',`${folder}: project result persistence must be enabled`);
  assert(JSON.stringify(manifest.window?.dependencies||[])===JSON.stringify(spec.manifestDeps||spec.deps),`${folder}: unexpected dedicated-window dependency set`);
  if(spec.runtime){
    assert(manifest.window?.runtime===spec.runtime,`${folder}: window.runtime must be ${spec.runtime}`);
    assert(fs.existsSync(path.join(root,'src','plugins',folder,spec.runtime)),`${folder}: runtime file missing`);
  }
  assert(Number(manifest.window?.width)>=900,`${folder}: dedicated window width is missing`);
}

const resolved=readBuiltinPluginWindows(root);
for(const spec of Object.values(expected)){
  const row=resolved.get(spec.activity);
  assert(!!row,`manager failed to resolve ${spec.activity}`);
  assert(row.prewarm===spec.prewarm&&row.reuse===true&&row.persistence==='project',`${spec.activity}: generic lifecycle policy missing`);
  assert(row.mode===spec.mode,`${spec.activity}: resolved window mode differs from manifest`);
  assert(JSON.stringify(row?.dependencies||[])===JSON.stringify(spec.deps),`${spec.activity}: resolved dependencies differ from manifest`);
}
assert(listBuiltinPluginWindows(root).length===resolved.size,'listBuiltinPluginWindows must enumerate the same manifest contracts as the resolver.');

// Synthetic future-plugin regression: a brand-new independent plugin must gain
// prewarm/reuse/project-persistence and plugin-local scripts without touching
// app.js/main.js. A second scan must also see manifest edits immediately.
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-window-fixture-'));
try{
  const dir=path.join(fixture,'src','plugins','future-fft');
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'plugin.js'),'window.__futureFftPlugin=true;\n');
  fs.writeFileSync(path.join(dir,'engine.js'),'window.__futureFftEngine=true;\n');
  const manifest={
    id:'builtin.future-fft',name:'Future FFT',version:'1.0.0',entry:'plugin.js',
    window:{activity:'fft',title:'FFT',scripts:['engine.js'],dependencies:[]}
  };
  fs.writeFileSync(path.join(dir,'plugin.json'),JSON.stringify(manifest,null,2));
  let row=readBuiltinPluginWindows(fixture).get('fft');
  assert(row?.prewarm===true&&row?.reuse===true&&row?.persistence==='project','new independent plugins must inherit safe lifecycle defaults.');
  assert(JSON.stringify(row?.scripts||[])===JSON.stringify(['engine.js']),'new independent plugins must load plugin-local support scripts.');

  manifest.window.prewarm=false;
  manifest.window.reuse=false;
  manifest.window.persistence='memory';
  fs.writeFileSync(path.join(dir,'plugin.json'),JSON.stringify(manifest,null,2));
  row=readBuiltinPluginWindows(fixture).get('fft');
  assert(row?.prewarm===false&&row?.reuse===false&&row?.persistence==='memory','manifest lifecycle edits must be rescanned without stale directory caching.');
}finally{fs.rmSync(fixture,{recursive:true,force:true});}

// External .dkplugin regression: the same manifest.window contract must resolve
// from an installed package, including private window runtime/support files.
const externalPkg=normalizePluginPackage({
  schema:1,
  manifest:{
    id:'example.external-window',name:'External Window',version:'1.0.0',apiVersion:'1.3.0',entry:'plugin.js',
    scripts:['plugin.js'],styles:['style.css'],
    window:{activity:'external-window',runtime:'window-runtime.js',scripts:['engine.js'],dependencies:[],prewarm:true,reuse:true,persistence:'project'}
  },
  files:{
    'plugin.js':'DKDSPlugins.define({id:"example.external-window",name:"External Window",version:"1.0.0"},async()=>({}));',
    'window-runtime.js':'window.DKDSPluginWindowRuntime={create:async()=>({})};',
    'engine.js':'window.__externalWindowEngine=true;',
    'style.css':'.external-window{}'
  }
},{allowBuiltinId:false});
const combined=readPluginWindows(root,[externalPkg]);
const externalRow=combined.get('external-window');
assert(externalRow?.source==='external','installed .dkplugin manifest.window must resolve as a dedicated window.');
assert(externalRow?.runtime==='window-runtime.js'&&externalRow?.scripts?.includes('engine.js'),'external window runtime/support files must be preserved.');
assert(externalRow?.packageScripts?.includes('plugin.js')&&typeof externalRow?.packageFiles?.['plugin.js']==='string','external window must carry package scripts into the dedicated renderer.');

// Built-in LAN override regression: the package replaces the packaged plugin's
// window contract rather than colliding with it as an external plugin.
const overridePkg=normalizePluginPackage({
  schema:1,
  manifest:{
    id:'builtin.ter-analysis',name:'TER Override',version:'2.0.1',apiVersion:'1.3.0',entry:'plugin.js',
    window:{activity:'ter-override',runtime:'window-runtime.js',dependencies:[],prewarm:true,reuse:true,persistence:'project'}
  },
  files:{
    'plugin.js':'DKDSPlugins.define({id:"builtin.ter-analysis",name:"TER Override",version:"2.0.1"},async()=>({}));',
    'window-runtime.js':'window.DKDSPluginWindowRuntime={create:async()=>({})};'
  }
},{allowBuiltinId:true});
const withOverride=readPluginWindows(root,[],[overridePkg]);
assert(!withOverride.has('ter'),'built-in override must remove the packaged window contract for the same plugin id.');
assert(withOverride.get('ter-override')?.source==='override','built-in override must install its replacement window contract with override source.');


// Resonance must now use a real dedicated plugin renderer rather than launching
// a second copy of the full application renderer.
assert(!resonanceRuntime.includes('../app.js'),'Resonance dedicated runtime must not load the full application renderer.');
assert(resonanceFeatureRuntime.includes("serviceName:'resonance'"),'Resonance feature runtime must expose the normal plugin-window service contract while window-runtime stays host-only.');
assert(resonanceFeatureRuntime.includes("builtin.resonance-workbench"),'Resonance feature runtime must restore only its namespaced plugin state.');
assert(app.includes('serializeResonanceWorkspace')&&app.includes('restoreResonanceWorkspace'),'Main resonance service must expose a namespaced project-slice adapter.');
const resonanceShared=read('src/plugins/resonance-workbench/workbench-shared.js');
for(const label of ['曲线检查','组图分析','物理机制','峰间距','栅压分析']){
  assert(resonanceShared.includes(label),`Resonance shared workbench must retain ${label}.`);
}
const resonanceManifest=JSON.parse(read('src/plugins/resonance-workbench/plugin.json'));
assert((resonanceManifest.window?.scripts||[]).includes('workbench-shared.js'),'Resonance TOP runtime must load the same shared View/Controller layer as SUPER.');
assert((resonanceManifest.scripts||[]).includes('super-layout.js'),'Resonance SUPER layout adapter must be declared as a plugin-owned support script.');
for(const marker of ['function renderInspection()','function renderGroup()','function renderPhysics()','function renderSpacing()','function renderGate()','analyzePhysicalFamilies','computeResonantTerForLabel','pairGateSeries']){
  assert(resonanceFeatureRuntime.includes(marker),`Resonance feature runtime parity marker missing: ${marker}`);
}

// Persistence contract: reuse preserves renderer/Plotly memory; restart-safe
// results live in namespaced project slices and artifact deltas.
assert(pulseService.includes('result:item.result ? cloneSerializable(item.result) : null'),'Pulse window project slice must persist computed result payloads.');
assert(pulseService.includes('if(source.analyzed && !item.result)analyzeItem(item);'),'Pulse restore must recompute only legacy projects without cached results.');
assert(terFeature.includes("ctx.project.registerSlice('workspace'"),'TER must use the same namespaced project-slice contract as other independent plugins.');
assert(terService.includes('serialize:()=>({schema:2,settings:cloneSerializable(settings)'),'TER window must serialize its expensive result into the namespaced slice.');
assert(terService.includes('result=source.result?cloneSerializable(source.result):null'),'TER restore must reuse cached result payloads rather than recompute.');
assert(app.includes('serialize:()=>({')&&app.includes('result:state.terMaxResult?cloneProjectCache(state.terMaxResult):null'),'main TER service must expose namespaced serialization for project files.');

for(const rel of [
  'src/plugin-window/runtime.js',
  'src/plugins/pulse-analysis/window-runtime.js',
  'src/plugins/ter-analysis/window-runtime.js',
  'src/plugins/resonance-workbench/window-runtime.js',
  'src/plugins/resonance-workbench/feature-runtime.js',
  'src/plugins/ter-analysis/plugin.js',
  'plugin-window-manager.js',
  'preload.js',
  'main.js',
  'src/app.js',
  'src/core/plugin-kernel.js'
]){
  try{new vm.Script(read(rel),{filename:rel});}
  catch(err){fail(`${rel}: JavaScript syntax error: ${err.message}`);}
}

assert(fs.existsSync(path.join(root,'tools','windows','package-clean-project.ps1')),'clean project packaging tool is missing.');
assert(read('package.json').includes('plugin-window-manager.js'),'electron-builder files must include plugin-window-manager.js.');

if(process.exitCode)process.exit(process.exitCode);
console.log('Plugin window lifecycle OK: manifest-driven prewarm/reuse, namespaced result merge, artifact deltas, future-plugin regression.');
