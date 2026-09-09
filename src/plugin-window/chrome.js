(() => {
  'use strict';
  const $=selector=>document.querySelector(selector);
  let lastPage=null,controlsBound=false,ipcReady=false,lastMaximized=false,menu=null,runtimeEventsBound=false;

  const zones={
    plugin:()=>$('#pluginWindowPluginActions'),
    utility:()=>$('#pluginWindowCoreUtilityActions'),
    nav:()=>$('#pluginWindowWorkspaceNav')
  };
  const nonEmpty=el=>!!el&&[...el.children].some(child=>!child.classList?.contains('hidden'));
  const rectOf=el=>{if(!el?.getBoundingClientRect)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const activeActivity=()=>String(window.DKDSPlugins?.activities?.active?.()||'');
  const text=value=>String(value??'').trim();

  function syncDivider(){
    const divider=$('#pluginWindowActionDivider'),headingDivider=$('#pluginWindowHeadingDivider');
    const pluginHas=nonEmpty(zones.plugin()),coreHas=nonEmpty(zones.utility())||nonEmpty(zones.nav());
    if(divider)divider.classList.toggle('hidden',!(pluginHas&&coreHas));
    if(headingDivider)headingDivider.classList.toggle('hidden',!(pluginHas||coreHas));
  }

  function setPersistent(title=''){
    const value=String(title||'').trim();
    const el=$('#statusBarPersistent'),sep=$('#statusBarPersistentSeparator');
    if(el)el.textContent=value?`项目：${value}`:'';
    if(sep)sep.classList.toggle('hidden',!value);
  }

  function renderMaximized(maximized){
    lastMaximized=!!maximized;
    const btn=$('#pluginWindowMaximizeBtn');
    if(!btn)return;
    btn.textContent=lastMaximized?'❐':'□';
    btn.setAttribute('aria-label',lastMaximized?'还原窗口':'最大化窗口');
  }

  function makeButton({id='',label='',icon='',active=false,variant='',enabled=true,menuButton=false,kind='plugin',onClick=null,nativeSave='',nativeCopy=''}){
    const button=document.createElement('button');
    button.type='button';
    button.className='toolbar-btn plugin-toolbar-btn dkds-plugin-window-title-action';
    button.dataset.dkdsComponentIdentity='toolbarAction';
    button.dataset.dkdsComponentIdentityOwner='core-component';
    const semanticVariant=String(variant||'').trim()||(active?'active':'quiet');
    button.dataset.dkdsComponentVariant=semanticVariant;
    button.dataset.dkdsComponentVariantOwner='core-component';
    button.dataset.dkdsWindowActionKind=kind;
    if(id)button.dataset.actionId=String(id);
    if(nativeSave)button.dataset.dkdsNativeSave=String(nativeSave);
    if(nativeCopy)button.dataset.dkdsNativeCopy=String(nativeCopy);
    button.disabled=enabled===false;
    if(active){button.classList.add('active');button.setAttribute('aria-pressed','true');}
    const safeLabel=text(label||id),safeIcon=text(icon);
    if(safeIcon){const iconNode=document.createElement('span');iconNode.className='dkds-action-icon';iconNode.setAttribute('aria-hidden','true');iconNode.textContent=safeIcon;button.appendChild(iconNode);}
    const labelNode=document.createElement('span');labelNode.className='dkds-action-label';labelNode.textContent=safeLabel;button.appendChild(labelNode);
    if(menuButton){const caret=document.createElement('span');caret.className='dkds-action-caret';caret.setAttribute('aria-hidden','true');caret.textContent='▾';button.appendChild(caret);}
    button.setAttribute('aria-label',safeLabel||String(id||'操作'));
    if(typeof onClick==='function')button.addEventListener('click',onClick);
    return button;
  }

  function queueSync(page=lastPage){
    queueMicrotask(()=>requestAnimationFrame(()=>sync(page)));
  }

  function renderPluginActions(activityId){
    const zone=zones.plugin();if(!zone)return [];
    zone.replaceChildren();
    const rows=window.DKDSUI?.actions?.list?.(activityId)||[];
    for(const row of rows){
      const button=makeButton({
        id:row.id,label:row.label,icon:row.icon,active:!!row.active,variant:row.variant,enabled:row.enabled!==false,menuButton:!!row.menu,kind:'plugin',nativeSave:row.nativeSave,nativeCopy:row.nativeCopy,
        onClick:event=>{
          event.stopPropagation();
          if(row.menu){
            menu?.dispose?.();menu=null;
            const items=(Array.isArray(row.items)?row.items:[]).map(item=>({
              id:item.id,label:item.label,icon:item.icon,enabled:item.enabled!==false,nativeSave:item.nativeSave,nativeCopy:item.nativeCopy,
              onInvoke:()=>{window.DKDSUI?.actions?.invoke?.(activityId,row.id,item.id);queueSync();}
            }));
            if(items.length&&window.DKDSUI?.ContextMenu){
              const rect=button.getBoundingClientRect();
              menu=new window.DKDSUI.ContextMenu('core.plugin-window.titlebar');
              menu.open({x:rect.left,y:rect.bottom+4,items,context:{activityId,source:'dedicated-titlebar'}});
            }
            return;
          }
          window.DKDSUI?.actions?.invoke?.(activityId,row.id);
          queueSync();
        }
      });
      zone.appendChild(button);
    }
    return rows;
  }

  function renderImportAction(page){
    const zone=zones.utility();if(!zone)return {expected:false,rendered:false};
    zone.replaceChildren();
    const source=page?.querySelector?.('[data-dkds-slot="workbench-import"] button,[data-dkds-core-action="workbench-import"]')||null;
    if(!source)return {expected:false,rendered:false};
    const button=makeButton({
      id:'core-import-data',label:text(source.textContent)||'导入数据',enabled:!source.disabled,kind:'core-import',nativeSave:source.dataset?.dkdsNativeSave||'',nativeCopy:source.dataset?.dkdsNativeCopy||'',
      onClick:event=>{event.stopPropagation();source.click();queueSync(page);}
    });
    zone.appendChild(button);
    return {expected:true,rendered:true};
  }

  function renderWorkspaceActions(activityId){
    const zone=zones.nav();if(!zone)return [];
    zone.replaceChildren();
    const rows=(window.DKDSUI?.workspaces?.actions?.(activityId)||[]).filter(row=>String(row.kind||'')!=='primary');
    for(const row of rows){
      const button=makeButton({
        id:row.id,label:row.label,active:!!row.active,enabled:true,kind:`core-${row.kind||'surface'}`,
        onClick:event=>{event.stopPropagation();window.DKDSUI?.workspaces?.invoke?.(activityId,row.id||row.surfaceId);queueSync();}
      });
      button.dataset.dkdsPresentationSurface='1';
      button.dataset.dkdsPresentationSurfaceId=String(row.surfaceId||row.id||'');
      zone.appendChild(button);
    }
    return rows;
  }

  function preparePage(page){
    if(!page||!page.isConnected)return false;
    lastPage=page;
    const pageHeader=page.querySelector('.analysis-page-header,.resonance-window-header');
    for(const close of page.querySelectorAll('.analysis-page-close'))close.classList.add('plugin-window-page-close-suppressed');
    if(pageHeader)pageHeader.classList.add('plugin-window-page-header-hosted');
    return true;
  }

  function visiblePage(){
    return [...document.querySelectorAll('.analysis-page')].find(page=>!page.classList.contains('hidden')&&getComputedStyle(page).display!=='none')||lastPage;
  }

  function sync(page=null){
    const target=page||visiblePage();
    if(!preparePage(target)){syncDivider();return false;}
    const activityId=activeActivity()||String(target.dataset?.pluginActivity||'');
    renderPluginActions(activityId);
    renderImportAction(target);
    renderWorkspaceActions(activityId);
    syncDivider();
    document.body.dataset.dkdsTitlebarPresentation='ready';
    return true;
  }

  function connectRuntimeEvents(){
    if(runtimeEventsBound)return true;
    runtimeEventsBound=true;
    window.addEventListener?.('dkds:workspace-presentation-changed',()=>queueSync());
    const events=window.DKDSPlugins?.events;
    events?.on?.('activity:changed',()=>queueSync());
    events?.on?.('analysis:opened',()=>queueSync());
    events?.on?.('analysis:refresh',()=>queueSync());
    return true;
  }

  async function invokeControl(name,fn){
    try{return await fn();}
    catch(err){
      console.error(`[DKDS plugin-window chrome:${name}]`,err);
      const status=$('#statusBarMessage');if(status)status.textContent=`窗口控制失败：${err?.message||err}`;
      return null;
    }
  }

  async function bindWindowControls(){
    const api=window.electronAPI;
    const required=['minimizeCurrentWindow','toggleMaximizeCurrentWindow','closeCurrentWindow','getCurrentWindowState'];
    if(!api||required.some(name=>typeof api[name]!=='function'))throw new Error('独立插件窗口缺少 Core 窗口控制 IPC。');
    const min=$('#pluginWindowMinimizeBtn'),max=$('#pluginWindowMaximizeBtn'),close=$('#pluginWindowCloseBtn'),bar=$('#pluginWindowTitlebar');
    if(!min||!max||!close||!bar)throw new Error('独立插件窗口自绘标题栏 DOM 不完整。');
    const stop=event=>event.stopPropagation();
    for(const button of [min,max,close]){
      button.addEventListener('pointerdown',stop);
      button.addEventListener('dblclick',stop);
    }
    min.addEventListener('click',event=>{event.stopPropagation();void invokeControl('minimize',()=>api.minimizeCurrentWindow());});
    max.addEventListener('click',event=>{event.stopPropagation();void invokeControl('maximize',async()=>{const state=await api.toggleMaximizeCurrentWindow();renderMaximized(state?.maximized);return state;});});
    close.addEventListener('click',event=>{event.stopPropagation();void invokeControl('close',()=>api.closeCurrentWindow());});
    bar.addEventListener('dblclick',event=>{
      if(event.target.closest?.('button,input,select,textarea,a,[role="button"],.plugin-window-action-zone'))return;
      void invokeControl('titlebar-double-click',async()=>{const state=await api.toggleMaximizeCurrentWindow();renderMaximized(state?.maximized);return state;});
    });
    const state=await api.getCurrentWindowState();
    renderMaximized(state?.maximized);
    api.onCurrentWindowMaximizedChanged?.(renderMaximized);
    controlsBound=true;ipcReady=true;
    document.body.dataset.dkdsWindowControls='ready';
    return true;
  }

  const controlsReady=bindWindowControls().catch(err=>{
    console.error('[DKDS plugin-window chrome]',err);
    document.body.dataset.dkdsWindowControls='error';
    throw err;
  });

  function configure(bootstrap={}){
    const spec=bootstrap.pluginWindow||bootstrap;
    const title=spec.title||bootstrap.activityId||'插件',version=spec.version||'',projectTitle=bootstrap.title||bootstrap.project?.projectName||'';
    document.title=`DK Data Studio · ${title}`;
    const t=$('#pluginWindowTitle'),v=$('#pluginWindowVersion');
    if(t)t.textContent=String(title);
    if(v){const value=String(version).trim();v.textContent=value?`v${value}`:'';v.classList.toggle('hidden',!value);}
    setPersistent(projectTitle);
    return true;
  }

  function snapshot(){
    const page=visiblePage(),titlebar=rectOf($('#pluginWindowTitlebar')),actionsRect=rectOf($('#pluginWindowActions')),commandbar=rectOf($('#pluginWindowCommandbar'));
    const body=page?.querySelector?.('.analysis-page-body')||null,root=page?.querySelector?.('.dkds-plugin-workbench-root,.dkds-analysis-workbench-host')||null;
    const activityId=activeActivity()||String(page?.dataset?.pluginActivity||'');
    const expectedPlugin=window.DKDSUI?.actions?.list?.(activityId)||[];
    const expectedSurfaces=(window.DKDSUI?.workspaces?.actions?.(activityId)||[]).filter(row=>String(row.kind||'')!=='primary');
    const importExpected=!!page?.querySelector?.('[data-dkds-slot="workbench-import"] button,[data-dkds-core-action="workbench-import"]');
    const renderedPlugin=[...zones.plugin()?.querySelectorAll?.('[data-action-id]')||[]].map(node=>text(node.textContent));
    const renderedSurfaces=[...zones.nav()?.querySelectorAll?.('[data-dkds-presentation-surface]')||[]].map(node=>text(node.textContent));
    return {
      controlsBound,ipcReady,maximized:lastMaximized,
      viewport:{width:window.innerWidth,height:window.innerHeight},titlebar,actionsRect,commandbar,
      actionToCommandGap:actionsRect&&commandbar?Math.max(0,commandbar.x-actionsRect.right):null,
      commandbarRightGap:commandbar?Math.max(0,window.innerWidth-commandbar.right):null,
      activePageId:String(page?.id||''),pageRect:rectOf(page),pageBodyRect:rectOf(body),workbenchRootRect:rectOf(root),
      titlebarPresentation:{
        activityId,
        expectedPluginCount:expectedPlugin.length,renderedPluginCount:renderedPlugin.length,
        expectedSurfaceCount:expectedSurfaces.length,renderedSurfaceCount:renderedSurfaces.length,
        importExpected,importRendered:!!zones.utility()?.querySelector?.('button'),
        expectedPluginLabels:expectedPlugin.map(row=>text(row.label)),renderedPluginLabels:renderedPlugin,
        expectedSurfaceLabels:expectedSurfaces.map(row=>text(row.label)),renderedSurfaceLabels:renderedSurfaces
      }
    };
  }

  window.DKDSPluginWindowChrome=Object.freeze({configure,setPersistent,sync,connectRuntimeEvents,ready:()=>controlsReady,snapshot});
})();
