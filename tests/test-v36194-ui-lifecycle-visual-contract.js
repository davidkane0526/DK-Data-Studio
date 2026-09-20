'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));



const coreCss=read('src/core.css');
const utility=read('src/styles/utility/visibility.css');
const foundation=read('src/styles/foundation/foundation.css');
const materialJs=read('src/core/theme/material-renderer.js');
const semanticTheme=read('src/core/theme/semantic-registry.js');
const materialCss=read('src/styles/theme/material-renderer.css');
const statusCss=read('src/styles/presentation/control-status.css');
const statusStructure=read('src/styles/structure/super-top-contract.css');
const shellCss=read('src/styles/presentation/shell.css');
const statusPlugin=read('src/plugins/status-monitor/plugin.js');
const pluginWindowHtml=read('src/plugin-window/index.html');
const resonanceView=read('src/plugins/resonance-workbench/unit-presentation.js');
const resonanceFeature=read('src/plugins/resonance-workbench/feature-runtime.js');
const resonanceGroupFeature=read('src/plugins/resonance-workbench/feature-group-runtime.js');
const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
const scientificComposition=read('src/core/ui/modules/composition/scientific.js');
const automationRuntime=(read('src/diagnostics/automation-test-runtime.js')+read('src/diagnostics/automation-smoke-cases.js'));
const index=read('src/index.html');

assert(coreCss.startsWith('@layer dkds.foundation, dkds.plugin, dkds.plugin-platform, dkds.structure, dkds.presentation, dkds.theme, dkds.motion, dkds.platform, dkds.window, dkds.utility;'),
  'Visibility utility must be the final authored cascade layer.');
assert(coreCss.includes('styles/utility/visibility.css')&&/:where\(\.hidden,\[hidden\]\)\{display:none;\}/.test(utility),
  'Global .hidden/[hidden] state must be single-owned by the final utility layer.');
assert(!/(^|[},])\s*\.hidden\s*\{\s*display\s*:\s*none/m.test(foundation),
  'Foundation must not own global hidden state below structural display rules.');
const authoredCssFiles=[];
for(const dir of ['src/styles','src/plugins']){
  const walk=d=>{for(const ent of fs.readdirSync(path.join(root,d),{withFileTypes:true})){const rel=path.join(d,ent.name);if(ent.isDirectory())walk(rel);else if(ent.isFile()&&ent.name.endsWith('.css'))authoredCssFiles.push(rel);}};
  walk(dir);
}
for(const rel of authoredCssFiles){
  if(rel.replace(/\\/g,'/')==='src/styles/utility/visibility.css')continue;
  assert(!/(?:^|[},])[^{}]*\.hidden\s*\{\s*display\s*:\s*none\s*;?\s*\}/m.test(read(rel)),`${rel} must not re-own .hidden display state.`);
}

assert(statusPlugin.includes("className:'dkds-memory-panel hidden dkds-material-role-floating'"),
  'Memory breakdown panel must start hidden.');
assert(statusPlugin.includes("ctx.ui.dom.query('#dkdsMemoryPanelClose',panel),'click',hideMemoryPanel"),
  'Memory panel close button must be wired to the lifecycle owner.');
assert(statusPlugin.includes('dkds-memory-panel-head dkds-surface-header')&&statusPlugin.includes('dkds-integrated-action-group'),
  'Memory panel close control must be integrated into panel chrome.');
assert(pluginWindowHtml.includes('id="pluginWindowError" class="plugin-window-error hidden"'),
  'Dedicated plugin error surface must start hidden and rely on final visibility state.');

for(const token of ['.toolbar-group','.primary-activity-cluster','.system-core-tools-group']){
  assert(semanticTheme.includes(token),`Top chrome control ownership must include ${token}.`);
}
assert(semanticTheme.includes('.toolbar-btn,.activity-tab,.plugin-toolbar-btn,.primary'),
  'Toolbar/activity controls must remain shell-owned instead of receiving generic Material control paint.');
