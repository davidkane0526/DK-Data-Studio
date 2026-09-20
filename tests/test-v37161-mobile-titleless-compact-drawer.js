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
{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major>3||(major===3&&(minor>71||(minor===71&&patch>=61))),'v3.71.61+ Mobile titleless/compact-drawer policy required.');}
assert(Number(json('mobile/app.json').expo.android.versionCode)>=202,'Android versionCode must retain the v3.71.61+ baseline.');

// Contract A: every plugin-local page/activity header is host-owned on native Mobile,
// including nested Unit pageHeader composition such as Pulse Sampler.
const shell=read('src/styles/platform/native-client-shell.css');
assert(shell.includes('.analysis-page .analysis-page-header{display:none}'),'Native Mobile must suppress plugin-local page headers at any depth.');
assert(!shell.includes('.analysis-page>.analysis-page-header{display:none}'),'The obsolete direct-child-only header rule must not return.');
assert(shell.includes('#pluginManagerPage>.analysis-page-header')&&shell.includes('#automationTestPage>.analysis-page-header'),'Non-plugin system pages may keep their explicit native headers.');
const pulse=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
assert(pulse.includes("units.pageHeader.create(body,{variant:'page-owned',title:'脉冲与采样处理'"),'Regression fixture requires a nested Unit page header so the generic Mobile contract is exercised.');

// Contract B: automatic parameter-drawer fit is content-derived. Unit responsive
// composition may collapse naturally; viewport percentages/caps are not a sizing input.
const presenterSource=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const nativeCss=read('src/styles/platform/native-workspace-presentation.css');
assert(presenterSource.includes('drawer-width.v12.'),'Current Drawer sizing must use the v10 persistence generation.');
assert(presenterSource.includes('solveMinimumReasonableWidth(frame,region='),'Mobile Presenter must own the Drawer minimum-reasonable-width solver.');
assert(!/viewport\*\.[0-9]+/.test(presenterSource),'Automatic drawer width must not be derived from a viewport ratio.');
assert(!nativeCss.includes('width:min(32vw,420px'),'Retired one-third/420px drawer geometry must not return.');

global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(el,p,v){el?.style?.setProperty?.(p,String(v));return v;},setToken(el,p,v){return this.set(el,p,v);},remove(el,p){el?.style?.removeProperty?.(p);return true;}};
const store=new Map([['dkds.mobile.drawer-width.v2.data-control','680']]);
global.window={innerWidth:744,addEventListener(){},removeEventListener(){}};global.innerWidth=744;
global.localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value))};
const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
const presenter=new MobileWebSurfacePresenter();
assert.strictEqual(presenter.drawerStorageKey('data-control'),'dkds.mobile.drawer-width.v12.data-control','New measured defaults must not inherit prior greedy-width persistence.');
assert(Number.isNaN(presenter.savedDrawerWidth('data-control')),'The old v2 over-wide saved drawer must not override current content-derived sizing.');
assert.strictEqual(presenter.drawerBounds().base,presenter.semanticSearchFloorPx(),'Simple parameter surfaces start from the compact semantic probe floor.');
assert(presenter.drawerBounds().base<160,'Semantic Drawer probing must not reuse the ordinary 260px PortableView minimum.');
assert(presenter.drawerBounds().max>600,'User resize remains bounded only by actual available space, not a 420px design cap.');
assert.strictEqual(presenter.clampDrawerWidth(620,280),620,'User drag may intentionally widen the drawer beyond its computed minimum.');

console.log('v3.71.61 Mobile plugin-title suppression + content-derived parameter drawer PASS');
