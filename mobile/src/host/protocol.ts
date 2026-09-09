import { NativeModules } from 'react-native';
import type { NativeWebServiceState, RendererShellState } from '../model/shell-types';

export type NativeRequest = {
  id?: string;
  type?: string;
  payload?: any;
};

export type HostResponse = {
  channel?: string;
  kind?: 'response' | 'event';
  id?: string;
  ok?: boolean;
  value?: unknown;
  error?: string;
  event?: string;
  payload?: unknown;
};

export type NativeFile = {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
};

export type DkdsNativeHostApi = {
  openDocuments?: (types: string[], multiple: boolean) => Promise<NativeFile[]>;
  openDocumentsExtended?: (types: string[], multiple: boolean) => Promise<NativeFile[]>;
  openDocumentTree?: () => Promise<{ uri: string; name?: string; persistable?: boolean } | null>;
  openDocumentTreeExtended?: () => Promise<{ uri: string; name?: string; persistable?: boolean } | null>;
  listDocumentTree?: (uri: string, relativePath: string) => Promise<any[]>;
  readDocument?: (uri: string) => Promise<string>;
  smbDiscover?: () => Promise<any[]>;
  smbListShares?: (connection: any) => Promise<string[]>;
  smbList?: (connection: any, path: string) => Promise<any[]>;
  smbRead?: (connection: any, paths: string[]) => Promise<any[]>;
  agentGetSecret?: (key: string) => Promise<string>;
  agentSetSecret?: (key: string, value: string) => Promise<boolean>;
  agentHttpJson?: (endpoint: string, headersJson: string, bodyJson: string, timeoutMs: number) => Promise<any>;
  mcpStatus?: () => Promise<any>;
  mcpStart?: (token: string) => Promise<any>;
  mcpStop?: () => Promise<any>;
  mcpRespond?: (id: string, ok: boolean, value: string) => Promise<boolean>;
  createDocument?: (name: string, mimeType: string, content: string, encoding: 'utf8' | 'base64') => Promise<string | null>;
  writeDocument?: (uri: string, content: string, encoding: 'utf8' | 'base64') => Promise<string>;
  webStatus?: () => Promise<NativeWebServiceState>;
  webApplySettings?: (enabled: boolean, noKey: boolean, port: number) => Promise<NativeWebServiceState>;
  webRegenerateKey?: () => Promise<NativeWebServiceState>;
  runtimeStatus?: () => Promise<{ runtime?: string; platform?: string; processCount?: number; memory?: Record<string, number>; components?: any[] }>;
  startWebVersion?: (openBrowser: boolean) => Promise<string>;
  stopWebVersion?: () => Promise<boolean>;
};

export const LOCAL_APP = 'file:///android_asset/dkds/index.html?reactNative=1';
export const HOST_CHANNEL = 'dkds.mobile-host.v1';
export const nativeHost = NativeModules.DkdsNativeHost as DkdsNativeHostApi | undefined;

export const EMPTY_SHELL: RendererShellState = {
  ready: false,
  appVersion: '',
  projectTitle: 'DK Data Studio',
  activityId: '',
  activityLabel: '',
  status: '正在载入离线科学工作区…',
  theme: 'light',
  activities: [],
  canGoBack: false,
};

export function safeName(name: string | undefined, fallback: string) {
  return String(name || fallback)
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120) || fallback;
}

export function mimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  return 'text/plain';
}

export function shellState(value: unknown): RendererShellState {
  const row = value && typeof value === 'object' ? value as Partial<RendererShellState> : {};
  return {
    ...EMPTY_SHELL,
    ...row,
    theme: row.theme === 'dark' ? 'dark' : 'light',
    themeTokens: row.themeTokens && typeof row.themeTokens === 'object' ? row.themeTokens as Record<string, string> : {},
    themeContractVersion: typeof row.themeContractVersion === 'string' ? row.themeContractVersion : '',
    themeMaterial: row.themeMaterial && typeof row.themeMaterial === 'object' ? row.themeMaterial as RendererShellState['themeMaterial'] : { base: {}, roles: {} },
    themeAppearance: row.themeAppearance && typeof row.themeAppearance === 'object' ? row.themeAppearance as RendererShellState['themeAppearance'] : { roles: {} },
    themeScientific: row.themeScientific && typeof row.themeScientific === 'object' ? row.themeScientific as RendererShellState['themeScientific'] : { seriesPalette: [] },
    activities: Array.isArray(row.activities) ? row.activities : [],
    surfaces: Array.isArray(row.surfaces) ? row.surfaces : [],
    actions: Array.isArray(row.actions) ? row.actions : [],
    statusItems: Array.isArray(row.statusItems) ? row.statusItems : [],
  };
}
