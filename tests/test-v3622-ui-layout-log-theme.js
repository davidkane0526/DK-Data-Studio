'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

// Minimal browser globals required by the shared UI shortcut module at load time.
global.window={DKDSPlotPresentation:null,addEventListener:()=>{},removeEventListener:()=>{}};
global.document={querySelector:()=>null};
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.requestAnimationFrame=fn=>{fn();return 1;};
global.cancelAnimationFrame=()=>{};

// ScientificPlot: logarithmic viewport math belongs to Core and must operate in
// log space rather than applying linear arithmetic to positive decades.
const {applyScientificCurveNavigation}=require('../src/core/ui/modules/scientific-curve/navigation.js');
class DummySurface{
  constructor(){this.displayYAxisType='log';this.lastRender={x:{domain:()=>[-2,2]},y:{domain:()=>[1e-9,1e-5]}};this.next=null;}
  setView(next){this.next=next;}
  render(){}
}
applyScientificCurveNavigation(DummySurface);
const sci=new DummySurface();
const half=sci.scaleDomainAround([1e-9,1e-5],1e-7,.5,1e-6,'log');
assert(Math.abs(Math.log10(half[0])+8)<1e-10&&Math.abs(Math.log10(half[1])+6)<1e-10,'Log zoom must scale symmetrically in decades around the geometric center.');
sci.zoomBy(.72);
assert(sci.next?.yDomain?.every(v=>Number.isFinite(v)&&v>0),'Toolbar zoom must keep a valid positive logarithmic Y domain.');
assert(Math.log10(sci.next.yDomain[1]/sci.next.yDomain[0])<4,'Toolbar zoom-in must actually reduce the log-Y decade span.');

const model=read('src/core/ui/modules/scientific-curve/model.js');
const render=read('src/core/ui/modules/scientific-curve/render.js');
assert(model.includes("yDomain:null},{reason:'axis-scale-toggle'"),'Switching linear/log display must invalidate the old Y viewport so the new scale starts from a correctly padded domain.');
assert(render.includes("pad=Math.max(.08,span*Number(this.spec.yPaddingFactor??.07))"),'Log autorange must reserve adaptive headroom instead of pinning extrema to the axes.');
assert(render.includes('dkds-scientific-marker-selection-halo')&&render.includes('hasMarkerSelection&&!selected'),'Selected markers must use a dedicated halo and de-emphasize unselected markers.');

// Primary actions: one Theme owner across shell, dialogs and connectivity.
const theme=read('src/styles/theme/contract.css');
const componentAppearance=read('src/styles/theme/component-appearance.css');
const dialogs=read('src/styles/presentation/dialogs.css');
const connectivity=read('src/styles/presentation/connectivity.css');
assert(theme.includes('--dkui-primary-shadow:')&&componentAppearance.includes('outline:2px solid color-mix(in srgb,var(--dkui-accent) 42%,transparent)')&&!componentAppearance.includes('outline:2px solid var(--dkui-focus)')&&!componentAppearance.includes('--dkds-ca-action-focus-shadow'),'Core accessibility focus must use a valid color outline; the box-shadow focus token must never be misused as outline-color.');
assert(!dialogs.includes('.dkds-dialog-action.primary{')&&!dialogs.includes('footer button.primary{'),'Dialog presentation must not re-own primary button paint.');
assert(!connectivity.includes('.lan-web-panel button.primary'),'Connectivity presentation must consume the shared primary Theme contract.');

// The Windows automation report found white text on #3B74FF at 4.1:1. The
// updated Thin Glass dark accent must clear WCAG AA normal-text contrast.
const glass=read('src/plugins/thin-glass-theme/plugin.js');
assert(glass.includes("accent:'#2F63DB'"),'Thin Glass dark primary accent must use the corrected contrast-safe token.');
function luminance(hex){
  const rgb=hex.match(/[0-9a-f]{2}/ig).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
const ratio=(luminance('#FFFFFF')+.05)/(luminance('#2F63DB')+.05);
assert(ratio>=4.5,`Thin Glass dark primary contrast must be >=4.5:1, got ${ratio.toFixed(2)}.`);

// PluginWorkspace defines lifecycle, not a mandatory Resonance-style sidebar.
const pulse=read('src/plugins/pulse-analysis/shared-views.js');
const dc=read('src/plugins/data-center/shared-views.js');
assert(pulse.includes("wb.mountPrimary({id:'main',label:'脉冲分析',scroll:'auto',mainNode:primaryMain})")&&!pulse.includes('leftNode:'),'Pulse must retain its domain batch layout inside a main-only PRIMARY.');
assert(pulse.includes("id:'pulse-results-height'")&&pulse.includes("axis:'y'")&&pulse.includes('pulse-results-splitter'),'Pulse result plots/table must use the persisted Core height splitter.');
assert(dc.includes("wb.mountPrimary({id:'main',label:'数据中心',scroll:'auto',mainNode:layout})")&&!dc.includes('leftNode:'),'Data Center must keep its domain data rail inside its own PRIMARY layout.');
assert(dc.includes("id:'data-center-data-width'")&&dc.includes("axis:'x'"),'Data Center domain rail must use Core persisted split mechanics.');

const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
const resonanceGroup=read('src/plugins/resonance-workbench/feature-group-runtime.js');
assert(!resonanceCss.includes('.reswin-group-head{')&&!resonanceCss.includes('.reswin-group-card-actions{')&&!resonanceCss.includes('.reswin-group-title{'),'Resonance must not re-own Core PlotView header geometry.');
assert(resonanceGroup.includes('reswin-group-head dkds-plot-view-head')&&!resonanceGroup.includes('reswin-group-head dkds-surface-header dkds-plot-view-head')&&resonanceGroup.includes('reswin-group-title dkds-plot-view-title'),'Resonance GroupPlot must consume the canonical Core PlotView header DOM contract without generic SurfaceHeader geometry.');

const infra=read('docs/PLUGIN_UI_INFRASTRUCTURE.md');
const topDocs=read('sdk/TOP_WORKSPACES.md');
const templateDocs=read('sdk/templates/top-workspace-plugin/README.md');
assert(infra.includes('Plugin API 1.19 does not expose a PRIMARY left slot')&&infra.includes('platform-neutral `presentationRole`'),'Core UI docs must direct secondary semantic rails through explicit Presentation surfaces.');
assert(topDocs.includes('Plugin API 1.19 makes PRIMARY exactly one semantic main surface')&&templateDocs.includes('main-only PRIMARY')&&templateDocs.includes('removes `leftNode` / `leftHtml`'),'SDK authoring docs must encode the Plugin API 1.19 PRIMARY cutover.');
assert.equal(json('sdk/contract.json').pluginApiVersion,'1.19.0','This layout correction must not require a Plugin API bump beyond current 1.19.0.');

console.log(`v3.62.2 UI/layout/log/theme feedback closure PASS; Thin Glass dark primary contrast=${ratio.toFixed(2)}:1.`);
