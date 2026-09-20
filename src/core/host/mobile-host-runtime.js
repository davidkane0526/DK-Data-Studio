(() => {
  const CHANNEL='dkds.mobile-host.v1';
  const VERSION=3;
  const isNative=!!window.ReactNativeWebView?.postMessage;
  const previewParams=new URLSearchParams(location.search);
  const isPreview=!isNative&&previewParams.has('reactNative');
  const declaredHost=String(document.documentElement?.dataset?.dkdsHost||window.__DKDS_HOST_KIND__||((isNative||isPreview)?'mobile':'')).trim().toLowerCase();
  if(declaredHost!=='mobile'||(!isNative&&!isPreview)){
    // Mobile Host is inert outside the immutable Mobile host identity. The
    // optional clear only migrates stale state left by an older generation;
    // current Desktop runtime does not instantiate the Mobile Presenter.
    window.DKDSMobileWebPresentation?.clear?.();
    return;
  }

  let configured={};
  let publishTimer=null;
  let viewportSettleFrame=0,viewportSettleTimer=0;
  let previewAttempts=0;
  const routeStack=[];
  const openSurfaceState=new Map();
  const initializedSurfaceState=new Set();
  const processingIds=new Set();
  const completedIds=new Set();

  const text=value=>String(value??'');
  const captureNativeIntent=(kind,source)=>{
    const normalized=kind==='clipboard'?'clipboard':kind==='project'?'project':kind==='export'?'export':'';
    if(!normalized)return null;
    return window.DKDSNativeIntentBridge?.capture?.(normalized,{source:text(source||'mobile-native-shell'),control:'native-shell',reason:'native-shell-activation'})||null;
  };
  const actionNativeEffect=(activityId,id,itemId='')=>{
    const row=(window.DKDSUI?.actions?.list?.(activityId)||[]).find(item=>text(item?.id)===text(id));
    if(!row)return'';
    const item=itemId?(row.items||[]).find(candidate=>text(candidate?.id)===text(itemId)):null;
    const source=item||row;
    if(text(source?.nativeCopy)==='clipboard')return'clipboard';
    const save=text(source?.nativeSave);
    return save==='project'?'project':save==='export'?'export':'';
  };
  const post=message=>window.ReactNativeWebView?.postMessage?.(JSON.stringify({channel:CHANNEL,...message}));
  const presentation=()=>window.DKDSPresentation;
  const mobileAdapter=()=>window.DKDSInputAdapters?.mobile;
  const currentActivityId=()=>text(window.DKDSPlugins?.activities?.active?.());
  const currentRoute=()=>{
    if(routeStack.length)return routeStack.at(-1);
    const activityId=currentActivityId(),row=(window.DKDSPlugins?.activities?.list?.()||[]).find(item=>text(item?.id)===activityId);
    return {kind:text(row?.navigation)==='system'?'system':'workspace',activityId,pluginId:text(row?.pluginId)};
  };
  const reconcileOpenSurfaceState=core=>{
    for(const workspace of core?.workspaces||[]){
      const activity=text(workspace?.activityId);if(!activity)continue;
      const surfaces=workspace.surfaces||[],tracked=[...openSurfacesFor(activity)];
      // DATA_CONTROL is Mobile-owned: Desktop may keep it auto-open in the Web
      // workbench while Native intentionally starts with the parameter drawer
      // closed. Preserve only explicitly tracked Mobile data-control state.
      const mobileOwned=tracked.filter(id=>{const row=surfaces.find(surface=>text(surface.surfaceId||surface.id)===id);return text(row?.role)==='data-control';});
      // Every other PRIME uses the live PluginWorkspace mounted state as truth.
      // This removes stale native open-state after an in-panel close button and
      // makes the very next top-bar tap reopen the actual surface.
      const liveOpen=surfaces.filter(surface=>surface?.kind==='prime'&&surface?.active===true&&text(surface?.role)!=='data-control').map(surface=>text(surface.surfaceId||surface.id)).filter(Boolean);
      const next=[...new Set([...mobileOwned,...liveOpen])];
      if(next.length)openSurfaceState.set(activity,next);else openSurfaceState.delete(activity);
      initializedSurfaceState.add(activity);
    }
  };
  const coreSnapshot=()=>{const core=presentation()?.snapshot?.({route:currentRoute()})||null;reconcileOpenSurfaceState(core);return core;};
  const currentOrientation=()=>text(window.DKDSPlatform?.profile?.orientation)==='landscape'?'landscape':'portrait';
  const currentViewport=()=>{const visual=window.visualViewport,width=Number(visual?.width)||Number(window.innerWidth)||0,height=Number(visual?.height)||Number(window.innerHeight)||0;return Object.freeze({width:Math.max(0,Math.round(width)),height:Math.max(0,Math.round(height))});};
  const workspaceRows=()=>coreSnapshot()?.workspaces||[];
  const openSurfacesFor=activityId=>openSurfaceState.get(text(activityId))||[];
  const openSurfacesSnapshot=()=>Object.fromEntries([...openSurfaceState.entries()].filter(([,rows])=>rows.length).map(([activityId,rows])=>[activityId,[...rows]]));
  const setSurfaceOpen=(activityId,surfaceId,open)=>{
    const activity=text(activityId),id=text(surfaceId);if(!activity||!id)return false;
    const rows=[...openSurfacesFor(activity)],index=rows.indexOf(id);
    if(open&&index<0)rows.push(id);else if(!open&&index>=0)rows.splice(index,1);
    if(rows.length)openSurfaceState.set(activity,rows);else openSurfaceState.delete(activity);
    return open;
  };
  const closeConflictingPrimeSurfaces=(activityId,openingSurface)=>{
    const region=text(openingSurface?.presentation?.region);
    if(!['sheet','route'].includes(region))return;
    const workspace=snapshot().workspaces?.find(row=>row.activityId===text(activityId));
    for(const openId of [...openSurfacesFor(activityId)]){
      const row=workspace?.surfaces?.find(surface=>text(surface.surfaceId||surface.id)===openId);
      if(row&&['sheet','route'].includes(text(row.presentation?.region))){window.DKDSUI?.workspaces?.deactivate?.(activityId,openId);setSurfaceOpen(activityId,openId,false);}
    }
  };

  function canCloseLayer(){return !!mobileAdapter()?.canCloseTransient?.()||routeStack.length>1||openSurfacesFor(currentActivityId()).length>0;}
  function snapshot(){
    const api=presentation();
    if(!api?.present)throw new Error('Core Presentation Model unavailable.');
    const route=currentRoute();
    // Every shell publication must reconcile Native PRIME tracking against the
    // live PluginWorkspace state. Relying only on workspace-presentation events
    // leaves stale openSurfaceState whenever an in-panel close event is missed,
    // coalesced or arrives before the Native bridge is ready.
    if(typeof api.snapshot==='function')reconcileOpenSurfaceState(api.snapshot({route}));
    return api.present('mobile',{protocol:VERSION,route,canGoBack:canCloseLayer(),orientation:currentOrientation(),viewport:currentViewport(),openSurfaces:openSurfacesSnapshot()});
  }
  function publish(){
    clearTimeout(publishTimer);
    publishTimer=setTimeout(()=>{const state=snapshot();window.DKDSMobileWebPresentation?.apply?.(state);post({kind:'event',event:'state',payload:state});},0);
  }
  function publishSettledViewport(){
    // Android WebView may emit resize/orientation signals before the visual
    // viewport reaches its final dimensions. Publish immediately for feedback,
    // then republish after layout/visualViewport settlement so Presenter-owned
    // Surface constraints are recomputed from the final portrait/landscape box.
    publish();
    const raf=window.requestAnimationFrame||globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));
    const caf=window.cancelAnimationFrame||globalThis.cancelAnimationFrame||clearTimeout;
    if(viewportSettleFrame)try{caf(viewportSettleFrame);}catch{}
    viewportSettleFrame=raf(()=>{viewportSettleFrame=raf(()=>{viewportSettleFrame=0;publish();});});
    clearTimeout(viewportSettleTimer);viewportSettleTimer=setTimeout(()=>{viewportSettleTimer=0;publish();},120);
  }
  function closeLayer(){return !!mobileAdapter()?.closeTransient?.();}

  function reconcileWorkspacePresentation(event){
    const detail=event?.detail||{},activityId=text(detail.activity),kind=text(detail.kind),surfaceId=text(detail.surfaceId);
    if(!activityId||activityId!==currentActivityId()){publish();return;}
    const last=routeStack.at(-1);
    if(kind==='primary'){
      if(last?.activityId===activityId&&last?.surfaceId)routeStack.pop();
      const current=routeStack.at(-1);
      if(current?.activityId===activityId)routeStack[routeStack.length-1]={...current,kind:'workspace',surfaceId:undefined,role:undefined,region:undefined};
      else routeStack.push({kind:'workspace',activityId});
    }else if(kind==='prime'&&surfaceId){
      const actual=(window.DKDSUI?.workspaces?.actions?.(activityId)||[]).find(row=>text(row.surfaceId||row.id)===surfaceId||text(row.id)===surfaceId);
      if(actual)setSurfaceOpen(activityId,surfaceId,actual.active===true);
    }else if(kind==='sub'&&surfaceId){
      const route={kind:'sub',activityId,surfaceId};
      if(last?.activityId===activityId&&last?.surfaceId)routeStack[routeStack.length-1]=route;
      else if(last?.activityId===activityId)routeStack.push(route);
      else routeStack.push({kind:'workspace',activityId},route);
    }
    publish();
  }

  async function navigate(payload={}){
    const activityId=text(payload.activityId||payload.id);
    if(!activityId)throw new Error('Missing mobile workspace activityId.');
    const target=workspaceRows().find(row=>row.activityId===activityId);
    if(!target)throw new Error(`Mobile workspace unavailable: ${activityId}`);
    const previousActivityId=currentActivityId();
    if(!routeStack.length&&previousActivityId&&payload.skipHistorySeed!==true){
      const previousWorkspace=workspaceRows().find(row=>row.activityId===previousActivityId);
      routeStack.push({kind:previousWorkspace?.system?'system':'workspace',activityId:previousActivityId,pluginId:text(previousWorkspace?.pluginId)});
    }
    closeLayer();
    const ok=await window.DKDSPlugins?.activities?.activateEmbedded?.(activityId,{invoke:true});
    if(ok!==true)throw new Error(`Workspace activation failed: ${activityId}`);
    const route={kind:target.system?'system':'workspace',activityId,pluginId:text(target.pluginId)};
    if(payload.replace===true&&routeStack.length)routeStack[routeStack.length-1]=route;
    else if(routeStack.at(-1)?.activityId!==activityId)routeStack.push(route);
    else routeStack[routeStack.length-1]=route;
    // Activation already updates the semantic workspace and its own ResizeObservers.
    // A synthetic window resize caused a second full publication/layout cycle on
    // every Mobile navigation, which was visible as a whole-page rearrange.
    publish();return route;
  }

  async function back(){
    if(closeLayer()){publish();return {handled:true};}
    const current=routeStack.at(-1);
    if(current?.surfaceId){
      const primary=(window.DKDSUI?.workspaces?.actions?.(current.activityId)||[]).find(row=>text(row.id).startsWith('workspace-primary:'));
      if(primary)(window.DKDSUI?.workspaces?.activate?.(current.activityId,primary.id)||window.DKDSUI?.workspaces?.invoke?.(current.activityId,primary.id));
      routeStack.pop();publish();return {handled:true};
    }
    const activityId=currentActivityId(),open=openSurfacesFor(activityId);
    if(open.length){const surfaceId=open.at(-1);window.DKDSUI?.workspaces?.deactivate?.(activityId,surfaceId);setSurfaceOpen(activityId,surfaceId,false);publish();return {handled:true};}
    if(routeStack.length>1){
      const previous=routeStack[routeStack.length-2];routeStack.splice(-2);
      await navigate({...previous,replace:false,skipHistorySeed:true});return {handled:true};
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
    if(id==='project.save')captureNativeIntent('project','mobile.command.project.save');
    const value=await run(payload);publish();return value??true;
  }

  async function surface(payload={}){
    const activityId=text(payload.activityId||currentActivityId()),id=text(payload.id);
    if(!activityId||!id)throw new Error('Missing mobile workspace surface.');
    if(currentActivityId()!==activityId)await navigate({activityId});
    if(!routeStack.length)routeStack.push({kind:'workspace',activityId});
    const findSurface=()=>snapshot().workspaces?.find(row=>row.activityId===activityId)?.surfaces?.find(row=>text(row.surfaceId||row.id)===id||text(row.id)===id);
    const actionState=surfaceId=>{
      const rows=window.DKDSUI?.workspaces?.actions?.(activityId)||[];
      const match=rows.find(row=>text(row.surfaceId||row.id)===text(surfaceId)||text(row.id)===text(surfaceId));
      return match?match.active===true:null;
    };
    const tryWorkspaceCall=(method,surfaceId)=>{
      const fn=window.DKDSUI?.workspaces?.[method];
      if(typeof fn!=='function')return false;
      try{return fn(activityId,surfaceId)===true;}catch{return false;}
    };
    const before=findSurface();if(!before)throw new Error(`Workspace surface unavailable: ${activityId}/${id}`);
    const canonicalId=text(before.surfaceId||id);
    if(before.kind==='prime'){
      const trackedOpen=openSurfacesFor(activityId).includes(canonicalId),actualOpen=actionState(canonicalId);
      const mobileOwned=text(before.role)==='data-control';
      const open=mobileOwned?trackedOpen:(actualOpen===null?trackedOpen:actualOpen);
      if(!mobileOwned&&actualOpen!==null&&actualOpen!==trackedOpen)setSurfaceOpen(activityId,canonicalId,actualOpen);
      if(open){
        const ok=tryWorkspaceCall('deactivate',id)||tryWorkspaceCall('deactivate',canonicalId)||tryWorkspaceCall('invoke',id)||tryWorkspaceCall('invoke',canonicalId);
        if(!ok&&actionState(canonicalId)!==false)throw new Error(`Workspace surface deactivation failed: ${activityId}/${id}`);
        setSurfaceOpen(activityId,canonicalId,false);publish();
        const projected=findSurface()||before;
        return {activityId,surfaceId:canonicalId,role:text(projected.role),active:false,region:text(projected.presentation?.region)};
      }
      const ok=tryWorkspaceCall('activate',id)||tryWorkspaceCall('activate',canonicalId)||tryWorkspaceCall('invoke',id)||tryWorkspaceCall('invoke',canonicalId);
      if(!ok&&actionState(canonicalId)!==true)throw new Error(`Workspace surface activation failed: ${activityId}/${id}`);
      closeConflictingPrimeSurfaces(activityId,before);
      setSurfaceOpen(activityId,canonicalId,true);publish();
      const projected=findSurface()||before;
      return {activityId,surfaceId:canonicalId,role:text(projected.role),active:true,region:text(projected.presentation?.region)};
    }
    const ok=tryWorkspaceCall('activate',id)||tryWorkspaceCall('activate',canonicalId)||tryWorkspaceCall('invoke',id)||tryWorkspaceCall('invoke',canonicalId);
    if(!ok)throw new Error(`Workspace surface activation failed: ${activityId}/${id}`);
    const after=findSurface()||before;
    if(after.kind==='primary'){const last=routeStack.at(-1);if(last?.activityId===activityId&&last?.surfaceId)routeStack.pop();if(routeStack.at(-1)?.activityId!==activityId)routeStack.push({kind:'workspace',activityId});}
    else{
      const route={kind:'sub',activityId,surfaceId:canonicalId,role:text(after.role),region:text(after.presentation?.region)};
      if(routeStack.at(-1)?.activityId===activityId&&routeStack.at(-1)?.surfaceId)routeStack[routeStack.length-1]=route;else routeStack.push(route);
    }
    publish();
    const projected=findSurface()||after;
    return {activityId,surfaceId:canonicalId,role:text(projected.role),active:projected.active!==false,region:text(projected.presentation?.region)};
  }

  async function status(payload={}){
    const pluginId=text(payload.pluginId),id=text(payload.id);
    if(!pluginId||!id)throw new Error('Missing mobile status item.');
    const ok=window.DKDSPlugins?.statusBar?.invoke?.(pluginId,id,{anchorRect:payload.anchor||null,source:'presentation-status'});
    if(ok!==true)throw new Error(`Status item unavailable or passive: ${pluginId}/${id}`);
    publish();return {pluginId,id};
  }

  async function action(payload={}){
    const activityId=text(payload.activityId||currentActivityId()),id=text(payload.id),itemId=text(payload.itemId);
    if(!activityId||!id)throw new Error('Missing mobile workspace action.');
    const nativeEffect=actionNativeEffect(activityId,id,itemId);
    if(nativeEffect)captureNativeIntent(nativeEffect,`mobile.action.${activityId}.${id}${itemId?`.${itemId}`:''}`);
    const ok=window.DKDSUI?.actions?.invoke?.(activityId,id,itemId);
    if(!ok)throw new Error(`Workspace action unavailable: ${activityId}/${id}${itemId?`/${itemId}`:''}`);
    publish();return {activityId,id,itemId};
  }

  function keyboard(payload={}){
    const key=text(payload.key);if(!key)return false;
    const target=payload.target?.isConnected?payload.target:(document.activeElement||document.body);
    target?.dispatchEvent?.(new KeyboardEvent('keydown',{key,code:key,bubbles:true,cancelable:true}));
    target?.dispatchEvent?.(new KeyboardEvent('keyup',{key,code:key,bubbles:true,cancelable:true}));
    return true;
  }

  async function dispatchIntent(intent){
    const types=window.DKDSInteractionIntent?.types||{};
    if(intent?.type===types.NAVIGATE)return navigate(intent.payload);
    if(intent?.type===types.BACK)return back();
    if(intent?.type===types.COMMAND)return command(intent.payload);
    if(intent?.type===types.SURFACE)return surface(intent.payload);
    if(intent?.type===types.ACTION)return action(intent.payload);
    if(intent?.type===types.STATUS)return status(intent.payload);
    if(intent?.type===types.KEY)return keyboard(intent.payload);
    throw new Error(`Unsupported interaction intent: ${text(intent?.type)}`);
  }

  async function invoke(method,payload={}){
    if(method==='bootstrap'||method==='snapshot'){const state=snapshot();window.DKDSMobileWebPresentation?.apply?.(state);return state;}
    const intent=mobileAdapter()?.fromHostRequest?.(method,payload);
    if(!intent)throw new Error(`Unsupported mobile host method: ${method}`);
    return dispatchIntent(intent);
  }

  function activatePreviewRoute(){
    const activityId=isPreview?text(previewParams.get('mobileActivity')):'';
    if(!activityId||currentActivityId()===activityId)return;
    if(workspaceRows().some(row=>row.activityId===activityId)){
      navigate({activityId,replace:true}).catch(error=>console.warn('[DKDS mobile preview]',error));return;
    }
    if(previewAttempts++<40)setTimeout(activatePreviewRoute,100);
  }

  async function receive(event){
    let message;try{message=JSON.parse(text(event?.data));}catch{return;}
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

  window.addEventListener('message',receive);document.addEventListener('message',receive);
  const announceReady=()=>post({kind:'event',event:'ready',payload:{protocol:VERSION}});announceReady();
  window.DKDSMobileHost=Object.freeze({
    protocol:VERSION,
    configure(next={}){configured={...configured,...next};publish();},
    snapshot,publish,navigate,invoke,dispatchIntent
  });

  window.addEventListener('dkds:theme-changed',publish);
  window.addEventListener('dkds:project-changed',publish);
  window.addEventListener('dkds:history-changed',publish);
  window.addEventListener('dkds:status-changed',publish);
  window.addEventListener('dkds:workspace-presentation-changed',reconcileWorkspacePresentation);
  window.addEventListener('dkds:platform-change',publishSettledViewport);
  window.addEventListener('resize',publishSettledViewport,{passive:true});
  window.addEventListener('orientationchange',publishSettledViewport,{passive:true});
  window.visualViewport?.addEventListener?.('resize',publishSettledViewport,{passive:true});
  window.addEventListener('load',()=>{
    announceReady();
    const adapter=mobileAdapter();adapter?.setDispatcher?.(dispatchIntent);adapter?.setPublisher?.(publish);adapter?.installDocumentBindings?.({dispatch:dispatchIntent,publish});
    window.DKDSPlugins?.events?.on?.('activity:changed',publish);
    window.DKDSPlugins?.events?.on?.('plugin:manager-changed',publish);
    window.DKDSPlugins?.events?.on?.('status:changed',publish);
    window.DKDSPlugins?.events?.on?.('app:ready',()=>{activatePreviewRoute();publish();});
    activatePreviewRoute();publish();
  },{once:true});
})();
