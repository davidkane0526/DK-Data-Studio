const fs=require('fs');
const path=require('path');
function read(rel){return fs.readFileSync(path.join(__dirname,'..',rel),'utf8');}
function assert(cond,msg){if(!cond)throw new Error(msg);}
const pkg=JSON.parse(read('package.json'));
assert(pkg.version==='3.61.87','current-version assertion is synchronized by set-version');
const src=read('src/plugins/data-center/feature-runtime.js');
const views=read('src/plugins/data-center/shared-views.js');
assert(views.includes('dc-assignment-filter dkds-field-control'),'Data Center assignment filter must consume the Core field-control primitive.');
assert(!/\.dc-assignment-filter\{[^}]*(?:border|background|color|box-shadow|border-radius)\s*:/.test(src),'Data Center assignment filter must not own visual paint.');
assert(views.includes('id="dcLineageFilter" class="dkds-field-control"')&&views.includes('dc-field-filter dkds-field-control'),'Data Center filter controls must share the Core field-control primitive.');
assert(!/\.dc-assignment-filter:hover\{/.test(src),'Data Center assignment filter hover feedback must be owned by Core, not plugin CSS.');
console.log('v3.61.58 Data Center theme closure passed: filters consume the shared Core field-control primitive without private paint.');
