'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json'),app=json('mobile/app.json');
const versionNumber=v=>Number(String(v).split('.').map((n,i)=>Number(n)*[10000,100,1][i]).reduce((a,b)=>a+b,0));
assert(versionNumber(pkg.version)>=versionNumber('3.71.99'));assert.strictEqual(app.expo.version,pkg.version);assert(app.expo.android.versionCode>=239);
const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const constraints=read('src/core/ui/modules/composition/unit-geometry-constraints.js');
const foundation=read('src/core/ui/modules/composition/unit-template-foundation.js');
const css=read('src/styles/platform/native-workspace-presentation.css');

// The useful 3.71.92 fixes stay: Drawer intrinsic sizing targets real Tabs and
// live parameter safe-area ownership remains at the physical Drawer boundary.
assert(foundation.includes('target:component||bar'),'Tabs intrinsic constraint must target the real atomic Tabs component.');
assert(presenter.includes('syncDrawerSafeExtent(frame)')&&css.includes('dkds-mobile-drawer-safe-end'));
assert(css.includes('scrollbar-width:none')&&css.includes('>.dkds-mobile-drawer-scroll::-webkit-scrollbar{display:none;width:0;height:0}'));
assert(!presenter.includes('ensureDrawerScrollEnd')&&!css.includes('dkds-mobile-drawer-scroll-end'));
assert(!presenter.includes('companionInlineReservation')&&!css.includes('--dkds-mobile-drawer-occupied'));

// What 3.71.92 got wrong is now forbidden: Unit constraints may describe Unit
// internals, but Presenter/CSS cannot consume them as companion outer geometry.
assert(!presenter.includes('resolveInlineSurfaceConstraint')&&!presenter.includes('resolveBlockSurfaceConstraint'));
assert(!presenter.includes('syncCompanionBottomConstraints')&&!presenter.includes('installCompanionBlockListener'));
assert(!css.includes('--dkds-mobile-unit-right-min')&&!css.includes('--dkds-mobile-unit-bottom-min')&&!css.includes('--dkds-mobile-primary-min-track'));
assert(!constraints.includes('resolveBlockSurfaceFit'),'Live scroll-content fit path must remain retired.');
assert(css.includes('--dkds-mobile-right-track:var(--dkds-plugin-canvas-right-width,34%)'));
assert(css.includes('--dkds-mobile-bottom-track:var(--dkds-plugin-canvas-bottom-height,36%)'));
assert(!/respar|resonance-workbench|ter-analysis|pulse-analysis|transfer-vth/i.test(presenter));
console.log('v3.71.92 regression updated: Drawer fixes remain; content-driven companion geometry is now explicitly forbidden.');
