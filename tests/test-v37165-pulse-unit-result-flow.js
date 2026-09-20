'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

class StyleDecl{
  constructor(){this.map=new Map();}
  setProperty(k,v){this.map.set(String(k),String(v));}
  removeProperty(k){this.map.delete(String(k));}
  getPropertyValue(k){return this.map.get(String(k))||'';}
  get height(){return this.getPropertyValue('height');} set height(v){this.setProperty('height',v);}
  get minHeight(){return this.getPropertyValue('min-height');} set minHeight(v){this.setProperty('min-height',v);}
  get maxHeight(){return this.getPropertyValue('max-height');} set maxHeight(v){this.setProperty('max-height',v);}
}
class ClassList{
  constructor(owner){this.owner=owner;this.set=new Set();}
  add(...rows){for(const row of rows)if(row)this.set.add(String(row));this.owner._className=[...this.set].join(' ');}
  remove(...rows){for(const row of rows)this.set.delete(String(row));this.owner._className=[...this.set].join(' ');}
  contains(row){return this.set.has(String(row));}
  reset(text=''){this.set=new Set(String(text||'').split(/\s+/).filter(Boolean));this.owner._className=[...this.set].join(' ');}
}
class FakeElement{
  constructor(tag='div',width=0){this.nodeType=1;this.tagName=String(tag).toUpperCase();this.dataset={};this.style=new StyleDecl();this.children=[];this.parentElement=null;this.parentNode=null;this.clientWidth=width;this._className='';this.classList=new ClassList(this);this.attributes=new Map();}
  get className(){return this._className;} set className(v){this.classList.reset(v);}
  appendChild(node){if(node.parentElement){const i=node.parentElement.children.indexOf(node);if(i>=0)node.parentElement.children.splice(i,1);}node.parentElement=this;node.parentNode=this;this.children.push(node);return node;}
  append(...nodes){for(const node of nodes)this.appendChild(node);}
  replaceChildren(...nodes){for(const child of this.children){child.parentElement=null;child.parentNode=null;}this.children=[];for(const node of nodes)this.appendChild(node);}
  querySelector(){return null;}
  querySelectorAll(){return [];}
  setAttribute(k,v){this.attributes.set(String(k),String(v));}
  getAttribute(k){return this.attributes.get(String(k))||null;}
  addEventListener(){}
  removeEventListener(){}
  contains(node){for(let p=node;p;p=p.parentElement)if(p===this)return true;return false;}
}

const gate={
  set(el,k,v){el.style.setProperty(k,v);return v;},
  setToken(el,k,v){el.style.setProperty(k,v);return v;},
  remove(el,k){el.style.removeProperty(k);},
  snapshot(){return{};}
};
global.DKDSStyleGate=gate;
global.window={DKDSStyleGate:gate,DKDSPlotPresentation:null,addEventListener(){},removeEventListener(){},ResizeObserver:null};
global.document={createElement:tag=>new FakeElement(tag),querySelector(){return null;},documentElement:{classList:{contains(){return false;}},dataset:{}}};
global.ResizeObserver=undefined;

const pkg=json('package.json');
const app=json('mobile/app.json');
const pulse=json('src/plugins/pulse-analysis/plugin.json');
assert(/^3\.71\.(?:6[5-9]|[7-9]\d|\d{3,})$/.test(pkg.version),'App version must retain v3.71.65+ Pulse Unit result-flow baseline.');
assert(Number(app.expo.android.versionCode)>=206,'Android versionCode must retain v3.71.65+ baseline.');
assert(/^2\.12\.(?:[5-9]|\d{2,})$/.test(pulse.version),'Pulse Analysis version must retain the v2.12.5+ Unit result-flow baseline.');

const {UNIT_TEMPLATE_SPEC_VERSION,UNIT_CATALOG,LAYOUT_RECIPES}=require('../src/core/ui/modules/composition/unit-template-spec');
assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38','This closure must reuse the current Unit contract rather than rev the catalog for a Pulse-specific fix.');
assert.strictEqual(Object.keys(UNIT_CATALOG).length,41,'No Pulse-specific Unit may be added.');
assert.strictEqual(Object.keys(LAYOUT_RECIPES).length,73,'The accepted Layout recipe catalog must stay at 73.');

