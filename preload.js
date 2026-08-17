const { contextBridge, ipcRenderer, webFrame } = require('electron');

function prepareAuxiliaryShell() {
  const params = new URLSearchParams(globalThis.location?.search || '');
  const activityId = params.get('aux');
  if (!activityId) return;

  const labels = {
    'data-center':'数据中心',
    ter:'TER 分析',
    pulse:'脉冲分析'
  };
  const label = labels[activityId] || activityId;

  // Paint a lightweight, activity-specific first frame before the heavy plugin
  // architecture is mounted. The normal workspace is never exposed, but the
  // BrowserWindow can be shown immediately instead of waiting 1-2 seconds for
  // the complete analysis page to become ready.
  try {
    webFrame.insertCSS(`
      html, body { background:#f5f7fb !important; }
      body:not(.auxiliary-window) { margin:0 !important; overflow:hidden !important; min-height:100vh !important; }
      body:not(.auxiliary-window) > * { visibility:hidden !important; }
      body:not(.auxiliary-window)::before {
        visibility:visible !important;
        content:attr(data-dkds-aux-label);
        position:fixed;
        inset:0;
        display:grid;
        place-items:center;
        box-sizing:border-box;
        padding-bottom:30px;
        background:#f5f7fb;
        color:#344054;
        font:600 16px/1.4 "Segoe UI", "Microsoft YaHei", system-ui, sans-serif;
        letter-spacing:.01em;
      }
      body:not(.auxiliary-window)::after {
        visibility:visible !important;
        content:"";
        position:fixed;
        left:50%;
        top:calc(50% + 24px);
        width:120px;
        height:3px;
        transform:translateX(-50%);
        border-radius:999px;
        background:linear-gradient(90deg, transparent, rgba(49,94,251,.72), transparent);
        animation:dkdsAuxBoot 1s ease-in-out infinite;
      }
      body.auxiliary-window { animation:dkdsAuxReveal .12s ease-out both; }
      @keyframes dkdsAuxBoot { 0%,100% { opacity:.28; transform:translateX(-50%) scaleX(.55); } 50% { opacity:1; transform:translateX(-50%) scaleX(1); } }
      @keyframes dkdsAuxReveal { from { opacity:.88; } to { opacity:1; } }
      @media (prefers-color-scheme: dark) {
        html, body { background:#111827 !important; }
        body:not(.auxiliary-window)::before { background:#111827; color:#e5e7eb; }
      }
    `);
  } catch {}

  const labelBody = () => {
    if (document.body) document.body.dataset.dkdsAuxLabel = `DK Data Studio · ${label}`;
  };
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', labelBody, { once:true });
  } else {
    labelBody();
  }

  // "activityReady" now means that the stable startup shell can be shown.
  // The renderer will replace that shell automatically when app.js adds the
  // auxiliary-window class after the real activity has mounted.
  ipcRenderer.send('windows:activityReady');
}

prepareAuxiliaryShell();

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
