'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.71.111'),'v3.71.111+ source required.');

const audit=read('tools/quality/unit-responsive-density-audit.js');
assert(audit.includes('Production parameter PRIME ownership closure'),'The global Unit density audit must include production parameter PRIME ownership.');
assert(audit.includes('pulse-analysis/unit-presentation.js')&&audit.includes('pulse-sampler-tool/unit-presentation.js')&&audit.includes('resonance-workbench/unit-presentation.js')&&audit.includes('ter-analysis/unit-presentation.js')&&audit.includes('transfer-vth-lab/unit-presentation.js'),'All five production parameter PRIME implementations must be audited.');

const resonance=read('src/plugins/resonance-workbench/unit-presentation.js');
const resonanceMobile=read('src/plugins/resonance-workbench/mobile.css');
assert((resonance.match(/variant:'action-grid-2'/g)||[]).length>=2,'Resonance scan/detect action rows must use Unit ActionGrid density.');
assert(resonance.includes("if(nativeMobile)units.layout.apply(display,{variant:'form-grid-2'})"),'Resonance display controls must use Unit FormGrid density on Mobile.');
assert(resonance.includes('layoutSpec:nativeMobile?PARAMETER_INLINE_LABEL_LAYOUT:null'),'Resonance label/control inline density must not alter Desktop layout.');
assert(!resonanceMobile.includes('respar-scan-global{\\n  grid-template-columns')&&!resonanceMobile.includes('respar-detect-actions{\\n  grid-template-columns'),'Resonance mobile.css must not re-own migrated parameter grids.');

const pulse=read('src/plugins/pulse-analysis/unit-presentation.js');
assert(pulse.includes("variant:'form-grid-2',className:'pulse-control-grid',responsiveTarget:controls"),'Pulse Analysis must consume the canonical two-column parameter form recipe.');

console.log('v3.71.111 parameter Unit density ownership PASS');
