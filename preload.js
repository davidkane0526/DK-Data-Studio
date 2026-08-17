const { contextBridge, ipcRenderer } = require('electron');

function notifyAuxiliaryReadyWhenRendered() {
  const params = new URLSearchParams(globalThis.location?.search || '');
  if (!params.get('aux')) return;

  let sent = false;
  const sendReady = () => {
    if (sent) return;
    const body = document.body;
    const page = document.querySelector('.analysis-page:not(.hidden)');
    if (!body?.classList.contains('auxiliary-window') || !page) return;
    sent = true;
    requestAnimationFrame(() => requestAnimationFrame(() => ipcRenderer.send('windows:activityReady')));
  };

  window.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(sendReady);
    observer.observe(document.documentElement, { subtree:true, childList:true, attributes:true, attributeFilter:['class'] });
    sendReady();
    setTimeout(sendReady, 250);
    setTimeout(() => {
      sendReady();
      if (sent) observer.disconnect();
    }, 1500);
  }, { once:true });
}

notifyAuxiliaryReadyWhenRendered();

contextBridge.exposeInMainWorld('electronAPI', {
  openCsvFiles: () => ipcRenderer.invoke('files:openCsv'),
  openDataFiles: () => ipcRenderer.invoke('files:openData'),
  readDataText: payload => ipcRenderer.invoke('files:readDataText', payload),
  copyText: text => ipcRenderer.invoke('clipboard:writeText', text),
  saveText: payload => ipcRenderer.invoke('files:saveText', payload),
  saveBase64: payload => ipcRenderer.invoke('files:saveBase64', payload),
  saveProject: payload => ipcRenderer.invoke('files:saveProject', payload),
  openProject: () => ipcRenderer.invoke('files:openProject'),
  openActivityWindow: payload => ipcRenderer.invoke('windows:openActivity', payload),
  getActivityWindowBootstrap: () => ipcRenderer.invoke('windows:getActivityBootstrap'),
  closeCurrentWindow: () => ipcRenderer.invoke('windows:closeCurrent'),
  pushActivityProjectSnapshot: payload => ipcRenderer.send('windows:activityProjectSnapshot', payload),
  onActivityProjectSnapshot: callback => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('windows:activityProjectSnapshot', handler);
    return () => ipcRenderer.removeListener('windows:activityProjectSnapshot', handler);
  },
  onActivityBootstrapChanged: callback => {
    const handler = () => callback();
    ipcRenderer.on('windows:activityBootstrapChanged', handler);
    return () => ipcRenderer.removeListener('windows:activityBootstrapChanged', handler);
  },
  pluginExternalList: () => ipcRenderer.invoke('plugins:listExternal'),
  pluginInstallPackage: () => ipcRenderer.invoke('plugins:installPackage'),
  pluginRestorePackage: payload => ipcRenderer.invoke('plugins:restorePackage', payload),
  pluginUninstall: id => ipcRenderer.invoke('plugins:uninstall', id),
  pluginOpenFolder: () => ipcRenderer.invoke('plugins:openFolder'),
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