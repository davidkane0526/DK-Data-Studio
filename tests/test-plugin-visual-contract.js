const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const css=readCoreCss(root);
const shell=read('src/core/recipes/shell-navigation.js');
const safeguards=read('src/core/recipes/workspace-safeguards.js');
const shellCss=read('src/styles/structure/shell-navigation.css');
const schemaCss=read('src/styles/structure/schema-and-plugin-ui.css');
const safeguardCss=read('src/styles/structure/workspace-safeguards.css');
const runtime=read('src/plugin-window/runtime.js');
const resonance=read('src/plugins/resonance-workbench/view-components.js');
const resonanceRuntime=read('src/plugins/resonance-workbench/feature-runtime.js');
const resonanceMainPlot=read('src/plugins/resonance-workbench/feature-main-plot-runtime.js');
const resonanceSelection=read('src/plugins/resonance-workbench/feature-selection-runtime.js');
const dataCenterRuntime=read('src/plugins/data-center/feature-runtime.js');
const dataCenterCss=read('src/plugins/data-center/plugin.css');
const pulseCss=read('src/plugins/pulse-analysis/plugin.css');
const terCss=read('src/plugins/ter-analysis/plugin.css');
const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
const parameterSchema=read('src/core/data/parameter-schema.js');
const manifest=JSON.parse(read('src/plugins/resonance-workbench/plugin.json'));

for(const token of ['--plugin-font-body:12.5px','--plugin-font-label:12px','--plugin-font-meta:11px','--plugin-font-title:13.5px','--plugin-font-section:14px','--plugin-control-height:32px']){
  assert(css.includes(token),`Shared plugin visual token missing: ${token}`);
}
assert(css.includes('.dkds-analysis-workbench')&&!css.includes('.dkds-analysis-workbench:not(:has(.resonance-parity-root))'),'All AnalysisWorkbench plugins, including resonance, must inherit the same shared visual contract.');
for(const [pluginCss,classes] of [[dataCenterCss,['.dc-tabs','.dc-inline-actions','.dc-chart-toolbar']],[pulseCss,['.pulse-file-toolbar','.pulse-table-actions']],[terCss,['.ter-chart-actions']]]){
  for(const cls of classes) assert(pluginCss.includes(cls),`Plugin-owned layout contract missing ${cls}.`);
}
assert(css.includes('.dkds-toolbar')&&css.includes('flex-flow:row nowrap'),'Core semantic toolbar must consume available horizontal room before wrapping without owning domain selectors.');
assert(!pulseCss.includes('.pulse-plot-actions{'),'Pulse PlotView actions must use Core header/action geometry instead of a plugin-owned layout contract.');
assert(!css.includes('.dc-tabs')&&!css.includes('.pulse-file-toolbar')&&!css.includes('.ter-chart-actions'),'Core CSS must not own plugin toolbar selectors.');
assert(dataCenterRuntime.includes('dc-artifact-meta dkds-meta')&&dataCenterRuntime.includes('dc-prov-time dkds-meta')&&parameterSchema.includes('schema-param-help dkds-meta'),'Data Center/schema metadata must consume the Core meta-text primitive instead of plugin-specific typography.');
assert(!shell.includes('ctx.ui.styles.add')&&schemaCss.includes('var(--plugin-font-body')&&schemaCss.includes('var(--plugin-font-meta')&&schemaCss.includes('var(--plugin-control-height'),'Plugin manager must consume shared Core text/control tokens from its schema/plugin UI structure owner rather than shell navigation or runtime-injected CSS.');
assert(!safeguards.includes('ctx.ui.styles.add')&&safeguardCss.includes('var(--plugin-font-meta'),'Import/workspace warnings must consume the shared plugin meta text token from Core structure CSS.');
assert(runtime.includes('document.body.dataset.pluginId'),'Dedicated TOP windows must expose plugin identity for domain/lifecycle routing without using identity as a visual-theme opt-out.');
assert(runtime.includes("d3:'../../node_modules/d3/dist/d3.min.js'"),'Dedicated plugin dependency loader must support D3 for the GRS main renderer.');
assert((manifest.window?.dependencies||[]).includes('scientific-renderer'),'Resonance TOP must declare the renderer-neutral Core scientific renderer.');
assert(resonanceCss.includes('display:grid;grid-template-columns:minmax(0,1fr);height:100%'),'GRS plugin-owned layout must preserve a non-zero chart surface inside AnalysisWorkbench.');
assert(resonance.includes('respar-main-legend dkds-scroll-x-compact')&&resonance.includes('dkds-toolbar dkds-surface'),'Resonance legend must consume Core scrolling, toolbar and surface primitives.');
assert(resonanceMainPlot.includes('compactLegendNumber')&&resonanceMainPlot.includes("chip.className='respar-legend-chip dkds-legend-item'"),'Resonance main-plot owner must format compact Vg labels and consume the Core legend-item primitive.');
assert(resonanceSelection.includes("bindView('resonance-dataset-list'")&&resonanceSelection.includes("bindView('resonance-main-legend'"),'Resonance data list and legend must register with Core linked-selection views through the Selection runtime owner.');
assert(resonanceSelection.includes('horizontalWheel:true')&&resonanceSelection.includes('dimOthers:true'),'Resonance legend must delegate horizontal wheel scrolling and focus dimming to Core.');
assert(!resonance.includes('.respar-legend-chip.selected')&&!resonance.includes('.respar-legend-chip.dimmed'),'Resonance must not own private legend selection/dimming CSS.');

console.log('Plugin visual contract checks passed.');
