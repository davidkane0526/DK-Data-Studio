'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {MOBILE_APP_FILES,readMobileApp}=require('./mobile-app-source');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const stat=rel=>fs.statSync(path.join(root,rel));
const pkg=JSON.parse(read('package.json'));
const mobilePkg=JSON.parse(read('mobile/package.json'));
const mobileApp=JSON.parse(read('mobile/app.json')).expo;
const app=read('mobile/App.tsx');
const aggregate=readMobileApp(root);
const protocol=read('mobile/src/host/protocol.ts');
const bridge=read('mobile/src/host/useHostBridge.ts');
const lifecycle=read('mobile/src/host/useMobileSystemLifecycle.ts');
const files=read('mobile/src/host/useNativeFileService.ts');
const router=read('mobile/src/host/useNativeRequestRouter.ts');
const actions=read('mobile/src/host/useShellActions.ts');
const web=read('mobile/src/services/useWebServiceController.ts');
const workspace=read('mobile/src/components/RendererWorkspace.tsx');

{const [major,minor,patch]=String(pkg.version).split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=23))),'Mobile Host Phase 2 must remain present from v3.67.23 onward.');}
assert(mobilePkg.version===require('../package.json').version||/^0\.8\.(?:1[5-9]|[2-9]\d|\d{3,})$/.test(mobilePkg.version),'React Native package must retain the Phase 2 baseline or use the synchronized app version.');
assert.strictEqual(mobileApp.version,mobilePkg.version,'Expo and mobile package versions must stay synchronized.');
assert(Number(mobileApp.android.versionCode)>=26,'Android versionCode must remain at or beyond the Phase 2 checkpoint.');
assert(stat('mobile/App.tsx').size<8*1024,'App.tsx must be a composition root, not a host/runtime monolith.');
for(const rel of MOBILE_APP_FILES){
  assert(fs.existsSync(path.join(root,rel)),`Mobile host module missing: ${rel}`);
  assert(stat(rel).size<48*1024,`Mobile authored host module exceeds the 48 KiB hygiene ceiling: ${rel}`);
}

for(const token of ['useHostBridge','useNativeFileService','useNativeRequestRouter','useShellActions','useWebServiceController','useMobileSystemLifecycle','RendererWorkspace']){
  assert(app.includes(token),`App composition root must wire ${token}.`);
}
for(const forbidden of ['NativeModules','DeviceEventEmitter','DocumentPicker','FileSystem','Sharing','WebViewMessageEvent','DkdsNativeHostEvent','openDocumentsExtended','agentHttpJson','mcpStart']){
  assert(!app.includes(forbidden),`App.tsx must not retain extracted host responsibility: ${forbidden}`);
}
assert(protocol.includes("HOST_CHANNEL = 'dkds.mobile-host.v1'")&&protocol.includes('NativeModules.DkdsNativeHost')&&protocol.includes('shellState'),'Versioned protocol/native facade/shell normalization must have one host protocol owner.');
assert(bridge.includes('hostReady.current')&&bridge.includes('hostQueue.current')&&bridge.includes('interactiveFileCommand')&&bridge.includes('10 * 60 * 1000'),'Host bridge must retain readiness queueing and long interactive file-command timeout behavior.');
assert(bridge.includes("postHostEvent('lifecycle'")&&bridge.includes('pauseHostTimeouts')&&bridge.includes('resumeHostTimeouts')&&bridge.includes("DeviceEventEmitter.addListener('DkdsNativeHostEvent'"),'Host bridge must own lifecycle/request timing and native-event forwarding.');
assert(files.includes('openDocumentsExtended')&&files.includes('copyToCacheDirectory: true')&&files.includes('nativeFiles.current.set')&&files.includes('shareBase64File'),'Native file service must own SAF/fallback handles and export persistence.');
for(const token of ["req.type === 'openFiles'","req.type === 'readFile'","req.type === 'smbRead'","req.type === 'agentHttpJson'","req.type === 'mcpRespond'","req.type === 'saveBase64'","req.type === 'runtimeStatus'"]){
  assert(router.includes(token),`Native request router lost route: ${token}`);
}
assert(actions.includes("hostRequest('navigate'")&&actions.includes("hostRequest('surface'")&&actions.includes("hostRequest('action'")&&actions.includes("hostRequest('status'"),'Native shell action adapter must route semantic navigation/surface/action/status intents through Core Host requests.');
assert(!/builtin\.(?:resonance|ter|pulse|data-center)/.test(actions),'Mobile host actions must remain domain-plugin neutral.');
assert(web.includes('useWebServiceController')&&web.includes('nativeHost?.webStatus')&&!web.includes('setVisible')&&!web.includes('Clipboard.setStringAsync'),'Native LAN controller must be status-only; settings UI/actions are owned by the Core WebView panel.');
assert(router.includes("req.type === 'webApplySettings'")&&router.includes("req.type === 'webRegenerateKey'"),'Native request router must expose Core LAN panel settings/key operations.');
assert(lifecycle.includes("BackHandler.addEventListener('hardwareBackPress'")&&lifecycle.includes("AppState.addEventListener('change'")&&lifecycle.includes('publishLifecycle(state)'),'Android system lifecycle/back handling must be isolated from App composition.');
assert(workspace.includes('<WebView')&&workspace.includes('onRenderProcessGone')&&workspace.includes('setRendererKey')&&workspace.includes("hostRequest('bootstrap')"),'Renderer workspace must own WebView boot, failure recovery and bootstrap.');
assert(!/ctx\.ui\.(?:desktop|mobile)\b/.test(aggregate),'Mobile host modularization must not create a platform-specific Plugin API facade.');
assert(!aggregate.includes('injectJavaScript'),'Mobile host must continue using the acknowledged protocol rather than JavaScript injection.');

console.log('v3.67.23 Mobile Host Phase 2 PASS: App.tsx is a thin composition root and host protocol, files, routing, lifecycle, LAN service, actions and renderer recovery have explicit owners.');
