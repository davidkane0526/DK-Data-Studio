import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  DeviceEventEmitter,
  Linking,
  NativeModules,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import {
  BottomNavigation,
  NativeHeader,
  NativeStatusBar,
  NavigationRail,
  paletteFor,
  RendererShellState,
  ShellActionSheet,
  ShellSheet,
  NativeWebServiceState,
  WebServicePopover,
} from './src/Shell';

type NativeRequest = {
  id?: string;
  type?: string;
  payload?: any;
};

type HostResponse = {
  channel?: string;
  kind?: 'response' | 'event';
  id?: string;
  ok?: boolean;
  value?: unknown;
  error?: string;
  event?: string;
  payload?: unknown;
};

type NativeFile = {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
};

type DkdsNativeHostApi = {
  openDocuments?: (types: string[], multiple: boolean) => Promise<NativeFile[]>;
  openDocumentsExtended?: (types: string[], multiple: boolean) => Promise<NativeFile[]>;
  openDocumentTree?: () => Promise<{ uri: string; name?: string; persistable?: boolean } | null>;
  listDocumentTree?: (uri: string, relativePath: string) => Promise<any[]>;
  readDocument?: (uri: string) => Promise<string>;
  smbDiscover?: () => Promise<any[]>;
  smbListShares?: (connection: any) => Promise<string[]>;
  smbList?: (connection: any, path: string) => Promise<any[]>;
  smbRead?: (connection: any, paths: string[]) => Promise<any[]>;
  agentGetSecret?: (key: string) => Promise<string>;
  agentSetSecret?: (key: string, value: string) => Promise<boolean>;
  agentHttpJson?: (endpoint: string, headersJson: string, bodyJson: string, timeoutMs: number) => Promise<any>;
  mcpStatus?: () => Promise<any>;
  mcpStart?: (token: string) => Promise<any>;
  mcpStop?: () => Promise<any>;
  mcpRespond?: (id: string, ok: boolean, value: string) => Promise<boolean>;
  createDocument?: (name: string, mimeType: string, content: string, encoding: 'utf8' | 'base64') => Promise<string | null>;
  writeDocument?: (uri: string, content: string, encoding: 'utf8' | 'base64') => Promise<string>;
  webStatus?: () => Promise<{ running?: boolean; url?: string; error?: string }>;
  runtimeStatus?: () => Promise<{ runtime?: string; platform?: string; processCount?: number; memory?: Record<string, number>; components?: any[] }>;
  startWebVersion?: (openBrowser: boolean) => Promise<string>;
  stopWebVersion?: () => Promise<boolean>;
};

const LOCAL_APP = 'file:///android_asset/dkds/index.html?reactNative=1';
const HOST_CHANNEL = 'dkds.mobile-host.v1';
const nativeHost = NativeModules.DkdsNativeHost as DkdsNativeHostApi | undefined;
const EMPTY_SHELL: RendererShellState = {
  ready: false,
  projectTitle: 'DK Data Studio',
  activityId: '',
  activityLabel: '',
  status: '正在载入离线科学工作区…',
  theme: 'light',
  activities: [],
  canGoBack: false,
};

function safeName(name: string | undefined, fallback: string) {
  return String(name || fallback)
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120) || fallback;
}

function mimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  return 'text/plain';
}

function shellState(value: unknown): RendererShellState {
  const row = value && typeof value === 'object' ? value as Partial<RendererShellState> : {};
  return {
    ...EMPTY_SHELL,
    ...row,
    theme: row.theme === 'dark' ? 'dark' : 'light',
    activities: Array.isArray(row.activities) ? row.activities : [],
    surfaces: Array.isArray(row.surfaces) ? row.surfaces : [],
    actions: Array.isArray(row.actions) ? row.actions : [],
    statusItems: Array.isArray(row.statusItems) ? row.statusItems : [],
  };
}

