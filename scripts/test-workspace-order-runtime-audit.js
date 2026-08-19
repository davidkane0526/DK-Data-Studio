const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const ui=read('src/core/ui-infrastructure.js');
const css=read('src/style.css');
const kernel=read('src/core/plugin-kernel.js');
const app=read('src/app.js');
const resonanceViews=read('src/plugins/resonance-workbench/view-components.js');
const resonanceFeature=read('src/plugins/resonance-workbench/feature-runtime.js');
const pulse=read('src/plugins/pulse-analysis/analysis-service.js');

// PRIMARY is a viewport contract, not a plugin-specific overflow patch.
assert(ui.includes("this.primaryScrollMode=String(spec.primaryScroll||'auto')==='contained'?'contained':'auto'"),'PluginWorkspace must expose auto/contained PRIMARY scrolling.');
assert(css.includes('.dkds-plugin-canvas-frame[data-primary-scroll="auto"] .dkds-plugin-canvas-center{overflow:auto'),'Auto PRIMARY workspaces must own a real scroll viewport.');
assert(css.includes('.dkds-plugin-canvas-frame[data-primary-scroll="contained"] .dkds-plugin-canvas-center{overflow:hidden'),'Contained scientific canvases must remain fixed interaction surfaces.');
for(const folder of ['ter-analysis','pulse-analysis','data-center']){
  const views=read(`src/plugins/${folder}/shared-views.js`);
  assert(views.includes("primaryScroll:'auto'"),`${folder} must use the scrollable PRIMARY contract.`);
}
assert(resonanceViews.includes("primaryScroll:'contained'"),'Resonance main plot must explicitly use the contained scientific canvas contract.');

// SUB is a full workspace page, not another scientific-canvas dock target.
assert(ui.includes('main.replaceChildren(frame,sub)')&&ui.includes("sub.classList.add('dkds-plugin-sub-page-host')"),'SUB host must live outside the scientific-canvas frame.');
assert(ui.includes("openSub(id){const ok=super.openSub(id);if(ok&&this.canvasFrame)this.canvasFrame.classList.add('hidden')"),'Opening a SUB must replace/hide the scientific canvas rather than squeeze into it.');
assert(css.includes('.dkds-plugin-workspace .dkds-plugin-sub-page-host{flex:1 1 0%;height:0;max-height:100%'),'SUB pages must fill and independently scroll inside the workspace page.');

// Floating has two intentionally different semantics.
assert(ui.includes("['home','sticky','left','right','bottom','main','float','global']"),'Core placement grammar must distinguish canvas float and global float.');
assert(ui.includes("placement==='global'?(this.zone('global')"),'Global float must use the outer workspace overlay.');
assert(ui.includes("if(mode==='float'&&this.spec.snap!==false)"),'Only canvas-managed float may edge-snap into scientific docks.');
assert(css.includes('.dkds-analysis-overlay>.dkds-portable-view.is-global-floating'),'Whole-workspace float must have a dedicated overlay visual contract.');
for(const folder of ['ter-analysis','pulse-analysis','data-center']){
  const feature=read(`src/plugins/${folder}/feature-runtime.js`);
  assert(feature.includes("'global'"),`${folder} portable plots must offer whole-workspace free float.`);
}
assert(resonanceFeature.includes("placements:['home','left','right','bottom','global']"),'Resonance group child plots must be able to leave the scientific canvas.');

// Dock locations are stacks, not absolute piles.
assert(css.includes('A dock slot is a stack, never a pile'),'Core must document same-location dock ordering.');
assert(css.includes('flex-flow:column nowrap!important')&&css.includes('.dkds-plugin-canvas-bottom>.dkds-portable-view'),'Bottom dock must flow multiple panels sequentially.');
assert(ui.includes('syncCanvasRegions()'),'Dock geometry must be recomputed from live portable contents.');

// PRIME close/minimize is a generic Core lifecycle.
assert(ui.includes('bindChromeAction(this.spec.closeSelector')&&ui.includes('bindChromeAction(this.spec.collapseSelector'),'PortableView must own generic close/collapse chrome events.');
assert(ui.includes('setCollapsed(value')&&ui.includes("savedState.collapsed===true"),'PortableView collapse state must be functional and persistent.');
assert(resonanceViews.includes("closeSelector:'[data-respar-close=\"inspect\"]'")&&resonanceViews.includes("closeSelector:'[data-respar-close=\"group\"]'"),'Resonance inspector/group must consume Core close lifecycle.');

// Undo/cancel is a true system edit contract routed to the active plugin.
assert(kernel.includes("registerTypedContribution(pluginId,'ui.editActions'")&&kernel.includes('invokeEditAction(action,payload={})'),'Plugin kernel must own active-plugin edit contributions.');
assert(app.includes('const systemUndo=')&&app.includes('const systemDeselect=')&&app.includes("edit.supports?.('undo')"),'Global edit controls must route to the active plugin before legacy state.');
assert(resonanceViews.includes('ctx.ui.edit?.register?.')&&!resonanceViews.includes("id:'undo',label:'↶'")&&!resonanceViews.includes("id:'deselect',label:'取消'"),'Resonance must consume system edit commands instead of duplicating them among PRIME/SUB actions.');

