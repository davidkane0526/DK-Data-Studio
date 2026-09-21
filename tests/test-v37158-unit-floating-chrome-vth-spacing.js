'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert(Number(json('package.json').version.split('.').at(-1))>=59,'App must retain the v3.71.59+ baseline.');
assert(Number(json('mobile/app.json').expo.android.versionCode)>=200,'Android versionCode must retain the v3.71.59+ baseline.');
const versionAtLeast=(value,floor)=>{const a=String(value||'0.0.0').split('.').map(Number),b=String(floor||'0.0.0').split('.').map(Number);for(let i=0;i<3;i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};
assert(versionAtLeast(json('src/plugins/transfer-vth-lab/plugin.json').version,'3.3.4'),'Vth must retain the 3.3.4+ spacing baseline.');

const chrome=read('src/styles/structure/desktop-chrome-geometry.css');
assert(chrome.includes('--dkds-floating-chrome-inset:3px')&&chrome.includes('padding:var(--dkds-floating-chrome-inset)'),'Floating chrome must retain one symmetric Core-owned inset.');
assert(chrome.includes('--dkds-field-control-min-height:100%'),'Floating chrome must context-size direct Action Units so Field/touch minimums cannot consume the inset.');

const native=read('src/styles/platform/native-client-shell.css');
assert(!native.includes('[data-dkds-unit-template="floating-chrome-v2"][data-dkds-unit-variant="accepted-main"]>button[data-dkds-unit-template="action-v2"]'),'Mobile must not create a second accepted-main action-geometry owner.');
assert(native.includes('.dkds-scientific-curve-surface[data-dkds-mobile-box-gesture="none"]{touch-action:pan-y}'),'Mobile plot scroll handoff must remain intact.');

const spec=require('../src/core/ui/modules/composition/unit-template-spec');
assert(spec.UNIT_CONTRACTS.floatingChrome.invariants.some(row=>row.includes('equal on all four sides')),'Unit floatingChrome contract must state equal four-side inset preservation.');

const vth=read('src/plugins/transfer-vth-lab/unit-presentation.js');
assert(vth.includes("const main=units.layout.create(null,{variant:'fill-rows',geometry:{width:'100%',height:'100%',minWidth:'0',minHeight:'0',gap:'10px'}})"),'Vth main must bind fill-rows and its accepted 10 px gap in one Unit layout owner.');
assert(!vth.includes("units.layout.apply(main,{variant:'identity'"),'Vth must not replace fill-rows with an identity decorator that clears grid/gap geometry.');
assert(vth.includes("const controlsHost=units.layout.create(null,{variant:'stack-comfortable',geometry:{gap:'10px',minWidth:'0'}})"),'Vth controls stack must keep recipe + detail geometry under one Unit owner.');
assert(!vth.includes('units.layout.apply(split.element'),'Vth must not overwrite the SplitPane outer-layout owner after Core creates the split.');

const shadow=read('examples/sdk151-unit-vth-shadow/plugin.js');
assert(shadow.includes("variant:'fill-rows',geometry:{width:'100%',height:'100%',minWidth:'0',minHeight:'0',gap:'10px'}"),'Vth SDK shadow must mirror the production Unit gap composition.');
assert(!shadow.includes('geom(split.element'),'Vth SDK shadow must preserve the SplitPane layout owner.');

console.log('v3.71.58 Unit floatingChrome equal-inset + Vth plot-title spacing regression PASS');
