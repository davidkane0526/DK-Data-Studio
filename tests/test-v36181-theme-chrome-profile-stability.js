const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.version,'3.61.85');

const rendererCss=read('src/styles/modern/98-theme-material-renderer.css');
const chromeCss=read('src/styles/modern/96-integrated-command-chrome.css');
const baseCss=read('src/styles/base/10-analysis-shell.css');
const runtimeSource=read('src/core/theme/runtime.js');

assert(chromeCss.includes('Chrome owns its actions.'),'chrome-owned command integration invariant missing');
assert(chromeCss.includes('[data-dkds-material-role="chrome"]')&&chromeCss.includes('.statusbar-command-cluster'),'status-bar/header integration must be semantic-role-owned');
assert(chromeCss.includes('#statusBar.statusbar .plugin-status-item::before{display:none!important}'),'status-bar item separators must remain invisible');
assert(chromeCss.includes('data-dkds-theme-mode="light"')&&chromeCss.includes('background:var(--dkui-accent)!important'),'theme mode active state must have an explicit readable fill');
assert(baseCss.includes('background:var(--dkui-surface-soft')&&baseCss.includes('color:var(--dkui-text-soft'),'export-menu context row must use theme tokens');
assert(!/\.plugin-export-context\s*\{[^}]*background\s*:\s*#f8fafc/s.test(baseCss),'export-menu context must not hard-code a light background');
assert(runtimeSource.includes('preferredProfile')&&runtimeSource.includes('suspended:key'),'theme runtime must distinguish preferred profile from temporarily active fallback');
assert(runtimeSource.includes("if(bootTheme){if(next!==current)void native.appearanceSetTheme?.(current);}"),'explicit saved appearance must win the startup native handshake');
assert(runtimeSource.includes("surfaceElevated:'rgba(255,255,255,.42)'")&&runtimeSource.includes("surfaceElevated:'rgba(23,32,51,.42)'"),'built-in Thin Glass must use the SDK-reference translucent surface family');

// Execute ThemeRuntime against a minimal host to prove that a temporary theme-plugin
// deactivate/reactivate cycle cannot overwrite the user's selected profile.
const storage=new Map([
  ['dkds.appearance.v1','dark'],
  ['dkds.theme-profile.v1','example.theme:glass']
]);
const styleValues=new Map();
const rootStyle={
  setProperty(name,value){styleValues.set(name,String(value));},
  removeProperty(name){styleValues.delete(name);}
};
const documentElement={dataset:{},style:rootStyle};
global.window=global;
global.document={documentElement,body:null};
global.localStorage={
  getItem:key=>storage.has(key)?storage.get(key):null,
  setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key)
};
global.getComputedStyle=()=>({getPropertyValue:name=>styleValues.get(name)||''});
global.matchMedia=()=>({matches:false});
global.CustomEvent=class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}};
global.dispatchEvent=()=>true;
global.addEventListener=()=>{};
global.removeEventListener=()=>{};
global.BroadcastChannel=undefined;
let nativeSet=null;
global.electronAPI={
  appearanceGetTheme:()=>Promise.resolve('light'),
  appearanceSetTheme:theme=>{nativeSet=theme;return Promise.resolve(theme);},
  onAppearanceThemeChanged:()=>()=>{}
};
global.DKDSThemeContract=require(path.join(root,'sdk/theme-contract.js'));

delete require.cache[require.resolve(path.join(root,'src/core/theme/runtime.js'))];
require(path.join(root,'src/core/theme/runtime.js'));
const T=global.DKDSTheme;
assert.equal(T.current(),'dark','saved explicit appearance must be the initial renderer mode');
assert.equal(T.profile(),'builtin.default','missing preferred plugin profile should use a temporary default fallback');
assert.equal(T.preferredProfile(),'example.theme:glass','preferred theme profile must survive while its plugin is unavailable');

const spec={label:'Glass',owner:'example.theme',recipes:{chrome:'thin-glass',sidebar:'thin-glass',surface:'clear',elevated:'thin-glass',popover:'thin-glass',control:'clear',floating:'thin-glass'},modes:{light:{},dark:{}}};
T.registerProfile('example.theme:glass',spec);
assert.equal(T.profile(),'example.theme:glass','registering the preferred plugin profile must restore it automatically');
T.unregisterProfile('example.theme:glass');
assert.equal(T.profile(),'builtin.default','unavailable active plugin theme should fall back in-memory');
assert.equal(T.preferredProfile(),'example.theme:glass','temporary fallback must not replace the preferred profile');
assert.equal(storage.get('dkds.theme-profile.v1'),'example.theme:glass','temporary plugin deactivation must not overwrite the persisted theme selection');
T.registerProfile('example.theme:glass',spec);
assert.equal(T.profile(),'example.theme:glass','re-registering a temporarily unavailable theme must restore it');

setImmediate(()=>{
  try{
    assert.equal(T.current(),'dark','native startup handshake must not replace an explicit saved appearance');
    assert.equal(nativeSet,'dark','renderer must push the explicit saved appearance to a stale native host');
    console.log('v3.61.81 theme chrome/profile persistence checks passed.');
  }catch(err){console.error(err);process.exitCode=1;}
});
