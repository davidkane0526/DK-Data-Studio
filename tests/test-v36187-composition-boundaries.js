'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const MAX_FRAGMENT_BYTES=48*1024;
const MAX_STRUCTURE_CSS_BYTES=36*1024;

assert.equal(json('package.json').version,'3.61.87');

for(const rel of ['src/core/ui/composition','src/core/plugins/kernel','src/app']){
  const dir=path.join(root,rel),manifest=json(`${rel}/composition.json`),modules=manifest.modules;
  assert(Array.isArray(modules)&&modules.length,`${rel} must declare ordered composition modules.`);
  assert.equal(new Set(modules).size,modules.length,`${rel} composition modules must be unique.`);
  const discovered=fs.readdirSync(dir).filter(name=>name.endsWith('.inc')).sort();
  assert.deepEqual([...modules].sort(),discovered,`${rel} composition manifest must list every fragment exactly once.`);
  for(const name of modules){
    const bytes=fs.statSync(path.join(dir,name)).size;
    assert(bytes<=MAX_FRAGMENT_BYTES,`${rel}/${name} exceeds the 48 KiB composition boundary (${bytes} bytes).`);
  }
  const generated=path.join(root,manifest.output);
  assert(fs.existsSync(generated),`${manifest.output} must be reproducible before composition verification.`);
  const source=modules.map(name=>fs.readFileSync(path.join(dir,name),'utf8')).join('');
  assert.equal(fs.readFileSync(generated,'utf8'),source,`${manifest.output} must be exactly the declared composition byte stream.`);
}

const ui=json('src/core/ui/composition/composition.json');
const kernel=json('src/core/plugins/kernel/composition.json');
assert(ui.modules.length>=23,'UI Infrastructure must remain split into responsibility-focused fragments.');
assert(kernel.modules.length>=13,'Plugin Kernel must remain split into responsibility-focused fragments.');
for(const legacy of [
  'src/core/ui/composition/00-foundation-interaction.inc',
  'src/core/ui/composition/20-portable-layout-views.inc',
  'src/core/ui/composition/40-scientific-curves.inc',
  'src/core/plugins/kernel/20-contributions-commands.inc',
  'src/core/plugins/kernel/50-lifecycle-packages-api.inc'
]) assert(!fs.existsSync(path.join(root,legacy)),`${legacy} must not return as a coarse composition bucket.`);

const cascade=read('src/core.css');
for(const rel of ['analysis-workbench.css','plugin-workspace.css','workbench-components.css']){
  assert(cascade.includes(`./styles/structure/${rel}`),`${rel} must stay in the canonical structure cascade.`);
  const bytes=fs.statSync(path.join(root,'src/styles/structure',rel)).size;
  assert(bytes<=MAX_STRUCTURE_CSS_BYTES,`${rel} exceeds the structural CSS ownership budget (${bytes} bytes).`);
}

console.log('v3.61.87 composition boundaries PASS: explicit manifests, <=48 KiB fragments, split workbench CSS and byte-exact generated runtimes.');
