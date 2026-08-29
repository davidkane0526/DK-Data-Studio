const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = process.env.DKDS_REPO_ROOT
  ? path.resolve(process.env.DKDS_REPO_ROOT)
  : path.resolve(mobileRoot, '..');
const source = path.join(repoRoot, 'src');
const out = path.join(mobileRoot, 'assets', 'web');
const runtimeAssetManifest = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'runtime-assets.json'), 'utf8'));
const runtimeBundleFiles = (runtimeAssetManifest.apkAssets || []).map(value => {
  const prefix = 'assets/dkds/';
  const file = String(value || '').replaceAll('\\','/');
  if (!file.startsWith(prefix)) throw new Error(`Invalid Android runtime asset path: ${file}`);
  return file.slice(prefix.length);
});

// Keep desktop, web favicon and Android launcher assets on the same generated
// abstract mark before Expo prebuild copies Android resources.
execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'generate-brand-assets.js')], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env, DKDS_MOBILE_ASSET_ROOT: mobileRoot }
});
execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'generate-sdk-authoring-reference.js')], { cwd: repoRoot, stdio: 'inherit' });

// Mobile builds must always package the current plugin set.
execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'generate-plugin-index.js')], { cwd: repoRoot, stdio: 'inherit' });
execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'validate-plugins.js')], { cwd: repoRoot, stdio: 'inherit' });

function requireFile(rel) {
  const p = path.join(mobileRoot, rel);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing ${rel}. Run npm install inside mobile first.`);
  }
  return p;
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(source, out, { recursive: true });
const sharedAssets = path.join(repoRoot, 'assets');
if (fs.existsSync(sharedAssets)) fs.cpSync(sharedAssets, path.join(out, 'assets'), { recursive: true });

// Theme Contract is shared SDK runtime data, not desktop-only source. Package the
// exact contract modules consumed by src/index.html so Android uses the same
// validated Theme/Material/Coverage semantics as Electron.
const sdkOut = path.join(out, 'sdk');
fs.mkdirSync(sdkOut, { recursive: true });
for (const name of ['semver-compat.js','theme-contract.js','theme-coverage-contract.js']) {
  fs.copyFileSync(path.join(repoRoot, 'sdk', name), path.join(sdkOut, name));
}

const vendor = path.join(out, 'vendor');
fs.mkdirSync(vendor, { recursive: true });
fs.copyFileSync(requireFile('node_modules/d3/dist/d3.min.js'), path.join(vendor, 'd3.min.js'));

const indexPath = path.join(out, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html
  .replace('../node_modules/d3/dist/d3.min.js', 'vendor/d3.min.js')
  .replaceAll('../assets/', 'assets/')
  .replaceAll('../sdk/', 'sdk/')
  .replace('<title>DK Data Studio</title>', '<title>DK Data Studio Mobile</title>');
fs.writeFileSync(indexPath, html, 'utf8');

const marker = {
  generatedAt: new Date().toISOString(),
  source: '../src',
  purpose: 'React Native Android WebView offline bundle'
};
fs.writeFileSync(path.join(out, 'mobile-bundle.json'), JSON.stringify(marker, null, 2) + '\n', 'utf8');

const missingRuntimeFiles = runtimeBundleFiles.filter(file => !fs.existsSync(path.join(out, file)));
if (missingRuntimeFiles.length) throw new Error(`Mobile bundle is missing required runtime assets: ${missingRuntimeFiles.join(', ')}`);

console.log(`Prepared mobile web bundle: ${out}`);
