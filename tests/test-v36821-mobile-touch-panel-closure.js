const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const pkg=require(path.join(root,'package.json'));
const mobilePkg=require(path.join(root,'mobile','package.json'));
const mobileApp=require(path.join(root,'mobile','app.json'));
const pulseMobile=fs.readFileSync(path.join(root,'src','plugins','pulse-sampler-tool','mobile.css'),'utf8');
const portable=fs.readFileSync(path.join(root,'src','core','ui','modules','layout','portable-view.js'),'utf8');
const nativeWorkspace=fs.readFileSync(path.join(root,'src','styles','platform','native-workspace-presentation.css'),'utf8');
const nativeShell=fs.readFileSync(path.join(root,'src','styles','platform','native-client-shell.css'),'utf8');
const shellStyles=fs.readFileSync(path.join(root,'mobile','src','styles','shell-styles.ts'),'utf8');
const presenters=fs.readFileSync(path.join(root,'src','core','ui','modules','presentation','presenters.js'),'utf8');
const mobileProjection=fs.readFileSync(path.join(root,'src','core','ui','modules','presentation','mobile-web-surface.js'),'utf8');
const mobileHost=fs.readFileSync(path.join(root,'src','core','host','mobile-host-runtime.js'),'utf8');

function atLeast(version,target){
  const parse=value=>String(value||'0.0.0').split('.').map(v=>Number(v)||0);
  const a=parse(version),b=parse(target);
  for(let i=0;i<3;i++){
    const av=a[i]||0,bv=b[i]||0;
    if(av!==bv)return av>bv;
  }
  return true;
}

assert(atLeast(pkg.version,'3.68.21'),'Mobile touch-panel closure requires app version >= 3.68.21.');
assert(atLeast(mobilePkg.version,'0.8.48'),'Mobile touch-panel closure requires mobile package version >= 0.8.48.');
assert(atLeast(mobileApp.expo?.version,'0.8.48') && Number(mobileApp.expo?.android?.versionCode)>=59,
  'Mobile touch-panel closure requires Expo metadata >= 0.8.48 / versionCode 59.');

assert(pulseMobile.includes('[data-dkds-mobile-region="route"][data-dkds-mobile-active="true"] .pulse-sampler-shell'),
  'Pulse mobile main-surface rules must target the Mobile route surface.');
assert(!pulseMobile.includes('[data-dkds-mobile-region="main"][data-dkds-mobile-active="true"]'),
  'Pulse mobile CSS must not target the removed non-semantic main region.');
assert(pulseMobile.includes('grid-template-columns:minmax(300px,.92fr) minmax(0,1.28fr);') && pulseMobile.includes('.ps-analysis{\n    grid-column:2;grid-row:1;min-height:0;height:100%;padding:10px;gap:7px;overflow:auto;overscroll-behavior:contain'),
  'Pulse landscape layout must keep the measurement-extraction card inside the first viewport.');

assert(portable.includes("if(document.documentElement?.dataset?.dkdsHost==='mobile'||document.documentElement?.classList?.contains('react-native-client'))return;"),
  'Mobile companion resize must be owned only by the explicit split seam, not a title long-press gesture.');
assert(nativeWorkspace.includes('--dkds-mobile-right-seam:var(--dkds-canvas-resizer-track-size,7px)') && nativeWorkspace.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),
  'Mobile semantic companions must expose the same narrow resize seam contract as Desktop.');

assert(nativeWorkspace.includes('.dkds-portable-view.dkds-plot-view:is(.is-floating,.is-global-floating)>.dkds-plot-view-content:is(.dkds-scientific-chart-host,.analysis-chart,svg,canvas){width:100%;max-width:100%;height:100%;max-height:100%;min-height:0;flex:1 1 0}') && nativeWorkspace.includes('>.dkds-plot-view-content>:where(.dkds-scientific-chart-host,.analysis-chart,svg,canvas){width:100%;max-width:100%;height:100%;max-height:100%;min-height:0;flex:1 1 0}'),
  'Floating plot views must stretch both direct plot hosts and nested chart nodes to remove the conservative right/bottom dead space.');

assert(nativeShell.includes('.plugin-card-description{min-height:0;padding-left:9px;padding-right:9px;margin-bottom:4px;line-height:1.28;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}') && nativeShell.includes('.plugin-card-body{padding:0 9px 6px}') && nativeShell.includes('.plugin-card-details{padding:6px 9px 7px;line-height:1.42}'),
  'Native plugin cards must use the denser portrait card profile instead of leaving tall empty bodies.');


assert(presenters.includes("const profile=portrait") && presenters.includes("resolvedWidth>=1180?'expanded':resolvedWidth>=900?'wide':'compact'") && presenters.includes("resolvedWidth>=980?'expanded':resolvedWidth>=680?'wide':'compact'"),
  'Mobile viewport profiling must distinguish portrait from landscape so tablet portrait does not accidentally inherit the landscape right-companion lane.');
assert(mobileProjection.includes("this.setData(root,'dkdsMobileOrientation',snapshot.layout?.orientation||snapshot.orientation||'portrait')") && mobileProjection.includes('delete root.dataset.dkdsMobileOrientation'),
  'Mobile projection must publish and clean up orientation state for platform-only layout geometry.');
assert(nativeWorkspace.includes('[data-dkds-mobile-companion-right="true"] .dkds-plugin-canvas-frame') && nativeWorkspace.includes('grid-template-columns:var(--dkds-mobile-left-track) var(--dkds-mobile-left-seam) minmax(0,1fr) var(--dkds-mobile-right-seam) var(--dkds-mobile-right-track)'),
  'Right companions must remain in the stable scientific canvas topology with an explicit split lane.');
assert(mobileHost.includes("const tryWorkspaceCall=(method,surfaceId)=>") && mobileHost.includes("tryWorkspaceCall('activate',id)||tryWorkspaceCall('activate',canonicalId)") && mobileHost.includes("tryWorkspaceCall('deactivate',id)||tryWorkspaceCall('deactivate',canonicalId)"),
  'Native parameter buttons must use the hardened PRIME surface activation/deactivation path.');

const mobileAppSource=fs.readFileSync(path.join(root,'mobile','App.tsx'),'utf8'),foundationSource=fs.readFileSync(path.join(root,'src','app','modules','foundation.js'),'utf8');
assert(!mobileAppSource.includes('WebServicePopover') && mobileAppSource.includes("host.hostRequest('status', { pluginId: 'builtin.status-monitor', id: 'lan-web' })") && foundationSource.includes("window.DKDSMaterialSurface?.apply?.(panel,'popover')"),
  'Web service must use the single Core Material popover so its status-bar geometry/theme matches other Core status panels.');

console.log('v3.68.21 mobile touch-panel closure checks passed.');
