'use strict';
const {$, mainSvg, state}=require('./context');
const {createOwner}=require('./style-gate');
const style=createOwner('app.workspace-super-shell','runtime-analysis-shell');
let deps=null;
function configure(next){deps=next;return module.exports;}
const renderProjectTabs=(...args)=>deps.projectTabs.renderProjectTabs(...args);
const renderDatasetList=(...args)=>deps.imports.renderDatasetList(...args);
const pluginUiContext=(...args)=>deps.artifacts.pluginUiContext(...args);


function activeMainViewProvider(){
  const activityId=window.DKDSPlugins?.activities?.active?.()||null;
  const providers=window.DKDSPlugins?.registry?.values?.('ui.mainViews')||[];
  return providers
    .filter(p=>!p.activity||!activityId||p.activity===activityId)
    .sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0))[0]||null;
}

function measureMainPlot(){
  const wrap=$('#mainPlotWrap');
  if(!wrap)return null;
  const rect=wrap.getBoundingClientRect();
  const width=Math.round(rect.width),height=Math.round(rect.height);
  return width>8&&height>8?{width,height}:null;
}

function renderEmptyMainView(message='当前工作区没有提供主图视图'){
  const legend=$('#mainLegendBar');if(legend)legend.replaceChildren();
  const svg=$('#mainPlot');if(!svg)return;
  svg.replaceChildren();
  const size=measureMainPlot();if(!size)return;
  svg.setAttribute('width',String(size.width));
  svg.setAttribute('height',String(size.height));
  svg.removeAttribute('viewBox');
  const text=document.createElementNS('http://www.w3.org/2000/svg','text');
  text.setAttribute('x',String(size.width/2));text.setAttribute('y',String(size.height/2));
  text.setAttribute('text-anchor','middle');text.setAttribute('class','empty-main-view');text.textContent=message;
  svg.appendChild(text);
}

function renderMainPlot(){
  const provider=activeMainViewProvider();
  if(!provider?.render){renderEmptyMainView();return;}
  try{
    provider.render({container:$('#mainPlotWrap'),svg:mainSvg,state,context:pluginUiContext(),activityId:window.DKDSPlugins?.activities?.active?.()||null});
  }catch(err){
    console.error(`[DKDS main view:${provider.id}]`,err);
    renderEmptyMainView(`主图插件 ${provider.title||provider.id} 渲染失败`);
  }
}

function scheduleMainPlotRelayout(){
  if(state.mainLayout.raf)cancelAnimationFrame(state.mainLayout.raf);
  state.mainLayout.raf=requestAnimationFrame(()=>{state.mainLayout.raf=null;renderMainPlot();});
}

function clearMainView(render=true){
  state.mainView={xDomain:null,yDomain:null,mode:'select'};
  if(render)renderMainPlot();
}

function resetMainView(){
  clearMainView(true);
  window.DKDSPlugins?.events?.emit?.('main-view:reset',{activityId:window.DKDSPlugins?.activities?.active?.()||null});
}

function updateMainModeButtons(){}

function renderAll(){
  renderProjectTabs();
  renderDatasetList();
  renderMainPlot();
  window.DKDSPlugins?.events?.emit?.('workspace:render',{context:pluginUiContext()});
}



let analysisViewportFrame=0;
let analysisViewportFollowupFrame=0;

function getAnalysisViewportHeight(){
  return Math.max(1,Math.round(
    window.visualViewport?.height
    || window.innerHeight
    || document.documentElement.clientHeight
    || 1
  ));
}

function measureAnalysisPageTop(){
  const viewportHeight=getAnalysisViewportHeight();
  const shellParts=[document.querySelector('.topbar'),document.querySelector('.project-tabs-bar')];
  let bottom=0;
  for(const el of shellParts){
    if(!el||getComputedStyle(el).display==='none')continue;
    const rect=el.getBoundingClientRect();
    if(Number.isFinite(rect.bottom))bottom=Math.max(bottom,rect.bottom);
  }
  const fallback=92;
  const measured=bottom>0?Math.round(bottom):fallback;
  return Math.max(0,Math.min(measured,Math.max(0,viewportHeight-120)));
}

function applyAnalysisPageViewport(){
  analysisViewportFrame=0;
  const root=document.documentElement;
  const viewportHeight=getAnalysisViewportHeight();
  const top=measureAnalysisPageTop();
  style.token(root,'--dkds-viewport-height',`${viewportHeight}px`,{component:'analysis-shell'});
  style.token(root,'--dkds-analysis-page-top',`${top}px`,{component:'analysis-shell'});
}

function syncAnalysisPageViewport(){
  if(analysisViewportFrame)cancelAnimationFrame(analysisViewportFrame);
  if(analysisViewportFollowupFrame)cancelAnimationFrame(analysisViewportFollowupFrame);
  analysisViewportFrame=requestAnimationFrame(()=>{
    applyAnalysisPageViewport();
    // Plugin enable/disable can mutate the command shell in the same frame.
    // Measure once more after layout settles so an open analysis page never
    // keeps a stale, shortened scroll viewport.
    analysisViewportFollowupFrame=requestAnimationFrame(()=>{
      analysisViewportFollowupFrame=0;
      applyAnalysisPageViewport();
    });
  });
}

window.visualViewport?.addEventListener?.('resize',syncAnalysisPageViewport,{passive:true});

