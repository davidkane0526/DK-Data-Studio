(() => {
  const CHANNEL='dkds.mobile-host.v1';
  const VERSION=2;
  const isNative=!!window.ReactNativeWebView?.postMessage;
  const previewParams=new URLSearchParams(location.search);
  const isPreview=!isNative&&previewParams.has('reactNative');
  if(!isNative&&!isPreview)return;

  let configured={};
  let revision=0;
  let publishTimer=null;
  let previewAttempts=0;
  let lastCoreStatus='';
  const routeStack=[];
  const processingIds=new Set();
  const completedIds=new Set();

  const text=value=>String(value??'');
  const visible=node=>!!node&&!node.classList.contains('hidden')&&getComputedStyle(node).display!=='none';
  const activePage=()=>[...document.querySelectorAll('.analysis-page')].find(visible)||null;
  const post=message=>window.ReactNativeWebView?.postMessage?.(JSON.stringify({channel:CHANNEL,...message}));

  function projectRows(){
    return [...document.querySelectorAll('#projectTabs .project-tab')].map(node=>({
      id:text(node.dataset.tabId),
      title:text(node.querySelector('.project-tab-title')?.textContent).trim()||'未命名项目',
      active:node.classList.contains('active')
    })).filter(row=>row.id);
  }

  function contextHint(){
    const selectors=['#reswinSummary','#terSummary'];
    for(const selector of selectors){
      const node=document.querySelector(selector);
      const page=node?.closest?.('.analysis-page');
      if(node&&(!page||visible(page))){
        const value=text(node.textContent).replace(/\s+/g,' ').trim();
        if(value)return value;
      }
    }
    return '';
  }

  function currentStatus(){return contextHint()||lastCoreStatus||text(document.querySelector('#statusBarMessage')?.textContent).trim();}

  function statusRows(){
    return (window.DKDSPlugins?.statusBar?.list?.()||[]).map(row=>{
      const value=row?.value||{};return {pluginId:text(row?.pluginId),id:text(row?.id),side:text(value.side)==='left'?'left':'right',label:text(value.label),icon:text(value.icon),state:text(value.state),disabled:!!value.disabled,hidden:!!value.hidden,clickable:typeof value.onClick==='function',title:text(value.title)};
    }).filter(row=>row.pluginId&&row.id&&!row.hidden&&row.id!=='lan-web').map(({hidden,...row})=>row);
  }

  function syncContextStatus(){
    const node=document.querySelector('#statusBarMessage');
    const value=currentStatus();
    if(node&&value&&node.textContent!==value)node.textContent=value;
  }

  function contractFor(activity={}){
    return (window.DKDSPlugins?.workspace?.top?.()||[]).find(row=>
      text(row?.activity)===text(activity.id)||text(row?.pluginId)===text(activity.pluginId)
    )||null;
  }

  function surfaceRows(contract,kind){
    const rows=Array.isArray(contract?.layout?.[kind])?contract.layout[kind]:[];
    return rows.map(row=>({
      id:text(row?.id),
      label:text(row?.label||row?.title||row?.id),
      role:kind==='sub'?'sub':'prime'
    })).filter(row=>row.id);
  }

  function workspaceRows(){
    return (window.DKDSPlugins?.activities?.list?.()||[])
      .filter(row=>row?.id&&(contractFor(row)||text(row.navigation)==='system'))
      .map(row=>{
        const contract=contractFor(row);
        const system=text(row.navigation)==='system';
        return {
          id:text(row.id),activityId:text(row.id),pluginId:text(row.pluginId),
          label:text(row.label||row.name||row.id),icon:text(row.icon||contract?.icon),
          role:contract?'top':'system',system,isSuper:!!row.isSuper,
          primary:contract?{id:text(contract?.layout?.primary?.id||'main'),label:text(contract?.layout?.primary?.label||'主界面')}:{id:'main',label:text(row.label||row.name||'系统工具')},
          primes:contract?surfaceRows(contract,'prime'):[],subs:contract?surfaceRows(contract,'sub'):[]
        };
      });
  }

  function canCloseLayer(){
    if(document.body.classList.contains('dkds-mobile-panel-open'))return true;
    if([...document.querySelectorAll('.command-menu,.dkds-dialog-overlay,.dkds-settings-overlay,#importPanel')].some(visible))return true;
    return routeStack.length>1;
  }

  function snapshot(){
    const activityId=text(window.DKDSPlugins?.activities?.active?.());
    const workspaces=workspaceRows();
    const activity=workspaces.find(row=>row.activityId===activityId)||null;
    const page=activePage();
    const current=routeStack.at(-1)||{kind:'workspace',activityId,pageId:text(page?.id)};
    return {
      protocol:VERSION,revision:++revision,ready:!!document.querySelector('.project-tab.active'),
      projectTitle:document.querySelector('.project-tab.active .project-tab-title')?.textContent?.trim()||'DK Data Studio',
      projects:projectRows(),
      activityId,activityLabel:activity?.label||document.querySelector('#activityContextTitle')?.textContent?.trim()||'',
      status:currentStatus(),
      history:typeof configured.historySnapshot==='function'?configured.historySnapshot():{canUndo:false,canRedo:false,past:[],future:[]},
      theme:window.DKDSTheme?.current?.()||document.documentElement.dataset.dkdsTheme||'light',
      themeTokens:window.DKDSTheme?.tokens?.()||{},
      themeContractVersion:window.DKDSTheme?.contractVersion||window.DKDSTheme?.version||'',
      themeMaterial:window.DKDSTheme?.materials?.('native')||{base:{},roles:{}},
      route:{...current,pageId:text(page?.id||current.pageId)},workspaces,
      activities:workspaces,
      surfaces:(window.DKDSUI?.workspaces?.actions?.(activityId)||[]).map(row=>({id:text(row.id),label:text(row.label),active:!!row.active})),
      actions:(window.DKDSUI?.actions?.list?.(activityId)||[]).map(row=>({
        id:text(row.id),label:text(row.label),icon:text(row.icon),enabled:row.enabled!==false,active:!!row.active,menu:!!row.menu,
        items:(row.items||[]).map(item=>({id:text(item.id),label:text(item.label),icon:text(item.icon),enabled:item.enabled!==false}))
      })),
      statusItems:statusRows(),
      canGoBack:canCloseLayer()
    };
  }

  function publish(){
    clearTimeout(publishTimer);
    publishTimer=setTimeout(()=>{syncContextStatus();post({kind:'event',event:'state',payload:snapshot()});},0);
  }

  function closeLayer(){
    if(document.body.classList.contains('dkds-mobile-panel-open')){
      document.body.classList.remove('dkds-mobile-panel-open');
      delete document.body.dataset.mobilePanel;
      return true;
    }
    const overlay=[...document.querySelectorAll('.dkds-dialog-overlay,.dkds-settings-overlay,#importPanel')].find(visible);
    if(overlay){
      (document.activeElement||document).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
      return true;
    }
    const menus=[...document.querySelectorAll('.command-menu')].filter(visible);
    if(menus.length){menus.forEach(node=>node.classList.add('hidden'));return true;}
    return false;
  }

  async function navigate(payload={}){
    const activityId=text(payload.activityId||payload.id);
    if(!activityId)throw new Error('Missing mobile workspace activityId.');
    const target=workspaceRows().find(row=>row.activityId===activityId);
    if(!target)throw new Error(`Mobile workspace unavailable: ${activityId}`);
    const previousActivityId=text(window.DKDSPlugins?.activities?.active?.());
    if(!routeStack.length&&previousActivityId&&payload.skipHistorySeed!==true){
      const previousWorkspace=workspaceRows().find(row=>row.activityId===previousActivityId);
      routeStack.push({
        kind:previousWorkspace?.system?'system':'workspace',activityId:previousActivityId,
        pluginId:text(previousWorkspace?.pluginId),pageId:text(activePage()?.id)
      });
    }
    closeLayer();
    const ok=await window.DKDSPlugins.activities.activateEmbedded(activityId,{invoke:true});
    if(ok!==true)throw new Error(`Workspace activation failed: ${activityId}`);
    document.body.dataset.mobileActivity=activityId;
    const page=activePage();
    const route={kind:target.system?'system':'workspace',activityId,pluginId:target.pluginId,pageId:text(page?.id)};
    if(payload.replace===true&&routeStack.length)routeStack[routeStack.length-1]=route;
    else if(routeStack.at(-1)?.activityId!==activityId)routeStack.push(route);
    else routeStack[routeStack.length-1]=route;
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
    publish();
    return route;
  }

  async function back(){
    if(closeLayer()){publish();return {handled:true};}
    const current=routeStack.at(-1);
    if(current?.surfaceId){
      if(current.kind==='prime')window.DKDSUI?.workspaces?.invoke?.(current.activityId,current.surfaceId);
      else{
        const primary=(window.DKDSUI?.workspaces?.actions?.(current.activityId)||[]).find(row=>text(row.id).startsWith('workspace-primary:'));
        if(primary)window.DKDSUI.workspaces.invoke(current.activityId,primary.id);
      }
      routeStack.pop();publish();return {handled:true};
    }
    if(routeStack.length>1){
      const previous=routeStack[routeStack.length-2];
      routeStack.splice(-2);
      await navigate({...previous,replace:false,skipHistorySeed:true});
      return {handled:true};
    }
    return {handled:false};
  }

  async function command(payload={}){
    const id=text(payload.id);
    const commands={
      import:configured.importFiles,
      'file.open':configured.openAnyFiles||configured.importFiles,
      'file.folder':configured.openAnyDirectory,
      'project.open':configured.openProject,
      'project.save':configured.saveProject,
      'project.new':configured.newProject,
      'project.switch':()=>configured.switchProject?.(text(payload.projectId)),
      'project.close':()=>configured.closeProject?.(text(payload.projectId)),
      'project.undo':configured.undo,
      'project.redo':configured.redo,
      'system.plugins':configured.openPluginManager,
      'theme.toggle':()=>window.DKDSTheme?.toggle?.(),
      lifecycle:()=>window.dispatchEvent(new CustomEvent('dkds:native-lifecycle',{detail:{state:text(payload.state||'unknown')}}))
    };
    let run=commands[id];
    if(typeof run!=='function'&&id.startsWith('connectivity.'))run=()=>window.DKDSPlugins?.commands?.run?.(id,payload);
    if(typeof run!=='function')throw new Error(`Unsupported mobile command: ${id}`);
    const value=await run(payload);
    publish();
    return value??true;
  }

  async function panel(payload={}){
    const name=text(payload.name||'left');
    if(!['left','actions'].includes(name))throw new Error(`Unsupported mobile panel: ${name}`);
    const willOpen=document.body.dataset.mobilePanel!==name||!document.body.classList.contains('dkds-mobile-panel-open');
    document.body.classList.toggle('dkds-mobile-panel-open',willOpen);
    if(willOpen)document.body.dataset.mobilePanel=name;else delete document.body.dataset.mobilePanel;
    publish();
    return {open:willOpen,name};
  }

  async function surface(payload={}){
    const activityId=text(payload.activityId||window.DKDSPlugins?.activities?.active?.());
    const id=text(payload.id);
    if(!activityId||!id)throw new Error('Missing mobile workspace surface.');
    if(text(window.DKDSPlugins?.activities?.active?.())!==activityId)await navigate({activityId});
    if(!routeStack.length)routeStack.push({kind:'workspace',activityId,pageId:text(activePage()?.id)});
    const ok=window.DKDSUI?.workspaces?.invoke?.(activityId,id);
    if(!ok)throw new Error(`Workspace surface unavailable: ${activityId}/${id}`);
    routeStack.push({kind:id.includes('workspace-sub:')?'sub':id.includes('workspace-prime:')?'prime':'workspace',activityId,surfaceId:id,pageId:text(activePage()?.id)});
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
    publish();
    return {activityId,surfaceId:id};
  }

  async function status(payload={}){
    const pluginId=text(payload.pluginId),id=text(payload.id);if(!pluginId||!id)throw new Error('Missing mobile status item.');
    const ok=window.DKDSPlugins?.statusBar?.invoke?.(pluginId,id);if(ok!==true)throw new Error(`Status item unavailable or passive: ${pluginId}/${id}`);
    publish();return {pluginId,id};
  }

  async function action(payload={}){
    const activityId=text(payload.activityId||window.DKDSPlugins?.activities?.active?.());
    const id=text(payload.id),itemId=text(payload.itemId);
    if(!activityId||!id)throw new Error('Missing mobile workspace action.');
    const ok=window.DKDSUI?.actions?.invoke?.(activityId,id,itemId);
    if(!ok)throw new Error(`Workspace action unavailable: ${activityId}/${id}${itemId?`/${itemId}`:''}`);
    publish();return {activityId,id,itemId};
  }

  async function invoke(method,payload){
    if(method==='bootstrap'||method==='snapshot')return snapshot();
    if(method==='navigate')return navigate(payload);
    if(method==='back')return back();
    if(method==='command')return command(payload);
    if(method==='panel')return panel(payload);
    if(method==='surface')return surface(payload);
    if(method==='action')return action(payload);
    if(method==='status')return status(payload);
    throw new Error(`Unsupported mobile host method: ${method}`);
  }

  function activatePreviewRoute(){
    const activityId=isPreview?text(previewParams.get('mobileActivity')):'';
    if(!activityId||text(window.DKDSPlugins?.activities?.active?.())===activityId)return;
    if(workspaceRows().some(row=>row.activityId===activityId)){
      navigate({activityId,replace:true}).catch(error=>console.warn('[DKDS mobile preview]',error));
      return;
    }
    if(previewAttempts++<40)setTimeout(activatePreviewRoute,100);
  }

  async function receive(event){
    let message;
    try{message=JSON.parse(text(event?.data));}catch{return;}
    if(message?.channel!==CHANNEL)return;
    if(message?.kind==='event'&&message?.event==='lifecycle'){
      const state=text(message?.payload?.state||'unknown');
      window.dispatchEvent(new CustomEvent('dkds:native-lifecycle',{detail:{state}}));
      if(state==='active'){post({kind:'event',event:'ready',payload:{protocol:VERSION,resumed:true}});publish();}
      return;
    }
    if(message?.kind!=='request'||!message.id||processingIds.has(message.id)||completedIds.has(message.id))return;
    processingIds.add(message.id);
    try{post({kind:'response',id:message.id,ok:true,value:await invoke(text(message.method),message.payload||{})});}
    catch(error){post({kind:'response',id:message.id,ok:false,error:text(error?.message||error)});}
    finally{processingIds.delete(message.id);completedIds.add(message.id);setTimeout(()=>completedIds.delete(message.id),5000);}
  }

  function bindMobilePanelInteractions(){
    const storageKey='dkds.mobile.left-panel-width.v1';
    const restore=()=>{const saved=Number(localStorage.getItem(storageKey));if(Number.isFinite(saved)&&saved>=220)document.documentElement.style.setProperty('--dkds-mobile-left-width',`${saved}px`);};
    const ensureHandle=()=>{
      const panel=document.querySelector('.dkds-analysis-left');
      if(!panel)return false;
      if(panel.querySelector('.dkds-mobile-panel-edge'))return true;
      const handle=document.createElement('div');handle.className='dkds-mobile-panel-edge';handle.setAttribute('role','separator');handle.setAttribute('aria-label','拖动调整数据与参数面板宽度');panel.appendChild(handle);
      let drag=null;
      handle.addEventListener('pointerdown',event=>{drag={pointerId:event.pointerId};handle.setPointerCapture?.(event.pointerId);event.preventDefault();});
      handle.addEventListener('pointermove',event=>{if(!drag||drag.pointerId!==event.pointerId)return;const width=Math.max(240,Math.min(window.innerWidth*.92,event.clientX));document.documentElement.style.setProperty('--dkds-mobile-left-width',`${Math.round(width)}px`);event.preventDefault();});
      const finish=event=>{if(!drag||drag.pointerId!==event.pointerId)return;drag=null;const width=Math.round(panel.getBoundingClientRect().width);try{localStorage.setItem(storageKey,String(width));}catch{}window.dispatchEvent(new Event('resize'));};
      handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
      return true;
    };
    restore();
    const observer=new MutationObserver(()=>{if(ensureHandle())observer.disconnect();});
    if(!ensureHandle())observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('pointerdown',event=>{
      if(!document.body.classList.contains('dkds-mobile-panel-open')||document.body.dataset.mobilePanel!=='left')return;
      if(event.target?.closest?.('.dkds-analysis-left'))return;
      document.body.classList.remove('dkds-mobile-panel-open');delete document.body.dataset.mobilePanel;publish();
    },true);
  }

  function bindHeldSwipeKeys(){
    let gesture=null;
    const down=event=>{if(!['touch','pen'].includes(text(event.pointerType))||event.isPrimary===false)return;if(event.target?.closest?.('.dkds-portable-header,.drag-handle,.dkds-portable-resize-handle,[role=scrollbar],.dkds-table-column-resizer'))return;gesture={id:event.pointerId,x:event.clientX,y:event.clientY,at:performance.now(),target:event.target,fired:false};};
    const move=event=>{
      if(!gesture||gesture.id!==event.pointerId||gesture.fired||performance.now()-gesture.at<320)return;
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      let key='';if(dy<-44&&Math.abs(dy)>Math.abs(dx)*1.15)key='ArrowUp';else if(dx<-44&&Math.abs(dx)>Math.abs(dy)*1.15)key='ArrowLeft';
      if(!key)return;gesture.fired=true;
      const target=gesture.target?.isConnected?gesture.target:(document.activeElement||document.body);
      target.dispatchEvent(new KeyboardEvent('keydown',{key,code:key,bubbles:true,cancelable:true}));
      target.dispatchEvent(new KeyboardEvent('keyup',{key,code:key,bubbles:true,cancelable:true}));
      if(event.cancelable)event.preventDefault();
    };
    const up=event=>{if(gesture?.id===event.pointerId)gesture=null;};
    document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',move,{capture:true,passive:false});document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',up,true);
  }

  window.addEventListener('message',receive);
  document.addEventListener('message',receive);
  const announceReady=()=>post({kind:'event',event:'ready',payload:{protocol:VERSION}});
  announceReady();
  window.DKDSMobileHost=Object.freeze({
    protocol:VERSION,
    configure(next={}){configured={...configured,...next};publish();},
    snapshot,publish,navigate,invoke
  });

  window.addEventListener('dkds:theme-changed',publish);
  window.addEventListener('dkds:project-changed',publish);
  window.addEventListener('dkds:history-changed',publish);
  window.addEventListener('dkds:status-changed',event=>{lastCoreStatus=text(event?.detail?.message).trim();publish();});
  window.addEventListener('load',()=>{
    announceReady();
    lastCoreStatus=text(document.querySelector('#statusBarMessage')?.textContent).trim();
    bindMobilePanelInteractions();
    bindHeldSwipeKeys();
    const summaryObserver=new MutationObserver(mutations=>{
      const relevant=mutations.some(mutation=>{
        const parent=mutation.target?.nodeType===1?mutation.target:mutation.target?.parentElement;
        if(parent?.closest?.('#reswinSummary,#terSummary'))return true;
        return [...(mutation.addedNodes||[])].some(node=>node?.nodeType===1&&(node.matches?.('#reswinSummary,#terSummary')||node.querySelector?.('#reswinSummary,#terSummary')));
      });
      if(relevant)publish();
    });
    summaryObserver.observe(document.body,{subtree:true,childList:true,characterData:true});
    window.DKDSPlugins?.events?.on?.('activity:changed',publish);
    window.DKDSPlugins?.events?.on?.('plugin:manager-changed',publish);
    window.DKDSPlugins?.events?.on?.('status:changed',publish);
    window.DKDSPlugins?.events?.on?.('app:ready',()=>{
      activatePreviewRoute();
      publish();
    });
    activatePreviewRoute();
    publish();
  },{once:true});
})();
