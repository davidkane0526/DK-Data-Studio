const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const pkg=JSON.parse(read('package.json'));
const mobilePkg=JSON.parse(read('mobile/package.json'));
const mobileApp=JSON.parse(read('mobile/app.json')).expo;
const mobileCss=read('src/mobile.css');
const nativeShellCss=read('src/styles/platform/native-client-shell.css');
const mobileHost=read('src/core/host/mobile-host-runtime.js');
const inputAdapters=read('src/core/ui/modules/interaction/adapters.js');
const scientificModel=read('src/core/ui/modules/scientific-curve/model.js');
const scientificRender=read('src/core/ui/modules/scientific-curve/render.js');
const portable=read('src/core/ui/modules/layout/portable-view.js');
const analysisWorkbench=read('src/core/ui/modules/workbench/analysis.js');
const workspace=read('src/core/ui/modules/layout/workspace.js');
const floating=read('src/app/modules/floating-docks.js');
const versionScript=read('scripts/set-version.js');
const workspaceCss=read('src/styles/structure/plugin-workspace.css');

{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major===3&&(minor>64||(minor===64&&patch>=1)),'mobile restoration must remain on or beyond App v3.64.1');}
assert(mobilePkg.version===require('../package.json').version||/^0\.8\.(?:1[2-9]|[2-9]\d+)$/.test(mobilePkg.version),'mobile behavior changes must retain the v0.8.12 baseline or use the synchronized app version');
assert.strictEqual(mobileApp.version,mobilePkg.version,'Expo and mobile package versions must stay aligned');
assert(Number(mobileApp.android.versionCode)>=23,'Android versionCode must advance for the mobile restoration build');

assert(nativeShellCss.includes('html[data-dkds-host="mobile"].react-native-client .topbar,')&&nativeShellCss.includes('html[data-dkds-host="mobile"].react-native-client #statusBar.statusbar{display:none}'),'native shell must hide Desktop chrome behind the dual Mobile host scope.');
assert(!/#mainWorkspace,\s*\n\s*html\.react-native-client\{/.test(nativeShellCss),'native shell CSS must never retain the dangling selector introduced by the modular refactor');

assert(inputAdapters.includes("[data-dkds-touch-gesture-owner]"),'Mobile Gesture Adapter held-swipe navigation must yield to Core-owned touch gestures');
assert(!inputAdapters.includes('dkdsMobileWorkspaceMode')&&!inputAdapters.includes('mobile-panel-resize')&&!inputAdapters.includes('dkds.mobile.left-panel-width'),'Plugin API 1.19 Mobile Gesture Adapter must not retain the retired PRIMARY-left drawer/resizer path');
assert(!mobileCss.includes('native-legacy-workspace.css'),'Mobile CSS must not import the retired legacy workspace fallback.');
assert(scientificModel.includes("data-dkds-touch-gesture-owner','scientific-plot'")||scientificModel.includes("data-dkds-touch-gesture-owner','scientific-plot"),'scientific plots must explicitly own their touch gesture sequence');
assert(workspaceCss.includes('.dkds-scientific-curve-surface')&&workspaceCss.includes('touch-action:none'),'Desktop scientific plot surfaces retain direct-gesture arbitration.');
assert(scientificModel.includes("dataset.dkdsMobileBoxGesture=String(spec.mobileBoxGesture||'none')"),'ScientificPlot must publish the explicit Mobile box-gesture intent.');
assert(nativeShellCss.includes('[data-dkds-mobile-box-gesture="none"]{touch-action:pan-y}')&&nativeShellCss.includes('[data-dkds-mobile-box-gesture="select-region"]')&&nativeShellCss.includes('[data-dkds-mobile-box-gesture="zoom-box"]{touch-action:none}'),'Mobile scientific plots must hand ordinary touch drags to vertical scroll and capture only explicitly declared box gestures.');
assert(scientificRender.includes("plotBg.on('pointerdown'")&&scientificRender.includes("if(touchLike&&String(this.spec.mobileBoxGesture||'none')==='none')return")&&scientificRender.includes('setPointerCapture(event.pointerId)')&&scientificRender.includes("routeInteraction('box','background'")&&scientificRender.includes("resolvedIntent==='select-region'"),'Explicit scientific box selection must stay on Pointer Events with capture and select-region routing while default Mobile touch remains scroll-first.');

assert(portable.includes('bindHeldTitleResize')&&portable.includes("dataset?.dkdsHost==='mobile'")&&portable.includes("portableSet(header,'touch-action','none')")&&analysisWorkbench.includes('mobileOverlay:true'),'Desktop held-title resizing may remain for compatibility, but Mobile must return before gesture installation and resize through Core split seams.');
assert(portable.includes("resizeHandle.dataset.dkdsTouchGestureOwner='portable-resize'")&&portable.includes('bindFloatResize')&&portable.includes('setPointerCapture'),'floating PRIME/global views must retain the explicit touch resize handle');
assert(workspace.includes("this.handle.dataset.dkdsTouchGestureOwner='split-resize'")&&workspace.includes("this.handle.dataset.dkdsTouchGestureOwner='movable-surface'")&&workspace.includes("addEventListener('pointerdown'"),'Core split and movable surfaces must keep pointer-native gesture ownership');

for(const legacy of ['mousedown','mousemove','mouseup'])assert(!floating.includes(`addEventListener('${legacy}'`),`legacy floating/dock interactions must not regress to ${legacy}`);
assert(floating.includes("addEventListener('pointerdown'")&&floating.includes("addEventListener('pointermove'")&&floating.includes("addEventListener('pointercancel'")&&floating.includes('setPointerCapture'),'legacy app-owned floating/dock panels must use the same mouse/touch/pen Pointer Events path');

assert(versionScript.includes("process.argv[2] || 'patch'")&&versionScript.includes('/^(?:patch|auto)$/i'),'release versioning must auto-increment the patch when no explicit version is supplied');
assert.strictEqual(pkg.scripts['version:patch'],'node scripts/set-version.js','package scripts must expose the automatic patch bump workflow');

console.log('v3.64.1 mobile layout, gesture ownership, pointer resizing, box selection and automatic version bump contracts passed.');
