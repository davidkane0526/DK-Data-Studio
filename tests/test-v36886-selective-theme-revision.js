'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const themeSource=read('src/core/theme/runtime.js');
const componentSource=read('src/core/theme/component-appearance.js');
const materialSource=read('src/core/theme/material-renderer.js');
const chartSource=read('src/core/scientific/chart-runtime.js');
const statusSource=read('src/plugins/status-monitor/plugin.js');
const mobileHost=read('src/core/host/mobile-host-runtime.js');

assert(themeSource.includes("const THEME_REVISION_CONSUMERS=Object.freeze(['raster','computed-style'])"),'Theme revision must be restricted to raster/computed-style consumers.');
assert(themeSource.includes('function subscribeRevision(owner,listener,{consumer}={})'),'Theme runtime must own selective revision subscriptions.');
assert(themeSource.includes("FrameScheduler.schedule('theme.revision.notify'"),'Theme revision notifications must be frame-coalesced by Core.');
assert(chartSource.includes("ThemeRuntime.subscribeRevision('core.scientific-chart',refreshRenderedTheme,{consumer:'computed-style'})"),'Scientific charts must consume selective Theme revision.');
assert(!chartSource.includes("addEventListener?.('dkds:theme-changed'"),'Scientific charts must not subscribe to the broad Theme event.');
assert(!componentSource.includes("addEventListener?.('dkds:theme-changed'"),'Component Appearance must not perform revision/event-driven whole-document repaint.');
assert(!materialSource.includes("addEventListener?.('dkds:theme-changed'"),'Material Renderer must not perform revision/event-driven whole-document repaint.');
assert(statusSource.includes("ctx.ui.dom.on(window,'dkds:theme-changed',onThemeChanged)")&&!statusSource.includes("ctx.ui.dom.on(window,'dkds:theme-profile-changed',onThemeChanged)"),'Status Monitor may consume semantic Theme state once, without duplicate profile+theme listeners.');
assert(mobileHost.includes("window.addEventListener('dkds:theme-changed',publish)"),'Mobile Host may retain the semantic Theme state bridge; it is not a paint revision subscriber.');
assert(themeSource.includes("if(active){applyProfileTokens(current);refreshVisualComposition();publishThemeRevision('setting'"),'Active Theme setting changes must synchronize DOM composition once before selective paint revision.');
assert(themeSource.includes("visualSynchronized:true,reason:'setting'"),'Theme setting event must be marked already synchronized so broad listeners cannot schedule a second DOM pass.');

const props=new Map(),events=new Map();
const rootStyle={setProperty:(k,v)=>props.set(k,String(v)),removeProperty:k=>props.delete(k)};
const classList={add(){},remove(){}};
const documentElement={style:rootStyle,dataset:{},classList};
let materialAssign=0,appearanceAssign=0,contrastRefresh=0,scheduled=0;
const sandbox={
  console,Map,Set,Object,String,Promise,JSON,Number,Math,CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}},
  localStorage:{getItem:()=>'',setItem:()=>{}},
  document:{documentElement,body:{},readyState:'complete'},
  getComputedStyle:()=>({getPropertyValue:k=>props.get(k)||''}),matchMedia:()=>({matches:false}),
  addEventListener(type,fn){if(!events.has(type))events.set(type,new Set());events.get(type).add(fn);},
  dispatchEvent(event){for(const fn of [...(events.get(event.type)||[])])fn(event);return true;},
  requestAnimationFrame:fn=>{fn(0);return 1;},cancelAnimationFrame(){},setTimeout:fn=>{fn();return 1;},clearTimeout(){},
  DKDSFrameScheduler:{PRIORITY:{GENERAL:50},schedule(_id,fn){scheduled++;fn();return()=>{};}},
  DKDSThemeMaterialRenderer:{refreshDerivedContrast(){contrastRefresh++;},assignSemanticRoles(){materialAssign++;},capabilities(){return {};},supports(){return false;}},
  DKDSThemeComponentAppearance:{assign(){appearanceAssign++;},consumption(){return {version:'test',components:{}};}},
  DKDSStyleGate:{KINDS:{CONFIG_TOKEN:'configuration-token'},set(el,prop,value){el?.style?.setProperty?.(prop,String(value));return value;},setToken(el,prop,value){el?.style?.setProperty?.(prop,String(value));return value;},remove(el,prop){el?.style?.removeProperty?.(prop);return true;}},
  window:null,globalThis:null
};
sandbox.window=sandbox;sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(read('sdk/theme-contract.js'),sandbox,{filename:'theme-contract.js'});
vm.runInContext(themeSource,sandbox,{filename:'theme-runtime.js'});
const T=sandbox.DKDSTheme;
assert(T&&typeof T.subscribeRevision==='function');
assert.throws(()=>T.subscribeRevision('bad',()=>{},{consumer:'dom'}),/raster or computed-style/,'Ordinary DOM must be rejected as a Theme revision consumer.');
let computedCalls=0,rasterCalls=0,lastReason='';
const offComputed=T.subscribeRevision('test.computed',snapshot=>{computedCalls++;lastReason=snapshot.reason;},{consumer:'computed-style'});
const offRaster=T.subscribeRevision('test.raster',()=>{rasterCalls++;},{consumer:'raster'});
const revision0=T.revision();
T.set('dark');
assert.equal(T.revision(),revision0+1);assert.equal(computedCalls,1);assert.equal(rasterCalls,1);assert.equal(lastReason,'mode');
const afterModeComposition={materialAssign,appearanceAssign,contrastRefresh};
T.registerProfile('test.theme',{label:'Test',settings:[{id:'blur',label:'Blur',type:'number',target:{scope:'material',key:'materialBlur'}}],modes:{light:{},dark:{}}});
T.setProfile('test.theme',{persist:false,broadcast:false});
const beforeSetting=T.revision(),beforeMaterial=materialAssign,beforeAppearance=appearanceAssign;
T.setSetting('test.theme','blur',12);
assert.equal(T.revision(),beforeSetting+1,'Active setting must advance Theme revision exactly once.');
assert.equal(materialAssign,beforeMaterial+1,'Active setting must perform one synchronous material composition pass.');
assert.equal(appearanceAssign,beforeAppearance+1,'Active setting must perform one synchronous component composition pass.');
const afterActiveSettingCalls=computedCalls;
T.registerProfile('inactive.theme',{label:'Inactive',settings:[{id:'blur',label:'Blur',type:'number',target:{scope:'material',key:'materialBlur'}}],modes:{light:{},dark:{}}});
const beforeInactive=T.revision();T.setSetting('inactive.theme','blur',9);
assert.equal(T.revision(),beforeInactive,'Inactive profile settings must not repaint the active Theme.');
assert.equal(computedCalls,afterActiveSettingCalls,'Inactive profile settings must not notify computed-style consumers.');
const state=T.revisionState();assert.equal(state.consumers['computed-style'],1);assert.equal(state.consumers.raster,1);assert(state.publishes>=3&&state.notifications>=6&&scheduled>=3);
offComputed();offRaster();assert.equal(T.revisionState().subscribers,0);
assert(afterModeComposition.materialAssign>0&&afterModeComposition.appearanceAssign>0&&afterModeComposition.contrastRefresh>0);

console.log('v3.68.86 selective Theme revision PASS: only raster/computed-style subscribe; DOM theme settings synchronize once without duplicate event repaint.');
