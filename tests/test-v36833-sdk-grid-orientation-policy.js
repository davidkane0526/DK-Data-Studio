'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const app=json('package.json'),mobile=json('mobile/package.json'),expo=json('mobile/app.json').expo,sdk=json('sdk/contract.json');
assert.strictEqual(mobile.version,app.version);assert.strictEqual(expo.version,app.version);assert(expo.android.versionCode>=68);
assert.strictEqual(sdk.sdkVersion,'1.47.0');assert.strictEqual(sdk.pluginApiVersion,'1.19.0');assert.strictEqual(sdk.minimumAppVersion,'3.68.103');

const dts=read('sdk/plugin-api.d.ts');
for(const token of [
  "export type DKDSGridOrientation='landscape'|'portrait'",
  'export interface DKDSGridOrientationPolicy',
  "mode:'portrait-offset'",
  'orientationPolicy?:DKDSGridOrientationPolicy',
  'preferredColumns?:(context:DKDSGridColumnContext)',
  'getAppliedColumns():number',
  'getOrientation():DKDSGridOrientation',
  'grid(container:Element|string,spec?:DKDSGridSpec):DKDSGridController',
  'grid:DKDSGridRuntime'
])assert(dts.includes(token),`SDK grid type contract missing: ${token}`);

const guide=read('sdk/GRID_LAYOUT.md'),sdkReadme=read('sdk/README.md'),workspaceGuide=read('docs/WORKSPACE_PLUGIN_API.md'),generator=read('scripts/generate-sdk-authoring-reference.js');
for(const phrase of [
  "mode: 'portrait-offset'",
  'applies only on the Native Mobile host',
  'Returning `null`, `undefined`, or `\'auto\'`',
  'Resolution order',
  '`GroupArea` is orthogonal to orientation behavior',
  'Do not recreate Core grid behavior with plugin CSS'
])assert(guide.includes(phrase),`GRID_LAYOUT.md must explain ${phrase}`);
assert(sdkReadme.includes('Managed Grid / GroupArea Layout Contract (SDK 1.28)')&&sdkReadme.includes('GRID_LAYOUT.md')&&sdkReadme.includes('GROUP_AREA.md'));
assert(workspaceGuide.includes('SDK 1.28 managed-grid / GroupArea contract')&&workspaceGuide.includes("orientationPolicy: {"));
assert(generator.includes("'sdk/GRID_LAYOUT.md'")&&generator.includes("'sdk/GROUP_AREA.md'"),'Machine-readable SDK authoring corpus must include GRID_LAYOUT.md and GROUP_AREA.md.');

const source=read('src/core/ui/modules/grid/controller.js');
assert(!source.includes('orientationAdaptive')&&!source.includes('portraitColumnDelta')&&!source.includes('columnPreference'),'Private WIP orientation option names must be removed from Core.');
for(const token of ['orientationPolicy()','preferredColumns','getAppliedColumns()','getOrientation()'])assert(source.includes(token),`Core public Grid implementation missing ${token}`);
const resonance=read('src/plugins/resonance-workbench/feature-group-runtime.js');
assert(resonance.includes('wb.groupArea(hostEl')&&resonance.includes("orientationPolicy:{mode:'portrait-offset',offset:-1,minColumns:1},preferredColumns:groupColumnPreference"),'First-party Resonance must consume the formal GroupArea API and published orientation policy shape.');
assert(resonance.includes('getAppliedColumns?.()')&&resonance.includes('getOrientation?.()'),'First-party Resonance must use the public GridController read API instead of private fields/methods.');
assert(!resonance.includes('.appliedColumns')&&!resonance.includes('.orientation?.()'),'First-party plugin must not consume GridController internals.');

// Execute the public policy semantics in a minimal DOM harness.
class ClassList{constructor(...rows){this.rows=new Set(rows);}add(...rows){rows.forEach(v=>this.rows.add(v));}remove(...rows){rows.forEach(v=>this.rows.delete(v));}contains(v){return this.rows.has(v);}}
class Elem{constructor(doc){this.nodeType=1;this.ownerDocument=doc;this.classList=new ClassList();this.dataset={};this.styles={};this._children=[];this.parentElement=null;this.hidden=false;this.clientWidth=1000;}get children(){return this._children;}get isConnected(){return !!this.parentElement||this===this.ownerDocument?.root;}appendChild(child){if(child.parentElement)child.parentElement._detach(child);this._children.push(child);child.parentElement=this;return child;}insertBefore(child,before){if(child.parentElement)child.parentElement._detach(child);const i=this._children.indexOf(before);if(i<0)this._children.push(child);else this._children.splice(i,0,child);child.parentElement=this;return child;}_detach(child){const i=this._children.indexOf(child);if(i>=0)this._children.splice(i,1);if(child.parentElement===this)child.parentElement=null;}remove(){this.parentElement?._detach(this);}}
const doc={root:null,documentElement:null,createElement(){return new Elem(doc);}};doc.documentElement=new Elem(doc);doc.documentElement.dataset.dkdsHost='mobile';doc.documentElement.classList.add('react-native-client');
const gate={set:(n,k,v)=>{n.styles[k]=v;return true;},setToken:(n,k,v)=>{n.styles[k]=v;return true;},remove:(n,k)=>{delete n.styles[k];return true;}};
class MutationObserver{constructor(){}observe(){}disconnect(){}}
const moduleBox={exports:{}};
const context={module:moduleBox,exports:moduleBox.exports,console,window:{MutationObserver},MutationObserver,document:doc,innerWidth:1200,innerHeight:800,getComputedStyle:()=>({columnGap:'10px',gap:'10px'}),globalThis:null,require:id=>{if(id==='../foundation/shortcuts')return {resolveElement:v=>v};if(id==='ui/style-ownership-gate')return gate;throw new Error(id);}};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'grid/controller.js'});
const GridController=moduleBox.exports.GridController,grid=new Elem(doc);doc.root=grid;let portraitPreference=null;
const controller=new GridController({emitResize(){},requestChartResize(){}},grid,{columns:4,maxColumns:6,minItemWidth:180,responsive:true,orientationPolicy:{mode:'portrait-offset',offset:-1,minColumns:1},preferredColumns:({orientation})=>orientation==='landscape'?4:portraitPreference});
assert.strictEqual(controller.getOrientation(),'landscape');assert.strictEqual(controller.getColumns(),4);assert.strictEqual(controller.getAppliedColumns(),4);
context.innerWidth=800;context.innerHeight=1200;controller.apply();assert.strictEqual(controller.getOrientation(),'portrait');assert.strictEqual(controller.getAppliedColumns(),3,'Portrait without an explicit preference must derive last landscape effective count - 1.');
portraitPreference=2;controller.apply();assert.strictEqual(controller.getAppliedColumns(),2,'Explicit portrait preferredColumns must override portrait-offset derivation.');
context.innerWidth=1200;context.innerHeight=800;controller.apply();assert.strictEqual(controller.getOrientation(),'landscape');assert.strictEqual(controller.getAppliedColumns(),4,'Landscape preference must resolve independently after returning from portrait.');
controller.dispose();

console.log('v3.68.67 SDK 1.28 managed-grid orientation policy contract PASS.');
