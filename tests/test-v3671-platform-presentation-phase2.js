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
const desktopShell=read('src/core/ui/modules/presentation/desktop-shell.js');
const activityShell=read('src/core/plugins/kernel/modules/activity/shell.js');
const packageRuntime=read('src/core/plugins/kernel/modules/package-runtime.js');
const appHost=read('src/app/modules/dedicated-plugin-windows.js');
const windowHost=read('src/plugin-window/runtime.js');
const sdkTypes=read('sdk/plugin-api.d.ts');

{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=1))),'Platform Presentation Architecture Phase 2 requires v3.67.1+.');}
assert(composition.importableModules.some(row=>row.id==='ui/presentation/desktop-shell'),'Desktop Presentation Shell must be an authored Core UI module.');
for(const token of ['desktopNavigation','primary','secondary','tools','system','activation'])assert(presentersSource.includes(token),`Desktop Presenter navigation projection missing ${token}.`);
for(const token of ['DesktopMouseKeyboardAdapter','Intent.types.NAVIGATE',"Presentation.present('desktop'",'snapshot.navigation.primary','snapshot.navigation.tools'])assert(desktopShell.includes(token),`Desktop Presentation Shell must consume Presenter + Interaction Intent: ${token}.`);
assert(activityShell.includes('state.host?.renderActivityNavigation')&&!activityShell.includes('toolWorkspace')&&!activityShell.includes('pluginTypeOf'),'Plugin Kernel Activity shell must delegate platform composition and stop classifying tool workspaces itself.');
assert(packageRuntime.includes('pluginType:pluginTypeForManifest'),'Activity registry snapshots must expose plugin type metadata to the Presentation Model.');
assert(appHost.includes('renderActivityNavigation:()=>window.DKDSDesktopPresentationShell?.renderNavigation?.({isAuxiliaryWindow:false})'),'main Desktop host must install the Presenter-backed navigation renderer.');
assert(windowHost.includes('renderActivityNavigation:()=>window.DKDSDesktopPresentationShell?.renderNavigation?.({isAuxiliaryWindow:true})'),'dedicated Desktop host must reuse the same Presenter-backed navigation renderer.');

for(const token of ['data-primary','utility-primary'])assert(presentationContract.includes(token),`Presentation role contract missing ${token}.`);
for(const token of ['core-runtime+contract','liveKeys','declared.filter'])assert(modelSource.includes(token),`Presentation Model Phase 2 merge contract missing ${token}.`);
assert(sdkTypes.includes("DKDSPresentationSurfaceRole='scientific-primary'|'data-primary'|'utility-primary'|'data-control'|'inspector'|'scientific-secondary'"),'SDK must expose one bounded presentation role contract.');
assert(sdkTypes.includes('presentationRole?:DKDSPresentationSurfaceRole')&&sdkTypes.includes('collapsible?:boolean'),'SDK TOP surface declarations must expose presentationRole/priority/collapsible without platform-specific APIs.');
for(const forbidden of ['ctx.ui.desktop','ctx.ui.mobile'])assert(!sdkTypes.includes(forbidden),`${forbidden} must not exist.`);

const explicit=[
  ['src/plugins/data-center/feature-runtime.js','data-primary'],
  // TER no longer models the R–V chart as a private inspector PRIME. Its TOP
  // contract still exposes the shared parameter/data-control surface, while all
  // scientific charts participate in the titleless GroupArea.
  ['src/plugins/ter-analysis/feature-runtime.js','data-control'],
  ['src/plugins/pulse-analysis/feature-runtime.js','data-control'],
  ['src/plugins/pulse-sampler-tool/plugin.js','utility-primary'],
  ['src/plugins/transfer-vth-lab/plugin.js','scientific-primary']
];
for(const [rel,role] of explicit)assert(read(rel).includes(`presentationRole:'${role}'`),`${rel} must declare ${role} in the existing TOP contract.`);

