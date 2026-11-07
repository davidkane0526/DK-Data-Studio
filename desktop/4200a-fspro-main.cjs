'use strict';
// Isolated UI prototype runner: no TCP, KXCI, instrument output or auto-update.
const {app,BrowserWindow,ipcMain}=require('electron');
const {discoverRouted,openReadonlySession}=require('./4200a-routed-discovery.cjs');
let activeSession=null,sessionChain=Promise.resolve();
function exclusive(fn){
 const task=sessionChain.then(fn,fn);
 sessionChain=task.catch(()=>{});
 return task;
}
async function disconnectCurrent(){
 const old=activeSession;activeSession=null;
 if(old)await old.disconnect();
 return {connected:false};
}
const path=require('node:path');
app.setName('DK Test Studio 4200A Preview');
function create(){
  const win=new BrowserWindow({
    title:'DK Test Studio · 4200A — UI Preview',
    width:1240,height:880,minWidth:530,minHeight:520,
    backgroundColor:'#f5f7fa',
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,
      preload:path.resolve(__dirname,'4200a-fspro-preload.cjs')}
  });
  win.loadFile(path.resolve(__dirname,'../src/4200a-fspro/index.html'));
  win.on('closed',()=>{exclusive(disconnectCurrent).catch(()=>{});});
}
app.whenReady().then(()=>{
  ipcMain.handle('dkts:4200a:connect',(event,params={})=>exclusive(async()=>{
    if(!BrowserWindow.getAllWindows().some(win=>win.webContents===event.sender))
      throw new Error('Unauthorized KXCI caller');
    await disconnectCurrent();
    const {host,port,timeoutMs,networkMode,interfaceName,localAddress,expectedSerial}=params||{};
    const next=await openReadonlySession({host,port,timeoutMs,networkMode,interfaceName,localAddress,expectedSerial});
    activeSession=next;
    return {...next.summary,connected:next.isConnected()};
  }));
  ipcMain.handle('dkts:4200a:disconnect',(event)=>exclusive(async()=>{
    if(!BrowserWindow.getAllWindows().some(win=>win.webContents===event.sender))
      throw new Error('Unauthorized KXCI caller');
    return disconnectCurrent();
  }));
  ipcMain.handle('dkts:4200a:readonly-discover',(event,params={})=>{
    if(!BrowserWindow.getAllWindows().some(win=>win.webContents===event.sender))
      throw new Error('Unauthorized KXCI caller');
    const {host,port,timeoutMs,networkMode,interfaceName,localAddress,expectedSerial}=params||{};
    return discoverRouted({host,port,timeoutMs,networkMode,interfaceName,localAddress,expectedSerial});
  });
  create();
});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)create();});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
