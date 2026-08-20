const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const css=read('src/style.css');
const shell=read('src/core/recipes/shell-navigation.js');
const safeguards=read('src/core/recipes/workspace-safeguards.js');
const runtime=read('src/plugin-window/runtime.js');
const resonance=read('src/plugins/resonance-workbench/view-components.js');
const resonanceRuntime=read('src/plugins/resonance-workbench/feature-runtime.js');
const manifest=JSON.parse(read('src/plugins/resonance-workbench/plugin.json'));

for(const token of ['--plugin-font-body:12.5px','--plugin-font-label:12px','--plugin-font-meta:11px','--plugin-font-title:13.5px','--plugin-font-section:14px','--plugin-control-height:32px']){
  assert(css.includes(token),`Shared plugin visual token missing: ${token}`);
}
assert(css.includes('.dkds-analysis-workbench:not(:has(.resonance-parity-root))'),'Analysis plugins must inherit one shared visual contract while GRS resonance explicitly opts out.');
for(const cls of ['.dc-tabs','.dc-inline-actions','.dc-chart-toolbar','.pulse-file-toolbar','.pulse-file-actions','.pulse-plot-actions','.pulse-table-actions','.ter-chart-actions']){
  assert(css.includes(cls),`Single-row-first plugin toolbar contract missing ${cls}.`);
}
assert(css.includes('flex-flow:row nowrap!important'),'Plugin action bars must consume available horizontal room before wrapping.');
assert(css.includes('.dc-artifact-meta')&&css.includes('.dc-prov-time')&&css.includes('.schema-param-help'),'Data Center legacy micro-text must be normalized by the shared contract.');
assert(shell.includes('var(--plugin-font-body')&&shell.includes('var(--plugin-font-meta')&&shell.includes('var(--plugin-control-height'),'Plugin manager must consume the shared plugin text/control tokens rather than define a private scale.');
assert(safeguards.includes('var(--plugin-font-meta'),'Import/workspace warnings must consume the shared plugin meta text token.');
assert(runtime.includes('document.body.dataset.pluginId'),'Dedicated TOP windows must expose plugin identity so shared visual rules can opt a parity surface in/out deterministically.');
assert(runtime.includes("d3:'../../node_modules/d3/dist/d3.min.js'"),'Dedicated plugin dependency loader must support D3 for the GRS main renderer.');
assert((manifest.window?.dependencies||[]).includes('d3'),'Resonance TOP must explicitly declare its D3 dependency.');
assert(resonance.includes('display:grid;grid-template-columns:minmax(0,1fr);height:100%'),'GRS main-workspace must preserve a non-zero chart surface inside AnalysisWorkbench.');
assert(resonance.includes('respar-main-legend dkds-scroll-x-compact'),'Resonance legend must consume the Core compact horizontal-scroll utility.');
assert(resonanceRuntime.includes('compactLegendNumber')&&resonanceRuntime.includes("chip.className='respar-legend-chip'"),'Resonance legend must format compact Vg labels.');
assert(resonanceRuntime.includes("bindView('resonance-dataset-list'")&&resonanceRuntime.includes("bindView('resonance-main-legend'"),'Resonance data list and legend must register with Core linked-selection views.');
assert(resonanceRuntime.includes('horizontalWheel:true')&&resonanceRuntime.includes('dimOthers:true'),'Resonance legend must delegate horizontal wheel scrolling and focus dimming to Core.');
assert(!resonance.includes('.respar-legend-chip.selected')&&!resonance.includes('.respar-legend-chip.dimmed'),'Resonance must not own private legend selection/dimming CSS.');

console.log('Plugin visual contract checks passed.');
