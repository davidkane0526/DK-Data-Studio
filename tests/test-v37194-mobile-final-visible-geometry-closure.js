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
const old={window:global.window,document:global.document,gate:global.DKDSStyleGate,storage:global.localStorage,innerWidth:global.innerWidth,innerHeight:global.innerHeight};
global.window={innerWidth:744,innerHeight:420,addEventListener(){},removeEventListener(){}};global.innerWidth=744;global.innerHeight=420;
global.document={documentElement:{dataset:{dkdsHost:'mobile'},classList:new Classes('react-native-client')}};global.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(node,p,v){node?.style?.setProperty?.(p,v);return true;},setToken(node,p,v){node?.style?.setProperty?.(p,v);return true;},remove(node,p){node?.style?.removeProperty?.(p);return true;}};global.window.DKDSStyleGate=global.DKDSStyleGate;
try{
  const pkg=json('package.json'),app=json('mobile/app.json');assert(/^3\.71\.(?:9[9]|[1-9]\d{2,})$/.test(pkg.version));assert.strictEqual(app.expo.version,pkg.version);assert(app.expo.android.versionCode>=239);
  const geom=require('../src/core/ui/modules/composition/unit-geometry-constraints');
  const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
  // Active projected roots are not replayed by generic Unit settlement; only descendants reflow.
  const prime={nodeType:1,dataset:{dkdsUnitLayoutRecipe:'identity',dkdsMobileRegion:'drawer',dkdsMobileActive:'true'},style:new StyleDecl(),children:[],querySelectorAll(){return this.children;}};
  const child={nodeType:1,dataset:{dkdsUnitLayoutRecipe:'form-grid-2'},children:[],__dkdsUnitLayoutReflow(){this.count=(this.count||0)+1;}};prime.children=[child];prime.__dkdsUnitLayoutReflow=()=>{throw new Error('projected root must not reflow');};
  geom.reflowUnitGeometry(prime,{passes:2,includeRoot:true});assert.strictEqual(child.count,2);

  // Parameter bottom safe extent still follows real descendant overflow.
  const presenter=new MobileWebSurfacePresenter(),content={getBoundingClientRect(){return{height:700};},clientHeight:700,scrollHeight:720},safe={dataset:{},style:new StyleDecl()},frame={dataset:{dkdsPresentationPurpose:'parameters'}};
  presenter.drawerContentNode=()=>content;presenter.drawerSafeEnd=()=>safe;assert.strictEqual(presenter.syncDrawerSafeExtent(frame),20);assert.strictEqual(safe.style.getPropertyValue('margin-top'),'20px');

  const css=read('src/styles/platform/native-workspace-presentation.css'),source=read('src/core/ui/modules/presentation/mobile-web-surface.js');
  // Final companion geometry is now a direct workspace split -> viewport bound path.
  assert(css.includes('--dkds-mobile-right-track:var(--dkds-plugin-canvas-right-width,34%)'));
  assert(css.includes('--dkds-mobile-bottom-track:var(--dkds-plugin-canvas-bottom-height,36%)'));
  assert(css.includes('grid-template-rows:minmax(0,1fr) var(--dkds-mobile-bottom-seam) var(--dkds-mobile-bottom-track)'));
  assert(!source.includes('fitCompanionTracks')&&!source.includes('syncCompanionBottomConstraints'));
  assert(!css.includes('--dkds-mobile-primary-track-resolved')&&!css.includes('--dkds-mobile-unit-bottom-min'));
  assert(css.includes('.dkds-mobile-drawer-content>.dkds-mobile-drawer-safe-end')||css.includes('dkds-mobile-drawer-safe-end'));
  console.log('v3.71.94 regression updated: projected-root settlement and Drawer safe extent remain, while companion outer geometry is workspace-owned only.');
} finally {global.window=old.window;global.document=old.document;global.DKDSStyleGate=old.gate;global.localStorage=old.storage;global.innerWidth=old.innerWidth;global.innerHeight=old.innerHeight;}
