'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const foundationSource=read('src/core/ui/modules/composition/unit-template-foundation.js');
const presentation=read('src/plugins/data-center/unit-presentation.js');
const featureRuntime=read('src/plugins/data-center/feature-runtime.js');

// ParameterForm is an adoptive/decorator Unit when layoutOwner=host. It must
// never overwrite the Layout Unit identity that authorizes host ownership.
const commonSource=read('src/core/ui/modules/composition/unit-template-common.js');
const behaviorSource=read('src/core/ui/modules/composition/unit-template-behavior.js');
const layoutSource=read('src/core/ui/modules/composition/unit-template-layout.js');
const scientificSource=read('src/core/ui/modules/composition/unit-template-scientific.js');
assert(commonSource.includes('function markUnitRole(')&&commonSource.includes('function hasUnitRole('),'Unit runtime must expose additive role metadata and role lookup for composable/adopted Units.');
assert(layoutSource.includes("markUnitRole(node,'layout','layout-v2',variant)"),'Layout.apply/bind must add a Layout role without erasing an existing Unit identity.');
assert(foundationSource.includes("markUnitRole(parent,'parameter-form','parameter-form-v2',variant)"),'ParameterForm must use additive Unit-role metadata.');
assert(!foundationSource.includes("parent.dataset.dkdsUnitTemplate='parameter-form-v2';parent.dataset.dkdsUnitVariant=options.autoFit"),'ParameterForm must not unconditionally overwrite a structural Unit identity.');
assert(behaviorSource.includes("container.dataset.dkdsUnitBehaviorVariant=String(spec.variant||'resizable')"),'SplitPane behavior must preserve a structural Layout variant.');
assert(scientificSource.includes("markUnitRole(node,'scientific-plot','scientific-plot-v2'"),'ScientificPlot adoption must not erase an existing structural Unit role.');
assert(foundationSource.includes("markUnitRole(target,'portable','portable-v2'"),'Portable adoption must not erase an existing panel/plot structural role.');

// Runtime proof: the same Layout host must survive destroy/remount cycles.
global.window=globalThis;window.addEventListener=()=>{};window.removeEventListener=()=>{};
global.document={querySelector(){return null;},documentElement:{dataset:{},classList:{contains(){return false;}}}};
global.localStorage={getItem(){return null;},setItem(){}};
const gate={set(){},setToken(){},remove(){},snapshot(){return{};}};global.DKDSStyleGate=gate;window.DKDSStyleGate=gate;
let renders=0;global.DKDSParameters={render(parent,_schema,options){renders++;assert.strictEqual(options.layoutOwner,'host');return {destroy(){},getValue(){return {};}};}};
const {markUnitRole,hasUnitRole}=require('../src/core/ui/modules/composition/unit-template-common');
const composed={nodeType:1,dataset:{dkdsUnitTemplate:'layout-v2',dkdsUnitVariant:'formula-grid'}};markUnitRole(composed,'scientific-plot','scientific-plot-v2','curve');markUnitRole(composed,'portable','portable-v2','docked');assert.strictEqual(composed.dataset.dkdsUnitTemplate,'layout-v2');assert.strictEqual(composed.dataset.dkdsUnitVariant,'formula-grid');assert(composed.dataset.dkdsUnitRoles.includes('scientific-plot')&&composed.dataset.dkdsUnitRoles.includes('portable'));
const primary={nodeType:1,dataset:{}};markUnitRole(primary,'meter','meter-v2','thin');assert.strictEqual(primary.dataset.dkdsUnitTemplate,'meter-v2');assert.strictEqual(primary.dataset.dkdsUnitVariant,'thin');
const decoratedLayout={nodeType:1,dataset:{dkdsUnitTemplate:'panel-v2',dkdsUnitVariant:'headed'}};markUnitRole(decoratedLayout,'layout','layout-v2','row');assert.strictEqual(decoratedLayout.dataset.dkdsUnitTemplate,'panel-v2');assert.strictEqual(decoratedLayout.dataset.dkdsUnitVariant,'headed');assert.strictEqual(decoratedLayout.dataset.dkdsUnitLayout,'layout-v2');assert.strictEqual(decoratedLayout.dataset.dkdsUnitLayoutVariant,'row');assert.strictEqual(hasUnitRole(decoratedLayout,'layout','layout-v2'),true);
const {FoundationUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-foundation');
const host={nodeType:1,dataset:{dkdsUnitTemplate:'layout-v2',dkdsUnitVariant:'formula-grid'}};
const runtime=new FoundationUnitRuntime({});
runtime.mountParameterForm(host,{fields:[]},{layoutOwner:'host'});
assert.strictEqual(host.dataset.dkdsUnitTemplate,'layout-v2');
assert.strictEqual(host.dataset.dkdsUnitVariant,'formula-grid');
assert.strictEqual(host.dataset.dkdsUnitParameterForm,'parameter-form-v2');
runtime.mountParameterForm(host,{fields:[]},{layoutOwner:'host'});
assert.strictEqual(renders,2,'A host-owned ParameterForm must be remountable on the same Layout Unit.');
assert.strictEqual(host.dataset.dkdsUnitTemplate,'layout-v2');
assert.strictEqual(host.dataset.dkdsUnitVariant,'formula-grid');

// Data Center formula is intentionally rerendered as artifact/domain state changes,
// so this generic contract is required for the production path.
assert(featureRuntime.includes("quickPanel?.destroy?.();const host=$('#dcFormulaParams')"),'Regression proof requires the production formula remount path.');
assert(featureRuntime.includes("layoutOwner:'host'"),'Production formula must continue to use the generic single-owner contract.');
assert(presentation.includes("padding:'0 20px 4px 12px'"),'Preview count must retain a clearly visible right inset owned by its Unit Layout.');
console.log('v3.71.35 Unit adoption/remount closure PASS');
