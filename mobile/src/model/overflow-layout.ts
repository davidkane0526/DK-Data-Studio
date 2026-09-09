export type WidthMap = Record<string, number>;

type OrderedPackOptions = {
  keys: string[];
  widths: WidthMap;
  available: number;
  gap: number;
  overflowWidth: number;
  forceOverflow?: boolean;
  fallbackWidth: (key: string) => number;
};

const widthFor = (key: string, widths: WidthMap, fallbackWidth: (key: string) => number) => {
  const measured = Number(widths[key]);
  return Number.isFinite(measured) && measured > 0 ? measured : Math.max(1, fallbackWidth(key));
};

const totalWidth = (keys: string[], widths: WidthMap, gap: number, fallbackWidth: (key: string) => number) =>
  keys.reduce((sum, key, index) => sum + widthFor(key, widths, fallbackWidth) + (index ? gap : 0), 0);

/** Pack ordered plugin controls into the actual measured slot. Only trailing plugin controls overflow. */
export function packOrderedControls(options: OrderedPackOptions) {
  const { keys, widths, gap, overflowWidth, forceOverflow = false, fallbackWidth } = options;
  const available = Math.max(0, Number(options.available) || 0);
  if (!keys.length) return { visibleKeys: [] as string[], hiddenKeys: [] as string[] };
  if (!forceOverflow && totalWidth(keys, widths, gap, fallbackWidth) <= available) {
    return { visibleKeys: [...keys], hiddenKeys: [] as string[] };
  }

  const visibleKeys: string[] = [];
  let used = 0;
  for (const key of keys) {
    const width = widthFor(key, widths, fallbackWidth);
    const controlsGap = visibleKeys.length ? gap : 0;
    const candidateUsed = used + controlsGap + width;
    const overflowGap = candidateUsed > 0 ? gap : 0;
    if (candidateUsed + overflowGap + overflowWidth > available + 0.5) break;
    visibleKeys.push(key);
    used = candidateUsed;
  }
  const visibleSet = new Set(visibleKeys);
  return { visibleKeys, hiddenKeys: keys.filter(key => !visibleSet.has(key)) };
}

type PriorityRow = { key: string; priority: number; index: number };

/**
 * Fold bottom-status controls in preservation-priority order. This is
 * intentionally expressed as removal from the complete visible set: the
 * lowest-preservation item is folded first, then the next-lowest, until the
 * remaining controls plus the overflow button fit. This directly models the
 * product rule “AI > SMB > Web > Theme > Memory > DevTool”: DevTool folds
 * first and AI folds last.
 */
export function packPriorityControls(options: {
  rows: PriorityRow[];
  widths: WidthMap;
  available: number;
  gap: number;
  overflowWidth: number;
  fallbackWidth: (key: string) => number;
}) {
  const available = Math.max(0, Number(options.available) || 0);
  const displayRows = [...options.rows].sort((a, b) => a.index - b.index);
  const displayKeys = displayRows.map(row => row.key);
  if (!displayRows.length) return { visibleKeys: [] as string[], hiddenKeys: [] as string[] };
  if (totalWidth(displayKeys, options.widths, options.gap, options.fallbackWidth) <= available) {
    return { visibleKeys: displayKeys, hiddenKeys: [] as string[] };
  }

  const remaining = new Set(displayKeys);
  const foldOrder = [...displayRows].sort((a, b) => a.priority - b.priority || b.index - a.index);
  const fitsWithOverflow = () => {
    const keys = displayKeys.filter(key => remaining.has(key));
    const controlsWidth = totalWidth(keys, options.widths, options.gap, options.fallbackWidth);
    const overflowGap = keys.length ? options.gap : 0;
    return controlsWidth + overflowGap + options.overflowWidth <= available + 0.5;
  };

  for (const row of foldOrder) {
    if (fitsWithOverflow()) break;
    remaining.delete(row.key);
  }

  return {
    visibleKeys: displayKeys.filter(key => remaining.has(key)),
    hiddenKeys: displayKeys.filter(key => !remaining.has(key)),
  };
}
