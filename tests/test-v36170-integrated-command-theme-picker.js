'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const readComposition=require('./helpers/read-composition');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));


const actionCore=readComposition(root,'src/core/ui/composition');
const portable=readComposition(root,'src/core/ui/composition');
const curves=readComposition(root,'src/core/ui/composition');
const resonance=read('src/plugins/resonance-workbench/unit-presentation.js');
const appPanels=readComposition(root,'src/app');
const index=read('src/index.html');
const modern=read('src/styles/theme/integrated-command-chrome.css');
const materialModern=read('src/styles/theme/material-renderer.css');
const componentAppearance=read('src/styles/theme/component-appearance.css');
const semanticRegistry=read('src/core/theme/semantic-registry.js');
const status=read('src/plugins/status-monitor/plugin.js');
const statusManifest=json('src/plugins/status-monitor/plugin.json');

assert(actionCore.includes("classList.add('dkds-action-group','dkds-integrated-action-group','dkds-material-role-control')"),'Core ActionGroup keeps its default-theme control role.');
assert(portable.includes("classList.add('dkds-plot-view-actions','dkds-integrated-action-group')")&&!portable.includes("classList.add('dkds-plot-view-actions','dkds-integrated-action-group','dkds-material-role-control')"),'PlotView header actions are chrome-owned hit regions, not nested Material controls.');
assert(portable.includes('dkds-integrated-action-subgroup'),'portable position controls must merge into their parent action cluster instead of painting their own box.');
assert(curves.includes("dkds-scientific-nav-tools dkds-integrated-action-group dkds-material-role-floating"),'ScientificPlot floating navigation must be one integrated floating control.');
assert(!appPanels.includes('trend-header-actions dkds-integrated-action-group'),'Retired app-owned trend/group chrome must not survive beside PluginWorkspace-owned Resonance surfaces.');
assert(index.includes('panel-header-actions dkds-integrated-action-group')&&!index.includes('panel-header-actions dkds-integrated-action-group dkds-material-role-control'),'Core floating-panel header actions are chrome-owned.');
assert(resonance.includes("title:'曲线检查器'")&&resonance.includes("actionsClassName:'dkds-integrated-action-group'")&&!resonance.includes("actionsClassName:'dkds-integrated-action-group dkds-material-role-control'"),'Resonance production Unit inspector header actions are chrome-owned.');
assert(resonance.includes('组图面板')&&resonance.includes('data-respar-group-cols-menu-host'),'Resonance group header must keep its accepted menu inside the same action cluster while SDK adopts the header.');
assert(semanticRegistry.includes('INTEGRATED_CONTAINER_SELECTOR')&&semanticRegistry.includes('.statusbar-command-cluster')&&semanticRegistry.includes('chromeOwnedIntegrated(el)')&&semanticRegistry.includes("if(chromeOwnedIntegrated(el))return '';"),'Core semantic registry must flatten chrome-owned integrated action groups before Material-role assignment.');

assert(materialModern.includes(':where(.dkds-integrated-action-group,.panel-header-actions,.trend-header-actions,.dkds-plot-view-actions,.dkds-chart-actions,.dkds-surface-actions)')&&materialModern.includes('background:transparent')&&materialModern.includes('border-color:transparent')&&materialModern.includes('box-shadow:none'),'chrome-owned child action groups must not retain an independent Material card surface.');
assert(materialModern.includes('.dkds-scientific-nav-tools.dkds-material-role-floating')&&materialModern.includes('border-radius:9px'),'ScientificPlot navigation must expose one outer rounded Material shell.');
assert(componentAppearance.includes('[data-dkds-component-identity="toolbarAction"]:is(.dkds-panel-close-button,.window-control-close):hover:not(:disabled)'),'close regions may use canonical danger hover while remaining inside the shared command shell.');

assert(status.includes("id:'theme'")&&status.includes("label:'主题'"),'bottom status bar must expose a Theme command.');
assert(status.includes('id:\'dkdsThemePanel\'')&&status.includes('dkds-theme-profile-list')&&status.includes('data-dkds-theme-mode'),'Theme command must open an in-app profile + light/dark selection panel.');
assert(status.includes('window.DKDSTheme?.setProfile?.')&&status.includes('window.DKDSTheme?.set?.'),'Theme picker must switch both profile and appearance mode.');
assert(!status.includes("id:'runtime-mode'")&&!/label\s*:\s*['\"]桌面端['\"]/.test(status),'desktop runtime identity must no longer occupy permanent status-bar UI.');
assert(statusManifest.requiresCore.includes('ui.theme')&&statusManifest.capabilities.includes('ui.theme'),'status monitor must declare its Theme dependency/capability.');
assert(modern.includes('.dkds-theme-panel')&&status.includes("button.classList.toggle('active',active)")&&status.includes("button.setAttribute('aria-pressed',active?'true':'false')"),'Theme picker must expose selected state semantically instead of repainting it locally.');
assert(componentAppearance.includes('[data-dkds-component-identity="toolbarAction"]:is(.active,[aria-pressed="true"])'),'Theme picker selected paint must come from canonical Component Appearance.');

console.log('v3.61.71 integrated command chrome and bottom Theme picker contracts passed.');
