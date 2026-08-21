const fs = require('fs');
const path = require('path');
const { normalizeRelativeFile } = require('./plugin-package');

const ALLOWED_WINDOW_DEPENDENCIES = new Set([
  'plotly',
  'd3',
  'science-common',
  'science-import',
  'science-presets',
  'science-peaks',
  'science-identity',
  'science-physics',
  'science-gate',
  'science-pulse',
  'science-ter',
  'data-model',
  'formula-engine',
  'parameter-schema',
  'performance-runtime',
  'scientific-pipeline-runtime',
  'scientific-transform-runtime',
  'scientific-algorithm-runtime',
  'workflow-engine',
  'platform',
  'state-store',
  'ui-infrastructure',
  'plugin-kernel'
]);

const CORE_REQUIREMENT_WINDOW_DEPENDENCIES = Object.freeze({
  'parameters':Object.freeze(['parameter-schema']),
  'performance':Object.freeze(['performance-runtime']),
  'data.pipeline':Object.freeze(['scientific-pipeline-runtime']),
  'data.transforms':Object.freeze(['scientific-transform-runtime']),
  'analysis.algorithms':Object.freeze(['scientific-algorithm-runtime']),
  'data.model':Object.freeze(['data-model']),
  'data.formula':Object.freeze(['formula-engine']),
  'workflow':Object.freeze(['workflow-engine']),
  'state':Object.freeze(['state-store'])
});


const WINDOW_PERSISTENCE_MODES = new Set(['project','memory','none']);
const WINDOW_MODES = new Set(['dedicated','compatibility']);

function normalizeWindowMode(value) {
  const mode=String(value||'dedicated').trim().toLowerCase();
  if(!WINDOW_MODES.has(mode))throw new Error(`Unsupported plugin window mode: ${mode || '(empty)'}`);
  return mode;
}

function normalizePersistence(value) {
  const mode = String(value || 'project').trim().toLowerCase();
  if (!WINDOW_PERSISTENCE_MODES.has(mode)) {
    throw new Error(`Unsupported plugin window persistence mode: ${mode || '(empty)'}`);
  }
  return mode;
}

function normalizePluginScripts(pluginDir, value) {
  const rows = Array.isArray(value) ? value : [];
  const out = [];
  for (const raw of rows) {
    const file = safeRelativeFile(pluginDir, raw, 'plugin window script');
    if (!out.includes(file)) out.push(file);
  }
  return Object.freeze(out);
}

function finiteDimension(value, fallback) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function safeRelativeFile(baseDir, fileName, label) {
  const file = String(fileName || '').trim();
  if (!file || file.includes('/') || file.includes('\\') || file === '.' || file === '..') {
    throw new Error(`Invalid ${label}: ${file || '(empty)'}`);
  }
  const resolved = path.resolve(baseDir, file);
  const prefix = path.resolve(baseDir) + path.sep;
  if (!resolved.startsWith(prefix) || !fs.existsSync(resolved)) {
    throw new Error(`${label} not found: ${file}`);
  }
  return file;
}

function normalizeDependencies(value, requiresCore=[]) {
  const rows = Array.isArray(value) ? value : [];
  const out = [];
  const append = raw => {
    const id = String(raw || '').trim();
    if (!ALLOWED_WINDOW_DEPENDENCIES.has(id)) {
      throw new Error(`Unsupported plugin window dependency: ${id || '(empty)'}`);
    }
    if (!out.includes(id)) out.push(id);
  };
  for (const raw of rows) append(raw);

  // `requiresCore` is the canonical plugin/Core contract. Dedicated TOP
  // renderers must not maintain a second, drifting declaration for Core
  // infrastructure that is already implied by that contract. Domain/vendor
  // libraries (Plotly, D3, science modules) remain explicit window choices.
  for (const requirement of (Array.isArray(requiresCore) ? requiresCore : [])) {
    for (const dependency of (CORE_REQUIREMENT_WINDOW_DEPENDENCIES[String(requirement || '').trim()] || [])) append(dependency);
  }

  if (!out.includes('platform')) out.push('platform');
  if (!out.includes('plugin-kernel')) out.push('plugin-kernel');
  return Object.freeze(out);
}

function normalizeAlgorithmCategories(value) {
  return Object.freeze([...new Set((Array.isArray(value)?value:[]).map(raw=>String(raw||'').trim()).filter(Boolean))]);
}

