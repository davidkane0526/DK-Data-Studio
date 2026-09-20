'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const {LAYOUT_RECIPES}=require('../src/core/ui/modules/composition/unit-template-layout-spec');

// Accepted Pulse action density: four actions remain one row at normal PRIME widths.
assert.strictEqual(LAYOUT_RECIPES['action-grid-4'].gridTemplateColumns,'repeat(4,minmax(0,1fr))');
assert.deepStrictEqual(LAYOUT_RECIPES['action-grid-4'].responsive,[{maxWidth:280,gridTemplateColumns:'repeat(2,minmax(0,1fr))'}]);
assert.deepStrictEqual(LAYOUT_RECIPES['segment-bar'],{
  display:'flex',alignItems:'center',justifyContent:'space-between',gapPx:8,padding:'6px 10px 4px',minWidth:0
});

const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
for(const token of [
  '[data-dkds-unit-template="tabs-v2"][data-dkds-unit-variant="compact"]{display:inline-flex;gap:3px;padding:3px;box-sizing:border-box}',
  '[data-dkds-unit-template="tabs-v2"]>.dkds-surface-tabs{display:flex;align-items:center;flex-wrap:nowrap;min-width:0}',
  '[data-dkds-unit-template="tabs-v2"][data-dkds-unit-variant="compact"]>.dkds-surface-tabs{gap:3px}',
  '[data-dkds-unit-template="tabs-v2"][data-dkds-unit-variant="compact"] [role="tab"]{min-width:42px;min-height:30px;height:30px;padding:0 10px}'
])assert(structure.includes(token),`Compact Tabs accepted geometry missing: ${token}`);
const appearance=read('src/styles/theme/component-appearance.css');
const compactBlock=appearance.match(/body\.dkds-modern-ui \[data-dkds-unit-template="tabs-v2"\]\[data-dkds-unit-variant="compact"\] \[data-dkds-component-identity="tab"\]\{[\s\S]*?\n\}/)?.[0]||'';
assert(compactBlock.includes('--dkds-ca-tab-surface-selected:var(--dkui-component-toolbar-action-surface-active'),'Compact Tabs selected paint must match accepted toolbar active paint.');
assert(compactBlock.includes('--dkds-ca-tab-shadow-selected:var(--dkui-component-toolbar-action-shadow-active'),'Compact Tabs selected shadow must match accepted toolbar active shadow.');
assert(compactBlock.includes('border-radius:var(--dkui-component-toolbar-action-radius'),'Compact Tabs radius must match accepted toolbar-action radius.');

// Minimal DOM runtime checks: ordinary Toolbar must stay ordinary, and Unit Panels
// must explicitly request a material role rather than relying on a later scanner.
class ClassList{constructor(){this.values=new Set();}add(...rows){for(const row of rows)for(const v of String(row||'').split(/\s+/).filter(Boolean))this.values.add(v);}contains(v){return this.values.has(v);}}
class FakeElement{
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this.parentElement=null;this.attributes={};this.textContent='';this.className='';}
  appendChild(node){if(node&&typeof node==='object'){node.parentNode=this;node.parentElement=this;}this.children.push(node);return node;}
  append(...rows){for(const row of rows)this.appendChild(row);}
  setAttribute(k,v){this.attributes[k]=String(v);}addEventListener(){}
}
const oldDocument=global.document,oldWindow=global.window,oldMaterial=global.DKDSMaterialSurface,oldStyleGate=global.DKDSStyleGate;
const fakeDocument={createElement:tag=>new FakeElement(tag),createTextNode:text=>({nodeType:3,textContent:String(text)}),querySelector:()=>null};
global.document=fakeDocument;global.window={document:fakeDocument,addEventListener(){},removeEventListener(){}};
const styleGate={set(){},setToken(){},remove(){},snapshot(){return{};}};global.DKDSStyleGate=styleGate;global.window.DKDSStyleGate=styleGate;
const material=[];global.DKDSMaterialSurface={apply(node,role){material.push([node,role]);node.dataset.dkdsMaterialRole=role;}};global.window.DKDSMaterialSurface=global.DKDSMaterialSurface;
try{
  delete require.cache[require.resolve('../src/core/ui/modules/composition/unit-template-foundation')];
  const {FoundationUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-foundation');
  const runtime=new FoundationUnitRuntime({actions:{mount(){return null;}},track(){}});
  const host=new FakeElement();
  const toolbar=runtime.createToolbar(host,{variant:'ordinary'}).element;
  assert.strictEqual(toolbar.className,'dkds-toolbar','Ordinary Toolbar must not inherit integrated chrome geometry/paint.');
  assert.strictEqual(toolbar.dataset.dkdsMaterialIntegrated,undefined);
  const panel=runtime.createPanel(host,{variant:'plain',header:false}).element;
  assert(panel.classList.contains('dkds-material-role-surface'),'Plain Unit Panel must immediately declare the Core surface material role.');
  assert.strictEqual(material.length,0,'Detached Unit Panel must defer expensive semantic material assignment until composition connects it.');
  const tabs=runtime.createTabs(host,{variant:'compact',items:[]}).element;
  assert.strictEqual(tabs.dataset.dkdsUnitVariant,'compact');
} finally {global.document=oldDocument;global.window=oldWindow;global.DKDSMaterialSurface=oldMaterial;global.DKDSStyleGate=oldStyleGate;}

const pulse=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
for(const token of [
  "units.tabs.create(designerHeader.actions,{variant:'compact'",
  "units.layout.create(designerTop,{variant:'action-grid-4'})",
  "units.toolbar.create(designerTop,{variant:'ordinary'})",
  "units.layout.apply(segmentBar,{variant:'segment-bar'})",
  "units.panel.create(main,{variant:'plain',header:false,sizing:'content'})",
  "const commandSurface=units.layout.create(analysis.body,{variant:'identity'"
])assert(pulse.includes(token),`Pulse accepted Unit composition missing ${token}`);
assert(!pulse.includes('plugin.css')&&!pulse.includes('mobile.css'),'Pulse visual parity must not be repaired through private CSS.');

console.log('v3.71.45 Pulse basic visual parity contract PASS');
