'use strict';
const {createTcpRuntime}=require('./tcp-runtime');
const {createLanKxciRelay}=require('./lan-kxci-relay');
function installInstrumentTcpIpc(ipcMain){
  const tcpRuntime=createTcpRuntime();
  const lanKxciRelay=createLanKxciRelay();
  ipcMain.handle('tcp:open',(_event,payload={})=>
    payload.networkMode==='via-mobile'?lanKxciRelay.open(payload):tcpRuntime.open(payload));
  ipcMain.handle('tcp:exchange',(_event,payload={})=>
    lanKxciRelay.isRelay(payload.sessionId)?lanKxciRelay.exchange(payload):tcpRuntime.exchange(payload));
  ipcMain.handle('tcp:close',(_event,payload={})=>
    lanKxciRelay.isRelay(payload.sessionId)?lanKxciRelay.close(payload):tcpRuntime.close(payload));
  return Object.freeze({closeAll:()=>{tcpRuntime.closeAll();lanKxciRelay.closeAll();}});
}
module.exports={installInstrumentTcpIpc};
