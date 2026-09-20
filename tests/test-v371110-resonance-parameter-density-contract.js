'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const unit=read('src/plugins/resonance-workbench/unit-presentation.js');
const mobile=read('src/plugins/resonance-workbench/mobile.css');
const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');

assert.strictEqual(pkg.version,'3.71.110','v3.71.110 source required.');
assert(unit.includes("const PARAMETER_INLINE_LABEL_LAYOUT=Object.freeze"),'Resonance parameter inline label density must be declared through Unit Layout.');
assert(unit.includes("gridTemplateColumns:'70px minmax(0,1fr)'"),'Wide-enough parameter labels must preserve the accepted inline label/control structure.');
assert(unit.includes("maxWidth:310")&&unit.includes("gridTemplateColumns:'minmax(0,1fr)'"),'Single-column label fallback must remain the Unit last resort.');
assert(unit.includes('geometry,responsiveGeometry,responsiveTarget')&&unit.includes('layoutSpec:PARAMETER_INLINE_LABEL_LAYOUT'),'The plugin helper must pass public Unit responsive geometry instead of writing Mobile CSS.');
assert(!unit.includes("minContentInlinePx:")||!unit.match(/id:'data-control'[^\n]*minContentInlinePx:/),'Resonance data-control must not restore a plugin-specific fixed minimum width.');
assert(!mobile.includes('.respar-select-label{\n  display:grid')&&!mobile.includes('.respar-select-label{grid-template-columns:1fr}'),'Mobile CSS must not remain a second owner of the migrated parameter label layout.');
assert(presenter.includes('resolveInlineConstraintDeficit')&&!presenter.includes('resonance-workbench'),'Presenter must remain domain-blind and consume Unit intrinsic constraints only.');

const layoutRuntime=read('src/core/ui/modules/composition/unit-template-layout.js');
assert(layoutRuntime.includes('function lastResortMaxWidth')&&layoutRuntime.includes('preferredMin=densityFloor>0?densityFloor+1:0'),'Unit Layout must convert the declared last-resort breakpoint into the intrinsic preferred minimum.');
assert(layoutRuntime.includes("kind:'avoid-last-resort'")&&layoutRuntime.includes('minInlinePx:preferredMin'),'Unit Layout must publish that density floor to the shared geometry registry.');

console.log('v3.71.110 Resonance parameter density contract PASS');
