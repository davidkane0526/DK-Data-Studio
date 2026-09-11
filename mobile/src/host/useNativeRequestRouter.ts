import { useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import type { WebViewMessageEvent } from 'react-native-webview';
import { nativeHost } from './protocol';
import type { HostResponse, NativeRequest } from './protocol';

type FileService = {
  openFiles: (request: NativeRequest) => Promise<any[]>;
  registerDocumentUri: (payload: { uri?: string; name?: string; size?: number; mimeType?: string }) => any;
  readFile: (token: string) => Promise<string>;
  openFileRead: (token: string) => Promise<any>;
  readFileReadChunk: (token: string, offset: number, length: number) => Promise<any>;
  closeFileRead: (token: string) => Promise<any>;
  releaseFiles: (tokens: unknown[]) => void;
  shareTextFile: (name: string, content: string, mimeType?: string, existingUri?: string) => Promise<any>;
  shareBase64File: (name: string, rawBase64: string, mimeType?: string, existingUri?: string) => Promise<any>;
};

export function useNativeRequestRouter(
  handleHostProtocolMessage: (req: HostResponse) => boolean,
  resolveWeb: (id: string | undefined, ok: boolean, value: unknown) => void,
  files: FileService,
) {
  return useCallback(async (event: WebViewMessageEvent) => {
    let req: NativeRequest & HostResponse;
    try { req = JSON.parse(event.nativeEvent.data); } catch { return; }

    if (handleHostProtocolMessage(req)) return;

    try {
      if (req.type === 'ready') { resolveWeb(req.id, true, true); return; }
      if (req.type === 'openFiles') { resolveWeb(req.id, true, await files.openFiles(req)); return; }
      if (req.type === 'registerDocumentUri') { resolveWeb(req.id, true, files.registerDocumentUri(req.payload || {})); return; }
      if (req.type === 'readFile') { resolveWeb(req.id, true, await files.readFile(req.payload?.token)); return; }
      if (req.type === 'openFileRead') { resolveWeb(req.id, true, await files.openFileRead(req.payload?.token)); return; }
      if (req.type === 'readFileReadChunk') { resolveWeb(req.id, true, await files.readFileReadChunk(req.payload?.token, req.payload?.offset, req.payload?.length)); return; }
      if (req.type === 'closeFileRead') { resolveWeb(req.id, true, await files.closeFileRead(req.payload?.token)); return; }
      if (req.type === 'openDirectory') {
        const pickTree = nativeHost?.openDocumentTreeExtended || nativeHost?.openDocumentTree;
        resolveWeb(req.id, true, await pickTree?.());
        return;
      }
      if (req.type === 'listDirectory') {
        resolveWeb(req.id, true, await nativeHost?.listDocumentTree?.(String(req.payload?.uri || ''), String(req.payload?.relativePath || '')) || []);
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
        resolveWeb(req.id, true, normalized);
        return;
      }
      if (req.type === 'mcpStatus') { resolveWeb(req.id, true, await nativeHost?.mcpStatus?.() || { running: false }); return; }
      if (req.type === 'mcpStart') { resolveWeb(req.id, true, await nativeHost?.mcpStart?.(String(req.payload?.token || ''))); return; }
      if (req.type === 'mcpStop') { resolveWeb(req.id, true, await nativeHost?.mcpStop?.()); return; }
      if (req.type === 'mcpRespond') { resolveWeb(req.id, true, await nativeHost?.mcpRespond?.(String(req.payload?.id || ''), req.payload?.ok !== false, JSON.stringify(req.payload?.value ?? null))); return; }
      if (req.type === 'releaseFiles') { files.releaseFiles(req.payload?.tokens || []); resolveWeb(req.id, true, true); return; }
      if (req.type === 'copyText') {
        if (req.payload?.nativeIntent?.authorized !== true || req.payload?.nativeIntent?.kind !== 'clipboard') throw new Error('已阻止没有明确复制操作的剪贴板写入。');
        await Clipboard.setStringAsync(String(req.payload?.text ?? '')); resolveWeb(req.id, true, true); return;
      }
      if (req.type === 'saveText') {
        const intent = req.payload?.nativeIntent;
        const directProjectWrite = !!req.payload?.uri && intent?.authorized === true && intent?.directWrite === true && intent?.kind === 'project-direct';
        const explicitSave = intent?.authorized === true && (intent?.kind === 'export' || intent?.kind === 'project');
        if (!directProjectWrite && !explicitSave) throw new Error('已阻止没有明确保存/导出操作的系统保存面板。');
        resolveWeb(req.id, true, await files.shareTextFile(req.payload?.name || 'dkds-export.txt', String(req.payload?.content ?? ''), req.payload?.mimeType, req.payload?.uri));
        return;
      }
      if (req.type === 'saveBase64') {
        if (req.payload?.nativeIntent?.authorized !== true || req.payload?.nativeIntent?.kind !== 'export') throw new Error('已阻止没有明确导出操作的系统保存面板。');
        const raw = String(req.payload?.base64 ?? '').replace(/^data:[^;]+;base64,/, '');
        resolveWeb(req.id, true, await files.shareBase64File(req.payload?.name || 'dkds-export.png', raw, req.payload?.mimeType, req.payload?.uri));
        return;
      }
      if (req.type === 'runtimeStatus') { resolveWeb(req.id, true, await nativeHost?.runtimeStatus?.()); return; }
      if (req.type === 'webStatus') {
        resolveWeb(req.id, true, await nativeHost?.webStatus?.() || { running: false });
        return;
      }
      if (req.type === 'webApplySettings') {
        if (!nativeHost?.webApplySettings) throw new Error('本机网页版设置不可用。');
        resolveWeb(req.id, true, await nativeHost.webApplySettings(!!req.payload?.enabled, !!req.payload?.noKey, Number(req.payload?.port) || 45910));
        return;
      }
      if (req.type === 'webRegenerateKey') {
        if (!nativeHost?.webRegenerateKey) throw new Error('本机网页版配对 Key 不可用。');
        resolveWeb(req.id, true, await nativeHost.webRegenerateKey());
        return;
      }
      if (req.type === 'webStart' || req.type === 'webOpen') {
        if (!nativeHost?.startWebVersion) throw new Error('本机网页版服务不可用。');
        resolveWeb(req.id, true, await nativeHost.startWebVersion(req.type === 'webOpen'));
        return;
      }
      if (req.type === 'webStop') { resolveWeb(req.id, true, await nativeHost?.stopWebVersion?.()); return; }
      resolveWeb(req.id, false, `Unsupported native request: ${req.type}`);
    } catch (error: any) {
      resolveWeb(req.id, false, error?.message || String(error));
    }
  }, [files, handleHostProtocolMessage, resolveWeb]);
}
