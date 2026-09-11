'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const script=String(pkg.scripts?.['mobile:test']||'');
const buildIndex=script.indexOf('npm run runtime:build');
const runnerIndex=script.indexOf('node tests/run.js mobile');
assert(buildIndex>=0,'mobile:test must regenerate ignored Core runtime compositions on a clean checkout.');
assert(runnerIndex>buildIndex,'mobile:test must build runtime compositions before the mobile suite reads generated runtime files.');
for(const rel of [
  'src/core/ui/composition/composition.json',
  'src/core/plugins/kernel/composition.json',
  'src/app/composition.json'
])assert(fs.existsSync(path.join(root,rel)),`runtime composition source missing: ${rel}`);
console.log('v3.67.24 clean mobile-test bootstrap PASS: clean source builds ignored runtime compositions before mobile architecture validation.');
