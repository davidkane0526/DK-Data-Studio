const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const runtime=(fs.readFileSync(path.join(root,'src/diagnostics/automation-test-runtime.js'),'utf8')+fs.readFileSync(path.join(root,'src/diagnostics/automation-smoke-cases.js'),'utf8'));
const m=runtime.match(/const VERSION='(\d+)\.(\d+)\.(\d+)'/);assert(m,'Automation runner version missing.');
const v=m.slice(1).map(Number);assert(v[0]>1||(v[0]===1&&v[1]>=17),'Automation runner must be v1.17.0+ for multi-view render scheduling coverage.');
for(const token of ["performance.render-scheduling','Scientific multi-view render scheduling'",'interactionRenderSchedulingSmoke','renderPriority:\'frame\'','renderPriority:\'idle\'','completion.join'])assert(runtime.includes(token),`Automation render-scheduling coverage missing ${token}`);

assert(runtime.includes("parsed?.schemaVersion===3")&&runtime.includes('Project format did not canonicalize to schema v3.'),'Automation project round-trip must validate the current Schema v3 contract.');
assert(!runtime.includes('Project format did not canonicalize to schema v2.'),'Automation must not preserve the obsolete Schema v2 expectation.');
console.log('v3.61 Automation Test Center multi-view render scheduling coverage checks passed.');
