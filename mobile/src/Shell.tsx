import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

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
};

export type ShellSheet = 'projects' | 'activities' | 'actions' | 'history' | 'more' | null;

type Palette = {
  background: string;
  surface: string;
  surfaceSoft: string;
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
      border: '#354052',
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
    border: '#d8e5f4',
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

export function NativeHeader({ shell, palette, onAction, onSheet }: HeaderProps) {
  const { width } = useWindowDimensions();
  const longPressedProject = React.useRef('');
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
            {(shell.projects || []).map(project => (
              <Pressable
              key={project.id}
              accessibilityRole="tab"
              accessibilityLabel={`${project.title}${project.active ? '，当前项目' : ''}，长按关闭`}
              onPress={() => {
                if (longPressedProject.current === project.id) { longPressedProject.current = ''; return; }
                project.active ? onSheet('projects') : onAction('project-switch', { id: project.id });
              }}
              onLongPress={() => {
                longPressedProject.current = project.id;
                setTimeout(() => { if (longPressedProject.current === project.id) longPressedProject.current = ''; }, 900);
                onAction('project-close', { id: project.id });
              }}
              delayLongPress={520}
              style={({ pressed }) => [
                styles.projectTab,
                { borderColor: project.active ? palette.accent : palette.border, backgroundColor: project.active ? palette.accentSoft : palette.surfaceSoft },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.projectTabText, { color: project.active ? palette.accent : palette.text }]} numberOfLines={1}>
                {project.title || '未命名项目'}
              </Text>
              </Pressable>
            ))}
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
        {!shell.activities.find(row => row.id === shell.activityId)?.system ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="打开数据与参数"
            onPress={() => onAction('panel', { name: 'left' })}
            style={[styles.headerPanelButton, { backgroundColor: palette.accentSoft }]}>
            <Text style={[styles.headerPanelButtonText, { color: palette.accent }]}>数据 / 参数</Text>
          </Pressable>
        ) : null}
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
  if (id === 'activities' || id === 'more') onSheet(id);
  else onAction(id);
}

export function BottomNavigation({ shell, palette, onAction, onSheet }: NavigationProps) {
  return (
    <View style={[styles.bottomNav, { backgroundColor: palette.surface, borderTopColor: palette.border }]}>
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

export function ShellActionSheet({ visible, shell, palette, onAction, onSheet, onClose }: SheetProps) {
  const run = (action: string, payload?: unknown) => {
    onClose();
    onAction(action, payload);
  };

  return (
    <Modal visible={visible !== null} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.modalRoot, { backgroundColor: palette.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="关闭操作面板" />
        <View style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={[styles.sheetHandle, { backgroundColor: palette.border }]} />
          <View style={styles.sheetHeading}>
            <View>
              <Text style={[styles.sheetTitle, { color: palette.text }]}> 
                {visible === 'projects' ? '项目标签' : visible === 'activities' ? '分析工作区' : visible === 'actions' ? '当前项目按钮' : visible === 'history' ? '操作历史' : '项目与应用'}
              </Text>
              <Text style={[styles.sheetSubtitle, { color: palette.textSoft }]}> 
                {visible === 'projects' ? '点击切换，长按顶部标签可关闭' : visible === 'activities' ? '入口来自当前已启用插件' : visible === 'actions' ? shell.activityLabel : visible === 'history' ? shell.projectTitle : shell.status || 'DK Data Studio Android'}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="关闭" onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: palette.textSoft }]}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {visible === 'projects' ? (
              (shell.projects || []).map(project => (
                <SheetAction key={project.id} glyph={project.active ? '●' : '○'} label={project.title} detail={project.active ? '当前项目' : '点击切换'} palette={palette} onPress={() => run('project-switch', { id: project.id })} />
              ))
            ) : visible === 'activities' ? (
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
            ) : visible === 'history' ? (
              <>
                <View style={styles.historyActions}>
                  <Pressable disabled={!shell.history?.canUndo} onPress={() => run('history-undo')} style={({ pressed }) => [styles.historyButton, { borderColor: palette.border, backgroundColor: palette.surfaceSoft, opacity: shell.history?.canUndo ? 1 : .45 }, pressed && styles.pressed]}><Text style={[styles.historyButtonText, { color: palette.text }]}>撤销</Text></Pressable>
                  <Pressable disabled={!shell.history?.canRedo} onPress={() => run('history-redo')} style={({ pressed }) => [styles.historyButton, { borderColor: palette.border, backgroundColor: palette.surfaceSoft, opacity: shell.history?.canRedo ? 1 : .45 }, pressed && styles.pressed]}><Text style={[styles.historyButtonText, { color: palette.text }]}>重做</Text></Pressable>
                </View>
                {[...(shell.history?.past || [])].reverse().map((entry, index) => (
                  <SheetAction key={entry.id} glyph={index === 0 ? '↶' : '·'} label={entry.label} detail={index === 0 ? '下一步撤销此操作' : '已执行'} palette={palette} onPress={() => undefined} />
                ))}
                {(shell.history?.future || []).map(entry => (
                  <SheetAction key={entry.id} glyph="↷" label={entry.label} detail="已撤销，可重做" palette={palette} onPress={() => undefined} />
                ))}
                {!(shell.history?.past || []).length && !(shell.history?.future || []).length ? <Text style={[styles.emptyText, { color: palette.textSoft }]}>当前项目还没有可回退的操作。</Text> : null}
              </>
            ) : (
              <>
                <SheetAction glyph="□" label="读取项目" detail="从 Android 文档选择器打开" palette={palette} onPress={() => run('project-open')} />
                <SheetAction glyph="↓" label="保存 / 分享项目" detail={shell.projectTitle} palette={palette} onPress={() => run('project-save')} />
                <SheetAction glyph="＋" label="新建项目标签" detail="保留当前项目并创建独立标签" palette={palette} onPress={() => run('project-new')} />
                <SheetAction glyph="↶" label="操作历史" detail={shell.history?.undoLabel ? `可撤销：${shell.history.undoLabel}` : '查看撤销与重做记录'} palette={palette} onPress={() => { onClose(); onSheet('history'); }} />
                <SheetAction glyph="⬡" label="插件管理" detail="启用、停用与诊断内置插件" palette={palette} onPress={() => run('plugins')} />
                <SheetAction glyph="↗" label="在浏览器打开网页版" detail="启动本机独立网页服务，不复用原生壳界面" palette={palette} onPress={() => run('web-open')} />
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
  projectTab: { minWidth: 92, maxWidth: 190, height: 34, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', paddingHorizontal: 12 },
  projectTabText: { fontSize: 12, fontWeight: '700' },
  projectAdd: { width: 40, height: 34, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  projectAddText: { fontSize: 21, lineHeight: 23, fontWeight: '500' },
  projectAction: { height: 34, minWidth: 76, maxWidth: 150, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  projectActionText: { fontSize: 10, fontWeight: '700' },
  headerPanelButton: { minHeight: 34, paddingHorizontal: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  headerPanelButtonText: { fontSize: 10, fontWeight: '700' },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 26,
    zIndex: 40,
    height: 50,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 8,
  },
  navItem: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', minWidth: 52 },
  navItemPrimaryWrap: {},
  navGlyphWrap: { width: 50, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  navGlyph: { fontSize: 20, lineHeight: 23, fontWeight: '600' },
  moreGlyph: { fontSize: 15, letterSpacing: 1 },
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
  pressed: { opacity: .62, transform: [{ scale: .98 }] },
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
  historyActions: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  historyButton: { flex: 1, height: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  historyButtonText: { fontSize: 13, fontWeight: '700' },
});
