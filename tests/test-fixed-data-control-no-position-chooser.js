'use strict';
const assert=require('assert');const fs=require('fs');const {inspectCompositionSource}=require('../sdk/composition-contract');
const runtime=fs.readFileSync('src/core/ui/modules/workbench/analysis.js','utf8');const portable=fs.readFileSync('src/core/ui/modules/layout/portable-view.js','utf8');
assert(runtime.includes("presentationRole==='data-control')?'host':'surface'"),'data-control must default to host-managed placement so accepted layouts are preserved');
let result=inspectCompositionSource("workbench.registerPrime({id:'x',presentationRole:'data-control',existingNode:n,chrome:false,placements:['left','global','right','bottom']});");
assert(!result.issues.some(x=>x.code==='DATA_CONTROL_WITH_MULTIPLE_PLACEMENTS'||x.code==='MOVABLE_PRIME_WITHOUT_CANONICAL_CHROME'),'host-managed data-control must preserve accepted multi-placement/chrome:false behavior');
result=inspectCompositionSource("workbench.registerPrime({id:'x',presentationRole:'data-control',fixed:true,existingNode:n,placements:['left','right']});");
assert(result.issues.some(x=>x.code==='FIXED_PRIME_WITH_MULTIPLE_PLACEMENTS'),'fixed:true is the explicit one-placement contract');
result=inspectCompositionSource("workbench.registerPrime({id:'x',presentationRole:'data-control',placementControl:'surface',existingNode:n,handle:'.own-head',controlsHost:'.own-actions',placements:['left'],header:{showPlacement:true}});");
assert(result.issues.some(x=>x.code==='FIXED_PRIME_EXPOSES_POSITION_CHOOSER'));
assert(portable.includes('placementChoices.length>1'),'PortableView must only create a placement chooser when multiple choices exist');
const expected=new Map([
 ['src/plugins/resonance-workbench/unit-presentation.js',"placements:['left']"],
 ['src/plugins/ter-analysis/unit-presentation.js',"placements:['left','global','right','bottom']"],
 ['src/plugins/pulse-analysis/unit-presentation.js',"placements:['left','global','right','bottom']"],
 ['src/plugins/data-center/unit-presentation.js',"placements:['left']"]
]);
for(const [file,token] of expected){const s=fs.readFileSync(file,'utf8');assert(s.includes(token),`${file} must preserve the accepted 3.70.5 placement template`);}
console.log('Data-control placement template contract PASS');
