'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const workbench=read('src/core/ui/modules/workbench/plugin.js');
const portable=read('src/core/ui/modules/layout/portable-view.js');
const runner=read('tests/run.js');
const pkg=json('package.json');

// Inspector rollback is intentionally narrow: parameter Drawer sizing must never
// become a second owner of the right SplitController or PortableView placement.
assert(!presenter.includes('fitCompanionRight('),'Parameter Drawer work must not fit the Curve Inspector.');
assert(!presenter.includes('scheduleCompanionFit('),'Parameter Drawer work must not install Inspector fit observers.');
assert(!workbench.includes("mobileStateVersion:'content-fit-v2'"),'Broken Inspector content-fit split namespace must stay retired.');
assert(portable.includes("?'mobile.m3':'desktop'"),'PortableView must keep the restored Mobile placement namespace.');
assert(presenter.includes("const semanticHome=semanticRole==='inspector'?'right':semanticRole==='scientific-secondary'?'bottom':''")&&presenter.includes("placement===semanticHome"),'A user move-and-return to the canonical Inspector lane must not resurrect PortableView geometry ownership.');

// Legacy source-only visual audit remains optional, never proof of rendered UI.
assert(!pkg.scripts['visual:gate'],'Static visual regex bundle must not be an automatic gate.');
assert(pkg.scripts['visual:static-audit']==='node tools/quality/visual-invariants.js','Legacy visual source audit may remain only as optional static audit.');
assert(!runner.includes('validateHardVisualInvariants'),'Generic runner must not claim rendered UI correctness from static source matching.');

console.log('v3.71.73 Inspector rollback acceptance PASS: Drawer sizing cannot own Inspector geometry and legacy static visual gate stays non-authoritative.');
