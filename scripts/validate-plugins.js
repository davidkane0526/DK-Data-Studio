const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pluginsDir = path.join(root, 'src', 'plugins');
const ids = new Set();
const windowActivities = new Set();
let count = 0;

function fail(message) {
  console.error(`PLUGIN VALIDATION ERROR: ${message}`);
  process.exitCode = 2;
}

for (const name of fs.readdirSync(pluginsDir).sort()) {
  if (name.startsWith('_')) continue;
  const dir = path.join(pluginsDir, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const manifestPath = path.join(dir, 'plugin.json');
  if (!fs.existsSync(manifestPath)) continue;
  count++;

  let m;
  try { m = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch (err) { fail(`${name}/plugin.json invalid JSON: ${err.message}`); continue; }

  for (const field of ['id','name','version','entry']) if (!m[field]) fail(`${name}: missing ${field}`);
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(String(m.id || ''))) fail(`${name}: invalid id ${m.id}`);
  if (ids.has(m.id)) fail(`${name}: duplicate id ${m.id}`);
  ids.add(m.id);

  const entry = path.join(dir, m.entry || 'plugin.js');
  if (!fs.existsSync(entry)) fail(`${name}: entry not found ${m.entry}`);
  if (m.apiVersion && !String(m.apiVersion).startsWith('1.')) fail(`${name}: unsupported apiVersion ${m.apiVersion}`);

  if (m.window !== undefined) {
    if (!m.window || typeof m.window !== 'object' || Array.isArray(m.window)) {
      fail(`${name}: window must be an object`);
    } else {
      const activity=String(m.window.activity||'').trim();
      if (!/^[a-z0-9][a-z0-9._-]*$/i.test(activity)) fail(`${name}: invalid window.activity ${activity||'(empty)'}`);
      else if(windowActivities.has(activity)) fail(`${name}: duplicate window.activity ${activity}`);
      else windowActivities.add(activity);

      if(m.window.runtime){
        const runtime=String(m.window.runtime);
        if(runtime.includes('/')||runtime.includes('\\')||runtime==='.'||runtime==='..')fail(`${name}: window.runtime must be a file in the plugin directory`);
        else if(!fs.existsSync(path.join(dir,runtime)))fail(`${name}: window runtime not found ${runtime}`);
      }
      for(const field of ['width','height','minWidth','minHeight']){
        if(m.window[field]!==undefined&&(!(Number(m.window[field])>0)))fail(`${name}: invalid window.${field}`);
      }
    }
  }
}

if (!process.exitCode) console.log(`Plugin manifests OK: ${count}`);
