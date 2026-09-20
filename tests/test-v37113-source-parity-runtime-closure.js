'use strict';
const assert=require('assert');
const path=require('path');
const fs=require('fs');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const abs=rel=>path.join(root,rel);
function stub(rel,exports){const id=require.resolve(abs(rel));require.cache[id]={id,filename:id,loaded:true,exports};}

class ClassList{
  constructor(owner,initial=''){this.owner=owner;this.values=new Set(String(initial||'').split(/\s+/).filter(Boolean));}
  add(...rows){for(const row of rows)this.values.add(row);this.sync();}
  remove(...rows){for(const row of rows)this.values.delete(row);this.sync();}
  contains(row){return this.values.has(row);}
  toggle(row,force){const on=force===undefined?!this.values.has(row):!!force;if(on)this.values.add(row);else this.values.delete(row);this.sync();return on;}
  sync(){if(this.owner)this.owner._className=[...this.values].join(' ');}
}
class StyleDecl{
  constructor(){this.map=new Map();}
  setProperty(k,v){this.map.set(String(k),String(v));}
  removeProperty(k){this.map.delete(String(k));}
  getPropertyValue(k){return this.map.get(String(k))||'';}
  get height(){return this.getPropertyValue('height');} set height(v){this.setProperty('height',v);}
  get minHeight(){return this.getPropertyValue('min-height');} set minHeight(v){this.setProperty('min-height',v);}
}
class Element{
  constructor(tag='div',className=''){this.nodeType=1;this.tagName=String(tag).toUpperCase();this.dataset={};this.children=[];this.parentNode=null;this.id='';this._className='';this.classList=new ClassList(this,className);this.style=new StyleDecl();this.textContent='';this.title='';this.disabled=false;this.width=0;this._clientWidth=null;this.attrs={};}
  set className(v){this._className=String(v||'');this.classList=new ClassList(this,this._className);}get className(){return this._className;}
  appendChild(node){if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(x=>x!==node);node.parentNode=this;this.children.push(node);return node;}
  append(...rows){for(const row of rows)this.appendChild(row);}
  insertBefore(node,ref){if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(x=>x!==node);const i=this.children.indexOf(ref);node.parentNode=this;if(i<0)this.children.push(node);else this.children.splice(i,0,node);return node;}
  after(node){if(!this.parentNode)return;const p=this.parentNode;if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(x=>x!==node);const i=p.children.indexOf(this);node.parentNode=p;p.children.splice(i+1,0,node);}
  replaceChildren(...rows){for(const row of this.children)row.parentNode=null;this.children=[];for(const row of rows)this.appendChild(row);}
  setAttribute(k,v){this.attrs[String(k)]=String(v);}getAttribute(k){return this.attrs[String(k)]||null;}
  addEventListener(){} removeEventListener(){}
  getBoundingClientRect(){return {width:this.width||this.clientWidth||0,height:34,left:0,right:this.width||this.clientWidth||0,top:0,bottom:34};}
  get clientWidth(){return typeof this._clientWidth==='function'?this._clientWidth():Number(this._clientWidth??this.width??0);}set clientWidth(v){this._clientWidth=v;}
  get scrollWidth(){return this.children.reduce((sum,row)=>sum+(row.width||0),0);}
  matches(selector){
    selector=String(selector||'');
    if(selector.includes(','))return selector.split(',').some(x=>this.matches(x.trim()));
    if(selector.startsWith('.plugin-toolbar-btn'))return this.classList.contains('plugin-toolbar-btn');
    if(selector.startsWith('.plugin-main-tool-btn'))return this.classList.contains('plugin-main-tool-btn');
    if(selector.startsWith('.plugin-menu-item'))return this.classList.contains('plugin-menu-item');
    if(selector.startsWith('.activity-tab')){
      if(!this.classList.contains('activity-tab'))return false;
      if(selector.includes('[data-dkds-context-overflow-activity="1"]'))return this.dataset.dkdsContextOverflowActivity==='1';
      return true;
    }
    if(selector==='.analysis-chart')return this.classList.contains('analysis-chart');
    return false;
  }
  _direct(selector){return this.children.filter(row=>row.matches(selector));}
  querySelectorAll(selector){
    selector=String(selector||'');
    if(selector.startsWith(':scope > '))return this._direct(selector.slice(9));
    const out=[];const walk=node=>{for(const child of node.children){if(child.matches(selector))out.push(child);walk(child);}};walk(this);return out;
  }
  querySelector(selector){
    if(selector==='[data-dkds-slot="workbench-import"]'){let found=null;const walk=node=>{for(const c of node.children){if(c.dataset.dkdsSlot==='workbench-import'){found=c;return;}walk(c);if(found)return;}};walk(this);return found;}
    if(selector==='.analysis-page-header')return this.querySelectorAllSimpleClass('analysis-page-header')[0]||null;
    if(selector==='.dkds-plugin-header-actions')return this.querySelectorAllSimpleClass('dkds-plugin-header-actions')[0]||null;
    if(selector==='.analysis-page-close')return this.querySelectorAllSimpleClass('analysis-page-close')[0]||null;
    if(selector.includes('.analysis-chart'))return this.querySelectorAllSimpleClass('analysis-chart')[0]||null;
    return null;
  }
  querySelectorAllSimpleClass(cls){const out=[];const walk=node=>{for(const c of node.children){if(c.classList.contains(cls))out.push(c);walk(c);}};walk(this);return out;}
}

