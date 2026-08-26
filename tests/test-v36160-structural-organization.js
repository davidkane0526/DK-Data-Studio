'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const list=(rel,suffix='')=>fs.readdirSync(path.join(root,rel)).filter(name=>!suffix||name.endsWith(suffix)).sort();
const concat=(rel,suffix)=>list(rel,suffix).map(name=>read(path.posix.join(rel,name))).join('');
const pkg=json('package.json');

assert.equal(pkg.version,'3.61.85','Structural organization release must be v3.61.85.');
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

assert.equal(concat('src/core/ui-infrastructure','.inc'),read('src/core/ui-infrastructure.js'),'UI infrastructure runtime bundle must exactly match its composition modules.');
assert.equal(concat('src/core/plugin-kernel','.inc'),read('src/core/plugin-kernel.js'),'Plugin kernel runtime bundle must exactly match its composition modules.');
assert.equal(concat('src/app','.inc'),read('src/app.js'),'App runtime bundle must exactly match its composition modules.');
assert.equal(concat('src/styles/base','.css'),read('src/style.css'),'Base CSS runtime bundle must exactly match its authored modules.');
assert.equal(concat('src/styles/modern','.css'),read('src/ui-modern.css'),'Modern CSS runtime bundle must exactly match its authored modules.');

assert(fs.existsSync(path.join(root,'src/generated/sdk-authoring-reference.js')),'SDK authoring reference must live under src/generated/.');
assert(fs.existsSync(path.join(root,'src/generated/plugin-index.js')),'Plugin index must live under src/generated/.');
assert(!fs.existsSync(path.join(root,'src/core/sdk-authoring-reference.generated.js')),'old generated SDK path must not remain.');
assert(!fs.existsSync(path.join(root,'src/plugins/plugin-index.generated.js')),'old generated plugin-index path must not remain.');
const html=read('src/index.html');
assert(html.includes('generated/sdk-authoring-reference.js')&&html.includes('generated/plugin-index.js'),'renderer must load generated artifacts from src/generated/.');

for(const buildScript of ['scripts/generate-core-runtime-bundles.js','scripts/generate-core-styles.js'])assert(fs.existsSync(path.join(root,buildScript)),`${buildScript} missing.`);
console.log('v3.61.60 structural organization PASS: root/desktop, tests runner, Core/app composition, CSS modules and generated artifacts are canonicalized.');
