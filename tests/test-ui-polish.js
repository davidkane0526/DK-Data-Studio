const fs = require('fs');
const path = require('path');
const {readCoreCss}=require('./css-source');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const main = fs.readFileSync(path.join(root, 'desktop/main.js'), 'utf8');
const navRegistration = fs.readFileSync(path.join(root, 'src', 'plugins', 'shell-navigation', 'plugin.js'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'src', 'core', 'recipes', 'shell-navigation.js'), 'utf8');
const css = readCoreCss(root);
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const pluginManager = fs.readFileSync(path.join(root, 'src', 'core', 'plugins', 'manager-ui.js'), 'utf8');
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
assert(!nav.includes('data-nav-density'),'dead width-density navigation mode must not return');
assert(css.includes('--ui-font-family:'));
assert(css.includes('button:focus-visible'));
assert(/\.floating-panel(?::not\(\.dkds-portable-view\))?\s*\{[^}]*z-index\s*:\s*var\(--dkds-floating-z,100\)/i.test(css), 'Legacy floating panels must consume semantic stacking while excluding PortableView geometry ownership.');
assert(/\.lan-web-panel\s*\{[^}]*--dkds-floating-z\s*:\s*1850/i.test(css), 'LAN panel must declare its semantic stacking level above shell chrome.');
assert(!/\.floating-panel\.lan-web-panel\s*\{/i.test(css), 'LAN visibility must not be repaired with a higher-specificity selector patch.');
assert(html.includes('class="panel-close dkds-panel-close-button" data-target="lanWebPanel"') && css.includes('.dkds-panel-close-button'), 'LAN close control must consume the shared Core close-button geometry contract');
assert(/\.global-commandbar\s+\.compact-menu-anchor>#editMenuBtn\s*\{[^}]*min-width\s*:\s*72px/i.test(css), 'edit command must match file-command button width');
assert(html.includes('class="lan-web-minimize-glyph"'), 'LAN minimize button must use a compact drawn glyph instead of a long text dash');
assert(/#lanWebMinimizeBtn\s+\.lan-web-minimize-glyph\s*\{[^}]*width\s*:\s*8px[^}]*height\s*:\s*1px/i.test(css), 'LAN minimize glyph must stay short and visually light');
assert(css.includes('--dkds-shell-group-height:38px') && /\.dkds-segmented-command-group\s*\{[^}]*height\s*:\s*var\(--dkds-shell-group-height\)/i.test(css), 'file/system command groups must consume the canonical segmented shell-group outer height');
assert(/#pluginManagerList\s*,\s*\.plugin-manager-card\s*\{[^}]*overflow-anchor\s*:\s*none/i.test(css), 'plugin manager must disable browser scroll anchoring during card replacement');
assert(pluginManager.includes('captureManagerScroll')&&pluginManager.includes('restoreManagerScroll'), 'plugin manager must explicitly preserve its scroll position across enable/disable rerenders');
assert(pluginManager.includes("renderList({scroll:'top'})"), 'opening or filtering plugin manager should deliberately reset to the top instead of inheriting a stale scroll position');
assert(html.includes('class="toolbar-group system-core-tools-group dkds-segmented-command-group" role="group"')&&/\.system-core-tools-group\s*\{[^}]*display\s*:\s*flex/i.test(css)&&/\.dkds-segmented-command-group>\.toolbar-btn,\.dkds-segmented-command-group>\.menu-anchor>\.toolbar-btn\s*\{[^}]*min-width\s*:\s*0/i.test(css), 'Data Management, Tools and Software Management must share the same canonical segmented command geometry as Import/Save/Export.');
assert(/body\.dkds-modern-ui\s+input\[type="checkbox"\]\s*,\s*body\.dkds-modern-ui\s+input\[type="radio"\]\s*\{[^}]*accent-color\s*:\s*var\(--accent-primary\)/i.test(css), 'Core must provide the default blue native checkbox/radio selected state.');
assert(/\.dkds-scroll-x-compact\s*\{[^}]*scrollbar-width\s*:\s*none/i.test(css)&&/\.dkds-scroll-x-compact::\-webkit-scrollbar\s*\{[^}]*display\s*:\s*none[^}]*width\s*:\s*0[^}]*height\s*:\s*0/i.test(css), 'Core horizontal strips must hide scrollbar chrome.');
assert(/\.dkds-horizontal-wheel-scroll\s*\{[^}]*overscroll-behavior-inline\s*:\s*contain/i.test(css)&&/\.dkds-selection-item\.dkds-selection-focused\s*\{/i.test(css), 'Core must own wheel-to-horizontal scrolling and linked-selection focus presentation.');

const pathCount = (svg.match(/<path\b/g) || []).length;
assert.equal(pathCount, 1, 'brand mark should contain one resonance trace');
assert(svg.includes('#155eef'));
assert(!svg.includes('#12bfa6') && !/<circle\b/.test(svg), 'brand mark must not restore the removed green peak dot');

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
