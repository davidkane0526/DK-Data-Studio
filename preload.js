const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openCsvFiles: () => ipcRenderer.invoke('files:openCsv'),
  openDataFiles: () => ipcRenderer.invoke('files:openData'),
  readDataText: payload => ipcRenderer.invoke('files:readDataText', payload),
  copyText: text => ipcRenderer.invoke('clipboard:writeText', text),
  saveText: payload => ipcRenderer.invoke('files:saveText', payload),
  saveBase64: payload => ipcRenderer.invoke('files:saveBase64', payload),
  saveProject: payload => ipcRenderer.invoke('files:saveProject', payload),
  openProject: () => ipcRenderer.invoke('files:openProject'),
  updateGetStatus: () => ipcRenderer.invoke('update:getStatus'),
  updateGetSettings: () => ipcRenderer.invoke('update:getSettings'),
  updateSetSettings: settings => ipcRenderer.invoke('update:setSettings', settings),
  updateCheckNow: () => ipcRenderer.invoke('update:checkNow'),
  updateDownloadNow: () => ipcRenderer.invoke('update:downloadNow'),
  updateInstallNow: () => ipcRenderer.invoke('update:installNow'),
  onUpdateStatus: callback => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('update:status', handler);
    return () => ipcRenderer.removeListener('update:status', handler);
  },
  lanWebGetStatus: () => ipcRenderer.invoke('lanweb:getStatus'),
  lanWebMakeQr: payload => ipcRenderer.invoke('lanweb:makeQr', payload),
  lanWebGetSettings: () => ipcRenderer.invoke('lanweb:getSettings'),
  lanWebSetSettings: settings => ipcRenderer.invoke('lanweb:setSettings', settings),
  lanWebStart: () => ipcRenderer.invoke('lanweb:start'),
  lanWebStop: () => ipcRenderer.invoke('lanweb:stop'),
  lanWebRegenerateKey: () => ipcRenderer.invoke('lanweb:regenerateKey'),
  onLanWebStatus: callback => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('lanweb:status', handler);
    return () => ipcRenderer.removeListener('lanweb:status', handler);
  }
});
