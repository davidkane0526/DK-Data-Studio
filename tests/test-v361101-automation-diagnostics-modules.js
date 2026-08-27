'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const bytes=rel=>fs.statSync(path.join(root,rel)).size;
const limit=48*1024;
const index=read('src/index.html');
const cases=read('src/core/diagnostics/automation-smoke-cases.js');
const runtime=read('src/core/diagnostics/automation-test-runtime.js');
assert(bytes('src/core/diagnostics/automation-smoke-cases.js')<=limit,'Automation smoke cases must remain below 48 KiB.');
assert(bytes('src/core/diagnostics/automation-test-runtime.js')<=limit,'Automation runner/runtime must remain below 48 KiB.');
assert(index.indexOf('core/diagnostics/automation-smoke-cases.js')>=0,'Main shell must load Automation smoke cases.');
assert(index.indexOf('core/diagnostics/automation-smoke-cases.js')<index.indexOf('core/diagnostics/automation-test-runtime.js'),'Automation smoke cases must load before the runner runtime.');
assert(cases.includes('window.DKDSAutomationSmokeCases=Object.freeze'),'Smoke-case module must expose one immutable diagnostics case contract.');
assert(runtime.includes('const smokeCases=window.DKDSAutomationSmokeCases'),'Runner must consume the smoke-case module rather than duplicate its implementations.');
for(const name of ['rendererPlotSmoke','scientificPlotInteractionSmoke','tableSurfaceSmoke','performanceResourceLifecycleSmoke','scientificAlgorithmPackageCatalogSmoke','scientificReactiveSmoke']){
  assert(cases.includes(`function ${name}(`),`Smoke-case owner missing ${name}.`);
  assert(!runtime.includes(`function ${name}(`),`Runner must not re-own ${name}.`);
}
console.log(`v3.61.101 automation diagnostics modularization PASS: cases=${bytes('src/core/diagnostics/automation-smoke-cases.js')} B, runner=${bytes('src/core/diagnostics/automation-test-runtime.js')} B.`);
