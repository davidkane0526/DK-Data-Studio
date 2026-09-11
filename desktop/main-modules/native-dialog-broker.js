'use strict';

function createNativeDialogBroker({BrowserWindow,logger=console}={}){
  const active=new Map();
  const stats={requested:0,shown:0,blocked:0,intentBlocked:0,rendererDownloadsBlocked:0,completed:0,cancelled:0,failed:0,peakActive:0,lastRequest:null,lastBlocked:null,lastIntentBlocked:null,lastRendererDownloadBlocked:null};
  const now=()=>Date.now();
  const text=value=>String(value??'').trim();

  function parentFor(event){
    try{
      const win=BrowserWindow?.fromWebContents?.(event?.sender);
      return win&&!win.isDestroyed?.()?win:null;
    }catch{return null;}
  }
  function keyFor(){
    // Native save dialogs are an application-level attention resource. A
    // second renderer/window must never create another modal while one is
    // already open; reject it rather than queueing a cascade behind the user.
    return 'application:save-dialog';
  }
  function snapshot(row={}){
    return Object.freeze({
      kind:text(row.kind||'save'),
      source:text(row.source||'unspecified'),
      defaultName:text(row.defaultName||''),
      senderId:Number(row.senderId)||0,
      windowId:Number(row.windowId)||0,
      requestedAt:Number(row.requestedAt)||0
    });
  }
  function diagnostics(){
    return Object.freeze({
      requested:stats.requested,shown:stats.shown,blocked:stats.blocked,intentBlocked:stats.intentBlocked,rendererDownloadsBlocked:stats.rendererDownloadsBlocked,completed:stats.completed,
      cancelled:stats.cancelled,failed:stats.failed,active:active.size,peakActive:stats.peakActive,
      lastRequest:stats.lastRequest,lastBlocked:stats.lastBlocked,lastIntentBlocked:stats.lastIntentBlocked,lastRendererDownloadBlocked:stats.lastRendererDownloadBlocked
    });
  }


  function recordIntentBlocked(meta={}){
    const row=Object.freeze({...meta,at:Number(meta.at)||now()});stats.intentBlocked+=1;stats.lastIntentBlocked=row;
    logger?.warn?.(`[DKDS native dialog] blocked request without explicit save intent from ${text(meta.source||'unspecified')}.`);return row;
  }
  function recordRendererDownloadBlocked(meta={}){
    const row=Object.freeze({...meta,at:Number(meta.at)||now()});stats.rendererDownloadsBlocked+=1;stats.lastRendererDownloadBlocked=row;
    logger?.warn?.(`[DKDS native download] blocked renderer download ${text(meta.filename||meta.url||'unknown')}; native exports must use Core I/O.`);return row;
  }

  async function run(event,meta={},task,{blockedValue=false}={}){
    if(typeof task!=='function')throw new TypeError('NativeDialogBroker task must be a function.');
    const parent=parentFor(event),key=keyFor(event,parent),row=snapshot({...meta,senderId:event?.sender?.id,windowId:parent?.id,requestedAt:now()});
    stats.requested+=1;stats.lastRequest=row;
    const current=active.get(key);
    if(current){
      stats.blocked+=1;stats.lastBlocked=Object.freeze({...row,blockedBy:current});
      logger?.warn?.(`[DKDS native dialog] blocked concurrent ${row.kind} request from ${row.source||'unspecified'}${row.defaultName?` (${row.defaultName})`:''}; active=${current.source||current.kind}.`);
      return blockedValue;
    }
    active.set(key,row);stats.shown+=1;stats.peakActive=Math.max(stats.peakActive,active.size);
    try{
      const result=await task(parent,row);
      stats.completed+=1;
      if(result===false||result===null||result?.canceled===true)stats.cancelled+=1;
      return result;
    }catch(error){
      stats.failed+=1;throw error;
    }finally{
      if(active.get(key)===row)active.delete(key);
    }
  }

  return Object.freeze({run,diagnostics,recordIntentBlocked,recordRendererDownloadBlocked});
}

module.exports=Object.freeze({createNativeDialogBroker});
