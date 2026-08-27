'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const bytes=rel=>fs.statSync(path.join(root,rel)).size;
const walk=(dir,out=[])=>{for(const name of fs.readdirSync(dir)){const full=path.join(dir,name),st=fs.statSync(full);if(st.isDirectory())walk(full,out);else out.push(full);}return out;};

const sdk=json('sdk/contract.json');
const sdkReadme=read('sdk/README.md');
assert(sdkReadme.startsWith(`# DK Data Studio Plugin SDK ${sdk.sdkVersion}\n`),'SDK README title must match sdk/contract.json sdkVersion.');
assert(read('README_CN.md').includes(`SDK：**${sdk.sdkVersion}**`),'Main README SDK marker must match sdk/contract.json.');

const setVersion=read('scripts/set-version.js');
assert(!setVersion.includes('readdirSync(testsDir)')&&!setVersion.includes("path.join(root, 'tests')"),'set-version.js must not rewrite historical regression tests on every patch release.');
assert(fs.existsSync(path.join(root,'tools','windows','package-source-release.ps1')),'Source Release packaging tool must exist.');

const moduleLimit=48*1024;
assert(bytes('desktop/main.js')<=moduleLimit,`desktop/main.js must remain a thin main-process composition entry (<=48 KiB), got ${bytes('desktop/main.js')} bytes.`);
const mainModules=walk(path.join(root,'desktop','main-modules')).filter(file=>file.endsWith('.js'));
assert(mainModules.length>=5,'Desktop main-process responsibilities must remain split into importable modules.');
for(const file of mainModules){
  const size=fs.statSync(file).size;
  assert(size<=moduleLimit,`${path.relative(root,file)} exceeds the 48 KiB main-process module boundary (${size} bytes).`);
}

assert(bytes('src/plugins/ter-analysis/feature-runtime.js')<=moduleLimit,'TER feature runtime must remain below the 48 KiB authored-module boundary.');
const ter=json('src/plugins/ter-analysis/plugin.json');
for(const rows of [ter.scripts||[],ter.window?.scripts||[]]){
  const util=rows.indexOf('feature-utils.js'),feature=rows.indexOf('feature-runtime.js');
  assert(util>=0&&feature>=0&&util<feature,'TER feature-utils.js must load before feature-runtime.js in both host paths.');
}

const large=[];
for(const base of ['src','desktop'])for(const file of walk(path.join(root,base)).filter(file=>file.endsWith('.js')&&!file.includes(`${path.sep}generated${path.sep}`))){
  const size=fs.statSync(file).size;
  if(size>moduleLimit)large.push([path.relative(root,file).replace(/\\/g,'/'),size]);
}
const allowed=new Map([
  ['src/plugins/resonance-workbench/feature-runtime.js',144*1024],
  ['src/core/diagnostics/automation-test-runtime.js',80*1024]
]);
for(const [rel,size] of large){
  assert(allowed.has(rel),`${rel} is a new >48 KiB authored JS module; split by responsibility instead of growing the large-module allowlist.`);
  assert(size<=allowed.get(rel),`${rel} exceeded its temporary audit ceiling (${size} > ${allowed.get(rel)} bytes).`);
}
for(const rel of allowed.keys())assert(large.some(([row])=>row===rel),`${rel} large-module exception disappeared; remove it from the v3.61.98 audit allowlist.`);

const audit=read('docs/CODE_QUALITY_AUDIT.md');
assert(audit.includes('Resonance feature context'),'Code-quality audit must document the remaining Resonance feature-context refactor rather than hiding the exception.');
assert(audit.includes('Dev Repo')&&audit.includes('Source Release'),'Repository audit must document the two handoff package forms.');

console.log(`v3.61.98 repository/module hygiene PASS: desktop entry=${bytes('desktop/main.js')} B, TER feature=${bytes('src/plugins/ter-analysis/feature-runtime.js')} B, large exceptions=${large.length}.`);
