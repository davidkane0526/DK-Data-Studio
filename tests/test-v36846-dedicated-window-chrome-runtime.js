'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const atLeast=(v,min)=>{const a=v.split('.').map(Number),b=min.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
assert(atLeast(pkg.version,'3.68.46'));

const pluginRoots=fs.readdirSync(path.join(root,'src/plugins'),{withFileTypes:true})
  .filter(row=>row.isDirectory())
  .map(row=>row.name);
const dedicated=[];
for(const folder of pluginRoots){
  const manifestPath=path.join(root,'src/plugins',folder,'plugin.json');
  if(!fs.existsSync(manifestPath))continue;
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(manifest.window)dedicated.push({id:manifest.id,activity:manifest.window.activity,folder});
}
dedicated.sort((a,b)=>a.id.localeCompare(b.id));
const expected=[
  'builtin.data-center',
  'builtin.pulse-analysis',
  'builtin.resonance-workbench',
  'builtin.ter-analysis',
  'com.dkds.tools.pulse-sampler',
  'com.dkds.transfer-vth-lab'
].sort();
assert.deepStrictEqual(dedicated.map(row=>row.id),expected,'All current dedicated plugins must share the single Core plugin-window host contract.');

const chrome=read('src/plugin-window/chrome.js');
assert(!chrome.includes('MutationObserver'),'Dedicated window chrome must never observe/reparent the live PluginWorkspace during construction.');
assert(chrome.includes('function sync(page=null)')&&chrome.includes('function preparePage(page)'),'Dedicated chrome must use explicit post-mount synchronization.');
assert(chrome.includes('minimizeCurrentWindow')&&chrome.includes('toggleMaximizeCurrentWindow')&&chrome.includes('closeCurrentWindow')&&chrome.includes('getCurrentWindowState'),'Self-drawn titlebar controls must bind the current Core window-control IPC contract.');
assert(chrome.includes("document.body.dataset.dkdsWindowControls='ready'"),'Window-control readiness must be observable by runtime diagnostics.');

const runtime=read('src/plugin-window/runtime.js');
const setIndex=runtime.indexOf('window.DKDSPlugins.activities.set(bootstrap.activityId)');
const validateIndex=runtime.indexOf("if(!visiblePage)throw new Error(`插件工作区已激活但没有显示页面：");
const syncIndex=runtime.indexOf('window.DKDSPluginWindowChrome?.sync?.(visiblePage);');
assert(setIndex>=0&&validateIndex>setIndex&&syncIndex>validateIndex,'Titlebar adoption must happen only after activity mount and visible-page validation complete.');
assert(runtime.includes('windowChrome:window.DKDSPluginWindowChrome?.snapshot?.()||null'),'Dedicated renderer diagnostics must expose the shared chrome/content geometry snapshot.');
for(const token of ['pageRect:rectOf(page)','pageBodyRect:rectOf(body)','workbenchRootRect:rectOf(root)'])assert(chrome.includes(token),`Dedicated chrome diagnostics must expose ${token}.`);

const analysis=read('src/core/ui/modules/workbench/analysis.js');
const pluginWorkbench=read('src/core/ui/modules/workbench/plugin.js');
assert(analysis.includes('this.navigationElement=')&&analysis.includes('this.navigationHosts={'),'AnalysisWorkbench must retain canonical navigation references for host-neutral presentation.');
assert(analysis.includes('const nav=this.navigationElement;'),'Navigation rendering must use the retained canonical nav reference.');
assert(pluginWorkbench.includes('const nav=this.navigationElement||null'),'PluginWorkspace navigation presentation must retain its canonical navigation node.');

const style=read('src/plugin-window/style.css');
assert(style.includes('grid-template-columns:minmax(0,max-content) auto minmax(0,1fr) auto auto'),'Dedicated titlebar must reserve a draggable flexible spacer plus right-anchored action and window-control tracks.');
assert(style.includes('.plugin-window-titlebar :where(button,a,input,select,textarea,[role="button"]){-webkit-app-region:no-drag;pointer-events:auto}'),'Interactive titlebar controls must opt out of the draggable region.');
assert(style.includes('body.plugin-window-host #app{width:100%;height:100%;align-self:stretch;justify-self:stretch}'),'Dedicated app content must fill the main grid track under the self-drawn titlebar.');

const aux=read('desktop/main-modules/auxiliary-window-runtime.js');
assert(aux.includes('self-drawn window controls are not bound to Core IPC'),'Dedicated smoke must fail when self-drawn window controls are dead.');
assert(aux.includes('visible page body collapsed')&&aux.includes('workbench root collapsed'),'Dedicated smoke must fail on visually blank/collapsed content even when renderer startup reports ready.');
assert(aux.includes('self-drawn command bar is not right-anchored'),'Dedicated smoke must fail if the three titlebar controls drift away from the window right edge.');

console.log('v3.68.46 dedicated window content/chrome runtime contract PASS.');
