const { contextBridge, ipcRenderer } = require('electron');
const {createNativeSaveIntentController,installNativeSaveIntentCapture,isConcreteNativePath}=require('./preload-modules/native-save-intent');
const {createNativeClipboardIntentController,installNativeClipboardIntentCapture}=require('./preload-modules/native-clipboard-intent');

const nativeSaveIntent=createNativeSaveIntentController({report:meta=>ipcRenderer.send('files:saveIntentBlocked',meta)});
installNativeSaveIntentCapture(nativeSaveIntent);
const nativeClipboardIntent=createNativeClipboardIntentController();
installNativeClipboardIntentCapture(nativeClipboardIntent);
const withSaveIntent=(kind,payload={})=>{
  const clean={...(payload||{})};delete clean.__dkdsNativeSaveIntent;
  const intent=nativeSaveIntent.consume(kind,{source:clean.source||''});
  return intent?{...clean,__dkdsNativeSaveIntent:intent}:null;
};

contextBridge.exposeInMainWorld('electronAPI', {
  openCsvFiles: () => ipcRenderer.invoke('files:openCsv'),
  openDataFiles: () => ipcRenderer.invoke('files:openData'),
  openDataDirectory: () => ipcRenderer.invoke('files:openDataDirectory'),
  listDataDirectory: payload => ipcRenderer.invoke('files:listDataDirectory', payload || {}),
  readDataText: payload => ipcRenderer.invoke('files:readDataText', payload),
  openDataRead: payload => ipcRenderer.invoke('files:openDataRead', payload || {}),
  readDataChunk: payload => ipcRenderer.invoke('files:readDataChunk', payload || {}),
  closeDataRead: payload => ipcRenderer.invoke('files:closeDataRead', payload || {}),
  readDataDocument: payload => ipcRenderer.invoke('files:readDataText', payload),
  smbDiscover: () => ipcRenderer.invoke('smb:discover'),
  smbListShares: connection => ipcRenderer.invoke('smb:listShares', connection || {}),
  smbList: payload => ipcRenderer.invoke('smb:list', payload || {}),
  smbRead: payload => ipcRenderer.invoke('smb:read', payload || {}),
  agentGetSecret: key => ipcRenderer.invoke('agent:getSecret', key),
  agentSetSecret: payload => ipcRenderer.invoke('agent:setSecret', payload || {}),
  agentHttpJson: payload => ipcRenderer.invoke('agent:httpJson', payload || {}),
  mcpGetStatus: () => ipcRenderer.invoke('mcp:getStatus'),
  mcpStart: payload => ipcRenderer.invoke('mcp:start', payload || {}),
  mcpStop: () => ipcRenderer.invoke('mcp:stop'),
  mcpRespond: payload => ipcRenderer.send('mcp:response', payload || {}),
  onMcpRequest: callback => {
    const handler = (_event, payload) => callback(payload || {});
    ipcRenderer.on('mcp:request', handler);
    return () => ipcRenderer.removeListener('mcp:request', handler);
  },
  copyText: text => { const intent=nativeClipboardIntent.consume({source:'renderer.copyText'}); return intent?ipcRenderer.invoke('clipboard:writeText',{text:String(text??''),__dkdsClipboardIntent:intent}):Promise.resolve(false); },
  saveText: payload => { const next=withSaveIntent('export',payload); return next?ipcRenderer.invoke('files:saveText',next):Promise.resolve(false); },
  saveBase64: payload => { const next=withSaveIntent('export',payload); return next?ipcRenderer.invoke('files:saveBase64',next):Promise.resolve(false); },
  saveProject: payload => {
    const clean={...(payload||{})};delete clean.__dkdsNativeSaveIntent;
    const direct=clean.mode!=='saveAs'&&isConcreteNativePath(clean.path);
    if(direct)return ipcRenderer.invoke('files:saveProject',clean);
    const next=withSaveIntent('project',clean);return next?ipcRenderer.invoke('files:saveProject',next):Promise.resolve(null);
  },
  getRuntimeStatus: () => ipcRenderer.invoke('system:getRuntimeStatus'),
  getDevToolsState: () => ipcRenderer.invoke('system:getDevToolsState'),
  toggleDevTools: () => ipcRenderer.invoke('system:toggleDevTools'),
  appearanceGetTheme: () => ipcRenderer.invoke('system:getAppearanceTheme'),
  appearanceSetTheme: theme => ipcRenderer.invoke('system:setAppearanceTheme', theme),
  onAppearanceThemeChanged: callback => {
    const handler = (_event, theme) => callback(theme);
    ipcRenderer.on('system:appearanceThemeChanged', handler);
    return () => ipcRenderer.removeListener('system:appearanceThemeChanged', handler);
  },
  diagnosticsGetEnvironment: () => ipcRenderer.invoke('diagnostics:getEnvironment'),
  diagnosticsRunActivitySmoke: payload => ipcRenderer.invoke('diagnostics:runActivitySmoke', payload || {}),
  diagnosticsWriteAutomationReport: report => ipcRenderer.invoke('diagnostics:writeAutomationReport', report || {}),
  diagnosticsOpenFolder: () => ipcRenderer.invoke('diagnostics:openFolder'),
  diagnosticsCompleteVisualClosure: payload => ipcRenderer.invoke('diagnostics:completeVisualClosure', payload || {}),
  openProject: () => ipcRenderer.invoke('files:openProject'),
  openActivityWindow: payload => ipcRenderer.invoke('windows:openActivity', payload),
  listPluginWindows: () => ipcRenderer.invoke('windows:listPluginWindows'),
  prewarmActivityWindow: payload => ipcRenderer.invoke('windows:prewarmActivity', payload),
  prepareSuperTransition: payload => ipcRenderer.invoke('windows:prepareSuperTransition', payload),
  getActivityWindowBootstrap: () => ipcRenderer.invoke('windows:getActivityBootstrap'),
  markActivityWindowReady: payload => ipcRenderer.send('windows:activityReady', payload || {}),
  markActivityWindowFailed: payload => ipcRenderer.send('windows:activityFailed', payload || {}),
  disposeProjectActivityWindows: projectTabId => ipcRenderer.invoke('windows:disposeProjectActivities', projectTabId),
  syncPluginActivityWindows: activityIds => ipcRenderer.invoke('windows:syncPluginActivities', activityIds),
  closeCurrentWindow: () => ipcRenderer.invoke('windows:closeCurrent'),
  releaseActivityWindow: payload => ipcRenderer.invoke('windows:releaseActivity', payload || {}),
  minimizeCurrentWindow: () => ipcRenderer.invoke('windows:minimizeCurrent'),
  toggleMaximizeCurrentWindow: () => ipcRenderer.invoke('windows:toggleMaximizeCurrent'),
  getCurrentWindowState: () => ipcRenderer.invoke('windows:getCurrentState'),
  onCurrentWindowMaximizedChanged: callback => {
    const handler = (_event, maximized) => callback(!!maximized);
    ipcRenderer.on('windows:maximizedChanged', handler);
    return () => ipcRenderer.removeListener('windows:maximizedChanged', handler);
  },
  pushActivityProjectSnapshot: payload => ipcRenderer.send('windows:activityProjectSnapshot', payload),
  pushActivityArtifactDelta: payload => ipcRenderer.send('windows:ownerArtifactDelta', payload || {}),
  requestOwnerProjectSave: payload => ipcRenderer.send('windows:requestProjectSave', payload || {}),
  requestOwnerImportWorkbench: payload => ipcRenderer.send('windows:requestImportWorkbench', payload || {}),
  onOwnerProjectSaveRequest: callback => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('windows:requestProjectSave', handler);
    return () => ipcRenderer.removeListener('windows:requestProjectSave', handler);
  },
  onOwnerImportWorkbenchRequest: callback => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('windows:requestImportWorkbench', handler);
    return () => ipcRenderer.removeListener('windows:requestImportWorkbench', handler);
  },
  onOwnerArtifactDelta: callback => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('windows:ownerArtifactDelta', handler);
    return () => ipcRenderer.removeListener('windows:ownerArtifactDelta', handler);
  },
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
  pluginSelectPackage: () => ipcRenderer.invoke('plugins:selectPackage'),
  pluginInstallPackage: token => ipcRenderer.invoke('plugins:installPackage', token),
  pluginValidateGeneratedPackage: pkg => ipcRenderer.invoke('plugins:validateGeneratedPackage', pkg || {}),
  pluginInstallGeneratedPackage: payload => ipcRenderer.invoke('plugins:installGeneratedPackage', payload || {}),
  pluginCancelInstall: token => ipcRenderer.invoke('plugins:cancelInstall', token),
  pluginRestorePackage: payload => ipcRenderer.invoke('plugins:restorePackage', payload),
  pluginAlgorithmCatalog: ref => ipcRenderer.invoke('plugins:algorithmCatalog', ref),
  pluginUninstall: id => ipcRenderer.invoke('plugins:uninstall', id),
  pluginExportPackage: id => { const payload=withSaveIntent('export',{id,source:'core.plugin-manager.export-package'}); return payload?ipcRenderer.invoke('plugins:exportPackage',payload):Promise.resolve(null); },
  pluginOpenFolder: () => ipcRenderer.invoke('plugins:openFolder'),
  pluginReadBuiltinScript: src => ipcRenderer.invoke('plugins:readBuiltinScript', String(src || '')),
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
