
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

  const terViews=read('src/plugins/ter-analysis/unit-presentation.js');
  const terCss=read('src/plugins/ter-analysis/plugin.css');
  assert.ok(terViews.includes('R–V 全 Vg · 正扫 / 反扫'),'TER resistance card must retain the accepted compact visible title.');
  assert.ok(terViews.includes("accessibleTitle:'全部 Vg 的电阻–电压（R–V）正扫 / 反扫'"),'TER must preserve the full scientific accessible label.');
  assert.ok(terViews.includes("actionsTagName:'div'")&&terViews.includes("className:'ter-resistance-card-header'"),'TER R–V header must preserve accepted source anatomy through parameterized Unit Header.');
  assert.ok(terCss.includes('grid-template-rows:auto auto auto minmax(320px,1fr)'),'TER R–V home card must preserve the accepted 320 px source-detail plot floor.');
  assert.ok(terCss.includes('ter-resistance-card.dkds-portable-view:is(.is-docked,.is-floating,.is-global-floating)')&&terCss.includes('minmax(0,1fr)'),'Moved TER R–V card must preserve accepted portable flex geometry.');
  assert.ok(terViews.includes("stateVersion:'ter-plot-view-v3'"),'TER PlotViews must preserve accepted persisted placement state.');
  assert.ok(fs.existsSync(path.join(root,'src/plugins/ter-analysis/plugin.css')),'TER source-parity reconstruction must retain accepted geometry-only plugin.css.');

  const pulsePresentation=read('src/plugins/pulse-analysis/unit-presentation.js');
  const pulseCss=read('src/plugins/pulse-analysis/plugin.css');
  assert.ok(pulsePresentation.includes("stateVersion=raw?'pulse-raw-flow-v5':'pulse-result-grid-v6'"),'Pulse raw diagnostic must use a fresh home-flow PlotView state namespace.');
  assert.ok(!pulseCss.includes('--pulse-raw-plot-height'),'Pulse raw plot height must no longer be privately owned by plugin CSS.');
  assert.ok(pulsePresentation.includes("detailGeometry:{contentMinHeightPx:raw?360:320,contentMaxHeightPx:raw?360:320}"),'Pulse raw/result PlotViews must own intrinsic scientific height through Unit detailGeometry.');

  const samplerUnit=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
  assert.ok(samplerUnit.includes("variant:'analysis-control-grid'"),'Pulse Sampler Desktop extraction row must preserve the accepted Unit extraction-control geometry.');
  assert.ok(samplerUnit.includes("variant:'result-control-grid'"),'Pulse Sampler result row must preserve the accepted Unit X/Y/copy/export control geometry.');
  assert.ok(samplerUnit.includes("variant:'result-grid-asymmetric'"),'Pulse Sampler plot/table result region must remain the accepted asymmetric Unit composition.');

  const dcFeature=read('src/plugins/data-center/feature-runtime.js');
  const dcPresentation=read('src/plugins/data-center/unit-presentation.js');
  const dcCommands=read('src/plugins/data-center/command-runtime.js');
  const dcCss=read('src/plugins/data-center/plugin.css');
  assert.ok(dcPresentation.includes("stateVersion:'data-center-chart-inline-v2'"),'Data Center chart preview must reset stale right-dock geometry to the current inline layout through its Unit presentation owner.');
  assert.ok(dcCommands.includes("rows:2"),'Formula editor must use a compact two-row authoring field in its current formula owner.');
  assert.ok(/\.dc-source-preview\{[^}]*grid-column:1 \/ -1/.test(dcCss),'Data Center source table must span the full primary grid.');
  assert.ok(dcCss.includes('@container data-center-workspace (min-width:1180px)'),'Data Center two-column primary layout must query an ancestor container; a container cannot query its own size.');
  assert.ok(dcCss.includes('#dcFormulaParams{--dkds-field-control-min-height:28px'),'Formula controls must configure a compact Core field-density slot.');
  assert.ok(dcPresentation.includes("variant:'formula-grid',responsiveTarget:formulaPanel.element"),'Formula controls must use the shared Unit formula-grid as their single compact wide-screen outer-grid owner.');
  assert.ok(dcCss.includes('--dc-main-areas:"source source" "tool chart"'),'Inline chart preview must begin beside the formula section through the shared Data Center grid-area contract.');

  const vthWindow=read('desktop/plugin-window-manager.js');
  assert.ok(vthWindow.includes('packageScripts:normalizePluginScripts'),'Dedicated built-in windows must load manifest package scripts; Vth analysis-runtime is not an optional fallback.');

  console.log('v3.68.0 desktop user regression closure PASS');
})();
