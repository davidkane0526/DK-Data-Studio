#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const {execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert.ok(Number(json('package.json').version.split('.').slice(0,3).join(''))>=3684,'The v3.68.4 closure capability must remain available.');

// 1) Dedicated TOP activities: the machine window contract must remain in
// function scope. TER/Pulse do not declare live hydration, so the old
// block-scoped `const contract` was evaluated and threw before openActivityWindow.
const dedicated=read('src/app/modules/dedicated-plugin-windows.js');
assert(/let contract=null;\s*if\(window\.electronAPI\?\.listPluginWindows\)/.test(dedicated),'Dedicated activity preflight must keep the resolved machine contract in function scope.');
assert(!/if\(window\.electronAPI\?\.listPluginWindows\)\{\s*const configured=[\s\S]{0,200}?const contract=/.test(dedicated),'The machine contract must not regress to block scope.');
execFileSync(process.execPath,['-e',String.raw`
  const assert=require('assert');
  global.document={querySelector:()=>null};global.localStorage={getItem:()=>null,setItem:()=>{}};global.d3={select:()=>({})};
  globalThis.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'config-token'},set(){},remove(){},setToken(){}};
  const calls=[];
  global.window={
    DKDSData:{createStore:()=>({list:()=>[]}),hashString:()=> '1'},
    DKDSCapabilities:{snapshot:()=>({revision:1,providers:[]})},
    DKDSPlugins:{activities:{list:()=>[{id:'ter',openMode:'window'},{id:'pulse',openMode:'window'}]},manager:{list:()=>[{id:'builtin.ter-analysis',window:{activity:'ter'}},{id:'builtin.pulse-analysis',window:{activity:'pulse'}}]}},
    electronAPI:{listPluginWindows:async()=>[{activity:'ter',artifactHydration:'project'},{activity:'pulse',artifactHydration:'project'}],openActivityWindow:async payload=>{calls.push(payload.activityId);return true;}}
  };
  const context=require('./src/app/modules/context');context.state.artifactStore={list:()=>[]};context.state.projectPath=null;
  const mod=require('./src/app/modules/dedicated-plugin-windows');const tab={id:'t1',title:'T'};
  mod.configure({projectTabs:{activeProjectTab:()=>tab,captureActiveProjectTab:()=>{}},imports:{dataConsumerTargets:()=>[]},artifacts:{dataSourceHostApi:()=>({list:()=>[]})},workspace:{},scientific:{},projects:{makeProject:()=>({projectName:'T'})},docks:{}});
  (async()=>{assert.strictEqual(await mod.openPluginActivityWindow('ter'),true);assert.strictEqual(await mod.openPluginActivityWindow('pulse'),true);assert.deepStrictEqual(calls,['ter','pulse']);})().catch(err=>{console.error(err);process.exit(1)});
`],{cwd:root,stdio:'pipe'});

// 2) data.artifacts is a semantic Core requirement and must project to the
// data-model runtime dependency in every dedicated window. This remains a
// generic Core contract even when a particular Artifact consumer is removed.
const windowManager=require('../desktop/plugin-window-manager');
assert(windowManager.normalizeDependencies([],['data.artifacts']).includes('data-model'),'data.artifacts must project to the data-model dedicated-window dependency.');

// 3) Clipboard side effects: selection/plot clicks are not authorization.
// The Electron bridge consumes a short-lived one-shot intent captured only by
// an explicitly marked copy control, and the main process validates it again.
const clipboardIntent=require('../desktop/preload-modules/native-clipboard-intent');
let now=1000;const controller=clipboardIntent.createNativeClipboardIntentController({now:()=>now});
const ordinaryTarget={closest:()=>null};
const copyControl={tagName:'BUTTON',id:'copy',dataset:{dkdsNativeCopy:'clipboard'},textContent:'复制',getAttribute:()=>null};copyControl.closest=selector=>selector===clipboardIntent.COPY_CONTROL_SELECTOR?copyControl:null;
assert.strictEqual(controller.captureEvent({type:'click',isTrusted:true,target:ordinaryTarget}),false,'Ordinary plot/selection clicks must not authorize clipboard writes.');
assert.strictEqual(controller.consume({source:'selection'}),null,'Clipboard writes without explicit copy intent must fail closed.');
assert.strictEqual(controller.captureEvent({type:'click',isTrusted:true,target:copyControl}),true);
const token=controller.consume({source:'explicit-copy'});assert(token?.authorized===true&&token.kind==='clipboard','An explicitly marked trusted copy click must authorize exactly one write.');
assert.strictEqual(controller.consume({source:'second-write'}),null,'Clipboard intent must be one-shot.');
controller.captureEvent({type:'click',isTrusted:true,target:copyControl});controller.captureEvent({type:'click',isTrusted:true,target:ordinaryTarget});assert.strictEqual(controller.consume(),null,'A later ordinary UI click must clear stale copy authority.');
now+=clipboardIntent.INTENT_TTL_MS+1;controller.captureEvent({type:'click',isTrusted:true,target:copyControl});now+=clipboardIntent.INTENT_TTL_MS+1;assert.strictEqual(controller.consume(),null,'Copy authority must also expire quickly.');

const preload=read('desktop/preload.js'),main=read('desktop/main.js');
assert(preload.includes("require('./preload-modules/native-clipboard-intent')")&&preload.includes('nativeClipboardIntent.consume'),'Electron preload must own explicit clipboard-intent capture/consumption.');
assert(/clipboard:writeText',[\s\S]{0,260}?__dkdsClipboardIntent/.test(preload),'Clipboard IPC must carry the consumed preload-only intent token.');
assert(/ipcMain\.handle\('clipboard:writeText',[\s\S]{0,260}?intent\?\.authorized!==true\|\|intent\?\.kind!==['"]clipboard['"]\)return false/.test(main),'Main process must independently reject clipboard writes without explicit intent.');
assert(fs.statSync(path.join(root,'desktop/main.js')).size<=48*1024,'Electron main entry must remain within the 48 KiB module budget.');

const curveInteraction=read('src/core/ui/modules/scientific-curve/render.js');
assert(!/(clipboard|copyText|copyCsv|writeText)/i.test(curveInteraction),'Scientific curve click/range-selection renderer must never write clipboard data.');
const plotView=read('src/core/ui/modules/plot-view/chart.js');
assert(/id:'copy',label:'复制数据',nativeCopy:'clipboard'/.test(plotView),'PlotView copy must be explicitly marked as the clipboard owner.');
const contextActions=read('src/core/ui/modules/interaction/context-actions.js');
assert(/if\(item\.nativeCopy\)b\.dataset\.dkdsNativeCopy='clipboard'/.test(contextActions),'ContextMenu copy items must carry explicit native-copy ownership.');
assert(/if\(action\.nativeCopy\)button\.dataset\.dkdsNativeCopy='clipboard'/.test(contextActions),'ActionGroup copy controls must carry explicit native-copy ownership.');
const tableSurface=read('src/core/ui/modules/table/surfaces.js');
assert(/async copyText\(text\)[\s\S]{0,260}?window\.electronAPI\?\.copyText[\s\S]{0,220}?return !!ok/.test(tableSurface),'Desktop table copies must route through the gated Electron clipboard bridge before any web fallback.');
for(const id of ['copy-table','copy-cell','copy-row'])assert(new RegExp(`id:'${id}'[^\\n]{0,180}nativeCopy:'clipboard'`).test(tableSurface),`Table ${id} must declare explicit clipboard ownership.`);
for(const [rel,needle] of [
  ['src/index.html','id="pluginManagerDiagnosticsBtn" data-dkds-native-copy="clipboard"'],
  ['src/plugins/ter-analysis/shared-views.js','terCopyLongBtn\\" class=\\"copy-btn\\" data-dkds-native-copy=\\"clipboard'],
  ['src/plugins/pulse-analysis/shared-views.js','id="pulseCopyCsvBtn" class="copy-btn" data-dkds-native-copy="clipboard"'],
  ['src/plugins/data-center/shared-views.js','id="dcCopyProvenance" data-dkds-native-copy="clipboard"'],
  ['src/plugins/connectivity-center/plugin.js','id="dkaiMcpCopy" data-dkds-native-copy="clipboard"']
])assert(read(rel).includes(needle),`${rel} explicit copy control must be marked.`);

console.log('v3.68.4 dedicated-window + data.artifacts dependency + clipboard intent closure PASS');
