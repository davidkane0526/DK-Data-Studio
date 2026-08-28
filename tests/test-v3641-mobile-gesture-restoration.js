const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const pkg=JSON.parse(read('package.json'));
const mobilePkg=JSON.parse(read('mobile/package.json'));
const mobileApp=JSON.parse(read('mobile/app.json')).expo;
const mobileCss=read('src/mobile.css');
const mobileHost=read('src/core/host/mobile-host-runtime.js');
const scientificModel=read('src/core/ui/modules/scientific-curve/model.js');
const scientificRender=read('src/core/ui/modules/scientific-curve/render.js');
const portable=read('src/core/ui/modules/layout/portable-view.js');
const analysisWorkbench=read('src/core/ui/modules/workbench/analysis.js');
const workspace=read('src/core/ui/modules/layout/workspace.js');
const floating=read('src/app/modules/floating-docks.js');
const versionScript=read('scripts/set-version.js');
const workspaceCss=read('src/styles/structure/plugin-workspace.css');

assert.strictEqual(pkg.version,'3.64.1','mobile restoration release must advance the App patch version');
assert.strictEqual(mobilePkg.version,'0.8.12','mobile behavior changes must advance the React Native package version');
assert.strictEqual(mobileApp.version,mobilePkg.version,'Expo and mobile package versions must stay aligned');
assert(Number(mobileApp.android.versionCode)>=23,'Android versionCode must advance for the mobile restoration build');

assert(/html\.react-native-client \.topbar,\s*html\.react-native-client \.project-tabs-bar,\s*html\.react-native-client #mainWorkspace,\s*html\.react-native-client #superWorkspaceDivider\{display:none\}/m.test(mobileCss),'native shell must hide the desktop topbar, project tabs, workspace and SUPER divider as one complete CSS rule');
assert(!/#mainWorkspace,\s*\n\s*html\.react-native-client\{/.test(mobileCss),'native shell CSS must never retain the dangling selector introduced by the modular refactor');

assert(mobileHost.includes("[data-dkds-touch-gesture-owner]"),'global mobile held-swipe navigation must yield to Core-owned touch gestures');
assert(mobileHost.includes("handle.dataset.dkdsTouchGestureOwner='mobile-panel-resize'")&&mobileHost.includes("handle.addEventListener('pointerdown'")&&mobileHost.includes('setPointerCapture'),'mobile data/parameter drawer width resizing must remain pointer-captured and touch-native');
assert(scientificModel.includes("data-dkds-touch-gesture-owner','scientific-plot'")||scientificModel.includes("data-dkds-touch-gesture-owner','scientific-plot"),'scientific plots must explicitly own their touch gesture sequence');
assert(workspaceCss.includes('.dkds-scientific-curve-surface')&&workspaceCss.includes('touch-action:none'),'scientific plot surfaces must prevent browser pan arbitration during direct gestures');
assert(scientificRender.includes("plotBg.on('pointerdown'")&&scientificRender.includes('setPointerCapture(event.pointerId)')&&scientificRender.includes("routeInteraction('box','background'")&&scientificRender.includes("decision.intent==='select-region'"),'scientific box selection must stay on Pointer Events with capture and select-region routing');

assert(portable.includes('bindHeldTitleResize')&&portable.includes("header.style.touchAction='none'")&&analysisWorkbench.includes('mobileOverlay:true'),'docked PRIME views must retain long-hold title resizing while Core split limits stay mobile-aware');
assert(portable.includes("resizeHandle.dataset.dkdsTouchGestureOwner='portable-resize'")&&portable.includes('bindFloatResize')&&portable.includes('setPointerCapture'),'floating PRIME/global views must retain the explicit touch resize handle');
assert(workspace.includes("this.handle.dataset.dkdsTouchGestureOwner='split-resize'")&&workspace.includes("this.handle.dataset.dkdsTouchGestureOwner='movable-surface'")&&workspace.includes("addEventListener('pointerdown'"),'Core split and movable surfaces must keep pointer-native gesture ownership');

for(const legacy of ['mousedown','mousemove','mouseup'])assert(!floating.includes(`addEventListener('${legacy}'`),`legacy floating/dock interactions must not regress to ${legacy}`);
assert(floating.includes("addEventListener('pointerdown'")&&floating.includes("addEventListener('pointermove'")&&floating.includes("addEventListener('pointercancel'")&&floating.includes('setPointerCapture'),'legacy app-owned floating/dock panels must use the same mouse/touch/pen Pointer Events path');

assert(versionScript.includes("process.argv[2] || 'patch'")&&versionScript.includes('/^(?:patch|auto)$/i'),'release versioning must auto-increment the patch when no explicit version is supplied');
assert.strictEqual(pkg.scripts['version:patch'],'node scripts/set-version.js','package scripts must expose the automatic patch bump workflow');

console.log('v3.64.1 mobile layout, gesture ownership, pointer resizing, box selection and automatic version bump contracts passed.');
