import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { UpdateDialog } from './src/components/UpdateDialog';
import { EMPTY_SHELL, nativeHost } from './src/host/protocol';
import { useHostBridge } from './src/host/useHostBridge';
import { useMobileSystemLifecycle } from './src/host/useMobileSystemLifecycle';
import { useNativeFileService } from './src/host/useNativeFileService';
import { useNativeRequestRouter } from './src/host/useNativeRequestRouter';
import { useShellActions } from './src/host/useShellActions';
import { useWebServiceController } from './src/services/useWebServiceController';

export default function App() {
  const [shell, setShell] = useState<RendererShellState>(EMPTY_SHELL);
  const [updateVisible,setUpdateVisible]=useState(false);
  const [updateAutoPrompt,setUpdateAutoPrompt]=useState(false);
  const [installedAppVersion,setInstalledAppVersion]=useState('');
  const startupUpdateChecked=useRef(false);
  const updateDismissedThisSession=useRef(false);
  const [sheet, setSheet] = useState<ShellSheet>(null);
  const [pluginOverflowKeys, setPluginOverflowKeys] = useState<string[]>([]);
  const [statusOverflowItems, setStatusOverflowItems] = useState<NativeStatusOverflowRow[]>([]);
  const palette = useMemo(() => paletteFor(shell.theme, shell.themeTokens || {}), [shell.theme, shell.themeTokens]);

  const host = useHostBridge(setShell);
  const applyVerifiedUiCss=useCallback((css:string)=>{
    if(!css||css.length>400000)return;
    void host.hostRequest('ui-hot-style',{css}).catch(()=>{});
  },[host.hostRequest]);
  // One silent check per app launch; skipping suppresses only automatic prompts
  // until the process restarts. Manual checks always remain available.
  useEffect(()=>{
    if(!shell.ready||startupUpdateChecked.current)return;
    startupUpdateChecked.current=true;
    let canceled=false;
    void (async()=>{
      try{
        await Promise.allSettled([nativeHost?.appUpdateCheck?.(),nativeHost?.uiHotCheck?.()]);
        for(let i=0;i<22&&!canceled;i++){
          const [a,u]=await Promise.allSettled([
            nativeHost?.appUpdateStatus?.(),nativeHost?.uiHotStatus?.()
          ]);
          const app=a.status==='fulfilled'&&a.value?JSON.parse(a.value):null;
          if(app?.installedVersion)setInstalledAppVersion(String(app.installedVersion));
          const ui=u.status==='fulfilled'&&u.value?JSON.parse(u.value):null;
          if(ui?.status==='updated'&&nativeHost?.uiHotCss){
            const css=await nativeHost.uiHotCss().catch(()=>'');
            if(css)applyVerifiedUiCss(css);
          }
          if(!canceled&&!updateDismissedThisSession.current&&
             (app?.status==='available'||app?.status==='ready'||ui?.status==='updated')){
            setUpdateAutoPrompt(true);setUpdateVisible(true);
            return;
          }
          const appDone=!app||!['idle','checking'].includes(app.status);
          const uiDone=!ui||!['idle','checking'].includes(ui.status);
          if(appDone&&uiDone)return;
          await new Promise(resolve=>setTimeout(resolve,750));
        }
      }catch(error){console.warn('DKDS silent startup update check:',error);}
    })();
    return()=>{canceled=true;};
  },[shell.ready,applyVerifiedUiCss]);
  const dismissUpdate=useCallback(()=>{
    updateDismissedThisSession.current=true;
    setUpdateVisible(false);setUpdateAutoPrompt(false);
  },[]);
  const openManualUpdate=useCallback(()=>{
    setUpdateAutoPrompt(false);setUpdateVisible(true);
  },[]);
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
        <UpdateDialog visible={updateVisible} version={installedAppVersion||shell.appVersion||'3.72.2'} palette={palette} autoPrompt={updateAutoPrompt} onClose={dismissUpdate} onUiCss={applyVerifiedUiCss} />
        <ShellActionSheet
          visible={sheet}
          shell={shell}
          palette={palette}
          onAction={sendAction}
          onSheet={setSheet}
          pluginOverflowKeys={pluginOverflowKeys}
          statusOverflowItems={statusOverflowItems}
          onClose={() => setSheet(null)}
          onVersionPress={openManualUpdate}
          installedAppVersion={installedAppVersion}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
