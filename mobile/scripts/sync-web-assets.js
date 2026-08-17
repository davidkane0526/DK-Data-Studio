const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '..');
const source = path.join(repoRoot, 'src');
const out = path.join(mobileRoot, 'assets', 'web');

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

const vendor = path.join(out, 'vendor');
fs.mkdirSync(vendor, { recursive: true });
fs.copyFileSync(requireFile('node_modules/d3/dist/d3.min.js'), path.join(vendor, 'd3.min.js'));
fs.copyFileSync(requireFile('node_modules/plotly.js-dist-min/plotly.min.js'), path.join(vendor, 'plotly.min.js'));

const indexPath = path.join(out, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html
  .replace('../node_modules/d3/dist/d3.min.js', 'vendor/d3.min.js')
  .replace('../node_modules/plotly.js-dist-min/plotly.min.js', 'vendor/plotly.min.js')
  .replace('<title>DK Data Studio</title>', '<title>DK Data Studio Mobile</title>');
fs.writeFileSync(indexPath, html, 'utf8');

const marker = {
  generatedAt: new Date().toISOString(),
  source: '../src',
  purpose: 'React Native Android WebView offline bundle'
};
fs.writeFileSync(path.join(out, 'mobile-bundle.json'), JSON.stringify(marker, null, 2) + '\n', 'utf8');

console.log(`Prepared mobile web bundle: ${out}`);
