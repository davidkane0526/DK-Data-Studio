'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json'),expo=json('mobile/app.json').expo;
const atLeast=(value,floor)=>{const a=String(value).split('.').map(Number),b=String(floor).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;};
assert(atLeast(pkg.version,'3.68.103'));
assert.strictEqual(expo.version,pkg.version);
assert(Number(expo.android.versionCode)>=123);

const pulse=read('src/plugins/pulse-sampler-tool/plugin.css');
const pulseRuntime=read('src/plugins/pulse-sampler-tool/plugin.js');
assert(pulseRuntime.includes("leftWidth:540,leftMin:520,leftReserve:520"),
  'Pulse PRIME rail must request enough intrinsic desktop width for three channel tabs and four command actions.');
assert(pulseRuntime.includes("semanticKind:'panel',sizing:'fill'"),'Parameters must opt into Core fill sizing.');
assert(pulse.includes('.ps-designer-body{display:grid'),'Plugin content grid must be separate from Portable root.');
assert(pulse.includes('.ps-segment-bar{display:flex')&&pulse.includes('padding:6px 10px 4px'),
  'Joined-segment heading must retain a visible content inset instead of pressing against the left edge.');
assert(pulse.includes('.ps-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))'),
  'Pulse action row must override the generic toolbar flex geometry and distribute all remaining width equally.');
assert(pulse.includes('.ps-actions button{width:100%;min-width:0;white-space:nowrap}'),
  'Each Pulse command must fill its grid track without intrinsic overflow.');

console.log('Pulse parameter sizing and command geometry PASS');