export default function App() {
  const webRef = useRef<WebView>(null);
  const nativeFiles = useRef(new Map<string, NativeFile>());
  const hostPending = useRef(new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> | null; method: string; payload: any; timeoutMs: number }>());
  const hostQueue = useRef<string[]>([]);
  const hostReady = useRef(false);
  const lastBackAt = useRef(0);
  const lifecycleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const appStateRef = useRef(AppState.currentState);
  const { width, height } = useWindowDimensions();
  const landscape = width > height && height < 600;
  const [shell, setShell] = useState<RendererShellState>(EMPTY_SHELL);
  const [sheet, setSheet] = useState<ShellSheet>(null);
  const [loadError, setLoadError] = useState('');
  const [rendererKey, setRendererKey] = useState(0);
  const [webServiceVisible, setWebServiceVisible] = useState(false);
  const [webService, setWebService] = useState<NativeWebServiceState>({ running: false, url: '' });
  const palette = useMemo(() => paletteFor(shell.theme), [shell.theme]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('DkdsNativeHostEvent', (payload: any) => {
      webRef.current?.postMessage(JSON.stringify({ __dkdsNativeEvent: true, event: payload?.event || '', payload: payload?.payload || payload }));
    });
    return () => subscription.remove();
  }, []);

  const resolveWeb = useCallback((id: string | undefined, ok: boolean, value: unknown) => {
    if (!id) return;
    webRef.current?.postMessage(JSON.stringify({ __dkdsNativeResponse: true, id, ok, value }));
  }, []);

  const armHostTimeout = useCallback((id: string) => {
    const pending = hostPending.current.get(id);
    if (!pending || pending.timer || appStateRef.current !== 'active') return;
    pending.timer = setTimeout(() => {
      hostPending.current.delete(id);
      pending.reject(new Error(`移动端 Core 请求超时：${pending.method}`));
    }, pending.timeoutMs);
  }, []);

  const dispatchHostRequest = useCallback((id: string) => {
    const pending = hostPending.current.get(id);
    if (!pending || pending.timer || appStateRef.current !== 'active') return;
    armHostTimeout(id);
    webRef.current?.postMessage(JSON.stringify({ channel: HOST_CHANNEL, kind: 'request', id, method: pending.method, payload: pending.payload }));
  }, [armHostTimeout]);

  const pauseHostTimeouts = useCallback(() => {
    for (const pending of hostPending.current.values()) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.timer = null;
    }
  }, []);

  const resumeHostTimeouts = useCallback(() => {
    if (!hostReady.current || appStateRef.current !== 'active') return;
    for (const id of hostPending.current.keys()) armHostTimeout(id);
  }, [armHostTimeout]);

  const flushHostQueue = useCallback(() => {
    if (!hostReady.current || appStateRef.current !== 'active') return;
    const queued = hostQueue.current.splice(0);
    queued.forEach(dispatchHostRequest);
    resumeHostTimeouts();
  }, [dispatchHostRequest, resumeHostTimeouts]);

  const postHostEvent = useCallback((event: string, payload: any = {}) => {
    webRef.current?.postMessage(JSON.stringify({ channel: HOST_CHANNEL, kind: 'event', event, payload }));
  }, []);

  const publishLifecycle = useCallback((state: string) => {
    lifecycleTimers.current.forEach(clearTimeout);
    lifecycleTimers.current = [];
    appStateRef.current = state;
    if (state !== 'active') {
      hostReady.current = false;
      pauseHostTimeouts();
    } else {
      hostReady.current = false;
    }
    const send = () => postHostEvent('lifecycle', { state });
    send();
    if (state === 'active') {
      lifecycleTimers.current.push(setTimeout(send, 160));
      lifecycleTimers.current.push(setTimeout(send, 700));
      lifecycleTimers.current.push(setTimeout(send, 1500));
    }
  }, [pauseHostTimeouts, postHostEvent]);

  const hostRequest = useCallback((method: string, payload: any = {}) => {
    const id = `host-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise<any>((resolve, reject) => {
      const interactiveFileCommand = method === 'command' && ['import', 'project.open', 'project.save'].includes(String(payload?.id || ''));
      hostPending.current.set(id, { resolve, reject, timer: null, method, payload, timeoutMs: interactiveFileCommand ? 10 * 60 * 1000 : 45 * 1000 });
      if (hostReady.current && appStateRef.current === 'active') dispatchHostRequest(id);
      else hostQueue.current.push(id);
    });
  }, [dispatchHostRequest]);

  const exitAfterUnhandledBack = useCallback(() => {
    const now = Date.now();
    if (now - lastBackAt.current < 1800) BackHandler.exitApp();
    else {
      lastBackAt.current = now;
      ToastAndroid.show('再按一次返回键退出', ToastAndroid.SHORT);
    }
  }, []);

  const refreshWebService = useCallback(async () => {
    try {
      const state = await nativeHost?.webStatus?.();
      const next = { running: !!state?.running, url: String(state?.url || ''), error: String(state?.error || '') };
      setWebService(next);
      return next;
    } catch (error: any) {
      const next = { running: false, url: '', error: error?.message || String(error) };
      setWebService(next);
      return next;
    }
  }, []);

  useEffect(() => { void refreshWebService(); }, [refreshWebService]);

  const runWebServiceAction = useCallback(async (action: 'start' | 'open' | 'stop' | 'copy') => {
    if (action === 'copy') {
      if (webService.url) { await Clipboard.setStringAsync(webService.url); ToastAndroid.show('本机网页版地址已复制', ToastAndroid.SHORT); }
      return;
    }
    setWebService(current => ({ ...current, busy: true, error: '' }));
    try {
      if (action === 'stop') await nativeHost?.stopWebVersion?.();
      else {
        if (!nativeHost?.startWebVersion) throw new Error('当前安装包没有本机网页版服务。');
        const url = await nativeHost.startWebVersion(false);
        if (action === 'open' && url) await Linking.openURL(url);
      }
      await refreshWebService();
    } catch (error: any) {
      const message = error?.message || String(error);
      setWebService(current => ({ ...current, busy: false, error: message }));
      ToastAndroid.show(message, ToastAndroid.LONG);
    } finally {
      setWebService(current => ({ ...current, busy: false }));
    }
  }, [refreshWebService, webService.url]);

  const sendAction = useCallback(async (action: string, payload: any = {}) => {
    try {
      if (action === 'activity') await hostRequest('navigate', { activityId: payload?.id });
      else if (action === 'data') {
        const target = shell.activities.find(row => row.system) || shell.activities.find(row => row.id === 'data-center');
        if (!target) throw new Error('数据中心工作区尚未就绪。');
        await hostRequest('navigate', { activityId: target.id });
      } else if (action === 'home') {
        const target = shell.activities.find(row => row.isSuper) || shell.activities.find(row => !row.system) || shell.activities[0];
        if (target) await hostRequest('navigate', { activityId: target.id });
      } else if (action === 'back') {
        const result = await hostRequest('back');
        if (!result?.handled) exitAfterUnhandledBack();
      } else if (action === 'import') await hostRequest('command', { id: 'import' });
      else if (action === 'project-open') await hostRequest('command', { id: 'project.open' });
      else if (action === 'project-save') await hostRequest('command', { id: 'project.save' });
      else if (action === 'project-new') await hostRequest('command', { id: 'project.new' });
      else if (action === 'project-switch') await hostRequest('command', { id: 'project.switch', projectId: payload?.id });
      else if (action === 'project-close') await hostRequest('command', { id: 'project.close', projectId: payload?.id });
      else if (action === 'history-undo') await hostRequest('command', { id: 'project.undo' });
      else if (action === 'history-redo') await hostRequest('command', { id: 'project.redo' });
      else if (action === 'plugins') await hostRequest('command', { id: 'system.plugins' });
      else if (action === 'web-service' || action === 'web-open') {
        setWebServiceVisible(true);
        await refreshWebService();
      }
      else if (action === 'theme-toggle') await hostRequest('command', { id: 'theme.toggle' });
      else if (action === 'panel') await hostRequest('panel', { name: payload?.name || 'left' });
      else if (action === 'surface') await hostRequest('surface', { id: payload?.id, activityId: shell.activityId });
      else if (action === 'workspace-action') await hostRequest('action', { id: payload?.id, itemId: payload?.itemId, activityId: shell.activityId });
      else if (action === 'status-item') {
        if (payload?.id === 'lan-web') { setWebServiceVisible(true); await refreshWebService(); }
        else await hostRequest('status', { pluginId: payload?.pluginId, id: payload?.id });
      }
    } catch (error: any) {
      ToastAndroid.show(error?.message || String(error), ToastAndroid.LONG);
    }
  }, [exitAfterUnhandledBack, hostRequest, refreshWebService, shell.activities, shell.activityId]);

  const shareTextFile = useCallback(async (name: string, content: string, mimeType?: string, existingUri?: string) => {
    const fileName = safeName(name, 'dkds-export.txt');
    if (existingUri && nativeHost?.writeDocument) return nativeHost.writeDocument(existingUri, content, 'utf8');
    if (nativeHost?.createDocument) return nativeHost.createDocument(fileName, mimeType || mimeFromName(fileName), content, 'utf8');
    const uri = `${FileSystem.cacheDirectory}${Date.now()}-${fileName}`;
    await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('当前设备没有可用的系统保存 / 分享目标。');
      await Sharing.shareAsync(uri, { dialogTitle: `保存 / 分享 ${fileName}`, mimeType: mimeType || mimeFromName(fileName) });
      return fileName;
    } finally {
      void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
    }
  }, []);

  const shareBase64File = useCallback(async (name: string, rawBase64: string, mimeType?: string, existingUri?: string) => {
    const fileName = safeName(name, 'dkds-export.bin');
    if (existingUri && nativeHost?.writeDocument) return nativeHost.writeDocument(existingUri, rawBase64, 'base64');
    if (nativeHost?.createDocument) return nativeHost.createDocument(fileName, mimeType || mimeFromName(fileName), rawBase64, 'base64');
    const uri = `${FileSystem.cacheDirectory}${Date.now()}-${fileName}`;
    await FileSystem.writeAsStringAsync(uri, rawBase64, { encoding: FileSystem.EncodingType.Base64 });
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('当前设备没有可用的系统保存 / 分享目标。');
      await Sharing.shareAsync(uri, { dialogTitle: `保存 / 分享 ${fileName}`, mimeType: mimeType || mimeFromName(fileName) });
      return fileName;
    } finally {
      void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
    }
  }, []);

  const openFiles = useCallback(async (request: NativeRequest) => {
    const requestedTypes = Array.isArray(request.payload?.type)
      ? request.payload.type.map(String)
      : [String(request.payload?.type || '*/*')];
    const openNativeDocuments = nativeHost?.openDocumentsExtended || nativeHost?.openDocuments;
    const picked = openNativeDocuments
      ? await openNativeDocuments(requestedTypes, request.payload?.multiple !== false)
      : null;
    if (picked) return picked.map(asset => {
      const token = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      nativeFiles.current.set(token, { uri: asset.uri, name: asset.name, size: asset.size || 0, mimeType: asset.mimeType || '' });
      return { path: `nativefile://${token}/${encodeURIComponent(asset.name)}`, token, name: asset.name, size: asset.size || 0, mimeType: asset.mimeType || '' };
    });
    const result = await DocumentPicker.getDocumentAsync({
      type: request.payload?.type || '*/*',
      multiple: request.payload?.multiple !== false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return [];
    return (result.assets || []).map(asset => {
      const token = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      nativeFiles.current.set(token, { uri: asset.uri, name: asset.name, size: asset.size || 0, mimeType: asset.mimeType || '' });
      return {
        path: `nativefile://${token}/${encodeURIComponent(asset.name)}`,
        token,
        name: asset.name,
        size: asset.size || 0,
        mimeType: asset.mimeType || '',
      };
    });
  }, []);

  const readFile = useCallback(async (token: string) => {
    const file = nativeFiles.current.get(String(token || ''));
    if (!file) throw new Error('文件会话已失效，请重新选择文件。');
    if (nativeHost?.readDocument) return nativeHost.readDocument(file.uri);
    return FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
  }, []);

  const onMessage = useCallback(async (event: WebViewMessageEvent) => {
    let req: NativeRequest & HostResponse;
    try { req = JSON.parse(event.nativeEvent.data); } catch { return; }

    if (req.channel === HOST_CHANNEL && req.kind === 'event' && req.event === 'ready') {
      hostReady.current = true;
      flushHostQueue();
      return;
    }
    if (req.channel === HOST_CHANNEL && req.kind === 'event' && req.event === 'state') {
      setShell(shellState(req.payload));
      return;
    }
    if (req.channel === HOST_CHANNEL && req.kind === 'response' && req.id) {
      const pending = hostPending.current.get(req.id);
      if (!pending) return;
      if (pending.timer) clearTimeout(pending.timer);
      hostPending.current.delete(req.id);
      if (req.ok) pending.resolve(req.value);
      else pending.reject(new Error(req.error || '移动端 Core 请求失败。'));
      return;
    }

    try {
      if (req.type === 'ready') {
        resolveWeb(req.id, true, true);
        return;
      }
      if (req.type === 'openFiles') {
        resolveWeb(req.id, true, await openFiles(req));
        return;
      }
      if (req.type === 'readFile') {
        resolveWeb(req.id, true, await readFile(req.payload?.token));
        return;
      }
      if (req.type === 'openDirectory') {
        resolveWeb(req.id, true, await nativeHost?.openDocumentTree?.());
        return;
      }
      if (req.type === 'listDirectory') {
        resolveWeb(req.id, true, await nativeHost?.listDocumentTree?.(String(req.payload?.uri || ''), String(req.payload?.relativePath || '')) || []);
        return;
      }
      if (req.type === 'readDocumentUri') {
        const uri = String(req.payload?.uri || '');
        if (!uri || !nativeHost?.readDocument) throw new Error('Android 文档读取接口不可用。');
        resolveWeb(req.id, true, { uri, name: String(req.payload?.name || 'document'), base64: await nativeHost.readDocument(uri) });
        return;
      }
      if (req.type === 'smbDiscover') { resolveWeb(req.id, true, await nativeHost?.smbDiscover?.() || []); return; }
      if (req.type === 'smbListShares') { resolveWeb(req.id, true, await nativeHost?.smbListShares?.(req.payload?.connection || {}) || []); return; }
      if (req.type === 'smbList') { resolveWeb(req.id, true, await nativeHost?.smbList?.(req.payload?.connection || {}, String(req.payload?.path || '')) || []); return; }
      if (req.type === 'smbRead') { resolveWeb(req.id, true, await nativeHost?.smbRead?.(req.payload?.connection || {}, Array.isArray(req.payload?.paths) ? req.payload.paths : []) || []); return; }
      if (req.type === 'agentGetSecret') { resolveWeb(req.id, true, await nativeHost?.agentGetSecret?.(String(req.payload?.key || 'default')) || ''); return; }
      if (req.type === 'agentSetSecret') { resolveWeb(req.id, true, await nativeHost?.agentSetSecret?.(String(req.payload?.key || 'default'), String(req.payload?.value || '')) || false); return; }
      if (req.type === 'agentHttpJson') {
        const payload = req.payload || {};
        const raw = await nativeHost?.agentHttpJson?.(String(payload.endpoint || ''), JSON.stringify(payload.headers || {}), JSON.stringify(payload.body ?? null), Number(payload.timeoutMs || 45000));
        const normalized = raw && typeof raw === 'object' && typeof raw.bodyJson === 'string'
          ? { ...raw, body: (() => { try { return JSON.parse(raw.bodyJson); } catch { return raw.bodyJson; } })() }
          : raw;
        resolveWeb(req.id, true, normalized); return;
      }
      if (req.type === 'mcpStatus') { resolveWeb(req.id, true, await nativeHost?.mcpStatus?.() || { running: false }); return; }
      if (req.type === 'mcpStart') { resolveWeb(req.id, true, await nativeHost?.mcpStart?.(String(req.payload?.token || ''))); return; }
      if (req.type === 'mcpStop') { resolveWeb(req.id, true, await nativeHost?.mcpStop?.()); return; }
      if (req.type === 'mcpRespond') { resolveWeb(req.id, true, await nativeHost?.mcpRespond?.(String(req.payload?.id || ''), req.payload?.ok !== false, JSON.stringify(req.payload?.value ?? null))); return; }
      if (req.type === 'releaseFiles') {
        for (const token of req.payload?.tokens || []) nativeFiles.current.delete(String(token));
        resolveWeb(req.id, true, true);
        return;
      }
      if (req.type === 'copyText') {
        await Clipboard.setStringAsync(String(req.payload?.text ?? ''));
        resolveWeb(req.id, true, true);
        return;
      }
      if (req.type === 'saveText') {
        resolveWeb(req.id, true, await shareTextFile(req.payload?.name || 'dkds-export.txt', String(req.payload?.content ?? ''), req.payload?.mimeType, req.payload?.uri));
        return;
      }
      if (req.type === 'saveBase64') {
        const raw = String(req.payload?.base64 ?? '').replace(/^data:[^;]+;base64,/, '');
        resolveWeb(req.id, true, await shareBase64File(req.payload?.name || 'dkds-export.png', raw, req.payload?.mimeType, req.payload?.uri));
        return;
      }
      if (req.type === 'runtimeStatus') {
        resolveWeb(req.id, true, await nativeHost?.runtimeStatus?.());
        return;
      }
      if (req.type === 'webStatus') {
        const state = await nativeHost?.webStatus?.();
        resolveWeb(req.id, true, { running: !!state?.running, url: state?.url || '', error: state?.error || '' });
        return;
      }
      if (req.type === 'webStart' || req.type === 'webOpen') {
        if (!nativeHost?.startWebVersion) throw new Error('本机网页版服务不可用。');
        resolveWeb(req.id, true, await nativeHost.startWebVersion(req.type === 'webOpen'));
        return;
      }
      if (req.type === 'webStop') {
        resolveWeb(req.id, true, await nativeHost?.stopWebVersion?.());
        return;
      }
      resolveWeb(req.id, false, `Unsupported native request: ${req.type}`);
    } catch (error: any) {
      resolveWeb(req.id, false, error?.message || String(error));
    }
  }, [flushHostQueue, openFiles, readFile, resolveWeb, shareBase64File, shareTextFile]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) {
        setSheet(null);
        return true;
      }
      if (shell.ready) {
        sendAction('back');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [sendAction, sheet, shell.ready]);

  useEffect(() => {
    NavigationBar.setHidden(true);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        NavigationBar.setHidden(true);
        void refreshWebService();
      }
      publishLifecycle(state);
    });
    return () => { subscription.remove(); lifecycleTimers.current.forEach(clearTimeout); lifecycleTimers.current = []; };
  }, [publishLifecycle, refreshWebService, webServiceVisible]);

  const retry = useCallback(() => {
    lifecycleTimers.current.forEach(clearTimeout); lifecycleTimers.current = [];
    nativeFiles.current.clear();
    hostReady.current = false;
    hostQueue.current = [];
    for (const pending of hostPending.current.values()) { if (pending.timer) clearTimeout(pending.timer); pending.reject(new Error('移动端工作区已重新载入。')); }
    hostPending.current.clear();
    setLoadError('');
    setShell(EMPTY_SHELL);
    setRendererKey(value => value + 1);
  }, []);

  const webView = (
    <View style={styles.webContainer}>
      <WebView
        key={rendererKey}
        ref={webRef}
        source={{ uri: LOCAL_APP }}
        style={[styles.web, { backgroundColor: palette.background }]}
        originWhitelist={['file://*', 'about:blank']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs={false}
        allowingReadAccessToURL="file:///android_asset/dkds/"
        mixedContentMode="never"
        thirdPartyCookiesEnabled={false}
        setSupportMultipleWindows={false}
        pullToRefreshEnabled={false}
        overScrollMode="never"
        textZoom={100}
        cacheEnabled
        onMessage={onMessage}
        onLoadStart={() => { hostReady.current = false; setShell(current => ({ ...current, ready: false })); }}
        onLoadEnd={() => hostRequest('bootstrap').then(value => setShell(shellState(value))).catch(error => setLoadError(error?.message || String(error)))}
        onRenderProcessGone={() => setLoadError('Android WebView 渲染进程已退出，请重新载入工作区。')}
        onError={event => setLoadError(event.nativeEvent.description || 'WebView 加载失败')}
        onHttpError={event => setLoadError(`HTTP ${event.nativeEvent.statusCode}`)}
        onShouldStartLoadWithRequest={request => {
          if (request.url.startsWith('file://') || request.url === 'about:blank') return true;
          if (/^https?:/i.test(request.url)) void Linking.openURL(request.url);
          return false;
        }}
      />

      {!shell.ready && !loadError ? (
        <View style={[styles.loadingOverlay, { backgroundColor: palette.background }]} pointerEvents="none">
          <View style={[styles.loadingCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ActivityIndicator size="large" color={palette.accent} />
            <Text style={[styles.loadingTitle, { color: palette.text }]}>准备科学工作区</Text>
            <Text style={[styles.loadingDetail, { color: palette.textSoft }]}>正在载入 Core、插件与离线计算引擎</Text>
          </View>
        </View>
      ) : null}

      {loadError ? (
        <View style={[styles.errorOverlay, { backgroundColor: palette.background }]}>
          <View style={[styles.errorCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.errorTitle, { color: palette.text }]}>工作区未能载入</Text>
            <Text style={[styles.errorText, { color: palette.textSoft }]}>{loadError}</Text>
            <Pressable onPress={retry} style={[styles.retry, { backgroundColor: palette.accent }]}>
              <Text style={styles.retryText}>重新载入</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
        <StatusBar style={shell.theme === 'dark' ? 'light' : 'dark'} />
        <NavigationBar hidden style={shell.theme === 'dark' ? 'dark' : 'light'} />
        {landscape ? (
          <>
            <View style={styles.landscapeBody}>
              <NavigationRail shell={shell} palette={palette} onAction={sendAction} onSheet={setSheet} />
              {webView}
            </View>
            <NativeStatusBar shell={shell} palette={palette} onAction={sendAction} webService={webService} />
          </>
        ) : (
          <>
            <NativeHeader shell={shell} palette={palette} onAction={sendAction} onSheet={setSheet} />
            {webView}
            <BottomNavigation shell={shell} palette={palette} onAction={sendAction} onSheet={setSheet} />
            <NativeStatusBar shell={shell} palette={palette} onAction={sendAction} webService={webService} />
          </>
        )}
        <WebServicePopover visible={webServiceVisible} state={webService} palette={palette} onClose={() => setWebServiceVisible(false)} onAction={action => { void runWebServiceAction(action); }} />
        <ShellActionSheet visible={sheet} shell={shell} palette={palette} onAction={sendAction} onSheet={setSheet} onClose={() => setSheet(null)} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  landscapeBody: { flex: 1, flexDirection: 'row' },
  webContainer: { flex: 1, position: 'relative', overflow: 'hidden' },
  web: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingCard: { width: '100%', maxWidth: 340, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 28, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  loadingTitle: { fontSize: 15, fontWeight: '700', marginTop: 16 },
  loadingDetail: { fontSize: 10, marginTop: 6, textAlign: 'center' },
  errorOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorCard: { width: '100%', maxWidth: 380, padding: 20, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  errorTitle: { fontSize: 17, fontWeight: '700' },
  errorText: { fontSize: 11, lineHeight: 17, marginTop: 8 },
  retry: { minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
