'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const atLeast=(value,floor)=>{const a=String(value).split('.').map(Number),b=String(floor).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;};

const app=json('package.json'),mobile=json('mobile/package.json'),expo=json('mobile/app.json').expo;
assert(atLeast(app.version,'3.68.22'),'v3.68.22+ Mobile/Desktop regression closure must remain present in later releases.');
assert.strictEqual(mobile.version,app.version,'Mobile package version must equal Desktop application version.');
assert.strictEqual(expo.version,app.version,'Expo version must equal Desktop application version.');
assert(expo.android.versionCode>=65,'Android versionCode must advance for the repaired mobile build.');

const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
assert(presenter.includes("semanticRole==='data-control'||purpose==='parameters'"),'Mobile Presenter must ignore inherited Desktop PortableView placement for parameter drawers.');
const presenters=read('src/core/ui/modules/presentation/presenters.js');
assert(presenters.includes("kind==='prime'&&surface?.embedded===true")&&presenters.includes("'workspace-inline'"),'Embedded PRIME surfaces must retain inline Mobile home geometry.');
const nativeCss=read('src/styles/platform/native-workspace-presentation.css');
assert(nativeCss.includes('[data-dkds-mobile-companion-right="true"]'),'Portrait companion layout must be explicitly vertical regardless of CSS-pixel width.');
const portableStructure=read('src/styles/structure/sdk-semantic-surfaces.css');
const portablePaint=read('src/styles/presentation/plugin-chrome.css');
const shell=read('src/styles/presentation/shell.css');
assert(portableStructure.includes('width:36px;height:36px')&&portableStructure.includes('clip-path:polygon(100% 0,100% 100%,0 100%)')&&portableStructure.includes('width:18px;height:18px')&&portableStructure.includes('width:15px;height:15px'),'Desktop and Mobile floating resize handles must share one clipped 3.68.52 outer silhouette with the accepted edge-inner corner geometry.');
assert(!shell.includes('--dkui-portable-corner-'),'Portable handle colors must be owned by active Theme component appearance, not shell-level literals/mixes.');
assert(!nativeCss.includes('>.dkds-portable-resize-handle::before'),'Mobile presentation must not duplicate Core resize-handle paint.');

const ter=read('src/plugins/ter-analysis/feature-runtime.js');
assert(!ter.includes("id:'resistance-inspector'")&&!ter.includes('registerPrime({'),'TER R–V must be an ordinary GroupArea child PlotView, not a dedicated PRIME/inspector surface.');
assert(!ter.includes("id:'rv-visibility'")&&!ter.includes('toggleResistanceVisibility'),'TER R–V must not retain a plugin-private hide/show linkage; positioning and visibility follow shared PlotView behavior.');
assert(!ter.includes('layoutSettings.sticky')&&!ter.includes('setSticky('),'TER must not retain R–V-specific sticky/layout configuration; sticky eligibility is owned by the Core group-area grid.');
assert(ter.includes("stateVersion:'ter-plot-view-v3'"),'TER portable chart views must advance their persisted state version to flush stale cross-panel placement leakage.');

const portable=read('src/core/ui/modules/layout/portable-view.js');
assert(portable.includes("reason:`portable-place-${placement}-settled`")&&portable.includes("placement==='sticky'||placement==='left'||placement==='right'||placement==='bottom'||placement==='home'"),'Portable placement must schedule a settled follow-up resize for sticky and docked plot views.');

const workspace=read('src/core/ui/modules/layout/workspace.js');
for(const token of ["this.container.closest?.('.hidden,[hidden]')","if(!(total>2))return"])
  assert(workspace.includes(token),`SplitController must ignore transient hidden/zero workspace geometry: ${token}`);

const controls=read('src/plugins/resonance-workbench/feature-controls-runtime.js');
assert(controls.includes('syncDatasetVisibility(list)')&&controls.includes("actions.visibilityChanged?.('visibility-master')"),'Resonance visibility controls must update checkbox paint and plot state through the lightweight path.');
assert(controls.includes('function syncSelectedSweepToVisibility()')&&controls.includes("actions.setSelectedSweepId(visible[0]?.id||'')"),'Resonance visibility toggles must clear stale hidden selected sweeps when everything is deselected.');
const setVisibility=controls.match(/function setVisibility\([\s\S]*?\n    }/g)?.[0]||'';
assert(setVisibility&&!setVisibility.includes('actions.render();'),'Single visibility changes must not trigger the full Resonance render pipeline.');
const setAll=controls.match(/function setAllVisibility\([\s\S]*?\n    }/g)?.[0]||'';
assert(setAll&&!setAll.includes('actions.render();'),'Global visibility changes must not trigger the full Resonance render pipeline.');
assert(controls.includes("button.classList.remove('active');button.classList.toggle('selected',selected);"),'Resonance mode buttons must use persistent selected state without conflating it with momentary active state.');

