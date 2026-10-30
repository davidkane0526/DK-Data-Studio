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
  drainTimeoutMs=1800,
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

  const safeCall=async(label,fn,timeoutMs=drainTimeoutMs)=>{
    try{
      const work=Promise.resolve().then(()=>fn?.());
      if(!(Number(timeoutMs)>0))return await work;
      return await new Promise(resolve=>{
        let settled=false;
        const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
        const timer=setTimeout(()=>{
          logFailure(label,new Error(`Shutdown drain deadline exceeded after ${timeoutMs} ms.`));
          finish(undefined);
        },timeoutMs);
        timer.unref?.();
        work.then(finish,error=>{logFailure(label,error);finish(undefined);});
      });
    }catch(error){logFailure(label,error);return undefined;}
  };

  const run=async(reason='quit')=>{
    setAppQuitting(true);
    clearPendingRequests();

    // Start every application-owned drain immediately. No single resource is
    // allowed to indefinitely block the process lifetime; each owner gets the
    // same bounded shutdown contract.
    await Promise.all([
      safeCall('auxiliary-windows',drainAuxiliaryWindows),
      safeCall('project-safety',()=>prepareProjectSafety(reason)),
      safeCall('lan-updater',stopLanUpdater),
      safeCall('lan-web-server',stopLanWebServer),
      safeCall('mcp-server',stopMcpServer),
      safeCall('smb-runtime',shutdownSmbSessions)
    ]);

    // Catch a window that entered a close transition while the first drain was
    // running, but keep this final assertion shorter than the primary budget.
    await safeCall('auxiliary-windows-final',drainAuxiliaryWindows,Math.min(750,drainTimeoutMs));
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
