'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const composition=json('src/core/ui/composition/composition.json');
const modelSource=read('src/core/ui/modules/presentation/model.js');
const presentationContract=read('src/core/contracts/presentation.js');
const presentersSource=read('src/core/ui/modules/presentation/presenters.js');
const intentSource=read('src/core/ui/modules/interaction/intent.js');
const adaptersSource=read('src/core/ui/modules/interaction/adapters.js');
const mobileHost=read('src/core/host/mobile-host-runtime.js');
const pluginWorkspace=read('src/core/ui/modules/workbench/plugin.js');
const hostApi=read('src/core/ui/modules/host/api.js');
const dedicated=read('src/app/modules/dedicated-plugin-windows.js');
const pluginApi=read('docs/PLUGIN_API.md');
const pluginApiRuntime=read('src/core/plugins/kernel/modules/plugin-api.js');
const sdkTypes=read('sdk/plugin-api.d.ts');

{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=0))),'Platform Presentation Architecture Phase 1 requires v3.67.0+.');}
const ids=composition.importableModules.map(row=>row.id);
for(const id of ['ui/interaction/intent','ui/interaction/adapters','ui/presentation/model','ui/presentation/presenters'])assert(ids.includes(id),`${id} must be a generated Core UI runtime module.`);

for(const token of ['scientific-primary','data-control','inspector','scientific-secondary'])assert(presentationContract.includes(token),`Core Presentation contract must own semantic role ${token}.`);
for(const token of ['priority','collapsible'])assert(modelSource.includes(token),`Core Presentation Model must own semantic surface field ${token}.`);
for(const token of ['DKDSPlugins?.activities','DKDSPlugins?.workspace?.top','DKDSUI?.workspaces?.actions','DKDSUI?.actions','DKDSPlugins?.statusBar'])assert(modelSource.includes(token),`Core Presentation Model must read ${token} registry state.`);
assert(!modelSource.includes('querySelector')&&!modelSource.includes('querySelectorAll')&&!modelSource.includes('getComputedStyle'),'Core Presentation Model must be DOM-blind.');

assert(presentersSource.includes('class DesktopPresenter')&&presentersSource.includes('class MobilePresenter'),'Desktop and Mobile Presenter must be separate consumers of the same Presentation Model.');
assert(presentersSource.includes("region:'main'")&&presentersSource.includes("region:orientation==='landscape'?'rail':'sheet'")&&presentersSource.includes("region:'route'"),'Mobile Presenter must map semantic roles instead of inheriting desktop spatial placement.');
assert(presentersSource.includes("present:(platform='desktop'")&&presentersSource.includes("platform==='mobile'?mobile.present(context):desktop.present(context)"),'one presentation facade must serve both platforms.');

for(const type of ['navigation.activate','navigation.back','command.execute','workspace.surface.activate','workspace.action.execute','status.action.execute','keyboard.key'])assert(intentSource.includes(type),`Unified Interaction Intent must define ${type}.`);
assert(adaptersSource.includes('class DesktopMouseKeyboardAdapter')&&adaptersSource.includes('class MobileGestureAdapter'),'desktop mouse/keyboard and mobile gesture adapters must be explicit architecture modules.');
assert(adaptersSource.includes('fromHostRequest')&&adaptersSource.includes('fromHeldSwipe'),'Mobile Gesture Adapter must translate native commands and gestures into Interaction Intents.');

assert(mobileHost.includes("const VERSION=3")&&mobileHost.includes("api.present('mobile'")&&mobileHost.includes('fromHostRequest'),'Mobile Host protocol 3 must consume the Mobile Presenter and unified input adapter.');
assert(!mobileHost.includes('querySelector')&&!mobileHost.includes('querySelectorAll')&&!mobileHost.includes('getComputedStyle'),'Mobile Host must never reverse-read Desktop DOM for state.');
assert(!mobileHost.includes('.analysis-page')&&!mobileHost.includes('.project-tab')&&!mobileHost.includes('#statusBarMessage')&&!mobileHost.includes('[data-dkds-mobile-summary]'),'Desktop page/project/status DOM identities must not leak back into Mobile Host.');

