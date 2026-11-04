'use strict';
const path=require('path');
const {createPortableUpdater}=require('../native-update');
const {createUiHotUpdater}=require('../ui-hot-update');
function installOnlineUpdateIpc({ipcMain,app,getProjectFileSafety}){
  const userData=app.getPath('userData'),currentVersion=app.getVersion();
  const portable=createPortableUpdater({app,userData,scriptPath:path.join(__dirname,'../apply-portable-update.ps1'),currentVersion});
  const hot=createUiHotUpdater({userData,currentVersion});
  ipcMain.handle('onlineUpdate:status',()=>portable.status());
  ipcMain.handle('onlineUpdate:check',()=>portable.check());
  ipcMain.handle('onlineUpdate:install',async()=>{
    const info=portable.status();if(!['available','ready'].includes(info.status))return info;
    const safety=getProjectFileSafety();
    safety.prepareForQuit('explicit-online-update-install');
    const inside=safety.pathsInside(path.dirname(process.env.PORTABLE_EXECUTABLE_FILE||process.execPath));
    if(inside.length)throw Error('当前打开的工程位于更新目标目录中，请先另存到独立位置。');
    return portable.install();
  });
  ipcMain.handle('uiHot:status',()=>hot.state());
  ipcMain.handle('uiHot:check',()=>hot.check());
  ipcMain.handle('uiHot:css',()=>hot.css());
}
module.exports={installOnlineUpdateIpc};
