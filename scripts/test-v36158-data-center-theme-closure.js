const fs=require('fs');
const path=require('path');
function read(rel){return fs.readFileSync(path.join(__dirname,'..',rel),'utf8');}
function assert(cond,msg){if(!cond)throw new Error(msg);}
const pkg=JSON.parse(read('package.json'));
assert(pkg.version==='3.61.58','current-version assertion is synchronized by set-version');
const src=read('src/plugins/data-center/feature-runtime.js');
assert(/\.dc-assignment-filter\{[^}]*border:0;[^}]*background:var\(--surface-secondary\)/.test(src),'Data Center assignment filter must use flat semantic filter styling.');
assert(!/\.dc-assignment-filter\{[^}]*border:1px\s+solid\s+var\(--border-subtle\)/.test(src),'Data Center assignment filter must not restore the legacy outlined style.');
assert(/\.dc-breadcrumb select,\.dc-field-filter\{[^}]*border:0;[^}]*background:var\(--surface-secondary\)/.test(src),'Data Center filter controls must share the semantic flat style.');
assert(/\.dc-assignment-filter:hover\{background:var\(--surface-hover\)\}/.test(src),'Data Center assignment filter must have semantic hover feedback.');
console.log('v3.61.58 Data Center theme closure passed: the remaining filter control uses the shared semantic flat surface style.');
