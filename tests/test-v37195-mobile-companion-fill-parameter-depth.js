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
const fakeNode=(classes=[])=>({dataset:{},style:new StyleDecl(),classList:new Classes(...classes),querySelector(){return null;},querySelectorAll(){return[];}});
const old={window:global.window,document:global.document,innerWidth:global.innerWidth,innerHeight:global.innerHeight,gate:global.DKDSStyleGate,storage:global.localStorage};
global.window={innerWidth:744,innerHeight:420,addEventListener(){},removeEventListener(){}};global.innerWidth=744;global.innerHeight=420;global.document={documentElement:{dataset:{dkdsHost:'mobile'},classList:new Classes('react-native-client')}};global.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(node,p,v){node.style.setProperty(p,v);return true;},setToken(node,p,v){node.style.setProperty(p,v);return true;},remove(node,p){node.style.removeProperty(p);return true;}};global.window.DKDSStyleGate=global.DKDSStyleGate;
try{
  const pkg=json('package.json'),app=json('mobile/app.json'),resonanceManifest=json('src/plugins/resonance-workbench/plugin.json');
  assert(/^3\.71\.(?:9[5-9]|[1-9]\d{2,})$/.test(pkg.version));assert.strictEqual(app.expo.version,pkg.version);assert(app.expo.android.versionCode>=235);assert.strictEqual(resonanceManifest.version,'3.63.8');
  const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
  const presenter=new MobileWebSurfacePresenter();
  const parameter=fakeNode();parameter.dataset.dkdsPresentationPurpose='parameters';presenter.normalizeProjectedNode(parameter,'drawer','parameters');
  assert.strictEqual(parameter.style.getPropertyValue('height'),'100%','Parameter PRIME must preserve fill-height so the last fill-row table can consume remaining Drawer height.');
  assert.strictEqual(parameter.style.getPropertyValue('padding'),'0px','Physical Drawer wrapper owns the parameter safe inset after projection.');
  const companion=fakeNode();presenter.normalizeProjectedNode(companion,'companion-bottom','');
  assert.strictEqual(companion.style.getPropertyValue('flex'),'1 1 0','Projected scientific companion must consume its Presenter frame rather than collapse to intrinsic content height.');
  assert.strictEqual(companion.style.getPropertyValue('height'),'100%');

  const nativeCss=read('src/styles/platform/native-workspace-presentation.css');
  const materialCss=read('src/styles/theme/material-renderer.css');
  const resonanceMobile=read('src/plugins/resonance-workbench/mobile.css');
  const resonancePresentation=read('src/plugins/resonance-workbench/unit-presentation.js');
  const pulse=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
  const presenterSource=read('src/core/ui/modules/presentation/mobile-web-surface.js');

  assert(nativeCss.includes(':where(.dkds-plugin-canvas-right,.dkds-plugin-canvas-bottom)>.dkds-mobile-surface-frame{display:flex;flex:1 1 0;flex-direction:column;align-items:stretch'),'Companion frame must be an explicit flex geometry shell.');
  assert(nativeCss.includes('[data-dkds-presentation-purpose="parameters"]>.dkds-mobile-drawer-scroll>.dkds-mobile-drawer-content{display:grid;grid-template-rows:minmax(0,1fr) auto;height:100%;min-height:100%'),'Parameter Drawer must allocate one fill track plus terminal safe row.');
  assert(materialCss.includes('>.dkds-mobile-drawer-scroll>.dkds-mobile-drawer-content>[data-dkds-material-content="true"]')&&materialCss.includes('box-shadow:none'),'Projected parameter PRIME must be flattened through Drawer wrappers so the last background layer cannot cast a second shadow.');
  assert(pulse.includes("variant:'fill-rows',geometry:{height:'100%',minHeight:'0'}")&&pulse.includes("variant:'scroll-pane',geometry:{minHeight:'120px',height:'100%'}"),'Pulse Sampler must retain its accepted fill-row -> final table chain; Mobile Core must not replace it with plugin-specific sizing.');
  assert(resonancePresentation.includes("pageId:'resonanceDedicatedPage'")&&read('src/plugins/resonance-workbench/plugin.css').includes('#resonanceDedicatedPage .respar-floating-body{min-height:0;overflow:auto'),'Resonance production page must retain one internal Inspector/Group scroll body; Core only makes the projected root consume its frame.');
  assert(!nativeCss.includes('[data-dkds-presentation-purpose="parameters"] :where(.dkds-content-header,.dkds-surface-header){grid-template-columns:1fr}'),'Parameter Header must not be forced into a second row.');
  assert(!presenterSource.includes('--dkds-mobile-drawer-occupied'),'Drawer/companion occupancy coupling must remain absent.');
  console.log('v3.71.95 Mobile companion/final-table/material-depth closure PASS.');
} finally {global.window=old.window;global.document=old.document;global.innerWidth=old.innerWidth;global.innerHeight=old.innerHeight;global.DKDSStyleGate=old.gate;global.localStorage=old.storage;}
