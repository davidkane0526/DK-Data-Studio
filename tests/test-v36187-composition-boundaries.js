'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const {MAX_MODULE_BYTES,buildCompositionSource}=require('../scripts/generate-runtime-compositions.js');
const MAX_STRUCTURE_CSS_BYTES=36*1024;

assert.equal(json('package.json').version,'3.61.92');

for(const rel of ['src/core/ui/composition','src/core/plugins/kernel','src/app']){
  const dir=path.join(root,rel),manifest=json(`${rel}/composition.json`);
  const modules=Array.isArray(manifest.modules)?manifest.modules:[];
  const imports=Array.isArray(manifest.importableModules)?manifest.importableModules:[];
  assert(modules.length||manifest.entryModule,`${rel} must declare composition fragments or an importable entry module.`);
  assert.equal(new Set(modules).size,modules.length,`${rel} composition fragments must be unique.`);
  const discovered=fs.readdirSync(dir).filter(name=>name.endsWith('.inc')).sort();
  assert.deepEqual([...modules].sort(),discovered,`${rel} composition manifest must list every remaining .inc fragment exactly once.`);
  for(const name of modules){
    const bytes=fs.statSync(path.join(dir,name)).size;
    assert(bytes<=MAX_MODULE_BYTES,`${rel}/${name} exceeds the 48 KiB composition boundary (${bytes} bytes).`);
  }
  const ids=new Set(),paths=new Set();
  for(const row of imports){
    assert(row?.id&&row?.path,`${rel} importable module rows require id/path.`);
    assert(!ids.has(row.id),`${rel} duplicate importable module id: ${row.id}`);ids.add(row.id);
    assert(!paths.has(row.path),`${rel} duplicate importable module path: ${row.path}`);paths.add(row.path);
    const file=path.join(root,row.path);
    assert(fs.existsSync(file),`${rel} importable module missing: ${row.path}`);
    const bytes=fs.statSync(file).size;
    assert(bytes<=MAX_MODULE_BYTES,`${row.path} exceeds the 48 KiB importable-module boundary (${bytes} bytes).`);
  }
  if(manifest.entryModule)assert(ids.has(manifest.entryModule),`${rel} entryModule must be declared in importableModules.`);
  const generated=path.join(root,manifest.output);
  assert(fs.existsSync(generated),`${manifest.output} must exist before composition verification.`);
  assert.equal(read(manifest.output),buildCompositionSource(rel).source,`${manifest.output} must be exactly reproducible from its declared graph.`);
}

const ui=json('src/core/ui/composition/composition.json');
const kernel=json('src/core/plugins/kernel/composition.json');
assert.equal(ui.modules.length,0,'UI Infrastructure must not fall back to authored .inc implementation fragments.');
assert.equal(kernel.modules.length,0,'Plugin Kernel must not fall back to authored .inc implementation fragments.');
assert(ui.importableModules.length>=20,'UI Infrastructure must remain decomposed into importable responsibility modules.');
assert(kernel.importableModules.length>=12,'Plugin Kernel must remain decomposed into importable responsibility modules.');
assert.equal(ui.entryModule,'ui/runtime');
assert.equal(kernel.entryModule,'kernel/runtime');

const cascade=read('src/core.css');
for(const rel of ['analysis-workbench.css','plugin-workspace.css','workbench-components.css']){
  assert(cascade.includes(`./styles/structure/${rel}`),`${rel} must stay in the canonical structure cascade.`);
  const bytes=fs.statSync(path.join(root,'src/styles/structure',rel)).size;
  assert(bytes<=MAX_STRUCTURE_CSS_BYTES,`${rel} exceeds the structural CSS ownership budget (${bytes} bytes).`);
}

console.log('v3.61.88 importable composition boundaries PASS: UI/Kernel .inc=0, explicit module graphs, <=48 KiB modules, reproducible runtimes.');
