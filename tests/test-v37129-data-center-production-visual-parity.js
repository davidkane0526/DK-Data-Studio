'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=file=>fs.readFileSync(file,'utf8');
const pkg=require('../package.json');
const dcManifest=require('../src/plugins/data-center/plugin.json');
const presentation=read('src/plugins/data-center/unit-presentation.js');
const workbenchSource=read('src/core/ui/modules/workbench/analysis.js');
const dcCss=read('src/plugins/data-center/plugin.css');
const dcMobile=read('src/plugins/data-center/mobile.css');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.71.29'),'v3.71.29+ source required.');
assert(atLeast(dcManifest.version,'1.15.24'),'Data Center 1.15.24+ required.');

// Source-parity rule: the accepted Data Center rail geometry is a plugin detail
// owner. Unit composition adopts those hosts with identity layout, so there is
// never a second runtime grid/breakpoint owner fighting the accepted CSS.
assert(presentation.includes("variant:'identity',className:'dc-filter-row'"),'Data Center filter row must be a Unit identity host.');
assert(presentation.includes("variant:'identity',className:'dc-selection-tools'"),'Data Center selection row must be a Unit identity host.');
assert(!/className:'dc-filter-row'[^\n]*(?:geometry|responsiveGeometry)/.test(presentation),'Filter row must not have a second Unit geometry owner.');
assert(!/className:'dc-selection-tools'[^\n]*(?:geometry|responsiveGeometry)/.test(presentation),'Selection row must not have a second Unit geometry owner.');
assert(dcCss.includes('.dc-filter-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;min-width:0}'),'Accepted Desktop filter row remains two columns.');
assert(dcCss.includes('.dc-selection-tools{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;min-width:0}'),'Accepted Desktop selection row remains four columns.');
assert(dcMobile.includes('.dc-filter-row{\n  grid-template-columns:repeat(2,minmax(0,1fr));gap:5px\n}')&&!dcMobile.includes('@container data-center-artifacts-mobile (max-width:339px)'),'Mobile hierarchy/field filters must remain one two-column row across every valid Drawer width.');

// Both production PRIME surfaces remain semantic surfaces; Desktop workspace
// navigation is hidden so no duplicate Data/Chart commands are generated.
assert(presentation.includes("units.workspace.create(workspaceHost,{variant:'standard',header:false,navigation:'hidden'"),'Data Center must suppress duplicate PluginWorkspace navigation chrome.');
assert(presentation.includes("id:'data-control',label:'数据'")&&presentation.includes("autoOpen:true,defaultPlacement:'left'"),'Data-control PRIME remains visible.');
assert(presentation.includes("id:'chart-preview',label:'图形预览'")&&presentation.includes("inlineHost:main,autoOpen:true"),'Chart PRIME must auto-open into the authored main flow.');
assert(presentation.includes("defaultPlacement:'inline',placements:['inline','right','bottom','float','global']"),'Chart PRIME must retain inline/dock/float placement.');
assert(workbenchSource.includes("if(row.inlineHost){const el=resolveElement(row.inlineHost,this.shell)||resolveElement(row.inlineHost,this.root);if(el)return el;}"),'PluginWorkspace must honor the authored inline host.');
assert(dcCss.includes('.dc-main:has(>.dc-chart-pane[data-placement="home"])')&&dcCss.includes('--dc-main-areas:"source source" "tool chart"'),'Accepted side-by-side home geometry remains in the single plugin detail owner.');

// Runtime proof: an identity Layout Unit writes no grid geometry. This is the
// negative evidence that the plugin stylesheet is not being overridden.
class ClassList{constructor(){this.values=new Set();}add(...v){for(const x of v)this.values.add(x);}}
class FakeElement{constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this.clientWidth=336;this._style={};}appendChild(node){node.parentNode=this;this.children.push(node);return node;}append(...rows){for(const row of rows)this.appendChild(row);}}
const parent=new FakeElement('main');
global.document={createElement:tag=>new FakeElement(tag),querySelector:()=>null,documentElement:{dataset:{},classList:new ClassList()}};
global.window={document:global.document,addEventListener(){},removeEventListener(){}};
const styleGate={set(node,property,value){node._style[property]=String(value);},setToken(node,property,value){node._style[property]=String(value);},remove(node,property){delete node._style[property];},snapshot(){return{};}};
global.DKDSStyleGate=styleGate;window.DKDSStyleGate=styleGate;
const {LayoutUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-layout');
const cleanup=[],runtime=new LayoutUnitRuntime({track(fn){cleanup.push(fn);}});
const node=runtime.createLayout(parent,{variant:'identity',className:'dc-filter-row'});
assert.strictEqual(node._style['grid-template-columns'],undefined,'Identity Unit must not write plugin-owned grid columns.');
for(const fn of cleanup.reverse())fn();
console.log('v3.71.29 Data Center production visual parity regression closure PASS');
