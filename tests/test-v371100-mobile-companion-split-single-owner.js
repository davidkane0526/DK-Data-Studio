'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const versionNumber=value=>String(value).split('.').reduce((n,part)=>n*1000+(Number(part)||0),0);
const pkg=json('package.json'),app=json('mobile/app.json');
assert(versionNumber(pkg.version)>=versionNumber('3.71.100'));
assert.strictEqual(app.expo.version,pkg.version);
assert(app.expo.android.versionCode>=240);

const State=require('../src/core/ui/modules/layout/state-resolver');
const css=read('src/styles/platform/native-workspace-presentation.css');
const workspace=read('src/core/ui/modules/layout/workspace.js');
const pluginWorkspace=read('src/core/ui/modules/workbench/plugin.js');
const portable=read('src/core/ui/modules/layout/portable-view.js');
const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');

// Desktop-authored pixel geometry stays Desktop-only. Mobile companions start
// from proportional defaults resolved against the actual Workspace extent.
const bottom=State.createLayoutState({id:'bottom',axis:'y',defaultSize:360,min:190,reserve:260,mobileOverlay:true,mobileMaxRatio:.58,mobileDefaultRatio:.36,mobileMin:0,placement:'bottom'});
assert.strictEqual(State.resolveLayout(bottom,{width:390,height:700},{nativeMobile:false}).effectiveSize,360);
assert.strictEqual(State.resolveLayout(bottom,{width:390,height:700},{nativeMobile:true}).effectiveSize,252,'Mobile Group companion must start from 36% of the live Workspace height, not the 360px Desktop default.');
assert.strictEqual(State.resolveLayout(bottom,{width:390,height:500},{nativeMobile:true}).effectiveSize,180,'Mobile default must scale with the real Workspace height.');

const right=State.createLayoutState({id:'right',axis:'x',defaultSize:390,min:280,reserve:520,mobileOverlay:true,mobileMaxRatio:.48,mobileDefaultRatio:.34,mobileMin:0,placement:'right'});
assert.strictEqual(State.resolveLayout(right,{width:1000,height:700},{nativeMobile:false}).effectiveSize,390);
assert.strictEqual(State.resolveLayout(right,{width:390,height:700},{nativeMobile:true}).effectiveSize,133,'Mobile Inspector companion must start from 34% of the live Workspace width, not the 390px Desktop default.');
assert.strictEqual(State.resolveLayout(right,{width:744,height:900},{nativeMobile:true}).effectiveSize,253);

// A real user adjustment becomes explicit intent and is then clamped by the
// same resolver on future viewport changes. There is no second CSS clamp.
const adjusted=State.withLayoutPreference(bottom,300,{height:700});
assert.strictEqual(State.resolveLayout(adjusted,{height:700},{nativeMobile:true}).effectiveSize,300);
assert.strictEqual(State.resolveLayout(adjusted,{height:420},{nativeMobile:true}).effectiveSize,180,'Persisted user intent must replay from the saved ratio when the Workspace extent shrinks, rather than reusing stale pixels.');
assert.strictEqual(State.resolveLayout(adjusted,{height:700},{nativeMobile:true}).effectiveSize,300,'The preferred size must recover when space returns.');

assert(pluginWorkspace.includes('mobileDefaultRatio:.34,mobileMin:0'),'Right companion must declare a generic Mobile proportional default at the Workspace split owner.');
assert(pluginWorkspace.includes('mobileDefaultRatio:.36,mobileMin:0'),'Bottom companion must declare a generic Mobile proportional default at the Workspace split owner.');
assert(!pluginWorkspace.includes('mobileMaxRatio:.48,mobileReserve:320')&&!pluginWorkspace.includes('mobileMaxRatio:.58,mobileReserve:240'),'Plugin canvas Mobile companions must not combine proportional defaults with unrelated fixed-pixel reserve owners.');
assert(workspace.includes("MOBILE_SPLIT_STATE_SCHEMA='workspace-owned-v2'"),'Mobile split schema must invalidate stale geometry saved by the former dual-owner model.');

assert(css.includes('--dkds-mobile-right-track:var(--dkds-plugin-canvas-right-width,34%)'));
assert(css.includes('--dkds-mobile-bottom-track:var(--dkds-plugin-canvas-bottom-height,36%)'));
assert(!css.includes('--dkds-mobile-right-track:clamp(')&&!css.includes('--dkds-mobile-bottom-track:clamp('),'CSS must consume the resolved SplitController track directly instead of owning a second viewport clamp.');
assert(!/--dkds-mobile-(?:right|bottom)-track:[^;]*(?:vw|vh)/.test(css),'Companion track allocation must use Workspace geometry rather than viewport units.');

// Mobile has one physical resize affordance: the visible Workspace split seam.
// Desktop held-title compatibility may remain, but touch clients must exit before
// installing it. No panel-local Mobile size token/content-derived outer track exists.
assert(portable.includes("dataset?.dkdsHost==='mobile'")&&portable.includes("classList?.contains('react-native-client'))return;"),'Mobile companion resizing must stay on the visible Workspace seam only.');
for(const dead of ['--dkds-mobile-user-right-track','--dkds-mobile-user-bottom-track','mobileSemanticBounds'])assert(!portable.includes(dead),`Dead Mobile companion geometry channel must remain removed: ${dead}`);
for(const forbidden of ['syncCompanionBottomConstraints','companionSurfaceBlockConstraint','fitCompanionTracks'])assert(!presenter.includes(forbidden),`Presenter must stay content-independent: ${forbidden}`);
assert(!/resonance-workbench|ter-analysis|pulse-sampler-tool|transfer-vth/i.test(presenter),'Mobile Presenter must remain domain blind.');

console.log('v3.71.100 Mobile companion SplitController single-owner geometry PASS.');
