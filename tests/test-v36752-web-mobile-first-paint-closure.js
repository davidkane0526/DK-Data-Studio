'use strict';
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const tuple=v=>String(v).split('.').map(Number);
const atLeast=(v,min)=>{const a=tuple(v),b=tuple(min);for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};

const pkg=json('package.json'),mobile=json('mobile/package.json'),expo=json('mobile/app.json').expo;
assert(atLeast(pkg.version,'3.67.52'),'Web/Mobile first-paint closure requires DK Data Studio 3.67.52+.');
assert(atLeast(mobile.version,'0.8.39'),'Mobile first-paint closure must advance the native shell build.');
assert.strictEqual(expo.version,mobile.version,'Expo and Mobile package versions must stay synchronized.');
assert(Number(expo.android.versionCode)>=50,'Android versionCode must advance for the first-paint closure build.');

// Web Theme providers are first-paint visual dependencies. All built-in Theme
// plugins must load/activate in the startup-critical phase so the web picker
// cannot expose a profile whose provider is still deferred.
const packageRuntime=read('src/core/plugins/kernel/modules/package-runtime.js');
assert((packageRuntime.match(/type==='theme'/g)||[]).length>=2,'Both generated-row and loaded-definition startup critical sets must include every built-in Theme provider.');
assert(packageRuntime.includes("if(m.systemCritical===true||type==='algorithm'||type==='theme'||id===themeId")&&packageRuntime.includes("if(m.systemCritical===true||type==='algorithm'||type==='theme'||m.id===themeId"),'Theme providers must remain startup critical before interactive web paint.');
const aurora=json('src/plugins/aurora-pop-theme/plugin.json'),glass=json('src/plugins/thin-glass-theme/plugin.json');
assert.strictEqual(aurora.pluginType,'theme');assert.strictEqual(glass.pluginType,'theme');

// Generic list geometry must not imply MenuItem identity. Resonance dataset rows
// are DIVs with dkds-list-item for layout; classifying them as MenuItems made
// Theme selected/focus borders appear as unexplained white rims.
const semantic=read('src/core/theme/semantic-registry.js');
assert(semantic.includes('button.dkds-list-item')&&semantic.includes('.dkds-list-item[role="menuitem"]')&&semantic.includes('.dkds-list-item[role="option"]'),'Actual interactive list rows must remain canonical MenuItems.');
assert(!semantic.includes(',.dkds-list-item,.dkds-plot-legend-item'),'Bare dkds-list-item geometry must not become a MenuItem component identity.');
const resonanceView=read('src/plugins/resonance-workbench/feature-controls-runtime.js');
assert(resonanceView.includes('respar-dataset-item dkds-list-item'),'Resonance dataset cards still use the generic list geometry class and depend on semantic non-interference.');

// PlotView placement is chart functionality on Mobile, not Desktop surface
// docking. The outer PRIME placement control may be suppressed, but each chart's
// position button must survive and share one aligned header row with export.
const portable=read('src/core/ui/modules/layout/portable-view.js');
const mobileCss=read('src/styles/platform/native-workspace-presentation.css');
assert(portable.includes("placementButton.className='dkds-portable-placement-trigger'"),'PortableView must retain the frozen shared placement-button contract.');
assert(mobileCss.includes('.dkds-portable-placement-trigger{display:none}')&&mobileCss.includes('.dkds-plot-view-actions .dkds-portable-placement-trigger{display:inline-flex'),'Mobile must suppress outer Surface placement controls while re-exposing chart-level placement actions by their PlotView action-host context, without modifying the frozen shared PortableView runtime.');
for(const token of ['.dkds-plot-view-head{','height:30px;min-height:30px','grid-template-columns:minmax(0,1fr) max-content','align-items:center','.dkds-plot-view-actions{height:100%','.dkds-plot-view-actions .dkds-portable-placement-trigger{display:inline-flex;min-width:29px;width:29px','.dkds-plot-view-actions .dkds-plot-view-action{min-width:26px;width:26px'])
  assert(mobileCss.includes(token),`Mobile PlotView header alignment/geometry missing ${token}.`);

