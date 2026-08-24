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
const kernel = read('src/core/plugin-kernel.js');
const infrastructure = read('src/core/ui-infrastructure.js');
const index = read('src/index.html');
const mobilePackage = JSON.parse(read('mobile/package.json'));
const appConfig = JSON.parse(read('mobile/app.json')).expo;

assert(app.includes('BottomNavigation') && app.includes('NavigationRail'), 'Android shell must provide portrait navigation and a landscape rail');
assert(app.includes('BackHandler.addEventListener') && app.includes("hostRequest('back')"), 'Android system back must route through the Mobile Host Adapter first');
assert(app.includes("AppState.addEventListener('change'") && app.includes("action === 'lifecycle'"), 'native lifecycle must be projected into Core');
assert(app.includes('onRenderProcessGone') && app.includes('setRendererKey'), 'WebView renderer failure must have an in-app recovery path');
assert(app.includes('nativeFiles.current.set') && app.includes("req.type === 'readFile'"), 'picked files must use lazy native handles rather than eager multi-file Base64 payloads');
assert(app.includes('nativeHost.openDocuments') && nativeHostPlugin.includes('Intent.ACTION_OPEN_DOCUMENT'), 'Android imports must use the native Storage Access Framework document picker');
assert(nativeHostPlugin.includes('Intent.ACTION_CREATE_DOCUMENT') && nativeHostPlugin.includes('takePersistableUriPermission'), 'Android project saves must use persistable provider-backed document URIs');
assert(nativeHostPlugin.includes('reactApplicationContext.currentActivity') && !nativeHostPlugin.includes('val activity = currentActivity'), 'native file pickers must use the React Native context activity accessor supported by RN 0.86');
assert(app.includes('copyToCacheDirectory: true'), 'the Expo fallback picker must copy provider content before immediate fallback reads');
assert(app.includes('10 * 60 * 1000') && app.includes('interactiveFileCommand'), 'interactive file/project commands must not emit a false timeout while the system picker is open');
assert(!/assets\.push\([\s\S]{0,300}base64/.test(app), 'file picker must not eagerly collect every selected file as Base64');

assert(shell.includes("const navigationItems") && shell.includes("id: 'activities'"), 'mobile navigation must include a plugin-workspace entry');
assert(shell.includes('shell.activities.map'), 'analysis sheet must be projected from the plugin activity registry');
assert(shell.includes('shell.surfaces') && shell.includes("run('surface'"), 'PRIMARY, PRIME and SUB surfaces must be reachable from native navigation');
assert(shell.includes('shell.actions') && shell.includes("run('workspace-action'"), 'plugin header actions such as TER calculation must be reachable from native navigation');
assert(shell.includes('shell.projects') && shell.includes('onLongPress') && shell.includes("onSheet('projects')"), 'native header must provide project tabs, long-press close and project selection');
assert(shell.includes('unifiedHeaderRow') && shell.includes('projectTabGroup') && shell.includes('pluginButtonGroup'), 'project tabs and plugin buttons must share one clearly divided mobile header row');
assert(!shell.includes('navLabel:'), 'portrait bottom navigation must be icon-only');
assert(shell.includes("onSheet('history')") && shell.includes("run('history-undo')"), 'mobile More must expose project operation history with undo');
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
assert(mobileHost.includes("kind:'response'") && mobileHost.includes("event:'state'"), 'Core adapter must return acknowledgements and state events');
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
assert(mobileStyle.includes('.dkds-plugin-canvas-right-resizer.active') && !/dkds-plugin-canvas-right-resizer[^\n]+display:none!important/.test(mobileStyle), 'PRIME panel borders must remain draggable on mobile');
assert(infrastructure.includes('mobileOverlay:true') && infrastructure.includes('pointercancel'), 'PRIME resizing must preserve a touch pointer and mobile overlay limits');
assert(mobileStyle.includes('--dkds-mobile-native-nav-height') && mobileStyle.includes('#statusBar.statusbar'), 'mobile navigation must sit above the preserved renderer status bar');
assert(mobileStyle.includes('#reswinSummary') && mobileStyle.includes('#terSummary'), 'space-consuming analysis summaries must be projected to the status bar');
assert(mobileStyle.includes('min-height:280px!important'), 'scientific plots must retain a usable phone viewport');
assert(mobileStyle.includes('@media (orientation:landscape)'), 'shared renderer must have a graph-first landscape layout');
assert(mobileStyle.includes('grid-template-areas:"center right"'), 'landscape PRIME must preserve a requested right-side placement');
assert(mobileStyle.includes('#pulseAnalysisPage .pulse-primary-surface'), 'pulse analysis must have a collision-free native flow');
assert(mobileStyle.includes('.command-menu'), 'web command menus need a touch bottom-sheet presentation');
assert(bridge.includes('isNativeClient:!!nativeBridge') && bridge.includes('pluginSelectPackage'), 'Android must be a native plugin host, not a web client');
assert(nativeHostPlugin.includes('InetAddress.getByName("127.0.0.1")') && nativeHostPlugin.includes('startWebVersion'), 'Android must be able to open an independent loopback-only web version');
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
