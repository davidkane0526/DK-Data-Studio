const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openCsvFiles: () => ipcRenderer.invoke('files:openCsv'),
  openDataFiles: () => ipcRenderer.invoke('files:openData'),
  readDataText: payload => ipcRenderer.invoke('files:readDataText', payload),
  copyText: text => ipcRenderer.invoke('clipboard:writeText', text),
  saveText: payload => ipcRenderer.invoke('files:saveText', payload),
  saveBase64: payload => ipcRenderer.invoke('files:saveBase64', payload),
  saveProject: payload => ipcRenderer.invoke('files:saveProject', payload),
  getRuntimeStatus: () => ipcRenderer.invoke('system:getRuntimeStatus'),
  diagnosticsGetEnvironment: () => ipcRenderer.invoke('diagnostics:getEnvironment'),
  diagnosticsRunActivitySmoke: payload => ipcRenderer.invoke('diagnostics:runActivitySmoke', payload || {}),
  diagnosticsWriteAutomationReport: report => ipcRenderer.invoke('diagnostics:writeAutomationReport', report || {}),
  diagnosticsOpenFolder: () => ipcRenderer.invoke('diagnostics:openFolder'),
  openProject: () => ipcRenderer.invoke('files:openProject'),
  openActivityWindow: payload => ipcRenderer.invoke('windows:openActivity', payload),
  listPluginWindows: () => ipcRenderer.invoke('windows:listPluginWindows'),
  prewarmActivityWindow: payload => ipcRenderer.invoke('windows:prewarmActivity', payload),
  prepareSuperTransition: payload => ipcRenderer.invoke('windows:prepareSuperTransition', payload),
  getActivityWindowBootstrap: () => ipcRenderer.invoke('windows:getActivityBootstrap'),
  markActivityWindowReady: () => ipcRenderer.send('windows:activityReady'),
  markActivityWindowFailed: payload => ipcRenderer.send('windows:activityFailed', payload || {}),
  disposeProjectActivityWindows: projectTabId => ipcRenderer.invoke('windows:disposeProjectActivities', projectTabId),
  syncPluginActivityWindows: activityIds => ipcRenderer.invoke('windows:syncPluginActivities', activityIds),
  closeCurrentWindow: () => ipcRenderer.invoke('windows:closeCurrent'),
  pushActivityProjectSnapshot: payload => ipcRenderer.send('windows:activityProjectSnapshot', payload),
  onActivityProjectSnapshot: callback => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('windows:activityProjectSnapshot', handler);
    return () => ipcRenderer.removeListener('windows:activityProjectSnapshot', handler);
  },
  onActivityWindowFailed: callback => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('windows:activityFailed', handler);
    return () => ipcRenderer.removeListener('windows:activityFailed', handler);
  },
  onActivityBootstrapChanged: callback => {
    const handler = () => callback();
    ipcRenderer.on('windows:activityBootstrapChanged', handler);
    return () => ipcRenderer.removeListener('windows:activityBootstrapChanged', handler);
  },
  onActivityRoleSnapshotRequest: callback => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on('windows:activityRoleSnapshotRequest', handler);
    return () => ipcRenderer.removeListener('windows:activityRoleSnapshotRequest', handler);
  },
  respondActivityRoleSnapshot: payload => ipcRenderer.send('windows:activityRoleSnapshotResponse', payload || {}),

  onActivityWillHide: callback => {
    const handler = () => callback();
    ipcRenderer.on('windows:activityWillHide', handler);
    return () => ipcRenderer.removeListener('windows:activityWillHide', handler);
  },
  onActivityWillShow: callback => {
    const handler = () => callback();
    ipcRenderer.on('windows:activityWillShow', handler);
    return () => ipcRenderer.removeListener('windows:activityWillShow', handler);
  },
  publishCapabilitySnapshot: payload => ipcRenderer.invoke('capabilities:publishSnapshot', payload),
  invokeOwnerCapability: payload => ipcRenderer.invoke('capabilities:invokeOwner', payload),
  onCapabilityInvokeRequest: callback => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('capabilities:invokeRequest', handler);
    return () => ipcRenderer.removeListener('capabilities:invokeRequest', handler);
  },
  respondCapabilityInvoke: payload => ipcRenderer.send('capabilities:invokeResponse', payload),
  pluginExternalList: () => ipcRenderer.invoke('plugins:listExternal'),
  pluginOverrideList: () => ipcRenderer.invoke('plugins:listOverrides'),
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
  onPluginLanUpdate: callback => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('plugins:lanUpdate', handler);
    return () => ipcRenderer.removeListener('plugins:lanUpdate', handler);
  },
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
