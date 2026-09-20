'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();

const unitSource=fs.readFileSync('src/plugins/resonance-workbench/unit-presentation.js','utf8');
const groupSource=fs.readFileSync('src/plugins/resonance-workbench/feature-group-runtime.js','utf8');
const foundationSource=fs.readFileSync('src/core/ui/modules/composition/unit-template-foundation.js','utf8');
const dts=fs.readFileSync('sdk/plugin-api.d.ts','utf8');
const {UNIT_TEMPLATE_SPEC_VERSION,UNIT_CATALOG}=require('../src/core/ui/modules/composition/unit-template-spec');
assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(UNIT_CATALOG).length,41,'runtime source-parity closure must not invent a Resonance-specific Unit.');

// The accepted main plot is an actual SVG element. Creating an HTML-namespace <svg>
// is structurally different even when tagName looks correct and can leave D3 output invisible.
assert(foundationSource.includes("namespace==='svg'?'http://www.w3.org/2000/svg'"),'Layout Unit must own SVG namespace resolution.');
assert(/tagName:'svg',namespace:'svg',(?:variant:'accepted-main-plot',)?className:'respar-main-svg',id:'reswinMainPlot'/.test(unitSource),'Resonance main plot must declare accepted SVG namespace through the Layout Unit.');
assert(dts.includes("namespace?:'svg'|'html'|string"),'SDK type contract must publish Layout Unit namespace selection.');

class ClassList{constructor(){this.values=new Set();}add(...rows){for(const row of rows)this.values.add(String(row));}remove(...rows){for(const row of rows)this.values.delete(String(row));}contains(row){return this.values.has(String(row));}}
class FakeElement{
  constructor(tag='div',namespaceURI='http://www.w3.org/1999/xhtml'){this.tagName=String(tag).toUpperCase();this.localName=String(tag).toLowerCase();this.namespaceURI=namespaceURI;this.nodeType=1;this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this.parentElement=null;}
  appendChild(node){node.parentNode=this;node.parentElement=this;this.children.push(node);return node;}
}
const calls=[];
global.document={
  createElement(tag){calls.push(['html',String(tag)]);return new FakeElement(tag);},
  createElementNS(ns,tag){calls.push([String(ns),String(tag)]);return new FakeElement(tag,String(ns));},
  querySelector(){return null;},documentElement:{dataset:{},classList:new ClassList()}
};
global.window={document:global.document,addEventListener(){},removeEventListener(){}};
const styleGate={set(){},setToken(){},remove(){},snapshot(){return{};}};global.DKDSStyleGate=styleGate;global.window.DKDSStyleGate=styleGate;
const {FoundationUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-foundation');
const foundation=new FoundationUnitRuntime({});
const host=new FakeElement('main');
const svg=foundation.createLayout(host,{tagName:'svg',namespace:'svg',variant:'identity',className:'respar-main-svg'});
assert.strictEqual(svg.namespaceURI,'http://www.w3.org/2000/svg','Layout Unit created Resonance SVG in the HTML namespace.');
assert.strictEqual(svg.dataset.dkdsUnitNamespace,'svg');
assert(calls.some(([ns,tag])=>ns==='http://www.w3.org/2000/svg'&&tag==='svg'),'Layout Unit did not call createElementNS for the SVG host.');

// Strict PlotGroup PlotViews require a title. v3.71.19 omitted it during dynamic
// adoption, so the first populated Group card threw before the PRIME could finish opening.
assert(/adoptPlot\?\.\(`resonance-group:\$\{key\}`,card,\{\s*title,plot,header:/.test(groupSource),'Dynamic Resonance Group adoption must pass the accepted card title into the strict PlotView contract.');
const {ScientificUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-scientific');
const scientific=new ScientificUnitRuntime({},{});
assert.throws(()=>scientific.strictPlotSpec('resonance-group:v',{plot:{}}),/UNIT_PLOTVIEW_TITLE_REQUIRED/);
const resolved=scientific.strictPlotSpec('resonance-group:v',{title:'峰位 Vpk',plot:{},placements:['home','float'],defaultPlacement:'home',detailGeometry:{contentAspectRatio:1.65,contentMinHeightPx:160,contentMaxHeightPx:226}});
assert.strictEqual(resolved.title,'峰位 Vpk');
assert.strictEqual(resolved.contentAspectRatio,1.65);
assert.strictEqual(resolved.contentMinHeight,160);
assert.strictEqual(resolved.contentMaxHeight,226);

console.log('v3.71.20 Resonance runtime source-parity closure PASS (SVG namespace + strict Group title)');
