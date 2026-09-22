'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

assert(/^\^43\.4\./.test(String(pkg.devDependencies?.electron||'')),'Electron must use the stable 43.4.x line.');
assert(!pkg.devDependencies?.['electron-builder'],'electron-builder must not inflate ordinary desktop dependency installs; packaging owns it on demand.');
const builderRunner=fs.readFileSync(path.join(root,'scripts','prepare-build.js'),'utf8');
assert(/ELECTRON_BUILDER_VERSION\s*=\s*'26\.15\.7'/.test(builderRunner),'Windows packaging must pin the current electron-builder 26.15.7 tool contract.');
assert(/spawnSync\(command,args,\{cwd:root,env:process\.env,stdio:'inherit',shell:process\.platform==='win32'\}\)/.test(builderRunner),'Windows on-demand packaging must launch npx.cmd through the system shell; direct shell:false execution of .cmd fails with EINVAL on Node 22.');
assert(String(pkg.scripts?.dist||'').includes('node scripts/prepare-build.js --windows-package'),'dist must invoke the on-demand electron-builder path through the existing build-preparation owner.');
const overrides=JSON.stringify(pkg.overrides||{});
for(const name of ['glob','rimraf','inflight']) assert(!overrides.includes(`"${name}"`),`Do not force incompatible ${name} transitive overrides solely to hide upstream warnings.`);
assert(String(pkg.scripts?.['deps:trace']||'').includes('npm ls inflight lodash.isequal rimraf glob boolean --all'),'A dependency ancestry trace command must be available.');
assert(String(pkg.engines?.node||'').includes('22.12.0'),'Node engine floor must cover the current Electron/tooling line.');
console.log('v3.61.18 dependency hygiene policy checks passed.');
