const fs = require('fs');
const path = require('path');
const { normalizePluginPackage } = require('../plugin-package');

const args=process.argv.slice(2);
const allowBuiltin=args.includes('--allow-builtin');
const positional=args.filter(x=>x!=='--allow-builtin');
const folder = path.resolve(positional[0] || '');
if (!positional[0] || !fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
  console.error('Usage: node scripts/package-plugin.js [--allow-builtin] <plugin-folder> [output.dkplugin]');
  process.exit(2);
}

const root=path.resolve(__dirname,'..');
const builtinRoot=path.join(root,'src','plugins')+path.sep;
const manifestPath = path.join(folder, 'plugin.json');
if (!fs.existsSync(manifestPath)) throw new Error(`plugin.json not found: ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const builtinId=String(manifest.id || '').startsWith('builtin.');
if (builtinId && !allowBuiltin) {
  throw new Error('builtin.* plugins are application-owned. Use --allow-builtin only when creating a trusted LAN plugin update package.');
}
if (builtinId && (!folder.startsWith(builtinRoot) || folder.includes(`${path.sep}_template${path.sep}`))) {
  throw new Error('--allow-builtin is restricted to built-in plugin folders under src/plugins/.');
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

const pkg = normalizePluginPackage({ schema:1, manifest, files }, { allowBuiltinId:builtinId && allowBuiltin });
const output = path.resolve(positional[1] || `${manifest.id}-${manifest.version}.dkplugin`);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`Created ${builtinId ? 'built-in update' : 'external'} plugin package: ${output}`);
