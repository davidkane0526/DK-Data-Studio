const fs=require('fs');const assert=require('assert');
const runtime=fs.readFileSync('src/core/automation-test-runtime.js','utf8');
const m=runtime.match(/const VERSION='(\d+)\.(\d+)\.(\d+)'/);assert(m,'Automation runner version missing.');const v=m.slice(1).map(Number);assert(v[0]>1||(v[0]===1&&v[1]>=9),'Automation runner must be v1.9.0+ for algorithm version management.');
assert(runtime.includes("'algorithms.version-management'")&&runtime.includes('Algorithm default / lock / missing-version management'),'Built-app automation must validate algorithm default/lock/missing-version behavior.');
assert(runtime.includes('scientificAlgorithmVersionManagement:'),'Automation report must persist algorithm version-management coverage.');
console.log('v3.54 Automation Test Center version-management coverage checks passed.');
