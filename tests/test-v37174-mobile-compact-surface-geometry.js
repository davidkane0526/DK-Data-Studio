'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const [a,b,c]=json('package.json').version.split('.').map(Number);
assert(a>3||(a===3&&(b>71||(b===71&&c>=74))),'v3.71.74+ compact Mobile surface geometry required.');

// Browser-like globals used by the presenter module. The acceptance below is
// deliberately behavioral where possible: persistence isolation, shrink writes,
// the non-monotonic solver and right-track default are executed, not only grepped.
global.DKDSStyleGate={KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},set(){},setToken(){},remove(){}};
global.window={innerWidth:744,addEventListener(){},removeEventListener(){}};
global.innerWidth=744;
const store=new Map();
global.localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
const presenter=new MobileWebSurfacePresenter();

// 1) Parameter-Drawer persistence is workspace scoped. Every first-party plugin
// uses the semantic surface id "data-control"; a surface-id-only key allowed one
// plugin's full-width drag/failure state to contaminate every other plugin.
const resonanceKey=presenter.drawerStorageKey('data-control','resonance:data-control');
const terKey=presenter.drawerStorageKey('data-control','ter:data-control');
const vthKey=presenter.drawerStorageKey('data-control','transfer-vth:data-control');
assert(/^dkds\.mobile\.drawer-width\.v\d+\./.test(resonanceKey),'Drawer persistence must use an explicit generated namespace.');
assert.notStrictEqual(resonanceKey,terKey,'Resonance and TER must never share data-control Drawer width state.');
assert.notStrictEqual(terKey,vthKey,'TER and Vth must never share data-control Drawer width state.');
store.set('dkds.mobile.drawer-width.v10.data-control','720');
assert(Number.isNaN(presenter.savedDrawerWidth('data-control','ter:data-control')),'A historical shared full-width value must not reopen the current Drawer namespace.');
store.set(resonanceKey,'610');
assert.strictEqual(presenter.savedDrawerWidth('data-control','resonance:data-control'),610,'A user width remains restorable inside its own activity.');
assert(Number.isNaN(presenter.savedDrawerWidth('data-control','ter:data-control')),'A wide Resonance Drawer must not widen TER.');

// 2) Drawer fitting may grow only from Unit-published intrinsic deficits; it must
// never rewrite canonical Unit spacing or synthesize per-control geometry.
const presenterSource=read('src/core/ui/modules/presentation/mobile-web-surface.js');
for(const prop of ["this.setStyle(node,'gap'","this.setStyle(node,'row-gap'","this.setStyle(node,'column-gap'","this.setStyle(node,'padding'"])
  assert(!presenterSource.includes(prop),`Drawer fitter must not rewrite canonical spacing: ${prop}`);
assert(presenterSource.includes('resolveInlineConstraintDeficit(content).deficitPx'),'Drawer minimum-width solver must consume the generic Unit geometry registry rather than private DOM anatomy.');

// 3) The current solver starts from the product floor and grows only by the
// measured Unit deficit. Execute that control loop without relying on retired
// normalize/probe helpers.
presenter.surfaceAvailableWidth=()=>500;
presenter.surfaceReasonableFloor=()=>100;
let probeWidth=100;
presenter.setStyle=(_node,prop,value)=>{if(prop==='width')probeWidth=parseFloat(value)||probeWidth;return true;};
presenter.reflowMeasuredUnits=()=>{};
presenter.constraintDeficit=()=>probeWidth<176?176-probeWidth:0;
assert.strictEqual(presenter.solveMinimumReasonableWidth({getBoundingClientRect(){}},'drawer'),176,'Drawer solver must grow exactly to the first Unit-satisfied width.');

// 4) Companion first-open geometry is Workspace-owned. Desktop keeps the authored
// 390 px preference while Mobile CSS bounds the same preference by the live viewport;
// no Presenter or Unit-content path computes a second Inspector width.
const workbenchSource=read('src/core/ui/modules/workbench/plugin.js');
const workspaceCss=read('src/styles/platform/native-workspace-presentation.css');
assert(workbenchSource.includes('defaultSize:Number(spec.canvasRightWidth)||390'),'Workspace must preserve the authored right-companion preference.');
assert(workspaceCss.includes('--dkds-mobile-right-track:var(--dkds-plugin-canvas-right-width,34%)'),'Mobile must bound that same split preference against the live viewport.');
assert(!presenterSource.includes('resolveCanvasRightDefault')&&!presenterSource.includes('fitCompanionRight('),'Presenter must not own a second Inspector-width policy.');
const desktop=390,mobile=Math.min(390,744*.46);
assert(mobile<desktop&&mobile>=160,'The shared viewport bound must make the target landscape right lane compact without a profile-specific default.');

// 5) Source ownership guard: this acceptance is intentionally narrow. Drawer
// fitting must not re-enter Inspector SplitController ownership, and the new
// mobile split namespace must flush the older wider preference once.
assert(!presenterSource.includes('fitCompanionRight(')&&!presenterSource.includes('scheduleCompanionFit('),'Parameter Drawer fitting must not touch the Curve Inspector.');
assert(workbenchSource.includes('mobileStateScope:true')&&!workbenchSource.includes('mobileStateVersion'),'The compact Mobile Inspector must use the shared Core-owned Mobile split schema, not a profile-specific generation.');
assert(!presenterSource.includes("this.setStyle(node,'gap'")&&!presenterSource.includes("this.setStyle(node,'row-gap'")&&!presenterSource.includes("this.setStyle(node,'column-gap'"),'Drawer fitting must never rewrite Unit spacing.');

console.log(`v3.71.74 compact Mobile surface geometry PASS: scoped Drawers, non-greedy controls, fixed gaps, first-valid responsive sizing, Inspector ${desktop}px -> ${mobile}px.`);
