'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();

global.window={addEventListener(){},removeEventListener(){}};
global.document={querySelector:()=>null,documentElement:{classList:{contains:()=>false},dataset:{}},createElement(){throw new Error('unexpected generated PRIME allocation');}};
global.DKDSStyleGate={set(){},setToken(){},remove(){},snapshot(){return{};}};global.window.DKDSStyleGate=global.DKDSStyleGate;

const {UnitTemplateRuntime}=require('../src/core/ui/modules/composition/unit-templates');

const {UNIT_TEMPLATE_SPEC_VERSION,UNIT_CATALOG,UNIT_CONTRACTS}=require('../src/core/ui/modules/composition/unit-template-spec');
assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38','v3.71.9 must publish Unit Templates 2.5.5');
assert.strictEqual(Object.keys(UNIT_CATALOG).length,41,'lifecycle closure must not add a 42nd Unit');
assert(UNIT_CONTRACTS.scientificPlot.invariants.some(x=>String(x).includes('Exactly one renderer')),'ScientificPlot contract must publish single-renderer ownership');
const dts=fs.readFileSync(path.join(process.cwd(),'sdk/plugin-api.d.ts'),'utf8');
assert(dts.includes("renderOwner?:'unit'|'runtime'"),'SDK types must expose ScientificPlot render ownership');
assert(dts.includes('DKDSUnitDelegatedScientificPlotHandle'),'SDK types must describe delegated ScientificPlot handles');
let directScientificCreates=0,tracked=0;
const fakeScope={
  interactionBehaviors:{compile:spec=>({spec,route(){}})},
  scientificPlot:{create:(target,spec)=>{directScientificCreates++;return {target,spec,dispose(){}};}},
  plotViews:{},actions:{},tables:{},track(fn){tracked++;return fn;}
};
const runtime=new UnitTemplateRuntime(fakeScope,{plotGroups:{}});
const element=()=>({nodeType:1,dataset:{},classList:{values:new Set(),add(...xs){for(const x of xs)this.values.add(x);},remove(...xs){for(const x of xs)this.values.delete(x);}},parentNode:null});

// Generic PRIME content must be consumed by the canonical PRIME body. The
// v3.71.7 cutover exposed the old gap: the shell/header existed but content was
// left detached, producing the empty parameter panel seen on the real client.
const content=element(),body={...element(),children:[],appendChild(node){if(node.parentNode&&node.parentNode!==this&&Array.isArray(node.parentNode.children))node.parentNode.children=node.parentNode.children.filter(x=>x!==node);this.children.push(node);node.parentNode=this;return node;}};
let mountContainer=null;
const prime=runtime.buildPrimeSpec({id:'parameters',role:'data-control',title:'Parameters',variant:'canonical-header',content,mount:ctx=>{mountContainer=ctx.container;}});
assert.strictEqual(prime.content,undefined,'generic PRIME must consume content instead of leaking an inert row.content field');
const cleanup=prime.mount({container:body,panel:element(),slots:{}});
assert.strictEqual(body.children[0],content,'generic PRIME content must be appended into the mounted PRIME body');
assert.strictEqual(mountContainer,body,'user mount must receive the same PRIME body after content adoption');
cleanup?.();

// Runtime-rendered Plotly/scalar-field surfaces need Unit anatomy but must not
// allocate a second ScientificCurveSurface/SVG/ResizeObserver on the same host.
const plot=element();
const delegated=runtime.createScientificPlot(plot,{variant:'heatmap',source:'ter:heatmap',renderOwner:'runtime'});
assert.strictEqual(directScientificCreates,0,'runtime-delegated Unit ScientificPlot must not create a second ScientificCurveSurface');
assert.strictEqual(delegated.renderOwner,'runtime');
assert.strictEqual(plot.dataset.dkdsScientificRenderOwner,'runtime');
assert.strictEqual(plot.dataset.dkdsUnitTemplate,'scientific-plot-v2');
assert(!plot.classList.values.has('dkds-scientific-chart-host'),'runtime-delegated ScientificPlot must preserve the authored target identity until the real renderer attaches');
assert(!plot.classList.values.has('dkds-scientific-surface-host'),'runtime-delegated ScientificPlot is PlotView content and must not become a second Material Surface');
assert(tracked>=1,'delegated Unit ScientificPlot cleanup must remain scope-owned');
assert.throws(()=>runtime.createScientificPlot(element(),{renderOwner:'runtime',interactionExtensions:[{id:'x'}]}),/UNIT_SCIENTIFIC_DELEGATED_INTERACTION_FORBIDDEN/,'delegated render owner must not introduce a second interaction owner');

const normal=runtime.createScientificPlot(element(),{getCurves:()=>[]});
assert.strictEqual(directScientificCreates,1,'normal Unit ScientificPlot must still use the canonical ScientificCurveSurface owner');
assert(normal?.spec?.interactionBehavior,'normal Unit ScientificPlot must retain the fixed Core interaction policy');

// Generated PRIME panels are persistent. Reopening may reuse row.container but
// may never allocate a new parked subtree for every toggle.
const {AnalysisWorkbench}=require('../src/core/ui/modules/workbench/analysis');
const persisted=element(),row={id:'parameters',container:persisted,existingNode:null,node:null};
const resolved=AnalysisWorkbench.prototype.resolvePrimeNode.call({shell:null,root:null},row);
assert.strictEqual(resolved.container,persisted,'generated PRIME reopen must reuse the existing generated container');
assert.strictEqual(resolved.existing,false,'reused generated PRIME must not be misclassified as plugin-authored existing chrome');

const layoutSpec=fs.readFileSync(path.join(process.cwd(),'src/core/ui/modules/composition/unit-template-layout-spec.js'),'utf8');
const recipe=layoutSpec.match(/'plot-card-fill':Object\.freeze\(\{([^}]*)\}\)/)?.[1]||'';
assert(recipe,'plot-card-fill recipe missing');
assert(!/height\s*:\s*['\"]100%['\"]/.test(recipe),'responsive PlotGroup cards must not own height:100%; it forms a cyclic auto-row sizing contract');

const ter=fs.readFileSync(path.join(process.cwd(),'src/plugins/ter-analysis/unit-presentation.js'),'utf8');
assert(ter.includes("renderOwner:'runtime'"),'production TER must delegate scientific renderer ownership to its existing feature runtime');
assert(!ter.includes("units.scientificPlot.create(plot,{variant:kind,source:`ter:${key}`});"),'production TER must not recreate the old dual-renderer path');

console.log('v3.71.9 TER Unit cutover layout/lifecycle PASS: PRIME content mounted, generated PRIME reused, runtime plots single-owner, responsive cards no cyclic 100% height.');
