'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json'),app=json('mobile/app.json');
const versionNumber=value=>String(value).split('.').reduce((n,part)=>n*1000+(Number(part)||0),0);
assert(versionNumber(pkg.version)>=versionNumber('3.71.99'));
assert.strictEqual(app.expo.version,pkg.version);
assert(app.expo.android.versionCode>=239);

const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const css=read('src/styles/platform/native-workspace-presentation.css');
const workspace=read('src/core/ui/modules/layout/workspace.js');
const pluginWorkspace=read('src/core/ui/modules/workbench/plugin.js');
const scientific=read('src/core/ui/modules/composition/scientific.js');
const projection=read('src/core/ui/modules/presentation/mobile-web-projection-contract.js');
const composition=read('src/core/ui/composition/composition.json');

// One generic Mobile companion allocation contract. Presenter never measures
// Unit descendants to decide right/bottom outer tracks.
for(const forbidden of [
  'syncCompanionBottomConstraints','installCompanionBlockListener','releaseCompanionBlockListener',
  'companionSurfaceInlineConstraint','companionSurfaceBlockConstraint','fitCompanionTracks',
  'resolveInlineSurfaceConstraint','resolveBlockSurfaceConstraint','companionFitFrames','companionResizeFrames'
]) assert(!presenter.includes(forbidden),`Presenter must not retain content-driven companion geometry: ${forbidden}`);
assert(!presenter.includes('--dkds-mobile-unit-right-min')&&!presenter.includes('--dkds-mobile-unit-bottom-min'),'Presenter must not publish Unit-content outer-track tokens.');
assert(!fs.existsSync(path.join(root,'src/core/ui/modules/presentation/mobile-scientific-workspace-allocation.js')),'Scientific-profile allocation shim must be removed.');
assert(!composition.includes('mobile-scientific-workspace-allocation'),'Removed scientific allocation shim must not be bundled.');
assert(!css.includes('data-dkds-mobile-scientific-allocation'),'Mobile CSS must not branch outer geometry by scientific profile.');

// Workspace/user split is the single outer-geometry input for all semantic
// right/bottom companions, bounded by live viewport geometry.
assert(css.includes('--dkds-mobile-right-track:var(--dkds-plugin-canvas-right-width,34%)'));
assert(css.includes('--dkds-mobile-bottom-track:var(--dkds-plugin-canvas-bottom-height,36%)'));
assert(css.includes('grid-template-rows:minmax(0,1fr) var(--dkds-mobile-bottom-seam) var(--dkds-mobile-bottom-track)'));
assert(!css.includes('--dkds-mobile-unit-right-min')&&!css.includes('--dkds-mobile-unit-bottom-min')&&!css.includes('--dkds-mobile-primary-track-resolved'),'Unit content must not feed outer Mobile companion tracks.');
assert(css.includes('>.dkds-plugin-canvas-bottom{padding:0;box-sizing:border-box;overflow:hidden}')||css.includes('>.dkds-plugin-canvas-bottom{padding:0;box-sizing:border-box;overflow:hidden}'),'Companion slot is a geometry shell; Unit/panel owns its internal inset/scroll body.');
assert(projection.includes("...(companion?{flex:'1 1 0'}:{flex:''})")&&projection.includes("height:drawer?'auto':companion?'100%':'100%'"),'Projected companion root must fill its allocated shell without negotiating shell size.');

// Mobile split persistence is a framework schema, not a profile/plugin patch.
assert(workspace.includes("const MOBILE_SPLIT_STATE_SCHEMA='workspace-owned-v2'"));
assert(workspace.includes('`.mobile.${MOBILE_SPLIT_STATE_SCHEMA}`'));
assert(!workspace.includes('mobileStateVersion'),'Split persistence must not expose per-profile Mobile generations.');
assert(!pluginWorkspace.includes('canvasMobileStateVersion'));
assert(!scientific.includes('accepted-scientific-v2')&&!scientific.includes('canvasMobileStateVersion'));

// Parameter Drawer remains independent and keeps its existing content-fit path.
assert(presenter.includes('installDrawerConstraintListener')&&presenter.includes('solveMinimumReasonableWidth'));
assert(!presenter.includes('--dkds-mobile-drawer-occupied'));
assert(!/resonance-workbench|ter-analysis|pulse-sampler-tool|transfer-vth/i.test(presenter),'Presenter must remain domain blind.');

console.log('v3.71.99+ Mobile companion framework PASS: one workspace-owned outer-geometry contract, no profile allocation shim, no Unit-content feedback, and one generic Mobile split schema.');
