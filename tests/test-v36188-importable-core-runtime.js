'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const walk=(dir,out=[])=>{for(const name of fs.readdirSync(dir)){const full=path.join(dir,name),st=fs.statSync(full);if(st.isDirectory())walk(full,out);else out.push(full);}return out;};
const {MAX_MODULE_BYTES,buildCompositionSource}=require('../scripts/generate-runtime-compositions.js');

assert.equal(json('package.json').version,'3.61.91');

const uiManifest=json('src/core/ui/composition/composition.json');
const kernelManifest=json('src/core/plugins/kernel/composition.json');
assert.deepEqual(uiManifest.modules,[],'UI authored runtime must contain no .inc composition fragments.');
assert.deepEqual(kernelManifest.modules,[],'Plugin Kernel authored runtime must contain no .inc composition fragments.');
assert.equal(uiManifest.entryModule,'ui/runtime');
assert.equal(kernelManifest.entryModule,'kernel/runtime');
assert(uiManifest.importableModules.length>=20,'UI module graph unexpectedly collapsed.');
assert(kernelManifest.importableModules.length>=12,'Kernel module graph unexpectedly collapsed.');

for(const rel of ['src/core/ui/composition','src/core/plugins/kernel']){
  assert.equal(fs.readdirSync(path.join(root,rel)).filter(name=>name.endsWith('.inc')).length,0,`${rel} must remain free of authored .inc implementation fragments.`);
}
for(const manifest of [uiManifest,kernelManifest]){
  for(const row of manifest.importableModules){
    const file=path.join(root,row.path),source=fs.readFileSync(file,'utf8');
    assert(fs.statSync(file).size<=MAX_MODULE_BYTES,`${row.path} exceeds the importable module budget.`);
    assert(source.includes('module.exports'),`${row.path} must expose a CommonJS module contract.`);
  }
}

const uiRuntime=read('src/core/ui/modules/runtime.js');
assert(uiRuntime.includes("require('./scientific-curve/surface')")&&uiRuntime.includes("require('./host/api')"),'UI runtime entry must compose the scientific surface and final host API explicitly.');
const sciSurface=read('src/core/ui/modules/scientific-curve/surface.js');
assert(sciSurface.includes("require('./model')")&&sciSurface.includes("require('./navigation')")&&sciSurface.includes("require('./render')"),'ScientificCurveSurface must be composed from independent model/navigation/render modules.');
assert(read('src/core/ui/modules/selection/data-interaction.js').includes("require('./view-binding')"),'Selection view binding must be lazy-imported rather than relying on later lexical declarations.');

const kernelContext=read('src/core/plugins/kernel/modules/context.js');
for(const token of ['host:null','activeActivityId:null','superPluginId:null','loadingPromise:null','externalLoadingPromise:null','layoutResizeDispatching:false']){
  assert(kernelContext.includes(token),`Kernel context must explicitly own mutable state: ${token}`);
}
const kernelRuntime=read('src/core/plugins/kernel/modules/runtime.js');
for(const token of ["require('./bootstrap')","require('./workspace/top')","require('./plugin-api')","require('./lifecycle')","require('./package-runtime')"]){
  assert(kernelRuntime.includes(token),`Kernel runtime entry missing explicit dependency: ${token}`);
}
const packageRuntime=read('src/core/plugins/kernel/modules/package-runtime.js');
assert(packageRuntime.includes('state.host = nextHost || {}'),'Kernel host ownership must update explicit context state.');
assert(!packageRuntime.includes('let host =')&&!packageRuntime.includes('let superPluginId ='),'Kernel package module must not recreate shared lexical state.');

for(const [rel,manifest] of [['src/core/ui/composition',uiManifest],['src/core/plugins/kernel',kernelManifest]]){
  assert.equal(read(manifest.output),buildCompositionSource(rel).source,`${manifest.output} must be reproducible from the importable module graph.`);
}


console.log('v3.61.88 importable Core runtime PASS: UI and Plugin Kernel use explicit CommonJS graphs with explicit mutable-state ownership.');
