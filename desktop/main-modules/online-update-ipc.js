'use strict';
const path=require('path');
function installOnlineUpdateIpc({ipcMain,getUpdater,getProjectFileSafety}){
  ipcMain.handle('onlineUpdate:status',()=>getUpdater()?.status()||{status:'unsupported'});
  ipcMain.handle('onlineUpdate:check',()=>getUpdater()?.check()||{status:'unsupported'});
  ipcMain.handle('onlineUpdate:install',async()=>{
    const updater=getUpdater();const info=updater?.status();
    if(!info||!['available','ready'].includes(info.status))return info||{status:'unsupported'};
    const safety=getProjectFileSafety();
    safety.prepareForQuit('explicit-online-update-install');
    const inside=safety.pathsInside(path.dirname(process.env.PORTABLE_EXECUTABLE_FILE||process.execPath));
    if(inside.length)throw Error('当前打开的工程位于更新目标目录中，请先另存到独立位置。');
    return updater.install();
  });
}
module.exports={installOnlineUpdateIpc};
