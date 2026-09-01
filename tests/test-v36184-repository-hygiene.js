'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const walk=(dir,out=[])=>{for(const name of fs.readdirSync(dir)){if(['.git','node_modules','dist'].includes(name))continue;const full=path.join(dir,name),st=fs.statSync(full);if(st.isDirectory())walk(full,out);else out.push(full);}return out;};


assert.equal(pkg.main,'desktop/main.js');
const scriptFiles=fs.readdirSync(path.join(root,'scripts')).filter(n=>n.endsWith('.js'));
assert.equal(scriptFiles.length<=13,true,'scripts/ must contain build/maintenance tools only.');
assert(scriptFiles.includes('prepare-dev-start.js'),'fast dev-start preparation belongs in the build/maintenance layer.');
assert(!fs.existsSync(path.join(root,'scripts/generate-build-info.js')),'build-info generation must stay inside prepare-build, not another one-use script.');
assert(fs.existsSync(path.join(root,'docs/CODE_QUALITY_AUDIT.md')),'code-quality audit is required at the cleanup checkpoint.');
assert(!fs.readdirSync(path.join(root,'docs')).some(n=>/^VERIFICATION_V|^verification-v/i.test(n)),'per-version verification notes must not accumulate in active docs.');


const sourceStyleFiles=walk(path.join(root,'src/styles')).filter(file=>file.endsWith('.css'));
const importantTotal=sourceStyleFiles.reduce((sum,file)=>sum+(fs.readFileSync(file,'utf8').match(/!important/g)||[]).length,0);
assert.equal(importantTotal,0,'authored Core CSS must not use !important; cascade ownership is the only override mechanism.');
assert(!fs.existsSync(path.join(root,'src/styles/base'))&&!fs.existsSync(path.join(root,'src/styles/modern')),'legacy base/modern specificity directories must not return.');
for(const file of walk(path.join(root,'src'))){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  assert(!/v\d+(?:\.\d+)+|material-contract-\d+|renderer-\d+/i.test(path.basename(rel)),`${rel} uses a release/version-era source filename.`);
}
const generated=[
  'src/generated/runtime/app.js','src/generated/runtime/ui-infrastructure.js','src/generated/runtime/plugin-kernel.js',
  'src/generated/plugin-index.js','src/generated/sdk-authoring-reference.js','assets/dkds-icon.png','mobile/assets/icon.png','mobile/assets/adaptive-icon.png'
];
const ignore=read('.gitignore');
for(const rel of generated)assert(ignore.includes(rel),`${rel} must be declared generated in .gitignore.`);

const ownedSources=[...walk(path.join(root,'src/core/theme')), ...walk(path.join(root,'src/styles/theme'))];
for(const file of ownedSources){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  const text=fs.readFileSync(file,'utf8');
  assert(!/v3\.61\.\d+|hotfix/i.test(text),`${rel} contains release-era patch commentary; edit the owning semantic block instead.`);
  if(rel.startsWith('src/core/theme/')||/9[028]-|96-integrated-command|98-theme-material/.test(path.basename(rel))){
    assert(!/\.(?:respar|reswin|ter-|pulse-|dc-)|#(?:respar|ter|pulse)/i.test(text),`${rel} leaks a domain plugin selector into Theme/Material Core.`);
  }
}

if(fs.existsSync(path.join(root,'.git'))){
  const tracked=cp.execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
  for(const rel of generated)assert(!tracked.includes(rel),`${rel} is generated and must not be tracked by Git.`);
}

const cleanPackager=read('tools/windows/package-clean-project.ps1');
for(const token of ["'src\\generated'","'mobile\\assets\\web'","'assets\\dkds-icon.png'","'mobile\\assets\\icon.png'","'mobile\\assets\\adaptive-icon.png'"]){
  assert(cleanPackager.includes(token),`Clean project packager must exclude deterministic generated artifact: ${token}`);
}
const mobileSync=read('mobile/scripts/sync-web-assets.js');
assert(mobileSync.includes("generate-runtime-compositions.js"),'Mobile sync must regenerate Core runtime compositions before packaging a clean checkout.');

const parityTest = read('tests/verify-science-parity.js');
assert(!parityTest.includes("git show"), 'Scientific parity must not depend on git show or a moving branch');
assert(!parityTest.includes('DKDS_PARITY_BASELINE_REF'), 'Scientific parity baseline must not be a branch/ref');
assert(fs.existsSync(path.join(root, 'tests', 'fixtures', 'science-baseline-v36158', 'src', 'analysis.js')), 'Fixed scientific parity fixture is required');

console.log('v3.61.84 repository hygiene PASS: ownership, generated-artifact, docs and patch-era source policies are enforced.');
