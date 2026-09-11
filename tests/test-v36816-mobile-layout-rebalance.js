'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const mobilePkg=JSON.parse(read('mobile/package.json'));
const expo=JSON.parse(read('mobile/app.json')).expo;
{const [a,b,c]=String(pkg.version).split('.').map(Number);assert(a>3||(a===3&&(b>68||(b===68&&c>=16))),'v3.68.16+ source identity required.');}
{const [a,b,c]=String(mobilePkg.version).split('.').map(Number);assert(a>0||(a===0&&(b>8||(b===8&&c>=43))),'v3.68.16+ Mobile package identity required.');}
assert.strictEqual(expo.version,mobilePkg.version,'Expo/mobile version identity must match.');
assert(Number(expo.android.versionCode)>=54,'v3.68.16 Android versionCode must be >= 54.');
const shellCss=read('src/styles/platform/native-client-shell.css');
const workspaceCss=read('src/styles/platform/native-workspace-presentation.css');
const pulseCss=read('src/plugins/pulse-sampler-tool/mobile.css');
const smbCss=read('src/plugins/connectivity-center/plugin.css');
const schemaCss=read('src/styles/structure/schema-and-plugin-ui.css');
const plotView=read('src/core/ui/modules/plot-view/chart.js');
const portable=read('src/core/ui/modules/layout/portable-view.js');
const workbenchCss=read('src/styles/structure/plugin-workspace.css');

assert(shellCss.includes('@media (min-width:840px){'),'Plugin Manager must keep a roomy-width override hook for denser mobile cards.');
assert(shellCss.includes('.plugin-manager-section-list{grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))}'),'Plugin Manager dense mobile grid override missing.');
assert(pulseCss.includes('.ps-result-controls{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}'),'Pulse sampler result controls must merge into a single four-cell row on roomy mobile layouts.');
assert(pulseCss.includes('.ps-analysis-controls{grid-template-columns:minmax(0,1.45fr) repeat(4,minmax(92px,1fr)) minmax(128px,.95fr);gap:7px}'),'Pulse sampler extraction row must use a denser multi-column contract.');
assert(!smbCss.includes('--dkds-generic-button-min-height:32px'),'Dead v3.68.16 SMB generic-button token workaround must stay removed after the v3.68.17 Core density correction.');
assert(schemaCss.includes('.dkds-multiselect-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;width:100%;box-sizing:border-box;min-height:var(--dkds-schema-field-min-height);'),'Multi-select triggers must consume the same field geometry contract as other controls.');
assert(workspaceCss.includes('[data-dkds-mobile-companion-right="true"] .dkds-plugin-canvas-frame')&&workspaceCss.includes('var(--dkds-mobile-user-right-track,34%)')&&workspaceCss.includes('--dkds-mobile-right-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Landscape workspaces must keep a bounded, user-resizable right companion lane independent of width profile.');
assert(workspaceCss.includes('[data-dkds-mobile-companion-right="true"] .dkds-plugin-canvas-frame')&&workspaceCss.includes('grid-template-columns:var(--dkds-mobile-left-track) var(--dkds-mobile-left-seam) minmax(0,1fr) var(--dkds-mobile-right-seam) var(--dkds-mobile-right-track)'),'Portrait/tablet workspaces must stack semantic right companions in document flow instead of squeezing the primary canvas into a desktop-like side lane.');
assert(workspaceCss.includes('.dkds-portable-view.dkds-plot-view:not(.is-floating):not(.is-global-floating)>.dkds-portable-resize-handle{display:none}'),'Only floating/global PlotViews may expose the corner resize handle on Mobile.');
assert(workspaceCss.includes('grid-template-rows:minmax(320px,58vh) minmax(180px,var(--dkds-plugin-canvas-bottom-height))'),'Compact user bottom placement must consume a real, resizable bottom lane instead of a floating shelf.');
assert(plotView.includes("contains('is-docked')")&&plotView.includes("contains('is-sticky')"),'Plot content geometry must release authored aspect-ratio sizing when a plot is docked or sticky.');
for(const token of ['syncCanvasRegions?.();','presentationChanged?.(\'portable-place\'','requestChartResize?.({id:this.id,reason:`portable-place-${placement}`})']){
  assert(portable.includes(token),`Portable placement reflow missing ${token}`);
}
assert(workbenchCss.includes('--dkds-portable-docked-height:100%;'),'Side-docked scientific plots must stretch to the visible dock height.');
console.log('v3.68.16 mobile layout rebalance PASS: SMB density, compact plugin cards, denser pulse controls, right companion recovery, portable reflow sync and plot stretch contracts are present.');
