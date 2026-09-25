'use strict';
const assert=require('assert');
const path=require('path');
const fs=require('fs');
const vm=require('vm');
const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();

class ClassList{
  constructor(owner){this.owner=owner;this.values=new Set();}
  add(...rows){for(const row of rows)for(const part of String(row||'').split(/\s+/).filter(Boolean))this.values.add(part);}
  remove(...rows){for(const row of rows)this.values.delete(String(row));}
  contains(row){return this.values.has(String(row));}
  toggle(row,force){const key=String(row);const next=force===undefined?!this.values.has(key):!!force;if(next)this.values.add(key);else this.values.delete(key);return next;}
  [Symbol.iterator](){return this.values[Symbol.iterator]();}
  toString(){return [...this.values].join(' ');}
}
function dataAttrToKey(name){return String(name).replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());}
function parseSimpleSelector(selector){
  let s=String(selector||'').trim();const out={tag:'',classes:[],attrs:[],firstChild:false,notDisabled:false};
  if(s.endsWith(':first-child')){out.firstChild=true;s=s.slice(0,-12);}
  if(s.endsWith(':not(:disabled)')){out.notDisabled=true;s=s.slice(0,-15);}
  const tag=s.match(/^[a-zA-Z][\w-]*/);if(tag){out.tag=tag[0].toLowerCase();s=s.slice(tag[0].length);}
  for(const m of s.matchAll(/\.([\w-]+)/g))out.classes.push(m[1]);
  for(const m of s.matchAll(/\[([^\]=]+)(?:=["']?([^\]"']+)["']?)?\]/g))out.attrs.push([m[1],m[2]]);
  return out;
}
function simpleMatches(el,selector){
  const q=parseSimpleSelector(selector);if(q.tag&&el.localName!==q.tag)return false;
  if(q.firstChild&&el.parentNode?.children?.[0]!==el)return false;if(q.notDisabled&&el.disabled)return false;
  for(const c of q.classes)if(!el.classList.contains(c))return false;
  for(const [name,value] of q.attrs){let actual;if(name.startsWith('data-'))actual=el.dataset[dataAttrToKey(name)];else actual=el.getAttribute(name);if(actual===undefined||actual===null)return false;if(value!==undefined&&String(actual)!==String(value))return false;}
  return true;
}
function matchesSelector(el,selector){
  const alternatives=String(selector||'').split(',').map(s=>s.trim()).filter(Boolean);
  return alternatives.some(sel=>{
    sel=sel.replace(/^:scope\s*>\s*/,'>');
    const childIdx=sel.indexOf('>');
    if(childIdx>=0){const left=sel.slice(0,childIdx).trim(),right=sel.slice(childIdx+1).trim();if(!simpleMatches(el,right))return false;if(left==='')return el.parentNode!=null;return !!el.parentNode&&simpleMatches(el.parentNode,left);}
    const parts=sel.split(/\s+/).filter(Boolean);if(parts.length>1){if(!simpleMatches(el,parts.at(-1)))return false;let anc=el.parentNode;for(let i=parts.length-2;i>=0;i--){while(anc&&!simpleMatches(anc,parts[i]))anc=anc.parentNode;if(!anc)return false;anc=anc.parentNode;}return true;}
    return simpleMatches(el,sel);
  });
}
class FakeElement{
  constructor(tag='div',ns='http://www.w3.org/1999/xhtml'){this.nodeType=1;this.localName=String(tag).toLowerCase();this.tagName=this.localName.toUpperCase();this.namespaceURI=ns;this.children=[];this.parentNode=null;this.parentElement=null;this.dataset={};this.attributes=new Map();this.classList=new ClassList(this);this.listeners=new Map();this._style=Object.create(null);this.style={setProperty:(k,v)=>{this._style[String(k)]=String(v);},removeProperty:k=>{delete this._style[String(k)];},getPropertyValue:k=>this._style[String(k)]||''};this.disabled=false;this.textContent='';this.innerHTML='';this.isConnected=true;this.id='';this._rect={left:0,top:0,width:500,height:300};}
  set className(v){this.classList.values=new Set(String(v||'').split(/\s+/).filter(Boolean));}get className(){return this.classList.toString();}
  get nextSibling(){if(!this.parentNode)return null;const rows=this.parentNode.children||[];return rows[rows.indexOf(this)+1]||null;}
  appendChild(n){if(n.parentNode)n.parentNode.removeChild(n);n.parentNode=this;n.parentElement=this;this.children.push(n);return n;}
  append(...nodes){for(const n of nodes){if(typeof n==='string')continue;this.appendChild(n);}return this;}
  prepend(n){if(n.parentNode)n.parentNode.removeChild(n);n.parentNode=this;n.parentElement=this;this.children.unshift(n);return n;}
  insertBefore(n,ref){if(n.parentNode)n.parentNode.removeChild(n);n.parentNode=this;n.parentElement=this;const i=this.children.indexOf(ref);if(i<0)this.children.push(n);else this.children.splice(i,0,n);return n;}
  removeChild(n){const i=this.children.indexOf(n);if(i>=0)this.children.splice(i,1);n.parentNode=n.parentElement=null;return n;}
  remove(){this.parentNode?.removeChild(this);this.isConnected=false;}
  replaceChildren(...nodes){for(const c of [...this.children])this.removeChild(c);for(const n of nodes)this.appendChild(n);}
  setAttribute(k,v){this.attributes.set(String(k),String(v));if(k==='class')this.className=v;if(k==='id')this.id=String(v);if(String(k).startsWith('data-'))this.dataset[dataAttrToKey(k)]=String(v);}
  getAttribute(k){if(k==='class')return this.className;if(k==='id')return this.id||null;if(String(k).startsWith('data-'))return this.dataset[dataAttrToKey(k)]??null;return this.attributes.get(String(k))??null;}
  hasAttribute(k){return this.getAttribute(k)!==null;}removeAttribute(k){this.attributes.delete(String(k));if(String(k).startsWith('data-'))delete this.dataset[dataAttrToKey(k)];}
  addEventListener(type,fn){const a=this.listeners.get(type)||[];a.push(fn);this.listeners.set(type,a);}removeEventListener(type,fn){const a=this.listeners.get(type)||[];this.listeners.set(type,a.filter(x=>x!==fn));}
  dispatchEvent(evt){evt.target=evt.target||this;evt.currentTarget=this;evt.preventDefault??=()=>{evt.defaultPrevented=true;};evt.stopPropagation??=()=>{};evt.stopImmediatePropagation??=()=>{};for(const fn of this.listeners.get(evt.type)||[])fn.call(this,evt);if(evt.type==='click'&&typeof this.onclick==='function')this.onclick(evt);return true;}
  click(){return this.dispatchEvent({type:'click',clientX:10,clientY:10});}
  matches(s){return matchesSelector(this,s);}closest(s){let n=this;while(n){if(n.matches?.(s))return n;n=n.parentNode;}return null;}
  querySelectorAll(s){const out=[];const walk=n=>{for(const c of n.children||[]){if(c.matches?.(s))out.push(c);walk(c);}};walk(this);return out;}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  contains(n){let x=n;while(x){if(x===this)return true;x=x.parentNode;}return false;}
  getBoundingClientRect(){const num=(key,fallback)=>{const raw=this._style[key];const n=parseFloat(raw);return Number.isFinite(n)?n:fallback;};const width=num('width',this._rect.width),height=num('height',this._rect.height),left=num('left',this._rect.left),top=num('top',this._rect.top);return {left,top,right:left+width,bottom:top+height,width,height};}
  focus(){global.document.activeElement=this;}
}
class FakeComment{constructor(){this.nodeType=8;this.parentNode=null;this.parentElement=null;}get nextSibling(){if(!this.parentNode)return null;const rows=this.parentNode.children||[];return rows[rows.indexOf(this)+1]||null;}}
const root=new FakeElement('html'),body=new FakeElement('body');root._rect={left:0,top:0,width:1200,height:800};body._rect={left:0,top:0,width:1200,height:800};root.appendChild(body);root.dataset.dkdsHost='desktop';
const docListeners=new Map();
global.document={documentElement:root,body,activeElement:null,scrollingElement:root,createElement:t=>new FakeElement(t),createElementNS:(ns,t)=>new FakeElement(t,ns),createComment:()=>new FakeComment(),querySelector:s=>root.querySelector(s),querySelectorAll:s=>root.querySelectorAll(s),addEventListener(t,f){const a=docListeners.get(t)||[];a.push(f);docListeners.set(t,a);},removeEventListener(){}};
const winListeners=new Map();global.window={document:global.document,innerWidth:1200,innerHeight:800,addEventListener(t,f){const a=winListeners.get(t)||[];a.push(f);winListeners.set(t,a);},removeEventListener(t,f){const a=winListeners.get(t)||[];winListeners.set(t,a.filter(x=>x!==f));},dispatchEvent(evt){for(const fn of winListeners.get(evt.type)||[])fn.call(this,evt);return true;},DKDSThemeMaterialRenderer:{assignSemanticRoles(){}},DKDSCharts:{resize(){}}};
global.localStorage={getItem(){return null;},setItem(){}};global.requestAnimationFrame=fn=>{fn();return 1;};global.cancelAnimationFrame=()=>{};global.getComputedStyle=()=>({overflowY:'visible'});global.ResizeObserver=class{observe(){}disconnect(){}};window.ResizeObserver=global.ResizeObserver;
const gate={KINDS:{CONFIG_TOKEN:'config-token',RUNTIME_INLINE:'runtime-inline'},set(el,k,v){el?.style?.setProperty?.(k,v);},setToken(el,k,v){el?.style?.setProperty?.(k,v);},remove(el,k){el?.style?.removeProperty?.(k);},setPaint(el,k,v){el.setAttribute?.(k,v);},removePaint(el,k){el.removeAttribute?.(k);},setPresentation(el,k,v){el.setAttribute?.(k,v);},removePresentation(el,k){el.removeAttribute?.(k);},snapshot(){return{};}};global.DKDSStyleGate=gate;window.DKDSStyleGate=gate;

