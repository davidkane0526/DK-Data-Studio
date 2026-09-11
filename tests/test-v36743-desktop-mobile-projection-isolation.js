'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const Module=require('module');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);
Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json')),mobilePkg=JSON.parse(read('mobile/package.json')),expo=JSON.parse(read('mobile/app.json')).expo;
const [major,minor,patch]=String(pkg.version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=43))),'Desktop projection isolation requires v3.67.43+.');
assert(mobilePkg.version===pkg.version||Number(String(mobilePkg.version).split('.').at(-1))>=29,'v3.67.43 recovery must retain its Mobile baseline or use synchronized app identity.');
assert.strictEqual(expo.version,mobilePkg.version,'Expo/mobile package versions must stay synchronized.');
assert(Number(expo.android.versionCode)>=40,'v3.67.43 recovery requires Android versionCode 40+.');

// Host identity is decided before authored CSS can participate in layout. It
// is immutable for the document lifetime and becomes the first platform key.
const index=read('src/index.html');
const hostBootstrap=index.indexOf('root.dataset.dkdsHost=host');
const coreCss=index.indexOf('href="core.css"');
const mobileCss=index.indexOf('href="mobile.css"');
assert(hostBootstrap>=0&&hostBootstrap<coreCss&&hostBootstrap<mobileCss,'Host identity must be fixed before Core/Mobile CSS loads.');
for(const token of ["mobile?'mobile':(window.electronAPI?'desktop':'web')","root.classList.toggle('react-native-client',host==='mobile')","writable:false","configurable:false","id=\"dkdsMobileStyle\"","media=\"not all\"","window.__DKDS_HOST_KIND__==='mobile'"]){
  assert(index.includes(token),`Host bootstrap missing immutable platform identity token: ${token}`);
}

const composition=JSON.parse(read('src/core/ui/composition/composition.json'));
assert(composition.importableModules.some(row=>row.id==='host/platform-boundary'&&row.path==='src/core/host/platform-boundary.js'),'UI composition must include the platform mutation boundary.');
const boundarySource=read('src/core/host/platform-boundary.js');
for(const token of ["MOBILE:'mobile'","DESKTOP:'desktop'","detectHost","isMobileDocument","isDesktopLikeDocument","dataset?.dkdsHost","__DKDS_HOST_KIND__"]){
  assert(boundarySource.includes(token),`Platform boundary missing ${token}.`);
}
assert(!boundarySource.includes("query?.has?.('reactNative')||root?.classList?.contains?.('react-native-client')"),'Native marker class must never promote a Desktop document into the Mobile host.');

const boundaryModule=require('../src/core/host/platform-boundary');
assert.strictEqual(boundaryModule.detectHost(
  {documentElement:{dataset:{dkdsHost:'mobile'},classList:{contains:()=>true}}},
  {__DKDS_HOST_KIND__:'desktop',ReactNativeWebView:{postMessage(){}}}
),'desktop','Immutable host identity must win even if mutable DOM markers are polluted later.');
assert.strictEqual(boundaryModule.detectHost(
  {documentElement:{dataset:{},classList:{contains:()=>true}}},
  {location:{search:''},electronAPI:{}}
),'desktop','The native marker class alone must never promote an Electron document to Mobile.');

// Platform shells are mutually exclusive at runtime. Both modules may exist in
// the generated bundle, but only the owning shell is instantiated.
const uiRuntime=read('src/core/ui/modules/runtime.js');
assert(uiRuntime.includes("const PlatformBoundary=require('../../host/platform-boundary');"),'UI runtime must consume the platform boundary.');
assert(uiRuntime.includes("if(PlatformBoundary.isMobileDocument())require('./presentation/mobile-web-surface');\nelse require('./presentation/desktop-shell');"),'UI runtime must instantiate exactly one platform Presentation shell.');
assert(!uiRuntime.includes("require('./presentation/desktop-shell');\nrequire('./presentation/mobile-web-surface');"),'Desktop and Mobile shells must never be instantiated unconditionally together.');

const presenterSource=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const mobileHost=read('src/core/host/mobile-host-runtime.js');
assert(presenterSource.includes("const PlatformBoundary=require('../../../host/platform-boundary');"),'Mobile projection must use the shared platform boundary.');
assert(presenterSource.includes('isMobileDocument(){return PlatformBoundary.isMobileDocument();}'),'Mobile projection must not invent a second host detector.');
assert(presenterSource.includes('if(!this.isMobileDocument())'),'Mobile projection apply() must be inert outside the native client.');
assert(presenterSource.includes("return {mode:'desktop-inert',activityId:'',projected:0};"),'Desktop projection must return before DOM lookup/reparenting.');
assert(mobileHost.includes("const declaredHost=String(document.documentElement?.dataset?.dkdsHost||window.__DKDS_HOST_KIND__||((isNative||isPreview)?'mobile':''))"),'Mobile Host must consume the immutable host identity.');
assert(mobileHost.includes("if(declaredHost!=='mobile'||(!isNative&&!isPreview)){"),'Mobile Host must be inert for Desktop/Web documents even when its script is present.');

// Root native identity has only two authorized writers. Shared Core modules may
// consume the marker, but cannot create a second platform-detection authority.
const nativeMarkerWriters=[];
const scanRoots=['src'];
const walk=dir=>{for(const name of fs.readdirSync(path.join(root,dir))){const rel=path.join(dir,name).replace(/\\/g,'/'),abs=path.join(root,rel),stat=fs.statSync(abs);if(stat.isDirectory()){if(!rel.includes('/generated'))walk(rel);continue;}if(!/\.(?:js|html)$/.test(rel))continue;const body=read(rel);if(body.includes("classList.add('react-native-client')")||body.includes("classList.toggle('react-native-client'"))nativeMarkerWriters.push(rel);}};
for(const dir of scanRoots)walk(dir);
assert.deepStrictEqual([...new Set(nativeMarkerWriters)].sort(),['src/index.html','src/web-bridge.js'],'Only bootstrap/bridge may write the root native marker.');
assert(fs.existsSync(path.join(root,'docs/PLATFORM_ISOLATION_FIREWALL_3.67.43.md')),'Platform isolation firewall must be documented as an architecture contract.');