// Evidence 0: TER keeps the original controls node as the PRIME owner, but
// parameter-purpose outer spacing is now one uniform Core metric rather than a
// TER-specific detailGeometry override. Workbench remains generic.
{
  const unitSource=fs.readFileSync(abs('src/plugins/ter-analysis/unit-presentation.js'),'utf8');
  const unitRuntime=fs.readFileSync(abs('src/core/ui/modules/composition/unit-template-scientific.js'),'utf8');
  const {BASE_METRICS}=require(abs('src/core/ui/modules/composition/unit-template-spec.js'));
  assert(/existingNode\s*:\s*controls/.test(unitSource)&&!/detailGeometry\s*:\s*\{\s*contentInsetPx\s*:\s*12\s*\}/.test(unitSource),
    'TER data-control must adopt the controls node without owning parameter PRIME outer inset.');
  assert(unitRuntime.includes('UNIT_PARAMETER_PRIME_CONTENT_INSET_FORBIDDEN')&&unitRuntime.includes('BASE_METRICS.surface.parameterPrimeInsetPx')&&unitRuntime.includes("unitStyle(node,'padding',`${detail.contentInsetPx}px`)"),
    'Unit PRIME must own the uniform parameter inset and execute it through the Unit style writer.');
  assert.strictEqual(BASE_METRICS.surface.parameterPrimeInsetPx,6,
    'All parameter-purpose PRIME surfaces must share the 6 px Core outer inset.');
  assert.strictEqual(BASE_METRICS.acceptedScientific.dataControlInsetPx,12,
    'accepted-scientific-v1 reference data-control metric remains independently frozen at 12 px.');
}

// Evidence A: accepted TER heatmap geometry is re-applied after detached Unit
// composition receives a real width. This exercises the actual PlotView class,
// not a source-string assertion.
{
  global.document={documentElement:{classList:{contains:()=>false},dataset:{}}};
  global.window={document:global.document,DKDSCharts:{resize(){}},addEventListener(){},removeEventListener(){}};
  global.DKDSStyleGate={set(el,k,v){el.style.setProperty(k,v);},setToken(el,k,v){el.style.setProperty(k,v);},remove(el,k){el.style.removeProperty(k);}};window.DKDSStyleGate=global.DKDSStyleGate;
  const {PlotView}=require(abs('src/core/ui/modules/plot-view/chart.js'));
  const card=new Element('section','analysis-chart-card'),plot=new Element('div','analysis-chart');card.appendChild(plot);plot.clientWidth=0;card.clientWidth=0;
  const view=new PlotView({owner:'runtime-test',requestChartResize(){},panels:{create(){throw new Error('portable must stay disabled');}}},'ter:heatmap',card,{titleless:true,header:false,plot,portable:false,csv:false,copy:false,images:false,contentAspectRatio:1,contentMinHeight:80,contentMaxHeight:860});
  assert.strictEqual(plot.style.height,'','Detached pre-layout PlotView must not invent geometry at width 0.');
  plot.clientWidth=600;card.clientWidth=600;view.resize('post-layout');
  assert.strictEqual(plot.style.height,'600px','TER square heatmap must become 600 px tall at 600 px content width after layout.');
  assert.strictEqual(plot.style.minHeight,'0px','Explicit aspect-ratio geometry must neutralize the generic analysis-chart minimum height.');
  view.dispose();
}

