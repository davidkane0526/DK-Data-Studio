const fs = require('fs');
const path = require('path');

let cacheKey = '';
let byActivity = new Map();

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

function readBuiltinPluginWindows(appPath) {
  const pluginsDir = path.join(appPath, 'src', 'plugins');
  let stamp = pluginsDir;
  try {
    stamp += `:${fs.statSync(pluginsDir).mtimeMs}`;
  } catch {}
  if (stamp === cacheKey && byActivity.size) return byActivity;

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
        const entry = safeRelativeFile(pluginDir, manifest.entry || 'plugin.js', 'plugin window entry');
        const runtime = windowSpec.runtime
          ? safeRelativeFile(pluginDir, windowSpec.runtime, 'plugin window runtime')
          : '';
        next.set(activity, Object.freeze({
          pluginId:String(manifest.id || ''),
          pluginFolder,
          entry,
          runtime,
          activity,
          title:String(windowSpec.title || manifest.name || activity),
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

  cacheKey = stamp;
  byActivity = next;
  return byActivity;
}

function resolveBuiltinPluginWindow(appPath, activityId) {
  return readBuiltinPluginWindows(appPath).get(String(activityId || '').trim()) || null;
}

module.exports = { readBuiltinPluginWindows, resolveBuiltinPluginWindow };
