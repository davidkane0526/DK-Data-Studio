'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();

const units=read('src/plugins/resonance-workbench/unit-presentation.js');
const feature=read('src/plugins/resonance-workbench/feature-runtime.js');
const group=read('src/plugins/resonance-workbench/feature-group-runtime.js');
const foundation=read('src/core/ui/modules/composition/unit-template-foundation.js');
const terUnits=read('src/plugins/ter-analysis/unit-presentation.js');
const terFeature=read('src/plugins/ter-analysis/feature-runtime.js');

// Main plot: accepted-scientific workspace must activate the accepted profile and
// the production Resonance Unit composition must actually consume its fill-chain variants.
assert(foundation.includes("String(spec.variant||'')==='accepted-scientific'")&&foundation.includes("data-dkds-scientific-profile','accepted-scientific-v1'"),'accepted-scientific Workspace Unit must activate the accepted scientific profile on the real workbench shell.');
for(const variant of ['accepted-main-area','accepted-main-workspace','accepted-plot-wrap','accepted-main-header','accepted-main-plot','accepted-summary'])assert(units.includes(`variant:'${variant}'`),`production Resonance main composition must consume ${variant}`);

// Group columns: menu commit must synchronously reflow the existing GroupArea;
// it must not wait for a later data render/update to make the requested columns visible.
const setColumns=feature.match(/setGroupColumns\(value\)\{([\s\S]*?)\},closeGroupViews/)?.[1]||'';
assert(setColumns.includes('groupRuntime.applyLayout?.();'),'group column selection must synchronously apply GroupArea layout.');
assert(group.includes('grid?.setColumns?.(requested);'),'group applyLayout must reach the public PlotGroup.setColumns facade instead of calling a missing apply() method.');
assert(!setColumns.includes("if($('#resparGroupPanel')?.offsetParent!==null)groupRuntime.applyLayout?.();"),'group layout commit must not be deferred behind a visibility gate.');

// Data updates may invalidate hidden Group state, but must not render a parked/hidden Group.
assert(group.includes('if(!panel||panel.offsetParent===null||metricRenderRaf)return false;'),'settled metrics must not render a hidden/parked Group panel.');
assert(group.includes("if($('#resparGroupPanel')?.offsetParent!==null)renderGroup();"),'settled metric repaint must require a visible Group panel.');
assert(feature.includes("onResolved:()=>{groupRuntime?.invalidate?.();if($('#resparGroupPanel')?.offsetParent!==null)renderGroup();}"),'async Resonance TER completion must not repaint a hidden Group panel.');

// TER startup: page-open owns control/table sync; the immediately-following
// analysis:refresh consumes that open marker instead of running T.render twice.
assert(terUnits.includes('onOpen:()=>handlers.onPageOpen?.()??T.render()'),'TER page open must keep one presentation synchronization owner.');
assert(terFeature.includes('pageOpenRenderPendingRefresh=false')&&terFeature.includes('syncPageOpen=()=>{T.render();pageOpenRenderPendingRefresh=true;return true;}'),'TER runtime must mark the page-open render for refresh coalescing.');
assert(terFeature.includes('if(pageOpenRenderPendingRefresh)pageOpenRenderPendingRefresh=false;else T.render();'),'TER analysis refresh must consume the page-open render marker instead of duplicating first-start synchronization.');

// Core grid proof: preferredColumns is re-read on each apply, so a direct
// settings commit changes the applied column count immediately.
class CL{constructor(){this.s=new Set();}add(...r){r.forEach(v=>this.s.add(String(v)));}remove(...r){r.forEach(v=>this.s.delete(String(v)));}contains(v){return this.s.has(String(v));}}
class El{constructor(){this.nodeType=1;this.children=[];this.dataset={};this.classList=new CL();this.clientWidth=900;this.style={setProperty(){},removeProperty(){}};}appendChild(n){this.children.push(n);n.parentElement=this;return n;}querySelector(){return null;}}
global.document={documentElement:{dataset:{},classList:new CL()},createElement:()=>new El()};
global.window={MutationObserver:null,ResizeObserver:null,addEventListener(){},removeEventListener(){}};global.getComputedStyle=()=>({gap:'12px',columnGap:'12px'});
const gate={set(el,p,v){el.style[p]=v;},setToken(el,p,v){el.style[p]=v;},remove(el,p){delete el.style[p];}};global.DKDSStyleGate=gate;global.window.DKDSStyleGate=gate;
const {GridController}=require('../src/core/ui/modules/grid/controller');
let preference=2;const el=new El(),scope={emitResize(){},requestChartResize(){}};const controller=new GridController(scope,el,{columns:6,maxColumns:6,minItemWidth:260,responsive:true,preferredColumns:()=>preference});
assert.strictEqual(controller.getAppliedColumns(),2);preference=3;controller.apply();assert.strictEqual(controller.getAppliedColumns(),3,'direct preference change must be visible on the same apply call');assert.strictEqual(el.dataset.dkdsGridColumns,'3');controller.dispose();

console.log('v3.71.24 Resonance visible-layout + TER first-start closure PASS');
