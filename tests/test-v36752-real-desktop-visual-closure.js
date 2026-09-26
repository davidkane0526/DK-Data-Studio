'use strict';
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const tuple=v=>String(v).split('.').map(Number);
const atLeast=(v,min)=>{const a=tuple(v),b=tuple(min);for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};

const pkg=json('package.json');
assert(atLeast(pkg.version,'3.67.52'));

// Real screenshot regression 1: list-row selection is fill-only. Keep the
// frozen shell contract untouched; semantic classification and canonical
// Component Appearance prevent dataset rows from inheriting MenuItem/focus rims.
const shell=read('src/styles/presentation/shell.css');
const appearance=read('src/styles/theme/component-appearance.css');
const semantic=read('src/core/theme/semantic-registry.js');
assert(shell.includes('.dkds-selection-item.dkds-selection-focused{'));
assert(!semantic.includes("selector:'.dkds-menu-item,.dkds-list-item,"));
assert(semantic.includes('button.dkds-list-item')&&semantic.includes('.dkds-list-item[role="menuitem"]')&&semantic.includes('.dkds-list-item[role="option"]'));
assert(appearance.includes('.dkds-selection-item.dkds-selection-row:is(.dkds-selection-focused,.dkds-selection-selected,[aria-selected="true"])'));
assert(/dkds-selection-row:is\([^}]+\)\{[^}]*border-color:transparent;[^}]*outline:none;[^}]*box-shadow:none/s.test(appearance));

// Real screenshot regression 2: the previous emergency Desktop shrink to
// ~12px height was visually unusable on Windows. Desktop now keeps a compact
// but readable 28x28 target, while Native Mobile retains its independent 25x24
// contract.
const touch=read('src/styles/platform/touch.css');
const native=read('src/styles/platform/native-client-shell.css');
assert(touch.includes('--dkds-scientific-nav-item-width:22.176px;')&&touch.includes('--dkds-scientific-nav-item-height:25.2px;'),'Desktop scientific navigation must retain the accepted 22.176x25.2 geometry.');
assert(touch.includes('--dkds-scientific-nav-font-size:13px;'),'Desktop scientific navigation glyphs must remain readable after geometry restoration.');
assert(native.includes('html[data-dkds-host="mobile"].react-native-client .dkds-scientific-nav-tools')&&native.includes('--dkds-scientific-nav-item-width:')&&native.includes('--dkds-scientific-nav-item-height:'),'Native Mobile must retain independent scientific-control geometry.');

// Real screenshot regressions 3/4: child PlotView hover cannot paint outside
// its header, and every portable/group/titlebar action consumes one identical
// quiet hover surface, border and shadow. Close only changes foreground color.
const workspace=read('src/styles/structure/plugin-workspace.css');
assert(/\.dkds-plot-view-head\{[\s\S]*?overflow:visible;[\s\S]*?\}/.test(workspace),'PlotView title strips must allow the compact hover shadow to render without clipping.');
const chromeGeometry=read('src/styles/structure/desktop-chrome-geometry.css');
const schemaUi=read('src/styles/structure/schema-and-plugin-ui.css');
const superTop=read('src/styles/structure/super-top-contract.css');
assert(workspace.includes('.dkds-plot-view-head{')&&workspace.includes('--dkds-header-action-height:22px;'),'Compact PlotView headers must configure a 22 px semantic action-height slot.');
assert(chromeGeometry.includes('height:var(--dkds-header-action-height,26px);')&&chromeGeometry.includes('min-height:var(--dkds-header-action-height,26px);'),'Desktop Chrome Geometry must be the single final height/min-height owner for header actions.');
assert(superTop.includes('.dkds-portable-header{')&&superTop.includes('--dkds-header-action-height:22px;')&&schemaUi.includes('.trend-card-header{--dkds-header-action-height:22px;'),'Portable/trend title strips must use the same 22 px compact action geometry without leaf re-ownership.');
for(const leaf of ['.dkds-portable-icon-action','.dkds-panel-close-button','.dkds-portable-placement-trigger','.dkds-plot-view-action']){
  const block=chromeGeometry.match(new RegExp(leaf.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{[^}]*\\}'));
  if(block) assert(!block[0].includes('--dkds-header-action-height:'),`${leaf} must not shadow the context-owned header action-height token.`);
}
assert(appearance.includes('[data-dkds-component-identity="panelHeader"]')&&appearance.includes('[data-dkds-component-identity="inspectorHeader"]'),'Titlebar hover parity must be semantic and shared rather than class-whitelisted.');
for(const token of ['--dkds-titlebar-action-surface-hover','--dkds-titlebar-action-border-hover:transparent','--dkds-titlebar-action-shadow-hover','--dkds-ca-action-surface-hover:var(--dkds-titlebar-action-surface-hover)','--dkds-ca-action-border-hover:var(--dkds-titlebar-action-border-hover)','--dkds-ca-action-shadow-hover:var(--dkds-titlebar-action-shadow-hover)']) assert(appearance.includes(token),token);
assert(appearance.includes('[data-dkds-component-identity="toolbarAction"].dkds-panel-close-button:hover:not(:disabled)'));
assert(appearance.includes('background:var(--dkds-titlebar-action-surface-hover);color:var(--dkui-danger)'));

// Data Center production Unit cutover: Desktop and Mobile share one semantic
// composition while the accepted plugin CSS remains platform-specific detail.
const dcUnits=read('src/plugins/data-center/unit-presentation.js');
const dcRuntime=read('src/plugins/data-center/feature-runtime.js');
const dcManifest=json('src/plugins/data-center/plugin.json');
assert(dcUnits.includes('ctx.ui.unitTemplates')&&dcUnits.includes('units.workspace.create')&&dcUnits.includes('workbench.compose'));
assert(dcUnits.includes("id:'data-control'")&&dcUnits.includes("variant:'fixed-titleless'")&&dcUnits.includes("presentationRole:'data-control'"));
assert.strictEqual(dcManifest.platformPresentation.desktop.mode,'shared');
assert.strictEqual(dcManifest.platformPresentation.mobile.mode,'custom');
assert.deepStrictEqual(dcManifest.platformPresentation.mobile.scripts||[],[]);
assert((dcManifest.platformPresentation.mobile.styles||[]).includes('mobile.css'));
assert(!fs.existsSync(path.join(root,'src/plugins/data-center/mobile-presentation.js')),'obsolete Data Center Mobile presentation runtime must stay removed after Unit cutover.');
assert(dcRuntime.includes("root:{selector:workbench?'.data-center-body .dkds-plugin-workbench-root':'.data-center-body'}"));
assert(atLeast(dcManifest.version,'1.15.23'),'Data Center version must retain the production Unit cutover.');

for(const rel of ['src/styles/presentation/shell.css','src/styles/platform/touch.css','src/styles/platform/native-client-shell.css','src/styles/theme/component-appearance.css','src/styles/structure/plugin-workspace.css','src/plugins/data-center/plugin.css','src/plugins/data-center/mobile.css']){
  assert(!read(rel).includes('!important'),`${rel} must remain free of !important.`);
}
console.log('v3.67.52 real Desktop visual closure PASS: row selection, compact Desktop plot chrome, unified titlebar hover, Mobile toolbar isolation and Desktop Data Center restoration.');