// Parameter PRIME ownership is stamped synchronously. Any data-control PRIME is
// suppressed before it ever paints in the Mobile PRIMARY route, then becomes
// visible only after Presenter projection into the Drawer. This is generic and
// therefore covers TER, Pulse Designer and future plugins without private hacks.
const workbench=read('src/core/ui/modules/workbench/analysis.js');
assert(workbench.includes("owned.dataset.dkdsPrimeOwned='1';this.markSurfaceNode(owned,row,'prime')"),'Existing PRIME nodes must receive their semantic role synchronously during registration.');
assert(mobileCss.includes('[data-dkds-prime-owned="1"][data-dkds-presentation-role="data-control"]:not([data-dkds-mobile-region="drawer"]){display:none}'),'Mobile data-control PRIME must be first-paint suppressed until Drawer projection.');
const terShared=read('src/plugins/ter-analysis/shared-views.js');
assert(terShared.includes("presentationRole:'data-control'")||terShared.includes('presentationRole: "data-control"')||terShared.includes('presentationRole:"data-control"'),'TER parameters must declare the generic data-control semantic role.');

// The Core drawer controls scrolling/resize, not plugin content padding. Pulse
// Designer owns its own breathing room, which must reach the right edge instead
// of being erased by a later platform-layer padding-right:0 rule.
const pulseMobile=read('src/plugins/pulse-sampler-tool/mobile.css');
assert(pulseMobile.includes('padding:10px 13px 12px 10px'),'Pulse Designer Drawer must retain a visible right content inset.');
assert(!/\[data-dkds-mobile-region="drawer"\]\[data-dkds-mobile-active="true"\]\{[^}]*padding-right:0/.test(mobileCss),'Core Mobile Drawer projection must not overwrite plugin-owned right inset.');

// Plugin directory is a Desktop filesystem command. Mobile/Web bridges return
// no directory, so the Manager must not display a dead button there.
const manager=read('src/core/plugins/manager-ui.js');
const nativeShell=read('src/styles/platform/native-client-shell.css');
assert(packageRuntime.includes('folderAvailable:()=>!!window.electronAPI?.pluginOpenFolder')&&packageRuntime.includes('!window.electronAPI?.isNativeClient'),'Plugin package runtime must expose Desktop-only folder availability.');
assert(manager.includes('external?.folderAvailable?.()===true')&&manager.includes('folderBtn.hidden=!folderSupported'),'Plugin Manager must hide the directory action when the platform cannot browse it.');
assert(nativeShell.includes('grid-template-areas:"search status type count refresh install"')&&!nativeShell.includes('grid-template-areas:"search status type count refresh directory install"'),'Mobile Plugin Manager layout must not reserve an empty/dead directory slot.');

// Pulse Analysis controls and plot headers use Mobile-specific density rather
// than Desktop control dimensions.
const pulseAnalysis=read('src/plugins/pulse-analysis/mobile.css');
assert(pulseAnalysis.includes('.pulse-compare-actions{')&&pulseAnalysis.includes('.pulse-scope-action select{width:148px;min-width:0}'),'Pulse Analysis Mobile titlebar actions must remain width-contained without owning control chrome.');
const pulseShared=read('src/plugins/pulse-analysis/shared-views.js');
assert(pulseShared.includes('data-dkds-mobile-density="compact"')&&nativeShell.includes('[data-dkds-mobile-density="compact"]{')&&nativeShell.includes('--dkds-mobile-control-min-height:30px;')&&nativeShell.includes('--dkds-generic-button-min-height:30px;'),'Pulse Analysis must request compact native density semantically and let the Core platform feed generic density slots instead of raw control geometry.');

for(const rel of ['src/styles/platform/native-workspace-presentation.css','src/styles/platform/native-client-shell.css','src/plugins/pulse-analysis/mobile.css','src/plugins/pulse-sampler-tool/mobile.css'])
  assert(!read(rel).includes('!important'),`${rel} must remain free of patch-style !important.`);

console.log('v3.67.52 Web/Mobile first-paint closure PASS: Themes bootstrap before web interaction, chart placement survives Mobile projection, parameter PRIME never flashes in PRIMARY, Plugin Manager has no dead directory action, and Drawer content keeps plugin-owned inset.');
