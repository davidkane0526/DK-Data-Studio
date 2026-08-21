const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=(value,message)=>{if(!value)throw new Error(message);};
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const ui=read('src/core/ui-infrastructure.js');
const kernel=read('src/core/plugin-kernel.js');
const contract=read('src/core/plugin-contract-runtime.js');
const feature=read('src/plugins/resonance-workbench/feature-runtime.js');
const views=read('src/plugins/resonance-workbench/view-components.js');
const manifest=JSON.parse(read('src/plugins/resonance-workbench/plugin.json'));
const sdk=read('sdk/plugin-api.d.ts');
const sdkContract=JSON.parse(read('sdk/contract.json'));

assert(ui.includes("const INPUT_GESTURES=Object.freeze(['click','double-click','context','drag','box','wheel','key'])"),'Core must normalize the stable pointer/keyboard gesture vocabulary.');
assert(ui.includes('class InteractionBehaviorProfile'),'Interaction behavior policy must be a first-class Core object.');
assert(ui.includes('DEFAULT_SCIENTIFIC_INTERACTION_BINDINGS'),'ScientificCurveSurface must consume shared interaction policy rather than own feature-specific input branches.');
assert(ui.includes("gesture:'drag',target:'manipulator',intent:'manipulate',priority:100"),'Direct manipulation must win the scientific interaction arbitration path.');
assert(ui.includes("gesture:'click',target:'marker',modifiers:['ctrl'],intent:'select',selectionMode:'additive'")&&ui.includes("gesture:'click',target:'curve',modifiers:['ctrl'],intent:'select',selectionMode:'additive'"),'Additive selection must be expressed as shared behavior policy rather than raw modifier checks in selection callbacks.');
assert(ui.includes("gesture:'box',target:'background',modifiers:['ctrl'],intent:'zoom-box',priority:20"),'Ctrl+box must resolve through Interaction Behavior as zoom-box.');
assert(ui.includes("gesture:'box',target:'background',intent:'select-region'"),'Default box behavior must resolve through Interaction Behavior as region selection.');
assert(ui.includes("gesture:'context',target:'marker',intent:'context-menu'"),'Marker right-click must resolve through the shared context-menu intent.');
assert(ui.includes("gesture:'wheel',target:'plot',intent:'zoom-wheel'"),'Wheel zoom must resolve through Interaction Behavior.');
assert(!ui.includes('rangeDrag.zoom='),'ScientificCurveSurface must not retain the old ad-hoc Ctrl-box zoom branch.');
assert(kernel.includes('interactionBehaviors: infrastructureScope?.interactionBehaviors || null'),'Plugin Kernel must expose Interaction Behavior through ctx.ui.');
assert(contract.includes("'ui.interaction-behavior':api=>!!api?.ui?.interactionBehaviors"),'Plugin contract runtime must validate the Interaction Behavior requirement.');

assert(manifest.apiVersion==='1.13.0','Resonance reference plugin must target Plugin API 1.13.0.');
assert(manifest.requiresCore.includes('ui.interaction-behavior'),'Resonance must explicitly declare the Interaction Behavior Core dependency.');
assert(feature.includes("gesture:'click',target:'curve',modifiers:['shift'],command:'builtin.resonance.add-point'"),'Shift+click add-point must be a declared interaction binding.');
assert(feature.includes("gesture:'context',target:'marker',button:'secondary'"),'Right-click marker behavior must be declared through Interaction Behavior.');
assert(!feature.includes('onCurveModifiedClick:'),'Resonance reference surface must not own feature-specific modified-click handling.');
assert(!feature.includes('onMarkerDelete:'),'Resonance reference surface must not own feature-specific right-click deletion handling.');
assert(views.includes("ctx.ui.interactionBehaviors.create('resonance-keyboard'"),'Resonance keyboard policy must use Interaction Behavior.');
assert(!views.includes('ctx.ui.shortcuts'),'Resonance reference plugin must not own a parallel shortcut contribution path.');
for(const chord of ['Ctrl+Z','Ctrl+ArrowLeft','Shift+ArrowLeft','Escape'])assert(views.includes(`'${chord}'`),`Keyboard profile must retain exact chord ${chord}.`);
assert(feature.includes("commandRuntime.run('builtin.resonance.undo')")&&views.includes("['builtin.resonance.undo',()=>R.undoLastAction?.()]"),'Undo button and keyboard binding must converge on the same Command Registry command.');
assert(views.includes("undo:()=>ctx.commands.run('builtin.resonance.undo')")&&views.includes("deselect:()=>ctx.commands.run('builtin.resonance.deselect')"),'System Edit Contract must be an adapter into the same semantic commands, not a parallel business path.');

