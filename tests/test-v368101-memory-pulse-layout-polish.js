'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const expo=json('mobile/app.json').expo;
const atLeast=(value,floor)=>{const a=String(value).split('.').map(Number),b=String(floor).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;};
assert(atLeast(pkg.version,'3.68.101'),'v3.68.101 memory/Pulse polish must remain present in later releases');
assert.strictEqual(expo.version,pkg.version);
assert(Number(expo.android.versionCode)>=122);

const status=read('src/plugins/status-monitor/plugin.js');
const chrome=read('src/styles/presentation/plugin-chrome.css');
assert(status.includes('class="dkds-memory-release danger-soft"')&&status.includes("data-dkds-component-variant=\"destructive\""),
  'Hidden-plugin release must reuse the canonical destructive soft-fill action semantics.');
assert(status.includes("dkds-memory-component-row${releasable?' is-releasable':''}")&&status.includes('dkds-memory-component-value'),
  'Memory rows must preserve the original name/value composition and only mark releasable rows semantically.');
assert(!status.includes('dkds-memory-release-slot'),
  'Release must not consume a permanent third layout column.');
assert(chrome.includes('.dkds-memory-component-value {position:relative')&&chrome.includes('justify-content:flex-end'),
  'Memory MB values must retain a fixed right-aligned value lane while idle.');
assert(chrome.includes('.dkds-memory-release {position:static;flex:0 0 auto')&&chrome.includes('opacity:0;visibility:hidden;pointer-events:none'),'Release keeps stable space while hidden.');
assert(read('src/styles/motion/recipes.css').includes('.dkds-memory-release{transition:opacity var(--dkui-motion-fast) var(--dkui-ease-standard)}'),
  'Release hover interpolation must remain owned by the canonical Motion stylesheet.');
assert(chrome.includes('.dkds-memory-component-row.is-releasable:hover .dkds-memory-release')&&chrome.includes('.dkds-memory-component-row.is-releasable:focus-within .dkds-memory-release'),
  'Release action must appear immediately to the left of xx MB only on row hover/focus.');

console.log('Memory destructive semantics and stable hover layout PASS');
