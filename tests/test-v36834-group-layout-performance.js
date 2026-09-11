'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));


const feature=read('src/plugins/resonance-workbench/feature-runtime.js');
const group=read('src/plugins/resonance-workbench/feature-group-runtime.js');
const gridSource=read('src/core/ui/modules/grid/controller.js');

assert(!/function resize\(\)[\s\S]{0,700}groupRuntime\.invalidate\(\);renderGroup\(\)/.test(feature),
  'Layout resize must never invalidate and fully rerender Resonance group plots.');
assert(feature.includes("reactiveRuntime.effect('resonance.view.group-layout'")&&feature.includes('groupRuntime.applyLayout?.()'),
  'Group column settings must use a cheap layout-only reactive effect.');
assert(!group.includes('groupGridController?.apply?.();\n      syncGroupColumnAction();'),
  'Normal data render must not manually re-apply GridController and trigger another resize request.');
assert(group.includes("return `${visibleIds.join(',')}##metric:${Number(live.peakMetricSettledRevision)||0}##${peaks}`"),
  'Group data fingerprint may include settled scientific metric revision, but layout/orientation changes must not force data redraw.');
const fingerprintStart=group.indexOf('function groupDataFingerprint()');
const fingerprintBody=group.slice(fingerprintStart,group.indexOf('function renderGroup()',fingerprintStart));
assert(!/groupLayoutKey|effectiveGroupColumns|groupOrientation|orientation|columns/.test(fingerprintBody),
  'Group data fingerprint must stay independent of layout/orientation presentation state.');
assert(group.includes('syncGroupLayout')&&group.includes('groupLayoutKey'),
  'Group layout presentation must be synchronized independently from scientific rendering.');
assert(gridSource.includes("if(key===this.lastApplyKey)return cols"),
  'GridController must make identical apply() calls true no-ops instead of scheduling redundant chart resize work.');

// Executable no-op guard: a second apply with identical width/children/columns
// must not perform another StyleGate write or request another chart resize.
class ClassList{
  constructor(...rows){this.rows=new Set(rows);} add(...rows){rows.forEach(x=>this.rows.add(x));}
  remove(...rows){rows.forEach(x=>this.rows.delete(x));} contains(x){return this.rows.has(x);}
}
class Elem{
  constructor(doc,...classes){this.nodeType=1;this.ownerDocument=doc;this.classList=new ClassList(...classes);this.dataset={};this._children=[];this.parentElement=null;this.hidden=false;this.clientWidth=900;this.id='';}
  get children(){return this._children;} get isConnected(){return !!this.parentElement||this===this.ownerDocument?.root;}
  appendChild(child){if(child.parentElement)child.parentElement._detach(child);this._children.push(child);child.parentElement=this;return child;}
  insertBefore(child,before){if(child.parentElement)child.parentElement._detach(child);const i=this._children.indexOf(before);if(i<0)this._children.push(child);else this._children.splice(i,0,child);child.parentElement=this;return child;}
  _detach(child){const i=this._children.indexOf(child);if(i>=0)this._children.splice(i,1);if(child.parentElement===this)child.parentElement=null;}
  remove(){this.parentElement?._detach(this);}
}
const doc={root:null,documentElement:{dataset:{dkdsHost:'desktop'},classList:new ClassList()},createElement(){return new Elem(doc);}};
let styleWrites=0,chartRequests=0,emits=0;
const gate={set:(node,key,value)=>{styleWrites++;node[key]=value;return true;},setToken:(node,key,value)=>{styleWrites++;node[key]=value;return true;},remove:(node,key)=>{styleWrites++;delete node[key];return true;}};
class MutationObserver{constructor(){}observe(){}disconnect(){}}
class ResizeObserver{constructor(){}observe(){}disconnect(){}}
const moduleBox={exports:{}};
const context={module:moduleBox,exports:moduleBox.exports,console,window:{MutationObserver,ResizeObserver},MutationObserver,ResizeObserver,document:doc,innerWidth:1400,innerHeight:900,globalThis:null,require:id=>{
  if(id==='../foundation/shortcuts')return {resolveElement:value=>value};
  if(id==='ui/style-ownership-gate')return gate;
  throw new Error(id);
}};
context.globalThis=context;vm.createContext(context);vm.runInContext(gridSource,context,{filename:'grid/controller.js'});
const grid=new Elem(doc);doc.root=grid;grid.appendChild(new Elem(doc));grid.appendChild(new Elem(doc));
const controller=new moduleBox.exports.GridController({emitResize(){emits++;},requestChartResize(){chartRequests++;}},grid,{columns:3,maxColumns:6,minItemWidth:200,responsive:true});
const before={styleWrites,chartRequests,emits};
controller.apply();controller.apply();controller.apply();
assert.deepStrictEqual({styleWrites,chartRequests,emits},before,'Repeated identical GridController.apply() calls must be no-ops.');
controller.dispose();

console.log('v3.68.67 group layout performance regression PASS: resize is resize-only, layout/data invalidation are separated, and identical grid apply calls are no-ops.');
