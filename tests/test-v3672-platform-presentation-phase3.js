'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {readMobileShell}=require('./mobile-shell-source');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const shared=read('src/plugins/resonance-workbench/workbench-shared.js');
const views=read('src/plugins/resonance-workbench/view-components.js');
const unitPresentation=read('src/plugins/resonance-workbench/unit-presentation.js');
const presentersSource=read('src/core/ui/modules/presentation/presenters.js');
const desktopShell=read('src/core/ui/modules/presentation/desktop-shell.js');
const workbench=read('src/core/ui/modules/workbench/plugin.js');
const hostApi=read('src/core/ui/modules/host/api.js');
const mobileHost=read('src/core/host/mobile-host-runtime.js');
const mobileShell=readMobileShell(root);
const sdkTypes=read('sdk/plugin-api.d.ts');

{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=2))),'Platform Presentation Architecture Phase 3 requires v3.67.2+.');}
for(const token of ["id:'main',label:'共振分析',presentationRole:'scientific-primary'","id:'data-control',label:'参数'","presentationRole:'data-control'","id:'curve-inspector'","presentationRole:'inspector'","id:'group-analysis'","presentationRole:'scientific-secondary'"])assert(shared.includes(token),`Resonance semantic presentation contract missing ${token}.`);
assert(unitPresentation.includes("const dataControl=units.prime.build({id:'data-control'")&&unitPresentation.includes('existingNode:dataNode')&&unitPresentation.includes('autoOpen:true')&&!unitPresentation.includes('leftNode:'),'Resonance data/parameter rail must be a real Unit data-control PRIME, not PRIMARY desktop geometry.');
for(const geometry of ["defaultPlacement:'left'","defaultPlacement:'right'","defaultPlacement:'bottom'",'placements:Object.freeze'])assert(!shared.includes(geometry),`Platform-neutral Resonance Presentation Contract must not contain Desktop geometry: ${geometry}.`);
assert(views.includes('primary:PRESENTATION_LAYOUT.primary,prime:PRESENTATION_LAYOUT.prime,sub:PRESENTATION_LAYOUT.sub'),'TOP Workspace registration must consume the same canonical Resonance presentation contract.');
for(const legacy of ['res-inspect','res-group','res-physics','res-spacing','res-gate'])assert(!views.includes(`['${legacy}'`),`Resonance must not duplicate Presenter-owned host surface command ${legacy}.`);
assert(views.includes("ctx.ui.toolbar.add({id:'res-settings'")&&views.includes("ctx.ui.menus.add({id,menu:'export'"),'Command/menu contributions remain plugin-owned after surface navigation migrates to Presenter.');

for(const token of ['desktopWorkspaceSurfaces','workspaceSurfaces','workspace-toolbar'])assert(presentersSource.includes(token),`Desktop Presenter active-surface projection missing ${token}.`);
for(const token of ['renderWorkspaceSurfaces','data-dkds-presentation-surface','Intent.types.SURFACE','dkds:workspace-presentation-changed'])assert(desktopShell.includes(token),`Desktop Presentation Shell surface renderer missing ${token}.`);
assert(workbench.includes("new CustomEvent('dkds:workspace-presentation-changed'")&&workbench.includes("presentationChanged('prime-open'")&&workbench.includes("presentationChanged('sub-open'"),'PluginWorkspace must publish domain-neutral presentation changes when live surface state changes.');
assert(hostApi.includes("String(row.id)===actionId||String(row.surfaceId)===actionId"),'Workspace surface invocation must accept stable semantic surfaceId in addition to the internal action id.');

for(const token of ['surface.presentation?.navigation','surface.presentation?.region','navigableSurfaces','surfaceRequestId'])assert(mobileShell.includes(token),`Native Mobile shell must consume Presenter surface metadata: ${token}.`);
assert(mobileShell.includes('canonicalDataControlSurface')&&!mobileShell.includes('hasSemanticDataControl'),'Plugin API 1.19 Native Mobile shell must project one canonical semantic data-control command, independent of whether its label is 参数 or 数据.');
assert(mobileHost.includes('workspaces?.activate?.')&&mobileHost.includes('openSurfaceState')&&mobileHost.includes('currentViewport')&&mobileHost.includes("dkds:workspace-presentation-changed")&&mobileHost.includes('region:text(projected.presentation?.region)'),'Mobile Host must activate PRIME/SUB surfaces idempotently and keep platform-owned mobile visibility/composition state.');
for(const forbidden of ['ctx.ui.desktop','ctx.ui.mobile'])assert(!sdkTypes.includes(forbidden),`${forbidden} must not be introduced by Phase 3.`);

