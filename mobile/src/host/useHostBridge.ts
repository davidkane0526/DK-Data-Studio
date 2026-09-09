import { useCallback, useEffect, useRef } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import type { AppStateStatus } from 'react-native';
import type { WebView } from 'react-native-webview';
import type { RendererShellState } from '../model/shell-types';
import { HOST_CHANNEL, shellState } from './protocol';
import type { HostResponse } from './protocol';

type PendingHostRequest = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
  method: string;
  payload: any;
  timeoutMs: number;
};

export function useHostBridge(setShell: React.Dispatch<React.SetStateAction<RendererShellState>>) {
  const webRef = useRef<WebView>(null);
  const hostPending = useRef(new Map<string, PendingHostRequest>());
  const hostQueue = useRef<string[]>([]);
  const hostReady = useRef(false);
  const lifecycleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

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

  const publishLifecycle = useCallback((state: AppStateStatus) => {
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
      const interactiveFileCommand = method === 'command' && ['import', 'file.open', 'file.folder', 'project.open', 'project.save', 'connectivity.smb.open'].includes(String(payload?.id || ''));
      hostPending.current.set(id, { resolve, reject, timer: null, method, payload, timeoutMs: interactiveFileCommand ? 10 * 60 * 1000 : 45 * 1000 });
      if (hostReady.current && appStateRef.current === 'active') dispatchHostRequest(id);
      else hostQueue.current.push(id);
    });
  }, [dispatchHostRequest]);

  const handleHostProtocolMessage = useCallback((req: HostResponse) => {
    if (req.channel !== HOST_CHANNEL) return false;
    if (req.kind === 'event' && req.event === 'ready') {
      hostReady.current = true;
      flushHostQueue();
      return true;
    }
    if (req.kind === 'event' && req.event === 'state') {
      setShell(shellState(req.payload));
      return true;
    }
    if (req.kind === 'response' && req.id) {
      const pending = hostPending.current.get(req.id);
      if (!pending) return true;
      if (pending.timer) clearTimeout(pending.timer);
      hostPending.current.delete(req.id);
      if (req.ok) pending.resolve(req.value);
      else pending.reject(new Error(req.error || '移动端 Core 请求失败。'));
      return true;
    }
    return false;
  }, [flushHostQueue, setShell]);

  const markRendererLoading = useCallback(() => {
    hostReady.current = false;
  }, []);

  const resetHostBridge = useCallback(() => {
    lifecycleTimers.current.forEach(clearTimeout);
    lifecycleTimers.current = [];
    hostReady.current = false;
    hostQueue.current = [];
    for (const pending of hostPending.current.values()) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.reject(new Error('移动端工作区已重新载入。'));
    }
    hostPending.current.clear();
  }, []);

  const clearLifecycleTimers = useCallback(() => {
    lifecycleTimers.current.forEach(clearTimeout);
    lifecycleTimers.current = [];
  }, []);

  return {
    webRef,
    hostRequest,
    resolveWeb,
    publishLifecycle,
    handleHostProtocolMessage,
    markRendererLoading,
    resetHostBridge,
    clearLifecycleTimers,
  };
}
