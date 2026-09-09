import React from 'react';
import { LayoutChangeEvent, NativeSyntheticEvent, NativeTouchEvent, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStatusOverflowRow, NativeWebServiceState, RendererShellState, ShellSheet } from '../model/shell-types';
import { packPriorityControls, type WidthMap } from '../model/overflow-layout';
import type { Palette } from '../theme/palette';
import { shellStyles } from '../styles/shell-styles';

type StatusRow = NativeStatusOverflowRow & { side?: 'left' | 'right' };

const statusKey = (row: StatusRow) => `${row.pluginId || ''}:${row.id}:${row.label}`.toLowerCase();

function StatusHistoryGlyph({ color }: { color: string }) {
  return (
    <View style={shellStyles.statusHistoryGlyphCanvas} pointerEvents="none">
      <View style={[shellStyles.statusHistoryGlyphRing, { borderColor: color }]} />
      <View style={[shellStyles.statusHistoryGlyphHandH, { backgroundColor: color }]} />
      <View style={[shellStyles.statusHistoryGlyphHandV, { backgroundColor: color }]} />
      <View style={[shellStyles.statusHistoryGlyphTail, { backgroundColor: color }]} />
    </View>
  );
}


function StatusSemanticGlyph({ row, color }: { row: StatusRow; color: string }) {
  const key = statusKey(row);
  if (row.synthetic === 'history' || /history|历史/.test(key)) return <StatusHistoryGlyph color={color} />;
  if (/smb/.test(key)) return <View style={shellStyles.statusGlyphCanvas} pointerEvents="none"><View style={[shellStyles.statusGlyphGridA,{borderColor:color}]}/><View style={[shellStyles.statusGlyphGridB,{borderColor:color}]}/><View style={[shellStyles.statusGlyphGridC,{borderColor:color}]}/><View style={[shellStyles.statusGlyphGridD,{borderColor:color}]}/></View>;
  if (/memory|内存/.test(key)) return <View style={shellStyles.statusGlyphCanvas} pointerEvents="none"><View style={[shellStyles.statusGlyphMemory,{borderColor:color}]}/><View style={[shellStyles.statusGlyphMemoryLine,{backgroundColor:color}]}/></View>;
  if (/theme|主题/.test(key)) return <View style={shellStyles.statusGlyphCanvas} pointerEvents="none"><View style={[shellStyles.statusGlyphTheme,{borderColor:color}]}/><View style={[shellStyles.statusGlyphThemeHalf,{backgroundColor:color}]}/></View>;
  if (/devtool|devtools/.test(key)) return <View style={shellStyles.statusGlyphCanvas} pointerEvents="none"><View style={[shellStyles.statusGlyphTerminal,{borderColor:color}]}/><View style={[shellStyles.statusGlyphTerminalLine,{backgroundColor:color}]}/></View>;
  if (/\bai\b|agent|dkai/.test(key)) return <View style={shellStyles.statusGlyphCanvas} pointerEvents="none"><View style={[shellStyles.statusGlyphAi,{borderColor:color}]}/><View style={[shellStyles.statusGlyphAiCore,{backgroundColor:color}]}/></View>;
  if (row.synthetic === 'web-service' || /lan-web|网页服务|web/.test(key)) return <View style={shellStyles.statusGlyphCanvas} pointerEvents="none"><View style={[shellStyles.statusGlyphWeb,{borderColor:color}]}/><View style={[shellStyles.statusGlyphWebLine,{backgroundColor:color}]}/></View>;
  return row.icon ? <Text style={[shellStyles.nativeStatusIcon, { color }]}>{row.icon}</Text> : null;
}

function StatusMoreGlyph({ color }: { color: string }) {
  return (
    <View style={shellStyles.moreGlyphCanvas} pointerEvents="none">
      <View style={[shellStyles.moreGlyphDot, { backgroundColor: color }]} />
      <View style={[shellStyles.moreGlyphDot, { backgroundColor: color }]} />
      <View style={[shellStyles.moreGlyphDot, { backgroundColor: color }]} />
    </View>
  );
}

