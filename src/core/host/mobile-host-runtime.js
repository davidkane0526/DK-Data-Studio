(() => {
  const CHANNEL='dkds.mobile-host.v1';
  const VERSION=3;
  const isNative=!!window.ReactNativeWebView?.postMessage;
  const previewParams=new URLSearchParams(location.search);
  const isPreview=!isNative&&previewParams.has('reactNative');
  if(!isNative&&!isPreview)return;

  let configured={};
  let publishTimer=null;
  let previewAttempts=0;
  const routeStack=[];
  const processingIds=new Set();
  const completedIds=new Set();

  const text=value=>String(value??'');
  const post=message=>window.ReactNativeWebView?.postMessage?.(JSON.stringify({channel:CHANNEL,...message}));
  const presentation=()=>window.DKDSPresentation;
  const mobileAdapter=()=>window.DKDSInputAdapters?.mobile;
  const currentActivityId=()=>text(window.DKDSPlugins?.activities?.active?.());
  const currentRoute=()=>{
    if(routeStack.length)return routeStack.at(-1);
    const activityId=currentActivityId(),row=(window.DKDSPlugins?.activities?.list?.()||[]).find(item=>text(item?.id)===activityId);
    return {kind:text(row?.navigation)==='system'?'system':'workspace',activityId,pluginId:text(row?.pluginId)};
  };
  const coreSnapshot=()=>presentation()?.snapshot?.({route:currentRoute()})||null;
  const workspaceRows=()=>coreSnapshot()?.workspaces||[];

  function canCloseLayer(){return !!mobileAdapter()?.canCloseTransient?.()||routeStack.length>1;}
  function snapshot(){
    const api=presentation();
    if(!api?.present)throw new Error('Core Presentation Model unavailable.');
    return api.present('mobile',{protocol:VERSION,route:currentRoute(),canGoBack:canCloseLayer()});
  }
  function publish(){
    clearTimeout(publishTimer);
    publishTimer=setTimeout(()=>{const state=snapshot();window.DKDSMobileWebPresentation?.apply?.(state);post({kind:'event',event:'state',payload:state});},0);
  }
  function closeLayer(){return !!mobileAdapter()?.closeTransient?.();}

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
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
    publish();return route;
  }

  async function back(){
    if(closeLayer()){publish();return {handled:true};}
    const current=routeStack.at(-1);
    if(current?.surfaceId){
      if(current.kind==='prime')window.DKDSUI?.workspaces?.invoke?.(current.activityId,current.surfaceId);
      else{
        const primary=(window.DKDSUI?.workspaces?.actions?.(current.activityId)||[]).find(row=>text(row.id).startsWith('workspace-primary:'));
        if(primary)window.DKDSUI?.workspaces?.invoke?.(current.activityId,primary.id);
      }
      routeStack.pop();publish();return {handled:true};
    }
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
    const value=await run(payload);publish();return value??true;
  }

  async function panel(payload={}){
    const result=mobileAdapter()?.togglePanel?.(text(payload.name||'left'));
    if(!result)throw new Error('Mobile Gesture Adapter unavailable.');
    publish();return result;
  }

  async function surface(payload={}){
    const activityId=text(payload.activityId||currentActivityId()),id=text(payload.id);
    if(!activityId||!id)throw new Error('Missing mobile workspace surface.');
    if(currentActivityId()!==activityId)await navigate({activityId});
    if(!routeStack.length)routeStack.push({kind:'workspace',activityId});
    const findSurface=()=>snapshot().workspaces?.find(row=>row.activityId===activityId)?.surfaces?.find(row=>text(row.surfaceId||row.id)===id||text(row.id)===id);
    const before=findSurface();if(!before)throw new Error(`Workspace surface unavailable: ${activityId}/${id}`);
    const ok=window.DKDSUI?.workspaces?.invoke?.(activityId,id);if(!ok)throw new Error(`Workspace surface activation failed: ${activityId}/${id}`);
    const after=findSurface()||before,canonicalId=text(after.surfaceId||id),matchingIndex=routeStack.findIndex((row,index)=>index>0&&row.activityId===activityId&&row.surfaceId===canonicalId);
    if(after.kind==='prime'&&after.active===false){if(matchingIndex>=0)routeStack.splice(matchingIndex,1);}
    else if(after.kind==='primary'){while(routeStack.length>1&&routeStack.at(-1)?.activityId===activityId)routeStack.pop();}
    else{
      const route={kind:after.kind==='sub'?'sub':after.kind==='prime'?'prime':'workspace',activityId,surfaceId:canonicalId,role:text(after.role),region:text(after.presentation?.region)};
      if(matchingIndex>=0)routeStack[matchingIndex]=route;else if(routeStack.at(-1)?.activityId===activityId&&routeStack.at(-1)?.surfaceId)routeStack[routeStack.length-1]=route;else routeStack.push(route);
    }
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));publish();return {activityId,surfaceId:canonicalId,role:text(after.role),active:after.active!==false,region:text(after.presentation?.region)};
  }

  async function status(payload={}){
    const pluginId=text(payload.pluginId),id=text(payload.id);
    if(!pluginId||!id)throw new Error('Missing mobile status item.');
    const ok=window.DKDSPlugins?.statusBar?.invoke?.(pluginId,id);
    if(ok!==true)throw new Error(`Status item unavailable or passive: ${pluginId}/${id}`);
    publish();return {pluginId,id};
  }

  async function action(payload={}){
    const activityId=text(payload.activityId||currentActivityId()),id=text(payload.id),itemId=text(payload.itemId);
    if(!activityId||!id)throw new Error('Missing mobile workspace action.');
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
    if(intent?.type===types.PANEL)return panel(intent.payload);
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
  window.addEventListener('dkds:workspace-presentation-changed',publish);
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