assert(pluginWorkspace.includes('presentationRole')&&pluginWorkspace.includes('semanticKind')&&pluginWorkspace.includes('collapsible'),'PluginWorkspace runtime registry must expose semantic presentation metadata without a second Plugin API.');
assert(hostApi.includes('presentationRole:String(action.presentationRole')&&hostApi.includes('semanticKind:String(action.semanticKind'),'DKDSUI workspace registry must carry semantic presentation metadata in memory.');
assert(dedicated.includes('DKDSPresentation?.configure')&&dedicated.includes('projectSnapshot:()=>')&&dedicated.includes('state.projectTabs'),'app project state must feed the Presentation Model directly rather than through rendered project tabs.');
assert(dedicated.includes("DKDSPresentation.present('mobile'"),'non-native connectivity fallback must reuse the Mobile Presenter instead of reconstructing a parallel shell snapshot.');

assert(pluginApi.includes('Plugin API v1.19')||pluginApi.includes('Plugin API 1.19'),'Phase 1 must retain the single Plugin API 1.19 contract.');
for(const forbidden of ['ctx.ui.desktop','ctx.ui.mobile']){
  assert(!pluginApiRuntime.includes(forbidden),`${forbidden} must not exist in the executable Plugin API facade.`);
  assert(!sdkTypes.includes(forbidden),`${forbidden} must not exist in SDK authoring types.`);
}
assert(!/\bdesktop\s*\??\s*:/.test(sdkTypes)&&!/\bmobile\s*\??\s*:/.test(sdkTypes),'SDK ui facade must not declare desktop/mobile platform branches.');

const domainPattern=/(?:resonance|\bter\b|pulse|dksmb|data-center)/i;
for(const rel of ['src/core/ui/modules/presentation/model.js','src/core/ui/modules/presentation/presenters.js','src/core/ui/modules/interaction/intent.js','src/core/ui/modules/interaction/adapters.js']){
  const source=read(rel);assert(!domainPattern.test(source),`${rel} must stay domain-blind.`);
  assert(fs.statSync(path.join(root,rel)).size<=48*1024,`${rel} must remain within the 48 KiB Core module boundary.`);
}

// Runtime contract check without a DOM: Presentation Model must derive the shell from registries only.
global.window={
  DKDSPlugins:{
    activities:{list:()=>[{id:'alpha',pluginId:'builtin.alpha',label:'Alpha',role:'top',isSuper:true}],active:()=> 'alpha'},
    workspace:{top:()=>[{pluginId:'builtin.alpha',activity:'alpha',layout:{primary:{id:'main'},prime:[{id:'inspect',semanticKind:'inspector'}],sub:[{id:'detail'}]}}]},
    statusBar:{list:()=>[{pluginId:'builtin.alpha',id:'state',value:{label:'State'}}]}
  },
  DKDSUI:{
    workspaces:{actions:()=>[
      {id:'workspace-primary:main',surfaceId:'main',kind:'primary',label:'Main',active:true},
      {id:'workspace-prime:inspect',surfaceId:'inspect',kind:'prime',semanticKind:'inspector',label:'Inspect',active:false},
      {id:'workspace-sub:detail',surfaceId:'detail',kind:'sub',label:'Detail',active:false}
    ]},
    actions:{list:()=>[{id:'run',label:'Run',enabled:true,items:[]}]}
  },
  DKDSTheme:{current:()=> 'light'},
  addEventListener:()=>{}
};
const presentation=require('../src/core/ui/modules/presentation/presenters');
presentation.configure({projectSnapshot:()=>({ready:true,activeProjectId:'p1',title:'P1',projects:[{id:'p1',title:'P1',active:true}]}),historySnapshot:()=>({canUndo:true,canRedo:false,past:[],future:[]})});
const core=presentation.snapshot();
assert.strictEqual(core.project.title,'P1');
assert.deepStrictEqual(core.workspaces[0].surfaces.map(row=>row.role),['scientific-primary','inspector','scientific-secondary']);
const desktop=presentation.present('desktop');
assert.strictEqual(desktop.schema,'dkds.desktop-presentation.v1');
assert.strictEqual(desktop.presentationModel,'dkds.presentation-model.v1');
const mobile=presentation.present('mobile',{protocol:3,orientation:'portrait'});
assert.strictEqual(mobile.surfaces[0].presentation.region,'main');
assert.strictEqual(mobile.surfaces[1].presentation.region,'sheet');
assert.strictEqual(mobile.surfaces[2].presentation.region,'route');
delete global.window;

console.log('v3.67.0 Platform Presentation Architecture Phase 1 PASS: one Core Presentation Model, Desktop/Mobile Presenters, unified Interaction Intent, platform adapters, and registry-driven Mobile Host.');