const resonanceView=read('src/plugins/resonance-workbench/view-components.js');
for(const id of ['reswinShowAll','reswinShowForward','reswinShowReverse','reswinHideAll']){
  const idx=resonanceView.indexOf(`id="${id}"`);assert(idx>=0,`Missing ${id}`);
  assert(resonanceView.slice(idx,idx+420).includes('data-dkds-component-identity="toolbarAction"'),`${id} must consume canonical selected/pressed toolbar appearance.`);
}
assert(presenters.includes("role===roles.INSPECTOR")&&presenters.includes("region:'companion-right'"),'Mobile Presenter must own portrait inspector geometry instead of plugin-local platform branching.');
assert(presenter.includes("semanticRole==='inspector'||semanticRole==='scientific-secondary'")&&presenter.includes("placementSource!=='user'"),'Mobile Presenter must override inherited/default/legacy inspector placement while preserving explicit user placements.');

assert(!resonanceView.includes('isNativeClient')&&resonanceView.includes("const inspectDefault=allowedPlacements.has(String(pluginDefaults.inspectPlacement||''))?String(pluginDefaults.inspectPlacement):'right'"),'Resonance keeps one platform-neutral semantic inspector default; migration belongs to Core PortableView/Presenter.');
assert(portable.includes("?'mobile.m3':'desktop'"),'Core PortableView must namespace persisted placement by platform.');
const selection=read('src/plugins/resonance-workbench/feature-selection-runtime.js');
assert(selection.includes('publishDatasetSelection')&&selection.includes("type:'resonance.dataset'"),'Dataset-row activation must publish dataset semantics, not collapse to one forward sweep.');
assert(selection.includes("meta?.source!=='resonance-group'&&previousSweep!==selectedSweepId"),'Group-plot selection must not rebuild the complete data-list control tree.');
const curveModel=read('src/core/ui/modules/scientific-curve/model.js'),curveRender=read('src/core/ui/modules/scientific-curve/render.js');
assert(curveModel.includes('selectedCurveIds()')&&curveModel.includes('getSelectedCurveIds'),'ScientificCurveSurface must support multi-curve selection semantics.');
assert(curveRender.includes('selectedCurveIds.has(String(curve.id))'),'ScientificCurveSurface paint must keep both forward/reverse curves active for a dataset selection.');

const mainPlot=read('src/plugins/resonance-workbench/feature-main-plot-runtime.js');
assert(mainPlot.includes("const legendScale=surface.colorScaleState?.scale;")&&mainPlot.includes("typeof legendScale==='function'")&&mainPlot.includes("actions.colorForSeries(`resonance.dataset.${ds.path}`"),'Resonance main legend must rebuild after empty-state transitions instead of disappearing after a hide-all cycle.');

const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
assert(resonanceCss.includes('.respar-left-panel:not([data-dkds-mobile-region]) .respar-data-list-title'),'Data-list title optical adjustment must stay on the non-projected plugin rail.');
const material=read('src/styles/theme/material-renderer.css');
assert(material.includes('.plugin-manager-card{border-radius:11px;border-color:color-mix(in srgb,var(--dkui-divider) 55%,transparent)}'),'Plugin Manager cards must use a subtle semantic divider instead of the bright generic material edge.');

const host=read('src/core/host/mobile-host-runtime.js'),presentationModel=read('src/core/ui/modules/presentation/model.js'),presentationPresenters=read('src/core/ui/modules/presentation/presenters.js'),appComposition=read('src/app/modules/dedicated-plugin-windows.js'),sheet=read('mobile/src/sheets/ShellActionSheet.tsx'),types=read('mobile/src/model/shell-types.ts');
assert(!host.includes('querySelector')&&presentationModel.includes('appVersion:text(this.configured.appVersion)')&&presentationPresenters.includes('appVersion:core.appVersion')&&appComposition.includes(`appVersion:'${app.version}'`),'Mobile version must flow from Core Presentation state without reverse-reading Desktop DOM.');
assert(types.includes('appVersion?: string')&&sheet.includes("DK Data Studio v{shell.appVersion || '—'}"),'Project management drawer must display the synchronized app version at its bottom.');

const vth=read('src/plugins/transfer-vth-lab/plugin.js');
assert(vth.includes("legend:{enabled:true,placement:'top',maxRows:2}"),'Vth plot legend must stay on the top so no right-side blank strip remains on Desktop or Mobile.');

const mobileApp=read('mobile/App.tsx'),foundation=read('src/app/modules/foundation.js');
assert(!mobileApp.includes('WebServicePopover')&&mobileApp.includes("host.hostRequest('status', { pluginId: 'builtin.status-monitor', id: 'lan-web' })"),'Mobile Web Service status must open the Core Material panel rather than a second RN popup.');
assert(foundation.includes("window.DKDSMaterialSurface?.apply?.(panel,'popover')"),'Mobile LAN panel must consume the canonical Core popover Material role.');

console.log('v3.68.27 Mobile/Desktop regression closure PASS: repaired Resonance state, restored main legend, Vth fill, orientation-owned Mobile companions, single Core LAN popover, settled sticky plots, and integrated floating handles.');
