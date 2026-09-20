'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');

const pulse=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
const shadow=read('examples/sdk151-unit-pulse-sampler-shadow/plugin.js');
const structure=read('src/styles/structure/sdk-semantic-surfaces.css');
const spec=require('../src/core/ui/modules/composition/unit-template-spec');
const {createLayoutState,resolveLayout}=require('../src/core/ui/modules/layout/state-resolver');

assert(Number(spec.UNIT_TEMPLATE_SPEC_VERSION.split('.').at(-1))>=21,'Unit Templates must retain the v2.5.23 minimum-width/containment baseline or later.');
assert.strictEqual(Object.keys(spec.UNIT_CATALOG).length,41,'Source-faithful Pulse repair must not invent a plugin-specific Unit.');

// The accepted production workspace explicitly reserves a usable 540 px parameter rail.
// Dropping these values is a source-parity failure because it forces otherwise-correct
// two-column/four-action Units into narrow responsive fallbacks.
for(const source of [pulse,shadow]){
  assert(source.includes("leftWidth:540,leftMin:520,leftReserve:520"),'Pulse Workspace Unit must preserve accepted left PRIME geometry.');
  assert(source.includes("embedded:true")&&source.includes("stateVersion:'presentation-v3'")||source===shadow,'Production Pulse PRIME must preserve the accepted embedded/titleless presentation namespace.');
}
// A declared Desktop PRIME minimum is a real lower bound, including when an older
// persisted split preference was narrower. The 520 px minimum is intentionally close
// to the 540 px accepted default: enough to protect the two-column/four-action anatomy
// without greedily consuming the main workspace.
{
  const state=createLayoutState({id:'pulse-sampler-left',axis:'x',defaultSize:540,min:520,reserve:520},{size:360});
  const resolved=resolveLayout(state,{width:1515,height:900},{nativeMobile:false});
  assert.strictEqual(resolved.effectiveSize,520,'Desktop parameter PRIME must never shrink below its declared restrained minimum.');
  assert.strictEqual(resolved.min,520);
  assert(resolved.max>=520);
}
assert(pulse.includes("layoutStateVersion:'pulse-sampler-unit-v1'"),'Production Pulse Workspace must isolate the corrected Unit geometry from split state persisted by the broken cutover builds.');
assert(pulse.includes("variant:'form-grid-2'")&&pulse.includes("variant:'action-grid-4'"),'Parameter PRIME must keep accepted two-column parameters and four-action composition.');

// After deleting the legacy production DOM renderer, runtime-delegated scientific
// lifecycle is invalid: no renderer remains to draw the plot.  Unit presentation must
// now own the single presentation renderer while the domain/numeric owner stays unchanged.
assert.strictEqual((pulse.match(/renderOwner:'runtime'/g)||[]).length,0,'Pulse Sampler must not delegate plot rendering to the removed legacy presentation renderer.');
assert.strictEqual((shadow.match(/renderOwner:'runtime'/g)||[]).length,0,'Pulse shadow must exercise the real Unit scientific renderer, not a lifecycle-only no-op.');
for(const source of [pulse,shadow]){
  assert(source.includes("getCurves:()=>currentWaveCurves"),'Waveform ScientificPlot must consume live curves through the Unit renderer.');
  assert(source.includes("waveSurface.requestRender?."),'Waveform ScientificPlot must receive real render requests.');
  assert(source.includes("resultSurface.requestRender?."),'Result ScientificPlot must receive real render requests.');
}

// PRIME sizing is workspace-owned, but nested Sampling/Result Units must measure the
// width actually allocated to their own surface. Measuring the whole workspace here
// makes a six-column row survive after its panel has become too narrow, which is the
// direct cause of the extraction action escaping the right edge.
for(const token of [
  "variant:'analysis-control-grid',responsiveTarget:workspaceHost",
  "wide:true,responsiveTarget:workspaceHost",
  "variant:'result-control-grid',responsiveTarget:workspaceHost",
  "variant:'result-grid-asymmetric',responsiveTarget:workspaceHost"
]) assert(!pulse.includes(token),`Pulse nested Unit must not measure the whole workspace: ${token}`);
for(const token of [
  "const extractionGrid=units.layout.create(commandSurface,{variant:'analysis-control-grid',geometry:{gridTemplateColumns:'repeat(3,minmax(0,1fr))'},responsiveGeometry:[{maxWidth:620",
  "const resultControls=units.layout.create(commandSurface,{variant:'result-control-grid'})",
  "const resultGrid=units.layout.create(analysis.body,{variant:'result-grid-asymmetric',geometry:{width:'100%',maxWidth:'100%',minWidth:'0'}})"
]) assert(pulse.includes(token),`Pulse local responsive composition missing: ${token}`);

// Compact Tabs need a real non-wrapping inner tablist.  The Unit wrapper adds one level,
// so relying on the generic surface-header child selector is insufficient.
assert(structure.includes('[data-dkds-unit-template="tabs-v2"]>.dkds-surface-tabs{display:flex;align-items:center;flex-wrap:nowrap;min-width:0}'),'Tabs Unit must explicitly keep its direct tablist on one row.');
assert(structure.includes('[data-dkds-unit-template="tabs-v2"][data-dkds-unit-variant="compact"]{display:inline-flex;gap:3px;padding:3px;box-sizing:border-box}'),'Compact Tabs wrapper must remain intrinsic and source-faithful.');

// Presentation-only repair: scientific/domain/task owners are frozen.
assert.strictEqual(hash('src/plugins/pulse-sampler-tool/live-domain.js'),'a982b457b702b79d957f029cf2a403f9b180c5bd443f4172faf71f630f074d56');
assert.strictEqual(hash('src/plugins/pulse-sampler-tool/domain-adapter.js'),'a7b7c038970dc10a3c530dd098167d03dc3796d1789792c7c1215bd4430e21ac');
assert.strictEqual(hash('src/plugins/pulse-sampler-tool/steady-state-task.js'),'1132645c3509c04ec7ab11183cb6eebef9d5b678734a5b27700dcad27f5084d5');

console.log('v3.71.46 Pulse source-faithful Workspace/renderer/responsive-owner parity PASS');