function normalizeBuiltinAlgorithmProvider(appPath, pluginFolder, manifest) {
  if(manifest?.algorithmProvider!==true)return null;
  const categories=normalizeAlgorithmCategories(manifest.algorithmCategories);
  if(!categories.length)return null;
  const pluginDir=path.join(appPath,'src','plugins',pluginFolder);
  const entry=safeRelativeFile(pluginDir,manifest.entry||'plugin.js','algorithm provider entry');
  const scripts=[];
  for(const raw of (Array.isArray(manifest.scripts)&&manifest.scripts.length?manifest.scripts:[entry])){
    const file=safeRelativeFile(pluginDir,raw,'algorithm provider script');
    if(!scripts.includes(file))scripts.push(file);
  }
  if(!scripts.includes(entry))scripts.push(entry);
  return Object.freeze({source:'builtin',pluginId:String(manifest.id||''),version:String(manifest.version||''),pluginFolder,entry,scripts:Object.freeze(scripts),dependencies:normalizeDependencies([],manifest.requiresCore),algorithmCategories:categories});
}

function readBuiltinAlgorithmProviders(appPath) {
  const out=[];const pluginsDir=path.join(appPath,'src','plugins');
  try{
    for(const pluginFolder of fs.readdirSync(pluginsDir).sort()){
      if(pluginFolder.startsWith('_')||!/^[A-Za-z0-9._-]+$/.test(pluginFolder))continue;
      const manifestPath=path.join(pluginsDir,pluginFolder,'plugin.json');if(!fs.existsSync(manifestPath))continue;
      try{const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));const row=normalizeBuiltinAlgorithmProvider(appPath,pluginFolder,manifest);if(row)out.push(row);}catch(err){console.warn(`[DKDS algorithm provider] ${pluginFolder}: ${err.message}`);}
    }
  }catch(err){console.warn('[DKDS algorithm provider] manifest scan failed:',err.message);}
  return out;
}

function normalizePackagedAlgorithmProvider(pkg,source='external') {
  const manifest=pkg?.manifest||{};if(manifest.algorithmProvider!==true)return null;
  const categories=normalizeAlgorithmCategories(manifest.algorithmCategories);if(!categories.length)return null;
  const entry=packageFile(pkg,manifest.entry||'plugin.js','packaged algorithm provider entry'),scripts=[];
  for(const raw of (Array.isArray(manifest.scripts)&&manifest.scripts.length?manifest.scripts:[entry])){const file=packageFile(pkg,raw,'packaged algorithm provider script');if(!scripts.includes(file))scripts.push(file);}if(!scripts.includes(entry))scripts.push(entry);
  return Object.freeze({source,pluginId:String(manifest.id||''),version:String(manifest.version||''),entry,scripts:Object.freeze(scripts),dependencies:normalizeDependencies([],manifest.requiresCore),algorithmCategories:categories,packageFiles:Object.freeze({...pkg.files})});
}

function resolveAlgorithmProviders(appPath,externalPackages=[],overridePackages=[]) {
  const byId=new Map(readBuiltinAlgorithmProviders(appPath).map(row=>[row.pluginId,row]));
  for(const pkg of (Array.isArray(overridePackages)?overridePackages:[])){const id=String(pkg?.manifest?.id||'');if(!id)continue;byId.delete(id);try{const row=normalizePackagedAlgorithmProvider(pkg,'override');if(row)byId.set(id,row);}catch(err){console.warn(`[DKDS algorithm provider override] ${id}: ${err.message}`);}}
  for(const pkg of (Array.isArray(externalPackages)?externalPackages:[])){try{const row=normalizePackagedAlgorithmProvider(pkg,'external');if(row&&!byId.has(row.pluginId))byId.set(row.pluginId,row);}catch(err){console.warn(`[DKDS external algorithm provider] ${pkg?.manifest?.id||'unknown'}: ${err.message}`);}}
  return [...byId.values()];
}

function attachAlgorithmProviders(spec,providers=[]) {
  const categories=normalizeAlgorithmCategories(spec?.algorithmCategories);if(!categories.length)return Object.freeze({...spec,algorithmCategories:categories,algorithmProviders:Object.freeze([])});
  const wanted=new Set(categories),matched=(providers||[]).filter(row=>row.pluginId!==spec.pluginId&&row.algorithmCategories.some(category=>wanted.has(category)));
  const dependencies=[...(spec.dependencies||[])];for(const provider of matched)for(const dependency of (provider.dependencies||[]))if(!dependencies.includes(dependency))dependencies.push(dependency);
  return Object.freeze({...spec,algorithmCategories:categories,algorithmProviders:Object.freeze(matched),dependencies:Object.freeze(dependencies)});
}

