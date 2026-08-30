'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
const tuple=v=>String(v).split('.').slice(0,3).map(Number);
const atLeast=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
const plotStructure=read('src/styles/structure/plugin-workspace.css');
const vth=read('src/plugins/transfer-vth-lab/plugin.js');
const tabs=read('src/styles/theme/component-appearance.css');
const devCss=read('src/styles/presentation/plugin-devtools.css');
const html=read('src/index.html');
const lanStructure=read('src/styles/structure/connectivity-panels.css');
const lanPresentation=read('src/styles/presentation/connectivity.css');
const debug=read('src/core/theme/debug-runtime.js');
const aurora=read('src/plugins/aurora-pop-theme/plugin.js');
const docks=read('src/app/modules/floating-docks.js');
const menu=read('src/core/plugins/kernel/modules/shortcuts/menu.js');
const connectivity=read('src/plugins/connectivity-center/plugin.js');

assert(atLeast(tuple(pkg.version),[3,66,4]),'UI feedback closure requires DK Data Studio 3.66.4+.');

// 1. Plot titles are semantic elements; Core must neutralize heading margins so
// h3/strong/span titles share the same 28 px title-bar geometry.
assert(plotStructure.includes('.dkds-plot-view-title{min-width:0;height:100%;margin:0;box-sizing:border-box;'),'Core PlotView title geometry must reset native heading margins.');

// 2. Vth demo data is opt-in only. Opening/refreshing an empty workbench must
// reflect the real project source set rather than synthesizing a curve.
assert(vth.includes("else{sourceMode='empty';state.patch({selectedCurveId:null});}"),'Vth startup must remain empty when the project has no assigned transfer curves.');
assert(!vth.includes("else{curves=[demoCurve()];sourceMode='demo'")&&!vth.includes('keepDemo'),'Vth must not auto-load or silently retain demo data through source refresh.');
assert(vth.includes("ctx.commands.register('com.dkds.transfer-vth-lab.demo',()=>loadDemo())"),'The explicit demo command may remain available to the user.');

// 3/5. Data Center and Plugin DevTools use the same canonical Tab selected
// paint: one fill/border state, not fill + a second underline and not private CSS.
assert(!tabs.includes('box-shadow:inset 0 -2px 0 var(--dkds-ca-tab-indicator)'),'Canonical Tab selected/active state must not draw a second underline indicator.');
assert(!/\.dkds-plugin-devtools-window>nav button\{[^}]*?(?:background|border(?:-color)?|box-shadow)\s*:/s.test(devCss),'Plugin DevTools nav must not privately paint canonical Tabs.');

// 4. The LAN capability chips were inert descriptive chrome and are intentionally removed.
for(const source of [html,lanStructure,lanPresentation])assert(!source.includes('lan-web-capabilities'),'Inert LAN capability badges must stay removed.');

// 6. A vector close glyph has deterministic optical centering independent of font metrics.
assert(debug.includes('class="dkds-theme-debug-exit"')&&debug.includes('<svg viewBox="0 0 16 16"')&&devCss.includes('.dkds-theme-debug-exit>svg{display:block;width:12px;height:12px'),'Theme Inspector close control must use the centered vector icon contract.');

// 7. Aurora light active/secondary commands retain white labels and consume the shared light interaction palette.
assert(aurora.includes("surfaceActive:LIGHT_EMERALD.fill")&&aurora.includes("secondary:{surface:LIGHT_EMERALD.fill,surfaceHover:LIGHT_EMERALD.fillHover,text:'#FFFFFF'")&&aurora.includes("active:{surface:LIGHT_EMERALD.fill,text:'#FFFFFF'"),'Aurora light active/secondary commands must consume the shared Theme palette and keep white text.');

// 8. Import is one type-agnostic command. Its main button opens the local
// picker and Core classifies project versus data; an adjacent compact source
// trigger exposes SMB/other providers without turning provider choice into a
// top-level task. Save and Export remain the other two file commands.
assert(html.includes('id="openBtn" class="toolbar-btn strong"')&&html.includes('aria-label="导入">导入</button>'),'Main Import must be a direct type-agnostic command, not a source-menu trigger.');
assert(html.includes('id="importSourceBtn" class="toolbar-btn menu-trigger import-source-trigger"')&&html.includes('data-menu-target="importSourceMenu"'),'Import providers must live behind the separate compact source trigger.');
assert(!html.includes('id="openProjectBtn"')&&!html.includes('projectSourceMenu')&&!html.includes('data-plugin-menu="open-project"'),'Project opening must no longer be a separate top-level file command/provider mount.');
assert(html.includes('id="saveProjectBtn"')&&html.includes('>保存</button>')&&html.includes('id="exportMenuBtn" class="toolbar-btn menu-trigger"')&&html.includes('>导出</button>'),'File command group must be Import / Save / Export.');
assert(html.indexOf('id="openBtn"')<html.indexOf('id="saveProjectBtn"')&&html.indexOf('id="saveProjectBtn"')<html.indexOf('id="exportMenuBtn"'),'Import / Save / Export order must be stable.');
assert(html.includes('data-menu-align="left"')&&menu.includes(`closest?.('[data-menu-align="left"]')`),'Source chooser positioning must use the generic command-menu alignment contract.');
assert(docks.includes("$('#openBtn').onclick=openFilesAuto")&&docks.includes("$('#openLocalImportMenuBtn').onclick=openFilesAuto")&&!docks.includes('openLocalProjectMenuBtn'),'Main/local import paths must share Core automatic project/data classification.');
assert(connectivity.includes("menu:'import-data',label:'SMB 网络文件…'")&&connectivity.includes("onClick:()=>openSmb('auto')")&&!connectivity.includes("menu:'open-project'"),'SMB must be one type-agnostic import source.');
assert(connectivity.includes("id:'smb-browser',side:'right',order:31")&&connectivity.includes("label:'SMB'")&&connectivity.includes("onClick:()=>openSmb('auto')"),'Connectivity plugin must expose an SMB status-bar button that opens its own panel.');

console.log('v3.66.4 UI feedback closure PASS: plot titles, empty Vth, canonical tabs, LAN cleanup, Theme Inspector icon, Aurora interaction color, source chooser and SMB status are enforced.');
