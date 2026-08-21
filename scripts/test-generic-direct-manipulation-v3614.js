'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const ui=read('src/core/ui-infrastructure.js');
const sdk=read('sdk/plugin-api.d.ts');
const docs=read('sdk/README.md');
const resonance=read('src/plugins/resonance-workbench/feature-runtime.js');

for(const kind of ["kind==='point'","kind==='axis'","kind==='range'"])
  assert(ui.includes(kind),`Core generic manipulation primitive missing ${kind}`);
for(const hook of ['getManipulators','onManipulationStart','onManipulationPreview','onManipulationCommit','onManipulationReset'])
  assert(ui.includes(hook),`Core generic manipulation lifecycle missing ${hook}`);
assert(ui.includes("snap?.kind!=='curve'")&&ui.includes('this.nearestIndex(points,x.invert(event.x))'),'Generic manipulators must reuse Core curve snapping rather than feature-owned nearest-point loops.');
assert(ui.includes("emitManipulation('preview'")&&ui.includes("emitManipulation('commit'"),'Core must separate pointer-rate preview from one semantic commit.');
assert(ui.includes("compat==='width'")&&ui.includes("compat==='marker'"),'Legacy feature-named drag APIs may survive only as adapters into the generic manipulation model.');

for(const token of ['DKDSPlotManipulator','kind:\'point\'','kind:\'axis\'','kind:\'range\'','getManipulators?:()=>DKDSPlotManipulator[]','onManipulationCommit?'])
  assert(sdk.includes(token),`Standalone SDK generic manipulation declaration missing ${token}`);
assert(docs.includes('threshold line')&&docs.includes('fit/integration interval')&&docs.includes('FWHM analysis window'),'SDK docs must explain that domain features are interpretations of generic manipulation primitives.');

assert(resonance.includes('getManipulators:()=>mainSurfaceManipulators()'),'Reference Resonance plugin must declare generic manipulators.');
assert(resonance.includes("action:'peak-position'")&&resonance.includes("kind:'point'"),'Peak movement must map to a generic point manipulator.');
assert(resonance.includes("action:'analysis-window'")&&resonance.includes("kind:'range'"),'FWHM analysis-window editing must map to a generic range manipulator.');
assert(resonance.includes('onManipulationCommit:')&&resonance.includes('onManipulationReset:'),'Reference plugin must map generic commits/resets to domain state.');
for(const forbidden of ['onMarkerDragCommit:','onMarkerDragPreview:','onWidthWindowCommit:','onWidthDragPreview:'])
  assert(!resonance.includes(forbidden),`Reference plugin must not depend on deprecated feature-named interaction hook ${forbidden}`);

console.log('v3.61.4 generic direct-manipulation Core/SDK contract checks passed.');
