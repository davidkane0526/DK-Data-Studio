'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const readComposition=require('./helpers/read-composition');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));

assert.equal(json('package.json').version,'3.61.96','integrated command chrome release must be v3.61.96');
const actionCore=readComposition(root,'src/core/ui/composition');
const portable=readComposition(root,'src/core/ui/composition');
const curves=readComposition(root,'src/core/ui/composition');
const resonance=read('src/plugins/resonance-workbench/view-components.js');
const appPanels=readComposition(root,'src/app');
const index=read('src/index.html');
const modern=read('src/styles/theme/integrated-command-chrome.css');
const materialModern=read('src/styles/theme/material-renderer.css');
const status=read('src/plugins/status-monitor/plugin.js');
const statusManifest=json('src/plugins/status-monitor/plugin.json');

assert(actionCore.includes("classList.add('dkds-action-group','dkds-integrated-action-group','dkds-material-role-control')"),'Core ActionGroup keeps its default-theme control role.');
assert(portable.includes("classList.add('dkds-plot-view-actions','dkds-integrated-action-group')")&&!portable.includes("classList.add('dkds-plot-view-actions','dkds-integrated-action-group','dkds-material-role-control')"),'PlotView header actions are chrome-owned hit regions, not nested Material controls.');
assert(portable.includes('dkds-integrated-action-subgroup'),'portable position controls must merge into their parent action cluster instead of painting their own box.');
assert(curves.includes("dkds-scientific-nav-tools dkds-integrated-action-group dkds-material-role-floating"),'ScientificPlot floating navigation must be one integrated floating control.');
assert(appPanels.includes('trend-header-actions dkds-integrated-action-group')&&!appPanels.includes('trend-header-actions dkds-integrated-action-group dkds-material-role-control'),'Core trend/FWHM header actions are owned by their chrome header.');
assert(index.includes('panel-header-actions dkds-integrated-action-group')&&!index.includes('panel-header-actions dkds-integrated-action-group dkds-material-role-control'),'Core floating-panel header actions are chrome-owned.');
assert(resonance.includes('曲线检查器</span><div class="dkds-integrated-action-group"')&&!resonance.includes('曲线检查器</span><div class="dkds-integrated-action-group dkds-material-role-control"'),'Resonance inspector header actions are chrome-owned.');
assert(resonance.includes('组图面板')&&resonance.includes('data-respar-group-cols-menu-host'),'Resonance group header must keep its menu inside the same action cluster.');
assert(modern.includes('[data-dkds-material-role="chrome"]')&&modern.includes('.statusbar-command-cluster'),'Core chrome ownership must flatten nested action paint independent of Theme profile identity.');

assert(modern.includes('display:contents')&&modern.includes('background:transparent')&&modern.includes('box-shadow:none')&&modern.includes('transform:none'),'nested/child command actions must not retain independent card visuals or hover lift.');
assert(modern.includes('.dkds-scientific-nav-tools')&&modern.includes('border-radius:9px'),'ScientificPlot navigation must expose one outer rounded material shell.');
assert(modern.includes('button:is(.panel-close,.dkds-portable-close-action):hover'),'close regions may use danger hover while remaining inside the shared command shell.');

assert(status.includes("id:'theme'")&&status.includes("label:'主题'"),'bottom status bar must expose a Theme command.');
assert(status.includes('id:\'dkdsThemePanel\'')&&status.includes('dkds-theme-profile-list')&&status.includes('data-dkds-theme-mode'),'Theme command must open an in-app profile + light/dark selection panel.');
assert(status.includes('window.DKDSTheme?.setProfile?.')&&status.includes('window.DKDSTheme?.set?.'),'Theme picker must switch both profile and appearance mode.');
assert(!status.includes("id:'runtime-mode'")&&!status.includes('桌面端'),'desktop runtime identity must no longer occupy permanent status-bar UI.');
assert(statusManifest.requiresCore.includes('ui.theme')&&statusManifest.capabilities.includes('ui.theme'),'status monitor must declare its Theme dependency/capability.');
assert(modern.includes('.dkds-theme-panel')&&modern.includes('.dkds-theme-profile-option.active'),'Theme picker must be Core-themed and expose a selected profile state.');

console.log('v3.61.71 integrated command chrome and bottom Theme picker contracts passed.');
