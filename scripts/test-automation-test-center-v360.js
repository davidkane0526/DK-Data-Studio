const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'src/core/automation-test-runtime.js'),'utf8');
const m=runtime.match(/const VERSION='(\d+)\.(\d+)\.(\d+)'/);assert(m,'Automation runner version missing.');
const v=m.slice(1).map(Number);assert(v[0]>1||(v[0]===1&&v[1]>=16),'Automation runner must be v1.16.0+ for Scientific Reactive coverage.');
for(const token of ["reactive.contract','Scientific Reactive Dependency'",'scientificReactiveSmoke','DKDSScientificReactive','scientificReactive:clone'])assert(runtime.includes(token),`Automation Reactive coverage missing ${token}`);
console.log('v3.60 Automation Test Center Scientific Reactive coverage checks passed.');