// Group plots are live reusable chart surfaces rather than snapshot/recreate UI.
assert(resonanceFeature.includes('const groupCards=new Map()')&&resonanceFeature.includes('const groupCharts=new Map()'),'Group subplot instances must be stable.');
assert(resonanceFeature.includes('groupDataFingerprint()')&&resonanceFeature.includes('nextKey===groupRenderKey'),'Group data refresh must avoid redundant Plotly work when only selection emphasis changes.');
assert(resonanceFeature.includes('Plotly.react')&&!resonanceFeature.includes('Plotly.newPlot'),'Resonance derived plots must update existing Plotly graphs.');
assert(resonanceFeature.includes('visibleSweepIds().map(String)')&&resonanceFeature.includes('acceptedVisible'),'Group data source must follow currently visible, accepted resonance peaks.');
assert(resonanceFeature.includes('renderGroup();else if(includeGroup)updateGroupHighlights()'),'Main/selection changes must drive the open group view.');
assert(ui.includes("this.wrapper.querySelectorAll?.('.js-plotly-plot')")&&ui.includes('window.Plotly.Plots.resize(plot)'),'PortableView resize must resize Plotly graphs by default.');

// Pulse analysis must be repeatable and must not destroy the last valid result on a failed rerun.
assert(pulse.includes("A.estimatePulseCycleSamples?.")&&pulse.includes('options.__autoEstimatedCycle=true'),'Pulse auto mode must honor the UI-promised automatic cycle estimate.');
assert(pulse.includes('const previousResult=item?.result||null')&&pulse.includes('item.result=previousResult'),'A failed pulse rerun must preserve the last valid result.');
assert(pulse.includes('cycleSamples:0')&&pulse.includes('retry the mature auto path'),'Ambiguous estimated-cycle analysis must fall back to the mature auto parser.');
assert(pulse.includes('重算失败，保留上次结果'),'Pulse UI must distinguish rerun failure from loss of a valid result.');

// Internal implementation notes must not leak into product UI.
for(const phrase of ['GRS 工作台交互 · SUPER / TOP 共用同一渲染器','SUPER / TOP 共用同一渲染器']){
  assert(!resonanceViews.includes(phrase),`Product UI leaked implementation note: ${phrase}`);
}

const topRuntime=read('src/plugin-window/runtime.js');
assert(topRuntime.includes("edit?.supports?.('undo')") && topRuntime.includes("edit?.supports?.('deselect')"), 'TOP window routes Ctrl+Z/Escape through the active-plugin Edit Contract');


// Restoring a portable view must return to its stable original slot, not append
// after siblings that happened to remain in the home container.
assert(ui.includes('document.createComment(`dkds-portable-home:')&&ui.includes('anchor.parentNode.insertBefore(this.wrapper,anchor.nextSibling)'),'PortableView home placement must use a stable anchor so group subplots return to their original slot.');

// Resonance group layout selector is a real Core ContextMenu action, not dead chrome.
assert(resonanceViews.includes("event.preventDefault();event.stopPropagation();")&&resonanceViews.includes("label:value==='auto'?'自动排列':`每行 ${value} 个子图`")&&resonanceViews.includes('ctx.ui.contextMenus?.open?.'),'Resonance group column control must open the Core layout menu and expose auto/1-6 columns.');

// System export menu is contextual: each TOP-capable plugin contributes semantic
// export targets, and the shell displays the currently active workspace context.
const terFeature=read('src/plugins/ter-analysis/feature-runtime.js');
const pulseFeature=read('src/plugins/pulse-analysis/feature-runtime.js');
const dataCenterFeature=read('src/plugins/data-center/feature-runtime.js');
assert(kernel.includes('data-plugin-export-context')&&kernel.includes('active?.contextLabel||active?.label')&&kernel.includes("trigger.textContent='导出数据 ▾'"),'System export menu must identify the current active plugin workspace and keep one consistent shell trigger.');
assert(resonanceViews.includes('共振 I–V 主图 · SVG')&&!resonanceViews.includes("label:'主图 SVG'"),'Resonance exports must name the actual I–V plot rather than an ambiguous main plot.');
assert(pulseFeature.includes('当前文件 · 原始波形数据 CSV')&&pulseFeature.includes('当前可见结果 · 读取电流图 SVG')&&pulseFeature.includes("activity:'pulse'"),'Pulse must dynamically register semantically named system export items.');
assert(terFeature.includes('TER 全组合热图 · Long CSV')&&terFeature.includes('R–V 联动图 · SVG')&&terFeature.includes("activity:'ter'"),'TER must dynamically register semantically named system export items.');
assert(dataCenterFeature.includes('当前数据表 · CSV')&&dataCenterFeature.includes('数据中心图形预览 · PNG')&&dataCenterFeature.includes("activity:'data-center'"),'Data Center must dynamically register its own system export items.');

console.log('v3.38 workspace ordering/export semantics checks passed.');
