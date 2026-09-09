import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import type { Palette } from '../theme/palette';
import type { RendererShellState } from '../model/shell-types';
import { EMPTY_SHELL, LOCAL_APP, shellState } from '../host/protocol';

type HostRequest = (method: string, payload?: any) => Promise<any>;

export function RendererWorkspace(props: {
  webRef: React.RefObject<WebView | null>;
  shell: RendererShellState;
  setShell: React.Dispatch<React.SetStateAction<RendererShellState>>;
  palette: Palette;
  onMessage: (event: WebViewMessageEvent) => void;
  hostRequest: HostRequest;
  markRendererLoading: () => void;
  resetHostBridge: () => void;
  resetNativeFiles: () => void;
}) {
  const { webRef, shell, setShell, palette, onMessage, hostRequest, markRendererLoading, resetHostBridge, resetNativeFiles } = props;
  const [loadError, setLoadError] = useState('');
  const [rendererKey, setRendererKey] = useState(0);

  const retry = useCallback(() => {
    resetNativeFiles();
    resetHostBridge();
    setLoadError('');
    setShell(EMPTY_SHELL);
    setRendererKey(value => value + 1);
  }, [resetHostBridge, resetNativeFiles, setShell]);

  return (
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
        onLoadStart={() => {
          markRendererLoading();
          setShell(current => ({ ...current, ready: false }));
        }}
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
          <View style={[styles.loadingCard, { backgroundColor: palette.surface, borderColor: palette.controlBorder }]}> 
            <ActivityIndicator size="large" color={palette.accent} />
            <Text style={[styles.loadingTitle, { color: palette.text }]}>准备科学工作区</Text>
            <Text style={[styles.loadingDetail, { color: palette.textSoft }]}>正在载入 Core、插件与离线计算引擎</Text>
          </View>
        </View>
      ) : null}

      {loadError ? (
        <View style={[styles.errorOverlay, { backgroundColor: palette.background }]}> 
          <View style={[styles.errorCard, { backgroundColor: palette.surface, borderColor: palette.controlBorder }]}> 
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
}

const styles = StyleSheet.create({
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
