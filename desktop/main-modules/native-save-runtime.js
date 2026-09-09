'use strict';

function createNativeSaveRuntime({session,nativeDialogBroker}={}){
  if(!nativeDialogBroker)throw new Error('NativeSaveRuntime requires NativeDialogBroker.');
  let rendererDownloadGuardInstalled=false,intentTraceInstalled=false;
  const authorized=(payload,kind)=>{
    const row=payload?.__dkdsNativeSaveIntent;
    return !!(row&&row.authorized===true&&String(row.kind||'')===String(kind||''));
  };
  const blockMissing=(payload,kind)=>nativeDialogBroker.recordIntentBlocked({
    kind:String(kind||''),source:String(payload?.source||'unspecified'),reason:'missing-explicit-save-intent'
  });
  const installRendererDownloadGuard=()=>{
    if(rendererDownloadGuardInstalled)return false;
    const target=session?.defaultSession;
    if(!target?.on)return false;
    rendererDownloadGuardInstalled=true;
    target.on('will-download',(event,item,webContents)=>{
      const filename=String(item?.getFilename?.()||''),url=String(item?.getURL?.()||'');
      event.preventDefault();
      nativeDialogBroker.recordRendererDownloadBlocked({filename,url,senderId:Number(webContents?.id)||0});
    });
    return true;
  };
  const installIntentTrace=ipcMain=>{
    if(intentTraceInstalled||!ipcMain?.on)return false;
    intentTraceInstalled=true;
    ipcMain.on('files:saveIntentBlocked',(_event,meta={})=>nativeDialogBroker.recordIntentBlocked(meta));
    return true;
  };
  return Object.freeze({authorized,blockMissing,installRendererDownloadGuard,installIntentTrace});
}

module.exports=Object.freeze({createNativeSaveRuntime});
