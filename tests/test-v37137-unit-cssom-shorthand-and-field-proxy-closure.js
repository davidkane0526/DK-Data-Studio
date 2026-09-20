'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=require('../package.json');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.71.37'),'v3.71.37+ source required.');

const workbenchCss=read('src/styles/structure/analysis-workbench.css');
const layoutSource=read('src/core/ui/modules/composition/unit-template-layout.js');
const dc=read('src/plugins/data-center/unit-presentation.js');

// A popup multi-select is physically a button but semantically a Field. The
// generic AnalysisWorkbench button geometry must never touch that Field proxy.
assert(/\.dkds-analysis-workbench button:not\(\s*\.dkds-field-control,/.test(workbenchCss),
  'AnalysisWorkbench generic button geometry must exclude canonical Field proxy buttons.');
assert(workbenchCss.includes('min-height:var(--dkds-workbench-button-min-height)')&&workbenchCss.includes('padding:4px var(--plugin-control-pad-x)'),
  'The generic button fallback remains available for real workbench actions.');

// Unit Layout supports shorthand geometry. Applying a shorthand and then
// removing every corresponding longhand through CSSOM destroys the shorthand.
// The runtime must reconcile each shorthand family atomically.
for(const token of [
  "padding:Object.freeze(['padding-top','padding-right','padding-bottom','padding-left'])",
  "margin:Object.freeze(['margin-top','margin-right','margin-bottom','margin-left'])",
  "inset:Object.freeze(['top','right','bottom','left'])",
  "overflow:Object.freeze(['overflow-x','overflow-y'])",
  "gap:Object.freeze(['row-gap','column-gap'])"
]) assert(layoutSource.includes(token),`Missing CSSOM shorthand family: ${token}`);
assert(layoutSource.includes('for(const property of members)remove(node,property);\n      set(node,shorthand,active[shorthand]);'),
  'Runtime must clear stale longhands before writing an active shorthand.');
assert(layoutSource.includes('remove(node,shorthand);\n      for(const property of members){if(active[property]!==undefined)set(node,property,active[property]);else remove(node,property);}'),
  'Runtime must clear a stale shorthand before writing active longhands.');
assert(dc.includes("padding:'0 20px 4px 12px'"),'Data Center preview count must retain its generic Unit-owned 20 px right inset declaration.');

// Runtime operation-order proof. A shorthand write must be the final operation
// in its family, otherwise CSSStyleDeclaration.removeProperty(longhand) can
// erase one side of the newly written shorthand in the real browser.
class ClassList{constructor(){this.values=new Set();}add(...rows){for(const row of rows)for(const token of String(row||'').split(/\s+/).filter(Boolean))this.values.add(token);}}
class FakeElement{constructor(width=900){this.nodeType=1;this.clientWidth=width;this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this.parentElement=null;}appendChild(node){node.parentNode=this;node.parentElement=this;this.children.push(node);return node;}append(...rows){for(const row of rows)this.appendChild(row);}}
global.document={createElement:()=>new FakeElement(),querySelector:()=>null};global.window={document:global.document,addEventListener(){},removeEventListener(){}};
const operations=[];
const styleGate={
  set(node,property,value){operations.push(['set',property,String(value)]);},
  remove(node,property){operations.push(['remove',property]);},
  snapshot(){return{};}
};
global.DKDSStyleGate=styleGate;window.DKDSStyleGate=styleGate;
delete require.cache[require.resolve('../src/core/ui/modules/composition/unit-template-layout')];
const {LayoutUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-layout');
const cleanups=[],runtime=new LayoutUnitRuntime({track(fn){cleanups.push(fn);}}),host=new FakeElement(900);
operations.length=0;
runtime.createLayout(host,{variant:'row',geometry:{justifyContent:'flex-end',boxSizing:'border-box',width:'100%',padding:'0 20px 4px 12px'}});
const padOps=operations.filter(([,property])=>property==='padding'||property.startsWith('padding-'));
assert.deepStrictEqual(padOps.slice(-5),[
  ['remove','padding-top'],['remove','padding-right'],['remove','padding-bottom'],['remove','padding-left'],['set','padding','0 20px 4px 12px']
],'Padding shorthand must be the last write in its family; no longhand removal may follow it.');
for(const fn of cleanups.reverse())fn();

console.log('v3.71.37 Unit CSSOM shorthand / Field proxy closure PASS');
