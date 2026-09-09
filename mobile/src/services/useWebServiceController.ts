import { useCallback, useEffect, useState } from 'react';
import type { NativeWebServiceState } from '../model/shell-types';
import { nativeHost } from '../host/protocol';

function normalizeWebService(state: NativeWebServiceState | undefined): NativeWebServiceState {
  return {
    running: !!state?.running,
    enabled: state?.enabled !== false,
    noKey: !!state?.noKey,
    port: Number(state?.port) || 45910,
    key: String(state?.key || ''),
    url: String(state?.url || ''),
    urls: Array.isArray(state?.urls) ? state!.urls!.map(String).filter(Boolean) : [],
    localhostUrl: String(state?.localhostUrl || ''),
    browserUrl: String(state?.browserUrl || ''),
    pairedClients: Number(state?.pairedClients) || 0,
    error: String(state?.error || ''),
  };
}

const EMPTY_WEB_SERVICE: NativeWebServiceState = {
  running: false,
  enabled: false,
  noKey: false,
  port: 45910,
  key: '',
  url: '',
  urls: [],
  pairedClients: 0,
};

// The native shell only mirrors LAN status for the bottom status bar. The actual
// settings panel lives in the WebView and consumes the same Core Material/Theme
// surface as the other status popovers, so there is no second RN-owned panel.
export function useWebServiceController() {
  const [state, setState] = useState<NativeWebServiceState>(EMPTY_WEB_SERVICE);
  const refresh = useCallback(async () => {
    try {
      const next = normalizeWebService(await nativeHost?.webStatus?.());
      setState(next);
      return next;
    } catch (error: any) {
      const next = normalizeWebService({ running: false, url: '', error: error?.message || String(error) });
      setState(next);
      return next;
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { state, refresh };
}
