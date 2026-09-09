'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const mobilePkg=json('mobile/package.json');
const expo=json('mobile/app.json').expo;
const [major,minor,patch]=String(pkg.version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=26))),'Responsive Mobile composition requires v3.67.26+.');
assert(mobilePkg.version===require('../package.json').version||/^0\.8\.(?:1[7-9]|[2-9]\d|\d{3,})$/.test(String(mobilePkg.version||'')),'Mobile package must retain the 0.8.17+ baseline or use the synchronized app version.');
assert.strictEqual(expo.version,mobilePkg.version,'Expo/mobile package versions must stay synchronized.');
assert(Number(expo.android.versionCode)>=28,'Android versionCode must be 28+.');

const presenters=read('src/core/ui/modules/presentation/presenters.js');
const host=read('src/core/host/mobile-host-runtime.js');
const web=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const workspaceCss=read('src/styles/platform/native-workspace-presentation.css');
const shellCss=read('src/styles/platform/native-client-shell.css');
const header=read('mobile/src/components/NativeHeader.tsx');
const shellModel=read('mobile/src/model/shell-model.ts');
const shellStyles=read('mobile/src/styles/shell-styles.ts');
const app=read('mobile/App.tsx');
const adapter=read('src/core/ui/modules/interaction/adapters.js');
const split=read('src/core/ui/modules/layout/workspace.js');
const portable=read('src/core/ui/modules/layout/portable-view.js');
const pluginWorkbench=read('src/core/ui/modules/workbench/plugin.js');
const resonanceView=read('src/plugins/resonance-workbench/view-components.js');
const resonanceInspector=read('src/plugins/resonance-workbench/feature-inspector-runtime.js');
const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');

for(const token of ['mobileViewportProfile','profile','expanded','wide','compact','drawer','companion-right','companion-bottom','openSurfaces'])
  assert(presenters.includes(token),`Mobile Presenter responsive composition missing ${token}.`);
assert(presenters.includes("role===roles.DATA_CONTROL")&&presenters.includes("region:'drawer'"),'data-control must map to a Mobile parameter drawer.');
assert(presenters.includes("resolvedWidth>=680?'wide':'compact'")&&!presenters.includes("orientation==='landscape'&&resolvedWidth"),'Responsive scientific composition must follow usable viewport width, not orientation alone, so portrait tablets/foldables can use wide composition.');
assert(presenters.includes("role===roles.INSPECTOR")&&presenters.includes("region:'companion-right'")&&!presenters.includes("profile==='compact'?'sheet':'companion-right'"),'Inspector must remain a scientific companion: portrait maps to the bottom lane while landscape keeps the right lane.');
assert(presenters.includes("role===roles.SCIENTIFIC_SECONDARY&&kind==='prime'")&&presenters.includes("region:'companion-bottom'")&&!presenters.includes("profile==='compact'?'route':'companion-bottom'"),'Scientific PRIME companions must never become full-screen routes in compact layouts; the main scientific surface stays mounted.');

for(const token of ['openSurfaceState','currentViewport','window.innerWidth','window.innerHeight','openSurfacesSnapshot','closeConflictingPrimeSurfaces',"['sheet','route']","addEventListener('resize',publish"])
  assert(host.includes(token),`Mobile Host responsive state missing ${token}.`);
assert(host.includes("if(before.kind==='prime')")&&host.includes('setSurfaceOpen(activityId,canonicalId,true)'),'PRIME surfaces must be independently openable instead of replacing the current route.');
assert(web.includes('dkdsMobileLayout')&&web.includes('dkdsMobileCompanionRight')&&web.includes('dkdsMobileCompanionBottom')&&web.includes('dkdsMobileDrawerOpen'),'WebView projection must expose responsive Presenter composition state to authored CSS.');

