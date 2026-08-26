
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
    renderInspector();
    renderTrendPanel();
    window.DKDSPlugins?.events?.emit?.('workspace:render',{context:pluginUiContext()});
  }

  function activeInspectorProvider(){
    const activityId=window.DKDSPlugins?.activities?.active?.()||null;
    const providers=(window.DKDSPlugins?.registry?.values?.('ui.inspectors')||[])
      .filter(p=>!p.activity||p.activity===activityId)
      .sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0));
    const context=pluginUiContext();
    return providers.find(p=>{
      try{return typeof p.supports==='function'?p.supports(context)!==false:true;}catch{return false;}
    })||null;
  }

  function renderInspector(){
    const host=$('#inspectorBody');
    if(!host)return;
    const provider=activeInspectorProvider();
    const header=$('#inspectorPanelHeaderTitle');
    if(header)header.textContent=provider?.panelTitle||provider?.title||'检查器';
    if(!provider){
      host.innerHTML='<div class="empty-state">当前工作区没有提供检查器。</div>';
      return;
    }
    try{
      provider.render({container:host,context:pluginUiContext()});
    }catch(err){
      console.error('[DKDS inspector provider]',err);
      host.innerHTML=`<div class="empty-state">检查器插件渲染失败：${escapeHtml(err.message)}</div>`;
    }
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
    root.style.setProperty('--dkds-viewport-height',`${viewportHeight}px`);
    root.style.setProperty('--dkds-analysis-page-top',`${top}px`);
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

  const SUPER_LEFT_STORAGE_KEY='dkds.workspace.super.left-fraction.v1';
  let superLeftFraction=0.20;
  let superDividerBound=false;

  function currentSuperLayoutBounds(){
    const left=window.DKDSPlugins?.workspace?.super?.()?.contract?.layout?.left||{};
    const min=Number(left.minFraction);
    const max=Number(left.maxFraction);
    const preferred=Number(left.defaultFraction);
    return {
      min:Number.isFinite(min)?Math.max(.10,Math.min(.35,min)):.14,
      max:Number.isFinite(max)?Math.max(.25,Math.min(.50,max)):.42,
      preferred:Number.isFinite(preferred)?preferred:.20
    };
  }

  function readSuperLeftFraction(){
    let value=NaN;
    try{value=Number(localStorage.getItem(SUPER_LEFT_STORAGE_KEY));}catch{}
    const bounds=currentSuperLayoutBounds();
    if(!Number.isFinite(value))value=bounds.preferred;
    return Math.max(bounds.min,Math.min(bounds.max,value));
  }

  function applySuperLeftFraction(value,{persist=false}={}){
    const bounds=currentSuperLayoutBounds();
    superLeftFraction=Math.max(bounds.min,Math.min(bounds.max,Number(value)||bounds.preferred));
    document.documentElement.style.setProperty('--dkds-super-left-width',`${(superLeftFraction*100).toFixed(3)}vw`);
    if(persist){try{localStorage.setItem(SUPER_LEFT_STORAGE_KEY,String(superLeftFraction));}catch{}}
    syncSuperWorkspaceDivider();
    window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'super-divider',fraction:superLeftFraction});
    scheduleMainPlotRelayout();
  }

  function visibleAnalysisPage(){
    return [...document.querySelectorAll('.analysis-page')].find(el=>!el.classList.contains('hidden'))||null;
  }

  function syncSuperWorkspaceDivider(){
    const divider=$('#superWorkspaceDivider');
    if(!divider)return;
    const state=window.DKDSPlugins?.workspace?.super?.()||{};
    const page=visibleAnalysisPage();
    const superPage=page&&page.classList.contains('super-workspace-root-page');
    const blocked=page&&!superPage;
    divider.classList.toggle('hidden',!state.available||blocked);
    if(!state.available||blocked)return;
    const tabs=document.querySelector('.project-tabs-bar');
    const header=superPage?page.querySelector('.analysis-page-header'):null;
    const top=Math.ceil((header?.getBoundingClientRect?.().bottom)||(tabs?.getBoundingClientRect?.().bottom)||92);
    divider.style.setProperty('--dkds-super-divider-top',`${top}px`);
  }

  function clearSuperWorkspaceComposition(){
    document.querySelectorAll('.dkds-super-composed-root').forEach(el=>el.classList.remove('dkds-super-composed-root'));
    document.querySelectorAll('.dkds-super-slot-left,.dkds-super-slot-main,.dkds-super-slot-sticky,.dkds-super-slot-span,.dkds-super-slot-stack').forEach(el=>{
      el.classList.remove('dkds-super-slot-left','dkds-super-slot-main','dkds-super-slot-sticky','dkds-super-slot-span','dkds-super-slot-stack');
      delete el.dataset.dkdsSuperSlot;
    });
    document.querySelectorAll('.dkds-super-flatten').forEach(el=>el.classList.remove('dkds-super-flatten'));
  }

  function superContractScope(region={}){
    const pageId=String(region?.pageId||'').trim();
    return (pageId&&document.getElementById(pageId))||document;
  }

  function querySuperContractSelectors(region={}){
    const selectors=Array.isArray(region?.selectors)?region.selectors:[region?.selector,region?.mount];
    const scope=superContractScope(region);
    const out=[];
    for(const raw of selectors){
      const selector=String(raw||'').trim();
      if(!selector)continue;
      try{
        for(const element of scope.querySelectorAll(selector))if(!out.includes(element))out.push(element);
      }catch(err){console.warn(`[DKDS SUPER] invalid selector ${selector}`,err);}
    }
    return out;
  }

  function querySuperRoot(contract={}){
    const layout=contract?.layout||{};
    const selector=String(layout?.root?.selector||'').trim();
    if(!selector)return null;
    const scope=superContractScope(layout.left||layout.main||{});
    try{return scope.querySelector(selector)||document.querySelector(selector);}catch{return null;}
  }

  function applySuperWorkspaceComposition(contract={}){
    clearSuperWorkspaceComposition();
    const layout=contract?.layout||{};
    const mode=String(layout.mode||'split');
    document.body.dataset.superLayoutMode=mode;
    if(mode==='native')return true;

    const left=querySuperContractSelectors(layout.left||{});
    const main=querySuperContractSelectors(layout.main||{});
    const root=querySuperRoot(contract);
    if(!root||!left.length||!main.length){
      console.warn('[DKDS SUPER] incomplete runtime composition target',contract?.pluginId||'',{root:!!root,left:left.length,main:main.length});
      return false;
    }
    root.classList.add('dkds-super-composed-root');
    const mark=(elements,slot,region)=>{
      for(const element of elements){
        if(!root.contains(element))continue;
        element.classList.add(slot==='left'?'dkds-super-slot-left':'dkds-super-slot-main');
        element.dataset.dkdsSuperSlot=slot;
        if(region?.sticky)element.classList.add('dkds-super-slot-sticky');
        if(region?.spanRows)element.classList.add('dkds-super-slot-span');
        if(region?.stack)element.classList.add('dkds-super-slot-stack');
      }
    };
    mark(left,'left',layout.left||{});
    mark(main,'main',layout.main||{});
    const scope=superContractScope(layout.left||layout.main||{});
    for(const raw of (Array.isArray(layout.flatten)?layout.flatten:[])){
      const selector=String(raw||'').trim();
      if(!selector)continue;
      try{for(const element of scope.querySelectorAll(selector))if(root.contains(element))element.classList.add('dkds-super-flatten');}catch{}
    }
    return true;
  }

  function primePortableKey(contribution={}){
    return `${String(contribution.pluginId||'')}:${String(contribution.id||'')}`;
  }

  function resolvePrimePortableTarget(contribution={}){
    const raw=String(contribution.target||'').trim();
    if(!raw)return null;
    if(raw.startsWith('#')||raw.startsWith('.')||raw.startsWith('[')){
      try{return document.querySelector(raw);}catch{return null;}
    }
    return document.getElementById(raw)||(()=>{try{return document.querySelector(raw);}catch{return null;}})();
  }

  function refreshPrimeDockSlots(){
    const right=$('#primeRightDockSlot');
    const bottom=$('#primeBottomDockSlot');
    if(right)right.classList.toggle('active',[...right.children].some(node=>!node.classList.contains('hidden')));
    if(bottom)bottom.classList.toggle('active',[...bottom.children].some(node=>!node.classList.contains('hidden')));
    scheduleMainPlotRelayout();
  }

  function rememberPortablePrime(contribution,node){
    const key=primePortableKey(contribution);
    if(!primePortableState.has(key)){
      primePortableState.set(key,{
        key,pluginId:String(contribution.pluginId||''),node,
        parent:node.parentNode||null,next:node.nextSibling||null
      });
    }
    return primePortableState.get(key);
  }

  function resetPortablePrimeClasses(node){
    if(!node)return;
    node.classList.remove('dkds-prime-portable','dkds-prime-docked-right','dkds-prime-docked-bottom','dkds-prime-floating');
    delete node.dataset.dkdsPrimePlacement;
  }

  function restorePortablePrime(entry){
    if(!entry?.node)return;
    const {node,parent,next}=entry;
    resetPortablePrimeClasses(node);
    if(parent?.isConnected){
      if(next?.parentNode===parent)parent.insertBefore(node,next);
      else parent.appendChild(node);
    }
  }

  function restorePortablePrimesExcept(pluginId=''){
    for(const [key,entry] of [...primePortableState]){
      if(pluginId&&entry.pluginId===pluginId)continue;
      restorePortablePrime(entry);
      primePortableState.delete(key);
    }
    refreshPrimeDockSlots();
  }

  function placePrimeContribution(contribution={},placement){
    const next=String(placement||'').trim().toLowerCase();
    if(!contribution.portable)throw new Error(`PRIME ${contribution.pluginId||''}/${contribution.id||''} 必须提供 placement adapter，或声明 portable:true。`);
    const node=resolvePrimePortableTarget(contribution);
    if(!node)throw new Error(`找不到 PRIME UI：${contribution.target||contribution.id||''}`);
    const entry=rememberPortablePrime(contribution,node);
    const right=$('#primeRightDockSlot');
    const bottom=$('#primeBottomDockSlot');
    const appRoot=$('#app');
    if(!right||!bottom||!appRoot)return false;

    resetPortablePrimeClasses(node);
    node.classList.add('dkds-prime-portable');
    node.dataset.dkdsPrimePlacement=next;
    if(next==='right'){
      right.appendChild(node);
      node.classList.add('dkds-prime-docked-right');
    }else if(next==='bottom'){
      bottom.appendChild(node);
      node.classList.add('dkds-prime-docked-bottom');
    }else if(next==='float'){
      appRoot.appendChild(node);
      node.classList.add('dkds-prime-floating');
      if(node.querySelector?.('.drag-handle')&&!node.dataset.dkdsPrimeDragBound){
        makeFloating(node);
        node.dataset.dkdsPrimeDragBound='1';
      }
    }else{
      restorePortablePrime(entry);
      throw new Error(`不支持的 PRIME placement: ${next}`);
    }
    refreshPrimeDockSlots();
    return true;
  }

  function superWorkspaceRootPageId(contract={}){
    const layout=contract?.layout||{};
    const explicit=String(layout.rootPageId||layout.pageId||'').trim();
    if(explicit)return explicit;
    const left=String(layout.left?.pageId||'').trim();
    const main=String(layout.main?.pageId||'').trim();
    if(left&&main&&left!==main){
      console.warn('[DKDS SUPER] left/main pageId mismatch; using main page as root',{left,main,pluginId:contract?.pluginId||''});
      return main;
    }
    if(main||left)return main||left;
    // Native PluginWorkspace contracts identify their root by selector instead
    // of the legacy split-layout pageId. Resolve that selector back to its
    // owning analysis page so system navigation (Plugin Manager -> SUB/PRIME)
    // can restore the active SUPER before invoking the plugin command.
    const rootSelector=String(layout.root?.selector||layout.rootSelector||'').trim();
    if(rootSelector){
      try{
        const root=document.querySelector(rootSelector);
        const page=root?.closest?.('.analysis-page');
        if(page?.id)return page.id;
      }catch(err){console.warn('[DKDS SUPER] invalid native root selector',rootSelector,err);}
      const match=rootSelector.match(/^#([A-Za-z_][\w:.-]*)/);
      if(match?.[1]&&document.getElementById(match[1])?.classList?.contains('analysis-page'))return match[1];
    }
    return '';
  }

  function applySuperWorkspace(superState){
    const state=superState||window.DKDSPlugins?.workspace?.super?.()||{};
    restorePortablePrimesExcept(String(state.pluginId||''));
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
    });
    applySuperWorkspaceComposition(state.contract||{});
    applySuperLeftFraction(readSuperLeftFraction());
    requestAnimationFrame(syncSuperWorkspaceDivider);
  }

  function showNoSuperWorkspace(){
    restorePortablePrimesExcept('');
    clearSuperWorkspaceComposition();
    document.querySelectorAll('.analysis-page').forEach(page=>page.classList.toggle('hidden',page.id!=='superWorkspaceEmpty'));
    document.body.classList.add('super-unconfigured');
    syncAnalysisPageViewport();
    syncSuperWorkspaceDivider();
  }

  function bindSuperWorkspaceDivider(){
    if(superDividerBound)return;
    superDividerBound=true;
    const divider=$('#superWorkspaceDivider');
    if(!divider)return;
    const setFromClientX=(clientX,persist=false)=>{
      const width=Math.max(1,window.innerWidth||document.documentElement.clientWidth||1);
      applySuperLeftFraction(clientX/width,{persist});
    };
    divider.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      divider.setPointerCapture?.(event.pointerId);
      document.body.classList.add('super-divider-dragging');
      const move=e=>setFromClientX(e.clientX,false);
      const up=e=>{
        divider.releasePointerCapture?.(event.pointerId);
        document.removeEventListener('pointermove',move,true);
        document.removeEventListener('pointerup',up,true);
        document.body.classList.remove('super-divider-dragging');
        setFromClientX(e.clientX,true);
      };
      document.addEventListener('pointermove',move,true);
      document.addEventListener('pointerup',up,true);
      event.preventDefault();
    });
    divider.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;
      const bounds=currentSuperLayoutBounds();
      if(event.key==='Home')applySuperLeftFraction(bounds.preferred,{persist:true});
      else applySuperLeftFraction(superLeftFraction+(event.key==='ArrowRight'?.01:-.01),{persist:true});
      event.preventDefault();
    });
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
    syncSuperWorkspaceDivider();
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
      queueMicrotask(()=>window.DKDSPlugins?.activities?.set?.(superState.activityId));
    }
    syncSuperWorkspaceDivider();
    scheduleMainPlotRelayout();
    return true;
  }

  function showMainWorkspace(){
    document.querySelectorAll('.analysis-page').forEach(page=>page.classList.add('hidden'));
    scheduleMainPlotRelayout();
    renderAll();
    syncSuperWorkspaceDivider();
  }
