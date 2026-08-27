'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const {MAX_MODULE_BYTES,buildCompositionSource}=require('../scripts/generate-runtime-compositions.js');

assert.equal(json('package.json').version,'3.61.94');
const manifest=json('src/app/composition.json');
assert.deepEqual(manifest.modules,[],'Application shell must not retain ordered .inc implementation fragments.');
assert.equal(manifest.entryModule,'app/runtime','Application shell must have one explicit runtime entry.');
assert(manifest.importableModules.length>=12,'Application module graph unexpectedly collapsed.');
assert.equal(fs.readdirSync(path.join(root,'src/app')).filter(name=>name.endsWith('.inc')).length,0,'src/app must remain free of authored .inc implementation fragments.');

for(const row of manifest.importableModules){
  const file=path.join(root,row.path),source=fs.readFileSync(file,'utf8');
  assert(fs.statSync(file).size<=MAX_MODULE_BYTES,`${row.path} exceeds the importable module budget.`);
  assert(source.includes('module.exports'),`${row.path} must expose a CommonJS module contract.`);
}

const context=read('src/app/modules/context.js');
for(const token of ['datasets:[]','projectTabs:[]','importDraft:','lanWebStatusState:','lanWebSelectedBaseUrl:']){
  assert(context.includes(token),`Application context must explicitly own mutable state: ${token}`);
}
const runtime=read('src/app/modules/runtime.js');
for(const token of [
  "require('./foundation')",
  "require('./project-tabs-history')",
  "require('./import-workbench')",
  "require('./data-artifact-host')",
  "require('./workspace-super-shell')",
  "require('./scientific-panels-export')",
  "require('./project-persistence')",
  "require('./floating-docks')",
  "require('./dedicated-plugin-windows')",
  "require('./startup')"
])assert(runtime.includes(token),`Application runtime entry missing explicit dependency: ${token}`);

const generated=read(manifest.output);
assert.equal(generated,buildCompositionSource('src/app').source,'Generated app runtime must be reproducible from the Application module graph.');
const setVersion=read('scripts/set-version.js');
assert(setVersion.includes("path.join('src','app','modules','project-persistence.js')"),'set-version must update the importable project-persistence module.');
assert(setVersion.includes("path.join('src','app','modules','dedicated-plugin-windows.js')"),'set-version must update the importable dedicated-window module.');
assert(!/src['\"]?\s*,\s*['\"]app['\"]?[^\n]*\.inc/.test(setVersion),'release tooling must not depend on removed Application .inc files.');

console.log('v3.61.89 Application shell importable-module PASS: explicit state ownership, explicit module graph, reproducible runtime, no .inc release coupling.');
