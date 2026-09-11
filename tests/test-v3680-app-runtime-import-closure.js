'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..');
const {buildCompositionSource,validateImportableRequireClosure}=require('../scripts/generate-runtime-compositions');

const composition=JSON.parse(fs.readFileSync(path.join(root,'src/app/composition.json'),'utf8'));
assert.ok(composition.importableModules.some(row=>row.id==='app/style-gate'&&row.path==='src/app/modules/style-gate.js'),'App runtime composition must declare app/style-gate because first-paint modules require it.');
assert.doesNotThrow(()=>validateImportableRequireClosure('src/app',composition.importableModules),'App importable runtime must be require-closed before generation.');

const broken=composition.importableModules.filter(row=>row.id!=='app/style-gate');
assert.throws(()=>validateImportableRequireClosure('src/app',broken),/app\/style-gate/,'Composition validator must reject the exact missing style-gate dependency that leaves only the static HTML shell.');

const built=buildCompositionSource('src/app');
assert.ok(built.source.includes('"app/style-gate":function(module,exports,require)'), 'Generated app runtime must contain an app/style-gate factory.');

// Runtime evidence: execute the generated module loader and import a real first-paint
// module that depends on ./style-gate. Before this fix this throws synchronously with
// "Unknown DKDS importable module: app/style-gate" before startup.js can install its
// error boundary, matching the user-visible static-shell symptom.
const loaderSource=built.source.replace(/DKDSAppRuntimeModules\.require\("app\/runtime"\);\s*$/,'globalThis.__DKDSAppRuntimeModules=DKDSAppRuntimeModules;');
const status={textContent:''};
const context={
  console,Map,Set,WeakMap,Object,String,Number,Array,Math,Date,JSON,Promise,
  document:{querySelector(selector){return selector==='#statusBarMessage'?status:null;}},
  d3:{select(){return {}}},
  localStorage:{getItem(){return null;},setItem(){}},
  DKDSData:{createStore(){return {list(){return[];}}}},
  DKDSStyleGate:{
    KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},
    set(){},remove(){},setToken(){}
  }
};
context.window=context;
vm.createContext(context);
assert.doesNotThrow(()=>vm.runInContext(loaderSource,context,{filename:'generated/runtime/app.js'}),'Generated app module loader must initialize.');
assert.ok(context.__DKDSAppRuntimeModules.ids.includes('app/style-gate'),'Runtime loader must expose app/style-gate among bundled factories.');
assert.doesNotThrow(()=>context.__DKDSAppRuntimeModules.require('app/foundation'),'A real first-paint App module must resolve ./style-gate at runtime.');

console.log('v3.68.0 app runtime import closure PASS');
