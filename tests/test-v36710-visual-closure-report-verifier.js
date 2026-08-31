'use strict';
const assert=require('assert');
const {verifyVisualClosureReport,versionAtLeast}=require('../tools/quality/verify-visual-closure-report');

const base=()=>({
  schema:1,kind:'dkds.automation-test-report',runnerVersion:'1.29.0',appVersion:'3.67.9',
  environment:{runtime:'desktop',platform:'win32'},desktopEnvironment:{runtime:'desktop',platform:'win32'},
  counts:{total:4,pass:3,fail:0,skip:1},
  results:[
    {id:'ui.hard-visual-invariants',status:'pass',data:{}},
    {id:'ui.visual-geometry-closure',status:'pass',data:{dockTransparent:true,topbarActions:6,shellGroups:3,workspaceGridChecked:true,scientificNavigation:{curve:true,chart:true,parityChecked:true}}},
    {id:'ui.theme-coverage',status:'pass',data:{summary:{partial:0,unmanaged:0,brokenMaterial:0,occludedMaterial:0,authoredUnused:0,rendererOk:true,appearanceOk:true},contrastModes:[{mode:'light',ok:true,issues:[]},{mode:'dark',ok:true,issues:[]}]}},
    {id:'runtime.package-mode',status:'skip',detail:'source mode'}
  ]
});

assert(versionAtLeast('1.29.0'));
assert(versionAtLeast('1.30.0'));
assert(!versionAtLeast('1.28.9'));
assert.strictEqual(verifyVisualClosureReport(base()).ok,true,'valid Windows Electron closure report must pass');

for(const mutate of [
  r=>{r.runnerVersion='1.28.0';},
  r=>{r.environment.platform='linux';r.desktopEnvironment.platform='linux';},
  r=>{r.results.find(x=>x.id==='ui.visual-geometry-closure').status='fail';},
  r=>{r.results.find(x=>x.id==='ui.theme-coverage').data.summary.occludedMaterial=1;},
  r=>{r.results.find(x=>x.id==='ui.theme-coverage').data.summary.rendererOk=false;},
  r=>{r.results.find(x=>x.id==='ui.theme-coverage').data.contrastModes[1].issues=['low contrast'];r.results.find(x=>x.id==='ui.theme-coverage').data.contrastModes[1].ok=false;},
]){
  const report=base();mutate(report);assert.strictEqual(verifyVisualClosureReport(report).ok,false,'invalid closure report must fail closed');
}

console.log('v3.67.10 Visual Closure report verifier PASS: Windows/Electron report release gate fails closed on runner, geometry, material, and contrast regressions.');
