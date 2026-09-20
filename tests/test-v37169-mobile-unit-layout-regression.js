'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
{const [a,b,c]=pkg.version.split('.').map(Number);assert(a>3||(a===3&&(b>71||(b===71&&c>=69))),'v3.71.69+ Mobile/Unit regression closure required.');}
assert(Number(json('mobile/app.json').expo.android.versionCode)>=210,'Android versionCode must advance for v3.71.69.');

const presenterSource=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const workspaceSource=read('src/core/ui/modules/layout/workspace.js');
const nativeCss=read('src/styles/platform/native-workspace-presentation.css');
const layoutSpec=read('src/core/ui/modules/composition/unit-template-layout-spec.js');
const sampler=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
const pulse=read('src/plugins/pulse-analysis/unit-presentation.js');
const pulseMobile=read('src/plugins/pulse-analysis/mobile.css');
const pulseCss=read('src/plugins/pulse-analysis/plugin.css');
const shadow=read('examples/sdk151-unit-pulse-shadow/plugin.js');

// A. Parameter Drawer width is solved from Unit semantics + rendered overflow.
// This fitter is deliberately Drawer-only; Curve Inspector keeps its established
// SplitController/PortableView geometry and is not part of this experiment.
assert(presenterSource.includes('drawer-width.v12.'),'Drawer sizing must use the post-greedy/post-binary persistence namespace.');
assert(presenterSource.includes('solveMinimumReasonableWidth(frame,region='),'Presenter must expose the Drawer minimum-reasonable-width solver.');
assert(presenterSource.includes("if(region!=='drawer')return this.surfaceAvailableWidth(frame,region)"),'Automatic content fitting must not own Inspector geometry.');
assert(presenterSource.includes('measureSurfaceOverflow(frame)'),'Presenter must measure final reflowed Drawer content rather than infer width from viewport ratios.');
assert(!/Math\.round\(viewport\*\.[0-9]+\)/.test(presenterSource),'Presenter must not derive first-open Drawer width from a viewport ratio.');
assert(!presenterSource.includes('fitCompanionRight(frame)'),'Curve Inspector must remain decoupled from the Drawer width solver.');
assert(!nativeCss.includes('width:min(32vw,420px'),'Drawer CSS must not own an automatic percentage/cap width.');
assert(!nativeCss.includes('var(--dkds-mobile-user-right-track,30vw)'),'Inspector companion must not use the retired 30vw default.');
const companionRule=nativeCss.match(/\[data-dkds-mobile-companion-right="true"\] \.dkds-plugin-canvas-frame\{[^}]+\}/)?.[0]||'';
assert(companionRule.includes('var(--dkds-plugin-canvas-right-width'),'Semantic inspector and the visible split seam must retain the canonical right-track token.');
assert(workspaceSource.includes('setRuntimeMinimum(value')&&workspaceSource.includes('setRuntimeDefault(value'),'Generic SplitController runtime APIs may remain available, but Drawer fitting must not call them for Inspector.');

