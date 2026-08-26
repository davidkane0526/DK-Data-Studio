const fs=require('fs');
const assert=require('assert');
const runtime=fs.readFileSync('src/core/automation-test-runtime.js','utf8');
const m=runtime.match(/const VERSION='(\d+)\.(\d+)\.(\d+)'/);assert(m,'Automation runner version missing.');
const v=m.slice(1).map(Number);assert(v[0]>1||(v[0]===1&&v[1]>=14),'Automation runner must be v1.14.0+ for source-data lifecycle coverage.');
for(const token of ["'data.sources.lifecycle'",'Project source data lifecycle','dataSourceLifecycleSmoke',"get?.('core.data-sources')",'removeLegacyDatasets'])assert(runtime.includes(token),`Automation source lifecycle coverage missing: ${token}`);
console.log('v3.58.2 Automation Test Center source-data lifecycle coverage checks passed.');