// Runtime contract: live workspace state must inherit semantics from TOP contract,
// keep contract-only surfaces, and DesktopPresenter must classify shell navigation.
global.window={
  DKDSPlugins:{
    activities:{
      list:()=>[
        {id:'alpha',pluginId:'builtin.alpha',pluginType:'workbench',label:'Alpha',order:10,primary:true,role:'top',isSuper:true},
        {id:'beta',pluginId:'builtin.beta',pluginType:'workbench',label:'Beta',order:20,primary:false,role:'top',openMode:'window'},
        {id:'tool',pluginId:'builtin.tool',pluginType:'tool',label:'Tool',order:30,primary:true,role:'top',openMode:'window'},
        {id:'settings',pluginId:'builtin.settings',pluginType:'foundation',label:'Settings',order:90,navigation:'system'}
      ],
      active:()=> 'alpha'
    },
    workspace:{top:()=>[
      {pluginId:'builtin.alpha',activity:'alpha',layout:{primary:{id:'main',presentationRole:'data-primary',priority:100,collapsible:false},prime:[{id:'inspect',presentationRole:'inspector',priority:80,collapsible:true}],sub:[{id:'detail',presentationRole:'scientific-secondary',priority:50,collapsible:true}]}},
      {pluginId:'builtin.beta',activity:'beta',layout:{primary:{id:'main'}}},
      {pluginId:'builtin.tool',activity:'tool',layout:{primary:{id:'main',presentationRole:'utility-primary'}}}
    ]},
    statusBar:{list:()=>[]}
  },
  DKDSUI:{
    workspaces:{actions:id=>id==='alpha'?[
      {id:'workspace-primary:main',surfaceId:'main',kind:'primary',label:'Live Main',active:true,placement:'main'},
      {id:'workspace-prime:inspect',surfaceId:'inspect',kind:'prime',label:'Live Inspect',active:true,placement:'right'}
    ]:[]},
    actions:{list:()=>[]}
  },
  DKDSTheme:{current:()=> 'light'},
  addEventListener:()=>{}
};
const presentation=require('../src/core/ui/modules/presentation/presenters');
const snapshot=presentation.snapshot();
const alpha=snapshot.workspaces.find(row=>row.activityId==='alpha');
assert(alpha,'alpha workspace missing');
assert.deepStrictEqual(alpha.surfaces.map(row=>[row.surfaceId,row.role,row.source]),[
  ['main','data-primary','core-runtime+contract'],
  ['inspect','inspector','core-runtime+contract'],
  ['detail','scientific-secondary','core-registry']
]);
assert.strictEqual(alpha.surfaces[1].priority,80);
assert.strictEqual(alpha.surfaces[1].collapsible,true);
const desktop=presentation.present('desktop',{isAuxiliaryWindow:false});
assert.deepStrictEqual(desktop.navigation.primary.map(row=>row.activityId),['alpha']);
assert.deepStrictEqual(desktop.navigation.secondary.map(row=>row.activityId),['beta']);
assert.deepStrictEqual(desktop.navigation.tools.map(row=>row.activityId),['tool']);
assert.deepStrictEqual(desktop.navigation.system.map(row=>row.activityId),['settings']);
assert.strictEqual(desktop.navigation.secondary[0].activation,'window');
const auxiliary=presentation.present('desktop',{isAuxiliaryWindow:true});
assert.deepStrictEqual(auxiliary.navigation.tools,[]);
assert(auxiliary.navigation.primary.some(row=>row.activityId==='tool'),'Tool workspace must become a normal primary activity inside its dedicated host.');
const mobile=presentation.present('mobile',{orientation:'portrait'});
assert.strictEqual(mobile.surfaces.find(row=>row.surfaceId==='main').presentation.region,'main');
assert.strictEqual(mobile.surfaces.find(row=>row.surfaceId==='inspect').presentation.region,'companion-right');
assert.strictEqual(mobile.surfaces.find(row=>row.surfaceId==='detail').presentation.region,'route');
delete global.window;

console.log('v3.67.1 Platform Presentation Phase 2 PASS: Desktop navigation is Presenter-owned, live surfaces merge with semantic contracts, and first TOP declarations are platform-neutral.');
