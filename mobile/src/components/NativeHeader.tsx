import React from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import type { RendererShellState, ShellSheet, ShellSurface } from '../model/shell-types';
import { canonicalDataControlSurface, navigableSurfaces, primarySurface, surfaceRequestId } from '../model/shell-model';
import { packOrderedControls, type WidthMap } from '../model/overflow-layout';
import type { Palette } from '../theme/palette';
import { shellStyles } from '../styles/shell-styles';

export type HeaderProps = {
  shell: RendererShellState;
  palette: Palette;
  onAction: (action: string, payload?: unknown) => void;
  onSheet: (sheet: Exclude<ShellSheet, null>) => void;
  onOverflowChange?: (keys: string[]) => void;
};

function HistoryGlyph({ direction, color }: { direction: 'undo' | 'redo'; color: string }) {
  const flip = direction === 'redo' ? -1 : 1;
  return (
    <View style={[shellStyles.historyGlyphCanvas, { transform: [{ scaleX: flip }] }]} pointerEvents="none">
      <View style={[shellStyles.historyGlyphShaft, { backgroundColor: color }]} />
      <View style={[shellStyles.historyGlyphTurn, { backgroundColor: color }]} />
      <View style={[shellStyles.historyGlyphHeadA, { backgroundColor: color }]} />
      <View style={[shellStyles.historyGlyphHeadB, { backgroundColor: color }]} />
    </View>
  );
}

function MoreGlyph({ color }: { color: string }) {
  return (
    <View style={shellStyles.moreGlyphCanvas} pointerEvents="none">
      <View style={[shellStyles.moreGlyphDot, { backgroundColor: color }]} />
      <View style={[shellStyles.moreGlyphDot, { backgroundColor: color }]} />
      <View style={[shellStyles.moreGlyphDot, { backgroundColor: color }]} />
    </View>
  );
}

const GLOBAL_ACTIONS = [
  { id: 'import-sheet', label: '导入' },
  { id: 'data', label: '数据' },
  { id: 'home', label: '工作区' },
  { id: 'activities', label: '分析' },
  { id: 'plugins', label: '插件' },
] as const;

const PLUGIN_GAP = 5;
const OVERFLOW_WIDTH = 30;

type PluginRow =
  | (ShellSurface & { kind: 'surface' })
  | ({ id: string; label: string; icon?: string; active?: boolean; enabled?: boolean; variant?: string; kind: 'action' });

const pluginKey = (row: PluginRow) => `${row.kind}:${row.id}`;
const fallbackPluginWidth = (row: PluginRow) => Math.min(128, Math.max(42, 22 + String(row.label || '').length * 10.2));
const identity = (value: unknown) => String(value ?? '').toLowerCase().replace(/[\s\-–—_·:：/\\()（）\[\]{}]+/g, '');
const rowIdentities = (row: { id?: string; surfaceId?: string; label?: string }) => new Set([row.id, row.surfaceId, row.label].map(identity).filter(Boolean));
const overlapsIdentity = (a: Set<string>, b: Set<string>) => [...a].some(value => b.has(value));

