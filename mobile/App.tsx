import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

type NativeRequest = {
  id?: string;
  type?: string;
  payload?: any;
};

const LOCAL_APP = 'file:///android_asset/dkds/index.html?reactNative=1';

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

export default function App() {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  const resolveWeb = useCallback((id: string | undefined, ok: boolean, value: any) => {
    if (!id) return;
    webRef.current?.postMessage(JSON.stringify({
      __dkdsNativeResponse: true,
      id,
      ok,
      value,
    }));
  }, []);

  const shareTextFile = useCallback(async (name: string, content: string, mimeType?: string) => {
    const fileName = safeName(name, 'dkds-export.txt');
    const uri = `${FileSystem.cacheDirectory}${Date.now()}-${fileName}`;
    await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        dialogTitle: `保存 / 分享 ${fileName}`,
        mimeType: mimeType || mimeFromName(fileName),
      });
    }
    return uri;
  }, []);

  const shareBase64File = useCallback(async (name: string, rawBase64: string, mimeType?: string) => {
    const fileName = safeName(name, 'dkds-export.bin');
    const uri = `${FileSystem.cacheDirectory}${Date.now()}-${fileName}`;
    await FileSystem.writeAsStringAsync(uri, rawBase64, { encoding: FileSystem.EncodingType.Base64 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        dialogTitle: `保存 / 分享 ${fileName}`,
        mimeType: mimeType || mimeFromName(fileName),
      });
    }
    return uri;
  }, []);

  const onMessage = useCallback(async (event: WebViewMessageEvent) => {
    let req: NativeRequest;
    try {
      req = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    try {
      if (req.type === 'ready') {
        setReady(true);
        resolveWeb(req.id, true, true);
        return;
      }

      if (req.type === 'openFiles') {
        const result = await DocumentPicker.getDocumentAsync({
          type: req.payload?.type || '*/*',
          multiple: req.payload?.multiple !== false,
          copyToCacheDirectory: true,
        });
        if (result.canceled) {
          resolveWeb(req.id, true, []);
          return;
        }
        const assets = [];
        for (const asset of result.assets || []) {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          assets.push({
            path: `nativefile://${Date.now()}-${Math.random().toString(36).slice(2)}/${encodeURIComponent(asset.name)}`,
            name: asset.name,
            size: asset.size || 0,
            mimeType: asset.mimeType || '',
            base64,
          });
        }
        resolveWeb(req.id, true, assets);
        return;
      }

      if (req.type === 'copyText') {
        await Clipboard.setStringAsync(String(req.payload?.text ?? ''));
        resolveWeb(req.id, true, true);
        return;
      }

      if (req.type === 'saveText') {
        const uri = await shareTextFile(
          req.payload?.name || 'dkds-export.txt',
          String(req.payload?.content ?? ''),
          req.payload?.mimeType
        );
        resolveWeb(req.id, true, uri);
        return;
      }

      if (req.type === 'saveBase64') {
        const raw = String(req.payload?.base64 ?? '').replace(/^data:[^;]+;base64,/, '');
        const uri = await shareBase64File(
          req.payload?.name || 'dkds-export.png',
          raw,
          req.payload?.mimeType
        );
        resolveWeb(req.id, true, uri);
        return;
      }

      resolveWeb(req.id, false, `Unsupported native request: ${req.type}`);
    } catch (error: any) {
      const message = error?.message || String(error);
      resolveWeb(req.id, false, message);
      Alert.alert('DK Data Studio', message);
    }
  }, [resolveWeb, shareBase64File, shareTextFile]);

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.root} edges={['top','left','right','bottom']}>
      <StatusBar style="auto" />
      <View style={styles.nativeBar}>
        <View style={styles.titleArea}>
          <Text style={styles.title}>DK Data Studio</Text>
          <Text style={styles.subtitle}>React Native Android · plugin branch</Text>
        </View>
        {!ready && !loadError ? <ActivityIndicator size="small" /> : null}
        {loadError ? (
          <Pressable
            style={styles.retry}
            onPress={() => {
              setLoadError('');
              webRef.current?.reload();
            }}>
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        ) : null}
      </View>

      <WebView
        ref={webRef}
        source={{ uri: LOCAL_APP }}
        style={styles.web}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        allowingReadAccessToURL="file:///"
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        pullToRefreshEnabled={false}
        overScrollMode="never"
        onMessage={onMessage}
        onLoadEnd={() => setReady(true)}
        onError={event => setLoadError(event.nativeEvent.description || 'WebView 加载失败')}
        onHttpError={event => setLoadError(`HTTP ${event.nativeEvent.statusCode}`)}
      />

      {loadError ? (
        <View style={styles.errorOverlay} pointerEvents="none">
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  nativeBar: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d9e0eb',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleArea: { flex: 1 },
  title: { color: '#20293a', fontSize: 14, fontWeight: '700' },
  subtitle: { color: '#7d8798', fontSize: 9, marginTop: 1 },
  web: { flex: 1, backgroundColor: '#ffffff' },
  retry: {
    paddingHorizontal: 12,
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#315efb',
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  errorOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 76,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff3f1',
  },
  errorText: { color: '#b42318', fontSize: 11 },
});
