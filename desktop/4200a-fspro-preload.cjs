'use strict';
// Narrow native API: no raw KXCI command bridge or arbitrary socket access.
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('DK4200Native',Object.freeze({
 readonlyDiscover:options=>ipcRenderer.invoke('dkts:4200a:readonly-discover',options),
 connect:options=>ipcRenderer.invoke('dkts:4200a:connect',options),
 disconnect:()=>ipcRenderer.invoke('dkts:4200a:disconnect')
}));
