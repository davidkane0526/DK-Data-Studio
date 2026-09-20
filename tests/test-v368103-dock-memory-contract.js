'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
require('./test-v368102-pulse-memory-geometry');
const css=read('src/styles/structure/super-top-contract.css');
assert(css.includes('[data-dkds-portable-sizing="fill"]:not([data-dkds-mobile-region])'));
for(const name of ['height','min-height','max-height','flex','overflow'])assert(css.includes(`var(--dkds-portable-fill-${name},`));
const memory=read('src/styles/presentation/plugin-chrome.css');
assert(memory.includes('grid-column:2;grid-row:1 / 4;align-self:center'));
assert(!memory.includes('is-releasable:hover .dkds-memory-component-value'));
const visible=memory.match(/is-releasable:hover \.dkds-memory-release[^{}]*\{([^}]+)\}/)[1];
assert(!/position|justify|margin|padding|width|height|transform/.test(visible),'Hover may change visibility only, never geometry.');
assert(memory.includes('.dkds-memory-release {position:static;flex:0 0 auto'));
assert(read('src/plugins/pulse-sampler-tool/unit-presentation.js').includes("variant:'stack-comfortable'"));
assert(!read('src/plugins/pulse-sampler-tool/unit-presentation.js').includes('--dkds-portable-docked-'),'Production Unit presentation must not fight Core dock defaults.');
const contract=JSON.parse(read('sdk/contract.json'));assert.deepEqual(contract.portableSizing.values,['content','fill']);
// Execute the real PortableView dock-placement method against a small DOM adapter.
// This validates lifecycle/saved-height policy, not browser layout or visual acceptance.
const writes=[];
const sandbox={module:{exports:{}},console,require(id){
 if(id==='../foundation/shortcuts')return {cleanupCall:f=>f?.(),resolveElement:x=>x};
 if(id==='./docking')return {normalizePlacement:x=>x,refreshDockZoneState(){}};
 if(id==='ui/style-ownership-gate')return {set:(el,k,v)=>{el.style[k]=v;writes.push([k,v]);},setToken(){},remove:(el,k)=>delete el.style[k],KINDS:{}};
 return {};
},requestAnimationFrame:()=>0,window:{dispatchEvent(){}},Event:class{},document:{documentElement:{dataset:{}}}};
vm.runInNewContext(read('src/core/ui/modules/layout/portable-view.js'),sandbox);
const {PortableView}=sandbox.module.exports;
assert.throws(()=>new PortableView({owner:'test'},'bad',{}, {sizing:'invalid'}),/Unknown PortableView sizing/);
function placement(sizing,side){
 writes.length=0;
 const classes=new Set(),wrapper={style:{},dataset:{},classList:{remove(...xs){xs.forEach(x=>classes.delete(x));},add(...xs){xs.forEach(x=>classes.add(x));},contains:x=>classes.has(x)},closest(){return null;}};
 const view=Object.create(PortableView.prototype);
 Object.assign(view,{wrapper,spec:{sizing},scope:{},availablePlacements:()=>['left','right'],zone:()=>({appendChild(){}}),readState:()=>({dockedBounds:{[side]:{height:220}}}),writeState(){},syncChrome(){},refreshPlacementButton(){},bindStickyViewport(){},raiseLayer(){},original:{},emit(){}});
 view.place(side,{persist:false});return {wrapper,writes:[...writes]};
}
for(const side of ['left','right']){
 assert.equal(placement('content',side).wrapper.style.height,'220px');
 const fill=placement('fill',side);assert.equal(fill.wrapper.style.height,undefined);assert.equal(fill.wrapper.style.width,'100%');
}
console.log('Dock sizing runtime/saved-state + memory visibility-only geometry contract PASS (visual acceptance pending)');
