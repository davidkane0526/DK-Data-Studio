import { useCallback, useRef } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { mimeFromName, nativeHost, safeName } from './protocol';
import type { NativeFile, NativeRequest } from './protocol';

export function useNativeFileService() {
  const nativeFiles = useRef(new Map<string, NativeFile>());

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

  const registerDocumentUri = useCallback((payload: { uri?: string; name?: string; size?: number; mimeType?: string }) => {
    const uri=String(payload?.uri||'').trim();if(!uri)throw new Error('文档 URI 无效。');
    const name=String(payload?.name||'document'),size=Math.max(0,Number(payload?.size)||0),mimeType=String(payload?.mimeType||'');
    const token=`file-${Date.now()}-${Math.random().toString(36).slice(2)}`;nativeFiles.current.set(token,{uri,name,size,mimeType});
    return {path:`nativefile://${token}/${encodeURIComponent(name)}`,token,name,size,mimeType};
  }, []);

  const readFile = useCallback(async (token: string) => {
    const file = nativeFiles.current.get(String(token || ''));
    if (!file) throw new Error('文件会话已失效，请重新选择文件。');
    if (nativeHost?.readDocument) return nativeHost.readDocument(file.uri);
    return FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
  }, []);

  const openFileRead = useCallback(async (token: string) => {
    const file=nativeFiles.current.get(String(token||''));if(!file)throw new Error('文件会话已失效，请重新选择文件。');
    if(!nativeHost?.openDocumentRead)throw new Error('Android bounded read session is unavailable.');
    return nativeHost.openDocumentRead(file.uri,Number(file.size)||0);
  }, []);

  const readFileReadChunk = useCallback(async (token: string, offsetValue: number, lengthValue: number) => {
    if(!nativeHost?.readDocumentReadChunk)throw new Error('Android bounded read session is unavailable.');
    const offset=Math.max(0,Math.floor(Number(offsetValue)||0)),length=Math.max(1,Math.min(512*1024,Math.floor(Number(lengthValue)||0)));
    return nativeHost.readDocumentReadChunk(String(token||''),offset,length);
  }, []);

  const closeFileRead = useCallback(async (token: string) => {
    if(!nativeHost?.closeDocumentRead)return false;
    return nativeHost.closeDocumentRead(String(token||''));
  }, []);

  const releaseFiles = useCallback((tokens: unknown[]) => {
    for (const token of tokens || []) nativeFiles.current.delete(String(token));
  }, []);

  const resetNativeFiles = useCallback(() => {
    nativeFiles.current.clear();
  }, []);

  return { openFiles, registerDocumentUri, readFile, openFileRead, readFileReadChunk, closeFileRead, releaseFiles, resetNativeFiles, shareTextFile, shareBase64File };
}