assert(sdkContract.pluginApiVersion==='1.14.0','Standalone SDK must target Plugin API 1.14.0 while preserving older package compatibility.');
assert(sdk.includes('DKDSInteractionBehaviorBinding')&&sdk.includes('DKDSInteractionBehaviorRuntime'),'Standalone SDK must publish Interaction Behavior types.');
assert(sdk.includes('interactionBehavior?:DKDSInteractionBehaviorProfile'),'Scientific surface SDK must accept an Interaction Behavior profile/spec.');

// Execute the policy resolver independently of a scientific plugin. This catches
// modifier/chord ambiguity that static architecture assertions cannot detect.
const listeners={};
const fakeWindow={addEventListener(name,fn){(listeners[name]??=[]).push(fn);},removeEventListener(){},innerWidth:1200,innerHeight:800};
const sandbox={window:fakeWindow,console,setTimeout,clearTimeout,queueMicrotask,structuredClone,CustomEvent:function(){}};sandbox.globalThis=sandbox;
vm.createContext(sandbox);vm.runInContext(ui,sandbox,{filename:'ui-infrastructure.js'});
const Profile=fakeWindow.DKDSUI?.InteractionBehaviorProfile;
assert(typeof Profile==='function','InteractionBehaviorProfile must be executable as an independent Core policy object.');
const commandCalls=[];
const fakeScope={owner:'behavior-test',options:{commands:{run:(id,payload)=>{commandCalls.push({id,payload});return true;}},host:{setStatus(){}}}};
const profile=new Profile(fakeScope,'behavior-test',{bindings:[
  {id:'normal-select',gesture:'click',target:'curve',intent:'select'},
  {id:'shift-add',gesture:'click',target:'curve',modifiers:['shift'],command:'test.add',priority:20},
  {id:'undo',gesture:'key',target:'keyboard',chord:'Ctrl+Z',command:'test.undo'},
  {id:'previous',gesture:'key',target:'keyboard',chord:'Ctrl+ArrowLeft',command:'test.previous'}
]});
assert(profile.resolve({gesture:'click',target:'curve',event:{shiftKey:true}}).binding.command==='test.add','A higher-priority exact modifier binding must win over the generic selection binding.');
assert(profile.resolve({gesture:'click',target:'curve',event:{}}).intent==='select','Normal click must retain the generic selection intent.');
assert(profile.resolve({gesture:'key',target:'keyboard',chord:'Ctrl+Z',event:{ctrlKey:true,key:'z'}}).binding.command==='test.undo','Ctrl+Z must resolve to its exact command.');
assert(profile.resolve({gesture:'key',target:'keyboard',chord:'Ctrl+ArrowLeft',event:{ctrlKey:true,key:'ArrowLeft'}}).binding.command==='test.previous','Ctrl+ArrowLeft must not collide with Ctrl+Z or generic Ctrl matching.');
profile.route({gesture:'click',target:'curve',event:{shiftKey:true},payload:{x:1}});
assert(commandCalls.length===1&&commandCalls[0].id==='test.add'&&commandCalls[0].payload.x===1,'Behavior route must invoke the Command Registry with the semantic payload.');
profile.dispose();
console.log('v3.61.5 Interaction Behavior / command arbitration architecture checks passed.');
