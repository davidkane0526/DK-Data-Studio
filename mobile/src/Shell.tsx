import React from 'react';
import {
  Animated,
  Modal,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';

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

export type RendererShellState = {
  ready: boolean;
  projectTitle: string;
  activityId: string;
  activityLabel: string;
  status: string;
  theme: 'light' | 'dark';
  activities: ShellActivity[];
  canGoBack: boolean;
  projects?: { id: string; title: string; active?: boolean; dirty?: boolean }[];
  history?: { canUndo?: boolean; canRedo?: boolean; undoLabel?: string; redoLabel?: string; past?: { id: string; label: string; createdAt?: number }[]; future?: { id: string; label: string; createdAt?: number }[] };
  protocol?: number;
  revision?: number;
  route?: { kind?: string; activityId?: string; pluginId?: string; pageId?: string };
  surfaces?: { id: string; label: string; active?: boolean }[];
  actions?: { id: string; label: string; icon?: string; enabled?: boolean; active?: boolean; menu?: boolean; items?: { id: string; label: string; icon?: string; enabled?: boolean }[] }[];
  statusItems?: { pluginId: string; id: string; label: string; icon?: string; side?: 'left' | 'right'; state?: string; disabled?: boolean; clickable?: boolean; title?: string }[];
};

export type ShellSheet = 'projects' | 'activities' | 'actions' | 'history' | 'import' | 'more' | null;

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

type Palette = {
  background: string;
  surface: string;
  surfaceSoft: string;
  surfaceHover: string;
  border: string;
  text: string;
  textSoft: string;
  accent: string;
  accentSoft: string;
  scrim: string;
};

export function paletteFor(theme: RendererShellState['theme']): Palette {
  if (theme === 'dark') {
    return {
      background: '#161b23',
      surface: '#202630',
      surfaceSoft: '#272f3b',
      surfaceHover: '#2d3745',
      border: 'rgba(166,181,202,0.09)',
      text: '#edf2f8',
      textSoft: '#9ca9ba',
      accent: '#4d8dff',
      accentSoft: '#253b61',
      scrim: 'rgba(4, 8, 14, .62)',
    };
  }
  return {
    background: '#eef4fb',
    surface: '#fbfcfe',
    surfaceSoft: '#f2f6fb',
    surfaceHover: '#e9f0f8',
    border: 'rgba(102,132,168,0.14)',
    text: '#1c2a43',
    textSoft: '#6c7b92',
    accent: '#096bfa',
    accentSoft: '#eaf2ff',
    scrim: 'rgba(15, 23, 42, .34)',
  };
}

type HeaderProps = {
  shell: RendererShellState;
  palette: Palette;
  onAction: (action: string, payload?: unknown) => void;
  onSheet: (sheet: Exclude<ShellSheet, null>) => void;
};

function HistoryGlyph({ direction, color }: { direction: 'undo' | 'redo'; color: string }) {
  const flip = direction === 'redo' ? -1 : 1;
  return (
    <View style={[styles.historyGlyphCanvas, { transform: [{ scaleX: flip }] }]} pointerEvents="none">
      <View style={[styles.historyGlyphShaft, { backgroundColor: color }]} />
      <View style={[styles.historyGlyphTurn, { backgroundColor: color }]} />
      <View style={[styles.historyGlyphHeadA, { backgroundColor: color }]} />
      <View style={[styles.historyGlyphHeadB, { backgroundColor: color }]} />
    </View>
  );
}

export function NativeHeader({ shell, palette, onAction, onSheet }: HeaderProps) {
  const { width } = useWindowDimensions();
  const activeProject = (shell.projects || []).find(project => project.active) || (shell.projects || [])[0];
  const directLimit = width >= 700 ? 6 : width >= 480 ? 4 : 3;
  const directRows = [
    ...(shell.surfaces || []).map(row => ({ ...row, kind: 'surface' as const })),
    ...(shell.actions || []).filter(row => !row.menu && row.enabled !== false).map(row => ({ ...row, kind: 'action' as const })),
  ].slice(0, directLimit);
  const hasOverflow = (shell.surfaces || []).length + (shell.actions || []).length > directRows.length;
  return (
    <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
      <View style={styles.unifiedHeaderRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unifiedHeaderContent} style={styles.unifiedHeaderScroller}>
          <View style={styles.projectTabGroup} accessibilityLabel="项目标签区">
            {activeProject ? (
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel={`${activeProject.title}，当前项目，点击管理项目`}
                onPress={() => onSheet('projects')}
                style={({ pressed }) => [styles.projectTab, { borderColor: palette.accent, backgroundColor: palette.accentSoft }, pressed && styles.pressed]}>
                <Text style={[styles.projectTabText, { color: palette.accent }]} numberOfLines={1}>
                  {activeProject.title || '未命名项目'}
                </Text>
                <Text style={[styles.projectChevron, { color: palette.accent }]}>⌄</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="新建项目"
              onPress={() => onAction('project-new')}
              style={({ pressed }) => [styles.projectAdd, { borderColor: palette.border, backgroundColor: palette.surfaceSoft }, pressed && styles.pressed]}>
              <Text style={[styles.projectAddText, { color: palette.accent }]}>＋</Text>
            </Pressable>
          </View>
          <View style={[styles.headerDivider, { backgroundColor: palette.border }]} accessibilityElementsHidden />
          <View style={styles.pluginButtonGroup} accessibilityLabel="插件按钮区">
            {directRows.map(row => (
              <Pressable
              key={`${row.kind}:${row.id}`}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              onPress={() => row.kind === 'surface' ? onAction('surface', { id: row.id }) : onAction('workspace-action', { id: row.id })}
              style={({ pressed }) => [styles.projectAction, { backgroundColor: row.active ? palette.accentSoft : palette.surfaceSoft, borderColor: row.active ? palette.accent : palette.border }, pressed && styles.pressed]}>
              <Text style={[styles.projectActionText, { color: row.active ? palette.accent : palette.text }]} numberOfLines={1}>{row.label}</Text>
              </Pressable>
            ))}
            {hasOverflow ? (
              <Pressable onPress={() => onSheet('actions')} style={({ pressed }) => [styles.projectAction, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }, pressed && styles.pressed]}>
                <Text style={[styles.projectActionText, { color: palette.text }]}>更多 ▾</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
        <View style={styles.headerUtilityGroup}>
          <Pressable
            accessibilityRole="button" accessibilityLabel="撤销" disabled={!shell.history?.canUndo}
            onPress={() => onAction('history-undo')}
            style={[styles.headerHistoryButton, { backgroundColor: palette.surfaceSoft, borderColor: palette.border, opacity: shell.history?.canUndo ? 1 : .38 }]}>
            <HistoryGlyph direction="undo" color={palette.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button" accessibilityLabel="恢复" disabled={!shell.history?.canRedo}
            onPress={() => onAction('history-redo')}
            style={[styles.headerHistoryButton, { backgroundColor: palette.surfaceSoft, borderColor: palette.border, opacity: shell.history?.canRedo ? 1 : .38 }]}>
            <HistoryGlyph direction="redo" color={palette.text} />
          </Pressable>
          {!shell.activities.find(row => row.id === shell.activityId)?.system ? (
            <Pressable
              accessibilityRole="button" accessibilityLabel="打开数据与参数"
              onPress={() => onAction('panel', { name: 'left' })}
              style={[styles.headerPanelButton, { backgroundColor: palette.accentSoft }]}>
              <Text style={[styles.headerPanelButtonText, { color: palette.accent }]}>数据 / 参数</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

type NavigationProps = {
  shell: RendererShellState;
  palette: Palette;
  onAction: (action: string, payload?: unknown) => void;
  onSheet: (sheet: Exclude<ShellSheet, null>) => void;
};

type NavigationId = 'home' | 'activities' | 'import' | 'data' | 'more';
type NavigationItem = { id: NavigationId; label: string; glyph: string; primary?: boolean };

const navigationItems: readonly NavigationItem[] = [
  { id: 'home', label: '工作区', glyph: '⌂' },
  { id: 'activities', label: '分析', glyph: '⌁' },
  { id: 'import', label: '导入', glyph: '＋', primary: true },
  { id: 'data', label: '数据', glyph: '▦' },
  { id: 'more', label: '更多', glyph: '•••' },
];

function invokeNavigation(
  id: NavigationId,
  onAction: NavigationProps['onAction'],
  onSheet: NavigationProps['onSheet'],
) {
  if (id === 'activities' || id === 'import' || id === 'more') onSheet(id);
  else onAction(id);
}

export function BottomNavigation({ shell, palette, onAction, onSheet }: NavigationProps) {
  return (
    <View style={[styles.bottomNavFrame, { borderTopColor: palette.border }]}>
      <BlurView
        intensity={22}
        tint={shell.theme === 'dark' ? 'dark' : 'light'}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.bottomNav, { backgroundColor: shell.theme === 'dark' ? 'rgba(26,32,42,.68)' : 'rgba(248,251,255,.68)' }]}>
      {navigationItems.map(item => {
        const active = item.id === 'home' && !shell.canGoBack;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => invokeNavigation(item.id, onAction, onSheet)}
            style={({ pressed }) => [
              styles.navItem,
              item.primary && styles.navItemPrimaryWrap,
              pressed && styles.pressed,
            ]}>
            <View
              style={[
                styles.navGlyphWrap,
                item.primary && { backgroundColor: palette.accent },
                active && !item.primary && { backgroundColor: palette.accentSoft },
              ]}>
              <Text
                style={[
                  styles.navGlyph,
                  { color: item.primary ? '#fff' : active ? palette.accent : palette.textSoft },
                  item.id === 'more' && styles.moreGlyph,
                ]}>
                {item.glyph}
              </Text>
            </View>
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

export function NativeStatusBar({ shell, palette, onAction, webService }: Pick<NavigationProps, 'shell' | 'palette' | 'onAction'> & { webService?: NativeWebServiceState }) {
  const items = shell.statusItems || [];
  return (
    <View style={[styles.nativeStatusBar, { backgroundColor: palette.surface, borderTopColor: palette.border }]}>
      <Text style={[styles.nativeStatusMessage, { color: palette.textSoft }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{shell.status || '就绪'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nativeStatusScroller} contentContainerStyle={styles.nativeStatusItems}>
        {items.map(item => (
          <Pressable key={`${item.pluginId}:${item.id}`} disabled={item.disabled || !item.clickable} onPress={() => onAction('status-item', { pluginId: item.pluginId, id: item.id })} style={styles.nativeStatusItem}>
            {item.icon ? <Text style={[styles.nativeStatusIcon, { color: palette.accent }]}>{item.icon}</Text> : null}
            <Text style={[styles.nativeStatusLabel, { color: item.state === 'error' ? '#c95a55' : palette.textSoft }]} numberOfLines={1}>{item.label}</Text>
          </Pressable>
        ))}
        {webService ? (
          <Pressable onPress={() => onAction('web-service')} style={styles.nativeStatusItem} accessibilityLabel="本机网页服务">
            <Text style={[styles.nativeStatusIcon, { color: webService.error ? '#c95a55' : webService.running ? '#2f9d62' : palette.textSoft }]}>●</Text>
            <Text style={[styles.nativeStatusLabel, { color: webService.error ? '#c95a55' : palette.textSoft }]} numberOfLines={1}>{webService.error ? '网页服务 异常' : webService.running ? '网页服务 已开启' : '网页服务 已关闭'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function NavigationRail({ shell, palette, onAction, onSheet }: NavigationProps) {
  return (
    <View style={[styles.rail, { backgroundColor: palette.surface, borderRightColor: palette.border }]}>
      <View style={[styles.railBrand, { backgroundColor: palette.accent }]}>
        <Text style={styles.railBrandText}>DK</Text>
      </View>
      {!shell.activities.find(row => row.id === shell.activityId)?.system ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="打开数据与参数"
          onPress={() => onAction('panel', { name: 'left' })}
          style={({ pressed }) => [styles.railPanel, { backgroundColor: palette.accentSoft }, pressed && styles.pressed]}>
          <Text style={[styles.railPanelGlyph, { color: palette.accent }]}>☷</Text>
          <Text style={[styles.railLabel, { color: palette.accent }]}>参数</Text>
        </Pressable>
      ) : null}
      {(shell.actions || []).length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="打开当前分析操作"
          onPress={() => onSheet('actions')}
          style={({ pressed }) => [styles.railPanel, { backgroundColor: palette.accent }, pressed && styles.pressed]}>
          <Text style={[styles.railPanelGlyph, { color: '#fff' }]}>▶</Text>
          <Text style={[styles.railLabel, { color: '#fff' }]}>操作</Text>
        </Pressable>
      ) : null}
      {navigationItems.map(item => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          onPress={() => invokeNavigation(item.id, onAction, onSheet)}
          style={({ pressed }) => [styles.railItem, pressed && styles.pressed]}>
          <Text style={[styles.railGlyph, { color: item.primary ? palette.accent : palette.textSoft }]}>
            {item.glyph}
          </Text>
          <Text style={[styles.railLabel, { color: palette.textSoft }]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

type SheetProps = NavigationProps & {
  visible: ShellSheet;
  onClose: () => void;
};

function SheetAction({
  label,
  detail,
  glyph,
  palette,
  onPress,
}: {
  label: string;
  detail?: string;
  glyph: string;
  palette: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetAction,
        { backgroundColor: palette.surfaceSoft, borderColor: palette.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.sheetActionGlyph, { backgroundColor: palette.accentSoft }]}>
        <Text style={[styles.sheetActionGlyphText, { color: palette.accent }]}>{glyph}</Text>
      </View>
      <View style={styles.sheetActionCopy}>
        <Text style={[styles.sheetActionLabel, { color: palette.text }]}>{label}</Text>
        {detail ? <Text style={[styles.sheetActionDetail, { color: palette.textSoft }]}>{detail}</Text> : null}
      </View>
      <Text style={[styles.chevron, { color: palette.textSoft }]}>›</Text>
    </Pressable>
  );
}

function ProjectRow({ project, palette, onSwitch, onDelete }: {
  project: { id: string; title: string; active?: boolean; dirty?: boolean };
  palette: Palette;
  onSwitch: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onSwitch}
      style={({ pressed }) => [styles.projectDrawerRow, { backgroundColor: project.active ? palette.accentSoft : palette.surfaceSoft, borderColor: project.active ? palette.accent : palette.border }, pressed && styles.pressed]}>
      <View style={[styles.projectStateDot, { borderColor: palette.accent, backgroundColor: project.active ? palette.accent : 'transparent' }]} />
      <View style={styles.projectDrawerCopy}>
        <Text style={[styles.projectDrawerTitle, { color: palette.text }]} numberOfLines={1}>{project.title || '未命名项目'}</Text>
        <Text style={[styles.projectDrawerDetail, { color: palette.textSoft }]}>{project.active ? '当前项目' : project.dirty ? '有未保存修改' : '点击切换'}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`删除项目 ${project.title}`}
        hitSlop={8}
        onPress={(event) => { event.stopPropagation(); onDelete(); }}
        style={({ pressed }) => [styles.projectDeleteIcon, { backgroundColor: pressed ? palette.surfaceHover : 'transparent' }]}>
        <Text style={[styles.projectDeleteIconText, { color: palette.textSoft }]}>×</Text>
      </Pressable>
    </Pressable>
  );
}

function ProjectDrawer({ shell, palette, onAction, onClose }: Pick<SheetProps, 'shell' | 'palette' | 'onAction' | 'onClose'>) {
  const run = (action: string, payload?: unknown, close = true) => { if (close) onClose(); onAction(action, payload); };
  const slide = React.useRef(new Animated.Value(-380)).current;
  React.useEffect(() => {
    Animated.timing(slide, { toValue: 0, duration: 210, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [slide]);
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.projectDrawerModal, { backgroundColor: palette.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="关闭项目管理" />
        <Animated.View style={[styles.projectDrawer, { backgroundColor: palette.surface, borderRightColor: palette.border, transform: [{ translateX: slide }] }]}>
          <View style={styles.projectDrawerHead}>
            <View>
              <Text style={[styles.projectDrawerHeading, { color: palette.text }]}>项目管理</Text>
              <Text style={[styles.projectDrawerSubheading, { color: palette.textSoft }]}>切换项目；× 删除前会提醒保存</Text>
            </View>
            <Pressable onPress={onClose} style={styles.projectDrawerClose}><Text style={[styles.closeButtonText, { color: palette.textSoft }]}>×</Text></Pressable>
          </View>
          <View style={styles.projectQuickActions}>
            <Pressable onPress={() => run('project-new')} style={[styles.projectQuickButton, { borderColor: palette.border, backgroundColor: palette.accentSoft }]}><Text style={[styles.projectQuickButtonText, { color: palette.accent }]}>＋ 新建</Text></Pressable>
            <Pressable onPress={() => run('project-open')} style={[styles.projectQuickButton, { borderColor: palette.border, backgroundColor: palette.surfaceSoft }]}><Text style={[styles.projectQuickButtonText, { color: palette.text }]}>读取</Text></Pressable>
            <Pressable onPress={() => run('project-save')} style={[styles.projectQuickButton, { borderColor: palette.border, backgroundColor: palette.surfaceSoft }]}><Text style={[styles.projectQuickButtonText, { color: palette.text }]}>保存</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.projectDrawerList} showsVerticalScrollIndicator={false}>
            {(shell.projects || []).map(project => (
              <ProjectRow key={project.id} project={project} palette={palette} onSwitch={() => run('project-switch', { id: project.id })} onDelete={() => run('project-close', { id: project.id }, true)} />
            ))}
            {!(shell.projects || []).length ? <Text style={[styles.emptyText, { color: palette.textSoft }]}>当前没有项目标签。</Text> : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function WebServicePopover({ visible, state, palette, onClose, onAction }: {
  visible: boolean;
  state: NativeWebServiceState;
  palette: Palette;
  onClose: () => void;
  onAction: (action: 'start' | 'open' | 'stop' | 'copy' | 'apply' | 'regenerate', payload?: any) => void;
}) {
  const [enabled, setEnabled] = React.useState(state.enabled ?? true);
  const [noKey, setNoKey] = React.useState(!!state.noKey);
  const [portText, setPortText] = React.useState(String(state.port || 45910));
  React.useEffect(() => {
    if (!visible) return;
    setEnabled(state.enabled ?? state.running ?? true);
    setNoKey(!!state.noKey);
    setPortText(String(state.port || 45910));
  }, [visible, state.enabled, state.noKey, state.port, state.running]);
  if (!visible) return null;
  const addresses = (state.urls || []).filter(Boolean);
  const primaryAddress = addresses[0] || state.url || '';
  const apply = () => onAction('apply', { enabled, noKey, port: Number(portText) || 45910 });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.webPopoverModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="关闭网页服务面板" />
        <View style={[styles.webPopoverCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.webPopoverHead}>
            <View style={[styles.webStatusDot, { backgroundColor: state.running ? '#2f9d62' : state.error ? '#cf5b55' : '#98a2b3' }]} />
            <View style={styles.webPopoverHeadCopy}>
              <Text style={[styles.webPopoverTitle, { color: palette.text }]}>局域网网页版</Text>
              <Text style={[styles.webPopoverState, { color: palette.textSoft }]}>{state.busy ? '正在应用设置…' : state.running ? `运行中 · ${state.pairedClients || 0} 个已配对会话` : state.error ? '启动失败' : '服务未启动'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.webPopoverClose}><Text style={[styles.closeButtonText, { color: palette.textSoft }]}>×</Text></Pressable>
          </View>

          <View style={styles.webSettingRow}>
            <View style={styles.webSettingCopy}><Text style={[styles.webSettingLabel, { color: palette.text }]}>启用网页服务</Text><Text style={[styles.webSettingHint, { color: palette.textSoft }]}>允许同一局域网设备访问 Studio</Text></View>
            <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: palette.border, true: palette.accentSoft }} thumbColor={enabled ? palette.accent : '#a4adba'} />
          </View>
          <View style={styles.webSettingRow}>
            <View style={styles.webSettingCopy}><Text style={[styles.webSettingLabel, { color: palette.text }]}>无需配对 Key</Text><Text style={[styles.webSettingHint, { color: palette.textSoft }]}>关闭后访问设备需要输入 4 位 Key</Text></View>
            <Switch value={noKey} onValueChange={setNoKey} trackColor={{ false: palette.border, true: palette.accentSoft }} thumbColor={noKey ? palette.accent : '#a4adba'} />
          </View>
          <View style={styles.webPortRow}>
            <Text style={[styles.webSettingLabel, { color: palette.text }]}>端口</Text>
            <TextInput value={portText} onChangeText={value => setPortText(value.replace(/[^0-9]/g, '').slice(0, 5))} keyboardType="number-pad" style={[styles.webPortInput, { color: palette.text, backgroundColor: palette.surfaceSoft, borderColor: palette.border }]} selectTextOnFocus />
            {!noKey ? <Pressable onPress={() => onAction('regenerate')} style={[styles.webKeyButton, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}><Text style={[styles.webKeyText, { color: palette.text }]}>Key {state.key || '----'}</Text><Text style={[styles.webKeyRefresh, { color: palette.accent }]}>↻</Text></Pressable> : null}
          </View>

          {primaryAddress ? (
            <View style={styles.webAddressBox}>
              <Text style={[styles.webAddressLabel, { color: palette.textSoft }]}>局域网地址</Text>
              <Pressable onPress={() => onAction('copy')}><Text style={[styles.webPopoverUrl, { color: palette.accent }]} numberOfLines={1}>{primaryAddress}</Text></Pressable>
              {addresses.length > 1 ? <Text style={[styles.webMoreAddresses, { color: palette.textSoft }]} numberOfLines={2}>{addresses.slice(1).join('   ')}</Text> : null}
            </View>
          ) : <Text style={[styles.webNoAddress, { color: palette.textSoft }]}>启动后会显示 Wi‑Fi / 以太网局域网地址，不对外显示 127.0.0.1。</Text>}
          {state.error ? <Text style={styles.webPopoverError}>{state.error}</Text> : null}

          <View style={styles.webPopoverActions}>
            <Pressable disabled={state.busy} onPress={apply} style={[styles.webPopoverPrimary, { backgroundColor: palette.accent, opacity: state.busy ? .5 : 1 }]}><Text style={styles.webPopoverPrimaryText}>{enabled ? '应用并启动' : '应用设置'}</Text></Pressable>
            {state.running ? <Pressable disabled={state.busy} onPress={() => onAction('open')} style={[styles.webPopoverSecondary, { borderColor: palette.border }]}><Text style={[styles.webPopoverSecondaryText, { color: palette.text }]}>本机浏览器</Text></Pressable> : null}
            {state.running ? <Pressable disabled={state.busy} onPress={() => onAction('stop')} style={[styles.webPopoverSecondarySmall, { borderColor: palette.border }]}><Text style={[styles.webPopoverSecondaryText, { color: palette.text }]}>停止</Text></Pressable> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ShellActionSheet({ visible, shell, palette, onAction, onSheet, onClose }: SheetProps) {
  if (visible === 'projects') return <ProjectDrawer shell={shell} palette={palette} onAction={onAction} onClose={onClose} />;
  const run = (action: string, payload?: unknown) => {
    onClose();
    onAction(action, payload);
  };

  return (
    <Modal visible={visible !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.modalRoot, { backgroundColor: palette.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="关闭操作面板" />
        <View style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={[styles.sheetHandle, { backgroundColor: palette.border }]} />
          <View style={styles.sheetHeading}>
            <View>
              <Text style={[styles.sheetTitle, { color: palette.text }]}> 
                {visible === 'activities' ? '分析工作区' : visible === 'actions' ? '当前项目按钮' : visible === 'history' ? '操作历史' : visible === 'import' ? '文件' : '更多'}
              </Text>
              <Text style={[styles.sheetSubtitle, { color: palette.textSoft }]}> 
                {visible === 'activities' ? '入口来自当前已启用插件' : visible === 'actions' ? shell.activityLabel : visible === 'history' ? shell.projectTitle : visible === 'import' ? '由 Studio 自动识别数据、工程与可读取文件夹' : '插件、网页服务与外观'}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="关闭" onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: palette.textSoft }]}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {visible === 'activities' ? (
              shell.activities.length ? <>
                {shell.activities.map(activity => (
                  <SheetAction
                    key={activity.id}
                    glyph={activity.icon || (activity.isSuper ? '◆' : '◇')}
                    label={activity.label || activity.id}
                    detail={activity.system ? '系统工作区' : activity.isSuper ? '默认工作区' : activity.pluginId}
                    palette={palette}
                    onPress={() => run('activity', { id: activity.id })}
                  />
                ))}
                {(shell.surfaces || []).length ? (
                  <Text style={[styles.surfaceHeading, { color: palette.textSoft }]}>当前工作区页面与面板</Text>
                ) : null}
                {(shell.surfaces || []).map(surface => (
                  <SheetAction
                    key={surface.id}
                    glyph={surface.active ? '●' : '○'}
                    label={surface.label || surface.id}
                    detail={surface.active ? '当前显示' : '在当前工作区打开'}
                    palette={palette}
                    onPress={() => run('surface', { id: surface.id })}
                  />
                ))}
              </> : (
                <Text style={[styles.emptyText, { color: palette.textSoft }]}>当前没有可用的插件工作区。</Text>
              )
            ) : visible === 'actions' ? (
              (shell.actions || []).length || (shell.surfaces || []).length ? <>
                {(shell.surfaces || []).map(surface => (
                  <SheetAction key={`surface:${surface.id}`} glyph={surface.active ? '●' : '○'} label={surface.label} detail={surface.active ? '当前页面或面板' : '打开工作区页面或面板'} palette={palette} onPress={() => run('surface', { id: surface.id })} />
                ))}
                {(shell.actions || []).map(action => action.menu ? (
                  <View key={action.id} style={styles.actionMenuGroup}>
                    <Text style={[styles.surfaceHeading, { color: palette.textSoft }]}>{action.label}</Text>
                    {(action.items || []).map(item => (
                      <SheetAction
                        key={`${action.id}:${item.id}`}
                        glyph={item.icon || '›'}
                        label={item.label || item.id}
                        detail={item.enabled === false ? '当前不可用' : action.label}
                        palette={palette}
                        onPress={() => item.enabled === false ? undefined : run('workspace-action', { id: action.id, itemId: item.id })}
                      />
                    ))}
                  </View>
                ) : (
                  <SheetAction
                    key={action.id}
                    glyph={action.icon || (action.active ? '●' : '○')}
                    label={action.label || action.id}
                    detail={action.enabled === false ? '当前不可用' : shell.activityLabel}
                    palette={palette}
                    onPress={() => action.enabled === false ? undefined : run('workspace-action', { id: action.id })}
                  />
                ))}
              </> : <Text style={[styles.emptyText, { color: palette.textSoft }]}>当前页面没有可用操作。</Text>
            ) : visible === 'import' ? (
              <>
                <SheetAction glyph="□" label="选择文件" detail="优先显示 CSV / DAT / TXT / TSV / JSON 等 Studio 常用数据与工程文件；第三方文件管理器和云盘同样可用" palette={palette} onPress={() => run('file-open')} />
                <SheetAction glyph="▦" label="选择文件夹" detail="Android SAF 树授权；支持 DocumentsProvider 的 NAS / SMB / 云盘应用可直接提供目录" palette={palette} onPress={() => run('file-folder')} />
                <SheetAction glyph="▤" label="Studio SMB" detail="使用 Studio 内置 SMB 文件管理器浏览服务器、共享与目录；自动识别文件类型" palette={palette} onPress={() => run('smb-open')} />
              </>
            ) : visible === 'history' ? (
              <>
                {[...(shell.history?.past || [])].reverse().map((entry, index) => (
                  <SheetAction key={entry.id} glyph={index === 0 ? '●' : '·'} label={entry.label} detail={index === 0 ? '下一步撤销此操作' : '已执行'} palette={palette} onPress={() => undefined} />
                ))}
                {(shell.history?.future || []).map(entry => (
                  <SheetAction key={entry.id} glyph="○" label={entry.label} detail="已撤销，可恢复" palette={palette} onPress={() => undefined} />
                ))}
                {!(shell.history?.past || []).length && !(shell.history?.future || []).length ? <Text style={[styles.emptyText, { color: palette.textSoft }]}>当前项目还没有可回退的操作。</Text> : null}
              </>
            ) : (
              <>
                <SheetAction glyph="⬡" label="插件管理" detail="安装、启用与管理插件；AI Agent / MCP 设置仍在插件服务中" palette={palette} onPress={() => run('plugins')} />
                <SheetAction glyph="↗" label="局域网网页版" detail="服务设置、局域网地址与访问状态" palette={palette} onPress={() => run('web-service')} />
                <SheetAction
                  glyph={shell.theme === 'dark' ? '☀' : '☾'}
                  label={shell.theme === 'dark' ? '切换浅色外观' : '切换深色外观'}
                  detail="原生壳与科学工作区同步"
                  palette={palette}
                  onPress={() => run('theme-toggle')}
                />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 46,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  unifiedHeaderRow: { height: 36, flexDirection: 'row', alignItems: 'stretch', gap: 6 },
  unifiedHeaderScroller: { flex: 1 },
  unifiedHeaderContent: { minWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 7, paddingRight: 2 },
  projectTabGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pluginButtonGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headerDivider: { width: StyleSheet.hairlineWidth, height: 24, marginHorizontal: 1 },
  projectTab: { minWidth: 48, maxWidth: 118, height: 34, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 10, flexShrink: 1 },
  projectTabText: { fontSize: 12, fontWeight: '700' },
  projectChevron: { width: 12, textAlign: 'center', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  projectAdd: { width: 40, height: 34, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  projectAddText: { fontSize: 21, lineHeight: 23, fontWeight: '500' },
  projectAction: { height: 34, minWidth: 76, maxWidth: 150, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  projectActionText: { fontSize: 10, fontWeight: '700' },
  headerUtilityGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerHistoryButton: { width: 32, height: 34, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  historyGlyphCanvas: { width: 15, height: 14, position: 'relative' },
  historyGlyphShaft: { position: 'absolute', left: 3.5, top: 6.3, width: 9, height: 1.2, borderRadius: .6 },
  historyGlyphTurn: { position: 'absolute', right: 2.5, top: 6.3, width: 1.2, height: 4.2, borderRadius: .6 },
  historyGlyphHeadA: { position: 'absolute', left: 2.2, top: 4.0, width: 5, height: 1.2, borderRadius: .6, transform: [{ rotate: '-36deg' }] },
  historyGlyphHeadB: { position: 'absolute', left: 2.2, top: 7.9, width: 5, height: 1.2, borderRadius: .6, transform: [{ rotate: '36deg' }] },
  headerPanelButton: { minHeight: 34, paddingHorizontal: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  headerPanelButtonText: { fontSize: 10, fontWeight: '700' },
  bottomNavFrame: { height: 42, borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  bottomNav: { height: 42, flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 8 },
  navItem: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', minWidth: 52 },
  navItemPrimaryWrap: {},
  navGlyphWrap: { width: 46, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  navGlyph: { fontSize: 18, lineHeight: 20, fontWeight: '600' },
  moreGlyph: { fontSize: 15, letterSpacing: 1 },
  nativeStatusBar: { height: 23, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 11 },
  nativeStatusMessage: { flex: 1, minWidth: 0, fontSize: 10, lineHeight: 14, fontWeight: '400' },
  nativeStatusScroller: { flexGrow: 0, flexShrink: 1, marginLeft: 'auto' },
  nativeStatusItems: { flexGrow: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 17, paddingLeft: 9, paddingRight: 0 },
  nativeStatusItem: { height: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  nativeStatusIcon: { fontSize: 9, fontWeight: '500' },
  nativeStatusLabel: { fontSize: 9.3, lineHeight: 13, fontWeight: '400' },
  rail: {
    width: 62,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 5,
    paddingVertical: 6,
    alignItems: 'stretch',
    gap: 2,
  },
  railBrand: { width: 34, height: 30, borderRadius: 9, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  railBrandText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  railPanel: { minHeight: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 9, marginBottom: 2 },
  railPanelGlyph: { fontSize: 17, fontWeight: '700' },
  railItem: { flex: 1, minHeight: 42, maxHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  railGlyph: { fontSize: 18, fontWeight: '600' },
  railLabel: { fontSize: 8, fontWeight: '600', marginTop: 1 },
  pressed: { opacity: .82, transform: [{ scale: .985 }] },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '78%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: StyleSheet.hairlineWidth, paddingBottom: 10 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 4 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, paddingVertical: 10 },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetSubtitle: { fontSize: 10, marginTop: 3, maxWidth: 290 },
  closeButton: { marginLeft: 'auto', width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { fontSize: 25, fontWeight: '300' },
  sheetBody: { paddingHorizontal: 12, paddingBottom: 12, gap: 7 },
  sheetAction: { minHeight: 58, borderWidth: StyleSheet.hairlineWidth, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  sheetActionGlyph: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sheetActionGlyphText: { fontSize: 17, fontWeight: '700' },
  sheetActionCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  sheetActionLabel: { fontSize: 13, fontWeight: '700' },
  sheetActionDetail: { fontSize: 9, marginTop: 3 },
  chevron: { fontSize: 24, fontWeight: '300', marginLeft: 8 },
  emptyText: { paddingVertical: 28, textAlign: 'center', fontSize: 12 },
  surfaceHeading: { fontSize: 10, fontWeight: '700', marginTop: 8, marginBottom: 1, paddingHorizontal: 4 },
  actionMenuGroup: { gap: 7 },
  projectDrawerModal: { flex: 1, alignItems: 'flex-start' },
  projectDrawer: { width: '82%', maxWidth: 350, height: '100%', borderRightWidth: StyleSheet.hairlineWidth, paddingTop: 18 },
  projectDrawerHead: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17 },
  projectDrawerHeading: { fontSize: 17, fontWeight: '700' },
  projectDrawerSubheading: { fontSize: 9.5, marginTop: 4 },
  projectDrawerClose: { marginLeft: 'auto', width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  projectQuickActions: { flexDirection: 'row', gap: 7, paddingHorizontal: 13, paddingBottom: 12 },
  projectQuickButton: { minHeight: 34, flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  projectQuickButtonText: { fontSize: 10.5, fontWeight: '600' },
  projectDrawerList: { paddingHorizontal: 12, paddingBottom: 22, gap: 8 },
    projectDrawerRow: { height: 58, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingLeft: 12, paddingRight: 7, flexDirection: 'row', alignItems: 'center' },
  projectDeleteIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  projectDeleteIconText: { fontSize: 22, lineHeight: 24, fontWeight: '300' },
  projectStateDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.3, marginRight: 11 },
  projectDrawerCopy: { flex: 1, minWidth: 0 },
  projectDrawerTitle: { fontSize: 13, fontWeight: '600' },
  projectDrawerDetail: { fontSize: 9, marginTop: 3 },
  projectDrawerChevron: { fontSize: 23, fontWeight: '300', marginLeft: 8 },
  webPopoverModal: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', paddingRight: 12, paddingBottom: 72 },
  webPopoverCard: { width: 372, maxWidth: '92%', borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, padding: 13, shadowColor: '#000', shadowOpacity: .13, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  webSettingRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 },
  webSettingCopy: { flex: 1, minWidth: 0 },
  webSettingLabel: { fontSize: 10.8, fontWeight: '600' },
  webSettingHint: { fontSize: 8.8, lineHeight: 12, marginTop: 2 },
  webPortRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  webPortInput: { width: 72, height: 33, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 9, fontSize: 11, textAlign: 'center' },
  webKeyButton: { marginLeft: 'auto', minHeight: 33, paddingHorizontal: 9, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  webKeyText: { fontSize: 10, fontWeight: '600', letterSpacing: .4 },
  webKeyRefresh: { fontSize: 13, fontWeight: '700' },
  webAddressBox: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 9, borderRadius: 9 },
  webAddressLabel: { fontSize: 8.7, marginBottom: 3 },
  webMoreAddresses: { fontSize: 8.2, lineHeight: 11.5, marginTop: 3 },
  webNoAddress: { fontSize: 8.8, lineHeight: 12, marginTop: 8 },
  webPopoverHead: { flexDirection: 'row', alignItems: 'center' },
  webStatusDot: { width: 9, height: 9, borderRadius: 5, marginRight: 9 },
  webPopoverHeadCopy: { flex: 1 },
  webPopoverTitle: { fontSize: 13.5, fontWeight: '700' },
  webPopoverState: { fontSize: 9.5, marginTop: 2 },
  webPopoverClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  webPopoverUrl: { fontSize: 9.5, marginTop: 10, padding: 8, borderRadius: 8 },
  webPopoverError: { color: '#c6534d', fontSize: 9.3, lineHeight: 14, marginTop: 8 },
  webPopoverActions: { flexDirection: 'row', gap: 7, marginTop: 11 },
  webPopoverPrimary: { flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  webPopoverPrimaryText: { color: '#fff', fontSize: 10.5, fontWeight: '700' },
  webPopoverSecondarySmall: { minHeight: 38, minWidth: 58, borderWidth: StyleSheet.hairlineWidth, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  webPopoverSecondary: { minWidth: 74, height: 34, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  webPopoverSecondaryText: { fontSize: 10.5, fontWeight: '600' },
});