function readBuiltinPluginWindows(appPath) {
  const pluginsDir = path.join(appPath, 'src', 'plugins');
  // The manifest tree is intentionally rescanned. Directory mtime alone does
  // not change when an existing plugin.json is edited, and stale lifecycle
  // metadata would make newly enabled/prewarmed windows behave incorrectly.
  const next = new Map();
  try {
    for (const pluginFolder of fs.readdirSync(pluginsDir).sort()) {
      if (pluginFolder.startsWith('_') || !/^[A-Za-z0-9._-]+$/.test(pluginFolder)) continue;
      const pluginDir = path.join(pluginsDir, pluginFolder);
      const manifestPath = path.join(pluginDir, 'plugin.json');
      if (!fs.existsSync(manifestPath)) continue;

      let manifest;
      try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
      catch { continue; }

      const windowSpec = manifest?.window;
      const activity = String(windowSpec?.activity || '').trim();
      if (!activity || !/^[A-Za-z0-9._-]+$/.test(activity)) continue;

      try {
        const mode=normalizeWindowMode(windowSpec.mode);
        const entry = safeRelativeFile(pluginDir, manifest.entry || 'plugin.js', 'plugin window entry');
        const runtime = windowSpec.runtime
          ? safeRelativeFile(pluginDir, windowSpec.runtime, 'plugin window runtime')
          : '';
        next.set(activity, Object.freeze({
          source:'builtin',
          mode,
          pluginId:String(manifest.id || ''),
          version:String(manifest.version || ''),
          revision:String(manifest.version || ''),
          pluginFolder,
          entry,
          runtime,
          activity,
          dependencies:normalizeDependencies(windowSpec.dependencies,manifest.requiresCore),
          scripts:normalizePluginScripts(pluginDir, windowSpec.scripts),
          algorithmCategories:normalizeAlgorithmCategories(manifest.algorithmCategories),
          title:String(windowSpec.title || manifest.name || activity),
          prewarm:windowSpec.prewarm !== false,
          reuse:windowSpec.reuse !== false,
          persistence:normalizePersistence(windowSpec.persistence),
          width:finiteDimension(windowSpec.width,1480),
          height:finiteDimension(windowSpec.height,940),
          minWidth:finiteDimension(windowSpec.minWidth,920),
          minHeight:finiteDimension(windowSpec.minHeight,650)
        }));
      } catch (err) {
        console.warn(`[DKDS plugin window] ${pluginFolder}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn('[DKDS plugin window] manifest scan failed:', err.message);
  }

  return next;
}

function packageFile(pkg, fileName, label) {
  const file = normalizeRelativeFile(fileName);
  if (!pkg?.files || typeof pkg.files[file] !== 'string') throw new Error(`${label} not found: ${file}`);
  return file;
}

function normalizePackagedPluginWindow(pkg, source='external') {
  const manifest=pkg?.manifest||{};
  const windowSpec=manifest?.window;
  const mode=normalizeWindowMode(windowSpec?.mode);
  const activity=String(windowSpec?.activity||'').trim();
  if(!activity)return null;
  if(!/^[A-Za-z0-9._-]+$/.test(activity))throw new Error(`Invalid packaged plugin window activity: ${activity}`);
  const entry=packageFile(pkg,manifest.entry||'plugin.js','packaged plugin entry');
  const runtime=windowSpec.runtime?packageFile(pkg,windowSpec.runtime,'packaged plugin window runtime'):'';
  const scripts=[];
  for(const raw of (Array.isArray(windowSpec.scripts)?windowSpec.scripts:[])){
    const file=packageFile(pkg,raw,'packaged plugin window script');
    if(!scripts.includes(file))scripts.push(file);
  }
  const packageScripts=[];
  for(const raw of (Array.isArray(manifest.scripts)&&manifest.scripts.length?manifest.scripts:[entry])){
    const file=packageFile(pkg,raw,'packaged plugin package script');
    if(!packageScripts.includes(file))packageScripts.push(file);
  }
  if(!packageScripts.includes(entry))packageScripts.push(entry);
  const styles=[];
  for(const raw of (Array.isArray(manifest.styles)?manifest.styles:[])){
    const file=packageFile(pkg,raw,'packaged plugin package style');
    if(!styles.includes(file))styles.push(file);
  }
  return Object.freeze({
    source,
    mode,
    pluginId:String(manifest.id||''),
    version:String(manifest.version||''),
    revision:String(pkg?.installedAt||manifest.version||''),
    entry,
    runtime,
    activity,
    dependencies:normalizeDependencies(windowSpec.dependencies,manifest.requiresCore),
    scripts:Object.freeze(scripts),
    algorithmCategories:normalizeAlgorithmCategories(manifest.algorithmCategories),
    packageScripts:Object.freeze(packageScripts),
    styles:Object.freeze(styles),
    packageFiles:Object.freeze({...pkg.files}),
    title:String(windowSpec.title||manifest.name||activity),
    prewarm:windowSpec.prewarm!==false,
    reuse:windowSpec.reuse!==false,
    persistence:normalizePersistence(windowSpec.persistence),
    width:finiteDimension(windowSpec.width,1480),
    height:finiteDimension(windowSpec.height,940),
    minWidth:finiteDimension(windowSpec.minWidth,920),
    minHeight:finiteDimension(windowSpec.minHeight,650)
  });
}

function normalizeExternalPluginWindow(pkg) {
  return normalizePackagedPluginWindow(pkg,'external');
}

function normalizeOverridePluginWindow(pkg) {
  return normalizePackagedPluginWindow(pkg,'override');
}

function readOverridePluginWindows(packages=[]) {
  const next=[];
  for(const pkg of (Array.isArray(packages)?packages:[])){
    try{next.push({pluginId:String(pkg?.manifest?.id||''),spec:normalizeOverridePluginWindow(pkg)});}
    catch(err){console.warn(`[DKDS plugin override window] ${pkg?.manifest?.id||'unknown'}: ${err.message}`);}
  }
  return next;
}

function readExternalPluginWindows(packages=[]) {
  const next=new Map();
  for(const pkg of (Array.isArray(packages)?packages:[])){
    try{
      const spec=normalizeExternalPluginWindow(pkg);
      if(!spec)continue;
      if(next.has(spec.activity))throw new Error(`Duplicate external plugin window activity: ${spec.activity}`);
      next.set(spec.activity,spec);
    }catch(err){
      console.warn(`[DKDS external plugin window] ${pkg?.manifest?.id||'unknown'}: ${err.message}`);
    }
  }
  return next;
}

function readPluginWindows(appPath, externalPackages=[], overridePackages=[]) {
  const combined=new Map(readBuiltinPluginWindows(appPath));
  // A trusted LAN override replaces the built-in plugin's complete independent
  // window contract, including the case where the update intentionally removes
  // manifest.window. External packages still cannot shadow a built-in activity.
  for(const row of readOverridePluginWindows(overridePackages)){
    for(const [activity,spec] of [...combined])if(spec.pluginId===row.pluginId)combined.delete(activity);
    if(row.spec)combined.set(row.spec.activity,row.spec);
  }
  for(const [activity,spec] of readExternalPluginWindows(externalPackages)){
    if(combined.has(activity)){
      console.warn(`[DKDS plugin window] duplicate activity ignored: ${activity} (${spec.pluginId})`);
      continue;
    }
    combined.set(activity,spec);
  }
  const providers=resolveAlgorithmProviders(appPath,externalPackages,overridePackages);
  for(const [activity,spec] of [...combined])combined.set(activity,attachAlgorithmProviders(spec,providers));
  return combined;
}

function listBuiltinPluginWindows(appPath) {
  const providers=resolveAlgorithmProviders(appPath,[],[]);
  return [...readBuiltinPluginWindows(appPath).values()].map(spec=>attachAlgorithmProviders(spec,providers));
}

function listPluginWindows(appPath, externalPackages=[], overridePackages=[]) {
  return [...readPluginWindows(appPath,externalPackages,overridePackages).values()];
}

function resolveBuiltinPluginWindow(appPath, activityId) {
  const spec=readBuiltinPluginWindows(appPath).get(String(activityId || '').trim()) || null;
  return spec?attachAlgorithmProviders(spec,resolveAlgorithmProviders(appPath,[],[])):null;
}

function resolvePluginWindow(appPath, activityId, externalPackages=[], overridePackages=[]) {
  return readPluginWindows(appPath,externalPackages,overridePackages).get(String(activityId||'').trim())||null;
}

module.exports = {
  ALLOWED_WINDOW_DEPENDENCIES,
  WINDOW_PERSISTENCE_MODES,
  WINDOW_MODES,
  normalizeWindowMode,
  normalizeAlgorithmCategories,
  resolveAlgorithmProviders,
  attachAlgorithmProviders,
  normalizeDependencies,
  normalizePersistence,
  normalizePackagedPluginWindow,
  normalizeExternalPluginWindow,
  normalizeOverridePluginWindow,
  readBuiltinPluginWindows,
  readExternalPluginWindows,
  readOverridePluginWindows,
  readPluginWindows,
  listBuiltinPluginWindows,
  listPluginWindows,
  resolveBuiltinPluginWindow,
  resolvePluginWindow
};