// Preservation priority. When space contracts, DevTool is folded first, then
// memory, theme, web service, SMB; AI is the final canonical item to fold.
const preservationPriority = (row: StatusRow) => {
  const key = `${row.pluginId || ''}:${row.id}:${row.label}`.toLowerCase();
  if (/\bai\b|agent|dkai/.test(key)) return 600;
  if (row.synthetic === 'history' || /history|历史/.test(key)) return 550;
  if (/smb/.test(key)) return 500;
  if (row.synthetic === 'web-service' || /lan-web|网页服务|web/.test(key)) return 400;
  if (/theme|主题/.test(key)) return 300;
  if (/memory|内存/.test(key)) return 200;
  if (/devtool|devtools/.test(key)) return 100;
  return 0;
};

const STATUS_GAP = 14;
const OVERFLOW_WIDTH = 24;
const MIN_TICKER_WIDTH = 92;
const fallbackStatusWidth = (row: StatusRow) => Math.max(30, 12 + (row.icon ? 13 : 0) + String(row.label || '').length * 8.8);

function StatusTicker({ text, color }: { text: string; color: string }) {
  const ref = React.useRef<ScrollView>(null);
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const [contentWidth, setContentWidth] = React.useState(0);
  React.useEffect(() => {
    if (!viewportWidth || contentWidth <= viewportWidth + 4) {
      ref.current?.scrollTo({ x: 0, animated: false });
      return;
    }
    let right = false;
    const tick = () => {
      right = !right;
      ref.current?.scrollTo({ x: right ? Math.max(0, contentWidth - viewportWidth) : 0, animated: true });
    };
    const start = setTimeout(tick, 1200);
    const interval = setInterval(tick, 3600);
    return () => { clearTimeout(start); clearInterval(interval); };
  }, [contentWidth, viewportWidth, text]);
  return (
    <ScrollView
      ref={ref}
      horizontal
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      style={shellStyles.nativeStatusMessageScroller}
      onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}
      onContentSizeChange={width => setContentWidth(width)}>
      <Text style={[shellStyles.nativeStatusMessage, { color }]} numberOfLines={1}>{text || '就绪'}</Text>
    </ScrollView>
  );
}