const {FoundationUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-foundation');
const {hostState}=require('../src/core/ui/modules/foundation/shortcuts');
const {PortableView}=require('../src/core/ui/modules/layout/portable-view');

// This gate must follow the production Unit PRIME spec, not a hand-built
// PortableView spec.  `plot-group` describes the content Unit; the movable
// outer PRIME remains the accepted generic panel semantic.
const unitPresentationSource=fs.readFileSync(path.join(process.cwd(),'src/plugins/resonance-workbench/unit-presentation.js'),'utf8');
const groupPrimeSource=unitPresentationSource.split('\n').find(line=>line.includes("const group=units.prime.build"))||'';
assert(groupPrimeSource.includes("id:'group-analysis'"),'production Resonance Group PRIME spec missing');
assert(groupPrimeSource.includes("semanticKind:'panel'"),'production outer Group PRIME must use PortableView panel semantic');
assert(!groupPrimeSource.includes("semanticKind:'plot-group'"),'plot-group content semantic must not leak into PortableView outer PRIME');
const portableSource=fs.readFileSync(path.join(process.cwd(),'src/core/ui/modules/layout/portable-view.js'),'utf8');
assert(portableSource.includes("portableSet(wrapper,'resize','none')"),'Core PortableView must suppress browser-native resize when its handle owns resizing');

const foundation=new FoundationUnitRuntime({});
const page=new FakeElement('div');page.className='analysis-page';body.appendChild(page);
const panel=new FakeElement('div');panel._rect={left:120,top:120,width:560,height:420};panel.className='respar-floating-panel respar-group-panel';page.appendChild(panel);
const header=foundation.createHeader(panel,{tagName:'div',kind:'portable',variant:'portable',className:'respar-floating-header dkds-portable-header dkds-surface-header',title:'组图面板',actionsTagName:'div',actionsClassName:'dkds-integrated-action-group',integratedActions:false});
assert.strictEqual(header.actions.className,'dkds-integrated-action-group','accepted portable Unit header must preserve one integrated action host without pre-owning PortableView controls');
assert(!header.actions.classList.contains('dkds-portable-controls'),'Header Unit must not pre-claim PortableView control ownership');
const cols=new FakeElement('span');cols.dataset.resparGroupColsMenuHost='';header.actions.appendChild(cols);
const collapse=new FakeElement('button');collapse.dataset.resparCollapse='group';collapse.textContent='−';header.actions.appendChild(collapse);
const close=new FakeElement('button');close.dataset.resparClose='group';close.textContent='×';header.actions.appendChild(close);
const groupBody=new FakeElement('div');groupBody.className='respar-floating-body';panel.appendChild(groupBody);

const right=new FakeElement('div'),bottom=new FakeElement('div');body.appendChild(right);body.appendChild(bottom);hostState.zones.set('right',right);hostState.zones.set('bottom',bottom);hostState.root=body;
let closed=0,collapsed=[];const scope={owner:'builtin.resonance-workbench',requestChartResize(){},syncRegions(){},syncCanvasRegions(){},emitResize(){},presentationChanged(){}};
const portable=new PortableView(scope,'prime:group-analysis',panel,{useTargetAsWrapper:true,handle:'.respar-floating-header',controlsHost:'.respar-floating-header>div',placements:['float','right','bottom'],defaultPlacement:'bottom',controlsPlacement:'start',closeSelector:'[data-respar-close="group"]',collapseSelector:'[data-respar-collapse="group"]',onClose:()=>{closed++;panel.classList.add('dkds-prime-hidden');},onCollapse:info=>collapsed.push(info.collapsed)});
assert.strictEqual(panel.dataset.placement,'bottom');
const portableGroups=header.actions.querySelectorAll('.dkds-portable-controls');
assert.strictEqual(portableGroups.length,1,'PortableView must inject exactly one portable control subgroup into the accepted action host');
assert.strictEqual(header.actions.children[0],portableGroups[0],'accepted Workbench prepends the single PortableView placement subgroup');
assert.strictEqual(header.actions.children[1],cols,'accepted columns action follows placement');
assert.strictEqual(header.actions.children[2],collapse,'accepted collapse action follows columns');
assert.strictEqual(header.actions.children[3],close,'accepted close action remains last');

collapse.click();assert(panel.classList.contains('is-collapsed'));assert.deepStrictEqual(collapsed,[true]);collapse.click();assert(!panel.classList.contains('is-collapsed'));assert.deepStrictEqual(collapsed,[true,false]);
close.click();assert.strictEqual(closed,1,'accepted close callback must be wired by PortableView');assert(panel.classList.contains('dkds-prime-hidden'),'close transition must hide the PRIME');
panel.classList.remove('dkds-prime-hidden');portable.place('bottom',{source:'reopen'});assert(!panel.classList.contains('dkds-prime-hidden'),'same PRIME wrapper must be reopenable after close');
const trigger=portableGroups[0].querySelector('.dkds-portable-placement-trigger');assert(trigger,'placement trigger missing');trigger.click();
const menu=document.body.querySelector('.dkds-context-menu');assert(menu,'placement menu did not open by click');const rightItem=menu.querySelector('[data-value="right"]');assert(rightItem,'right placement item missing');rightItem.click();assert.strictEqual(panel.dataset.placement,'right');assert.strictEqual(panel.parentNode,right,'clicking placement action must move the real PRIME wrapper');
portable.place('bottom',{source:'user'});assert.strictEqual(panel.parentNode,bottom,'PRIME must reopen/re-place through the same PortableView lifecycle');assert.strictEqual(panel.dataset.placement,'bottom');

// Enter the real floating lifecycle.  This was the missing Windows path: the
// accepted Group must acquire drag + Core resize ownership after PRIME mount.
portable.place('float',{source:'user'});assert.strictEqual(panel.dataset.placement,'float');
assert(panel.classList.contains('is-floating'),'Group did not enter floating lifecycle');
assert.strictEqual(panel.style.getPropertyValue('resize'),'none','outer Group must suppress Chromium native resize once Core owns the handle');
const beforeDrag=panel.getBoundingClientRect();
header.element.dispatchEvent({type:'pointerdown',button:0,pointerId:11,clientX:beforeDrag.left+80,clientY:beforeDrag.top+14,target:header.element,cancelable:true});
window.dispatchEvent({type:'pointermove',pointerId:11,clientX:beforeDrag.left+170,clientY:beforeDrag.top+74,cancelable:true,preventDefault(){}});
window.dispatchEvent({type:'pointerup',pointerId:11,clientX:beforeDrag.left+170,clientY:beforeDrag.top+74});
const afterDrag=panel.getBoundingClientRect();assert(afterDrag.left!==beforeDrag.left||afterDrag.top!==beforeDrag.top,'floating Group titlebar drag produced no geometry transition');
const resizeHandle=panel.querySelector('.dkds-portable-resize-handle');assert(resizeHandle,'outer Group Core resize handle missing');
const beforeResize=panel.getBoundingClientRect();
resizeHandle.dispatchEvent({type:'pointerdown',button:0,pointerId:12,clientX:beforeResize.right,clientY:beforeResize.bottom,target:resizeHandle,cancelable:true});
window.dispatchEvent({type:'pointermove',pointerId:12,clientX:beforeResize.right+80,clientY:beforeResize.bottom+60,cancelable:true,preventDefault(){}});
window.dispatchEvent({type:'pointerup',pointerId:12,clientX:beforeResize.right+80,clientY:beforeResize.bottom+60});
const afterResize=panel.getBoundingClientRect();assert(afterResize.width>=beforeResize.width&&afterResize.height>=beforeResize.height,'outer Group Core resize handle produced no size transition');

// The old v3.71.21 gate used an empty curve and inserted a fake path in onEmpty,
// which could pass while the real Resonance curve stayed blank.  Exercise the
// actual Resonance main-plot adapter with finite sweep data instead and assert
// that it hands the Unit-created SVG + its exact parent to the canonical runtime.
const {ScientificUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-scientific');
const scientificUnit=new ScientificUnitRuntime({track(){}},{});
const plotWrap=new FakeElement('div');plotWrap.dataset.dkdsPlotScope='true';plotWrap._rect={left:0,top:0,width:760,height:520};body.appendChild(plotWrap);
const mainSvg=foundation.createLayout(plotWrap,{tagName:'svg',namespace:'svg',variant:'identity',className:'respar-main-svg'});mainSvg.id='reswinMainPlot';
const delegated=scientificUnit.createScientificPlot(mainSvg,{variant:'curve',source:'resonance:main',renderOwner:'runtime'});
assert.strictEqual(delegated.target,mainSvg);assert.strictEqual(mainSvg.namespaceURI,'http://www.w3.org/2000/svg');
assert(!mainSvg.classList.contains('dkds-scientific-chart-host'),'delegated Unit bridge must not mutate the accepted SVG into a generic chart host before renderer attachment');
const legend=new FakeElement('div');legend.id='resparMainLegend';plotWrap.appendChild(legend);
let definedMainRuntime=null;const previousModules=window.DKDSPluginModules,mainModules=new Map();
window.DKDSPluginModules={
  define(plugin,name,value){mainModules.set(`${plugin}/${name}`,value);if(name==='feature-main-plot-runtime')definedMainRuntime=value;return value;},
  require(plugin,name){const value=mainModules.get(`${plugin}/${name}`);if(!value)throw new Error(`missing module ${plugin}/${name}`);return value;}
};
vm.runInThisContext(fs.readFileSync(path.join(process.cwd(),'src/plugins/resonance-workbench/main-marker-projection.js'),'utf8'),{filename:'main-marker-projection.js'});
vm.runInThisContext(fs.readFileSync(path.join(process.cwd(),'src/plugins/resonance-workbench/feature-main-plot-runtime.js'),'utf8'),{filename:'feature-main-plot-runtime.js'});
window.DKDSPluginModules=previousModules;
assert(definedMainRuntime?.create,'Resonance main plot runtime module did not load');
const sweep={id:'sweep:0',datasetPath:'dataset:0',vg:0,direction:1,points:[{v:-1.2,i:-7e-6},{v:-0.4,i:-2e-6},{v:0.2,i:3e-6},{v:1.2,i:8e-6}]};
let capturedTarget=null,capturedSpec=null,realCurveDraws=0;
const runtimeSurface={target:mainSvg,colorScaleState:{scale:null},render(){const rows=capturedSpec.getCurves();assert.strictEqual(rows.length,1,'real Resonance sweep did not reach ScientificCurveSurface');assert(rows[0].points.length>=4,'real Resonance sweep points were lost before renderer');assert(rows[0].points.every(p=>Number.isFinite(Number(capturedSpec.xValue(p)))&&Number.isFinite(Number(capturedSpec.yValue(p)))),'Resonance x/y projection produced non-finite curve points');realCurveDraws++;mainSvg.setAttribute('data-real-curve-draw',String(rows[0].points.length));return true;},dispose(){}};
const mainContext={
  live:{workspace:{peaks:[],peakDisplay:{showPoints:true,showWidth:true},mainView:{}},datasets:[],sweeps:[sweep],selectedSweepId:sweep.id,selectedPeakId:'',selectedRange:null,interactionRuntime:null,interactionSelection:null,uiRuntime:{scientificPlot:{create(target,spec){capturedTarget=target;capturedSpec=spec;return runtimeSurface;}}},isNativeClient:()=>false,workspaceNavigator:null},
  services:{$:selector=>selector==='#reswinMainPlot'?mainSvg:selector==='#resparMainPlotWrap'?plotWrap:selector==='#resparMainLegend'?legend:null,dom:{html(node){node?.replaceChildren?.();},on(){return()=>{};},frame(fn){fn();return 1;},create(tag){return new FakeElement(tag);},append(host,node){return host?.appendChild?.(node);},query(sel,host){return host?.querySelector?.(sel)||null;},attr(node,k,v){if(v==null)node?.removeAttribute?.(k);else node?.setAttribute?.(k,v);},token(){},style(){}},setStatus(){}},
  actions:{visibleSweeps:()=>[sweep],visibleSweepIds:()=>[sweep.id],visibilityMap:()=>new Map([[sweep.datasetPath,{forward:true,reverse:true}]]),isVisible:()=>true,colorForPeakOrder:()=> '#2563eb',colorForSeries:()=> '#2563eb',selectedSweep:()=>sweep,selectedPeak:()=>null,peakMetrics:()=>({}),sweepById:id=>id===sweep.id?sweep:null,physicalAnalysis:()=>({peakMap:new Map()}),colorForPhysicsCode:()=> '#2563eb',scheduleSnapshot(){},clearRangeState(){},publishRangeSelection(){},peaksInRange:()=>[],normalizeCategories(){},peakLabel:()=>'',publishSweepSelection(){},publishPeakSelection(){},clearSelectionIds(){},commitPeakMetricEdit(){}},
  utils:{esc:v=>String(v??''),fmt:v=>String(v),finite:v=>Number.isFinite(Number(v)),directionName:d=>Number(d)>0?'正扫':'反扫'}
};
const mainRuntime=definedMainRuntime.create(mainContext);mainRuntime.render();
assert.strictEqual(capturedTarget,mainSvg,'canonical Resonance renderer did not attach to the Unit-created SVG');
assert.strictEqual(capturedSpec.container,plotWrap,'canonical Resonance renderer must use the exact Unit SVG parent, not a global selector');
assert.strictEqual(realCurveDraws,1,'real finite Resonance curve did not execute renderer draw contract');
assert.strictEqual(mainSvg.getAttribute('data-real-curve-draw'),'4');
mainRuntime.dispose();

console.log('v3.71.21 Resonance Group PRIME + main SVG renderer runtime interaction gate PASS');
