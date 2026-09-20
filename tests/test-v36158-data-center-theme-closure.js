const fs=require('fs');
const path=require('path');
function read(rel){return fs.readFileSync(path.join(__dirname,'..',rel),'utf8');}
function assert(cond,msg){if(!cond)throw new Error(msg);}
const pkg=JSON.parse(read('package.json'));

const src=read('src/plugins/data-center/feature-runtime.js');
const views=read('src/plugins/data-center/unit-presentation.js');
const foundation=read('src/core/ui/modules/composition/unit-template-foundation.js');
assert(views.includes("id:'dcAssignmentFilter',kind:'select',className:'dc-assignment-filter'")&&foundation.includes("control.className='dkds-field-control'"),'Data Center assignment filter must consume the Unit Field/Core field-control primitive.');
assert(!/\.dc-assignment-filter\{[^}]*(?:border|background|color|box-shadow|border-radius)\s*:/.test(src),'Data Center assignment filter must not own visual paint.');
assert(views.includes("id:'dcLineageFilter',kind:'select'")&&views.includes("id:'dcFieldFilter',kind:'select',className:'dc-field-filter'")&&foundation.includes("control.className='dkds-field-control'"),'Data Center filter controls must share the Unit Field/Core field-control primitive.');
assert(!/\.dc-assignment-filter:hover\{/.test(src),'Data Center assignment filter hover feedback must be owned by Core, not plugin CSS.');
console.log('v3.61.58 Data Center theme closure passed: filters consume the shared Core field-control primitive without private paint.');
