
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

(function run(){
  const shell=read('src/styles/structure/analysis-shell.css');
  assert.ok(shell.includes('--dkds-analysis-shell-gap:6px'),'Desktop analysis content must retain a small explicit gap below Project Tabs.');
  assert.ok(shell.includes('top:calc(var(--dkds-analysis-page-top,var(--dkds-analysis-fallback-top)) + var(--dkds-analysis-shell-gap))'),'Analysis viewport must retain the live shell-top owner.');
  assert.ok(shell.includes('padding-top:0'),'The restored separation must be an external top offset, not an internal padding band or four-sided frame.');

  const chrome=read('src/styles/structure/desktop-chrome-geometry.css');
  const workspace=read('src/styles/structure/plugin-workspace.css');
  const semantic=read('src/styles/structure/sdk-semantic-surfaces.css');
  const portable=read('src/styles/structure/super-top-contract.css');
  const schema=read('src/styles/structure/schema-and-plugin-ui.css');
  assert.ok(chrome.includes(':is(.dkds-integrated-action-group,.dkds-separated-action-group,.dkds-portable-controls,.panel-header-actions,.dkds-plot-view-actions)>button{'),'Every titlebar action family must use one final Desktop Chrome geometry owner.');
  assert.ok(!/\.dkds-group-plot-head[^{}]*\{[^}]*(?:height|min-height)\s*:\s*var\(--dkds-header-action-height/s.test(workspace),'Workspace layout must not re-own group-title action height.');
  assert.ok(semantic.includes('--dkds-header-action-height:22px'),'GroupPlot header must feed the canonical action-height slot.');
  assert.ok(workspace.includes('--dkds-header-action-height:22px'),'PlotView header must feed the canonical action-height slot.');
  assert.ok(portable.includes('--dkds-header-action-height:22px'),'Portable header must feed the same canonical action-height slot.');
  assert.ok(schema.includes('--dkds-header-action-height:22px'),'Trend header must feed the same canonical action-height slot.');

  const terCss=read('src/plugins/ter-analysis/plugin.css');
  const terViews=read('src/plugins/ter-analysis/shared-views.js');
  assert.ok(terViews.includes('R–V 全 Vg · 正扫 / 反扫'),'TER resistance card must use a compact single-line visible title.');
  assert.ok(terViews.includes('title=\\"全部 Vg 的电阻–电压（R–V）正扫 / 反扫\\"'),'TER must preserve the full scientific title as accessible hover text.');
  assert.ok(terCss.includes('flex-wrap:nowrap'),'TER resistance title and actions must stay on one header row.');
  assert.ok(terCss.includes('grid-template-rows:auto auto auto minmax(320px,1fr)'),'TER resistance chart must consume remaining card height instead of using a fixed visual island.');
  assert.ok(terCss.includes('--dkds-plot-content-height:auto')&&terCss.includes('--dkds-plot-content-min-height:320px'),'TER resistance plot must configure the Core PlotView height slot instead of re-authoring chart height.');
  assert.ok(!/\.ter-resistance-card \.analysis-chart\{[^}]*(?:height|min-height)\s*:/s.test(terCss),'TER plugin must not re-own final PlotView height/min-height properties.');

  const pulseFeature=read('src/plugins/pulse-analysis/feature-runtime.js');
  const pulseCss=read('src/plugins/pulse-analysis/plugin.css');
  assert.ok(pulseFeature.includes("stateVersion:'pulse-raw-diagnostic-v2'"),'Pulse raw diagnostic must invalidate stale persisted PRIME geometry.');
  assert.ok(pulseCss.includes('--pulse-raw-plot-height:clamp(360px,42vh,440px)'),'Pulse raw plot must have a bounded plugin-owned height contract.');
  assert.ok(pulseCss.includes('max-height:var(--pulse-raw-plot-height)'),'Pulse raw plot must not grow through resize feedback.');

  const samplerCss=read('src/plugins/pulse-sampler-tool/plugin.css');
  assert.ok(samplerCss.includes('grid-template-columns:minmax(220px,1.45fr) repeat(4,minmax(118px,.8fr)) minmax(148px,.72fr)'),'Pulse Sampler Desktop extraction row must reserve deterministic aligned slots for source, Time, Current, trims and extraction.');
  assert.ok(samplerCss.includes('grid-template-rows:auto auto'),'Pulse Sampler command surface must reserve independent rows for extraction and result controls.');
  assert.ok(samplerCss.includes('grid-template-columns:repeat(2,minmax(180px,1fr)) repeat(2,minmax(132px,.62fr))'),'Pulse Sampler result row must align X/Y plus copy/export without leaking into extraction controls.');

  const dcFeature=read('src/plugins/data-center/feature-runtime.js');
  const dcCommands=read('src/plugins/data-center/command-runtime.js');
  const dcCss=read('src/plugins/data-center/plugin.css');
  assert.ok(dcFeature.includes("stateVersion:'data-center-chart-inline-v2'"),'Data Center chart preview must reset stale right-dock geometry to the current inline layout.');
  assert.ok(dcCommands.includes("rows:2"),'Formula editor must use a compact two-row authoring field in its current formula owner.');
  assert.ok(/\.dc-source-preview\{[^}]*grid-column:1 \/ -1/.test(dcCss),'Data Center source table must span the full primary grid.');
  assert.ok(dcCss.includes('@container data-center-workspace (min-width:1180px)'),'Data Center two-column primary layout must query an ancestor container; a container cannot query its own size.');
  assert.ok(dcCss.includes('#dcFormulaParams{--dkds-field-control-min-height:28px'),'Formula controls must configure a compact Core field-density slot.');
  assert.ok(dcCss.includes('#dcFormulaParams .schema-parameter-panel{display:grid;grid-template-columns:'),'Formula controls must use a compact wide-screen grid.');
  assert.ok(dcCss.includes('--dc-main-areas:"source source" "tool chart"'),'Inline chart preview must begin beside the formula section through the shared Data Center grid-area contract.');

  const vthWindow=read('desktop/plugin-window-manager.js');
  assert.ok(vthWindow.includes('packageScripts:normalizePluginScripts'),'Dedicated built-in windows must load manifest package scripts; Vth analysis-runtime is not an optional fallback.');

  console.log('v3.68.0 desktop user regression closure PASS');
})();
