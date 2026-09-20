'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json'),expo=json('mobile/app.json').expo;
const atLeast=(value,floor)=>{const a=String(value).split('.').map(Number),b=String(floor).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;};
assert(atLeast(pkg.version,'3.70.6'));
assert.strictEqual(expo.version,pkg.version);
assert(Number(expo.android.versionCode)>=123);

const pulseUnit=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
const pulseManifest=json('src/plugins/pulse-sampler-tool/plugin.json');
assert((pulseManifest.requiresCore||[]).includes('ui.unit-templates'),'Pulse production presentation must consume Unit Templates.');
assert(pulseUnit.includes("variant:'fixed-titleless'")&&pulseUnit.includes("presentationRole:'data-control'")&&pulseUnit.includes("placements:['left']"),
  'Pulse parameter PRIME must remain a fixed titleless data-control surface.');
assert(pulseUnit.includes("variant:'stack-comfortable'")&&pulseUnit.includes("variant:'form-grid-2'"),
  'Pulse parameter content must retain its accepted Unit stack/form geometry.');
assert(pulseUnit.includes("variant:'segment-bar'"),'Joined-segment heading must retain the canonical inset-bearing Unit recipe.');
assert(pulseUnit.includes("variant:'action-grid-4'"),'Pulse actions must use the canonical four-track action grid with responsive two-column fallback.');
console.log('Pulse parameter sizing and command geometry PASS');
