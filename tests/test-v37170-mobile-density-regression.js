'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const [a,b,c]=json('package.json').version.split('.').map(Number);
assert(a>3||(a===3&&(b>71||(b===71&&c>=70))),'v3.71.70+ closure required.');
assert(Number(json('mobile/app.json').expo.android.versionCode)>=211,'Android versionCode must advance for v3.71.70.');

const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const layoutRuntime=read('src/core/ui/modules/composition/unit-template-layout.js');
const workspace=read('src/core/ui/modules/layout/workspace.js');
const workbench=read('src/core/ui/modules/workbench/plugin.js');
const portable=read('src/core/ui/modules/layout/portable-view.js');
const inspectorRuntime=read('src/plugins/resonance-workbench/feature-inspector-runtime.js');
const nativeCss=read('src/styles/platform/native-client-shell.css');
const ter=read('src/plugins/ter-analysis/unit-presentation.js');
const sampler=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
const pulse=read('src/plugins/pulse-analysis/unit-presentation.js');

// 1) Drawer width is solved from the first usable responsive composition. The
// solver is Drawer-only, starts below content width, never assumes monotonic
// overflow, and never compresses canonical Unit/control spacing.
assert(presenter.includes('drawer-width.v20.'),'Failed Drawer width generations must not survive this correction.');
assert(presenter.includes('semanticSearchFloorPx()'),'Mobile Drawers need a dedicated probe lower bound.');
assert(!presenter.includes('unitPortableFloorPx()'),'The ordinary PortableView width must not own Drawer sizing.');
assert(presenter.includes('return action+inset*2'),'Probe lower bound must derive from one canonical compact control plus Surface inset, not an arbitrary multi-control width.');
assert(presenter.includes('constraintDeficit(frame)')&&presenter.includes('resolveInlineConstraintDeficit(content).deficitPx'),'Final Drawer width must be derived from the live Unit constraint deficit after reflow.');
assert(presenter.includes('this.reflowMeasuredUnits(frame);'),'Each width candidate must synchronously re-run Unit responsive recipes before measuring overflow.');
assert(layoutRuntime.includes('node.__dkdsUnitLayoutReflow=apply'),'Layout Unit must expose a synchronous measurement reflow hook instead of relying only on asynchronous ResizeObserver.');
assert(presenter.includes('solveMinimumReasonableWidth(frame')&&presenter.includes('this.reflowMeasuredUnits(frame);'),'Presenter must solve Drawer allocation from generic Unit reflow/constraints rather than plugin-specific widths.');
assert(!presenter.includes("this.setStyle(node,'width','100%')"),'Drawer fitter must not make shrinkable controls greedily fill tracks.');
assert(presenter.includes("if(region!=='drawer')return this.surfaceAvailableWidth(frame,region)"),'Automatic content fitting must be scoped to parameter/data Drawers only.');
assert(!workbench.includes("mobileStateVersion:'content-fit-v2'"),'Inspector split must be rolled back out of the failed Drawer content-fit experiment.');
assert(portable.includes("?'mobile.m3':'desktop'"),'PortableView must restore the pre-regression Mobile placement namespace while Desktop remains isolated.');
assert(!nativeCss.includes('data-dkds-mobile-frame-region="drawer"] :where(.dkds-action-row,.dkds-toolbar){gap:'),'Drawer fitting must not compress action/toolbar spacing.');
assert(!nativeCss.includes('data-dkds-mobile-frame-region="drawer"] :where(label){gap:'),'Drawer fitting must not compress label/control spacing.');
assert(nativeCss.includes('white-space:nowrap'),'Primary/action text must remain measurable rather than wrapping to fake a smaller usable width.');

// 2) Curve Inspector is restored to its pre-regression ownership. Drawer width
// work must not rewrite the Inspector SplitController minimum/default. Default
// semantic placement is Presenter-owned; explicit user PortableView placement is
// Portable-owned exactly as it was before the content-fit experiment.
assert(!presenter.includes('fitCompanionRight(frame)')&&!presenter.includes('scheduleCompanionFit(frame)'),'Inspector must not use the parameter Drawer width solver.');
assert(presenter.includes("const semanticHome=semanticRole==='inspector'?'right':semanticRole==='scientific-secondary'?'bottom':''")&&presenter.includes("placement===semanticHome"),'Semantic companion home lanes must remain Presenter-owned even after a user move-and-return; only a genuine non-home placement stays Portable-owned.');
assert(!inspectorRuntime.includes('data-dkds-mobile-width-critical'),'Resonance Inspector must not carry content-fit-only width metadata after rollback.');

// 3) TER controls: parameter controls must participate in Unit reflow before the
// drawer is widened. Long algorithm/check rows may span without setting a panel width.
assert(ter.includes("units.layout.apply(parameterPanel.element,{variant:'form-grid-2'"),'TER parameters must use a Unit form grid.');
assert(ter.includes("units.layout.apply(algorithmField.element,{variant:'identity',geometry:{gridColumn:'1 / -1'}})"),'TER algorithm selector must span the reflowed grid, not force a desktop field width.');
assert(!/parameterPanel\.element[^\n]+width:/.test(ter),'TER parameter panel must not declare a private width target.');

// 4) Pulse Sampler: at tablet/mobile workspace widths the extraction row is
// explicitly three equal non-greedy tracks before the final narrow two-column step.
assert(sampler.includes("geometry:{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}"),'Pulse Sampler extraction must own a three-column base grid so tablet/landscape widths cannot fall back to the legacy 4+2 composition.');
assert(sampler.includes("maxWidth:620,geometry:{gridTemplateColumns:'repeat(2,minmax(0,1fr))'}"),'Pulse Sampler must retain a true narrow fallback.');

// 5) Pulse Analysis: compare -> plots -> table share one flow owner. The raw
// diagnostic remains after that owner, so plot rendering cannot overlap it.
assert(pulse.includes("const tablePanel=units.panel.create(visual,"),'Pulse result table must share the result visual normal-flow owner with the plot cards.');
assert(pulse.indexOf("const resultGrid=units.layout.create(visual")<pulse.indexOf("const tablePanel=units.panel.create(visual"),'Result plots must precede the table in the same flow owner.');
assert(pulse.indexOf("const tablePanel=units.panel.create(visual")<pulse.indexOf("const rawPlot=createPlotCard(visual"),'Result table and raw diagnostics must resolve in one sequential flow owner.');

console.log('v3.71.70 Mobile density regression PASS: non-greedy semantic widths + Inspector ownership + TER/Pulse layouts');