// Runtime proof: on a Desktop document, even an explicit accidental call to
// MobileWebSurfacePresenter.apply() cannot query/reparent workspace DOM.
const modulePath=path.join(root,'src/core/ui/modules/presentation/mobile-web-surface.js');
const boundaryPath=path.join(root,'src/core/host/platform-boundary.js');
const oldDocument=global.document,oldWindow=global.window;
let queried=false;
try{
  global.document={
    documentElement:{dataset:{dkdsHost:'desktop'},classList:{contains:()=>false}},
    querySelector(){queried=true;throw new Error('Desktop DOM must not be queried by Mobile Presenter.');},
    querySelectorAll(){queried=true;throw new Error('Desktop DOM must not be scanned by Mobile Presenter.');},
    createElement(){queried=true;throw new Error('Desktop DOM must not receive Mobile projection frames.');}
  };
  global.window={electronAPI:{},location:{search:''}};
  global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(){return true;},setToken(){return true;},remove(){return true;}};
  delete require.cache[require.resolve(boundaryPath)];
  delete require.cache[require.resolve(modulePath)];
  const mod=require(modulePath);
  const presenter=new mod.MobileWebSurfacePresenter();
  const result=presenter.apply({activityId:'resonance',workspaces:[{activityId:'resonance',presentationComplete:true,surfaces:[]}]});
  assert.deepStrictEqual(result,{mode:'desktop-inert',activityId:'',projected:0});
  assert.strictEqual(queried,false,'Mobile Presenter touched Desktop DOM before its platform gate.');
}finally{
  delete require.cache[require.resolve(modulePath)];
  delete require.cache[require.resolve(boundaryPath)];
  if(oldDocument===undefined)delete global.document;else global.document=oldDocument;
  if(oldWindow===undefined)delete global.window;else global.window=oldWindow;
  delete global.DKDSStyleGate;
}

// CSS is protected by two independent keys: immutable host identity and the
// native-client class. Accidentally adding only one key cannot affect Desktop.
const mobileCssFiles=[
  'src/styles/platform/native-client-shell.css',
  'src/styles/platform/native-workspace-presentation.css'
];
for(const rel of mobileCssFiles){
  const css=read(rel);
  assert(css.includes('html[data-dkds-host="mobile"].react-native-client'),`${rel} must use the dual Mobile host scope.`);
  assert(!css.includes('html.react-native-client'),`${rel} contains a one-key Mobile selector that could leak across hosts.`);
  const lines=css.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    const selector=lines[i].trim();
    if(!selector||selector.startsWith('/*')||selector.startsWith('*')||selector.startsWith('@')||selector==='}'||!selector.includes('{'))continue;
    const before=selector.slice(0,selector.indexOf('{')).trim();
    if(!before)continue;
    assert(before.includes('[data-dkds-host="mobile"]')&&before.includes('.react-native-client'),`${rel}:${i+1} native selector escaped the dual host scope: ${before}`);
  }
}
const pulseMobileCss=read('src/plugins/pulse-analysis/mobile.css');
for(const match of pulseMobileCss.matchAll(/(^|\n)([^\n{]+)\{/g)){
  const selector=String(match[2]||'').trim();
  if(!selector||selector.startsWith('@'))continue;
  assert(selector.includes('[data-dkds-mobile-region="main"]')||selector.includes('[data-dkds-mobile-frame-region="drawer"]')||selector.includes('[data-dkds-mobile-region="companion-bottom"]')||selector.includes('[data-dkds-mobile-region="companion-right"]'),`Pulse native selector escaped Presenter-owned semantic scope: ${selector}`);
}
assert(!read('src/plugins/pulse-analysis/shared-views.js').includes('isNativeClient'),'Pulse shared view must not branch on platform identity.');
const pulseManifest=JSON.parse(read('src/plugins/pulse-analysis/plugin.json'));
assert(pulseManifest.styles.includes('plugin.css')&&!pulseManifest.styles.includes('mobile.css')&&pulseManifest.platformPresentation?.mobile?.mode==='custom'&&pulseManifest.platformPresentation.mobile.styles?.includes('mobile.css'),'Pulse native density must live in a Mobile-only platform presentation stylesheet rather than modifying Desktop plugin.css.');
assert(!read('src/plugins/pulse-analysis/plugin.css').includes('is-native-client'),'Shared Pulse Desktop stylesheet must not contain native-only selectors.');

// v3.67.54: keep the platform firewall executable, but do not freeze whole
// Desktop owner files by SHA-256. Whole-file hashes created false positives for
// deliberate Desktop work and false confidence about runtime/computed visuals.
// Historical hashes remain in tests/fixtures for archaeology only. Real release
// gates below protect host identity, Presenter isolation and stylesheet scoping;
// visual closure is verified through semantic contracts plus runtime rendering.
const historicalFreezePath=path.join(root,'tests/fixtures/desktop-visual-freeze-v36740.json');
assert(fs.existsSync(historicalFreezePath),'Historical Desktop visual baseline fixture should remain available for regression archaeology.');

console.log('v3.67.43 platform firewall PASS: immutable host identity, mutually exclusive Presenter shells, dual-key Mobile CSS, and inert Mobile projection on Desktop.');
