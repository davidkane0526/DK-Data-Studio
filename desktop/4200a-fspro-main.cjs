'use strict';
// Branded, frameless preview: native TCP is strictly read-only; no SMU/PMU output.
const {app,BrowserWindow,ipcMain}=require('electron');
if(process.platform==='win32')app.setAppUserModelId('studio.dk.test');
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
app.setName('DK Test Studio');
function create(){
  const win=new BrowserWindow({
    title:'DK Test Studio',
    icon:path.resolve(__dirname,'../build/icon.ico'),
    frame:false,autoHideMenuBar:true,resizable:true,
    width:1240,height:880,minWidth:530,minHeight:520,
    backgroundColor:'#f5f7fa',
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,
      preload:path.resolve(__dirname,'4200a-fspro-preload.cjs')}
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  const entry=path.resolve(__dirname,'../src/4200a-fspro/index.html');
  win.webContents.on('will-navigate',(event,url)=>{
    if(url!=='file://'+entry.replaceAll('\\','/'))event.preventDefault();
  });
  win.on('maximize',()=>{if(!win.isDestroyed())win.webContents.send('dkts:4200a:maximized',true);});
  win.on('unmaximize',()=>{if(!win.isDestroyed())win.webContents.send('dkts:4200a:maximized',false);});
  win.loadFile(entry);
  win.on('closed',()=>{exclusive(disconnectCurrent).catch(()=>{});});
}
app.whenReady().then(()=>{
  ipcMain.handle('dkts:4200a:window',(event,op)=>{
    const win=BrowserWindow.fromWebContents(event.sender);
    if(!win||win.isDestroyed()||event.senderFrame!==win.webContents.mainFrame||
       !win.webContents.getURL().endsWith('/src/4200a-fspro/index.html'))
      return false;
    switch(op){
      case 'minimize':win.minimize();return true;
      case 'toggleMaximize':
        if(win.isMaximized())win.unmaximize();else win.maximize();
        return win.isMaximized();
      case 'isMaximized':return win.isMaximized();
      case 'close':win.close();return true;
      default:return false;
    }
  });
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