// Evidence B: the same Core import owner must produce opposite host projections:
// no duplicate action in a TOP main shell, but one late-mounted local action in
// a dedicated window whose Unit header is composed after pages.add().
{
  const state={host:{isAuxiliaryWindow:false},contextOverflowPopup:null};let toolbarCreates=0,topMode=true;const observers=[];
  stub('src/core/plugins/kernel/modules/context.js',{state});
  stub('src/core/plugins/kernel/modules/bootstrap.js',{definitionById:id=>({manifest:{id,workspace:{role:topMode?'top':''}}}),defaultPluginIcon:()=>'',workspaceMeta:m=>m.workspace||{},isTopDefinition:definition=>{assert(definition?.manifest,'isTopDefinition must receive a plugin definition, not a manifest.');return topMode;}});
  stub('src/core/plugins/kernel/modules/registry.js',{addCleanup:()=>()=>{}});
  stub('src/core/plugins/kernel/modules/activity/shell.js',{refreshActivityVisibility:()=>{}});
  stub('src/core/plugins/kernel/modules/contributions/ui.js',{registerActivity:()=>{}});
  stub('src/core/plugins/kernel/modules/commands/toolbar.js',{createToolbarButton(){toolbarCreates++;return {};},registerCommand:()=>{},runCommand:()=>{},registerContribution:()=>{}});
  stub('src/core/plugins/kernel/modules/manifest.js',{pluginTypeOf:()=> 'workbench'});
  stub('src/core/plugins/kernel/modules/host-facade.js',{pluginHostView:()=>({})});
  global.document={createElement:t=>new Element(t),documentElement:{classList:{contains:()=>false},dataset:{}}};
  global.window={dispatchEvent(){}};global.CustomEvent=class{constructor(type){this.type=type;}};
  global.MutationObserver=class{constructor(cb){this.cb=cb;this.disconnected=false;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}};
  const {mountWorkbenchImportAction}=require(abs('src/core/plugins/kernel/modules/pages/panels.js'));
  const manifest={id:'builtin.ter-analysis',pluginType:'workbench',name:'TER Analysis',workspace:{role:'top',title:'TER 分析'},data:{accepts:['science.transport.curve']}};
  const mainPage=new Element('section');
  assert.strictEqual(mountWorkbenchImportAction('builtin.ter-analysis',mainPage,'ter',manifest,{id:'ter-max'}),null);
  for(const [pluginId,activity] of [['builtin.resonance-workbench','resonance'],['builtin.pulse-analysis','pulse'],['com.dkds.transfer-vth-lab','transfer-vth-lab']]){
    const topManifest={id:pluginId,pluginType:'workbench',name:pluginId,workspace:{role:'top',title:pluginId},data:{accepts:['science.transport.iv']}};
    assert.strictEqual(mountWorkbenchImportAction(pluginId,new Element('section'),activity,topManifest,{id:`${activity}-page`}),null);
  }
  assert.strictEqual(toolbarCreates,0,'No TOP main-shell page may create contextual 导入数据; all TOP workbenches must use the single global 导入 route.');
  state.host.isAuxiliaryWindow=true;topMode=true;const dedicatedPage=new Element('section');
  mountWorkbenchImportAction('builtin.ter-analysis',dedicatedPage,'ter',manifest,{id:'ter-max'});
  assert(observers.length,'Dedicated Unit page must wait for the canonical header instead of giving up when pages.add() runs first.');
  const header=new Element('header','analysis-page-header'),domainActions=new Element('div','dkds-plugin-header-actions'),hostControls=new Element('div','host-controls');header.append(domainActions,hostControls);dedicatedPage.appendChild(header);observers.at(-1).cb();
  const slot=dedicatedPage.querySelector('[data-dkds-slot="workbench-import"]');
  assert(slot&&slot.children[0]?.textContent==='导入数据','Dedicated TER header must regain the Core-owned 导入数据 action.');
  assert.strictEqual(header.children[1],slot,'Dedicated titlebar order must remain plugin actions -> 导入数据 -> host controls.');
  assert(observers.at(-1).disconnected,'Late-header observer must disconnect immediately after the one canonical slot is mounted.');
}

