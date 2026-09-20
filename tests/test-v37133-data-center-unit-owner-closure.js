'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=require('../package.json');
const dc=require('../src/plugins/data-center/plugin.json');
const atLeast=(value,min)=>{const a=String(value).split('.').map(Number),b=String(min).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;};
assert(atLeast(pkg.version,'3.71.33'),'v3.71.33+ source required.');
assert(atLeast(dc.version,'1.15.27'),'Data Center 1.15.27+ required.');

const presentation=read('src/plugins/data-center/unit-presentation.js');
const pluginCss=read('src/plugins/data-center/plugin.css');
const chartRuntime=read('src/plugins/data-center/chart-runtime.js');
const featureRuntime=read('src/plugins/data-center/feature-runtime.js');
const parameter=read('src/core/data/parameter-schema.js');
const schemaCss=read('src/styles/structure/schema-and-plugin-ui.css');
const appearance=read('src/styles/theme/component-appearance.css');
const layoutRuntime=read('src/core/ui/modules/composition/unit-template-layout.js');
const foundation=read('src/core/ui/modules/composition/unit-template-foundation.js');
const shadow=read('examples/sdk151-unit-data-center-shadow/plugin.js');
const sdkTypes=read('sdk/plugin-api.d.ts');

// Pass 1: production source-parity composition must not stack a Unit geometry
// recipe on top of the accepted Data Center detail stylesheet.
for(const token of [
  "variant:'identity',className:'dc-filter-stack'",
  "variant:'identity',className:'dc-filter-row'",
  "variant:'identity',className:'dc-selection-tools'",
  "variant:'identity',className:'dc-main'",
  "variant:'identity',className:'dc-table-preview'",
  "variant:'row',className:'dc-preview-note-row',geometry:{justifyContent:'flex-end',boxSizing:'border-box',width:'100%',padding:'0 20px 4px 12px'}",
  "variant:'identity',className:'dc-formula-refs'",
  "variant:'identity',className:'dc-workflow-steps'",
  "variant:'identity',className:'dc-provenance-list'"
]) assert(presentation.includes(token),`Accepted-detail host must use Unit identity: ${token}`);
assert(!presentation.includes("const toolHost="),'Unit cutover must not insert a wrapper between .dc-main and accepted tool panes.');
for(const name of ['formulaPanel','workflowPanel','provenancePanel'])assert(presentation.includes(`const ${name}=units.panel.create(main,`),`${name} must be a direct .dc-main child.`);
assert(presentation.includes("const artifactList=units.list.create(objects.element"),'Artifact list must not gain a duplicate Unit geometry wrapper.');
assert(pluginCss.includes('.dc-main:has(>.dc-chart-pane[data-placement="home"])')&&pluginCss.includes('--dc-main-areas:"source source" "tool chart"'),'Accepted side-by-side main grid must remain the single detail owner.');

// Pass 2: ParameterForm has one generic outer-grid owner. The host-owned mode
// is guarded at the Unit boundary; it is not a Data Center-specific exception.
assert(foundation.includes("if(!['core','host'].includes(layoutOwner))throw new Error(`UNIT_PARAMETER_FORM_LAYOUT_OWNER_FORBIDDEN: ${layoutOwner}`)"),'ParameterForm must validate the generic owner mode.');
assert(foundation.includes("UNIT_PARAMETER_FORM_HOST_LAYOUT_REQUIRES_LAYOUT_UNIT"),'Host-owned ParameterForm layout must require a Layout Unit host.');
assert(parameter.includes("classList.toggle('layout-host-owned',String(layoutOwner||'core')==='host')"),'ParameterSchema must expose the generic host-owned marker.');
assert(schemaCss.includes('.schema-parameter-panel:not(.layout-host-owned)')&&schemaCss.includes('.schema-parameter-panel.auto-fit.compact:not(.layout-host-owned)'),'Core default grids must be mutually exclusive with host-owned detail grids.');
assert(chartRuntime.includes("compact:true,autoFit:true,layoutOwner:'host'"),'Chart ParameterForm must use generic host ownership.');
assert(featureRuntime.includes("context:{table:a},layoutOwner:'host'"),'Formula ParameterForm must use generic host ownership.');
assert(!chartRuntime.includes("layoutOwner:'plugin'")&&!featureRuntime.includes("layoutOwner:'plugin'"),'No plugin-identity owner mode may exist.');

