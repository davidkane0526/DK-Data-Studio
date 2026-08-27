'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));



const workbench=read('src/styles/structure/analysis-workbench.css');
const shell=read('src/styles/structure/analysis-shell.css');
const integrated=read('src/styles/theme/integrated-command-chrome.css');
const status=read('src/styles/presentation/control-status.css');
const materialCss=read('src/styles/theme/material-renderer.css');
const materialJs=read('src/core/theme/material-renderer.js');
const coverage=read('src/core/theme/coverage-runtime.js');
const chart=read('src/core/scientific/chart-runtime.js');
const automation=(read('src/diagnostics/automation-test-runtime.js')+read('src/diagnostics/automation-smoke-cases.js'));
const resonance=read('src/plugins/resonance-workbench/feature-runtime.js');
const resonanceGroup=read('src/plugins/resonance-workbench/feature-group-runtime.js');
const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
const projectFormat=read('src/core/project/format.js');
const projectMigration=read('src/migrations/project-v1-domain.js');

// Analysis navigation is a single horizontal semantic row, not stacked block divs.
assert(/\.dkds-analysis-nav\{[\s\S]*?display:flex;[\s\S]*?flex-wrap:nowrap;[\s\S]*?overflow-x:auto;/.test(workbench),
  'Analysis navigation must remain a single horizontally scrollable flex row.');
assert(/\.dkds-analysis-nav>div\{[\s\S]*?display:flex;[\s\S]*?flex-wrap:nowrap;/.test(workbench),
  'PRIMARY/PRIME/SUB navigation groups must be inline flex groups.');

// Header action groups may shrink/scroll, but must never wrap over the close button.
assert(/\.analysis-page-header>\.dkds-plugin-header-actions\{[\s\S]*?flex:0 1 auto;[\s\S]*?flex-wrap:nowrap;[\s\S]*?overflow-x:auto;/.test(shell),
  'Plugin header actions must be nowrap and overflow-safe.');
assert(shell.includes('.analysis-page-header>.analysis-page-close{flex:0 0 auto;}'),
  'Close-window action must remain a fixed header sibling and never be overlapped.');

// Group-plot controls are title-bar hit regions, not a second rounded capsule.
assert(integrated.includes('.dkds-group-plot-head')&&integrated.includes('border-radius:0;')&&integrated.includes('overflow:visible;'),
  'Integrated plot actions must flatten directly into surface/group title chrome.');

// Bottom command cluster needs readable separation.
assert(/\.statusbar-command-cluster\{[\s\S]*?gap:8px;/.test(status)&&/\.statusbar-plugin-zone\{[\s\S]*?gap:8px;/.test(status),
  'Status-bar command and plugin zones must preserve a 6px rhythm.');

// Thin Glass inputs/selects share one Core geometry and one role-owned paint family.
assert(workbench.includes('min-height:var(--plugin-control-height);')&&workbench.includes('height:var(--plugin-control-height);'),
  'Workbench input/select geometry must share the Core control height.');
assert(materialCss.includes('[data-dkds-material-role="control"],.dkds-material-role-control')&&materialCss.includes('background:var(--dkui-control-bg);'),
  'Material control owners must receive the same Core field paint even when Thin Glass maps controls to clear.');

// Theme coverage must understand deliberate semantic/chrome ownership instead of calling it unmanaged.
for(const token of ['function ownership(el,expectedRole','MATERIAL_SEMANTIC_OVERRIDE','MATERIAL_CHROME_OWNED','MATERIAL_PARENT_OWNED']){
  assert(materialJs.includes(token),`Material ownership contract missing ${token}.`);
  assert(coverage.includes(token==='function ownership(el,expectedRole'?'Renderer?.ownership?.':token),`Theme coverage must consume ownership semantics for ${token}.`);
}
assert(coverage.includes("version:'2.4.0'"),'Theme coverage runtime must include ownership-aware material and computed-control contrast checks.');

// Automation report state must be able to record theme coverage and start clean every run.
assert(automation.includes('consoleEvents:[],coverage:{}')&&automation.includes("state.coverage={};render();"),
  'Automation runner must own/reset its coverage accumulator before theme tests.');

// Tooltip controller exposes concrete theme colors to every ScientificPlot consumer.
assert(chart.includes('currentTooltipTheme')&&chart.includes('bgcolor:theme.tooltip')&&chart.includes('bordercolor:theme.tooltipBorder'),
  'ScientificPlot tooltip theme must expose current Core background and border colors.');
assert(chart.includes('get tooltipTheme(){return currentTooltipTheme();}'),
  'Scientific chart scopes must expose tooltipTheme dynamically across theme switches.');

// A truly peak-less project must not render misleading empty axes; saved legacy peaks still migrate.
assert(resonanceGroup.includes("current project has no saved resonance peaks")===false,'User-facing group empty state must stay localized.');
assert(resonanceGroup.includes("当前工程没有已保存共振峰。组图会在完成寻峰或恢复已保存峰后自动生成。"),
  'Resonance group surface must explain the no-peak state instead of showing empty axes.');
assert(resonanceCss.includes('.reswin-group-empty{grid-column:1/-1;'),
  'Resonance group empty state must span the group grid.');
assert(projectMigration.includes('if(out[key]!==undefined&&(workspace[key]===undefined||(empty(workspace[key])&&!empty(out[key]))))workspace[key]=clone(out[key]);'),
  'Legacy root peaks/visibility must continue to win over an empty namespaced placeholder.');

console.log('v3.61.95 visual + plot + theme contract PASS: header/nav geometry, group chrome, Thin Glass controls, tooltip/theme coverage and peakless group state are explicit.');
