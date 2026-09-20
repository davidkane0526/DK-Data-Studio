'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

class Classes{constructor(...rows){this.rows=new Set(rows);}contains(v){return this.rows.has(v);}add(...rows){rows.forEach(v=>this.rows.add(v));}remove(...rows){rows.forEach(v=>this.rows.delete(v));}}
class StyleDecl{constructor(){this.rows={};}getPropertyValue(k){return this.rows[k]||'';}getPropertyPriority(){return '';}setProperty(k,v){this.rows[k]=String(v);}removeProperty(k){delete this.rows[k];}}
class FakeElement{
  constructor(className=''){this.nodeType=1;this.dataset={};this.className=className;this.classList=new Classes(...String(className).split(/\s+/).filter(Boolean));this.children=[];this.parentNode=null;this.parentElement=null;this.style=new StyleDecl();this.isConnected=true;}
  detach(node){const owner=node?.parentNode;if(!owner)return;const i=owner.children.indexOf(node);if(i>=0)owner.children.splice(i,1);node.parentNode=null;node.parentElement=null;}
  append(node){return this.appendChild(node);} appendChild(node){this.detach(node);node.parentNode=this;node.parentElement=this;this.children.push(node);return node;}
  insertBefore(node,before=null){this.detach(node);node.parentNode=this;node.parentElement=this;const i=before?this.children.indexOf(before):-1;if(i>=0)this.children.splice(i,0,node);else this.children.push(node);return node;}
  contains(node){if(node===this)return true;return this.children.some(child=>child===node||child.contains?.(node));}
  remove(){this.detach(this);this.isConnected=false;}
  querySelector(selector){
    if(selector===':scope > .dkds-mobile-drawer-scroll')return this.children.find(x=>x.classList?.contains('dkds-mobile-drawer-scroll'))||null;
    if(selector===':scope > .dkds-mobile-drawer-content')return this.children.find(x=>x.classList?.contains('dkds-mobile-drawer-content'))||null;
    if(selector==='[data-plugin-canvas-slot="right"]')return this._right||null;
    if(selector==='[data-plugin-canvas-slot="bottom"]')return this._bottom||null;
    if(selector==='[data-plugin-canvas-slot="overlay"]')return this._overlay||null;
    return null;
  }
  closest(){return null;} querySelectorAll(){return[];} addEventListener(){} removeEventListener(){} setAttribute(){}
}

const old={document:global.document,window:global.window,gate:global.DKDSStyleGate,storage:global.localStorage,MutationObserver:global.MutationObserver};
const activity='resonance-analysis',surfaceId='group';
let projectedNode=null;
const fakeDocument={documentElement:{dataset:{dkdsHost:'mobile'},classList:new Classes('react-native-client')},createElement:()=>new FakeElement(),querySelector(selector){return selector.includes(`data-dkds-workspace-activity="${activity}"`)&&selector.includes(`data-dkds-workspace-surface-id="${surfaceId}"`)?projectedNode:null;}};
global.document=fakeDocument;global.window={document:fakeDocument,innerWidth:390,innerHeight:700,addEventListener(){},removeEventListener(){}};global.localStorage={getItem(){return null;},setItem(){},removeItem(){}};global.MutationObserver=undefined;
global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(node,p,v){node.style.setProperty(p,v);return true;},setToken(node,p,v){node.style.setProperty(p,v);return true;},remove(node,p){node.style.removeProperty(p);return true;}};global.window.DKDSStyleGate=global.DKDSStyleGate;
try{
  const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
  const presenter=new MobileWebSurfacePresenter();
  const slot=new FakeElement('dkds-plugin-canvas-bottom');
  const frame=new FakeElement('dkds-mobile-surface-frame');
  projectedNode=new FakeElement('dkds-portable-view');projectedNode.dataset.dkdsWorkspaceActivity=activity;projectedNode.dataset.dkdsWorkspaceSurfaceId=surfaceId;
  // Reproduce the real lifecycle: semantic slot already contains the live Surface,
  // then Presenter appends a projection frame. Old v3.71.101 left both as siblings,
  // so two flex:1 children split the companion block size roughly in half.
  slot.append(projectedNode);slot.append(frame);
  assert.deepStrictEqual(slot.children,[projectedNode,frame]);
  presenter.syncFrameContentHost(frame,projectedNode,'companion-bottom');
  assert.deepStrictEqual(slot.children,[frame],'Companion slot must expose exactly one physical projection shell.');
  assert.strictEqual(frame.children.length,1);assert.strictEqual(frame.children[0],projectedNode,'Projected Surface must live inside the companion frame, never beside it.');
  assert.strictEqual(frame.contains(projectedNode),true);

  // Stable fast path must reject an empty shell or a Surface moved outside it.
  const rootNode=new FakeElement('root');rootNode._bottom=slot;presenter.activeRoot=rootNode;presenter.activeActivity=activity;presenter.decoratedNodes.add(projectedNode);
  presenter.projectedNodes.set(projectedNode,{frame,region:'companion-bottom'});
  const workspace={surfaces:[{surfaceId,active:true,role:'scientific-secondary',presentation:{region:'companion-bottom'}}]};
  assert.strictEqual(presenter.projectionStillValid(workspace,activity,rootNode),true,'A companion projection is stable only while its frame contains the live Surface.');
  slot.append(projectedNode);
  assert.strictEqual(frame.contains(projectedNode),false);
  assert.strictEqual(presenter.projectionStillValid(workspace,activity,rootNode),false,'Empty companion frame + sibling Surface must never pass the stable no-mutation path.');

  const source=read('src/core/ui/modules/presentation/mobile-web-surface.js');
  assert(source.includes('if(node.parentNode!==frame)'),'Non-Drawer projection must enforce frame ownership of the live Surface.');
  assert(source.includes('!saved.frame.contains?.(node)'),'Stable projection validation must reject a frame that no longer contains its Surface.');
  assert(!/resonance|respar|\.ter-|pulse-|vth-|data-center/i.test(source),'Companion frame ownership must remain domain-blind.');
  console.log('v3.71.102 Mobile companion frame-content ownership PASS: one frame, one contained Surface, no half-height sibling flex split.');
} finally {global.document=old.document;global.window=old.window;global.DKDSStyleGate=old.gate;global.localStorage=old.storage;global.MutationObserver=old.MutationObserver;}
