'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

// TER marker regression: Display analysis must not keep the original 0-point
// result after a restyle replaces x/y arrays on the same trace object.
{
  const context={console,WeakMap,Map,Set,Number,Math,Object,Array,String};
  context.window=context;context.globalThis=context;vm.createContext(context);
  vm.runInContext(read('src/core/scientific/display-runtime.js'),context,{filename:'display-runtime.js'});
  const trace={x:[],y:[],mode:'markers'};
  assert.equal(context.DKDSScientificDisplay.analyzeTrace(trace).n,0,'empty TER marker trace should initially analyze as zero points');
  trace.x=[.62];trace.y=[135830];
  assert.equal(context.DKDSScientificDisplay.analyzeTrace(trace).n,1,'replacing marker x/y must invalidate the cached zero-point analysis automatically');
  assert.equal(context.DKDSScientificDisplay.sampleTrace(trace,{pixelWidth:500}).displayCount,1,'restyled TER marker must enter the renderer display sample');
}

const d3=read('src/core/scientific/d3-chart-renderer.js');
const ter=read('src/plugins/ter-analysis/feature-runtime.js');
assert(d3.includes('yAxis.showgrid!==false'),'D3 axes must honor the standard yaxis.showgrid contract instead of always painting grid lines');
assert((ter.match(/showgrid:false/g)||[]).length>=4,'both TER heatmaps must disable X/Y grid paint so matrix cells are not crossed by pale grid lines');

const pulse=read('src/plugins/pulse-sampler-tool/plugin.js'),pulseCss=read('src/plugins/pulse-sampler-tool/plugin.css');
assert(/leftWidth:(?:5\d\d|[6-9]\d\d),leftMin:(?:47\d|4[89]\d|[5-9]\d\d),leftReserve:[5-9]\d\d/.test(pulse),'Pulse Sampler parameter PRIME must preserve a practical intrinsic width for its four actions and parameter grid without regressing to the old narrow rail');
assert(pulse.includes("classList.add('ps-parameters-extracted')")&&pulseCss.includes('.pulse-sampler-shell.ps-parameters-extracted{grid-template-columns:minmax(0,1fr)}'),'extracting Pulse parameters must collapse the obsolete first Grid column so Merged Waveform fills the primary workspace');
assert(pulseCss.includes('.ps-segment-bar>strong{min-width:0')&&pulseCss.includes('.ps-segment-bar>button{flex:0 0 auto}'),'Pulse segment header must keep text and the trailing action inside the panel edge');

const pluginWindow=read('src/plugin-window/runtime.js'),pluginLifecycle=read('src/plugin-window/lifecycle.js'),main=read('desktop/main.js'),preload=read('desktop/preload.js'),host=read('src/app/modules/dedicated-plugin-windows.js'),status=read('src/plugins/status-monitor/plugin.js');
assert(pluginLifecycle.includes("lifecycle?.('hidden',{reason:'top-window-hide',purgeManaged:false})"),'hiding a reusable TOP must retain managed plots as a real warm cache instead of purging them and rebuilding on every reopen');
assert(main.includes("ipcMain.handle('windows:releaseActivity'")&&main.includes('!win||win.isDestroyed()||win.isVisible()')&&main.includes('row?.ownerWebContentsId!==ownerId'),'manual plugin release must only close hidden auxiliary windows owned by the requesting main renderer');
assert(main.includes('waitForAuxiliaryWindowClosed')&&preload.includes('releaseActivityWindow:')&&host.includes('releaseActivityWindow:payload=>'),'manual release must wait for actual process teardown and travel through the generic runtime service');
assert(status.includes('data-release-activity')&&status.includes("runtimeService.releaseActivityWindow?."),'Memory panel must expose explicit release actions for hidden plugin processes');

const dcView=read('src/plugins/data-center/shared-views.js'),dc=read('src/plugins/data-center/feature-runtime.js'),dcCss=read('src/plugins/data-center/plugin.css');
assert(dcView.includes('id="dcMultiSelectBtn"')&&dcView.includes('aria-pressed="false"'),'Data Center must expose an explicit touch-friendly multi-select mode');
assert(dc.includes('multiSelectMode')&&dc.includes("{ctrlKey:true,metaKey:false,shiftKey:false}")&&dc.includes('syncArtifactChecks()'),'multi-select mode must make ordinary touch/mouse taps toggle the existing canonical selection set');
assert(dc.includes("selector:'.dc-artifact-item',gestures:['context']")&&dc.includes('contextArtifacts(context.artifact)'),'long-press/right-click must continue routing actions through the selected artifact set');
assert(dc.includes('type="checkbox"')&&dcCss.includes('.dc-artifact-list.is-multi-select .dc-artifact-check{display:block}'),'multi-select mode must reveal a real Core-themed checkbox at the left of each artifact row');

const importCss=read('src/styles/presentation/import-workbench.css'),importStructure=read('src/styles/structure/import-workbench.css');
assert(importCss.includes('.import-target-chip:has(input:checked)')&&importCss.includes('.import-workbench-header{border-bottom:'),'Import Workbench must retain selected target chips and crisp hierarchy dividers');
assert(importStructure.includes('grid-template-columns:clamp(280px,21vw,330px) minmax(0,1fr)'),'Import source rail must keep a useful proportional width across desktop sizes');

console.log('v3.68.99 inserted bug/UI effectiveness PASS');