// The Unit API remains general: nested responsive layout may explicitly measure
// a semantic ancestor rather than its own already-shrunk local content width.
assert(layoutRuntime.includes('requestedResponsiveTarget=spec.responsiveTarget??null')&&layoutRuntime.includes("node.dataset.dkdsUnitLayoutResponsiveTarget='external'"),'Layout Unit must support a generic responsiveTarget.');
assert(sdkTypes.includes('responsiveTarget?:Element|string'),'responsiveTarget must be public SDK surface.');
assert(shadow.includes("variant:'primary-flow',responsiveTarget:body"),'Public Unit-only Data Center shadow must exercise ancestor-responsive layout instead of a special Unit.');

// Runtime proof: primary-flow evaluates the requested external width. A 1200 px
// workspace must select the accepted two-column recipe even when the local host
// is only 700 px wide.
class ClassList{constructor(){this.values=new Set();}add(...rows){for(const row of rows)this.values.add(row);}}
class FakeElement{constructor(width=0){this.nodeType=1;this.clientWidth=width;this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this._style={};}appendChild(node){node.parentNode=this;this.children.push(node);return node;}append(...rows){for(const row of rows)this.appendChild(row);}}
global.document={createElement:()=>new FakeElement(),querySelector:()=>null,documentElement:{dataset:{},classList:new ClassList()}};global.window={document:global.document,addEventListener(){},removeEventListener(){}};
const styleGate={set(node,property,value){node._style[property]=String(value);},remove(node,property){delete node._style[property];},snapshot(){return{};}};global.DKDSStyleGate=styleGate;window.DKDSStyleGate=styleGate;
const observers=[];global.ResizeObserver=class{constructor(cb){this.cb=cb;observers.push(this);}observe(){}disconnect(){}};
const {LayoutUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-layout');
const cleanups=[],runtime=new LayoutUnitRuntime({track(fn){cleanups.push(fn);}}),parent=new FakeElement(700),workspace=new FakeElement(1200);
const main=runtime.createLayout(parent,{variant:'primary-flow',responsiveTarget:workspace});
assert.strictEqual(main._style['grid-template-columns'],'minmax(360px,520px) minmax(520px,1fr)','responsiveTarget must preserve side-by-side layout from semantic workspace width.');
workspace.clientWidth=1000;observers.at(-1).cb();
assert.strictEqual(main._style['grid-template-columns'],'minmax(0,1fr)','responsiveTarget must still reflow below the accepted threshold.');
for(const fn of cleanups.reverse())fn();

// Disclosure and preview-note regressions are protected by owner-level checks.
assert(parameter.includes("const caret=$create('span','dkds-select-caret')")&&!parameter.includes("caret.textContent='⌄'"),'ParameterSchema must use the canonical structural caret.');
assert(!appearance.includes('background-size:6px 6px,6px 6px'),'The rejected two-gradient/bow-tie caret must stay removed.');
assert(!pluginCss.includes('.dc-preview-note-row{'),'Preview count must not regain a second CSS geometry owner.');

// No Data Center identity is allowed into Core while these generic contracts are added.
for(const rel of ['src/core/ui/modules/composition/unit-template-layout.js','src/core/ui/modules/composition/unit-template-foundation.js','src/core/data/parameter-schema.js','src/styles/structure/schema-and-plugin-ui.css','src/styles/theme/component-appearance.css']){
  const text=read(rel);assert(!/\.dc-|data-center/i.test(text),`${rel} must remain Data Center blind.`);
}
const {UNIT_CATALOG}=require('../src/core/ui/modules/composition/unit-template-spec');
assert.strictEqual(Object.keys(UNIT_CATALOG).length,41,'Unit catalog must remain 41 types; no Unit_for_DataCenter may be added.');
console.log('v3.71.33 Data Center Unit owner closure PASS');
