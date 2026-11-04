'use strict';
const {createTcpRuntime}=require('./tcp-runtime');
function installTcpIpc(ipcMain){
  const tcpRuntime=createTcpRuntime();
  ipcMain.handle('tcp:open',(_event,payload={})=>tcpRuntime.open(payload));
  ipcMain.handle('tcp:exchange',(_event,payload={})=>tcpRuntime.exchange(payload));
  ipcMain.handle('tcp:close',(_event,payload={})=>tcpRuntime.close(payload));
  return Object.freeze({closeAll:()=>tcpRuntime.closeAll()});
}
module.exports={installTcpIpc};
