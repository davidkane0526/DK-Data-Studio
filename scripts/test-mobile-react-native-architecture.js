const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const app = read('mobile/App.tsx');
const shell = read('mobile/src/Shell.tsx');
const bridge = read('src/web-bridge.js');
const mobileHost = read('src/core/mobile-host-runtime.js');
const mobilePluginPackage = read('src/core/mobile-plugin-package.js');
const mobileStyle = read('src/mobile.css');
const nativeHostPlugin = read('mobile/plugins/withDkdsAndroidNativeHost.js');
const syncWebAssets = read('mobile/scripts/sync-web-assets.js');
const kernel = read('src/core/plugin-kernel.js');
const infrastructure = read('src/core/ui-infrastructure.js');
const index = read('src/index.html');
const mobilePackage = JSON.parse(read('mobile/package.json'));
const appConfig = JSON.parse(read('mobile/app.json')).expo;

assert(app.includes('BottomNavigation') && app.includes('NavigationRail') && app.includes('NativeStatusBar'), 'Android shell must provide native portrait/landscape navigation and status chrome');
assert(app.includes('BackHandler.addEventListener') && app.includes("hostRequest('back')"), 'Android system back must route through the Mobile Host Adapter first');
assert(app.includes("AppState.addEventListener('change'") && app.includes("postHostEvent('lifecycle'") && app.includes('pauseHostTimeouts') && app.includes('resumeHostTimeouts'), 'native lifecycle must be a fire-and-forget Core event and pause request timers while Android is backgrounded');
assert(app.includes('onRenderProcessGone') && app.includes('setRendererKey'), 'WebView renderer failure must have an in-app recovery path');
assert(app.includes('nativeFiles.current.set') && app.includes("req.type === 'readFile'"), 'picked files must use lazy native handles rather than eager multi-file Base64 payloads');
assert(app.includes('openDocumentsExtended') && nativeHostPlugin.includes('Intent.ACTION_OPEN_DOCUMENT') && nativeHostPlugin.includes('Intent.ACTION_GET_CONTENT'), 'Android imports must combine SAF with third-party file-manager providers');
assert(nativeHostPlugin.includes('Intent.ACTION_CREATE_DOCUMENT') && nativeHostPlugin.includes('takePersistableUriPermission'), 'Android project saves must use persistable provider-backed document URIs');
assert(nativeHostPlugin.includes('reactApplicationContext.currentActivity') && !nativeHostPlugin.includes('val activity = currentActivity'), 'native file pickers must use the React Native context activity accessor supported by RN 0.86');
assert(app.includes('copyToCacheDirectory: true'), 'the Expo fallback picker must copy provider content before immediate fallback reads');
assert(app.includes('10 * 60 * 1000') && app.includes('interactiveFileCommand'), 'interactive file/project commands must not emit a false timeout while the system picker is open');
assert(app.includes('hostReady.current') && app.includes('hostQueue.current') && app.includes('flushHostQueue'), 'Core requests must wait for an explicit renderer-ready handshake before their timeout starts');
assert(!/assets\.push\([\s\S]{0,300}base64/.test(app), 'file picker must not eagerly collect every selected file as Base64');

assert(shell.includes("const navigationItems") && shell.includes("id: 'activities'"), 'mobile navigation must include a plugin-workspace entry');
assert(shell.includes('shell.activities.map'), 'analysis sheet must be projected from the plugin activity registry');
assert(shell.includes('shell.surfaces') && shell.includes("run('surface'"), 'PRIMARY, PRIME and SUB surfaces must be reachable from native navigation');
assert(shell.includes('shell.actions') && shell.includes("run('workspace-action'"), 'plugin header actions such as TER calculation must be reachable from native navigation');
assert(shell.includes('activeProject') && !shell.includes('onLongPress') && shell.includes("onSheet('projects')"), 'native header must show only the active project and open project management only on tap');
assert(shell.includes('headerHistoryButton') && shell.includes("onAction('history-undo')") && shell.includes("onAction('history-redo')"), 'native header must expose undo/redo immediately before the data/parameter control');
assert(shell.includes('unifiedHeaderRow') && shell.includes('projectTabGroup') && shell.includes('pluginButtonGroup'), 'project tabs and plugin buttons must share one clearly divided mobile header row');
assert(!shell.includes('navLabel:'), 'portrait bottom navigation must be icon-only');
assert(shell.includes("onSheet('history')") && !shell.includes("run('history-undo')") && !shell.includes("run('history-redo')"), 'mobile More may expose history records but undo/redo controls must exist only in the top software header');
assert(!shell.includes('readyDot'), 'the unexplained green readiness dot must not consume mobile header space');
assert(!/builtin\.(resonance|ter|pulse|data-center)/.test(shell), 'native shell must not hard-code domain plugins');

assert(app.includes("const HOST_CHANNEL = 'dkds.mobile-host.v1'"), 'React Native must use the versioned Mobile Host protocol');
assert(app.includes("kind: 'request'") && app.includes("kind === 'response'"), 'mobile navigation must be acknowledged rather than fire-and-forget');
assert(!app.includes('injectJavaScript'), 'React Native commands must not be injected as renderer JavaScript');
assert(!bridge.includes('window.__DKDS_NATIVE_ACTION__'), 'the file bridge must not retain the desktop DOM action bridge');
assert(bridge.includes("nativeCall('readFile'"), 'renderer must read native files on demand');
assert(mobileHost.includes("const CHANNEL='dkds.mobile-host.v1'"), 'Core must own the versioned Mobile Host Adapter');
assert(mobileHost.includes("method==='navigate'") && mobileHost.includes('activateEmbedded'), 'mobile routes must activate plugin activities through Core');
assert(mobileHost.includes("method==='surface'") && mobileHost.includes('DKDSUI?.workspaces?.invoke'), 'mobile surface routes must use the generic PluginWorkspace API');
assert(mobileHost.includes("method==='action'") && mobileHost.includes('DKDSUI?.actions?.invoke'), 'mobile actions must use the generic Core ActionGroup registry');
assert(mobileHost.includes("kind:'response'") && mobileHost.includes("event:'state'") && mobileHost.includes("event:'ready'"), 'Core adapter must return acknowledgements, readiness and state events');
assert(mobileHost.includes("row.id!=='lan-web'"), 'Android native shell must not project the desktop LAN service status item');
assert(mobileHost.includes('processingIds') && mobileHost.includes("'project.switch'") && mobileHost.includes("'project.close'"), 'Mobile Host must de-duplicate requests and own project-tab commands');
assert(mobileHost.includes('bindHeldSwipeKeys') && mobileHost.includes("key='ArrowUp'") && mobileHost.includes("key='ArrowLeft'"), 'held upward/left swipes must map to keyboard navigation');
assert(!/querySelector\([^\n]+\)\?\.click/.test(mobileHost), 'Core mobile routing must not emulate desktop DOM clicks');
assert(kernel.includes('activateEmbedded:') && kernel.includes("options?.presentation==='mobile'"), 'plugin kernel must expose an explicit embedded platform presentation');
assert(infrastructure.includes('workspaces:{') && infrastructure.includes('navigationActions?.()'), 'Core UI infrastructure must project PluginWorkspace navigation without domain hard-coding');
assert(infrastructure.includes('actions:{') && infrastructure.includes('invokeMobile'), 'Core UI infrastructure must expose registered plugin actions without DOM click emulation');
new Function(bridge);
new Function(mobileHost);
new Function(mobilePluginPackage);

assert(index.includes('href="mobile.css"') && index.includes('src="core/mobile-host-runtime.js"'), 'mobile adapter and final-cascade layout must load from the shared renderer');
assert(mobileStyle.includes('#mainWorkspace') && mobileStyle.includes('display:none!important'), 'React Native must own phone command chrome and hide the desktop workspace shell');
assert(mobileStyle.includes('dkds-mobile-panel-open') && mobileStyle.includes('.dkds-analysis-left'), 'PRIMARY left controls must use a mobile drawer');
assert(mobileStyle.includes('.dkds-mobile-panel-edge') && mobileStyle.includes('--dkds-mobile-left-width'), 'data/parameter drawer must have a persistent touch width resizer');
assert(mobileStyle.includes('.dkds-plugin-canvas-right-resizer.active') && /dkds-plugin-canvas-right-resizer\.active,[\s\S]{0,220}display:none!important/.test(mobileStyle), 'mobile must hide full-screen split handles that previously rendered as a blue crosshair');
assert(infrastructure.includes('bindHeldTitleResize') && infrastructure.includes('is-held-resizing') && infrastructure.includes('mobileOverlay:true'), 'docked PRIME sizing must use title-hold gestures while retaining Core split constraints');
assert(mobileStyle.includes('#statusBar.statusbar{display:none!important}') && shell.includes('NativeStatusBar'), 'React Native must own the mobile status bar instead of stacking desktop status chrome');
assert(shell.includes('BlurView') && mobilePackage.dependencies['expo-blur'], 'portrait bottom navigation must use native blur/translucency instead of an opaque web-style bar');
assert(shell.includes('ProjectDrawer') && shell.includes('PanResponder.create') && shell.includes('projectDeleteAction') && shell.includes('translateX: slide'), 'project management must open from the left and support right-swipe delete actions');
assert(shell.includes('WebServicePopover') && app.includes("payload?.id === 'lan-web'"), 'Android LAN status must open a small native popup rather than the desktop always-on-top panel');
assert(bridge.includes("nativeCall('runtimeStatus')"), 'runtime memory on Android must come from the native process bridge when available');
assert(mobileStyle.includes('#reswinSummary') && mobileStyle.includes('#terSummary') && mobileStyle.includes('.respar-status-row'), 'space-consuming analysis summaries and their empty row must leave the renderer layout');
assert(mobileStyle.includes('min-height:280px!important'), 'scientific plots must retain a usable phone viewport');
assert(mobileStyle.includes('@media (orientation:landscape)'), 'shared renderer must have a graph-first landscape layout');
assert(mobileStyle.includes('grid-template-areas:"center right"'), 'landscape PRIME must preserve a requested right-side placement');
assert(mobileStyle.includes('#pulseAnalysisPage .pulse-primary-surface'), 'pulse analysis must have a collision-free native flow');
assert(mobileStyle.includes('.command-menu'), 'web command menus need a touch bottom-sheet presentation');
assert(bridge.includes('isNativeClient:!!nativeBridge') && bridge.includes('pluginSelectPackage'), 'Android must be a native plugin host, not a web client');
assert(nativeHostPlugin.includes('InetAddress.getLoopbackAddress()') && nativeHostPlugin.includes('startWebVersion') && nativeHostPlugin.includes('__dkds_health') && nativeHostPlugin.includes('context.assets.open("dkds/index.html")'), 'Android web version must bind loopback directly and validate packaged web assets before reporting startup success');
assert(syncWebAssets.includes("path.join(repoRoot, 'assets')") && syncWebAssets.includes("replaceAll('../assets/', 'assets/')"), 'standalone Android web service bundle must package shared assets and rewrite root-relative brand references');
assert(nativeHostPlugin.includes('android.permission.INTERNET') && nativeHostPlugin.includes('android:usesCleartextTraffic'), 'Android loopback HTTP service must have explicit network and cleartext-loopback manifest support');
const kotlinStart = nativeHostPlugin.indexOf('function kotlinSource(packageName) {');
const kotlinEnd = nativeHostPlugin.indexOf('\n\nmodule.exports = function', kotlinStart);
assert(kotlinStart >= 0 && kotlinEnd > kotlinStart, 'native-host Kotlin generator must remain extractable for syntax regression checks');
const kotlinSourceForTest = new Function(`${nativeHostPlugin.slice(kotlinStart, kotlinEnd)}\nreturn kotlinSource;`)();
const generatedKotlin = kotlinSourceForTest('com.dk.datastudio');
assert(generatedKotlin.includes('context.assets.open("dkds/index.html")') && generatedKotlin.includes('InetAddress.getLoopbackAddress()'), 'generated Kotlin must validate the bundled entry point and bind only to Android loopback');
assert(generatedKotlin.includes('@ReactMethod fun runtimeStatus') && generatedKotlin.includes('Debug.getMemoryInfo(info)'), 'generated Kotlin must expose Android process memory instead of reporting only WebView JS heap');
assert(infrastructure.includes('dkds-portable-resize-handle') && infrastructure.includes('bindFloatResize') && infrastructure.includes('initialBounds'), 'global floating views must retain bounded source dimensions and provide a touch resize handle');
assert(!infrastructure.includes('dkds-portable-history-action') && !infrastructure.includes("DKDSCapabilities?.invoke?.('core.project-history',kind)"), 'portable/plugin chrome must not duplicate the top-level undo/redo controls');
assert(!infrastructure.includes("header.addEventListener('contextmenu',openPlacementMenu)") && infrastructure.includes("placementButton.addEventListener('click',showPlacementMenu)"), 'title hold-resize must never open placement; placement opens only from its explicit button');
assert(app.includes('<NavigationBar hidden') && mobilePackage.dependencies['expo-navigation-bar'], 'Android gesture navigation must be hidden through the native system-bar API');

assert.strictEqual(appConfig.android.softwareKeyboardLayoutMode, 'resize', 'Android keyboard must resize the scientific viewport');
assert.notStrictEqual(appConfig.android.edgeToEdgeEnabled, false, 'Android 16 edge-to-edge must not be disabled');
assert(Number(appConfig.android.versionCode) >= 7, 'mobile rewrite must advance the Android version code');
assert.strictEqual(mobilePackage.version, appConfig.version, 'mobile package and Expo app versions must stay aligned');
assert(appConfig.plugins.some(row => Array.isArray(row) && row[0] === 'expo-navigation-bar'), 'Expo navigation-bar immersive config must be installed');
assert(appConfig.plugins.includes('./plugins/withDkdsAndroidNativeHost.js'), 'custom Android document/web host must be registered during prebuild');
assert(index.includes('id="projectHistoryBtn"'), 'desktop software menu must expose operation history');

for (const generated of ['mobile/android', 'mobile/ios', 'mobile/node_modules', 'mobile/assets/web', 'mobile-dist']) {
  assert(!fs.existsSync(path.join(root, generated)), `${generated} is generated and must stay outside the clean source tree`);
}

console.log('React Native Android shell, lazy I/O bridge, responsive renderer and repository-hygiene checks passed.');