// B. Pulse Sampler extraction controls remain the shared analysis-control-grid.
assert(sampler.includes("variant:'analysis-control-grid'"),'Pulse Sampler must consume the generic Unit extraction-grid recipe.');
assert(sampler.includes("fieldControl(extractionGrid,{id:'sourceId',label:'工程数据'"),'Regression fixture must contain the engineering-data field.');
assert(!/fieldControl\(extractionGrid,\{id:'sourceId'[^\n]*wide:true/.test(sampler),'Engineering data must not claim a full grid row.');
assert(layoutSpec.includes("maxWidth:1120,gridTemplateColumns:'repeat(4,minmax(0,1fr))'"),'Shared extraction grid must retain its canonical four-column tablet stage.');
assert(layoutSpec.includes("maxWidth:840,gridTemplateColumns:'repeat(3,minmax(0,1fr))'"),'Shared extraction grid must retain its canonical three-column compact stage.');
assert(layoutSpec.includes("maxWidth:620,gridTemplateColumns:'repeat(2,minmax(0,1fr))'"),'Shared extraction grid must retain its canonical two-column narrow stage.');

// C. Pulse compare actions share the actual header row.
assert(pulse.includes("title:'结果比较',actionsTagName:'div'"),'Pulse compare title/actions must share a non-stacked Unit Header.');
assert(!/title:'结果比较'[^\n]+subtitle:/.test(pulse),'Pulse compare explanation must not occupy Header subtitle geometry.');
assert(pulse.includes("units.note.create(comparePanel.element,{variant:'normal'"),'Pulse compare explanation must be a sibling semantic Note.');

// D. Result renderer height and document-flow height are both Unit-owned.
assert(pulse.includes("variant:'plot-card-fill',geometry:raw?{minHeight:'320px'}:{height:'360px',minHeight:'320px'}"),'Production result cards must have a bounded Unit flow box.');
assert(shadow.includes("variant:'plot-card-fill',geometry:{height:'360px',minHeight:'320px'}"),'SDK Pulse shadow must teach the same bounded result-card flow geometry.');
assert(pulse.includes("variant:'scroll-pane',className:'pulse-table-wrap dkds-table-wrap',geometry:{minHeight:'180px',maxHeight:'330px'}"),'Result table body must retain a visible bounded flow box.');
assert(!pulseMobile.includes('pulse-result-card')&&!pulseMobile.includes('pulse-results-grid')&&!pulseMobile.includes('pulse-table-wrap'),'Mobile Pulse CSS must not re-own Unit result-flow geometry.');
assert(!pulseCss.includes('.pulse-compare-note{'),'Compare-note spacing must not regress to plugin-private geometry CSS.');

// Execute the Drawer solver against high-DPI-like CSS viewport dimensions.
global.DKDSStyleGate={
  KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},
  set(el,property,value){el.style?.setProperty?.(property,String(value));return value;},
  setToken(el,property,value){return this.set(el,property,value);},
  remove(el,property){el.style?.removeProperty?.(property);return true;}
};
class StyleDecl{constructor(){this.map=new Map();}setProperty(k,v){this.map.set(String(k),String(v));this[String(k)]=String(v);}removeProperty(k){this.map.delete(String(k));delete this[String(k)];}getPropertyValue(k){return this.map.get(String(k))||'';}}
class ClassList{constructor(){this.set=new Set();}add(...rows){for(const row of rows)for(const v of String(row||'').split(/\s+/).filter(Boolean))this.set.add(v);}remove(...rows){for(const r of rows)this.set.delete(String(r));}contains(v){return this.set.has(String(v));}}
const store=new Map();
const oldWindow=global.window,oldInner=global.innerWidth,oldStorage=global.localStorage,oldDocument=global.document,oldRO=global.ResizeObserver,oldMO=global.MutationObserver;
global.window={innerWidth:744,addEventListener(){},removeEventListener(){}};global.innerWidth=744;
global.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value))};
global.MutationObserver=undefined;
const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
const presenter=new MobileWebSurfacePresenter();
const makeFrame=({required=0,parentWidth=744}={})=>{
  const style=new StyleDecl();let frame;
  const child={hidden:false,classList:new ClassList(),matches:()=>false,style:{overflowX:''},get clientWidth(){return Math.max(1,(Number.parseFloat(style.getPropertyValue('width'))||260)-20);},get scrollWidth(){return Math.max(this.clientWidth,required);},getBoundingClientRect(){const width=this.clientWidth;return {left:10,right:10+width,width};}};
  const content={dataset:{},classList:new ClassList(),matches:()=>false,style:{overflowX:''},get clientWidth(){return Number.parseFloat(style.getPropertyValue('width'))||260;},get scrollWidth(){return this.clientWidth;},querySelectorAll(){return [child];},getBoundingClientRect(){const width=this.clientWidth;return {left:0,right:width,width};}};
  const parent={clientWidth:parentWidth,getBoundingClientRect:()=>({width:parentWidth})};
  frame={isConnected:true,dataset:{},children:[content],parentElement:parent,style,classList:new ClassList(),matches:()=>false,querySelectorAll(){return [];},getBoundingClientRect(){const width=Number.parseFloat(style.getPropertyValue('width'))||260;return {left:0,right:width,width};},closest(){return null;}};
  return frame;
};
const simple=makeFrame();
const compactFloor=presenter.semanticSearchFloorPx();
assert(compactFloor<100,`The Drawer search floor must stay below an ordinary PortableView minimum, got ${compactFloor}.`);
assert.strictEqual(presenter.solveCompactDrawerWidth(simple),compactFloor,'Simple shrinkable Unit content should stop at the semantic probe floor.');
const demanding=makeFrame({required:316});
const demandingWidth=presenter.solveCompactDrawerWidth(demanding);
assert(demandingWidth>=335&&demandingWidth<=338,`Action-text overflow should grow only to the actual readable requirement, got ${demandingWidth}.`);
assert(demandingWidth<420,'A high-DPI tablet must not inherit the retired 420px cap/default.');

