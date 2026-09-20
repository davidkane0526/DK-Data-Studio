'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json'),app=json('mobile/app.json');
const versionNumber=v=>Number(String(v).split('.').map((n,i)=>Number(n)*[10000,100,1][i]).reduce((a,b)=>a+b,0));
assert(versionNumber(pkg.version)>=versionNumber('3.71.99'));
assert.strictEqual(app.expo.version,pkg.version);assert(app.expo.android.versionCode>=239);

const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const css=read('src/styles/platform/native-workspace-presentation.css');
const workspace=read('src/core/ui/modules/layout/workspace.js');
const scientific=read('src/core/ui/modules/composition/scientific.js');
const composition=read('src/core/ui/composition/composition.json');

// The 3.71.98 profile-specific restoration is superseded by one generic Core
// companion contract. No profile-specific allocator/state generation may return.
assert(!fs.existsSync(path.join(root,'src/core/ui/modules/presentation/mobile-scientific-workspace-allocation.js')));
assert(!composition.includes('mobile-scientific-workspace-allocation'));
assert(!css.includes('data-dkds-mobile-scientific-allocation'));
assert(!scientific.includes('accepted-scientific-v2')&&!scientific.includes('canvasMobileStateVersion'));
assert(workspace.includes("MOBILE_SPLIT_STATE_SCHEMA='workspace-owned-v2'"));
assert(!workspace.includes('mobileStateVersion'));

// Closing any Drawer is now isolated structurally: Presenter has no companion
// resync API at all, so parameter close cannot enter a chart/layout resize chain.
for(const token of ['syncCompanionBottomConstraints','scheduleCompanionViewportReflow','installCompanionBlockListener','releaseCompanionBlockListener'])assert(!presenter.includes(token),`Obsolete companion resync path returned: ${token}`);
assert(presenter.includes('installProjectionDetachObserver')&&presenter.includes('restoreNode(node)'),'Detach-only Drawer shell cleanup must remain.');

// Stable viewport-bounded split geometry is universal, not accepted-scientific-only.
assert(css.includes('--dkds-mobile-right-track:var(--dkds-plugin-canvas-right-width,34%)'));
assert(css.includes('--dkds-mobile-bottom-track:var(--dkds-plugin-canvas-bottom-height,36%)'));
assert(!css.includes('--dkds-mobile-unit-right-min')&&!css.includes('--dkds-mobile-unit-bottom-min'));
assert(!/resonance-workbench|respar|ter-analysis|pulse-analysis/i.test(presenter));
console.log('v3.71.98 regression updated: the former profile restoration is now subsumed by the generic workspace-owned Mobile companion contract.');
