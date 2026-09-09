#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const [major,minor,patch]=String(json('package.json').version||'0.0.0').split('.').map(Number);
assert(major>3||(major===3&&(minor>68||(minor===68&&patch>=9))),'Mobile native-intent closure requires v3.68.9+.');

// Shared user-intent controller: ordinary plot/status interactions clear authority;
// only explicitly declared native-effect controls mint a short-lived one-shot token.
const intent=require('../src/core/host/native-user-intent');
let now=1000;
const controller=intent.createController({now:()=>now});
const ordinary={closest:()=>null};
const target=(kind)=>{
  const dataset=kind==='clipboard'?{dkdsNativeCopy:'clipboard'}:{dkdsNativeSave:kind};
  const el={tagName:'BUTTON',dataset,id:`native-${kind}`,textContent:kind,getAttribute:()=>null};
  el.closest=selector=>selector===(kind==='clipboard'?intent.COPY_CONTROL_SELECTOR:intent.SAVE_CONTROL_SELECTOR)?el:null;
  return el;
};
assert.strictEqual(controller.captureEvent({type:'pointerdown',isTrusted:true,target:ordinary}),false);
assert.strictEqual(controller.consume('export',{source:'plot'}),null,'Plot interaction must not authorize an Android save picker.');
assert.strictEqual(controller.captureEvent({type:'click',isTrusted:true,target:target('export')}),true);
assert.strictEqual(controller.consume('export',{source:'explicit-export'})?.authorized,true,'Explicit export control must authorize one export.');
assert.strictEqual(controller.consume('export',{source:'second-export'}),null,'Native export intent must be one-shot.');
controller.captureEvent({type:'click',isTrusted:true,target:target('project')});
controller.captureEvent({type:'pointerdown',isTrusted:true,target:ordinary});
assert.strictEqual(controller.consume('project',{source:'status-click'}),null,'A later ordinary/status/plot interaction must clear stale project-save authority.');
assert.strictEqual(controller.captureEvent({type:'click',isTrusted:true,target:target('clipboard')}),true);
assert.strictEqual(controller.consume('clipboard',{source:'explicit-copy'})?.kind,'clipboard','Explicit copy must remain independently authorized.');
now+=intent.TTL.export+1;

// The Native WebView must load the generic Core intent gate before its native bridge.
const html=read('src/index.html');
assert(html.indexOf('core/host/native-user-intent.js')>=0&&html.indexOf('core/host/native-user-intent.js')<html.indexOf('web-bridge.js'),'Native user-intent gate must initialize before web-bridge.');
const bridge=read('src/web-bridge.js');
assert(bridge.includes("nativeUserIntent?.consume?.('clipboard'")&&bridge.includes("nativeUserIntent?.consume?.('export'")&&bridge.includes("nativeUserIntent?.consume?.('project'"),'Mobile Web bridge must fail closed for clipboard/export/project native side effects.');
assert(bridge.includes("Object.defineProperty(window,'DKDSNativeIntentBridge'")&&bridge.includes('nativeIntent:intent'),'Native shell must have a narrow intent bridge and native requests must carry the consumed token.');

// RN is a second, independent boundary. A forged or accidental WebView request
// without the explicit token must never reach Clipboard or ACTION_CREATE_DOCUMENT.
const router=read('mobile/src/host/useNativeRequestRouter.ts');
assert(/req\.type === 'copyText'[\s\S]{0,260}?nativeIntent\?\.authorized !== true[\s\S]{0,220}?Clipboard\.setStringAsync/.test(router),'RN clipboard router must validate intent before writing the system clipboard.');
assert(/req\.type === 'saveText'[\s\S]{0,520}?if \(!directProjectWrite && !explicitSave\) throw[\s\S]{0,320}?files\.shareTextFile/.test(router),'RN save router must reject unauthorized create-document requests before invoking file service.');
assert(/req\.type === 'saveBase64'[\s\S]{0,260}?nativeIntent\?\.authorized !== true[\s\S]{0,260}?files\.shareBase64File/.test(router),'RN base64 export must validate explicit export intent before invoking file service.');

// Native-effect ownership must survive ActionGroup -> Presentation -> Mobile Host.
const actions=read('src/core/ui/modules/interaction/context-actions.js');
assert(actions.includes('nativeSave:item.nativeSave')&&actions.includes('nativeCopy:item.nativeCopy')&&actions.includes('nativeSave:action.nativeSave')&&actions.includes('nativeCopy:action.nativeCopy'),'ActionGroup mobile projection must preserve native-effect metadata.');
assert(actions.includes('button.dataset.dkdsNativeSave')&&actions.includes("button.dataset.dkdsNativeCopy='clipboard'"),'DOM ActionGroup controls must declare the same explicit effect ownership.');
const model=read('src/core/ui/modules/presentation/model.js');
assert(model.includes('nativeSave:text(row.nativeSave),nativeCopy:text(row.nativeCopy)')&&model.includes('nativeSave:text(item.nativeSave),nativeCopy:text(item.nativeCopy)'),'Presentation Model must preserve native effect semantics for mobile Presenter.');
const mobileHost=read('src/core/host/mobile-host-runtime.js');
assert(mobileHost.includes('const actionNativeEffect=')&&mobileHost.includes('if(nativeEffect)captureNativeIntent(nativeEffect'),'Mobile Host must mint native authority only from the invoked action\'s declared native effect.');
assert(mobileHost.includes("if(id==='project.save')captureNativeIntent('project','mobile.command.project.save')"),'Native-shell explicit project Save must mint project authority before the shared save command.');
const statusBlock=mobileHost.slice(mobileHost.indexOf('async function status'),mobileHost.indexOf('async function action'));
assert(!statusBlock.includes('captureNativeIntent'),'Bottom status-bar invocation must never mint save/copy authority.');

// “插件” means plugin management only. Workspace surfaces/actions remain in their
// own top controls and overflow sheet rather than being mixed into Plugin Manager.
const header=read('mobile/src/components/NativeHeader.tsx');
const sheets=read('mobile/src/sheets/ShellActionSheet.tsx');
const types=read('mobile/src/model/shell-types.ts');
const shellActions=read('mobile/src/host/useShellActions.ts');
assert(header.includes("{ id: 'plugins', label: '插件' }")&&header.includes("else if (id === 'plugins') onAction('plugins');")&&!header.includes("onSheet('plugins')"),'Top 插件 command must invoke Plugin Manager directly.');
assert(!types.includes("'plugins'")&&!sheets.includes("visible === 'plugins'")&&!sheets.includes('管理已安装插件'),'Mixed Plugins sheet must be removed completely.');
assert(shellActions.includes("action === 'plugins'")&&shellActions.includes("id: 'system.plugins'"),'React Native shell must route 插件 to the canonical Core system.plugins command.');

console.log('v3.68.9 Mobile native side-effect intent + Plugin Manager ownership PASS');
