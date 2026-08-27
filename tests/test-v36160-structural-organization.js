'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const list=(rel,suffix='')=>fs.readdirSync(path.join(root,rel)).filter(name=>!suffix||name.endsWith(suffix)).sort();
const pkg=json('package.json');


assert.equal(pkg.main,'desktop/main.js','Electron entry must live under desktop/.');
assert((pkg.build?.files||[]).includes('desktop/**/*'),'Electron packaging must include the desktop host tree.');
for(const old of ['main.js','preload.js','plugin-package.js','plugin-window-manager.js','lan-web-server.js','lan-discovery-service.js','windows-network-discovery.js','update-client.js']){
  assert(!fs.existsSync(path.join(root,old)),`root host file must be removed: ${old}`);
}
for(const expected of ['main.js','preload.js','plugin-package.js','plugin-window-manager.js','plugin-override-policy.js','algorithm-package-catalog.js','semver-compat.js','lan-web-server.js','lan-discovery-service.js','windows-network-discovery.js','update-client.js']){
  assert(fs.existsSync(path.join(root,'desktop',expected)),`desktop host file missing: ${expected}`);
}

const scriptFiles=list('scripts','.js');
assert(scriptFiles.length<=12,`scripts/ should contain maintenance/build scripts only; found ${scriptFiles.length}`);
assert(list('tests','.js').length>=130,'regression tests must live under tests/.');
assert(pkg.scripts.test.includes('node tests/run.js test'),'npm test must use the centralized test runner.');
assert(pkg.scripts.check.includes('node tests/run.js check'),'npm check must use the centralized test runner.');
assert(pkg.scripts['mobile:test']==='node tests/run.js mobile','mobile tests must use the centralized runner.');

// Authored Core is organized by responsibility. The browser still receives two
// generated composition artifacts for legacy shared-closure subsystems, but the
// generated files are not authored Core and must never live in src/core/.
for(const legacy of ['src/core/plugin-kernel.js','src/core/ui-infrastructure.js','src/app.js']){
  assert(!fs.existsSync(path.join(root,legacy)),`legacy generated runtime must not live in authored source: ${legacy}`);
}
const coreRootFiles=fs.readdirSync(path.join(root,'src','core'),{withFileTypes:true}).filter(e=>e.isFile());
assert.equal(coreRootFiles.length,0,`src/core root must contain responsibility directories only; found ${coreRootFiles.map(e=>e.name).join(', ')}`);
for(const dir of ['data','diagnostics','host','performance','plugins','project','recipes','scientific','services','theme','ui','workflow']){
  assert(fs.existsSync(path.join(root,'src','core',dir)),`Core responsibility directory missing: ${dir}`);
}
const {buildCompositionSource}=require('../scripts/generate-runtime-compositions.js');
assert.equal(buildCompositionSource('src/core/ui/composition').source,read('src/generated/runtime/ui-infrastructure.js'),'Generated UI runtime must exactly match the declared module graph.');
assert.equal(buildCompositionSource('src/core/plugins/kernel').source,read('src/generated/runtime/plugin-kernel.js'),'Generated Plugin Kernel runtime must exactly match the declared module graph.');
assert.equal(buildCompositionSource('src/app').source,read('src/generated/runtime/app.js'),'Generated App runtime must exactly match the declared composition.');

const coreCss=read('src/core.css');
assert(coreCss.startsWith('@layer dkds.foundation, dkds.plugin, dkds.structure, dkds.presentation, dkds.theme, dkds.platform, dkds.window, dkds.utility;'),'Core CSS must declare one explicit cascade order.');
for(const layer of ['foundation','structure','presentation','theme','platform']){
  assert(coreCss.includes(`styles/${layer}/`),`Core CSS entry must import ${layer} modules.`);
}
assert(!fs.existsSync(path.join(root,'src/styles/base'))&&!fs.existsSync(path.join(root,'src/styles/modern')),'legacy base/modern specificity directories must stay removed.');

assert(fs.existsSync(path.join(root,'src/generated/sdk-authoring-reference.js')),'SDK authoring reference must live under src/generated/.');
assert(fs.existsSync(path.join(root,'src/generated/plugin-index.js')),'Plugin index must live under src/generated/.');
assert(!fs.existsSync(path.join(root,'src/core/sdk-authoring-reference.generated.js')),'old generated SDK path must not remain.');
assert(!fs.existsSync(path.join(root,'src/plugins/plugin-index.generated.js')),'old generated plugin-index path must not remain.');
const html=read('src/index.html');
assert(html.includes('generated/sdk-authoring-reference.js')&&html.includes('generated/plugin-index.js'),'renderer must load generated artifacts from src/generated/.');

assert(fs.existsSync(path.join(root,'scripts/generate-runtime-compositions.js')),'runtime composition generator missing.');
assert(fs.existsSync(path.join(root,'scripts/validate-styles.js')),'style architecture validator missing.');
assert(!fs.existsSync(path.join(root,'scripts/generate-core-styles.js')),'legacy CSS concatenation generator must stay removed.');
assert(!fs.existsSync(path.join(root,'scripts/generate-core-runtime-bundles.js')),'legacy root-Core bundle generator must stay removed.');
console.log('v3.61.88 structural organization PASS: host, importable Core modules, layered CSS and generated-artifact boundaries are canonicalized.');