// Runtime projection: one Resonance contract maps to different platform geometry.
global.window={
  DKDSPlugins:{
    activities:{list:()=>[{id:'resonance',pluginId:'builtin.resonance-workbench',pluginType:'workbench',label:'共振分析',order:10,primary:true,role:'top',isSuper:true}],active:()=> 'resonance'},
    workspace:{top:()=>[{pluginId:'builtin.resonance-workbench',activity:'resonance',layout:{
      primary:{id:'main',label:'共振分析',presentationRole:'scientific-primary',priority:100,collapsible:false},
      prime:[
        {id:'data-control',label:'参数',presentationRole:'data-control',priority:95,collapsible:true},
        {id:'curve-inspector',label:'检查',presentationRole:'inspector',priority:90,collapsible:true},
        {id:'group-analysis',label:'组图',presentationRole:'scientific-secondary',priority:70,collapsible:true}
      ],
      sub:[
        {id:'physics',label:'物理机制',presentationRole:'scientific-secondary',priority:60,collapsible:true},
        {id:'spacing',label:'峰间距',presentationRole:'scientific-secondary',priority:50,collapsible:true},
        {id:'gate-analysis',label:'栅压分析',presentationRole:'scientific-secondary',priority:40,collapsible:true}
      ]
    }}]},statusBar:{list:()=>[]}
  },
  DKDSUI:{workspaces:{actions:()=>[
    {id:'workspace-primary:main',surfaceId:'main',kind:'primary',label:'共振分析',active:true,placement:'main'},
    {id:'workspace-prime:data-control',surfaceId:'data-control',kind:'prime',label:'数据 / 参数',active:true,placement:'left'},
    {id:'workspace-prime:curve-inspector',surfaceId:'curve-inspector',kind:'prime',label:'检查',active:false,placement:'right'},
    {id:'workspace-prime:group-analysis',surfaceId:'group-analysis',kind:'prime',label:'组图',active:false,placement:'bottom'},
    {id:'workspace-sub:physics',surfaceId:'physics',kind:'sub',label:'物理机制',active:false}
  ]},actions:{list:()=>[]}},DKDSTheme:{current:()=> 'light'},addEventListener:()=>{}
};
const presentation=require('../src/core/ui/modules/presentation/presenters');
const desktop=presentation.present('desktop');
assert.deepStrictEqual(desktop.workspaceSurfaces.map(row=>[row.surfaceId,row.role,row.section]),[
  ['data-control','data-control','PRIME'],['curve-inspector','inspector','PRIME'],['group-analysis','scientific-secondary','PRIME'],['physics','scientific-secondary','SUB'],['spacing','scientific-secondary','SUB'],['gate-analysis','scientific-secondary','SUB']
]);
const portrait=presentation.present('mobile',{orientation:'portrait',viewport:{width:420,height:780}});
assert.strictEqual(portrait.surfaces.find(row=>row.surfaceId==='main').presentation.region,'main');
assert.strictEqual(portrait.surfaces.find(row=>row.surfaceId==='data-control').presentation.region,'drawer');
assert.strictEqual(portrait.surfaces.find(row=>row.surfaceId==='data-control').active,false,'Desktop auto-open data-control PRIME must not implicitly open the mobile parameter drawer.');
assert.strictEqual(portrait.surfaces.find(row=>row.surfaceId==='curve-inspector').presentation.region,'companion-right');
assert.strictEqual(portrait.surfaces.find(row=>row.surfaceId==='group-analysis').presentation.region,'companion-bottom');
const landscape=presentation.present('mobile',{orientation:'landscape',viewport:{width:820,height:460},openSurfaces:{resonance:['data-control']}});
assert.strictEqual(landscape.layout.profile,'wide');
assert.strictEqual(landscape.surfaces.find(row=>row.surfaceId==='data-control').presentation.region,'drawer');
assert.strictEqual(landscape.surfaces.find(row=>row.surfaceId==='data-control').active,true);
assert.strictEqual(landscape.surfaces.find(row=>row.surfaceId==='curve-inspector').presentation.region,'companion-right');
assert.strictEqual(landscape.surfaces.find(row=>row.surfaceId==='group-analysis').presentation.region,'companion-bottom');
assert.strictEqual(landscape.surfaces.find(row=>row.surfaceId==='physics').presentation.region,'route');
delete global.window;

console.log('v3.67.2 Platform Presentation Phase 3 PASS: one semantic surface contract remains platform-neutral while Mobile maps it responsively to main/drawer/persistent companions/routes without replacing the primary scientific canvas.');