export function NativeHeader({ shell, palette, onAction, onSheet, onOverflowChange }: HeaderProps) {
  const activeProject = (shell.projects || []).find(project => project.active) || (shell.projects || [])[0];
  const surfaces = navigableSurfaces(shell);
  const dataControlSurface = canonicalDataControlSurface(shell);
  const currentPrimary = primarySurface(shell);
  const onSecondaryRoute = Boolean(shell.route?.surfaceId && currentPrimary && surfaceRequestId(currentPrimary) !== shell.route?.surfaceId);
  const dataControlSurfaceId = dataControlSurface ? surfaceRequestId(dataControlSurface) : '';
  // Every semantic data-control surface maps to the same fixed Mobile utility slot.
  // The plugin chooses the label (for example 参数 or 数据); the Presenter owns placement.
  const basePluginSurfaces = surfaces.filter(row => !dataControlSurfaceId || surfaceRequestId(row) !== dataControlSurfaceId);
  const pluginSurfaces = onSecondaryRoute && currentPrimary
    ? [{ ...currentPrimary, label: '主图' }, ...basePluginSurfaces]
    : basePluginSurfaces;
  const surfaceIdentitySets = pluginSurfaces.map(rowIdentities);
  if (dataControlSurface) surfaceIdentitySets.push(rowIdentities(dataControlSurface));
  const directActions = (shell.actions || []).filter(row => {
    if (row.menu || row.enabled === false) return false;
    const ids = rowIdentities(row);
    return !surfaceIdentitySets.some(surfaceIds => overlapsIdentity(ids, surfaceIds));
  });
  const menuActions = (shell.actions || []).filter(row => row.menu && row.enabled !== false);
  const seenRows = new Set<string>();
  const pluginRows: PluginRow[] = [
    ...pluginSurfaces.map(row => ({ ...row, kind: 'surface' as const })),
    ...directActions.map(row => ({ ...row, kind: 'action' as const })),
  ].filter(row => {
    const token = [...rowIdentities(row)][0] || pluginKey(row);
    if (seenRows.has(token)) return false;
    seenRows.add(token);
    return true;
  });
  const [pluginAreaWidth, setPluginAreaWidth] = React.useState(0);
  const [pluginWidths, setPluginWidths] = React.useState<WidthMap>({});
  const rowByKey = React.useMemo(() => new Map(pluginRows.map(row => [pluginKey(row), row])), [pluginRows]);
  const keys = React.useMemo(() => pluginRows.map(pluginKey), [pluginRows]);
  const packed = React.useMemo(() => packOrderedControls({
    keys,
    widths: pluginWidths,
    available: pluginAreaWidth,
    gap: PLUGIN_GAP,
    overflowWidth: OVERFLOW_WIDTH,
    forceOverflow: menuActions.length > 0,
    fallbackWidth: key => fallbackPluginWidth(rowByKey.get(key) || ({ id: key, label: key, kind: 'action' } as PluginRow)),
  }), [keys, menuActions.length, pluginAreaWidth, pluginWidths, rowByKey]);
  const visibleKeySet = React.useMemo(() => new Set(packed.visibleKeys), [packed.visibleKeys]);
  const visiblePluginRows = pluginRows.filter(row => visibleKeySet.has(pluginKey(row)));
  const overflowKeys = React.useMemo(() => [
    ...packed.hiddenKeys,
    ...menuActions.map(row => `menu:${row.id}`),
  ], [menuActions, packed.hiddenKeys]);
  const hasPluginOverflow = overflowKeys.length > 0;
  const dark = shell.theme === 'dark';
  const textColor = dark ? '#ffffff' : palette.text;
  const selectedTextColor = dark ? '#ffffff' : palette.accent;

  const overflowSignature = overflowKeys.join('\u001f');
  const lastOverflowSignature = React.useRef('');
  React.useEffect(() => {
    if (lastOverflowSignature.current === overflowSignature) return;
    lastOverflowSignature.current = overflowSignature;
    onOverflowChange?.(overflowKeys);
  }, [onOverflowChange, overflowKeys, overflowSignature]);

  const runGlobal = (id: typeof GLOBAL_ACTIONS[number]['id']) => {
    if (id === 'activities') onSheet('activities');
    else if (id === 'import-sheet') onSheet('import');
    else if (id === 'plugins') onAction('plugins');
    else onAction(id);
  };
  const measurePlugin = (key: string, event: LayoutChangeEvent) => {
    const width = Math.ceil(event.nativeEvent.layout.width * 10) / 10;
    if (!(width > 0)) return;
    setPluginWidths(current => Math.abs((current[key] || 0) - width) < 0.5 ? current : { ...current, [key]: width });
  };

  const renderPluginButton = (row: PluginRow, measuring = false) => {
    const primary = row.kind === 'action' && row.variant === 'primary';
    const selected = row.active && !primary;
    return (
    <Pressable
      key={`${measuring ? 'measure:' : ''}${pluginKey(row)}`}
      accessibilityRole={measuring ? undefined : 'button'}
      accessibilityLabel={measuring ? undefined : row.label}
      disabled={measuring}
      onLayout={measuring ? event => measurePlugin(pluginKey(row), event) : undefined}
      onPress={measuring ? undefined : () => row.kind === 'surface'
        ? onAction('surface', { id: surfaceRequestId(row as ShellSurface) })
        : onAction('workspace-action', { id: row.id })}
      style={({ pressed }) => [
        shellStyles.projectAction,
        { backgroundColor: primary ? palette.accent : selected ? palette.accentSoft : palette.surfaceSoft, borderColor: primary || selected ? palette.accent : palette.controlBorder },
        !measuring && pressed && shellStyles.pressed,
      ]}>
      <Text style={[shellStyles.projectActionText, { color: primary ? '#ffffff' : selected ? selectedTextColor : textColor }]} numberOfLines={1}>{row.label}</Text>
    </Pressable>
    );
  };

  return (
    <View style={[shellStyles.header, { backgroundColor: palette.surface, borderBottomColor: palette.divider }]}>
      <View style={shellStyles.unifiedHeaderRow}>
        <View style={shellStyles.projectTabGroup} accessibilityLabel="项目标签区">
          {activeProject ? (
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={`${activeProject.title}，当前项目，点击管理项目`}
              onPress={() => onSheet('projects')}
              style={({ pressed }) => [shellStyles.projectTab, { borderColor: palette.accent, backgroundColor: palette.accentSoft }, pressed && shellStyles.pressed]}>
              <Text style={[shellStyles.projectTabText, { color: dark ? '#ffffff' : palette.accent }]} numberOfLines={1}>
                {activeProject.title || '未命名项目'}
              </Text>
              <Text style={[shellStyles.projectChevron, { color: dark ? '#ffffff' : palette.accent }]}>⌄</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="新建项目"
            onPress={() => onAction('project-new')}
            style={({ pressed }) => [shellStyles.projectAdd, pressed && shellStyles.pressed]}>
            <Text style={[shellStyles.projectAddText, { color: dark ? '#ffffff' : palette.accent }]}>＋</Text>
          </Pressable>
        </View>

        <View style={[shellStyles.headerDivider, { backgroundColor: palette.divider }]} accessibilityElementsHidden />
        <View style={shellStyles.globalButtonGroup} accessibilityLabel="系统按钮区">
          {GLOBAL_ACTIONS.map(row => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              onPress={() => runGlobal(row.id)}
              style={({ pressed }) => [shellStyles.globalAction, { backgroundColor: palette.surfaceSoft }, pressed && shellStyles.pressed]}>
              <Text style={[shellStyles.globalActionText, { color: textColor }]} numberOfLines={1}>{row.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[shellStyles.headerDivider, { backgroundColor: palette.divider }]} accessibilityElementsHidden />
        <View
          style={shellStyles.pluginPackingArea}
          accessibilityLabel="插件按钮区"
          onLayout={event => setPluginAreaWidth(Math.max(0, event.nativeEvent.layout.width))}>
          <View style={shellStyles.pluginButtonGroup}>
            {visiblePluginRows.map(row => renderPluginButton(row))}
            {hasPluginOverflow ? (
              <Pressable accessibilityRole="button" accessibilityLabel="更多插件按钮" onPress={() => onSheet('actions')} style={({ pressed }) => [shellStyles.moreAction, { backgroundColor: palette.surfaceSoft }, pressed && shellStyles.pressed]}>
                <MoreGlyph color={textColor} />
              </Pressable>
            ) : null}
          </View>
          <View style={shellStyles.pluginMeasureLayer} pointerEvents="none" accessibilityElementsHidden>
            {pluginRows.map(row => renderPluginButton(row, true))}
          </View>
        </View>

        <View style={shellStyles.headerUtilityGroup}>
          <Pressable
            accessibilityRole="button" accessibilityLabel="撤销" disabled={!shell.history?.canUndo}
            onPress={() => onAction('history-undo')}
            style={[shellStyles.headerHistoryButton, { backgroundColor: palette.surfaceSoft, borderColor: palette.controlBorder, opacity: shell.history?.canUndo ? 1 : .38 }]}>
            <HistoryGlyph direction="undo" color={textColor} />
          </Pressable>
          <Pressable
            accessibilityRole="button" accessibilityLabel="恢复" disabled={!shell.history?.canRedo}
            onPress={() => onAction('history-redo')}
            style={[shellStyles.headerHistoryButton, { backgroundColor: palette.surfaceSoft, borderColor: palette.controlBorder, opacity: shell.history?.canRedo ? 1 : .38 }]}>
            <HistoryGlyph direction="redo" color={textColor} />
          </Pressable>
          {dataControlSurface ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={dataControlSurface.label || '参数'}
              onPress={() => onAction('surface', { id: surfaceRequestId(dataControlSurface) })}
              style={({ pressed }) => [shellStyles.headerParameterButton, { backgroundColor: dataControlSurface.active ? palette.accentSoft : palette.surfaceSoft, borderColor: dataControlSurface.active ? palette.accent : palette.controlBorder }, pressed && shellStyles.pressed]}>
              <Text style={[shellStyles.headerParameterText, { color: dataControlSurface.active ? selectedTextColor : textColor }]} numberOfLines={1}>{dataControlSurface.label || '参数'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
