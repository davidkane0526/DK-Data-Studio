const fs=require('fs');const assert=require('assert');
const runtime=fs.readFileSync('src/core/automation-test-runtime.js','utf8');
const m=runtime.match(/const VERSION='(\d+)\.(\d+)\.(\d+)'/);assert(m,'Automation runner version missing.');const v=m.slice(1).map(Number);assert(v[0]>1||(v[0]===1&&v[1]>=10),'Automation runner must be v1.10.0+ for Algorithm Package Catalog coverage.');
assert(runtime.includes("'algorithms.package-catalog'")&&runtime.includes('Algorithm Package Catalog & compatibility'),'Built-app automation must validate Algorithm Package Catalog compatibility/indexing.');
assert(runtime.includes('pluginAlgorithmCatalog'),'Automation must invoke the desktop package catalog bridge.');
assert(runtime.includes('scientificAlgorithmPackageCatalog:'),'Automation report must persist Algorithm Package Catalog coverage.');
console.log('v3.55 Automation Test Center package-catalog coverage checks passed.');
