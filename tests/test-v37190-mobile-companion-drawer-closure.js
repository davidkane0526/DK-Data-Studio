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
const css=read('src/styles/platform/native-workspace-presentation.css');

// 3.71.90 correctly identified that inner scrollHeight cannot own an outer
// Surface. 3.71.99 completes that boundary by removing companion content
// negotiation from Presenter entirely.
assert(!constraints.includes('livePreferredBlockPx')&&!constraints.includes('scrollHeight+unitEndInset'));
for(const token of ['resolveInlineSurfaceConstraint','resolveBlockSurfaceConstraint','syncCompanionBottomConstraints','installCompanionBlockListener','scheduleCompanionBottomFit'])assert(!presenter.includes(token),`Content-driven companion path must stay removed: ${token}`);
assert(!css.includes('--dkds-mobile-unit-right-min')&&!css.includes('--dkds-mobile-unit-bottom-min')&&!css.includes('--dkds-mobile-primary-min-track'));
assert(css.includes('--dkds-mobile-right-track:var(--dkds-plugin-canvas-right-width,34%)'));
assert(css.includes('--dkds-mobile-bottom-track:var(--dkds-plugin-canvas-bottom-height,36%)'));

// Drawer remains an overlay and retains its own intrinsic width/hidden-scrollbar contract.
assert(css.includes('>.dkds-mobile-drawer-scroll::-webkit-scrollbar{display:none;width:0;height:0}'));
assert(!presenter.includes('syncDrawerOccupancy')&&!css.includes('--dkds-mobile-drawer-occupied'));
assert(!/respar|resonance-workbench|ter-analysis|pulse-analysis|transfer-vth/i.test(presenter));
console.log('v3.71.90 regression updated: scroll-content feedback stays retired and companion outer geometry is fully workspace-owned.');
