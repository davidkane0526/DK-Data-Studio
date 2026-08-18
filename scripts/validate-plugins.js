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
  if(m.scripts!==undefined){
    if(!Array.isArray(m.scripts)||!m.scripts.length)fail(`${name}: scripts must be a non-empty array when declared`);
    else for(const raw of m.scripts){
      const file=String(raw||'').replace(/\\/g,'/');
      if(!file||file.startsWith('/')||file.includes('..'))fail(`${name}: unsafe scripts entry ${file||'(empty)'}`);
      else if(!fs.existsSync(path.join(dir,file)))fail(`${name}: script not found ${file}`);
      else if(!file.toLowerCase().endsWith('.js'))fail(`${name}: plugin scripts must be JavaScript: ${file}`);
    }
    if(Array.isArray(m.scripts)&&!m.scripts.includes(m.entry||'plugin.js'))fail(`${name}: scripts must include entry ${m.entry||'plugin.js'}`);
  }

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
      for(const field of ['prewarm','reuse']){
        if(m.window[field]!==undefined&&typeof m.window[field]!=='boolean')fail(`${name}: window.${field} must be boolean`);
      }
      if(m.window.persistence!==undefined&&!['project','memory','none'].includes(String(m.window.persistence))){
        fail(`${name}: window.persistence must be project, memory or none`);
      }
      if(m.window.scripts!==undefined){
        if(!Array.isArray(m.window.scripts))fail(`${name}: window.scripts must be an array`);
        else for(const raw of m.window.scripts){
          const file=String(raw||'');
          if(!file||file.includes('/')||file.includes('\\')||file==='.'||file==='..')fail(`${name}: window.scripts entries must be files in the plugin directory`);
          else if(!fs.existsSync(path.join(dir,file)))fail(`${name}: window script not found ${file}`);
        }
      }
    }
  }
}

if (!process.exitCode) console.log(`Plugin manifests OK: ${count}`);
