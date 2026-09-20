'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {UNIT_CATALOG}=require('../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_BLUEPRINTS,VISUAL_PARITY}=require('../tools/sdk/native-blueprints');
const pluginsRoot='src/plugins';
const pluginDirs=fs.readdirSync(pluginsRoot).filter(name=>fs.statSync(path.join(pluginsRoot,name)).isDirectory()).sort();
assert.deepStrictEqual(Object.keys(NATIVE_PLUGIN_BLUEPRINTS).sort(),pluginDirs,'Every current native plugin must have a reconstruction blueprint.');
const providerKinds=new Set(['theme-provider','data-provider','algorithm-provider','foundation-provider','shell-provider']);
for(const [plugin,row] of Object.entries(NATIVE_PLUGIN_BLUEPRINTS)){
  assert(Array.isArray(row.units)&&row.units.length,`${plugin}: units missing`);
  assert(Array.isArray(row.regions)&&row.regions.length,`${plugin}: region recipe missing`);
  const unitSet=new Set(row.units);
  for(const region of row.regions){
    assert(unitSet.has(region.unit),`${plugin}/${region.id}: region Unit ${region.unit} absent from vocabulary`);
    const unit=UNIT_CATALOG[region.unit];assert(unit,`${plugin}/${region.id}: unknown Unit ${region.unit}`);
    if(region.variant&&unit.variants?.length)assert(unit.variants.includes(region.variant),`${plugin}/${region.id}: unpublished variant ${region.unit}:${region.variant}`);
    if(region.placements)assert(Array.isArray(region.placements)&&region.placements.length,`${plugin}/${region.id}: placements malformed`);
  }
  if(providerKinds.has(row.kind))assert.deepStrictEqual(row.parity,['function'],`${plugin}: nonvisual provider parity should be function-only`);
  else assert.deepStrictEqual(row.parity,VISUAL_PARITY,`${plugin}: visual plugin must target complete 1:1 parity`);
}

// Machine census: if a native plugin already consumes a canonical Core UI primitive,
// its future Unit reconstruction blueprint must contain the corresponding Unit.
const bindings=[
  [/ctx\.ui\.pages\b|analysis-page-body/,'page'],[/analysis-page-header|dkds-plugin-header-actions/,'pageHeader'],[/workspaceSurface|plugin-workbench/,'workspace'],
  [/dkds-surface\b|analysis-control-card|analysis-chart-card/,'surface'],[/dkds-surface-header|analysis-chart-title/,'header'],[/ctx\.ui\.actions\b|dkds-action-button/,'action'],[/dkds-toolbar|dkds-integrated-action-group/,'toolbar'],[/dkds-action-row/,'actionRow'],
  [/dkds-field\b|dkds-field-control/,'field'],[/dkds-check/,'check'],[/dkds-chip/,'chip'],[/dkds-note/,'note'],[/dkds-message/,'message'],[/dkds-summary-(?:row|strip|chip)/,'summary'],[/dkds-divider/,'divider'],[/empty-state/,'emptyState'],[/dkds-metric/,'metric'],[/dkds-list\b|dkds-list-item/,'list'],[/ctx\.ui\.tables\b|dkds-table\b|analysis-table/,'table'],
  [/ctx\.ui\.plotViews\b|dkds-plot-view|analysis-chart-card/,'plotView'],[/ctx\.ui\.plotGroups\b/,'plotGroup'],[/ctx\.ui\.scientificPlot\b/,'scientificPlot'],[/dkds-legend/,'legend'],[/dkds-floating-chrome/,'floatingChrome'],[/dkds-split-handle/,'splitHandle'],
  [/ctx\.ui\.dialogs\b|dkds-dialog-shell/,'dialog'],[/ctx\.ui\.(?:menus|contextMenus)\b/,'menu'],[/ctx\.ui\.statusBar\b|dkds-status-dot/,'status'],[/ctx\.ui\.portable\b|dkds-portable-view/,'portable']
];
for(const plugin of pluginDirs){
  const dir=path.join(pluginsRoot,plugin),files=[];(function walk(d){for(const name of fs.readdirSync(d)){const f=path.join(d,name),st=fs.statSync(f);if(st.isDirectory())walk(f);else if(/\.(?:js|css|html|json)$/.test(name))files.push(f);}})(dir);
  const text=files.map(file=>fs.readFileSync(file,'utf8')).join('\n'),units=new Set(NATIVE_PLUGIN_BLUEPRINTS[plugin].units);
  for(const [pattern,unit] of bindings)if(pattern.test(text))assert(units.has(unit),`${plugin}: source census observed ${unit}, but blueprint omits it`);
}
console.log(`SDK 1.51 native blueprint reconstructability PASS (${pluginDirs.length} plugins)`);
