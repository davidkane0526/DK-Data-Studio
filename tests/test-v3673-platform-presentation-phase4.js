'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const entry=read('src/mobile.css');
const shellCss=read('src/styles/platform/native-client-shell.css');
const semanticCss=read('src/styles/platform/native-workspace-presentation.css');
const touch=read('src/styles/platform/touch.css');
const projector=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const modelSource=read('src/core/ui/modules/presentation/model.js');
const workbench=read('src/core/ui/modules/workbench/analysis.js');
const mobileHost=read('src/core/host/mobile-host-runtime.js');
const resonance=read('src/plugins/resonance-workbench/workbench-shared.js');

{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=3))),'Platform Presentation Architecture Phase 4 requires v3.67.3+.');}
assert(entry.includes('native-client-shell.css')&&entry.includes('native-workspace-presentation.css')&&!entry.includes('native-legacy-workspace.css'),'mobile.css must remain an ownership entrypoint with no retired legacy bridge.');
assert(!fs.existsSync(path.join(root,'src/styles/platform/native-legacy-workspace.css')),'Plugin API 1.19 cutover must remove the retired native legacy workspace stylesheet.');
for(const selector of ['.analysis-page','.dkds-analysis-left','.dkds-plugin-canvas-left','.plugin-manager-card'])assert(!entry.includes(selector),`mobile.css entrypoint must not retain page selector ${selector}.`);
assert(!touch.includes('.react-native-client'),'shared touch.css must not also own React Native page geometry.');

for(const token of ['data-dkds-mobile-presentation="semantic"','data-dkds-mobile-region="sheet"','data-dkds-mobile-region="rail"','data-dkds-mobile-region="route"'])assert(semanticCss.includes(token),`Presenter-driven semantic mobile CSS missing ${token}.`);
for(const desktopGeometry of ['dock-left','dock-right','dock-bottom','data-placement="left"','data-placement="right"'])assert(!semanticCss.includes(desktopGeometry),`semantic Mobile surface CSS must not infer Desktop geometry from ${desktopGeometry}.`);
assert(!/resonance|ter-|pulse-|data-center/i.test(shellCss+semanticCss),'Core mobile platform CSS must remain domain blind.');
for(const [name,source] of [['semantic',semanticCss]]){
  const structuralBlocks=[...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([,selector])=>/data-dkds-mobile-region|dkds-analysis-left|dkds-plugin-canvas-(?:left|right|bottom)/.test(selector));
  for(const [,selector,decl] of structuralBlocks)assert(!/(?:^|;)\s*(?:background(?:-color)?|border|box-shadow)\s*:/i.test(decl),`${name} mobile geometry must not repaint Core Material Role surface: ${selector.trim()}`);
}

for(const token of ['dkdsWorkspaceActivity','dkdsWorkspaceSurfaceId','dkdsWorkspaceSurfaceKind','markSurfaceNode'])assert(workbench.includes(token),`PluginWorkspace DOM must expose stable semantic surface identity: ${token}.`);
assert(projector.includes('workspace?.presentationComplete===true')&&projector.includes('surface.presentation?.region')&&projector.includes('data-dkds-workspace-surface-id'), 'Mobile Web Surface Presenter must consume Presentation Model completeness and Presenter region output.');
for(const forbidden of ['getComputedStyle','dataset.placement','.dock-left','.dock-right','.dock-bottom','.analysis-page','.dkds-plugin-canvas-left'])assert(!projector.includes(forbidden),`Mobile Web Surface Presenter must not reverse-infer Desktop state from ${forbidden}.`);
assert(modelSource.includes('presentationDeclared')&&modelSource.includes('presentationComplete'),'Core Presentation Model must explicitly distinguish complete semantic contracts from inferred compatibility roles.');
assert(mobileHost.includes('DKDSMobileWebPresentation?.apply?.(state)'),'Mobile Host must apply the Mobile Presenter projection before publishing native state.');
assert(resonance.includes("presentationRole:'scientific-primary'")&&resonance.includes("presentationRole:'data-control'")&&resonance.includes("presentationRole:'inspector'"),'Resonance reference workspace must qualify for semantic mobile projection.');

// Runtime model gate: complete explicit contracts are semantic; undeclared roles are invalid/incomplete after the 1.19 cutover.
global.window={
  DKDSPlugins:{
    activities:{list:()=>[{id:'complete',pluginId:'p.complete',label:'Complete',primary:true},{id:'invalid',pluginId:'p.invalid',label:'Invalid'}],active:()=> 'complete'},
    workspace:{top:()=>[
      {pluginId:'p.complete',activity:'complete',layout:{primary:{id:'main',presentationRole:'scientific-primary'},prime:[{id:'inspector',presentationRole:'inspector'}],sub:[]}},
      {pluginId:'p.invalid',activity:'invalid',layout:{primary:{id:'main',role:'analysis-primary'},prime:[],sub:[]}}
    ]},statusBar:{list:()=>[]}
  },
  DKDSUI:{workspaces:{actions:id=>id==='complete'?[{id:'workspace-primary:main',surfaceId:'main',kind:'primary',semanticKind:'panel',active:true},{id:'workspace-prime:inspector',surfaceId:'inspector',kind:'prime',semanticKind:'inspector',active:false}]:[{id:'workspace-primary:main',surfaceId:'main',kind:'primary',active:true}]},actions:{list:()=>[]}},
  DKDSTheme:{current:()=> 'light'},addEventListener:()=>{}
};
const presentation=require('../src/core/ui/modules/presentation/presenters');
let snap=presentation.present('mobile',{orientation:'portrait'});
assert.strictEqual(snap.workspaces.find(row=>row.activityId==='complete').presentationComplete,true,'explicit semantic workspace must be presenter-complete');
assert.strictEqual(snap.workspaces.find(row=>row.activityId==='invalid').presentationComplete,false,'undeclared role must not silently opt into semantic mobile geometry');
delete global.window;

console.log('v3.67.3 Platform Presentation Phase 4 PASS under Plugin API 1.19: semantic workspaces remain Presenter-driven and the retired Desktop-geometry fallback is absent.');
