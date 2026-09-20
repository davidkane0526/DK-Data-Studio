'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=4))),'Legacy Consumer Audit requires v3.67.4+.');}

const modelSource=read('src/core/ui/modules/presentation/model.js');
const presenterSource=read('src/core/ui/modules/presentation/presenters.js');
const workspaceSource=read('src/core/ui/modules/workbench/plugin.js');
const mobileEntry=read('src/mobile.css');
assert(modelSource.includes('presentationAudit()')&&presenterSource.includes('audit:()=>model.presentationAudit()'),'Core Presentation must expose an executable audit.');
assert(!workspaceSource.includes('primary-left-composition')&&!workspaceSource.includes('presentationLegacy'),'Plugin API 1.19 must not retain PRIMARY-left legacy composition metadata.');
assert(!fs.existsSync(path.join(root,'src/styles/platform/native-legacy-workspace.css'))&&!mobileEntry.includes('native-legacy-workspace.css'),'Plugin API 1.19 cutover must remove the external PRIMARY-left mobile fallback.');

const firstParty=[
  'src/plugins/data-center/feature-runtime.js',
  'src/plugins/pulse-analysis/feature-runtime.js',
  'src/plugins/pulse-sampler-tool/plugin.js',
  'src/plugins/resonance-workbench/view-components.js',
  'src/plugins/ter-analysis/unit-presentation.js',
  'src/plugins/transfer-vth-lab/plugin.js'
];
for(const rel of firstParty)assert(!/left(?:Node|Html)\s*:/.test(read(rel)),`First-party TOP must not hide a semantic rail in PRIMARY left composition: ${rel}`);
const terContract=read('src/plugins/ter-analysis/feature-runtime.js');
const vth=read('src/plugins/transfer-vth-lab/plugin.js');
for(const [name,source] of [['TER',terContract],['Vth',vth]]){
  assert(source.includes("id:'data-control'")&&source.includes("presentationRole:'data-control'"),`${name} must expose the former left rail as data-control.`);
}

// Runtime audit: explicit surfaces are complete; undeclared roles are invalid/incomplete in Plugin API 1.19.
global.window={
  DKDSPlugins:{
    activities:{list:()=>[
      {id:'complete',pluginId:'builtin.complete',label:'Complete'},
      {id:'invalid-role',pluginId:'external.invalid-role',label:'Invalid Role'}
    ],active:()=> 'complete'},
    workspace:{top:()=>[
      {pluginId:'builtin.complete',activity:'complete',layout:{primary:{id:'main',presentationRole:'scientific-primary'},prime:[{id:'controls',presentationRole:'data-control'}],sub:[]}},
      {pluginId:'external.invalid-role',activity:'invalid-role',layout:{primary:{id:'main',role:'analysis-primary'},prime:[],sub:[]}}
    ]},statusBar:{list:()=>[]}
  },
  DKDSUI:{
    workspaces:{actions:id=>id==='complete'?[
      {id:'workspace-primary:main',surfaceId:'main',kind:'primary',active:true},
      {id:'workspace-prime:controls',surfaceId:'controls',kind:'prime',active:true}
    ]:[{id:'workspace-primary:main',surfaceId:'main',kind:'primary',active:true}]},
    actions:{list:()=>[]}
  },
  DKDSTheme:{current:()=> 'light'},addEventListener:()=>{}
};
delete require.cache[require.resolve('../src/core/ui/modules/presentation/model')];
delete require.cache[require.resolve('../src/core/ui/modules/presentation/presenters')];
const presentation=require('../src/core/ui/modules/presentation/presenters');
const audit=presentation.audit();
assert.strictEqual(audit.total,2);
assert.strictEqual(audit.complete,1);
assert.strictEqual(audit.incomplete,1);
assert.strictEqual(audit.invalid.length,1);
assert.strictEqual(audit.invalid[0].activityId,'invalid-role');
assert(audit.invalid[0].issues.includes('undeclared-role:primary:main'));
const mobile=presentation.present('mobile',{orientation:'portrait'});
assert.strictEqual(mobile.workspaces.find(row=>row.activityId==='complete').presentationComplete,true);
assert.strictEqual(mobile.workspaces.find(row=>row.activityId==='invalid-role').presentationComplete,false);
delete global.window;

console.log('v3.67.4 Legacy Consumer Audit PASS under Plugin API 1.19: first-party legacy consumers remain zero and malformed presentation contracts are invalid instead of receiving a mobile fallback.');