for(const token of ['.primary','.strong','.danger-soft','.accent-soft','[aria-pressed="true"]','[aria-selected="true"]']){
  assert(semanticTheme.includes(token),`Semantic control paint must be protected from generic material assignment: ${token}`);
}
assert(semanticTheme.includes("return semanticControlOwnsPaint(el)?'':'control'")&&materialJs.includes("expected==='control'&&semanticControlOwnsPaint(el)"),
  'Semantic role inference and renderer ownership must leave semantic control paint to the semantic owner.');
const componentCss=read('src/styles/theme/component-appearance.css');
assert(semanticTheme.includes("id:'toolbarAction'")&&semanticTheme.includes("selector:'button:not(.dkds-field-control),.toolbar-btn,.plugin-toolbar-btn"),
  'Every ordinary button must enter the canonical ToolbarAction identity instead of a Presentation-owned generic palette.');
assert(!shellCss.includes('button:not(.primary):not(.strong):not(.toolbar-btn):not(.activity-tab):not(.plugin-toolbar-btn)')&&componentCss.includes('[data-dkds-component-identity="toolbarAction"]'),
  'Legacy generic button paint must stay removed; Component Appearance is the single action paint owner.');
assert(materialCss.includes('Popover surfaces own the optical material')&&componentCss.includes('[data-dkds-component-identity="menuItem"]'),
  'Popover material must own only the surface while canonical MenuItem appearance owns row paint for both simple and rich popovers.');

assert(resonanceView.includes('respar-scan-global dkds-mode-group')&&!resonanceView.includes('respar-scan-global dkds-mode-group dkds-action-row'),
  'Resonance scan buttons must keep canonical mode-button identity without converting the Desktop domain layout into a toolbar-group surface.');
assert(resonanceView.includes('respar-detect-actions')&&!resonanceView.includes('respar-detect-actions dkds-action-row'),
  'Resonance detector buttons use the ordinary-button ToolbarAction fallback while Desktop geometry stays plugin-owned.');
assert(/#resonanceDedicatedPage \.respar-(?:scan-global|detect-actions)\{[^}]*grid-template-columns:1fr 1fr/.test(resonanceCss),
  'Resonance Desktop scan/detector command geometry must remain the established two-column plugin layout.');
assert(resonanceView.includes("dataset:{dkdsMenuBehavior:'rich'}"),
  'Range-selection Unit panel must identify itself as a rich popover so its buttons retain normal control chrome.');
assert(!resonanceCss.includes('#resonanceDedicatedPage .hidden{display:none}'),
  'Resonance must not duplicate global visibility ownership.');
assert(resonanceGroupFeature.includes('reswin-group-card-actions dkds-plot-view-actions dkds-integrated-action-group')&&resonanceGroupFeature.includes('groupGridController?.adoptPlot?.(`resonance-group:${key}`'),
  'Group-plot card actions must keep the accepted subplot title bar from first paint while Core PlotGroup adopts its semantics.');

assert(statusCss.includes('--dkds-statusbar-zone-height:18px;')&&statusCss.includes('--dkds-statusbar-zone-gap:8px;')&&statusStructure.includes('height:var(--dkds-statusbar-zone-height);')&&statusStructure.includes('gap:var(--dkds-statusbar-zone-gap);'),
  'Status-bar contribution spacing must be configured by Presentation tokens and uniquely applied by Structure.');

assert(index.includes('id="automationTestRunBtn" class="primary">运行全部自动化测试</button>'),
  'Automation center must author an explicit run action.');
assert(automationRuntime.includes("$('#automationTestRunBtn')?.addEventListener('click',()=>void runAll())"),
  'Automation run action must remain wired to the real runtime test executor.');

console.log('v3.61.94 UI lifecycle + visual contract PASS: visibility, material paint ownership, resonance chrome, status spacing and automation action are all explicit.');
