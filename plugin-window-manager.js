const fs = require('fs');
const path = require('path');
const { normalizeRelativeFile } = require('./plugin-package');

const ALLOWED_WINDOW_DEPENDENCIES = new Set([
  'plotly',
  'science-common',
  'science-import',
  'science-pulse',
  'science-ter',
  'data-model',
  'formula-engine',
  'parameter-schema',
  'workflow-engine',
  'platform',
  'plugin-kernel'
]);


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

function normalizeDependencies(value) {
  const rows = Array.isArray(value) ? value : [];
  const out = [];
  for (const raw of rows) {
    const id = String(raw || '').trim();
    if (!ALLOWED_WINDOW_DEPENDENCIES.has(id)) {
      throw new Error(`Unsupported plugin window dependency: ${id || '(empty)'}`);
    }
    if (!out.includes(id)) out.push(id);
  }
  if (!out.includes('platform')) out.push('platform');
  if (!out.includes('plugin-kernel')) out.push('plugin-kernel');
  return Object.freeze(out);
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
          dependencies:normalizeDependencies(windowSpec.dependencies),
          scripts:normalizePluginScripts(pluginDir, windowSpec.scripts),
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

function normalizeExternalPluginWindow(pkg) {
  const manifest=pkg?.manifest||{};
  const windowSpec=manifest?.window;
  const mode=normalizeWindowMode(windowSpec?.mode);
  const activity=String(windowSpec?.activity||'').trim();
  if(!activity)return null;
  if(!/^[A-Za-z0-9._-]+$/.test(activity))throw new Error(`Invalid external plugin window activity: ${activity}`);
  const entry=packageFile(pkg,manifest.entry||'plugin.js','external plugin entry');
  const runtime=windowSpec.runtime?packageFile(pkg,windowSpec.runtime,'external plugin window runtime'):'';
  const scripts=[];
  for(const raw of (Array.isArray(windowSpec.scripts)?windowSpec.scripts:[])){
    const file=packageFile(pkg,raw,'external plugin window script');
    if(!scripts.includes(file))scripts.push(file);
  }
  const packageScripts=[];
  for(const raw of (Array.isArray(manifest.scripts)&&manifest.scripts.length?manifest.scripts:[entry])){
    const file=packageFile(pkg,raw,'external plugin package script');
    if(!packageScripts.includes(file))packageScripts.push(file);
  }
  if(!packageScripts.includes(entry))packageScripts.push(entry);
  const styles=[];
  for(const raw of (Array.isArray(manifest.styles)?manifest.styles:[])){
    const file=packageFile(pkg,raw,'external plugin package style');
    if(!styles.includes(file))styles.push(file);
  }
  return Object.freeze({
    source:'external',
    mode,
    pluginId:String(manifest.id||''),
    version:String(manifest.version||''),
    revision:String(pkg?.installedAt||manifest.version||''),
    entry,
    runtime,
    activity,
    dependencies:normalizeDependencies(windowSpec.dependencies),
    scripts:Object.freeze(scripts),
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

function readPluginWindows(appPath, externalPackages=[]) {
  const combined=new Map(readBuiltinPluginWindows(appPath));
  for(const [activity,spec] of readExternalPluginWindows(externalPackages)){
    if(combined.has(activity)){
      console.warn(`[DKDS plugin window] duplicate activity ignored: ${activity} (${spec.pluginId})`);
      continue;
    }
    combined.set(activity,spec);
  }
  return combined;
}

function listBuiltinPluginWindows(appPath) {
  return [...readBuiltinPluginWindows(appPath).values()];
}

function listPluginWindows(appPath, externalPackages=[]) {
  return [...readPluginWindows(appPath,externalPackages).values()];
}

function resolveBuiltinPluginWindow(appPath, activityId) {
  return readBuiltinPluginWindows(appPath).get(String(activityId || '').trim()) || null;
}

function resolvePluginWindow(appPath, activityId, externalPackages=[]) {
  return readPluginWindows(appPath,externalPackages).get(String(activityId||'').trim())||null;
}

module.exports = {
  ALLOWED_WINDOW_DEPENDENCIES,
  WINDOW_PERSISTENCE_MODES,
  WINDOW_MODES,
  normalizeWindowMode,
  normalizeDependencies,
  normalizePersistence,
  normalizeExternalPluginWindow,
  readBuiltinPluginWindows,
  readExternalPluginWindows,
  readPluginWindows,
  listBuiltinPluginWindows,
  listPluginWindows,
  resolveBuiltinPluginWindow,
  resolvePluginWindow
};
