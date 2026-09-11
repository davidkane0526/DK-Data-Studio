import React from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStatusOverflowRow, RendererShellState, ShellHistoryBranch, ShellSheet } from '../model/shell-types';
import { navigableSurfaces, surfaceDetail, surfaceRequestId } from '../model/shell-model';
import type { Palette } from '../theme/palette';
import { shellStyles } from '../styles/shell-styles';

export type SheetProps = {
  shell: RendererShellState;
  palette: Palette;
  onAction: (action: string, payload?: unknown) => void;
  onSheet: (sheet: Exclude<ShellSheet, null>) => void;
  visible: ShellSheet;
  pluginOverflowKeys?: string[];
  statusOverflowItems?: NativeStatusOverflowRow[];
  onClose: () => void;
};

function SheetAction({
  label,
  detail,
  glyph,
  palette,
  onPress,
  primary = false,
}: {
  label: string;
  detail?: string;
  glyph: string;
  palette: Palette;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        shellStyles.sheetAction,
        { backgroundColor: primary ? palette.accent : palette.surfaceSoft, borderColor: primary ? palette.accent : palette.controlBorder },
        pressed && shellStyles.pressed,
      ]}>
      <View style={[shellStyles.sheetActionGlyph, { backgroundColor: primary ? 'transparent' : palette.accentSoft }]}>
        <Text style={[shellStyles.sheetActionGlyphText, { color: primary ? '#ffffff' : palette.accent }]}>{glyph}</Text>
      </View>
      <View style={shellStyles.sheetActionCopy}>
        <Text style={[shellStyles.sheetActionLabel, { color: primary ? '#ffffff' : palette.text }]}>{label}</Text>
        {detail ? <Text style={[shellStyles.sheetActionDetail, { color: primary ? '#ffffff' : palette.textSoft }]}>{detail}</Text> : null}
      </View>
      <Text style={[shellStyles.chevron, { color: primary ? '#ffffff' : palette.textSoft }]}>›</Text>
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
      style={({ pressed }) => [shellStyles.projectDrawerRow, { backgroundColor: project.active ? palette.accentSoft : palette.surfaceSoft, borderColor: project.active ? palette.accent : palette.controlBorder }, pressed && shellStyles.pressed]}>
      <View style={[shellStyles.projectStateDot, { borderColor: palette.accent, backgroundColor: project.active ? palette.accent : 'transparent' }]} />
      <View style={shellStyles.projectDrawerCopy}>
        <Text style={[shellStyles.projectDrawerTitle, { color: palette.text }]} numberOfLines={1}>{project.title || '未命名项目'}</Text>
        <Text style={[shellStyles.projectDrawerDetail, { color: palette.textSoft }]}>{project.active ? '当前项目' : project.dirty ? '有未保存修改' : '点击切换'}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`删除项目 ${project.title}`}
        hitSlop={8}
        onPress={(event) => { event.stopPropagation(); onDelete(); }}
        style={({ pressed }) => [shellStyles.projectDeleteIcon, { backgroundColor: pressed ? palette.surfaceHover : 'transparent' }]}>
        <Text style={[shellStyles.projectDeleteIconText, { color: palette.textSoft }]}>×</Text>
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
      <View style={[shellStyles.projectDrawerModal, { backgroundColor: palette.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="关闭项目管理" />
        <Animated.View style={[shellStyles.projectDrawer, { backgroundColor: palette.surface, borderRightColor: palette.divider, transform: [{ translateX: slide }] }]}>
          <View style={shellStyles.projectDrawerHead}>
            <View>
              <Text style={[shellStyles.projectDrawerHeading, { color: palette.text }]}>项目管理</Text>
              <Text style={[shellStyles.projectDrawerSubheading, { color: palette.textSoft }]}>切换项目；× 删除前会提醒保存</Text>
            </View>
            <Pressable onPress={onClose} style={shellStyles.projectDrawerClose}><Text style={[shellStyles.closeButtonText, { color: palette.textSoft }]}>×</Text></Pressable>
          </View>
          <View style={shellStyles.projectQuickActions}>
            <Pressable onPress={() => run('project-new')} style={[shellStyles.projectQuickButton, { borderColor: palette.controlBorder, backgroundColor: palette.accentSoft }]}><Text style={[shellStyles.projectQuickButtonText, { color: palette.accent }]}>＋ 新建</Text></Pressable>
            <Pressable onPress={() => run('project-open')} style={[shellStyles.projectQuickButton, { borderColor: palette.controlBorder, backgroundColor: palette.surfaceSoft }]}><Text style={[shellStyles.projectQuickButtonText, { color: palette.text }]}>读取</Text></Pressable>
            <Pressable onPress={() => run('project-save')} style={[shellStyles.projectQuickButton, { borderColor: palette.controlBorder, backgroundColor: palette.surfaceSoft }]}><Text style={[shellStyles.projectQuickButtonText, { color: palette.text }]}>保存</Text></Pressable>
          </View>
          <ScrollView style={shellStyles.projectDrawerScroller} contentContainerStyle={shellStyles.projectDrawerList} showsVerticalScrollIndicator={false}>
            {(shell.projects || []).map(project => (
              <ProjectRow key={project.id} project={project} palette={palette} onSwitch={() => run('project-switch', { id: project.id })} onDelete={() => run('project-close', { id: project.id }, true)} />
            ))}
            {!(shell.projects || []).length ? <Text style={[shellStyles.emptyText, { color: palette.textSoft }]}>当前没有项目标签。</Text> : null}
          </ScrollView>
          <Text style={[shellStyles.projectDrawerVersion, { color: palette.textSoft }]}>DK Data Studio v{shell.appVersion || '—'}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function ShellActionSheet({ visible, shell, palette, onAction, onSheet, pluginOverflowKeys = [], statusOverflowItems = [], onClose }: SheetProps) {
  if (visible === 'projects') return <ProjectDrawer shell={shell} palette={palette} onAction={onAction} onClose={onClose} />;
  const run = (action: string, payload?: unknown) => {
    onClose();
    onAction(action, payload);
  };
  const pluginOverflowSet = new Set(pluginOverflowKeys);
  const overflowSurfaces = navigableSurfaces(shell).filter(surface => surface.role !== 'data-control' && pluginOverflowSet.has(`surface:${surface.id}`));
  const overflowActions = (shell.actions || []).filter(action => pluginOverflowSet.has(`${action.menu ? 'menu' : 'action'}:${action.id}`));
  const analysisActivities = shell.activities.filter(activity => {
    const key = `${activity.id}:${activity.pluginId || ''}`.toLowerCase();
    return !activity.system && !key.includes('data-center');
  });
  const historyRows = ([
    { scope: 'project', scopeLabel: '项目', branch: shell.history?.project },
    { scope: 'workspace', scopeLabel: '当前工作区', branch: shell.history?.workspace },
  ] as { scope: string; scopeLabel: string; branch?: ShellHistoryBranch }[]).flatMap(({ scope, scopeLabel, branch }) => {
    const past = [...(branch?.past || [])].reverse().map((entry, index) => ({ scope, scopeLabel, entry, future: false, index }));
    const future = (branch?.future || []).map((entry, index) => ({ scope, scopeLabel, entry, future: true, index }));
    return [...past, ...future];
  }).sort((a, b) => Number(b.entry.updatedAt || b.entry.createdAt || 0) - Number(a.entry.updatedAt || a.entry.createdAt || 0));

  return (
    <Modal visible={visible !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[shellStyles.modalRoot, { backgroundColor: palette.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="关闭操作面板" />
        <View style={[shellStyles.sheet, { backgroundColor: palette.surface, borderColor: palette.divider }]}>
          <View style={[shellStyles.sheetHandle, { backgroundColor: palette.divider }]} />
          <View style={shellStyles.sheetHeading}>
            <View>
              <Text style={[shellStyles.sheetTitle, { color: palette.text }]}> 
                {visible === 'activities' ? '分析工作区' : visible === 'actions' ? '更多插件按钮' : visible === 'history' ? '操作历史' : visible === 'import' ? '文件' : '状态项目'}
              </Text>
              <Text style={[shellStyles.sheetSubtitle, { color: palette.textSoft }]}> 
                {visible === 'activities' ? '仅显示插件分析入口；数据中心保留独立一级入口' : visible === 'actions' ? '仅收纳当前插件超出顶部显示区的按钮' : visible === 'history' ? shell.projectTitle : visible === 'import' ? '由 Studio 自动识别数据、工程与可读取文件夹' : '按优先级收纳底部状态栏项目'}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="关闭" onPress={onClose} style={shellStyles.closeButton}>
              <Text style={[shellStyles.closeButtonText, { color: palette.textSoft }]}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={shellStyles.sheetBody} showsVerticalScrollIndicator={false}>
            {visible === 'activities' ? (
              analysisActivities.length ? <>
                {analysisActivities.map(activity => (
                  <SheetAction
                    key={activity.id}
                    glyph={activity.icon || (activity.isSuper ? '◆' : '◇')}
                    label={activity.label || activity.id}
                    detail={activity.isSuper ? '默认插件工作区' : activity.pluginId}
                    palette={palette}
                    onPress={() => run('activity', { id: activity.id })}
                  />
                ))}
              </> : (
                <Text style={[shellStyles.emptyText, { color: palette.textSoft }]}>当前没有额外的插件分析工作区。</Text>
              )
            ) : visible === 'actions' ? (
              overflowActions.length || overflowSurfaces.length ? <>
                {overflowSurfaces.map(surface => (
                  <SheetAction key={`surface:${surface.id}`} glyph={surface.active ? '●' : '○'} label={surface.label} detail={surfaceDetail(surface)} palette={palette} onPress={() => run('surface', { id: surfaceRequestId(surface) })} />
                ))}
                {overflowActions.map(action => action.menu ? (
                  <View key={action.id} style={shellStyles.actionMenuGroup}>
                    <Text style={[shellStyles.surfaceHeading, { color: palette.textSoft }]}>{action.label}</Text>
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
                    primary={action.variant === 'primary'}
                    onPress={() => action.enabled === false ? undefined : run('workspace-action', { id: action.id })}
                  />
                ))}
              </> : <Text style={[shellStyles.emptyText, { color: palette.textSoft }]}>当前页面没有可用操作。</Text>
            ) : visible === 'import' ? (
              <>
                <SheetAction glyph="□" label="选择文件" detail="优先显示 CSV / DAT / TXT / TSV / JSON 等 Studio 常用数据与工程文件；第三方文件管理器和云盘同样可用" palette={palette} onPress={() => run('file-open')} />
                <SheetAction glyph="▦" label="选择文件夹" detail="Android SAF 树授权；支持 DocumentsProvider 的 NAS / SMB / 云盘应用可直接提供目录" palette={palette} onPress={() => run('file-folder')} />
                <SheetAction glyph="▤" label="Studio SMB" detail="使用 Studio 内置 SMB 文件管理器浏览服务器、共享与目录；自动识别文件类型" palette={palette} onPress={() => run('smb-open')} />
              </>
            ) : visible === 'history' ? (
              <>
                <View style={shellStyles.historySheetActions}>
                  <Pressable disabled={!shell.history?.canUndo} onPress={() => shell.history?.canUndo ? run('history-undo') : undefined} style={[shellStyles.historySheetButton, { borderColor: palette.controlBorder, backgroundColor: palette.surfaceSoft, opacity: shell.history?.canUndo ? 1 : .42 }]}>
                    <Text style={[shellStyles.historySheetButtonText, { color: palette.text }]}>撤销{shell.history?.undoLabel ? ` · ${shell.history.undoLabel}` : ''}</Text>
                  </Pressable>
                  <Pressable disabled={!shell.history?.canRedo} onPress={() => shell.history?.canRedo ? run('history-redo') : undefined} style={[shellStyles.historySheetButton, { borderColor: palette.controlBorder, backgroundColor: palette.surfaceSoft, opacity: shell.history?.canRedo ? 1 : .42 }]}>
                    <Text style={[shellStyles.historySheetButtonText, { color: palette.text }]}>重做{shell.history?.redoLabel ? ` · ${shell.history.redoLabel}` : ''}</Text>
                  </Pressable>
                </View>
                {historyRows.map((item, index) => (
                  <SheetAction key={`${item.scope}:${item.entry.id || item.entry.updatedAt || item.entry.createdAt || index}:${item.future ? 'future' : 'past'}`} glyph={item.future ? '○' : index === 0 ? '●' : '·'} label={item.entry.label} detail={`${item.future ? '已撤销，可恢复' : '已执行'} · ${item.scopeLabel}`} palette={palette} onPress={() => undefined} />
                ))}
                {!((shell.history?.project?.past || []).length || (shell.history?.project?.future || []).length || (shell.history?.workspace?.past || []).length || (shell.history?.workspace?.future || []).length) ? <Text style={[shellStyles.emptyText, { color: palette.textSoft }]}>当前项目还没有可回退的操作。</Text> : null}
              </>
            ) : visible === 'status-overflow' ? (
              statusOverflowItems.length ? <>
                {statusOverflowItems.map(item => (
                  <SheetAction
                    key={item.key}
                    glyph={item.icon || '·'}
                    label={item.label || item.id}
                    detail={item.title || (item.clickable === false ? '状态信息' : '点击打开')}
                    palette={palette}
                    onPress={() => item.clickable === false ? undefined : item.synthetic === 'web-service' ? run('web-service') : item.synthetic === 'history' ? onSheet('history') : run('status-item', { pluginId: item.pluginId, id: item.id })}
                  />
                ))}
              </> : <Text style={[shellStyles.emptyText, { color: palette.textSoft }]}>当前没有被收纳的状态项目。</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
