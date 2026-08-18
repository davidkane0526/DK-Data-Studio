const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'src', 'plugins', 'shell-navigation', 'plugin.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'style.css'), 'utf8');
const svg = fs.readFileSync(path.join(root, 'assets', 'dkds-mark.svg'), 'utf8');
const ico = fs.readFileSync(path.join(root, 'assets', 'dkds-icon.ico'));

assert.equal(pkg.build?.productName, 'DK Data Studio');
assert.equal(pkg.build?.appId, 'com.dk.datastudio');
assert.equal(pkg.build?.win?.executableName, 'DK Data Studio');
assert.equal(pkg.build?.win?.icon, 'assets/dkds-icon.ico');
assert(main.includes("app.setName(APP_NAME)"));
assert(main.includes("app.setAppUserModelId(APP_ID)"));
assert(main.includes("title: APP_NAME"));

assert(nav.includes("const TOP_LEVEL=['resonance','data-center','ter','pulse']"));
assert(nav.includes('data-nav-density'));
assert(nav.includes("width>=980?'roomy':width>=720?'balanced':'compact'"));
assert(css.includes('v3.22 unified typography + light visual polish'));
assert(css.includes('--ui-font-family:'));
assert(css.includes('button:focus-visible'));

const pathCount = (svg.match(/<path\b/g) || []).length;
assert.equal(pathCount, 1, 'brand mark should contain one resonance trace');
assert(svg.includes('#315efb'));
assert(svg.includes('#25b8a6'));

assert.equal(ico.readUInt16LE(0), 0);
assert.equal(ico.readUInt16LE(2), 1);
assert.equal(ico.readUInt16LE(4), 6, 'Windows ICO should contain 6 raster sizes');

for (const rel of [
  'assets/dkds-icon.png',
  'mobile/assets/icon.png',
  'mobile/assets/adaptive-icon.png'
]) {
  const st = fs.statSync(path.join(root, rel));
  assert(st.size > 1024, `${rel} should be regenerated`);
}

console.log('UI/brand/Windows identity checks passed.');
