'use strict';
const fs=require('fs');
const path=require('path');

function createSdkExportRuntime({app,appRoot,dialog,nativeSaveRuntime,nativeDialogBroker}){
  function install(ipcMain){
    ipcMain.handle('sdk:exportBundle',async(event,payload={})=>{
      if(!nativeSaveRuntime.authorized(payload,'export')){
        nativeSaveRuntime.blockMissing({...payload,source:payload?.source||'core.plugin-manager.export-sdk'},'export');
        return null;
      }
      const contractPath=path.join(appRoot,'sdk','contract.json');
      const bundlePath=path.join(appRoot,'src','generated','dkds-sdk-export.zip');
      if(!fs.existsSync(contractPath)||!fs.existsSync(bundlePath))throw new Error('当前安装缺少可导出的 SDK 资源，请重新安装完整正式版。');
      const contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));
      const sdkVersion=String(contract.sdkVersion||'current').replace(/[^0-9A-Za-z._-]/g,'_');
      const defaultName=`DKDS-SDK-${sdkVersion}.zip`;
      const result=await nativeDialogBroker.run(event,{kind:'sdkExportBundle',source:payload?.source||'core.plugin-manager.export-sdk',defaultName},async parent=>{
        const options={title:'导出 DK Data Studio SDK',defaultPath:path.join(app.getPath('downloads'),defaultName),filters:[{name:'ZIP Archive',extensions:['zip']}]};
        return parent?dialog.showSaveDialog(parent,options):dialog.showSaveDialog(options);
      },{blockedValue:null});
      if(!result||result.canceled||!result.filePath)return null;
      fs.writeFileSync(result.filePath,fs.readFileSync(bundlePath));
      return {name:path.basename(result.filePath),path:result.filePath,sdkVersion:String(contract.sdkVersion||''),pluginApiVersion:String(contract.pluginApiVersion||'')};
    });
  }
  return Object.freeze({install});
}
module.exports={createSdkExportRuntime};
