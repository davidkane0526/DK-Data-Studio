const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const navRegistration = fs.readFileSync(path.join(root, 'src', 'plugins', 'shell-navigation', 'plugin.js'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'src', 'core', 'recipes', 'shell-navigation.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const pluginManager = fs.readFileSync(path.join(root, 'src', 'core', 'plugin-manager-ui.js'), 'utf8');
const svg = fs.readFileSync(path.join(root, 'assets', 'dkds-mark.svg'), 'utf8');
const ico = fs.readFileSync(path.join(root, 'assets', 'dkds-icon.ico'));

assert.equal(pkg.build?.productName, 'DK Data Studio');
assert.equal(pkg.build?.appId, 'com.dk.datastudio');
assert.equal(pkg.build?.win?.executableName, 'DK Data Studio');
assert.equal(pkg.build?.win?.icon, 'assets/dkds-icon.ico');
assert(main.includes("app.setName(APP_NAME)"));
assert(main.includes("app.setAppUserModelId(APP_ID)"));
assert(main.includes("title: APP_NAME"));

assert(navRegistration.includes("ctx.recipes.use('shell-navigation'"),'shell navigation plugin must only register the Core-owned recipe');
assert(!nav.includes("const TOP_LEVEL="),'navigation must not whitelist activity ids');
assert(nav.includes('primaryButtons'),'navigation hierarchy must derive from registered primary activities');
assert(nav.includes('data-nav-density'));
assert(nav.includes("width>=980?'roomy':width>=720?'balanced':'compact'"));
assert(css.includes('v3.22 unified typography + light visual polish'));
assert(css.includes('--ui-font-family:'));
assert(css.includes('button:focus-visible'));
assert(css.includes('.lan-web-panel{\n  z-index:1100!important;'), 'LAN panel must stay above SUPER workspace divider');
assert(css.includes('.lan-web-panel .panel-header-actions>.panel-close'), 'LAN minimize/close controls must share one geometry contract');
assert(css.includes('.global-commandbar .compact-menu-anchor>#editMenuBtn{min-width:72px}'), 'edit command must match file-command button width');
assert(html.includes('class="lan-web-minimize-glyph"'), 'LAN minimize button must use a compact drawn glyph instead of a long text dash');
assert(css.includes('#lanWebMinimizeBtn .lan-web-minimize-glyph{') && css.includes('width:8px;') && css.includes('height:1px;'), 'LAN minimize glyph must stay short and visually light');
assert(css.includes('.global-commandbar .file-command-group{\n  height:42px;'), 'file command group must have an explicit outer height');
assert(css.includes('#pluginManagerList,.plugin-manager-card{overflow-anchor:none}'), 'plugin manager must disable browser scroll anchoring during card replacement');
assert(pluginManager.includes('captureManagerScroll')&&pluginManager.includes('restoreManagerScroll'), 'plugin manager must explicitly preserve its scroll position across enable/disable rerenders');
assert(pluginManager.includes("renderList({scroll:'top'})"), 'opening or filtering plugin manager should deliberately reset to the top instead of inheriting a stale scroll position');
assert(css.includes('.system-commandbar>.menu-anchor>#manageMenuBtn{\n  height:42px!important;') && css.includes('min-height:42px!important;'), 'standalone shell menus must override the shared 34px toolbar rule and match the file-command group outer height');
assert(css.includes('input[type="checkbox"],input[type="radio"]{accent-color:var(--accent);}'), 'Core must provide the default blue native checkbox/radio selected state.');
assert(css.includes('.dkds-scroll-x-compact{scrollbar-width:none')&&css.includes('.dkds-scroll-x-compact::-webkit-scrollbar{display:none;width:0;height:0}'), 'Core horizontal strips must hide scrollbar chrome.');
assert(css.includes('.dkds-horizontal-wheel-scroll{overscroll-behavior-inline:contain}')&&css.includes('.dkds-selection-item.dkds-selection-focused'), 'Core must own wheel-to-horizontal scrolling and linked-selection focus presentation.');

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
