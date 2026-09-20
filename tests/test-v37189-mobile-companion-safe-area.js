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
const css=read('src/styles/platform/native-workspace-presentation.css');
const scientific=read('src/core/ui/modules/composition/unit-template-scientific.js');
const resonance=read('src/plugins/resonance-workbench/unit-presentation.js');
const dts=read('sdk/plugin-api.d.ts');

// Unit detail geometry remains a valid internal layout contract. It is no longer
// an outer workspace allocation input.
assert(scientific.includes('UNIT_PARAMETER_PRIME_BLOCK_MIN_FORBIDDEN'));
assert(dts.includes('minContentBlockPx?:number'));
assert(resonance.includes("detailGeometry:{minContentInlinePx:320,minContentBlockPx:220}")&&resonance.includes("detailGeometry:{minContentBlockPx:220}"));
assert(!presenter.includes('resolveInlineSurfaceConstraint')&&!presenter.includes('resolveBlockSurfaceConstraint'));
assert(!css.includes('--dkds-mobile-unit-right-min')&&!css.includes('--dkds-mobile-unit-bottom-min'));

// Companion shells own no synthetic 6px inset. Panel/Unit internals own content
// spacing, while the workspace split owns only the outer track.
assert(css.includes('>.dkds-plugin-canvas-bottom{padding:0;box-sizing:border-box;overflow:hidden}')||css.includes('>.dkds-plugin-canvas-bottom{padding:0;box-sizing:border-box;overflow:hidden}'));
assert(css.includes(':where(.dkds-plugin-canvas-right,.dkds-plugin-canvas-bottom)>.dkds-mobile-surface-frame{display:flex;flex:1 1 0;flex-direction:column;align-items:stretch;min-width:0;min-height:0;max-width:100%;max-height:100%;box-sizing:border-box;overflow:hidden}'));
assert(css.includes('--dkds-mobile-right-track:var(--dkds-plugin-canvas-right-width,34%)'));
assert(!css.includes('--dkds-mobile-drawer-occupied'));
assert(css.includes('scrollbar-width:none')&&css.includes('>.dkds-mobile-drawer-scroll::-webkit-scrollbar{display:none;width:0;height:0}'));
assert(!/respar|resonance-workbench|ter-analysis|pulse-analysis|transfer-vth/i.test(presenter));
console.log('v3.71.89 regression updated: Unit detail geometry stays internal; companion outer spacing/track ownership is generic workspace geometry.');
