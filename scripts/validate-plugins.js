const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pluginsDir = path.join(root, 'src', 'plugins');
const ids = new Set();
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
}

if (!process.exitCode) console.log(`Plugin manifests OK: ${count}`);
