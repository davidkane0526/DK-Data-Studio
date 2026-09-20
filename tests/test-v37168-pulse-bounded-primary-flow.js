'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const unit=read('src/plugins/pulse-analysis/unit-presentation.js');
const shadow=read('examples/sdk151-unit-pulse-shadow/plugin.js');
const service=read('src/plugins/pulse-analysis/analysis-service.js');
const css=read('src/plugins/pulse-analysis/plugin.css');

// The scientific viewport is bounded at the Unit PlotView contract, not by plugin CSS.
assert(unit.includes("detailGeometry:{contentMinHeightPx:raw?360:320,contentMaxHeightPx:raw?360:320}"),'Production Pulse must bound home result/raw PlotViews through Unit detailGeometry.');
assert(shadow.includes("detailGeometry:{contentMinHeightPx:320,contentMaxHeightPx:320}"),'Pulse shadow result PlotViews must teach the same bounded Unit geometry.');
assert(shadow.includes("detailGeometry:{contentMinHeightPx:360,contentMaxHeightPx:360}"),'Pulse shadow raw PlotView must teach the same bounded Unit geometry.');
assert(unit.includes("geometry:{width:'100%',minWidth:'0',overflow:'hidden'}"),'Production Pulse plot canvas must contain renderer overflow through Layout Unit geometry.');
assert(shadow.includes("geometry:{width:'100%',minWidth:'0',overflow:'hidden'}"),'Pulse shadow plot canvases must contain renderer overflow through Layout Unit geometry.');
assert(!css.includes('.pulse-raw-plot{margin:0;padding:0 4px 6px;overflow:hidden}'),'Renderer containment must not regress to plugin-private CSS.');

// The result table is content-driven, bounded, and has a real empty body.
assert(!unit.includes("units.layout.apply(tablePanel.element,{variant:'fill-rows'})"),'Pulse result table panel must not use a PRIMARY-filling 1fr row.');
assert(unit.includes("variant:'scroll-pane',className:'pulse-table-wrap dkds-table-wrap',geometry:{minHeight:'180px',maxHeight:'330px'}"),'Pulse result table body must retain a compact visible body instead of collapsing to only the header.');
assert(unit.includes("id,'pulseResultEmpty'")||unit.includes("'pulseResultEmpty'"),'Pulse result table must expose an empty-state body node.');
assert(unit.includes("units.emptyState.create(tableEmpty")&&unit.includes("暂无可显示的已分析结果"),'Pulse result table must render an explicit semantic Unit empty state.');
assert(service.includes("empty.classList.toggle('hidden', rows.length > 0)"),'Pulse result rendering must hide the empty-state only when real rows exist.');

// Guard against reusing the potentially corrupted portable geometry namespace.
assert(unit.includes("'pulse-raw-flow-v5':'pulse-result-grid-v6'"),'Production Pulse result/raw PlotViews must use the bounded-flow persistence namespace.');

// Runtime proof: the existing PlotView contract must keep min/max bounded across resize cycles,
// while dock placement releases home geometry to the owning container.
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
}
class FakeElement{
  constructor(tag='div',width=380){this.nodeType=1;this.tagName=String(tag).toUpperCase();this.dataset={};this.style=new StyleDecl();this.children=[];this.parentElement=null;this.parentNode=null;this.clientWidth=width;this._className='';this.classList=new ClassList(this);}
  get className(){return this._className;} set className(v){this._className=String(v);this.classList.set=new Set(this._className.split(/\s+/).filter(Boolean));}
  appendChild(node){node.parentElement=this;node.parentNode=this;this.children.push(node);return node;}
  querySelector(){return null;} querySelectorAll(){return [];} addEventListener(){} removeEventListener(){}
}
const gate={set(el,k,v){el.style.setProperty(k,v);return v;},setToken(el,k,v){el.style.setProperty(k,v);return v;},remove(el,k){el.style.removeProperty(k);},snapshot(){return{};}};
global.DKDSStyleGate=gate;
global.window={DKDSStyleGate:gate,addEventListener(){},removeEventListener(){},ResizeObserver:null};
global.document={documentElement:{classList:{contains(){return false;}},dataset:{}},createElement:tag=>new FakeElement(tag)};
global.ResizeObserver=undefined;
const {LayoutUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-layout');
const tracked=[];const layoutRuntime=new LayoutUnitRuntime({track(fn){tracked.push(fn);}});
const tableHost=new FakeElement('section',900);
const tableBody=layoutRuntime.createLayout(tableHost,{variant:'scroll-pane',geometry:{minHeight:'180px',maxHeight:'330px'}});
assert.strictEqual(tableBody.style.getPropertyValue('min-height'),'180px','Unit result table body must execute the compact 180px minimum.');
assert.strictEqual(tableBody.style.getPropertyValue('max-height'),'330px','Unit result table body must execute the bounded 330px maximum.');

const {PlotView}=require('../src/core/ui/modules/plot-view/chart');
const card=new FakeElement('section'),plot=new FakeElement('div');card.appendChild(plot);
const view=new PlotView({owner:'test',requestChartResize(){}},'bounded',card,{titleless:true,header:false,portable:false,csv:false,copy:false,images:false,plot,contentMinHeight:320,contentMaxHeight:320});
for(let i=0;i<32;i++)view.resize(`loop-${i}`);
assert.strictEqual(plot.style.getPropertyValue('min-height'),'320px','Repeated PlotView resize must retain the 320px Unit home minimum.');
assert.strictEqual(plot.style.getPropertyValue('max-height'),'320px','Repeated PlotView resize must retain the 320px Unit home maximum and cannot grow without bound.');
card.classList.add('is-docked');view.resize('dock');
assert.strictEqual(plot.style.getPropertyValue('min-height'),'','Dock placement must release home minimum geometry.');
assert.strictEqual(plot.style.getPropertyValue('max-height'),'','Dock placement must release home maximum geometry.');
card.classList.remove('is-docked');view.resize('home');
assert.strictEqual(plot.style.getPropertyValue('min-height'),'320px');
assert.strictEqual(plot.style.getPropertyValue('max-height'),'320px');
view.dispose();
for(const fn of tracked.reverse())fn();

console.log('v3.71.68 Pulse bounded PRIMARY flow PASS: bounded PlotViews + compact table body + empty state');
