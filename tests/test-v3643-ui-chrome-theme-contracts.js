const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const pkg=JSON.parse(read('package.json'));
const resonance=read('src/plugins/resonance-workbench/plugin.css');
const statusCss=read('src/styles/presentation/control-status.css');
const shellCss=read('src/styles/presentation/shell.css');
const integratedCss=read('src/styles/theme/integrated-command-chrome.css');
const scientific=read('src/styles/presentation/scientific.css');
const uiRuntime=read('src/core/ui/modules/runtime.js');
const selectPopup=read('src/core/ui/modules/controls/select-popup.js');
const contextActions=read('src/core/ui/modules/interaction/context-actions.js');
const material=read('src/core/theme/material-renderer.js');
const index=read('src/index.html');
const connectivityStructure=read('src/styles/structure/connectivity-panels.css');
const connectivityPresentation=read('src/styles/presentation/connectivity.css');
const floating=read('src/app/modules/floating-docks.js');
const updateStructure=read('src/styles/structure/analysis-shell.css');
const settings=read('src/core/ui/modules/dialog/settings.js');
const dialogs=read('src/styles/presentation/dialogs.css');

assert(/^3\.64\.(?:[3-9]|[1-9]\d+)$/.test(pkg.version),'UI contract restoration must remain on or beyond App v3.64.3');
assert(resonance.includes('--respar-main-chrome-height:36px')&&/\.respar-main-tools\{[^}]*height:var\(--respar-main-chrome-height\)/.test(resonance)&&/\.respar-main-legend\{[^}]*height:var\(--respar-main-chrome-height\)/.test(resonance),'resonance floating tools and legend must consume one shared vertical chrome height');

assert(/#statusBar\.statusbar \.plugin-status-icon\{\s*color:var\(--dkui-role-chrome-text/.test(statusCss),'all status icons must consume one Theme chrome text color');
assert(!/\[data-state="(?:ready|mcp|ok|busy|info|warn|error)"\] \.plugin-status-icon\{color:/.test(statusCss),'status state must not repaint individual bottom-bar icon colors');
assert(!shellCss.includes('.plugin-status-icon{color:')&&!integratedCss.includes('.theme-status-item .plugin-status-icon{color:'),'legacy secondary status icon color owners must stay removed');

assert(/\.dkds-plot-view-file-svg \{[^}]*stroke-width:1\.1/.test(scientific),'shared desktop/mobile PlotView export icon must use the compact position-control stroke weight');

assert(uiRuntime.includes("require('./controls/select-popup');"),'Core UI runtime must install the Theme-owned select popup bridge');
assert(selectPopup.includes("new ContextMenu(owner")&&selectPopup.includes("role:'listbox'")&&selectPopup.includes("event.preventDefault()")&&selectPopup.includes("dispatchEvent(new Event('change',{bubbles:true}))"),'single-select popups must replace the OS popup while preserving normal change semantics');
assert(contextActions.includes("item.selected===true")&&contextActions.includes("setAttribute('aria-selected','true')")&&contextActions.includes("String(role)==='listbox'"),'Core ContextMenu must expose themed selected-option/listbox semantics');

assert(index.includes('class="lan-web-port-control"')&&index.includes('id="lanWebPortUp" class="dkds-control-hit-region"')&&index.includes('id="lanWebPortDown" class="dkds-control-hit-region"'),'LAN port must use a Core-owned compact stepper rather than the Chromium number spinner');
assert(connectivityStructure.includes('::-webkit-inner-spin-button')&&connectivityStructure.includes('-webkit-appearance:none'),'native number spinners must remain suppressed for the LAN port control');
assert(connectivityPresentation.includes('.lan-web-port-stepper button span')&&material.includes('.dkds-control-hit-region'),'custom stepper arrows must use Theme text paint without acquiring an independent material surface');
assert(floating.includes("$('#lanWebPortUp').onclick=()=>stepLanWebPort(1)")&&floating.includes("$('#lanWebPortDown').onclick=()=>stepLanWebPort(-1)"),'custom LAN port arrows must remain functional');

assert(/\.update-panel\{--dkds-floating-z:1850;/.test(updateStructure),'software update panel must live on the floating system-panel layer instead of the obsolete z-index 190');
assert(index.includes('update-panel dkds-material-role-elevated hidden'),'software update panel must declare the shared elevated Theme role');
assert(floating.includes("DKDSMaterialSurface?.apply?.(panel,'elevated')")&&floating.includes('ensureFloatingPanelVisible(panel);'),'opening Software Update must materialize and clamp the visible panel');
assert(shellCss.includes('.update-status-card{')&&shellCss.includes('background:var(--dkui-surface-soft)')&&!/\.update-status-card\{[^}]*#[0-9a-f]{3,8}/i.test(shellCss),'update panel content must consume Theme tokens rather than light-only surfaces');

assert(settings.includes("overlay.className='dkds-settings-overlay dkds-overlay'")&&settings.includes('class="dkds-settings-dialog dkds-dialog-shell"'),'plugin settings must consume the same Core dialog/overlay contract as other dialogs');
assert(!dialogs.includes('.dkds-settings-overlay{background:'),'plugin settings must not keep a private backdrop opacity/blur rule');

console.log('v3.64.3 shared plot chrome, status colors, themed selects, LAN stepper, update panel and dialog optics contracts passed.');
