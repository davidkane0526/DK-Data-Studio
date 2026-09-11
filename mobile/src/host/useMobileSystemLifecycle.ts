import { useEffect } from 'react';
import { AppState, BackHandler } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import type { ShellSheet } from '../model/shell-types';
import type { AppStateStatus } from 'react-native';

type SendAction = (action: string, payload?: any) => Promise<void>;

export function useMobileSystemLifecycle(options: {
  sheet: ShellSheet;
  setSheet: React.Dispatch<React.SetStateAction<ShellSheet>>;
  shellReady: boolean;
  sendAction: SendAction;
  publishLifecycle: (state: AppStateStatus) => void;
  refreshWebService: () => Promise<any>;
  clearLifecycleTimers: () => void;
}) {
  const { sheet, setSheet, shellReady, sendAction, publishLifecycle, refreshWebService, clearLifecycleTimers } = options;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) {
        setSheet(null);
        return true;
      }
      if (shellReady) {
        void sendAction('back');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [sendAction, setSheet, sheet, shellReady]);

  useEffect(() => {
    NavigationBar.setHidden(true);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        NavigationBar.setHidden(true);
        void refreshWebService();
      }
      publishLifecycle(state);
    });
    return () => {
      subscription.remove();
      clearLifecycleTimers();
    };
  }, [clearLifecycleTimers, publishLifecycle, refreshWebService]);
}
