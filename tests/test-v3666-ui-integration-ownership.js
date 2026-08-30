'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
const tuple=v=>String(v).split('.').slice(0,3).map(Number);
const atLeast=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
const html=read('src/index.html');
const connectivity=read('src/plugins/connectivity-center/plugin.js');
const actionRuntime=read('src/core/ui/modules/interaction/context-actions.js');
const pageRuntime=read('src/core/plugins/kernel/modules/pages/panels.js');
const componentCss=read('src/styles/theme/component-appearance.css');
const pluginChrome=read('src/styles/presentation/plugin-chrome.css');
const shellCss=read('src/styles/presentation/shell.css');
const pulseCss=read('src/plugins/pulse-analysis/plugin.css');
const resonance=read('src/plugins/resonance-workbench/view-components.js');
const docks=read('src/app/modules/floating-docks.js');
const importWorkbench=read('src/app/modules/import-workbench.js');
const activityShell=read('src/core/plugins/kernel/modules/activity/shell.js');
const visualGate=read('tools/quality/visual-invariants.js');
const aurora=read('src/plugins/aurora-pop-theme/plugin.js');

assert(atLeast(tuple(pkg.version),[3,66,6]),'UI integration ownership closure requires DK Data Studio 3.66.6+.');

// SMB is one dialog surface. Internal regions may use muted fills for functional
// grouping, but must not instantiate nested surface/toolbar cards with their own
// radius and outline.
assert(connectivity.includes('dksmb-window dkds-dialog-shell'),'SMB must keep one Core-owned outer dialog surface.');
for(const forbidden of ['dksmb-browser dkds-surface','dksmb-toolbar dkds-toolbar','dksmb-connection dkds-action-row','dksmb-foot dkds-toolbar'])assert(!connectivity.includes(forbidden),`SMB internal card shell must stay removed: ${forbidden}`);
assert(connectivity.includes('dksmb-toolbar dkds-surface-muted')&&connectivity.includes('dksmb-connection dkds-surface-muted')&&connectivity.includes('dksmb-foot dkds-surface-muted'),'SMB functional regions should be distinguished by flat semantic fills rather than nested cards.');
assert(visualGate.includes('SMB browser must not create a rounded nested Core surface'),'Hard visual gate must protect flat SMB internal composition.');

// Header actions are canonical ToolbarActions. Separated actions explicitly own
// a standalone neutral control surface; Presentation no longer paints them by
// page location.
assert(actionRuntime.includes("button.dataset.dkdsComponentIdentity='toolbarAction'")&&actionRuntime.includes("button.dataset.dkdsActionLayout='standalone'"),'Core ActionGroup must assign canonical identity and standalone layout semantics at creation time.');
assert(pageRuntime.includes("close.dataset.dkdsActionLayout='standalone'")&&pageRuntime.includes("button.dataset.dkdsActionLayout='standalone'"),'Core page close/import actions must use the same standalone action composition.');
assert(componentCss.includes('[data-dkds-component-identity="toolbarAction"][data-dkds-action-layout="standalone"]:not([data-dkds-component-variant])'),'Standalone action paint must be owned by Component Appearance.');
assert(!pluginChrome.includes('.dkds-plugin-header-actions button {')&&!pluginChrome.includes('.analysis-page-header>.dkds-separated-action-group>.dkds-action-button {'),'Presentation must not repaint plugin-header actions.');
assert(!shellCss.includes('body.dkds-modern-ui button:not(.primary):not(.strong):not(.danger):not(.dkds-split-caret),'),'Legacy global action-border clearing must stay removed.');
assert(!shellCss.includes(':where(button,input,select,textarea):disabled{background:var(--dkui-disabled-surface)'),'Generic disabled paint must have one Theme/Component Appearance owner, not a Presentation duplicate.');

// Disabled actions keep the same component shape/material instead of turning
// into a differently filled capsule. Pulse supplies spacing only; no private
// visual state is introduced for Remove.
assert(componentCss.includes('[data-dkds-component-identity="toolbarAction"]:disabled{background:var(--dkds-ca-action-surface)'),'Disabled ToolbarAction must retain its canonical surface.');
assert(pulseCss.includes('gap:7px;')&&pulseCss.includes('margin-top:9px;'),'Pulse file action row must have clear breathing room from the heading block.');

// Resonance PRIME panels are already PortableView surfaces; the plugin must not
// pre-paint a second floating-surface owner underneath them.
assert(resonance.includes('respar-inspector-panel hidden')&&!resonance.includes('respar-inspector-panel dkds-floating-surface'),'Curve Inspector must have exactly one PortableView surface owner.');
assert(resonance.includes('respar-group-panel hidden')&&!resonance.includes('respar-group-panel dkds-floating-surface'),'Group panel must follow the same single-surface ownership rule.');

// File IA is Import / Save / Export. Import opens the local picker directly and
// Core auto-classifies project/data; providers such as SMB live behind the small
// adjacent source trigger.
assert(html.includes('aria-label="导入">导入</button>')&&html.includes('id="importSourceBtn"')&&html.includes('aria-label="保存">保存</button>')&&html.includes('>导出</button>'),'Top file command labels must be 导入 / 保存 / 导出 with a compact import-source trigger.');
assert(!html.includes('id="openProjectBtn"')&&!html.includes('projectSourceMenu'),'Separate Read Project command must stay removed.');
assert(html.indexOf('id="openBtn"')<html.indexOf('id="saveProjectBtn"')&&html.indexOf('id="saveProjectBtn"')<html.indexOf('id="exportMenuBtn"'),'File commands must remain ordered Import / Save / Export.');
assert(docks.includes("$('#openBtn').onclick=openFilesAuto")&&docks.includes("$('#openLocalImportMenuBtn').onclick=openFilesAuto"),'Main and local-source Import must share automatic classification.');
assert(importWorkbench.includes('async function openFilesAuto()')&&importWorkbench.includes('DKDSProjectFormat?.isProjectLike?.(raw)'),'Core import must classify project JSON versus ordinary data.');
assert(activityShell.includes("trigger.textContent='导出'")&&activityShell.includes("setAttribute('aria-label','导出')"),'Export presentation refresh must preserve the shortened label.');
assert(connectivity.includes("menu:'import-data',label:'SMB 网络文件…'")&&connectivity.includes("onClick:()=>openSmb('auto')")&&!connectivity.includes("menu:'open-project'"),'SMB must be one auto-classifying source rather than a separate project task.');

// Data Management / Tools / Software Management are one system command group.
const systemStart=html.indexOf('<div class="system-core-tools-group"');
const systemEnd=html.indexOf('</div>\n        </div>',systemStart);
const systemGroup=html.slice(systemStart,systemEnd);
for(const id of ['dataCenterSystemBtn','toolsMenuBtn','manageMenuBtn'])assert(systemGroup.includes(`id="${id}"`),`${id} must live inside the shared system group.`);
assert(!html.slice(systemEnd).includes('id="manageMenuBtn"'),'Software Management must not remain a standalone command outside the group.');

// Preserve v3.66.5's brighter Aurora emerald while completing the structural work.
assert(aurora.includes("fill:'#08A77A'")&&aurora.includes("accent:'#16C995'"),'Aurora light emerald refinement must not regress during UI closure.');

console.log('v3.66.6 UI integration ownership PASS: flat SMB, canonical header actions, pulse spacing, single-layer inspector, unified file IA and grouped system commands are enforced.');
