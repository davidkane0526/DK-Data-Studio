'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert.equal(json('package.json').version,'3.61.95','UI lifecycle/visual contract must track v3.61.95.');

const coreCss=read('src/core.css');
const utility=read('src/styles/utility/visibility.css');
const foundation=read('src/styles/foundation/foundation.css');
const materialJs=read('src/core/theme/material-renderer.js');
const materialCss=read('src/styles/theme/material-renderer.css');
const statusCss=read('src/styles/presentation/control-status.css');
const shellCss=read('src/styles/presentation/shell.css');
const statusPlugin=read('src/plugins/status-monitor/plugin.js');
const pluginWindowHtml=read('src/plugin-window/index.html');
const resonanceView=read('src/plugins/resonance-workbench/view-components.js');
const resonanceFeature=read('src/plugins/resonance-workbench/feature-runtime.js');
const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
const automationRuntime=read('src/core/diagnostics/automation-test-runtime.js');
const index=read('src/index.html');

assert(coreCss.startsWith('@layer dkds.foundation, dkds.plugin, dkds.structure, dkds.presentation, dkds.theme, dkds.platform, dkds.window, dkds.utility;'),
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
  assert(materialJs.includes(token),`Top chrome control ownership must include ${token}.`);
}
assert(materialJs.includes('.toolbar-btn,.activity-tab,.plugin-toolbar-btn,.primary'),
  'Toolbar/activity controls must remain shell-owned instead of receiving generic Material control paint.');
for(const token of ['.primary','.strong','.danger-soft','.accent-soft','[aria-pressed="true"]','[aria-selected="true"]']){
  assert(materialJs.includes(token),`Semantic control paint must be protected from generic material assignment: ${token}`);
}
assert(materialJs.includes("role==='control'&&semanticControlOwnsPaint(el)"),
  'Material role inference must leave semantic control paint to the semantic owner.');
assert(shellCss.includes('button:not(.primary):not(.strong):not(.toolbar-btn):not(.activity-tab):not(.plugin-toolbar-btn)'),
  'Generic button palette must not repaint toolbar/activity controls as standalone controls.');
assert(materialCss.includes('.command-menu:not([data-dkds-menu-behavior="rich"])'),
  'Menu-row flattening must exclude rich popovers with embedded controls.');

assert(!resonanceView.includes('respar-scan-global dkds-action-row'),
  'Resonance scan grid must not simultaneously claim the generic flex action-row contract.');
assert(!resonanceView.includes('respar-detect-actions dkds-action-row'),
  'Resonance detector grid must not simultaneously claim the generic flex action-row contract.');
assert(resonanceView.includes('data-dkds-menu-behavior="rich"'),
  'Range-selection panel must identify itself as a rich popover so its buttons retain normal control chrome.');
assert(!resonanceCss.includes('#resonanceDedicatedPage .hidden{display:none}'),
  'Resonance must not duplicate global visibility ownership.');
assert(resonanceFeature.includes('reswin-group-card-actions dkds-plot-view-actions dkds-integrated-action-group'),
  'Group-plot card actions must be integrated into the subplot title bar from first paint.');

assert(/body\.dkds-modern-ui \.statusbar-plugin-zone\{\s*height:20px;\s*gap:6px;/.test(statusCss),
  'Status-bar contribution spacing must preserve a readable 6px rhythm.');

assert(index.includes('id="automationTestRunBtn" class="primary">运行全部自动化测试</button>'),
  'Automation center must author an explicit run action.');
assert(automationRuntime.includes("$('#automationTestRunBtn')?.addEventListener('click',()=>void runAll())"),
  'Automation run action must remain wired to the real runtime test executor.');

console.log('v3.61.94 UI lifecycle + visual contract PASS: visibility, material paint ownership, resonance chrome, status spacing and automation action are all explicit.');
