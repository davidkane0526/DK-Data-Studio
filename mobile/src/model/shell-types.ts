export type ShellActivity = {
  id: string;
  label: string;
  icon?: string;
  pluginId?: string;
  role?: string;
  isSuper?: boolean;
  system?: boolean;
  primary?: { id: string; label: string };
  primes?: { id: string; label: string; role: 'prime' }[];
  subs?: { id: string; label: string; role: 'sub' }[];
};

export type ShellSurface = {
  id: string;
  surfaceId?: string;
  label: string;
  kind?: 'primary' | 'prime' | 'sub' | string;
  role?: string;
  semanticKind?: string;
  presentationPurpose?: string;
  priority?: number;
  collapsible?: boolean;
  active?: boolean;
  presentation?: { region?: 'main' | 'drawer' | 'sheet' | 'companion-right' | 'companion-bottom' | 'route' | string; navigation?: 'primary' | 'context' | 'secondary' | string };
};
export type ShellHistoryBranch = {
  canUndo?: boolean; canRedo?: boolean; undoLabel?: string; redoLabel?: string;
  past?: { id?: string; label: string; createdAt?: number; updatedAt?: number }[];
  future?: { id?: string; label: string; createdAt?: number; updatedAt?: number }[];
};

export type RendererShellState = {
  ready: boolean;
  appVersion?: string;
  projectTitle: string;
  activityId: string;
  activityLabel: string;
  status: string;
  theme: 'light' | 'dark';
  themeTokens?: Record<string, string>;
  themeContractVersion?: string;
  themeMaterial?: { base?: Record<string,string|number>; roles?: Record<string,Record<string,string|number>> };
  themeAppearance?: { roles?: Record<string,{surface?:string;border?:string;text?:string}> };
  themeScientific?: { seriesPalette?: string[] };
  activities: ShellActivity[];
  canGoBack: boolean;
  projects?: { id: string; title: string; active?: boolean; dirty?: boolean }[];
  history?: ShellHistoryBranch & { project?: ShellHistoryBranch; workspace?: ShellHistoryBranch };
  protocol?: number;
  revision?: number;
  route?: { kind?: string; activityId?: string; pluginId?: string; pageId?: string; surfaceId?: string; role?: string; region?: string };
  layout?: { profile?: 'compact' | 'wide' | 'expanded' | string; orientation?: 'portrait' | 'landscape' | string; viewport?: { width?: number; height?: number } };
  surfaces?: ShellSurface[];
  actions?: { id: string; label: string; icon?: string; enabled?: boolean; active?: boolean; variant?: string; menu?: boolean; items?: { id: string; label: string; icon?: string; enabled?: boolean }[] }[];
  statusItems?: { pluginId: string; id: string; label: string; icon?: string; side?: 'left' | 'right'; state?: string; disabled?: boolean; clickable?: boolean; title?: string; activityId?: string }[];
};


export type NativeStatusOverflowRow = {
  key: string;
  id: string;
  pluginId?: string;
  label: string;
  icon?: string;
  state?: string;
  disabled?: boolean;
  clickable?: boolean;
  title?: string;
  synthetic?: 'web-service' | 'history';
};

export type ShellSheet = 'projects' | 'activities' | 'actions' | 'history' | 'import' | 'status-overflow' | null;

export type NativeWebServiceState = {
  running: boolean;
  url: string;
  error?: string;
  busy?: boolean;
  enabled?: boolean;
  noKey?: boolean;
  port?: number;
  key?: string;
  urls?: string[];
  localhostUrl?: string;
  browserUrl?: string;
  pairedClients?: number;
};
