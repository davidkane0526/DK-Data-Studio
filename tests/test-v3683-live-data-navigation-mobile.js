#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const assert=require('assert');
const pkg=json('package.json');
assert.ok(Number(pkg.version.split('.').slice(0,3).join(''))>=3683,'The v3.68.3 closure capability must remain available.');

// Gate is an opt-in diagnostic, not an always-on write-path profiler.
const gate=read('src/core/theme/style-ownership-gate-runtime.js');
assert(/const VERSION='1\.8\.0'/.test(gate));
assert(/const runtimeTrackingEnabled=\(\)=>runtimeAuditOwners\.size>0/.test(gate),'Gate tracking must remain disabled until a diagnostic acquires it.');
assert(/if\(!runtimeTrackingEnabled\(\)\)\{element\.style\.setProperty/.test(gate),'Normal inline style writes must use the direct Gate fast path.');
assert(/if\(!runtimeTrackingEnabled\(\)\)\{element\.setAttribute/.test(gate),'Normal scientific paint writes must use the direct Gate fast path.');

// Theme observers may react deeply only to classes that can alter material/component context.
const material=read('src/core/theme/material-renderer.js');
const appearance=read('src/core/theme/component-appearance.js');
assert(/materialClassSignature/.test(material)&&/materialClassSignature\(record\.oldValue\)===materialClassSignature\(nextClass\)/.test(material),'Material Renderer must ignore non-material class churn.');
assert(/contextClassSignature/.test(appearance)&&/contextClassSignature\(record\.oldValue\)!==contextClassSignature\(next\)/.test(appearance),'Component Appearance must avoid subtree rescans for ordinary state/class changes.');
const coverage=read('src/core/theme/coverage-runtime.js');
assert(/inspect\?\.\(el,area\.role,\{detailed:index<3\}\)/.test(coverage),'Theme Coverage must bound expensive occlusion/pseudo-element inspection to representative nodes.');
assert(/const detailed=options\?\.detailed!==false/.test(material),'Material inspection must expose the bounded detailed mode.');

// The retired app-owned group/inspector dock stack must not participate in current rendering.
const docks=read('src/app/modules/floating-docks.js');
for(const token of ['groupPanel','inspectorPanel','dockedGroupSlot','inspectorDockSlot','setupDockResizer','setupInspectorDockResizer'])assert(!docks.includes(token),`Retired root-panel runtime token ${token} must not return.`);
const resonancePresentation=read('src/plugins/resonance-workbench/unit-presentation.js');
assert(resonancePresentation.includes("const inspector=units.prime.build({id:'curve-inspector'")&&resonancePresentation.includes("const group=units.prime.build({id:'group-analysis'")&&resonancePresentation.includes('primes:[dataControl,inspector,group]'),'Inspector/group surfaces must be production Unit PRIME surfaces composed by PluginWorkspace.');

// Data Center formula tools use a bounded left pane rather than wasting half the viewport.
const dc=read('src/plugins/data-center/plugin.css');
assert(/--dc-main-columns:minmax\(360px,520px\) minmax\(520px,1fr\)/.test(dc),'Wide Data Center must bound the formula/tool pane to <=520px through its single layout-token owner.');
assert(/container-name:data-center-tool/.test(dc)&&/@container data-center-tool \(max-width:620px\)/.test(dc),'Narrowed formula pane must reflow internally instead of requiring empty width.');

// Readable Desktop action geometry remains slot-owned.
const touch=read('src/styles/platform/touch.css');
assert(touch.includes('--dkds-scientific-nav-item-width:25.2px;')&&touch.includes('--dkds-scientific-nav-item-height:25.2px;'),'Desktop ScientificPlot floating actions must be 25.2×25.2 after the accepted 10% reduction, not the former 18×11.5 pill.');
const importCss=read('src/styles/structure/analysis-shell.css');
assert(importCss.includes('.import-data-command,.import-footer-actions{--dkds-header-action-height:32px;}'),'Import primary actions must feed the canonical 32px header-action slot.');

// Mobile global 插件 is an application-management command. It opens the canonical
// Plugin Manager directly; current-workspace surfaces/actions stay in their own controls.
const nativeHeader=read('mobile/src/components/NativeHeader.tsx');
const mobileSheet=read('mobile/src/sheets/ShellActionSheet.tsx');
const shellActions=read('mobile/src/host/useShellActions.ts');
assert(nativeHeader.includes("else if (id === 'plugins') onAction('plugins')")&&!nativeHeader.includes("onSheet('plugins')"),'Mobile 插件 must remain first-level and route directly to Plugin Manager.');
assert(!mobileSheet.includes("visible === 'plugins'")&&!mobileSheet.includes('管理已安装插件'),'Mobile must not mix plugin management with current-workspace surfaces/actions in a Plugins sheet.');
assert(shellActions.includes("action === 'plugins'")&&shellActions.includes("id: 'system.plugins'"),'Plugin Manager action must route through the Core system.plugins command.');

// Transfer Vth is a primary TOP activity and Desktop Presenter must project it to the primary bar.
const vth=read('src/plugins/transfer-vth-lab/plugin.js');
assert(/id:'transfer-vth-lab'/.test(vth)&&/primary:true/.test(vth)&&/openMode:'window'/.test(vth),'Transfer Vth must register as a visible primary TOP activity.');
global.window={};
const presenters=require('../src/core/ui/modules/presentation/presenters');
const nav=presenters.desktopNavigation([{activityId:'transfer-vth-lab',pluginId:'com.dkds.transfer-vth-lab',label:'Vₜ Vth',contextLabel:'Transfer Curve Vth Lab',icon:'Vₜ',description:'',order:50,primaryNavigation:true,isSuper:false,role:'top',openMode:'window',pluginType:'workbench'}],'',{});
assert.deepStrictEqual(nav.primary.map(row=>row.activityId),['transfer-vth-lab'],'Desktop Presenter must project Transfer Vth into primary navigation.');
assert.strictEqual(nav.tools.length,0,'Transfer Vth must not be routed into the Tools flyout.');
const topWorkspaceRuntime=read('src/core/plugins/kernel/modules/workspace/top.js');
assert(/registerTypedContribution\(pluginId,'ui\.topWorkspaces'[\s\S]*?renderActivityBar\(\)/.test(topWorkspaceRuntime),'Registering a TOP contract must immediately rerender navigation after an earlier Activity registration.');
const desktopShell=read('src/core/ui/modules/presentation/desktop-shell.js');
assert(/function normalizePrimaryViewport\(\)/.test(desktopShell)&&/scrollWidth<=primary\.clientWidth\+1/.test(desktopShell)&&/addEventListener\?\.\('focus'/.test(desktopShell),'Primary navigation must clear stale focus-induced scroll only when all primary tabs fit.');
const shellNavCss=read('src/styles/structure/shell-navigation.css');
assert(/\.context-commandbar\{[\s\S]*?flex:1 1 auto;[\s\S]*?width:auto;[\s\S]*?max-width:none/.test(shellNavCss)&&/\.primary-activity-bar\{[\s\S]*?flex:0 1 auto/.test(shellNavCss),'Desktop primary navigation must keep activity buttons content-sized while allowing current-context commands to consume genuine spare workspace width.');

// Dedicated live windows reconcile the owner Artifact graph immediately before mount and on focus.
const windowRuntime=read('src/plugin-window/runtime.js'),windowLifecycle=read('src/plugin-window/lifecycle.js');
assert(fs.statSync(path.join(root,'src/plugin-window/runtime.js')).size<=48*1024,'Dedicated runtime must remain within the 48 KiB module budget.');
assert(/proxy\?\.\('core\.project-artifacts'\)/.test(windowRuntime),'Dedicated windows need the Core project-artifact snapshot capability.');
assert(/owner-artifact-reconcile/.test(windowRuntime)&&/force:true,reason:`\$\{reason\}:pre-mount`/.test(windowRuntime),'Live Artifact reconciliation must run before plugin mount.');
assert(/reason:'window-focus'/.test(windowLifecycle),'Long-lived dedicated windows must reconcile when focus returns, without polling.');
assert(/function artifactDeltaForChange\(payload=\{\}\)/.test(windowRuntime)&&/pushActivityArtifactDelta/.test(windowRuntime),'Dedicated Artifact mutations must push an immediate delta to the owner instead of waiting for the debounced project snapshot.');
const desktopMain=read('desktop/main.js');
const auxiliaryWindowRuntime=read('desktop/main-modules/auxiliary-window-runtime.js');
assert(/windows:ownerArtifactDelta/.test(desktopMain)&&/routeArtifactDelta\(event,payload\)/.test(desktopMain),'The Electron main entry must delegate Artifact routing to the auxiliary-window owner module.');
assert(/function routeArtifactDelta\(event,payload=\{\}\)/.test(auxiliaryWindowRuntime)&&/auxiliaryBootstrap\.get\(event\?\.sender\?\.id\)/.test(auxiliaryWindowRuntime)&&/artifactOnly:true/.test(auxiliaryWindowRuntime)&&/windows:ownerArtifactDelta/.test(auxiliaryWindowRuntime),'The auxiliary-window runtime must route auxiliary Artifact deltas back to the owner and rebroadcast owner deltas to sibling TOP windows.');
// Runtime evidence: an Artifact delta created in a dedicated window must reach
// the owner immediately, and an owner delta must reach compatible sibling windows.
{
  const {createAuxiliaryWindowRuntime}=require('../desktop/main-modules/auxiliary-window-runtime');
  const ownerMessages=[],auxMessages=[];
  const ownerWin={isDestroyed:()=>false,webContents:{id:10,send:(channel,payload)=>ownerMessages.push({channel,payload})}};
  const auxWin={isDestroyed:()=>false,webContents:{id:20,send:(channel,payload)=>auxMessages.push({channel,payload})}};
  const BrowserWindow={getAllWindows:()=>[ownerWin,auxWin],fromWebContents:sender=>sender?.id===10?ownerWin:null};
  const runtime=createAuxiliaryWindowRuntime({app:{},BrowserWindow,appRoot:root,resolveConfiguredPluginWindow:()=>null,listConfiguredPluginWindows:()=>[],nativeWindowBackground:()=> '#fff',commonWindowPreferences:()=>({}),isAppQuitting:()=>false});
  runtime.auxiliaryWindows.set('live-view',auxWin);
  runtime.auxiliaryBootstrap.set(20,{ownerWebContentsId:10,projectTabId:'project-1',activityId:'live-artifact-view',prewarm:false,pluginWindow:{pluginId:'test.live-artifact-view',persistence:'project'}});
  const delta={type:'upsert',artifact:{id:'table:live',kind:'data.table'}};
  assert.strictEqual(runtime.routeArtifactDelta({sender:{id:20}},{projectTabId:'project-1',artifactDelta:delta}),true);
  assert.strictEqual(ownerMessages.length,1);assert.strictEqual(ownerMessages[0].channel,'windows:activityProjectSnapshot');
  assert.strictEqual(ownerMessages[0].payload.artifactOnly,true);assert.deepStrictEqual(ownerMessages[0].payload.artifactDelta,delta);
  assert.strictEqual(runtime.routeArtifactDelta({sender:{id:10}},{projectTabId:'project-1',artifactDelta:delta}),true);
  assert.strictEqual(auxMessages.length,1);assert.strictEqual(auxMessages[0].channel,'windows:ownerArtifactDelta');assert.deepStrictEqual(auxMessages[0].payload.artifactDelta,delta);
}
const host=read('src/app/modules/data-artifact-host.js');
assert(/function projectArtifactSnapshotApi\(\)/.test(host)&&/revision:\(\)=>Number\(state\.artifactStore\?\.revision\?\.\(\)\|\|0\)/.test(host),'Main window must expose a revisioned canonical Artifact snapshot API.');
const windowsHost=read('src/app/modules/dedicated-plugin-windows.js');
assert(/register\?\.\('core','core\.project-artifacts'/.test(windowsHost)&&/methods:projectArtifactSnapshotApi\(\)/.test(windowsHost),'Main window must publish the canonical project Artifact graph as a remote Core capability.');
// Runtime evidence: the published snapshot API must return the current revision and deep-cloned canonical rows.
const {execFileSync}=require('child_process');
execFileSync(process.execPath,['-e',String.raw`
  const assert=require('assert');
  global.document={querySelector:()=>null};global.localStorage={getItem:()=>null,setItem:()=>{}};global.d3={select:()=>({})};
  const artifact={id:'table:runtime',kind:'data.table',columns:[{key:'Vd',values:[0,.1]},{key:'Id',values:[1,2]}]};
  global.window={DKDSData:{createStore:()=>({}),deepClone:value=>JSON.parse(JSON.stringify(value))}};
  globalThis.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'config-token'},set(){},remove(){},setToken(){}};
  const context=require('./src/app/modules/context');
  context.state.artifactStore={revision:()=>17,list:()=>[artifact],get:id=>id===artifact.id?artifact:null};
  const api=require('./src/app/modules/data-artifact-host').projectArtifactSnapshotApi();
  assert.strictEqual(api.revision(),17);const rows=api.list({includeTransient:true});assert.strictEqual(rows.length,1);assert.deepStrictEqual(rows[0],artifact);assert.notStrictEqual(rows[0],artifact);assert.notStrictEqual(api.get(artifact.id),artifact);
`],{cwd:root,stdio:'pipe'});


console.log('v3.68.3 performance + UX closure PASS');
