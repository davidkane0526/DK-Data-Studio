'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

class Classes{constructor(){this.rows=new Set();}add(...rows){for(const row of rows)for(const v of String(row||'').split(/\s+/).filter(Boolean))this.rows.add(v);}remove(...rows){rows.forEach(v=>this.rows.delete(v));}contains(v){return this.rows.has(v);}}
class StyleDecl{constructor(){this.rows={};}getPropertyValue(k){return this.rows[k]||'';}getPropertyPriority(){return '';}setProperty(k,v){this.rows[k]=String(v);}removeProperty(k){delete this.rows[k];}}
class FakeElement{
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.nodeType=1;this.dataset={};this.classList=new Classes();this.className='';this.children=[];this.parentNode=null;this.parentElement=null;this.style=new StyleDecl();this.hidden=false;this.clientWidth=0;this.scrollWidth=0;this._rect={left:0,right:0,width:0,top:0,height:0};}
  appendChild(node){node.parentNode=this;node.parentElement=this;this.children.push(node);return node;} append(...nodes){nodes.forEach(n=>this.appendChild(n));}
  insertBefore(node,before=null){node.parentNode=this;node.parentElement=this;const i=before?this.children.indexOf(before):-1;if(i>=0)this.children.splice(i,0,node);else this.children.push(node);return node;}
  addEventListener(){} removeEventListener(){} setAttribute(){} getBoundingClientRect(){return {...this._rect};}
  querySelectorAll(selector){const out=[];const visit=node=>{for(const child of node.children||[]){let match=false;if(selector.includes('data-dkds-unit-geometry-inline'))match=child.dataset?.dkdsUnitGeometryInline==='true';else if(selector.includes('data-dkds-unit-template'))match=!!child.dataset?.dkdsUnitTemplate;else if(selector==='*')match=true;if(match)out.push(child);visit(child);}};visit(this);return out;}
}
const old={document:global.document,window:global.window,ResizeObserver:global.ResizeObserver,MutationObserver:global.MutationObserver,CustomEvent:global.CustomEvent,StyleGate:global.DKDSStyleGate};
const fakeDocument={createElement:tag=>new FakeElement(tag),createTextNode:text=>({nodeType:3,textContent:String(text)}),documentElement:{dataset:{dkdsHost:'mobile'},classList:new Classes()},querySelector(){return null;}};
global.document=fakeDocument;global.window={document:fakeDocument,innerWidth:744,innerHeight:992,addEventListener(){},removeEventListener(){}};global.innerWidth=744;global.innerHeight=992;
global.localStorage={getItem(){return null;},setItem(){},removeItem(){}};global.ResizeObserver=undefined;global.MutationObserver=undefined;global.CustomEvent=class{constructor(type,row){this.type=type;this.detail=row?.detail;}};
global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(node,p,v){node.style.setProperty(p,v);return true;},setToken(node,p,v){node.style.setProperty(p,v);return true;},remove(node,p){node.style.removeProperty(p);return true;}};global.window.DKDSStyleGate=global.DKDSStyleGate;
try{
  const component=new FakeElement('div');component.classList.add('dkds-surface-tabs');component.scrollWidth=138;component.clientWidth=138;component._rect={left:170,right:308,width:138,top:0,height:30};
  for(const label of ['Vd','Vs','Vg']){const tab=new FakeElement('button');tab.scrollWidth=46;tab.clientWidth=46;component.appendChild(tab);}
  global.window.DKDSComponents={tabs(){return component;}};
  const prime=new FakeElement('section');prime.dataset.dkdsUnitPrimeContentInsetPx='6';prime.clientWidth=300;prime.scrollWidth=300;prime._rect={left:0,right:300,width:300,top:0,height:500};prime.style.setProperty('padding','6px');
  const {FoundationUnitRuntime}=require('../src/core/ui/modules/composition/unit-template-foundation');
  const runtime=new FoundationUnitRuntime({track(){},actions:{mount(){return null;}}});
  const built=runtime.createTabs(prime,{variant:'compact',items:[{id:'vd',label:'Vd'},{id:'vs',label:'Vs'},{id:'vg',label:'Vg'}]});
  built.element._rect={left:6,right:294,width:288,top:6,height:36};built.element.clientWidth=288;built.element.scrollWidth=288;
  const {readNodeGeometryConstraints,resolveInlineConstraintDeficit}=require('../src/core/ui/modules/composition/unit-geometry-constraints');
  const rows=readNodeGeometryConstraints(built.element,'inline');
  assert.strictEqual(rows.length,1);assert.strictEqual(rows[0].target,component,'Production Tabs Unit must measure and contain the actual .dkds-surface-tabs anatomy, not its max-width wrapper.');
  let deficit=resolveInlineConstraintDeficit(prime);
  assert.strictEqual(deficit.constraintDeficitPx,0);
  assert.strictEqual(deficit.boundaryDeficitPx,14,'Vg crossing the PRIME 6 px content edge must widen the Drawer.');
  prime.clientWidth=314;prime.scrollWidth=314;prime._rect={left:0,right:314,width:314,top:0,height:500};
  deficit=resolveInlineConstraintDeficit(prime);assert.strictEqual(deficit.boundaryDeficitPx,0);

  // A generic Unit without a dedicated intrinsic constraint is still protected by
  // the final PRIME content-edge invariant.
  const ordinary=new FakeElement('div');ordinary.dataset.dkdsUnitTemplate='field-v2';ordinary._rect={left:6,right:312,width:306,top:50,height:30};ordinary.clientWidth=306;ordinary.scrollWidth=306;prime.appendChild(ordinary);
  deficit=resolveInlineConstraintDeficit(prime);assert.strictEqual(deficit.boundaryDeficitPx,4,'Ordinary Unit content must retain the PRIME right inset rather than relying on CSS padding alone.');

  const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
  const presenter=new MobileWebSurfacePresenter();
  const projected=new FakeElement('section');projected.style.setProperty('padding','6px');projected.style.setProperty('padding-bottom','6px');
  presenter.normalizeProjectedNode(projected,'drawer','parameters');
  assert.strictEqual(projected.style.getPropertyValue('padding'),'0px','Projected parameter PRIME must hand its canonical inset to the physical Drawer safe-area wrapper.');
  assert.strictEqual(projected.dataset.dkdsMobileParameterInsetHandoff,'true');
  const frame=new FakeElement('div'),host=presenter.syncFrameContentHost(frame,projected,'drawer');
  assert.strictEqual(host.className,'dkds-mobile-drawer-content');assert.strictEqual(host.children[0],projected);assert.strictEqual(host.children[1]?.className,'dkds-mobile-drawer-safe-end','Drawer safe end must sit after the projected PRIME at the final clipping boundary.');

  const source=read('src/core/ui/modules/presentation/mobile-web-surface.js');
  const projectionSource=read('src/core/ui/modules/presentation/mobile-web-projection-contract.js');
  const foundation=read('src/core/ui/modules/composition/unit-template-foundation.js');
  const css=read('src/styles/platform/native-workspace-presentation.css');
  assert(foundation.includes('target:component||bar'),'Tabs intrinsic containment target must be the real atomic Tabs component.');
  assert(!source.includes('ensureDrawerScrollEnd'),'The failed fixed terminal spacer path must not return.');
  assert(!css.includes('dkds-mobile-drawer-scroll-end')&&!css.includes('mobile-parameter-scroll-end-inset'),'No old fixed terminal fake inset may remain in Mobile CSS.');
  assert(css.includes('[data-dkds-presentation-purpose="parameters"]>.dkds-mobile-drawer-scroll>.dkds-mobile-drawer-content{display:grid;grid-template-rows:minmax(0,1fr) auto;height:100%;min-height:100%'),'Parameter Drawer must expose a viewport-fill first track and a separate terminal safe row.');
assert(projectionSource.includes("Object.assign(values,{height:'100%',padding:'0px'"),'Projected parameter PRIME must preserve fill-height semantics instead of collapsing to intrinsic height.');
  assert(source.includes('syncDrawerSafeExtent(frame)')&&css.includes('dkds-mobile-drawer-safe-end'),'Bottom safety must follow live projected overflow instead of PRIME box height alone.');
  assert(css.includes('>.dkds-mobile-drawer-scroll::-webkit-scrollbar{display:none;width:0;height:0}'),'Outer Drawer scrollbar stays hidden while scrolling remains enabled.');
  console.log('v3.71.95 parameter intrinsic/inset regression PASS: real Tabs anatomy and physical Drawer safe area with live overflow compensation.');
} finally {global.document=old.document;global.window=old.window;global.ResizeObserver=old.ResizeObserver;global.MutationObserver=old.MutationObserver;global.CustomEvent=old.CustomEvent;global.DKDSStyleGate=old.StyleGate;}
