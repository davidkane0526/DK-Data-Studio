
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json'),mobile=json('mobile/package.json'),expo=json('mobile/app.json').expo;
const atLeast=(value,target)=>{const parse=v=>String(v||'0.0.0').split('.').map(x=>Number(x)||0);const a=parse(value),b=parse(target);for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;};
assert(atLeast(pkg.version,'3.68.20'));
assert(atLeast(mobile.version,'0.8.47'));
assert(atLeast(expo.version,'0.8.47'));
assert(Number(expo.android.versionCode)>=58);

const shell=read('mobile/src/styles/shell-styles.ts');
const pulse=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
const portable=read('src/core/ui/modules/layout/portable-view.js');
const nativeWorkspace=read('src/styles/platform/native-workspace-presentation.css');
const mobileSurface=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const mobileHost=read('src/core/host/mobile-host-runtime.js');
const hostApi=read('src/core/ui/modules/host/api.js');
const plotView=read('src/core/ui/modules/plot-view/chart.js');
const nativeShell=read('src/styles/platform/native-client-shell.css');
const motion=read('src/styles/motion/recipes.css');
const portableStructure=read('src/styles/structure/sdk-semantic-surfaces.css');
const portablePaint=read('src/styles/presentation/plugin-chrome.css');
const themeShell=read('src/styles/presentation/shell.css');

assert(shell.includes('export const NATIVE_STATUS_BAR_HEIGHT = 23;')&&shell.includes('export const STATUS_POPOVER_GAP = 8;'),'Native status geometry constants missing.');
assert(shell.includes('STATUS_POPOVER_BOTTOM_INSET = NATIVE_STATUS_BAR_HEIGHT + STATUS_POPOVER_GAP'),'Generic native status geometry contract missing.');
const mobileApp=read('mobile/App.tsx'),foundation=read('src/app/modules/foundation.js');
assert(!mobileApp.includes('WebServicePopover')&&mobileApp.includes("host.hostRequest('status', { pluginId: 'builtin.status-monitor', id: 'lan-web' })"),'Web Service must no longer use a separate Native popup geometry owner.');
assert(foundation.includes("window.DKDSMaterialSurface?.apply?.(panel,'popover')")&&foundation.includes("bottom:'var(--dkds-status-popover-gap,8px)'"),'Core LAN popover must consume the shared status popover material and bottom-gap contract.');

assert(pulse.includes("variant:'stack-comfortable'")&&pulse.includes("variant:'form-grid-2'")&&pulse.includes("variant:'analysis-control-grid'")&&pulse.includes("variant:'result-control-grid'")&&pulse.includes("variant:'result-grid-asymmetric'"),'Pulse Mobile projection must be built from platform-neutral responsive Unit recipes rather than plugin-private Mobile CSS.');
assert(!pulse.includes("variant:'analysis-control-grid',responsiveTarget:workspaceHost")&&!pulse.includes("wide:true,responsiveTarget:workspaceHost")&&!pulse.includes('orientation:landscape'),'Pulse responsive composition must remain host-neutral and let nested Units measure their actual allocated local width.');
const unitSpec=read('src/core/ui/modules/composition/unit-template-spec.js');
assert(unitSpec.includes("scientificPlot:'parent-canvas'")&&unitSpec.includes("scientificPlot:Object.freeze({purpose:'Chrome-free scientific drawing/interaction canvas")&&unitSpec.includes("responsive:'Canvas follows parent PlotView/section geometry"),'ScientificPlot Unit must own parent-canvas responsiveness without requiring a plugin-level responsive:true compatibility flag.');