// Execute the shared Unit grid runtime too, not only source strings.
class FakeElement{constructor(width=0){this.nodeType=1;this.dataset={};this.classList=new ClassList();this.children=[];this.parentNode=null;this.parentElement=null;this.clientWidth=width;this.style=new StyleDecl();this._style={};}appendChild(node){node.parentNode=this;node.parentElement=this;this.children.push(node);return node;}append(...rows){rows.forEach(row=>this.appendChild(row));}}
const fakeDocument={createElement:()=>new FakeElement(),querySelector:()=>null,documentElement:{dataset:{},classList:new ClassList()}};
global.document=fakeDocument;global.window.document=fakeDocument;global.ResizeObserver=undefined;
delete require.cache[require.resolve('../src/core/ui/modules/composition/unit-template-layout')];
const {LayoutUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-layout');
const runtime=new LayoutUnitRuntime({track(){}});
const wide=new FakeElement(1488),wideGrid=runtime.createLayout(wide,{variant:'analysis-control-grid'});
assert.strictEqual(wideGrid.style.getPropertyValue('grid-template-columns'),'minmax(220px,1.45fr) repeat(4,minmax(118px,.8fr)) minmax(148px,.72fr)');
const tablet=new FakeElement(980),tabletGrid=runtime.createLayout(tablet,{variant:'analysis-control-grid'});
assert.strictEqual(tabletGrid.style.getPropertyValue('grid-template-columns'),'repeat(4,minmax(0,1fr))');
const mid=new FakeElement(820),midGrid=runtime.createLayout(mid,{variant:'analysis-control-grid'});
assert.strictEqual(midGrid.style.getPropertyValue('grid-template-columns'),'repeat(3,minmax(0,1fr))');
const narrow=new FakeElement(600),narrowGrid=runtime.createLayout(narrow,{variant:'analysis-control-grid'});
assert.strictEqual(narrowGrid.style.getPropertyValue('grid-template-columns'),'repeat(2,minmax(0,1fr))');
const flowHost=new FakeElement(740),flowCard=new FakeElement();flowHost.appendChild(flowCard);
runtime.applyLayout(flowCard,{variant:'plot-card-fill',geometry:{height:'360px',minHeight:'320px'}});
assert.strictEqual(flowCard.style.getPropertyValue('height'),'360px');assert.strictEqual(flowCard.style.getPropertyValue('min-height'),'320px');

if(oldWindow===undefined)delete global.window;else global.window=oldWindow;
if(oldInner===undefined)delete global.innerWidth;else global.innerWidth=oldInner;
if(oldStorage===undefined)delete global.localStorage;else global.localStorage=oldStorage;
if(oldDocument===undefined)delete global.document;else global.document=oldDocument;
if(oldRO===undefined)delete global.ResizeObserver;else global.ResizeObserver=oldRO;
if(oldMO===undefined)delete global.MutationObserver;else global.MutationObserver=oldMO;
console.log('v3.71.69+ Mobile Unit regression closure PASS: content-derived widths + shared grids + Pulse flow ownership');