// Evidence C: real reflow logic must never leave a primary plugin label partly
// visible. It may sacrifice contextual commands first and then moves complete
// primary activity buttons into the existing 更多功能 container.
{
  const state=require(abs('src/core/plugins/kernel/modules/context.js')).state;state.contextOverflowPopup=null;
  const toolbar=new Element('div'),overflow=new Element('div'),overflowBtn=new Element('button'),row=new Element('div'),primary=new Element('div');
  toolbar.id='pluginToolbarAnalysis';overflow.id='contextOverflowMenu';overflowBtn.id='contextOverflowBtn';primary.id='primaryActivityBar';row.className='context-commandbar';overflow.classList.add('hidden');overflowBtn.classList.add('hidden');overflowBtn.width=50;
  for(let i=0;i<3;i++){const b=new Element('button','plugin-toolbar-btn');b.width=70;b.textContent=`命令${i+1}`;b.dataset.pluginPriority=String(10+i);b.dataset.pluginOrder=String(10+i);toolbar.appendChild(b);}
  for(let i=0;i<5;i++){const b=new Element('button','activity-tab');b.width=90;b.textContent=['共振分析','TER分析','脉冲分析','Vth工作台','SFeRT 建模拟合'][i];b.dataset.activityId=`a${i}`;b.dataset.activityOrder=String(i+1);if(i===0)b.classList.add('active');primary.appendChild(b);}
  const contextRequired=()=>toolbar.children.reduce((s,b)=>s+b.width,0)+(overflowBtn.classList.contains('hidden')?0:overflowBtn.width);
  primary._clientWidth=()=>Math.max(0,360-contextRequired());row._clientWidth=()=>Math.max(0,contextRequired());
  const bySelector=new Map([['#pluginToolbarAnalysis',toolbar],['#contextOverflowMenu',overflow],['#contextOverflowBtn',overflowBtn],['.context-commandbar',row],['#primaryActivityBar',primary]]);
  global.document={querySelector:s=>bySelector.get(s)||null};
  global.getComputedStyle=el=>({paddingLeft:'0',paddingRight:'0',columnGap:el===toolbar?'4':'0',gap:el===toolbar?'4':'0',marginLeft:'0',marginRight:'0'});
  const {reflowContextToolbar}=require(abs('src/core/plugins/kernel/modules/shell/context-toolbar.js'));
  reflowContextToolbar();
  assert(primary.scrollWidth<=primary.clientWidth+1,'Primary plugin lane must finish reflow without any clipped activity label.');
  const overflowActivities=overflow.children.filter(x=>x.dataset.dkdsContextOverflowActivity==='1');
  assert(overflowActivities.length>0,'Insufficient width must move complete main plugin buttons into 更多功能.');
  assert(overflowActivities.some(x=>x.textContent==='SFeRT 建模拟合'),'A long plugin name such as SFeRT 建模拟合 must move as one complete button; it may never be text-clipped.');
  assert(primary.children.some(x=>x.textContent==='共振分析'),'Active primary plugin should be retained before inactive lower-priority activities when space is constrained.');
  assert(!overflowBtn.classList.contains('hidden'),'更多功能 must stay visible while primary activities are overflowed.');
}

console.log('v3.71.15 source-parity runtime closure PASS: TER Unit-owned geometry, definition-correct host import projection, unclipped primary plugin overflow.');
