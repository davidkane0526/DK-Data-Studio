'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const walk=(dir,out=[])=>{if(!fs.existsSync(dir))return out;for(const name of fs.readdirSync(dir)){const full=path.join(dir,name),st=fs.statSync(full);if(st.isDirectory())walk(full,out);else out.push(full);}return out;};

assert.equal(json('package.json').version,'3.61.90');

const coreRoot=path.join(root,'src','core');
const rootFiles=fs.readdirSync(coreRoot,{withFileTypes:true}).filter(row=>row.isFile()).map(row=>row.name);
assert.deepEqual(rootFiles,[],'Core root must contain no implementation files; use responsibility directories.');
for(const dir of ['data','project','scientific','plugins','ui','theme','services','host','performance','workflow','diagnostics','recipes']){
  assert(fs.existsSync(path.join(coreRoot,dir)),`Missing Core responsibility directory: ${dir}`);
}
for(const legacy of ['src/core/plugin-kernel.js','src/core/ui-infrastructure.js','scripts/generate-core-runtime-bundles.js','scripts/generate-core-styles.js']){
  assert(!fs.existsSync(path.join(root,legacy)),`Legacy monolithic Core artifact returned: ${legacy}`);
}

const cssFiles=[...walk(path.join(root,'src','styles')),path.join(root,'src','mobile.css'),path.join(root,'src','plugin-window','style.css'),...walk(path.join(root,'src','plugins')).filter(f=>f.endsWith('plugin.css'))].filter(f=>fs.existsSync(f)&&f.endsWith('.css'));
for(const file of cssFiles){
  const css=fs.readFileSync(file,'utf8');
  assert(!/!important\b/i.test(css),`${path.relative(root,file)} reintroduced !important.`);
}
assert(!fs.existsSync(path.join(root,'src','styles','base'))&&!fs.existsSync(path.join(root,'src','styles','modern')),'base/modern specificity split must not return.');
const cascade=read('src/core.css');
assert(cascade.includes('@layer dkds.foundation, dkds.plugin, dkds.structure, dkds.presentation, dkds.theme, dkds.platform, dkds.window;'),'Canonical cascade order is missing.');

const pluginIdentity=/(?:\.(?:ter|pulse|dc|respar|reswin)[-_]|#(?:ter|pulse|resonanceDedicatedPage|reswin|respar))/i;
for(const file of walk(path.join(root,'src','styles')).filter(f=>f.endsWith('.css'))){
  assert(!pluginIdentity.test(fs.readFileSync(file,'utf8')),`${path.relative(root,file)} leaks domain plugin identity into Core CSS.`);
}
assert(!pluginIdentity.test(read('src/mobile.css')),'mobile Core stylesheet must remain plugin-neutral.');

const runtimeGenerator=read('scripts/generate-runtime-compositions.js');
const uiComposition=json('src/core/ui/composition/composition.json');
const kernelComposition=json('src/core/plugins/kernel/composition.json');
assert.equal(uiComposition.output,'src/generated/runtime/ui-infrastructure.js','UI composition must emit only into generated runtime.');
assert.equal(kernelComposition.output,'src/generated/runtime/plugin-kernel.js','Plugin Kernel composition must emit only into generated runtime.');
assert(!runtimeGenerator.includes("src/core/ui-infrastructure.js")&&!runtimeGenerator.includes("src/core/plugin-kernel.js"),'Generator must never recreate monolithic files inside src/core/.');

if(fs.existsSync(path.join(root,'.git'))){
  const tracked=cp.execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
  for(const rel of ['src/generated/runtime/ui-infrastructure.js','src/generated/runtime/plugin-kernel.js','src/generated/runtime/app.js']){
    assert(!tracked.includes(rel),`${rel} is generated and must remain untracked.`);
  }
}
console.log(`v3.61.86 modular Core + cascade PASS: Core root files=0, authored CSS !important=0, domain-neutral ownership enforced.`);
