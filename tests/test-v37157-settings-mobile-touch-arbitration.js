'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert(Number(json('package.json').version.split('.').at(-1))>=57,'App must retain the v3.71.57+ baseline.');
assert(Number(json('mobile/app.json').expo.android.versionCode)>=198,'Android versionCode must retain the v3.71.57+ baseline.');
assert.strictEqual(json('sdk/contract.json').sdkVersion,'1.51.43');
const spec=require('../src/core/ui/modules/composition/unit-template-spec');
assert.strictEqual(spec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');

const settings=read('src/core/ui/modules/dialog/settings.js');
assert(settings.includes("overlay.dataset.dkdsOverlayStack='foreground'"),'Settings overlay must explicitly request the foreground overlay stack so dedicated plugin windows cannot cover it.');
const semantic=read('src/styles/structure/sdk-semantic-surfaces.css');
assert(semantic.includes('.dkds-overlay[data-dkds-overlay-stack="foreground"]{z-index:1600}'),'Foreground overlay stack must remain above dedicated plugin page content.');
const pluginWindow=read('src/plugin-window/style.css');
assert(pluginWindow.includes('.analysis-page{position:absolute;inset:0}')||pluginWindow.includes('.analysis-page{inset:0;z-index:1000}'),'Dedicated plugin pages remain independently stacked; settings must not rely on accidental source order.');

const native=read('src/styles/platform/native-client-shell.css');
const chrome=read('src/styles/structure/desktop-chrome-geometry.css');
assert(chrome.includes('--dkds-field-control-min-height:100%'),'Floating Action Unit sizing must be owned by the shared Unit chrome context rather than a Mobile-only patch.');
assert(native.includes('.dkds-scientific-curve-surface[data-dkds-mobile-box-gesture="none"]{touch-action:pan-y}'),'Mobile plots without declared box capture must pass vertical touch drag to scrolling.');
assert(native.includes('[data-dkds-mobile-box-gesture="select-region"]')&&native.includes('[data-dkds-mobile-box-gesture="zoom-box"]{touch-action:none}'),'Only explicit Mobile box gestures may take exclusive touch ownership.');

const unit=read('src/core/ui/modules/composition/unit-template-scientific.js');
assert(unit.includes("const mobileBoxGesture=String(spec.mobileBoxGesture||'none')"),'Unit ScientificPlot must default Mobile box capture to none.');
assert(unit.includes('UNIT_SCIENTIFIC_MOBILE_BOX_GESTURE_INVALID'),'Unit must validate explicit Mobile box gesture declarations.');
const renderer=read('src/core/ui/modules/scientific-curve/render.js');
assert(renderer.includes("if(touchLike&&String(this.spec.mobileBoxGesture||'none')==='none')return"),'Scientific renderer must not start a drag-box on touch/pen without explicit declaration.');
assert(renderer.includes("resolvedIntent=drag.mobileIntent&&drag.mobileIntent!=='none'?drag.mobileIntent:decision.intent"),'An explicit Mobile box declaration must determine the touch-box intent without requiring keyboard modifiers.');
const model=read('src/core/ui/modules/scientific-curve/model.js');
assert(model.includes("this.target.dataset.dkdsMobileBoxGesture=String(spec.mobileBoxGesture||'none')"),'Scientific surface must expose the resolved Mobile gesture policy for platform CSS/diagnostics.');
const dts=read('sdk/plugin-api.d.ts');
assert(dts.includes("mobileBoxGesture?:'none'|'select-region'|'zoom-box'"),'SDK types must expose explicit Mobile box arbitration.');

const vth=read('src/plugins/transfer-vth-lab/plugin.js');
assert(vth.includes("interactionExtensions:[{id:'vth.shift-select-region'"),'Vth retains its Desktop Shift range-selection extension.');
assert(!vth.includes('mobileBoxGesture:'),'Vth does not require Mobile box capture and must therefore default to touch scrolling.');

console.log('v3.71.57 settings overlay + Mobile action centering + Unit scientific touch arbitration PASS');
