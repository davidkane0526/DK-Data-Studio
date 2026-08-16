const fs = require('fs');
const path = require('path');
const dgram = require('dgram');
const { EventEmitter } = require('events');
const WebSocket = require('ws');
const { NsisUpdater } = require('electron-updater');

function normalizeBaseUrl(value) {
  if (!value) return '';
  try {
    const u = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    u.hash = '';
    u.search = '';
    u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function semverParts(value) {
  const main = String(value || '0.0.0').split('-')[0];
  return main.split('.').map(v => Number.parseInt(v, 10) || 0);
}

function compareVersions(a, b) {
  const aa = semverParts(a), bb = semverParts(b);
  const n = Math.max(aa.length, bb.length, 3);
  for (let i = 0; i < n; i++) {
    const d = (aa[i] || 0) - (bb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}


async function fetchBuffer(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'User-Agent': 'Graphene-Resonance-Studio-LAN-Updater/1' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, timeoutMs = 8000) {
  const buf = await fetchBuffer(url, timeoutMs);
  return JSON.parse(buf.toString('utf8'));
}

function wsUrlFor(baseUrl, wsPath = '/push') {
  const u = new URL(baseUrl);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.pathname = wsPath;
  u.search = '';
  u.hash = '';
  return u.toString();
}

class LanUpdateClient extends EventEmitter {
  constructor({ app, BrowserWindow }) {
    super();
    this.app = app;
    this.BrowserWindow = BrowserWindow;
    this.root = __dirname;
    this.defaultConfigPath = path.join(this.root, 'update-config.default.json');
    this.userSettingsPath = path.join(app.getPath('userData'), 'update-settings.json');

    this.defaults = this.readDefaults();
    this.settings = this.readSettings();

    this.discoverySocket = null;
    this.ws = null;
    this.wsReconnectTimer = null;
    this.wsReconnectMs = 1500;
    this.periodicTimer = null;
    this.checkInFlight = null;
    this.lastProbeByUrl = new Map();
    this.updater = null;
    this.updaterFeedUrl = null;

    this.isPortable = !!process.env.PORTABLE_EXECUTABLE_FILE;
    this.canApply = !!app.isPackaged && !this.isPortable;

    this.status = {
      schema: 1,
      phase: 'idle',
      message: app.isPackaged
        ? (this.isPortable ? 'Portable 版本可发现更新，但自动安装请使用 Setup 安装版。' : '等待局域网更新服务器…')
        : '开发模式：可测试局域网发现与推送，但不会安装更新。',
      currentVersion: app.getVersion(),
      availableVersion: null,
      downloadedVersion: null,
      serverUrl: normalizeBaseUrl(this.settings.serverUrl),
      serverName: null,
      progress: 0,
      bytesPerSecond: 0,
      transferred: 0,
      total: 0,
      lastCheckAt: null,
      discoveredAt: null,
      canApply: this.canApply,
      isPackaged: app.isPackaged,
      isPortable: this.isPortable,
      autoDiscover: !!this.settings.autoDiscover,
      autoDownload: !!this.settings.autoDownload
    };

    // Trusted-LAN mode: no application signing key is required.
    // The version-specific feed is still handled by electron-updater, which
    // validates the downloaded installer against latest.yml SHA512 metadata.

  }

  readDefaults() {
    try {
      return JSON.parse(fs.readFileSync(this.defaultConfigPath, 'utf8'));
    } catch {
      return {
        enabled: true,
        autoDiscover: true,
        autoDownload: true,
        checkIntervalMinutes: 30,
        serverUrl: '',
        multicastGroup: '239.255.42.99',
        multicastPort: 45881,
        wsPath: '/push',
        releaseBasePath: '/releases'
      };
    }
  }

  readSettings() {
    let user = {};
    try { user = JSON.parse(fs.readFileSync(this.userSettingsPath, 'utf8')); } catch {}
    return {
      ...this.defaults,
      ...user,
      serverUrl: normalizeBaseUrl(user.serverUrl ?? this.defaults.serverUrl ?? '')
    };
  }


  persistSettings() {
    fs.mkdirSync(path.dirname(this.userSettingsPath), { recursive: true });
    fs.writeFileSync(this.userSettingsPath, JSON.stringify({
      schema: 1,
      serverUrl: normalizeBaseUrl(this.settings.serverUrl),
      autoDiscover: !!this.settings.autoDiscover,
      autoDownload: !!this.settings.autoDownload,
      checkIntervalMinutes: Number(this.settings.checkIntervalMinutes) || 30
    }, null, 2) + '\n', 'utf8');
  }

  broadcast() {
    const payload = this.getStatus();
    for (const win of this.BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('update:status', payload);
    }
    this.emit('status', payload);
  }

  setStatus(patch) {
    this.status = { ...this.status, ...patch };
    this.broadcast();
  }

  getStatus() {
    return { ...this.status };
  }

  getSettings() {
    return {
      serverUrl: normalizeBaseUrl(this.settings.serverUrl),
      autoDiscover: !!this.settings.autoDiscover,
      autoDownload: !!this.settings.autoDownload,
      checkIntervalMinutes: Number(this.settings.checkIntervalMinutes) || 30
    };
  }

  async setSettings(next) {
    const manual = normalizeBaseUrl(next?.serverUrl ?? this.settings.serverUrl);
    this.settings.serverUrl = manual;
    this.settings.autoDiscover = next?.autoDiscover !== undefined
      ? !!next.autoDiscover
      : !!this.settings.autoDiscover;
    this.settings.autoDownload = next?.autoDownload !== undefined
      ? !!next.autoDownload
      : !!this.settings.autoDownload;

    const interval = Number(next?.checkIntervalMinutes);
    if (Number.isFinite(interval) && interval >= 5 && interval <= 1440) {
      this.settings.checkIntervalMinutes = interval;
    }

    if (this.updater) this.updater.autoDownload = !!this.settings.autoDownload && this.canApply;
    this.persistSettings();

    this.setStatus({
      serverUrl: manual,
      autoDiscover: !!this.settings.autoDiscover,
      autoDownload: !!this.settings.autoDownload,
      message: manual ? `已设置更新服务器：${manual}` : '已恢复局域网自动发现。'
    });

    this.restartNetwork();
    if (manual) await this.probeAndConnect(manual, { force: true, reason: 'settings' });
    return this.getSettings();
  }

  start() {
    if (!this.settings.enabled) {
      this.setStatus({ phase: 'disabled', message: '局域网更新已禁用。' });
      return;
    }

    this.restartNetwork();
    this.restartPeriodicCheck();

    const manual = normalizeBaseUrl(this.settings.serverUrl);
    if (manual) {
      this.probeAndConnect(manual, { force: true, reason: 'startup-manual' }).catch(() => {});
    } else {
      this.setStatus({ phase: 'discovering', message: '正在自动发现局域网更新服务器…' });
    }
  }

  stop() {
    try { this.discoverySocket?.close(); } catch {}
    this.discoverySocket = null;
    this.closeWebSocket();
    if (this.periodicTimer) clearInterval(this.periodicTimer);
    this.periodicTimer = null;
  }

  restartNetwork() {
    try { this.discoverySocket?.close(); } catch {}
    this.discoverySocket = null;
    this.closeWebSocket();

    if (this.settings.autoDiscover) this.startDiscovery();
  }

  restartPeriodicCheck() {
    if (this.periodicTimer) clearInterval(this.periodicTimer);
    const minutes = Math.max(5, Number(this.settings.checkIntervalMinutes) || 30);
    this.periodicTimer = setInterval(() => {
      this.checkNow({ silent: true }).catch(() => {});
    }, minutes * 60 * 1000);
    this.periodicTimer.unref?.();
  }

  startDiscovery() {
    const group = this.settings.multicastGroup || this.defaults.multicastGroup;
    const port = Number(this.settings.multicastPort || this.defaults.multicastPort || 45881);

    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.discoverySocket = socket;

    socket.on('error', err => {
      this.setStatus({ message: `局域网自动发现异常：${err.message}。可手动填写服务器地址。` });
    });

    socket.on('message', msg => {
      let payload;
      try { payload = JSON.parse(msg.toString('utf8')); } catch { return; }
      if (payload?.type !== 'grs-update-server' || payload?.schema !== 1) return;

      // Manual URL has priority over multicast discovery.
      if (normalizeBaseUrl(this.settings.serverUrl)) return;

      const base = normalizeBaseUrl(payload.baseUrl);
      if (!base) return;
      this.probeAndConnect(base, {
        reason: 'multicast',
        serverName: payload.serverName || null,
        hintedVersion: payload.currentVersion || null
      }).catch(() => {});
    });

    socket.bind(port, '0.0.0.0', () => {
      try {
        socket.addMembership(group);
        socket.setMulticastLoopback(true);
      } catch (err) {
        this.setStatus({ message: `无法加入 multicast ${group}:${port}：${err.message}。可手动填写服务器地址。` });
      }
    });
  }

  closeWebSocket() {
    if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
    this.wsReconnectTimer = null;
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        this.ws.close();
      } catch {}
    }
    this.ws = null;
  }

  connectWebSocket(baseUrl) {
    const normalized = normalizeBaseUrl(baseUrl);
    if (!normalized) return;
    if (this.ws && this.status.serverUrl === normalized &&
        (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    this.closeWebSocket();

    const url = wsUrlFor(normalized, this.settings.wsPath || '/push');
    const ws = new WebSocket(url, { handshakeTimeout: 6000 });
    this.ws = ws;

    ws.on('open', () => {
      this.wsReconnectMs = 1500;
      try {
        ws.send(JSON.stringify({
          type: 'client-hello',
          schema: 1,
          appVersion: this.app.getVersion(),
          packaged: this.app.isPackaged,
          portable: this.isPortable
        }));
      } catch {}
      this.setStatus({
        phase: this.status.availableVersion ? this.status.phase : 'connected',
        serverUrl: normalized,
        message: this.status.availableVersion
          ? this.status.message
          : `已连接局域网更新推送：${normalized}`
      });
    });

    ws.on('message', raw => {
      let payload;
      try { payload = JSON.parse(String(raw)); } catch { return; }
      if (payload?.type === 'hello') {
        this.setStatus({ serverName: payload.serverName || this.status.serverName });
        if (payload.currentVersion) {
          this.handleReleasePush(normalized, payload.currentVersion, 'ws-hello').catch(() => {});
        }
      } else if (payload?.type === 'release' && payload.version) {
        this.handleReleasePush(normalized, payload.version, 'ws-push').catch(() => {});
      }
    });

    const reconnect = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      const activeBase = normalizeBaseUrl(this.status.serverUrl || this.settings.serverUrl);
      if (!activeBase) return;
      const delay = this.wsReconnectMs;
      this.wsReconnectMs = Math.min(30000, Math.round(this.wsReconnectMs * 1.7));
      this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(activeBase), delay);
      this.wsReconnectTimer.unref?.();
    };
    ws.on('close', reconnect);
    ws.on('error', reconnect);
  }

  async probeAndConnect(baseUrl, opts = {}) {
    const base = normalizeBaseUrl(baseUrl);
    if (!base) return false;

    const now = Date.now();
    const last = this.lastProbeByUrl.get(base) || 0;
    if (!opts.force && now - last < 5000) return false;
    this.lastProbeByUrl.set(base, now);

    try {
      const health = await fetchJson(`${base}/health`, 3500);
      if (!health?.ok) throw new Error('invalid health response');

      this.setStatus({
        serverUrl: base,
        serverName: health.serverName || opts.serverName || null,
        discoveredAt: new Date().toISOString(),
        phase: 'connected',
        message: `已发现局域网更新服务器：${base}`
      });
      this.connectWebSocket(base);

      const version = opts.hintedVersion || health.currentVersion;
      if (version) await this.handleReleasePush(base, version, opts.reason || 'probe');
      return true;
    } catch {
      return false;
    }
  }

  async resolveLatestVersion(baseUrl) {
    const latest = await fetchJson(`${baseUrl}/api/latest`, 5000);
    return latest?.version || null;
  }

  releaseFeedUrl(baseUrl, version) {
    if (!version) throw new Error('release version missing');
    return `${baseUrl}${this.settings.releaseBasePath || '/releases'}/${encodeURIComponent(version)}/`;
  }


  async handleReleasePush(baseUrl, version, reason = 'push') {
    const base = normalizeBaseUrl(baseUrl);
    if (!base || !version) return;

    const cmp = compareVersions(version, this.app.getVersion());
    if (cmp <= 0) {
      this.setStatus({
        serverUrl: base,
          lastCheckAt: new Date().toISOString(),
        phase: 'up-to-date',
        availableVersion: null,
        message: `当前版本 ${this.app.getVersion()} 已是最新版本。`
      });
      return;
    }

    await this.checkSpecificRelease(base, version, reason);
  }

  async checkSpecificRelease(baseUrl, version, reason = 'manual') {
    if (this.checkInFlight) return this.checkInFlight;

    this.checkInFlight = (async () => {
      try {
        this.setStatus({
          phase: 'checking',
          availableVersion: version,
          progress: 0,
          lastCheckAt: new Date().toISOString(),
          message: `发现 ${version}，正在读取局域网更新信息…`
        });

        const feedUrl = this.releaseFeedUrl(baseUrl, version);

        if (!this.canApply) {
          this.setStatus({
            availableVersion: version,
            phase: 'available-dev',
            message: `发现版本 ${version}；当前为开发版或 Portable，仅显示更新，不执行自动安装。`
          });
          return { feedUrl, version };
        }

        const updater = this.configureUpdater(feedUrl);
        const result = await updater.checkForUpdates();

        if (result?.updateInfo?.version && compareVersions(result.updateInfo.version, version) !== 0) {
          throw new Error(`update metadata version mismatch: ${result.updateInfo.version} != ${version}`);
        }

        if (!this.settings.autoDownload) {
          this.setStatus({
            phase: 'available',
            availableVersion: version,
            message: `更新 ${version} 可用，可手动开始下载。`
          });
        }
        return result;
      } catch (err) {
        this.setStatus({
          phase: 'error',
          message: `更新检查失败：${err.message}`
        });
        throw err;
      } finally {
        this.checkInFlight = null;
      }
    })();

    return this.checkInFlight;
  }

  async checkNow({ silent = false } = {}) {
    const manual = normalizeBaseUrl(this.settings.serverUrl);
    const base = manual || normalizeBaseUrl(this.status.serverUrl);

    if (!base) {
      if (!silent) this.setStatus({ phase: 'discovering', message: '尚未发现更新服务器，正在等待 multicast；也可以手动填写服务器地址。' });
      return null;
    }

    try {
      const version = await this.resolveLatestVersion(base);
      if (!version) {
        if (!silent) this.setStatus({ phase: 'up-to-date', message: '服务器尚未发布任何版本。' });
        return null;
      }
      return await this.handleReleasePush(base, version, 'manual');
    } catch (err) {
      if (!silent) this.setStatus({ phase: 'error', message: `无法检查服务器：${err.message}` });
      return null;
    }
  }

  async downloadNow() {
    if (!this.canApply) return false;
    if (!this.status.availableVersion) await this.checkNow();
    if (!this.status.availableVersion) return false;
    if (!this.updater) return false;
    await this.updater.downloadUpdate();
    return true;
  }

  installNow() {
    if (!this.canApply || this.status.phase !== 'downloaded') return false;
    if (!this.updater) return false;
    setImmediate(() => this.updater.quitAndInstall(false, true));
    return true;
  }

  configureUpdater(feedUrl) {
    if (this.updater && this.updaterFeedUrl === feedUrl) {
      this.updater.autoDownload = !!this.settings.autoDownload && this.canApply;
      return this.updater;
    }

    if (this.updater) {
      try { this.updater.removeAllListeners(); } catch {}
    }

    const updater = new NsisUpdater({
      provider: 'generic',
      url: feedUrl
    });

    updater.autoDownload = !!this.settings.autoDownload && this.canApply;
    updater.autoInstallOnAppQuit = this.canApply;
    updater.allowDowngrade = false;
    updater.allowPrerelease = false;
    updater.disableWebInstaller = true;

    this.updater = updater;
    this.updaterFeedUrl = feedUrl;
    this.bindUpdaterEvents(updater);
    return updater;
  }

  bindUpdaterEvents(updater) {
    updater.on('checking-for-update', () => {
      this.setStatus({ phase: 'checking', message: '正在检查已验证版本…' });
    });

    updater.on('update-available', info => {
      this.setStatus({
        phase: this.settings.autoDownload ? 'downloading' : 'available',
        availableVersion: info.version,
        message: this.settings.autoDownload
          ? `正在下载 ${info.version}…`
          : `更新 ${info.version} 已验证，等待下载。`
      });
    });

    updater.on('update-not-available', () => {
      this.setStatus({
        phase: 'up-to-date',
        availableVersion: null,
        message: `当前版本 ${this.app.getVersion()} 已是最新版本。`
      });
    });

    updater.on('download-progress', p => {
      this.setStatus({
        phase: 'downloading',
        progress: Number(p.percent) || 0,
        bytesPerSecond: Number(p.bytesPerSecond) || 0,
        transferred: Number(p.transferred) || 0,
        total: Number(p.total) || 0,
        message: `正在下载 ${this.status.availableVersion || '更新'}：${(Number(p.percent) || 0).toFixed(1)}%`
      });
    });

    updater.on('update-downloaded', info => {
      this.setStatus({
        phase: 'downloaded',
        downloadedVersion: info.version,
        availableVersion: info.version,
        progress: 100,
        message: `版本 ${info.version} 已下载并校验完成。保存工程后可重启安装。`
      });
    });

    updater.on('error', err => {
      this.setStatus({
        phase: 'error',
        message: `electron-updater：${err.message}`
      });
    });
  }

}

module.exports = { LanUpdateClient, normalizeBaseUrl, compareVersions };
