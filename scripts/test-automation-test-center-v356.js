const fs=require('fs');
const assert=require('assert');
const runtime=fs.readFileSync('src/core/automation-test-runtime.js','utf8');
const m=runtime.match(/const VERSION='(\d+)\.(\d+)\.(\d+)'/);assert(m,'Automation runner version missing.');
const v=m.slice(1).map(Number);assert(v[0]>1||(v[0]===1&&v[1]>=11),'Automation runner must be v1.11.0+ for shared Scientific Scalar Field coverage.');
for(const token of ["'scalar-field.shared'",'Scientific Scalar Field & resonance feature field','scientificScalarField:clone'])assert(runtime.includes(token),`Automation Scalar Field coverage missing: ${token}`);
assert(runtime.includes("types.isA('resonance.feature-field','science.scalar-field')"),'Automation must validate the resonance feature-field type hierarchy.');
assert(runtime.includes("pipeline.get('builtin.resonance-workbench','gate-analysis')"),'Automation must inspect the real Resonance gate Pipeline contract.');
console.log('v3.56 Automation Test Center Scalar Field coverage checks passed.');
