'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),Module=require('module');
const root=path.resolve(__dirname,'..'),read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const presenterSource=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const css=read('src/styles/platform/native-workspace-presentation.css');
assert(presenterSource.includes('solveMinimumReasonableWidth(frame,region='),'Drawer automatic width must use the shared measured minimum-reasonable-width solver.');
assert(presenterSource.includes('surfaceReasonableFloor(frame,region='),'Drawer must start from the Unit semantic floor.');
assert(presenterSource.includes('measureSurfaceOverflow(frame)'),'Drawer solver must evaluate final rendered overflow after Unit/container reflow.');
assert(!/viewport\*\.[0-9]+/.test(presenterSource),'Drawer automatic width must not be a viewport percentage.');
assert(!css.includes('width:min(32vw,420px'),'CSS must not restore the retired one-third/420px automatic width.');
assert(css.includes('max-width:calc(100vw - 12px)'),'Physical viewport bounds remain the only outer safety ceiling.');

// A simple shrinkable parameter surface should resolve to the compact semantic
// probe floor; content that really cannot fit may grow only by its measured deficit.
global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(el,p,v){el.style?.setProperty?.(p,String(v));return v;},setToken(el,p,v){return this.set(el,p,v);},remove(el,p){el.style?.removeProperty?.(p);return true;}};
class Style{constructor(){this.m=new Map();}setProperty(k,v){this.m.set(k,String(v));}removeProperty(k){this.m.delete(k);}getPropertyValue(k){return this.m.get(k)||'';}}
const oldWindow=global.window,oldStorage=global.localStorage,oldMO=global.MutationObserver;
global.window={innerWidth:744};global.localStorage={getItem(){return null;},setItem(){}};global.MutationObserver=undefined;
delete require.cache[require.resolve('../src/core/ui/modules/presentation/mobile-web-surface')];
const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
const runtime=new MobileWebSurfacePresenter();
const makeFrame=required=>{const style=new Style();let frame;const child={hidden:false,classList:{contains:()=>false},matches:()=>false,style:{overflowX:''},get clientWidth(){return Math.max(1,(parseFloat(style.getPropertyValue('width'))||260)-20);},get scrollWidth(){return Math.max(this.clientWidth,required||0);},getBoundingClientRect(){return {left:10,right:10+this.clientWidth,width:this.clientWidth};}};const content={classList:{contains:()=>false},matches:()=>false,style:{overflowX:''},get clientWidth(){return parseFloat(style.getPropertyValue('width'))||260;},get scrollWidth(){return this.clientWidth;},querySelectorAll(){return [child];},getBoundingClientRect(){return {left:0,right:this.clientWidth,width:this.clientWidth};}};frame={isConnected:true,dataset:{},children:[content],style,parentElement:{clientWidth:744},querySelectorAll:()=>[],closest:()=>null,getBoundingClientRect(){const width=parseFloat(style.getPropertyValue('width'))||260;return {left:0,right:width,width};}};return frame;};
const semanticFloor=runtime.semanticSearchFloorPx();
assert(semanticFloor<160,'Semantic Drawer probing must not reuse the ordinary 260px PortableView minimum.');
assert.strictEqual(runtime.solveCompactDrawerWidth(makeFrame(0)),semanticFloor,'Simple parameter content should stop at the compact semantic probe floor.');
const fitted=runtime.solveCompactDrawerWidth(makeFrame(316));
assert(fitted>=335&&fitted<=338,`Real overflow should grow only to its actual requirement, got ${fitted}.`);

global.window=oldWindow;global.localStorage=oldStorage;if(oldMO===undefined)delete global.MutationObserver;else global.MutationObserver=oldMO;
console.log('v3.68.104 parameter drawer measured minimum-width regression PASS.');
