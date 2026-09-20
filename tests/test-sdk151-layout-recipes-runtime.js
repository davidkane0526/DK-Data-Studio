'use strict';
const assert=require('assert');
const path=require('path');const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();

class ClassList{constructor(){this.values=new Set();}add(...v){for(const x of v)this.values.add(x);}contains(v){return this.values.has(v);}}
class FakeElement{
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this.clientWidth=0;this._style={};}
  appendChild(node){node.parentNode=this;this.children.push(node);return node;}
  append(...rows){for(const row of rows)this.appendChild(row);}
}
const parent=new FakeElement('main');parent.clientWidth=1200;
global.document={createElement:tag=>new FakeElement(tag),querySelector:()=>null,documentElement:{dataset:{},classList:new ClassList()}};
global.window={document:global.document,addEventListener(){},removeEventListener(){}};
const styleGate={set(node,property,value){node._style[property]=String(value);},setToken(node,property,value){node._style[property]=String(value);},remove(node,property){delete node._style[property];},snapshot(){return{};}};
global.DKDSStyleGate=styleGate;window.DKDSStyleGate=styleGate;
let observers=[];global.ResizeObserver=class{constructor(cb){this.cb=cb;this.nodes=[];observers.push(this);}observe(node){this.nodes.push(node);}disconnect(){this.nodes=[];}};
const {LAYOUT_RECIPES}=require('../src/core/ui/modules/composition/unit-template-spec');
const {LayoutUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-layout');
const cleanups=[],scope={track(fn){cleanups.push(fn);}};const runtime=new LayoutUnitRuntime(scope);

assert(Object.keys(LAYOUT_RECIPES).length>=20,'Expected a mature public layout recipe set.');
assert(!/(?:respar|reswin|pulse-|dc-|dksmb|dkai|ter-|vth)/i.test(JSON.stringify(LAYOUT_RECIPES)),'Layout recipes must be domain blind.');

let node=runtime.createLayout(parent,{variant:'sidebar-main-wide'});
assert.strictEqual(node._style.display,'grid');assert.strictEqual(node._style['grid-template-columns'],'290px minmax(0,1fr)');assert.strictEqual(node._style.gap,'12px');
parent.clientWidth=900;observers.at(-1).cb();assert.strictEqual(node._style['grid-template-columns'],'230px minmax(0,1fr)','wide sidebar recipe must reproduce accepted compact reflow');

parent.clientWidth=700;node=runtime.createLayout(parent,{variant:'form-grid'});assert.strictEqual(node._style['grid-template-columns'],'repeat(3,minmax(128px,1fr))');
parent.clientWidth=950;observers.at(-1).cb();assert.strictEqual(node._style['grid-template-columns'],'repeat(4,minmax(128px,1fr))');assert(!('min-width' in node._style)||node._style['min-width']==='0','Responsive minWidth trigger must not leak into CSS min-width.');
parent.clientWidth=300;observers.at(-1).cb();assert.strictEqual(node._style['grid-template-columns'],'minmax(0,1fr)');

parent.clientWidth=1000;node=runtime.createLayout(parent,{variant:'split-results'});assert.strictEqual(node._style.display,'grid');assert.strictEqual(node._style['grid-template-rows'],'minmax(0,1fr) 8px var(--dkds-unit-results-height,180px)');
parent.clientWidth=900;observers.at(-1).cb();assert.strictEqual(node._style.display,'flex');assert.strictEqual(node._style['flex-direction'],'column');assert.strictEqual(node._style.gap,'8px');


parent.clientWidth=1200;node=runtime.createLayout(parent,{variant:'identity',geometry:{width:'100%',padding:'12px 10px',whiteSpace:'nowrap'},responsiveGeometry:[{maxWidth:760,geometry:{padding:'12px',width:'calc(100vw - 16px)'}}]});
assert.strictEqual(node._style.width,'100%');assert.strictEqual(node._style.padding,'12px 10px');assert.strictEqual(node._style['white-space'],'nowrap');
parent.clientWidth=700;observers.at(-1).cb();assert.strictEqual(node._style.padding,'12px');assert.strictEqual(node._style.width,'calc(100vw - 16px)');
assert.throws(()=>runtime.createLayout(parent,{variant:'identity',geometry:{padding:'13.37px'}}),/UNIT_LAYOUT_GEOMETRY_VALUE_FORBIDDEN/,'Unit layout must reject geometry values outside the accepted vocabulary.');
assert.throws(()=>runtime.createLayout(parent,{variant:'identity',responsiveGeometry:[{maxWidth:777,geometry:{width:'100%'}}]}),/UNIT_LAYOUT_BREAKPOINT_FORBIDDEN/,'Unit layout must reject unpublished responsive breakpoints.');
const decorated=new FakeElement('section');parent.appendChild(decorated);runtime.applyLayout(decorated,{variant:'identity',geometry:{minHeight:'220px',boxSizing:'border-box'}});assert.strictEqual(decorated._style['min-height'],'220px');assert.strictEqual(decorated._style['box-sizing'],'border-box');assert.strictEqual(decorated.dataset.dkdsUnitLayoutDecorator,'true');

for(const fn of cleanups.reverse())fn();
console.log(`SDK 1.51 layout recipe runtime PASS (${Object.keys(LAYOUT_RECIPES).length} recipes)`);