assert(workspaceCss.includes('grid-template-columns:var(--dkds-mobile-left-track) var(--dkds-mobile-left-seam) minmax(0,1fr) var(--dkds-mobile-right-seam) var(--dkds-mobile-right-track)')&&workspaceCss.includes('\"cleft clsplit center crsplit cright\"')&&workspaceCss.includes('\"cleft clsplit cbottom cbottom cbottom\"'),'Wide Mobile layout must preserve one stable left/main/right/bottom topology with Core split seams instead of rebuilding the canvas for each placement.');
assert(workspaceCss.includes('[data-dkds-mobile-region="drawer"][data-dkds-mobile-active="true"]'),'Parameter surface must have a left drawer projection.');
assert(workspaceCss.includes('[data-dkds-mobile-region="companion-right"][data-dkds-mobile-active="true"]'),'Inspector must have a grid companion-right projection.');
assert(workspaceCss.includes('[data-dkds-mobile-region="companion-bottom"][data-dkds-mobile-active="true"]'),'Group/scientific PRIME must have a grid companion-bottom projection.');
assert(workspaceCss.includes('var(--dkds-plugin-canvas-right-width)')&&workspaceCss.includes('var(--dkds-plugin-canvas-bottom-height)'),'Wide Mobile companion geometry must consume the existing Core SplitController size variables instead of hard-coded breakpoint dimensions.');
assert(workspaceCss.includes('.dkds-plugin-canvas-frame.has-canvas-right>.dkds-plugin-canvas-right-resizer.active')&&workspaceCss.includes('[data-dkds-mobile-companion-right="true"] .dkds-plugin-canvas-frame>.dkds-plugin-canvas-right-resizer.active')&&workspaceCss.includes('.dkds-plugin-canvas-frame.has-canvas-bottom>.dkds-plugin-canvas-bottom-resizer.active')&&workspaceCss.includes('[data-dkds-mobile-companion-bottom="true"] .dkds-plugin-canvas-frame>.dkds-plugin-canvas-bottom-resizer.active'),'Touch split handles must follow either a real user dock or an actually open semantic Mobile companion.');
assert(workspaceCss.includes('dkds-plugin-canvas-right-resizer.active::after')&&workspaceCss.includes('left:-7px')&&workspaceCss.includes('dkds-plugin-canvas-bottom-resizer.active::after')&&workspaceCss.includes('top:-8px'),'Mobile split seams must keep a one-pixel visual footprint while exposing a larger transparent touch target.');
assert(!/#resonance|\.resonance|#reswin/i.test(workspaceCss+shellCss),'Core Mobile platform CSS must stay domain blind and must not patch Resonance screenshots.');

assert(split.includes('mobileStateScope')&&split.includes("${mobileScoped?'.mobile':''}"),'Split persistence must isolate Mobile scientific geometry from the existing Desktop split state.');
assert(split.includes('mobileReserve')&&split.includes('Math.min(mobileRatioMax,mobileReservedMax)'),'Mobile companion resizing must preserve usable room for the main scientific surface.');
for(const token of ['beginPreview(','finishPreview({persist=true','this.previewActive','notify:false'])assert(split.includes(token),`Shared SplitController preview path missing ${token}.`);
assert(portable.includes("region==='companion-right'?'right':region==='companion-bottom'?'bottom':")&&portable.includes("['left','right','sticky'].includes(explicitPlacement)"),'Held-title resize must follow Mobile semantic companion placement while allowing explicit Mobile sticky/side placement ownership.');
assert(portable.includes('split?.beginPreview?.()')&&portable.includes('split.schedulePreview?.')&&portable.includes("reason:'portable-held-resize'"),'Held-title Mobile resizing must reuse the coalesced SplitController preview/commit path.');
assert(portable.includes('if(!isMobile){const state=this.readState()'),'Mobile held-resize must not persist PortableView Desktop dock bounds.');
assert(pluginWorkbench.includes('mobileMaxRatio:.48,mobileReserve:320,mobileStateScope:true')&&pluginWorkbench.includes('mobileMaxRatio:.58,mobileReserve:240,mobileStateScope:true'),'PluginWorkspace must configure bounded, Mobile-scoped right/bottom companion splits.');

assert(!header.includes('directLimit'),'Native plugin commands must not be hidden by a fixed button-count heuristic.');
assert(header.includes('packOrderedControls')&&header.includes('onLayout')&&header.includes('pluginAreaWidth'),'Header must measure the actual remaining plugin slot and pack plugin commands by pixels instead of screen-width button counts.');
assert(header.includes('navigableSurfaces(shell)')&&header.includes('directActions')&&header.includes('menuActions'),'Header must consume all semantic surfaces and pack content-sized direct commands.');
assert(shellStyles.includes('projectAction: { height: 30, minWidth: 0')&&shellStyles.includes('maxWidth: 128'),'Native header commands must stay content-sized while using the shorter Mobile chrome.');
assert(!fs.existsSync(path.join(root,'mobile/src/components/SurfaceNavigation.tsx')),'The retired bottom/rail navigation component family must stay deleted instead of remaining as dead compiled source.');
assert(!shellModel.includes('contextRailSurfaces'),'Mobile shell model must not retain an unused contextual-rail projection path.');
assert(app.includes('<NativeHeader')&&!app.includes('<BottomNavigation')&&!app.includes('<NavigationRail'),'The global icon navigation bar/rail must be removed from the active Mobile shell; global commands now live in the top header.');
assert(!app.includes('height < 600'),'Mobile composition must use actual responsive width rather than the previous coarse landscape-height gate.');

assert(shellCss.includes('.dkds-action-row>button')&&shellCss.includes('width:auto')&&shellCss.includes('flex:0 0 auto'),'Mobile Core action rows must pack controls by content and wrap naturally.');
assert(shellCss.includes('.dkds-inline-form-row')&&shellCss.includes('flex-wrap:wrap'),'Mobile Core form rows must responsively flow controls instead of forcing a fixed two-column layout.');
assert(resonanceView.includes('respar-scan-global dkds-mode-group')&&!resonanceView.includes('respar-scan-global dkds-mode-group dkds-action-row'),'Mobile composition must not rewrite the established Desktop scan-mode group into a generic action-row surface.');
assert(resonanceView.includes('respar-detect-actions')&&!resonanceView.includes('respar-detect-actions dkds-action-row'),'Mobile composition must not rewrite the established Desktop detector-action geometry.');
assert(/#resonanceDedicatedPage \.respar-scan-global\{[^}]*display:grid;[^}]*grid-template-columns:1fr 1fr/.test(resonanceCss),'Desktop Resonance scan controls must retain their established two-column grid.');
assert(!resonanceCss.includes('resonance-native-client')&&!resonanceView.includes('isNativeClient'),'Resonance must not own a Native-client style or runtime branch; Presenter geometry is external to plugin content.');
assert(resonanceInspector.includes('respar-inspector-action-grid dkds-action-row'),'Inspector actions continue to use canonical action identity while their geometry remains plugin-owned.');

assert(adapter.includes("semanticSurfaceIntent('data-control')")&&adapter.includes("mode:'drawer-open'")&&adapter.includes("mode:'drawer-close'"),'Mobile Gesture Adapter must map edge/open-close gestures to the semantic data-control intent.');
for(const rel of ['src/styles/platform/native-client-shell.css','src/styles/platform/native-workspace-presentation.css','src/plugins/resonance-workbench/plugin.css'])
  assert(!/!important/.test(read(rel)),`${rel} must not introduce !important during Mobile composition work.`);

console.log('v3.67.26 Mobile responsive composition PASS: semantic Core surfaces map to a parameter drawer, simultaneously visible scientific companions, dense command flow, touch-resizable Mobile-scoped splits and gestures without Core domain-specific platform patches.');
