'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const plugin=read('src/plugins/transfer-vth-lab/plugin.js');
const unitScientific=read('src/core/ui/modules/composition/unit-template-scientific.js');
const unitCommon=read('src/core/ui/modules/composition/unit-template-common.js');
const groupPlot=read('src/core/ui/modules/tooltip/group-plot.js');

assert(!/interactionBehavior\s*:/.test(plugin),'Production Vth Unit presentation must not pass the forbidden interactionBehavior override into Unit ScientificPlot.');
assert(plugin.includes("activity:'transfer-vth-lab',interactionExtensions:[{id:'vth.shift-select-region',gesture:'box',target:'background',modifiers:['shift'],intent:'select-region',priority:30}]") ,'Vth must preserve its non-conflicting Shift box-select extension through the public Unit interactionExtensions contract.');
assert(groupPlot.includes("{id:'core.background.zoom-box',gesture:'box',target:'background',modifiers:['ctrl'],intent:'zoom-box',priority:20}"),'Core scientific-standard-v1 must continue to own Ctrl box zoom; Vth must not redeclare it.');
assert(groupPlot.includes("{id:'core.background.select-region',gesture:'box',target:'background',intent:'select-region'}"),'Core scientific-standard-v1 must continue to own unmodified region selection.');
assert(unitCommon.includes('MANDATORY_INTERACTION_KEYS')&&unitCommon.includes('UNIT_SCIENTIFIC_INTERACTION_OVERRIDE'),'Unit interactionExtensions must keep rejecting bindings that collide with mandatory Core scientific gestures.');
assert(unitScientific.includes("if(spec.interactionBehavior!==undefined)throw new Error('UNIT_SCIENTIFIC_INTERACTION_POLICY_FIXED')"),'Unit must keep rejecting replacement interactionBehavior objects rather than weakening the contract to accommodate Vth.');
assert(unitScientific.includes('validatedExtensions(spec.interactionExtensions||[])'),'Unit ScientificPlot must continue to validate extension bindings before compiling the fixed scientific policy.');
console.log('v3.71.54 Vth Unit ScientificPlot fixed-interaction-policy migration PASS');
