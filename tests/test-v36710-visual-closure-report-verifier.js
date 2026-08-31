'use strict';
const assert=require('assert');
const {verifyVisualClosureReport,versionAtLeast}=require('../tools/quality/verify-visual-closure-report');
const base=()=>({
  schema:1,kind:'dkds.automation-test-report',runnerVersion:'1.33.0',appVersion:'3.67.10',
  environment:{runtime:'desktop',platform:'win32'},desktopEnvironment:{runtime:'desktop',platform:'win32'},
  counts:{total:4,pass:3,fail:0,skip:1},
  results:[
    {id:'ui.hard-visual-invariants',status:'pass',data:{}},
    {id:'ui.theme-runtime-performance',status:'pass',data:{delta:{materialFlushes:0,materialAssignCalls:0,appearanceFlushes:0,appearanceAssignCalls:0,semanticFlushes:0,semanticAssignCalls:0}}},
    {id:'ui.visual-geometry-closure',status:'pass',data:{dockTransparent:true,topbarActions:6,shellGroups:3,presentationCommands:6,groupedContextChecked:4,standaloneContextChecked:2,materialRoleCompositionChecked:6,workspaceModalChecked:true,workspaceGridChecked:true,scientificNavigation:{curve:true,chart:true,parityChecked:true}}},
    {id:'ui.theme-coverage',status:'pass',data:{summary:{partial:0,unmanaged:0,brokenMaterial:0,occludedMaterial:0,authoredUnused:0,rendererOk:true,appearanceOk:true},contrastModes:[{mode:'light',ok:true,issues:[]},{mode:'dark',ok:true,issues:[]}]}},
    {id:'runtime.package-mode',status:'skip',detail:'source mode'}
  ]
});
assert(versionAtLeast('1.33.0'));assert(!versionAtLeast('1.32.9'));assert(!versionAtLeast('1.31.9'));
assert.strictEqual(verifyVisualClosureReport(base()).ok,true);
for(const mutate of [
  r=>{r.runnerVersion='1.32.9';},r=>{r.appVersion='3.67.9';},r=>{r.environment.platform='linux';r.desktopEnvironment.platform='linux';},
  r=>{r.results.find(x=>x.id==='ui.visual-geometry-closure').status='fail';},
  r=>{r.results.find(x=>x.id==='ui.visual-geometry-closure').data.groupedContextChecked=0;},
  r=>{r.results.find(x=>x.id==='ui.visual-geometry-closure').data.standaloneContextChecked=0;},
  r=>{r.results.find(x=>x.id==='ui.visual-geometry-closure').data.materialRoleCompositionChecked=0;},
  r=>{r.results.find(x=>x.id==='ui.visual-geometry-closure').data.workspaceModalChecked=false;},
  r=>{r.results.find(x=>x.id==='ui.visual-geometry-closure').data.presentationCommands=0;},
  r=>{r.results.find(x=>x.id==='ui.theme-runtime-performance').data.delta.materialFlushes=9;},
  r=>{r.results.find(x=>x.id==='ui.theme-runtime-performance').data.delta.appearanceFlushes=9;},
  r=>{r.results.find(x=>x.id==='ui.theme-runtime-performance').data.delta.semanticFlushes=9;},
  r=>{r.results.find(x=>x.id==='ui.theme-runtime-performance').data.delta.semanticAssignCalls=9;},
  r=>{r.results.find(x=>x.id==='ui.theme-coverage').data.summary.occludedMaterial=1;},
  r=>{r.results.find(x=>x.id==='ui.theme-coverage').data.summary.rendererOk=false;},
  r=>{const t=r.results.find(x=>x.id==='ui.theme-coverage').data;t.contrastModes[1].issues=['low contrast'];t.contrastModes[1].ok=false;}
]){const report=base();mutate(report);assert.strictEqual(verifyVisualClosureReport(report).ok,false);}
console.log('v3.67.10 R6 report verifier PASS: Runner 1.33 fails closed on contextual composition, geometry, material and contrast regressions.');
