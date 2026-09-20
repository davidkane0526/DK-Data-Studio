'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

class StyleDecl{constructor(){this.rows={};}getPropertyValue(k){return this.rows[k]||'';}getPropertyPriority(){return '';}setProperty(k,v){this.rows[k]=String(v);}removeProperty(k){delete this.rows[k];}}
class Classes{constructor(...rows){this.rows=new Set(rows);}contains(v){return this.rows.has(v);}add(v){this.rows.add(v);}remove(v){this.rows.delete(v);}}
class FakeMutationObserver{constructor(cb){this.cb=cb;this.rows=[];FakeMutationObserver.instances.push(this);}observe(node,opts){this.rows.push({node,opts});}disconnect(){this.disconnected=true;}fire(records=[]){this.cb(records);}}
FakeMutationObserver.instances=[];
const old={window:global.window,document:global.document,MutationObserver:global.MutationObserver,gate:global.DKDSStyleGate,storage:global.localStorage};
global.window={innerWidth:744,innerHeight:420,addEventListener(){},removeEventListener(){}};
global.document={documentElement:{dataset:{dkdsHost:'mobile'},classList:new Classes('react-native-client')}};
global.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
global.MutationObserver=FakeMutationObserver;
global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(node,p,v){node.style.setProperty(p,v);return true;},setToken(node,p,v){node.style.setProperty(p,v);return true;},remove(node,p){node.style.removeProperty(p);return true;}};global.window.DKDSStyleGate=global.DKDSStyleGate;
try{
  const pkg=json('package.json'),app=json('mobile/app.json');
  const versionNumber=v=>Number(String(v).split('.').map((n,i)=>Number(n)*[10000,100,1][i]).reduce((a,b)=>a+b,0));
  assert(versionNumber(pkg.version)>=versionNumber('3.71.96'));assert.strictEqual(app.expo.version,pkg.version);assert(app.expo.android.versionCode>=236);
  const ProjectionContract=require('../src/core/ui/modules/presentation/mobile-web-projection-contract');
  const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');

  // Initial projection still normalizes the outer companion root once. Ongoing
  // geometry ownership is no longer maintained by a style-fighting guard.
  const companion={dataset:{},style:new StyleDecl(),classList:new Classes(),querySelector(){return null;},querySelectorAll(){return[];}};
  const presenter=new MobileWebSurfacePresenter();presenter.normalizeProjectedNode(companion,'companion-right','');
  assert.strictEqual(companion.style.getPropertyValue('height'),'100%');
  assert.strictEqual(companion.style.getPropertyValue('flex'),'1 1 0');

  // PRIME close may park the live node before the next Presentation snapshot.
  // Detach-only observation retires the now-empty frame in the same microtask,
  // without observing or reasserting root style.
  let contained=true,detaches=0;
  const node={style:new StyleDecl(),dataset:{},parentNode:{}};
  const frame={contains(target){return contained&&target===node;}};
  assert.strictEqual(ProjectionContract.installDetachObserver(frame,node,{isCurrent:()=>true,onDetached:()=>{detaches+=1;}}),true);
  assert.strictEqual(FakeMutationObserver.instances.length,1);
  const observer=FakeMutationObserver.instances[0];
  assert(observer.rows.some(row=>row.node===node.parentNode&&row.opts?.childList===true),'Detach observer must watch only the projected root parent.');
  assert(!observer.rows.some(row=>row.opts?.attributes),'Detach observer must not watch root style mutations.');
  observer.fire([{type:'attributes',target:node}]);assert.strictEqual(detaches,0);
  contained=false;observer.fire([{type:'childList',target:node.parentNode}]);assert.strictEqual(detaches,1,'Detached/parked PRIME must retire its projection shell without waiting for another snapshot.');
  ProjectionContract.releaseDetachObserver(frame);assert.strictEqual(observer.disconnected,true);

  // Exercise immediate shell retirement through Presenter.restoreNode.
  FakeMutationObserver.instances.length=0;
  let drawerContained=true,drawerRemoved=false;
  const parking={closest(sel){return sel==='.dkds-analysis-parking'?this:null;}};
  const drawerNode={dataset:{},style:new StyleDecl(),classList:new Classes('dkds-prime-hidden'),parentNode:parking,parentElement:parking,querySelector(){return null;},querySelectorAll(){return[];}};
  const drawerFrame={dataset:{dkdsMobileFrameRegion:'drawer',dkdsMobileActive:'true'},contains(target){return drawerContained&&target===drawerNode;},querySelector(){return null;},closest(){return null;},remove(){drawerRemoved=true;},isConnected:true};
  const drawerPresenter=new MobileWebSurfacePresenter();
  drawerPresenter.projectedNodes.set(drawerNode,{frame:drawerFrame,region:'drawer',purpose:'parameters',inline:null,parent:null,next:null});
  drawerPresenter.installProjectionDetachObserver(drawerFrame,drawerNode);
  const drawerObserver=FakeMutationObserver.instances[0];
  drawerContained=false;drawerObserver.fire([{type:'childList',target:parking}]);
  assert.strictEqual(drawerRemoved,true,'Detached parameter PRIME must remove the empty Drawer frame immediately.');
  assert.strictEqual(drawerPresenter.projectedNodes.has(drawerNode),false);
  assert.strictEqual(drawerNode.parentNode,parking);

  const surface=read('src/core/ui/modules/presentation/mobile-web-surface.js');
  assert(surface.includes('installProjectionDetachObserver(saved.frame,node)'),'Every live projected Surface must install detach-only lifecycle cleanup.');
  assert(surface.includes('this.releaseProjectionDetachObserver(frame);'),'Detach observer must be disconnected before restore/removal.');
  assert(!surface.includes('installProjectionIntegrityGuard')&&!surface.includes('onReassert'),'Style-fighting projection integrity guard must remain removed.');
  assert(!/\.respar|\.ter-|\.pulse-/.test(surface),'Mobile Presenter lifecycle fix must remain domain-blind.');
  console.log('v3.71.96 projection lifecycle PASS: projected roots normalize once and parked PRIME shells retire immediately without a style-reassert guard.');
} finally {global.window=old.window;global.document=old.document;global.MutationObserver=old.MutationObserver;global.DKDSStyleGate=old.gate;global.localStorage=old.storage;}
