'use strict';
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));



// Vth is a first-party TOP workspace and therefore must be present in the same
// built-in machine-readable registry used by every other dedicated workspace.
const vth=json('src/plugins/transfer-vth-lab/plugin.json');
assert.equal(vth.id,'com.dkds.transfer-vth-lab');
{const parts=String(vth.version||'0.0.0').split('.').map(Number);const current=(parts[0]||0)*1e6+(parts[1]||0)*1e3+(parts[2]||0);assert(current>=3000005,'Vth built-in must remain at or above the v3.0.5 TOP-workspace baseline.');}
assert.equal(vth.workspace?.role,'top');
assert.equal(vth.workspace?.activity,'transfer-vth-lab');
assert.equal(vth.window?.activity,'transfer-vth-lab');
const vthRuntime=read('src/plugins/transfer-vth-lab/plugin.js');
assert(vthRuntime.includes("id:'transfer-vth-lab'")&&vthRuntime.includes('ctx.ui.topWorkspace.register'),'Vth built-in must register the same TOP/workspace contract as other first-party workbenches.');
const windowManager=require(path.join(root,'desktop/plugin-window-manager.js'));
const vthWindow=windowManager.listBuiltinPluginWindows(root).find(row=>row.activity==='transfer-vth-lab');
assert(vthWindow&&vthWindow.pluginId==='com.dkds.transfer-vth-lab','Vth dedicated workspace must be discoverable by the main-process built-in window registry.');

const css=readCoreCss(root);
assert(css.includes('body.dkds-modern-ui .dkds-analysis-nav-btn')&&css.includes('.statusbar-command-cluster'),'release must carry the semantic control/status composition layer.');
assert(css.includes('body.dkds-modern-ui .dkds-analysis-nav-btn')&&css.includes('border:0;'),'AnalysisWorkbench navigation may not retain the legacy bright outlined-button treatment.');
const dialogRuntime=read('src/core/ui/modules/dialog/settings.js');
const semanticRegistry=read('src/core/theme/semantic-registry.js');
const componentAppearance=read('src/styles/theme/component-appearance.css');
assert(dialogRuntime.includes("button.dataset.dkdsComponentIdentity='toolbarAction'")&&dialogRuntime.includes("button.dataset.dkdsComponentVariant=variant")&&dialogRuntime.includes("kind==='danger'?'destructive'")&&semanticRegistry.includes("matches(el,'.primary,.strong')")&&componentAppearance.includes('[data-dkds-component-identity="toolbarAction"]'),'history/core dialog actions must declare canonical ToolbarAction semantic variants synchronously rather than rely on Presentation-owned control paint.');
assert(css.includes('.statusbar-command-cluster')&&css.includes('body.dkds-modern-ui .plugin-status-item::before{display:none}'),'status actions must be one shared command cluster without stitched vertical separators.');

const html=read('src/index.html');
const dedicatedHtml=read('src/plugin-window/index.html');
for(const source of [html,dedicatedHtml]){
  assert(source.includes('class="statusbar-command-cluster"'),'main and dedicated windows must share the same integrated status-command shell.');
  assert(source.indexOf('statusBarPluginLeft')>source.indexOf('statusbar-command-cluster')&&source.indexOf('statusBarPluginRight')>source.indexOf('statusbar-command-cluster'),'both status zones must live inside the shared command cluster.');
}

const app=read('src/generated/runtime/app.js');
assert(app.includes('function floatingSafeBounds(panel)')&&app.includes('function ensureFloatingPanelVisible(panel'),'floating service panels need a Core-owned viewport avoidance helper.');
assert(app.includes("ensureFloatingPanelVisible(panel,{preferCenter:panel.dataset.dkdsUserMoved!=='1'})"),'LAN web service must default to a fully visible work-area position rather than reopening under shell chrome.');
assert(app.includes("panel.dataset.dkdsUserMoved='1'")&&app.includes('const bounds=floatingSafeBounds(panel)'),'manual floating-panel drag must stay bounded and preserve user placement.');

console.log('v3.61.55 Vth workspace, modern controls, floating-panel avoidance and integrated status-bar checks passed.');