assert(!portable.includes('is-mobile-bottom-shelf')&&!portable.includes('reserveMobileBottomShelf'),'Mobile PlotView bottom placement must use the real canvas bottom lane with no shelf workaround.');
assert(portable.includes("if(document.documentElement?.dataset?.dkdsHost==='mobile'||document.documentElement?.classList?.contains('react-native-client'))return;"),'Mobile PortableView must leave resize ownership to the visible canvas split seam.');
assert(portable.includes('bindHeldTitleResize(header)'),'Desktop held-title compatibility may remain while Mobile exits before gesture installation.');
assert(!themeShell.includes('--dkui-portable-corner-'),'Portable handle colors must be owned by active Theme component appearance, not shell-level literals/mixes.');
assert(!nativeWorkspace.includes('>.dkds-portable-resize-handle::before')&&!nativeWorkspace.includes('>.dkds-portable-resize-handle::after'),'Mobile must not fork shared resize-handle geometry or paint.');
assert(nativeWorkspace.includes('.dkds-portable-view.dkds-plot-view:not(.is-floating):not(.is-global-floating)>.dkds-portable-resize-handle{display:none}'),'Non-floating Mobile PlotViews must not show a corner resize grip.');

assert(hostApi.includes('deactivate(activity,id)')&&hostApi.includes('workbench.closePrime?.(surfaceId)===true'),'Core workspace host must expose a real prime deactivation path.');
assert(mobileHost.includes("const tryWorkspaceCall=(method,surfaceId)=>")&&mobileHost.includes("tryWorkspaceCall('deactivate',id)||tryWorkspaceCall('deactivate',canonicalId)")&&mobileHost.includes('Workspace surface deactivation failed'),'Mobile surface buttons must actually close mounted PRIME surfaces instead of only flipping shell state.');

assert(mobileSurface.includes("const placement=text(node.dataset?.placement||'home').toLowerCase();")&&mobileSurface.includes("return placement!=='home'"),'Mobile Presenter must treat sticky/docked/non-home PortableView placement as geometry-owned.');
assert(mobileSurface.includes("semanticLaneActive(activityId,surface,'companion-right')")&&mobileSurface.includes("semanticLaneActive(activityId,surface,'companion-bottom')"),'Semantic right/bottom occupancy must ignore surfaces moved elsewhere by PortableView.');

assert(plotView.includes("!document.documentElement?.classList?.contains('react-native-client')")&&plotView.includes('dkds-plot-view-title-track'),'Overflow title auto-pan must be Mobile-only and leave Desktop DOM unchanged.');
assert(motion.includes('@keyframes dkds-mobile-plot-title-pan')&&nativeWorkspace.includes('[data-plugin-canvas-slot="right"],')&&nativeWorkspace.includes('[data-plugin-canvas-slot="bottom"]{overflow-x:hidden}'),'Plot titles must self-pan while dock lanes suppress horizontal scrollbars.');
assert(nativeWorkspace.includes('>.dkds-plot-view-head{flex:0 0 auto;border-radius:inherit;border-bottom-left-radius:0;border-bottom-right-radius:0;overflow:hidden}'),'Floating PlotView titlebar must retain the panel top corners.');
assert(nativeWorkspace.includes('>.dkds-plot-view-content{flex:1 1 0;min-width:0;min-height:0;width:100%;height:auto;max-width:none;max-height:none;overflow:hidden}'),'Floating plot content must consume all remaining window width/height.');

assert(nativeShell.includes('Native Plugin Manager cards must be content-height')&&nativeShell.includes('.plugin-card-footer{height:auto;flex-direction:row;flex-wrap:wrap;justify-content:flex-start;align-content:flex-start}'),'Portrait Plugin Manager card footer must not retain the tall column/space-between fallback.');

// Explicit Desktop-isolation checks for this Mobile closure.
assert(!read('src/plugins/pulse-sampler-tool/unit-presentation.js').includes('orientation:landscape'),'Pulse responsive composition must remain platform-neutral and not encode a Mobile-only landscape branch.');
assert(!read('src/styles/structure/sdk-semantic-surfaces.css').includes('dkds-mobile-plot-title-pan'),'Mobile title/handle paint must not leak into shared Desktop structure CSS.');
console.log('v3.68.20+ mobile portable geometry closure PASS');
