'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const manifest=json('src/plugins/transfer-vth-lab/plugin.json');
const plugin=read('src/plugins/transfer-vth-lab/plugin.js');
const unit=read('src/plugins/transfer-vth-lab/unit-presentation.js');
const parity=json('examples/sdk151-unit-vth-shadow/parity.json');
const native=read('src/styles/platform/native-client-shell.css');
const mobilePresentation=read('src/styles/platform/native-workspace-presentation.css');

assert(/^3\.3\.\d+$/.test(String(manifest.version||'')),'Production Vth 3.3.x Unit-cutover line must remain active.');
assert.deepStrictEqual(manifest.scripts,['analysis-runtime.js','live-domain.js','domain-adapter.js','unit-presentation.js','plugin.js'],'Production Vth must load the Unit presentation after domain helpers and before the controller entry.');
assert.deepStrictEqual(manifest.styles,[],'Production Vth must not load the retired private stylesheet after Unit cutover.');
assert(manifest.requiresCore.includes('ui.unit-templates')&&manifest.capabilities.includes('ui.unit-templates'),'Production Vth must declare the public Unit contract it consumes.');
assert(plugin.includes("ctx.modules.require('unit-presentation')")&&plugin.includes('UnitPresentation.mount(ctx,page'),'Production Vth controller must delegate composition to the Unit presentation module.');
assert(!plugin.includes('dkds-vth-card')&&!plugin.includes('dkds-vth-content-split')&&!plugin.includes('ctx.ui.layout.split('),'Retired direct Vth presentation markup/layout ownership must not remain active in plugin.js.');
assert(!/interactionBehavior\s*:/.test(plugin),'Production Vth must consume the Unit fixed scientific interaction policy instead of passing a replacement interactionBehavior object.');
assert(plugin.includes("interactionExtensions:[{id:'vth.shift-select-region'"),'Vth Shift box selection must use the public non-conflicting Unit interaction extension path.');

for(const call of ['units.page.create','units.pageHeader.create','units.workspace.create','units.layout.create','units.layout.apply','units.panel.create','units.panel.detached','units.header.create','units.toolbar.create','units.field.create','units.check.create','units.chip.create','units.note.create','units.metric.create','units.table.mount','units.prime.build','units.scientificPlot.create','units.splitPane.create'])assert(unit.includes(call),`Production Vth Unit presentation missing ${call}.`);
assert(unit.includes("variant:'fixed-titleless'")&&unit.includes("presentationRole:'data-control'")&&unit.includes("placements:['left']"),'Production Vth data-control PRIME must remain fixed-left and titleless.');
assert(unit.includes('defaultSize:180')&&unit.includes('min:140')&&unit.includes('reserve:300')&&unit.includes('reflowBelow:920')&&unit.includes("resizeTarget:'second'"),'Production Vth SplitPane must preserve accepted 180/140/300 + 920 geometry.');
assert(!/\.style\.|ctx\.ui\.styles\.|dom\.style\(|dom\.token\(/.test(unit),'Vth Unit presentation must not become a private style owner.');
assert(!/isNativeClient|isMobile|matchMedia|window\.innerWidth/.test(unit),'Vth Unit composition must remain platform-neutral.');
const ownership=require('../tools/quality/unit-runtime-style-ownership').audit();
const vthOwner=ownership.reports.find(row=>row.plugin==='transfer-vth-lab');
assert(vthOwner&&vthOwner.splits===1,'Unit ownership audit must recognize the public splitPane.create(host,{...}) overload used by Vth.');
assert.strictEqual(ownership.splits,1,'Production Unit ownership census must track the remaining Vth SplitPane after Pulse returned to sequential PRIMARY flow.');
assert.strictEqual(ownership.violations.length,0,'Vth cutover must not create a Unit/CSS geometry ownership conflict.');
assert.strictEqual(parity.productionReplaced,true);
assert.strictEqual(parity.productionCutoverVersion,'3.71.53');

assert(native.includes('--dkds-mobile-scrollbar-size:3px'),'Mobile must expose one restrained scrollbar geometry token.');
assert(native.includes('::-webkit-scrollbar{width:var(--dkds-mobile-scrollbar-size);height:var(--dkds-mobile-scrollbar-size)}'),'All Mobile WebView descendants must consume the shared scrollbar size.');
assert(native.includes('::-webkit-scrollbar-thumb{border-width:0;background-clip:border-box}'),'Theme thumb borders must not thicken Mobile scrollbar geometry.');
const navRule='display:grid;place-items:center;align-content:center;justify-content:center;box-sizing:border-box;padding:0;margin:0;text-indent:0;font-size:12.5px;line-height:1';
assert(native.includes(navRule),'Canonical Mobile ScientificPlot navigation glyphs must be centered on both axes without residual inset.');

for(const token of ['.dkds-list','[data-dkds-unit-template="list-v2"]','[data-dkds-unit-layout-recipe="scroll-pane"]','[data-dkds-scroll-policy="chain"]','[data-dkds-scroll-policy="viewport"]'])assert(mobilePresentation.includes(token),`Mobile semantic scroll relay missing ${token}.`);
assert(mobilePresentation.includes('overscroll-behavior-x:contain;overscroll-behavior-y:auto;'),'Nested Mobile vertical scrollers must relay vertically while horizontal overscroll remains contained.');
assert(/\.dkds-mobile-surface-frame\[data-dkds-mobile-frame-region="drawer"\]\{[^}]*padding:0;overflow:visible/.test(mobilePresentation),'Drawer frame must remain an edge-to-edge overlay frame rather than a workspace scroll owner.');
assert(/dkds-mobile-drawer-scroll\{[^}]*overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain/.test(mobilePresentation),'Dedicated Drawer scroll viewport must be the terminal overlay scroll owner and must not leak gestures to obscured workspace content.');
const dataCenterMobile=read('src/plugins/data-center/mobile.css');
assert(!dataCenterMobile.includes('overscroll-behavior-y:auto'),'Generic vertical scroll relay must remain Core-owned; Data Center Mobile CSS may evolve only for its own layout/density.');

console.log('v3.71.53 Vth production Unit cutover + generic Mobile scrollbar/nav/scroll-relay contract PASS');
