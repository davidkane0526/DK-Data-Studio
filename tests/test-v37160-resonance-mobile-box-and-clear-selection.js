'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

// Minimal browser globals for loading the shared interaction policy in Node.
global.DKDSStyleGate={set(){},remove(){},setToken(){},snapshot(){return{};},KINDS:{CONFIG_TOKEN:'config-token'}};
global.window={DKDSPlotPresentation:null,addEventListener(){},removeEventListener(){}};
global.document={querySelector(){return null;},addEventListener(){},removeEventListener(){}};
global.localStorage={getItem(){return null;},setItem(){}};

const patch=Number(json('package.json').version.split('.').at(-1));
assert(patch>=60,'App must retain the v3.71.60+ Resonance Mobile interaction fix.');
assert(Number(json('mobile/app.json').expo.android.versionCode)>=201,'Android versionCode must retain the v3.71.60+ baseline.');

// Integration declaration: Resonance main genuinely owns a range-selection workflow,
// so it must opt in explicitly instead of relying on a Core Mobile default.
const main=read('src/plugins/resonance-workbench/feature-main-plot-runtime.js');
assert(main.includes("rangeSelectionTarget:'markers',rangeSelectionType:'resonance.peak',mobileBoxGesture:'select-region'"),
  'Resonance main ScientificPlot must explicitly opt into Mobile select-region box capture.');
assert(main.includes("onClearSelection:()=>live.sharedController?.service?.clearSelection?.()"),
  'Blank-plot clear must delegate to the canonical Resonance service selection owner, not partially clear local ids.');
assert(main.includes("requestRender?.('resonance-range-selection')"),
  'Committed box selection must explicitly repaint the persisted range highlight instead of relying on a transient drag overlay.');
const feature=read('src/plugins/resonance-workbench/feature-runtime.js');
assert(feature.includes('switchSelectedSweep,moveSelectedPeakBy,selectAdjacentPeak,lockSelectedPeaks,deleteSelectedPeaks,clearSelectedRange,clearSelection'),
  'Canonical Resonance service must continue to expose clearSelection as the single selection-clear owner.');

// The generic Mobile arbitration remains opt-in: plots without an explicit declaration
// keep vertical touch available for page/drawer scroll.
const renderer=read('src/core/ui/modules/scientific-curve/render.js');
assert(renderer.includes("if(touchLike&&String(this.spec.mobileBoxGesture||'none')==='none')return"),
  'ScientificPlot must still default touch/pen drag to scroll handoff when no box gesture is declared.');
const native=read('src/styles/platform/native-client-shell.css');
assert(native.includes('.dkds-scientific-curve-surface[data-dkds-mobile-box-gesture="none"]{touch-action:pan-y}'),
  'Undeclared Mobile ScientificPlots must retain pan-y scrolling.');
assert(native.includes('[data-dkds-mobile-box-gesture="select-region"]')&&native.includes('touch-action:none'),
  'Explicit Mobile select-region plots must receive exclusive touch drag ownership.');

// Behavioral evidence: the shared scientific interaction policy still maps a background
// box to range selection and a background tap to clear-selection. The Resonance declaration
// above therefore restores both touch box selection and blank-tap highlight exit through the
// same canonical policy rather than a plugin-private event handler.
const {InteractionBehaviorProfile}=require('../src/core/ui/modules/interaction/behavior');
const {DEFAULT_SCIENTIFIC_INTERACTION_BINDINGS}=require('../src/core/ui/modules/tooltip/group-plot');
const scope={owner:'test.resonance-mobile',options:{commands:{run(){}}}};
const profile=new InteractionBehaviorProfile(scope,'scientific-standard-v1',{bindings:DEFAULT_SCIENTIFIC_INTERACTION_BINDINGS});
let d=profile.resolve({gesture:'box',target:'background',event:{button:0,pointerType:'touch'}});
assert.strictEqual(d.intent,'select-region','Touch box without keyboard modifiers must resolve to select-region once the plot explicitly captures the gesture.');
d=profile.resolve({gesture:'click',target:'background',event:{button:0,pointerType:'touch'}});
assert.strictEqual(d.intent,'clear-selection','Background touch tap must resolve to clear-selection so the canonical owner can exit highlight mode.');
profile.dispose();

console.log('v3.71.60 Resonance Mobile box selection + blank-clear ownership PASS');
