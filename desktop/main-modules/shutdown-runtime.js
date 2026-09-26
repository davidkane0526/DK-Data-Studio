'use strict';

function createShutdownRuntime({
  app,
  setAppQuitting=()=>{},
  drainAuxiliaryWindows=()=>{},
  prepareProjectSafety=()=>{},
  stopLanUpdater=()=>{},
  stopLanWebServer=()=>{},
  stopMcpServer=()=>{},
  shutdownSmbSessions=()=>{},
  pendingRequestMaps=[],
  logger=console
}={}){
  let shutdownPromise=null;
  let readyForQuit=false;

  const logFailure=(label,error)=>{
    try{logger?.error?.(`[DKDS shutdown:${label}]`,error);}catch{}
  };

  const clearPendingRequests=()=>{
    for(const map of pendingRequestMaps){
      if(!map||typeof map.entries!=='function')continue;
      for(const [id,row] of [...map.entries()]){
        try{clearTimeout(row?.timer);}catch{}
        try{row?.reject?.(new Error('Application is shutting down.'));}catch{}
        try{map.delete(id);}catch{}
      }
    }
  };

  const safeCall=async(label,fn)=>{
    try{return await Promise.resolve(fn?.());}
    catch(error){logFailure(label,error);return undefined;}
  };

  const run=async(reason='quit')=>{
    setAppQuitting(true);
    clearPendingRequests();
    await safeCall('auxiliary-windows',drainAuxiliaryWindows);
    await safeCall('project-safety',()=>prepareProjectSafety(reason));

    // Stop sources that can schedule more network work before waiting for
    // socket/server ownership to drain.
    await safeCall('lan-updater',stopLanUpdater);

    await Promise.all([
      safeCall('lan-web-server',stopLanWebServer),
      safeCall('mcp-server',stopMcpServer),
      safeCall('smb-runtime',shutdownSmbSessions)
    ]);

    // A reusable auxiliary window may have been in the middle of a close/hide
    // transition when shutdown began. Re-assert the application-owned final
    // state after background services have drained.
    await safeCall('auxiliary-windows-final',drainAuxiliaryWindows);
    readyForQuit=true;
  };

  const requestQuit=(reason='quit')=>{
    if(!shutdownPromise){
      shutdownPromise=run(reason)
        .catch(error=>logFailure('coordinator',error))
        .finally(()=>{
          readyForQuit=true;
          queueMicrotask(()=>{
            if(typeof app?.exit==='function')app.exit(0);
            else app?.quit?.();
          });
        });
    }
    return shutdownPromise;
  };

  const beforeQuit=event=>{
    if(readyForQuit)return;
    event?.preventDefault?.();
    requestQuit('before-quit');
  };

  return Object.freeze({
    requestQuit,
    beforeQuit,
    isReadyForQuit:()=>readyForQuit,
    isShuttingDown:()=>!!shutdownPromise
  });
}

module.exports={createShutdownRuntime};
