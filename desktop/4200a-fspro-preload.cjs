'use strict';
// Narrow native API: no raw KXCI command bridge or arbitrary socket access.
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('DK4200Native',Object.freeze({
 readonlyDiscover:options=>ipcRenderer.invoke('dkts:4200a:readonly-discover',options),
 connect:options=>ipcRenderer.invoke('dkts:4200a:connect',options),
 disconnect:()=>ipcRenderer.invoke('dkts:4200a:disconnect')
}));

const WINDOW_OPS=new Set(['minimize','toggleMaximize','isMaximized','close']);
contextBridge.exposeInMainWorld('DKTSWindow',Object.freeze({
 control:operation=>WINDOW_OPS.has(operation)
  ?ipcRenderer.invoke('dkts:4200a:window',operation)
  :Promise.reject(new Error('Unsupported window control')),
 onMaximize:callback=>{
  if(typeof callback!=='function')return;
  ipcRenderer.on('dkts:4200a:maximized',(_event,value)=>callback(Boolean(value)));
 }
}));
