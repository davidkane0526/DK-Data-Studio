const fs = require('fs');
const path = require('path');
const { normalizePluginPackage } = require('../plugin-package');

const folder = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
  console.error('Usage: node scripts/package-plugin.js <plugin-folder> [output.dkplugin]');
  process.exit(2);
}

const manifestPath = path.join(folder, 'plugin.json');
if (!fs.existsSync(manifestPath)) throw new Error(`plugin.json not found: ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (String(manifest.id || '').startsWith('builtin.')) {
  throw new Error('builtin.* plugins are application-owned and are not packaged for external installation. Copy _template and use your own plugin id.');
}

const referenced = new Set([
  manifest.entry || 'plugin.js',
  ...(manifest.scripts || []),
  ...(manifest.styles || []),
  ...(manifest.window?.runtime ? [manifest.window.runtime] : []),
  ...(manifest.window?.scripts || []),
  ...(fs.existsSync(path.join(folder, 'README.md')) ? ['README.md'] : [])
]);
const files = {};
for (const rel of referenced) {
  const file = path.resolve(folder, rel);
  if (!file.startsWith(folder + path.sep) && file !== folder) throw new Error(`Unsafe manifest path: ${rel}`);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Referenced plugin file not found: ${rel}`);
  files[String(rel).replace(/\\/g, '/')] = fs.readFileSync(file, 'utf8');
}

const pkg = normalizePluginPackage({ schema:1, manifest:{...manifest,source:'external'}, files }, { allowBuiltinId:false });
const output = path.resolve(process.argv[3] || `${manifest.id}-${manifest.version}.dkplugin`);
fs.writeFileSync(output, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`Created external plugin package: ${output}`);