export function NativeStatusBar({ shell, palette, onAction, onSheet, onOverflowChange, webService }: {
  shell: RendererShellState;
  palette: Palette;
  onAction: (action: string, payload?: unknown) => void;
  onSheet: (sheet: Exclude<ShellSheet, null>) => void;
  onOverflowChange?: (rows: NativeStatusOverflowRow[]) => void;
  webService?: NativeWebServiceState;
}) {
  const allRows: StatusRow[] = (shell.statusItems || [])
    .filter(item => !item.activityId || item.activityId === shell.activityId)
    .map(item => ({ ...item, key: `${item.pluginId}:${item.id}` }));
  const leftRows = allRows.filter(item => item.side === 'left');
  const rows = allRows.filter(item => item.side !== 'left');
  rows.push({ key: 'native:history', id: 'history', label: '历史', state: '', clickable: true, synthetic: 'history', title: '操作历史' });
  if (webService) rows.push({
    key: 'native:web-service', id: 'lan-web', label: webService.error ? '网页服务 异常' : webService.running ? '网页服务 已开启' : '网页服务 已关闭',
    icon: '●', state: webService.error ? 'error' : webService.running ? 'running' : 'stopped', clickable: true, synthetic: 'web-service', title: '局域网网页服务',
  });

  const [barWidth, setBarWidth] = React.useState(0);
  const [rowWidths, setRowWidths] = React.useState<WidthMap>({});
  const rowByKey = React.useMemo(() => new Map(rows.map(row => [row.key, row])), [rows]);
  const actionBudget = Math.max(0, barWidth - MIN_TICKER_WIDTH - 31);
  const packed = React.useMemo(() => packPriorityControls({
    rows: rows.map((row, index) => ({ key: row.key, priority: preservationPriority(row), index })),
    widths: rowWidths,
    available: actionBudget,
    gap: STATUS_GAP,
    overflowWidth: OVERFLOW_WIDTH,
    fallbackWidth: key => fallbackStatusWidth(rowByKey.get(key) || { key, id: key, label: key }),
  }), [actionBudget, rowByKey, rowWidths, rows]);
  const visibleSet = React.useMemo(() => new Set(packed.visibleKeys), [packed.visibleKeys]);
  const hiddenSet = React.useMemo(() => new Set(packed.hiddenKeys), [packed.hiddenKeys]);
  const visible = rows.filter(row => visibleSet.has(row.key));
  const hidden = rows.filter(row => hiddenSet.has(row.key));
  const dark = shell.theme === 'dark';
  const [transientStatus, setTransientStatus] = React.useState(shell.status || '');
  React.useEffect(() => {
    const next = String(shell.status || '').trim();
    setTransientStatus(next);
    if (!next) return;
    const timer = setTimeout(() => setTransientStatus(''), 5200);
    return () => clearTimeout(timer);
  }, [shell.status]);
  const tickerText = [...leftRows.map(item => item.label).filter(Boolean), transientStatus].filter(Boolean).join(' · ') || '就绪';

  const overflowSignature = hidden.map(row => `${row.key}:${row.label}:${row.state || ''}:${row.disabled ? 1 : 0}:${row.clickable === false ? 0 : 1}`).join('\u001f');
  const lastOverflowSignature = React.useRef('');
  React.useEffect(() => {
    if (lastOverflowSignature.current === overflowSignature) return;
    lastOverflowSignature.current = overflowSignature;
    onOverflowChange?.(hidden);
  }, [hidden, onOverflowChange, overflowSignature]);

  const pressRow = (row: StatusRow, event: NativeSyntheticEvent<NativeTouchEvent>) => {
    if (row.synthetic === 'web-service') { onAction('web-service'); return; }
    if (row.synthetic === 'history') { onSheet('history'); return; }
    onAction('status-item', { pluginId: row.pluginId, id: row.id, anchor: { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY } });
  };
  const measureRow = (key: string, event: LayoutChangeEvent) => {
    const width = Math.ceil(event.nativeEvent.layout.width * 10) / 10;
    if (!(width > 0)) return;
    setRowWidths(current => Math.abs((current[key] || 0) - width) < 0.5 ? current : { ...current, [key]: width });
  };
  const stateColor = (item: StatusRow) => {
    const state = String(item.state || '').toLowerCase();
    if (state === 'error') return '#c95a55';
    if (['running','ready','ok','mcp','done'].includes(state)) return dark ? '#6bd6a5' : '#15845d';
    if (['starting','waiting','checking'].includes(state)) return dark ? '#d7b967' : '#a36a08';
    return palette.accent;
  };
  const renderRow = (item: StatusRow, measuring = false) => (
    <Pressable
      key={`${measuring ? 'measure:' : ''}${item.key}`}
      disabled={measuring || item.disabled || item.clickable === false}
      onLayout={measuring ? event => measureRow(item.key, event) : undefined}
      onPress={measuring ? undefined : event => pressRow(item, event)}
      style={shellStyles.nativeStatusItem}>
      <StatusSemanticGlyph row={item} color={stateColor(item)} />
      <Text style={[shellStyles.nativeStatusLabel, { color: item.state === 'error' ? '#c95a55' : dark ? '#ffffff' : palette.textSoft }]} numberOfLines={1}>{item.label}</Text>
    </Pressable>
  );

  return (
    <View
      style={[shellStyles.nativeStatusBar, { backgroundColor: palette.surface, borderTopColor: palette.divider }]}
      onLayout={event => setBarWidth(event.nativeEvent.layout.width)}>
      <StatusTicker text={tickerText} color={dark ? '#ffffff' : palette.textSoft} />
      <View style={shellStyles.nativeStatusItems}>
        {visible.map(item => renderRow(item))}
        {hidden.length ? (
          <Pressable accessibilityRole="button" accessibilityLabel="更多状态项目" onPress={() => onSheet('status-overflow')} style={shellStyles.nativeStatusOverflow}>
            <StatusMoreGlyph color={dark ? '#ffffff' : palette.textSoft} />
          </Pressable>
        ) : null}
      </View>
      <View style={shellStyles.nativeStatusMeasureLayer} pointerEvents="none" accessibilityElementsHidden>
        {rows.map(item => renderRow(item, true))}
      </View>
    </View>
  );
}
