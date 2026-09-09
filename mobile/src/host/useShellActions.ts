import { useCallback, useRef } from 'react';
import { BackHandler, ToastAndroid } from 'react-native';
import type { RendererShellState } from '../model/shell-types';

type HostRequest = (method: string, payload?: any) => Promise<any>;

export function useShellActions(shell: RendererShellState, hostRequest: HostRequest, openWebService: () => Promise<void>) {
  const lastBackAt = useRef(0);

  const exitAfterUnhandledBack = useCallback(() => {
    const now = Date.now();
    if (now - lastBackAt.current < 1800) BackHandler.exitApp();
    else {
      lastBackAt.current = now;
      ToastAndroid.show('再按一次返回键退出', ToastAndroid.SHORT);
    }
  }, []);

  return useCallback(async (action: string, payload: any = {}) => {
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
      } else if (action === 'import' || action === 'file-open') await hostRequest('command', { id: 'file.open' });
      else if (action === 'file-folder') await hostRequest('command', { id: 'file.folder' });
      else if (action === 'smb-open') await hostRequest('command', { id: 'connectivity.smb.open' });
      else if (action === 'ai-settings') await hostRequest('command', { id: 'connectivity.ai.settings' });
      else if (action === 'ai-chat') await hostRequest('command', { id: 'connectivity.ai.chat' });
      else if (action === 'project-open') await hostRequest('command', { id: 'project.open' });
      else if (action === 'project-save') await hostRequest('command', { id: 'project.save' });
      else if (action === 'project-new') await hostRequest('command', { id: 'project.new' });
      else if (action === 'project-switch') await hostRequest('command', { id: 'project.switch', projectId: payload?.id });
      else if (action === 'project-close') await hostRequest('command', { id: 'project.close', projectId: payload?.id });
      else if (action === 'history-undo') await hostRequest('command', { id: 'project.undo' });
      else if (action === 'history-redo') await hostRequest('command', { id: 'project.redo' });
      else if (action === 'plugins') await hostRequest('command', { id: 'system.plugins' });
      else if (action === 'web-service' || action === 'web-open') await openWebService();
      else if (action === 'theme-toggle') await hostRequest('command', { id: 'theme.toggle' });
      else if (action === 'surface') await hostRequest('surface', { id: payload?.id, activityId: shell.activityId });
      else if (action === 'workspace-action') await hostRequest('action', { id: payload?.id, itemId: payload?.itemId, activityId: shell.activityId });
      else if (action === 'status-item') {
        if (payload?.id === 'lan-web') await openWebService();
        else await hostRequest('status', { pluginId: payload?.pluginId, id: payload?.id, anchor: payload?.anchor });
      }
    } catch (error: any) {
      ToastAndroid.show(error?.message || String(error), ToastAndroid.LONG);
    }
  }, [exitAfterUnhandledBack, hostRequest, openWebService, shell.activities, shell.activityId]);
}
