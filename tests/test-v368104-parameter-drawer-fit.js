'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),Module=require('module');
const root=path.resolve(__dirname,'..'),read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const presenterSource=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const css=read('src/styles/platform/native-workspace-presentation.css');
assert(presenterSource.includes('const max=Math.max(autoMax,Math.min(680,hardMax))'),'Drawer hard ceiling must allow measured width-critical content to use the available phone viewport.');
assert(presenterSource.includes('scroll>client+2')&&presenterSource.includes('rect.right-boundary.right'),'Drawer fit must combine outer geometry overflow with intrinsic text/content overflow.');
assert(presenterSource.includes('Math.min(bounds.max,Math.ceil(target+overflow+8))'),'Content-fit may exceed the compact auto target only when measured overflow requires it.');
assert(css.includes('max-width:min(calc(100vw - 12px),680px)'),'CSS ceiling must match the runtime content-fit ceiling.');

// Screenshot-class viewport regression: at 436 px wide the old 88vw ceiling was
// ~384 px and could clip the rightmost Vg control. Model a natural three-tab row
// ending at 396 px. The solver must grow just beyond that measured edge, not to
// the full available 424 px.
global.DKDSStyleGate={
  KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},
  set(el,property,value){if(el?.style?.setProperty)el.style.setProperty(property,String(value));else if(el?.style)el.style[property]=String(value);return value;},
  remove(el,property){if(el?.style?.removeProperty)el.style.removeProperty(property);else if(el?.style)delete el.style[property];return true;}
};
const oldWindow=global.window,oldStorage=global.localStorage,oldRaf=global.requestAnimationFrame,oldCancel=global.cancelAnimationFrame;
global.window={innerWidth:436};global.localStorage={getItem(){return null;},setItem(){}};global.requestAnimationFrame=fn=>{fn();return 1;};global.cancelAnimationFrame=()=>{};
delete require.cache[require.resolve('../src/core/ui/modules/presentation/mobile-web-surface')];
const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
const runtime=new MobileWebSurfacePresenter();
let frame;
const vgRow={hidden:false,classList:{contains:()=>false},matches:()=>false,style:{overflowX:''},clientWidth:42,scrollWidth:42,getBoundingClientRect(){return {left:12,right:396};}};
const content={classList:{contains:()=>false},getBoundingClientRect(){const width=Number.parseFloat(frame.style.width)||320;return {left:0,right:width};},querySelectorAll:()=>[vgRow]};
frame={isConnected:true,dataset:{},children:[content],style:{width:''},getBoundingClientRect(){const width=Number.parseFloat(this.style.width)||320;return {left:0,right:width,width};}};
runtime.fitDrawerToContent(frame,'pulse-parameters');
const solved=Number.parseFloat(frame.style.width);
assert.equal(solved,404,'436 px screenshot-class drawer should grow to measured Vg edge + 8 px safety only.');
assert(solved>436*.88,'Regression must prove the old 88vw cap no longer clips the Vg tab.');
assert(solved<436-12,'Content fit must not greedily consume the whole phone viewport.');

// Intrinsic clipping must also count even when the button border box is inside
// the drawer. This catches long command labels whose text is truncated internally.
const intrinsic={hidden:false,classList:{contains:()=>false},matches:()=>false,style:{overflowX:''},get clientWidth(){const width=Number.parseFloat(frame.style.width)||320;return Math.max(60,width-300);},scrollWidth:96,getBoundingClientRect(){const width=Number.parseFloat(frame.style.width)||320;return {left:12,right:Math.min(width-12,180)};}};
content.querySelectorAll=()=>[intrinsic];frame.style.width='';
const intrinsicSolved=runtime.solveCompactDrawerWidth(frame);
assert(intrinsicSolved>=404&&intrinsicSolved<=424,'Intrinsic button text overflow must expand the drawer but remain viewport-bounded.');

global.window=oldWindow;global.localStorage=oldStorage;global.requestAnimationFrame=oldRaf;global.cancelAnimationFrame=oldCancel;
console.log('v3.68.104 parameter drawer content-fit / Vg visibility regression PASS.');