// Keep fixed analysis pages anchored to the live command shell. Plugin
// enable/disable and SUPER switches can reflow the toolbar several frames
// after the originating event; a persistent observer is more reliable than
// one-off scroll/view-height corrections.
let analysisShellResizeObserver=null;
function bindAnalysisShellViewportObserver(){
  analysisShellResizeObserver?.disconnect?.();
  if(!window.ResizeObserver)return;
  analysisShellResizeObserver=new ResizeObserver(()=>syncAnalysisPageViewport());
  for(const selector of ['.topbar','.project-tabs-bar','#activityBar','#primaryActivityBar']){
    const el=document.querySelector(selector);if(el)analysisShellResizeObserver.observe(el);
  }
}
queueMicrotask(bindAnalysisShellViewportObserver);

function superWorkspaceRootPageId(contract={}){
  const rootSelector=String(contract?.layout?.root?.selector||'').trim();
  if(!rootSelector)return '';
  try{
    const root=document.querySelector(rootSelector);
    const page=root?.closest?.('.analysis-page');
    if(page?.id)return page.id;
  }catch(err){console.warn('[DKDS SUPER] invalid native root selector',rootSelector,err);}
  const match=rootSelector.match(/^#([A-Za-z_][\w:.-]*)/);
  if(match?.[1]&&document.getElementById(match[1])?.classList?.contains('analysis-page'))return match[1];
  return '';
}

function applySuperWorkspace(superState){
  const state=superState||window.DKDSPlugins?.workspace?.super?.()||{};
  const activity=String(state.activityId||'');
  document.body.dataset.superActivity=activity;
  document.body.dataset.superPlugin=String(state.pluginId||'');
  document.body.classList.toggle('super-unconfigured',!state.available);
  const rootPageId=superWorkspaceRootPageId(state.contract||{});
  document.querySelectorAll('.analysis-page').forEach(page=>{
    const belongsToSuper=!!activity&&page.dataset.pluginActivity===activity;
    const isRoot=belongsToSuper&&!!rootPageId&&page.id===rootPageId;
    page.classList.toggle('super-workspace-page',belongsToSuper);
    page.classList.toggle('super-workspace-root-page',isRoot);
    // Workspace navigation is presented by the host command bar while a TOP is
    // embedded as SUPER. The same plugin keeps inline navigation in its
    // dedicated TOP window, so there is only one action owner in either host.
    for(const nav of page.querySelectorAll('.dkds-analysis-nav'))nav.classList.toggle('host-presented',isRoot);
  });
  if(!state.available){
    showNoSuperWorkspace();
    return false;
  }
  if(rootPageId){
    const root=$('#'+rootPageId);
    if(root){
      document.querySelectorAll('.analysis-page').forEach(page=>page.classList.toggle('hidden',page.id!==rootPageId));
      syncAnalysisPageViewport();
    }
  }
  return true;
}

function showNoSuperWorkspace(){
  document.querySelectorAll('.analysis-page').forEach(page=>page.classList.toggle('hidden',page.id!=='superWorkspaceEmpty'));
  document.body.classList.add('super-unconfigured');
  syncAnalysisPageViewport();
}

function bindSuperWorkspaceControls(){
  $('#superEmptyOpenManagerBtn')?.addEventListener('click',()=>{
    openAnalysisPage('pluginManagerPage');
    window.DKDSPluginManagerUI?.render?.();
  });
}

function refreshOpenAnalysisPage(){
  const page=[...document.querySelectorAll('.analysis-page')].find(el=>!el.classList.contains('hidden'));
  if(page)window.DKDSPlugins?.events?.emit?.('analysis:refresh',{id:page.id});
}

function openAnalysisPage(id){
  syncAnalysisPageViewport();
  document.querySelectorAll('.analysis-page').forEach(page=>page.classList.toggle('hidden',page.id!==id));
  window.DKDSPlugins?.events?.emit?.('analysis:opened',{id});
  syncAnalysisPageViewport();
  scheduleMainPlotRelayout();
}

function ensurePluginWorkspaceVisible(activityId){
  const activity=String(activityId||'');
  const superState=window.DKDSPlugins?.workspace?.super?.();
  if(!activity||!superState?.available||String(superState.activityId||'')!==activity)return false;
  const rootPageId=superWorkspaceRootPageId(superState.contract||{});
  if(!rootPageId)return false;
  const root=$('#'+rootPageId);
  const visible=[...document.querySelectorAll('.analysis-page')].find(page=>!page.classList.contains('hidden'));
  if(visible?.id===rootPageId)return true;
  openAnalysisPage(rootPageId);
  return !!root&&!root.classList.contains('hidden');
}

function closeAnalysisPage(id){
  const page=$('#'+id);
  if(page?.classList.contains('super-workspace-root-page'))return false;
  if(page)page.classList.add('hidden');
  window.DKDSPlugins?.events?.emit?.('analysis:closed',{id});
  const superState=window.DKDSPlugins?.workspace?.super?.();
  if(superState?.available){
    queueMicrotask(()=>window.DKDSPlugins?.activities?.set?.(superState.activityId,{invoke:false,forceEmbedded:true}));
  }
  scheduleMainPlotRelayout();
  return true;
}


module.exports=Object.freeze({configure, activeMainViewProvider, measureMainPlot, renderEmptyMainView, renderMainPlot, scheduleMainPlotRelayout, clearMainView, resetMainView, updateMainModeButtons, renderAll, getAnalysisViewportHeight, measureAnalysisPageTop, applyAnalysisPageViewport, syncAnalysisPageViewport, bindAnalysisShellViewportObserver, superWorkspaceRootPageId, applySuperWorkspace, showNoSuperWorkspace, bindSuperWorkspaceControls, refreshOpenAnalysisPage, openAnalysisPage, ensurePluginWorkspaceVisible, closeAnalysisPage, analysisViewportFrame, analysisViewportFollowupFrame, analysisShellResizeObserver});
