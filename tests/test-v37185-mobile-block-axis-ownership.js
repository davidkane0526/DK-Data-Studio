'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const css=read('src/styles/platform/native-workspace-presentation.css');
const scientific=read('src/core/ui/modules/composition/unit-template-scientific.js');
const portable=read('src/core/ui/modules/layout/portable-view.js');

// Block geometry remains part of Unit self-layout (e.g. PlotGroup can derive its
// own preferred rows), but the Mobile Presenter must not consume it as an outer
// companion track input.
assert(scientific.includes('publishBlockConstraint'),'PlotGroup/Unit block geometry must remain available for internal layout.');
assert(!presenter.includes('resolveBlockSurfaceConstraint')&&!presenter.includes('resolveBlockSurfaceFit'),'Presenter must not resolve Unit block geometry for outer companion tracks.');
assert(!presenter.includes('__dkdsUnitBlockConstraint'),'Presenter must not reach into Unit-private block constraint properties.');
assert(!css.includes('--dkds-mobile-unit-bottom-min')&&!css.includes('--dkds-mobile-unit-bottom-preferred')&&!css.includes('--dkds-mobile-primary-min-track'));
assert(css.includes('--dkds-mobile-bottom-track:var(--dkds-plugin-canvas-bottom-height,36%)'),'Bottom companion must consume the workspace SplitController track with one generic viewport cap.');
assert(/\.dkds-plugin-canvas-center\{[^}]*overflow:hidden/.test(css),'Canvas center remains a geometry shell by default.');
assert(/\[data-primary-scroll="auto"\] \.dkds-plugin-canvas-center\{overflow:auto\}/.test(css),'Only explicit primary-scroll auto may make center a scroll owner.');
assert(!portable.includes('Math.min(620,gesture.frameHeight*.72)'),'Portable drag must not create another companion height cap.');
assert(!/respar|resonance-workbench|ter-analysis|pulse-analysis|pulse-designer|transfer-vth/i.test(presenter));
console.log('v3.71.85 regression updated: Unit block constraints are internal only; workspace split is the sole Mobile companion outer-axis owner.');
