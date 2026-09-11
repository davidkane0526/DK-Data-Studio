(() => {
  'use strict';
  function install({
    electronAPI=window.electronAPI,
    isProjectHydrated=()=>false,
    reconcileOwnerArtifacts=()=>{},
    projectTabId=()=>'',
    applyOwnerArtifactDelta=()=>{},
    pushSnapshot=()=>{},
    buildSnapshotPayload=()=>null,
    onRoleSnapshot=()=>{},
    isReady=()=>false
  }={}){
    if(!electronAPI)return false;
    const reconcileOnFocus=()=>{if(isProjectHydrated())void reconcileOwnerArtifacts({reason:'window-focus'});};
    window.addEventListener('focus',reconcileOnFocus,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reconcileOnFocus();},{passive:true});
    electronAPI.onOwnerArtifactDelta?.(payload=>{
      if(String(payload?.projectTabId||'')!==String(projectTabId()||''))return;
      applyOwnerArtifactDelta(payload);
    });
    electronAPI.onActivityWillHide?.(()=>{
      pushSnapshot(true);
      void Promise.resolve(window.DKDSUI?.lifecycle?.('hidden',{reason:'top-window-hide',purgeManaged:false})).catch(err=>console.warn('[DKDS TOP suspend]',err)).finally(()=>{
        window.DKDSPerformance?.lifecycle?.('hidden',{retainRatio:0.25,dropWeak:true,reason:'top-window-hide'});
      });
    });
    electronAPI.onActivityRoleSnapshotRequest?.(request=>{
      const requestId=String(request?.requestId||'');if(!requestId)return;
      let snapshot=null;
      try{snapshot=buildSnapshotPayload(true);onRoleSnapshot();}catch(err){console.warn('[DKDS TOP role snapshot]',err);}
      electronAPI.respondActivityRoleSnapshot?.({requestId,snapshot});
    });
    electronAPI.onActivityWillShow?.(()=>{
      void Promise.resolve(window.DKDSUI?.lifecycle?.('visible',{reason:'top-window-show'})).catch(err=>console.warn('[DKDS TOP resume]',err)).finally(()=>{
        requestAnimationFrame(()=>{
          window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'window-show'});
          requestAnimationFrame(()=>window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'window-show-settled'}));
        });
      });
    });
    window.addEventListener('resize',()=>{if(isReady())window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'window'});});
    window.addEventListener('beforeunload',()=>{pushSnapshot(true);window.DKDSPerformance?.clear?.();});
    return true;
  }
  window.DKDSPluginWindowLifecycle=Object.freeze({install});
})();
