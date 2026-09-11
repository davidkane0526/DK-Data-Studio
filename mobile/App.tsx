import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  NativeHeader,
  NativeStatusBar,
  paletteFor,
  type NativeStatusOverflowRow,
  type RendererShellState,
  ShellActionSheet,
  type ShellSheet,
} from './src/Shell';
import { RendererWorkspace } from './src/components/RendererWorkspace';
import { EMPTY_SHELL } from './src/host/protocol';
import { useHostBridge } from './src/host/useHostBridge';
import { useMobileSystemLifecycle } from './src/host/useMobileSystemLifecycle';
import { useNativeFileService } from './src/host/useNativeFileService';
import { useNativeRequestRouter } from './src/host/useNativeRequestRouter';
import { useShellActions } from './src/host/useShellActions';
import { useWebServiceController } from './src/services/useWebServiceController';

export default function App() {
  const [shell, setShell] = useState<RendererShellState>(EMPTY_SHELL);
  const [sheet, setSheet] = useState<ShellSheet>(null);
  const [pluginOverflowKeys, setPluginOverflowKeys] = useState<string[]>([]);
  const [statusOverflowItems, setStatusOverflowItems] = useState<NativeStatusOverflowRow[]>([]);
  const palette = useMemo(() => paletteFor(shell.theme, shell.themeTokens || {}), [shell.theme, shell.themeTokens]);

  const host = useHostBridge(setShell);
  const files = useNativeFileService();
  const webService = useWebServiceController();
  const openWebService = useCallback(() => host.hostRequest('status', { pluginId: 'builtin.status-monitor', id: 'lan-web' }).then(() => undefined), [host.hostRequest]);
  const sendAction = useShellActions(shell, host.hostRequest, openWebService);
  const onMessage = useNativeRequestRouter(host.handleHostProtocolMessage, host.resolveWeb, files);

  useMobileSystemLifecycle({
    sheet,
    setSheet,
    shellReady: shell.ready,
    sendAction,
    publishLifecycle: host.publishLifecycle,
    refreshWebService: webService.refresh,
    clearLifecycleTimers: host.clearLifecycleTimers,
  });

  const webView = (
    <RendererWorkspace
      webRef={host.webRef}
      shell={shell}
      setShell={setShell}
      palette={palette}
      onMessage={onMessage}
      hostRequest={host.hostRequest}
      markRendererLoading={host.markRendererLoading}
      resetHostBridge={host.resetHostBridge}
      resetNativeFiles={files.resetNativeFiles}
    />
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
        <StatusBar style={shell.theme === 'dark' ? 'light' : 'dark'} />
        <NavigationBar hidden style={shell.theme === 'dark' ? 'dark' : 'light'} />
        <NativeHeader shell={shell} palette={palette} onAction={sendAction} onSheet={setSheet} onOverflowChange={setPluginOverflowKeys} />
        {webView}
        <NativeStatusBar shell={shell} palette={palette} onAction={sendAction} onSheet={setSheet} onOverflowChange={setStatusOverflowItems} webService={webService.state} />
        <ShellActionSheet
          visible={sheet}
          shell={shell}
          palette={palette}
          onAction={sendAction}
          onSheet={setSheet}
          pluginOverflowKeys={pluginOverflowKeys}
          statusOverflowItems={statusOverflowItems}
          onClose={() => setSheet(null)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