const unit=read('src/plugins/pulse-analysis/unit-presentation.js');
const shadow=read('examples/sdk151-unit-pulse-shadow/plugin.js');
const css=read('src/plugins/pulse-analysis/plugin.css');
const mobile=read('src/plugins/pulse-analysis/mobile.css');
for(const source of [unit,shadow]){
  assert(source.includes("variant:'two-card-grid'"),'Production and Unit-only shadow must compose result plots with the generic two-card Layout Unit.');
  assert(source.includes("maxWidth:520,geometry:{gridTemplateColumns:'minmax(0,1fr)'}"),'Production and shadow must collapse only at the explicit Unit <=520px PRIMARY breakpoint.');
  assert(source.includes('contentMinHeightPx')&&source.includes('320'),'Production and shadow must express result PlotView intrinsic height through Unit detailGeometry.');
  assert(!source.includes('pulse-results-table-height-v3')&&!source.includes('pulse-shadow-results-table-height-v3'),'Production and shadow must keep result/table/raw content in one sequential PRIMARY flow.');
}
for(const source of [css,mobile])for(const selector of ['.pulse-results-split{','.pulse-results-grid{','.pulse-result-card{','.pulse-result-plot{','.pulse-results-table-card{','.pulse-table-wrap{'])
  assert(!source.includes(selector),`Authored Pulse CSS may not own result-flow geometry after Unit cutover: ${selector}`);

// Runtime proof 1: the existing PlotView detail-geometry execution service must
// honor contentMinHeight with no aspect ratio. This is the exact contract the
// Pulse result plots now consume; it replaces the v3.71.64 private CSS workaround.
const {PlotView}=require('../src/core/ui/modules/plot-view/chart');
const card=new FakeElement('section',380),plot=new FakeElement('div',380);card.appendChild(plot);
const scope={owner:'test',requestChartResize(){}};
const view=new PlotView(scope,'unit-min-height',card,{titleless:true,header:false,portable:false,csv:false,copy:false,images:false,plot,contentMinHeight:320});
assert.strictEqual(plot.style.getPropertyValue('min-height'),'320px','Unit-translated PlotView minimum must become real runtime geometry.');
card.classList.add('is-docked');view.resize('dock-test');
assert.strictEqual(plot.style.getPropertyValue('min-height'),'','Dock/portable placement must release home-only intrinsic geometry to the owning container.');
card.classList.remove('is-docked');view.resize('home-test');
assert.strictEqual(plot.style.getPropertyValue('min-height'),'320px','Returning home must restore Unit-authored intrinsic geometry.');
view.dispose();
assert.strictEqual(plot.style.getPropertyValue('min-height'),'','PlotView disposal must release the runtime geometry write.');

// Runtime proof 2: Unit Layout measures projected PRIMARY width, not device
// viewport. The built-in recipe normally collapses at 680; accepted plugin detail
// geometry keeps Pulse at two columns until its explicit <=520 threshold.
const {LayoutUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-layout');
const cleanups=[];const layoutScope={track(fn){cleanups.push(fn);}};const layoutRuntime=new LayoutUnitRuntime(layoutScope);
function buildGrid(primaryWidth){
  const primary=new FakeElement('main',primaryWidth),visual=new FakeElement('div',primaryWidth);primary.appendChild(visual);
  return layoutRuntime.createLayout(visual,{variant:'two-card-grid',responsiveTarget:primary,geometry:{gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'14px',width:'100%',minWidth:'0'},responsiveGeometry:[{maxWidth:980,geometry:{gap:'8px'}},{maxWidth:520,geometry:{gridTemplateColumns:'minmax(0,1fr)'}}]});
}
const wide=buildGrid(600),narrow=buildGrid(500);
assert.strictEqual(wide.style.getPropertyValue('grid-template-columns'),'repeat(2,minmax(0,1fr))','A 600px projected PRIMARY must keep both Pulse result plots in one row.');
assert.strictEqual(wide.style.getPropertyValue('gap'),'8px','Tablet-class projected PRIMARY must receive the compact Unit gap.');
assert.strictEqual(narrow.style.getPropertyValue('grid-template-columns'),'minmax(0,1fr)','A 500px projected PRIMARY must collapse to one column.');

// Runtime proof 3 is intentionally structural: Pulse no longer uses a PRIMARY-filling SplitPane.
assert(unit.includes("const visual=units.layout.create(primaryMain")&&unit.includes("const tablePanel=units.panel.create(visual")&&unit.includes("createPlotCard(visual,{viewId:'raw'"),'Production Pulse must append compare/results, table and raw diagnostic to the same PRIMARY flow in order.');
assert(shadow.includes("const visual=units.layout.create(main")&&shadow.includes("const tablePanel=units.panel.create(main")&&shadow.includes("const rawPanel=units.panel.create(main"),'Unit-only shadow must teach the same sequential PRIMARY structure.');

for(const fn of [...cleanups.reverse()])fn();
console.log('v3.71.67 Pulse Unit sequential PRIMARY flow PASS: PlotView detail geometry + PRIMARY-responsive Layout + content flow');
