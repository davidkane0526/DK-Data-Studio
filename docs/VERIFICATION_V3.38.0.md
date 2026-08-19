# v3.38.0 verification — portable home slots, group layout menu and contextual exports

## Automated project checks

`npm test` and `npm run check` both pass after the v3.38 changes.

The v3.38 guard in `scripts/test-workspace-order-runtime-audit.js` verifies:

- Core `PortableView` owns a stable DOM Home Anchor. Restoring `home` inserts the view at its original slot rather than appending it after whichever siblings remain in the container.
- Resonance Group's column selector is a real Core `ContextMenu` action with Auto and 1–6 column choices.
- The system Export menu is contextual rather than a fixed legacy "main plot" menu.
- Resonance, Pulse, TER and Data Center contribute activity-scoped, semantically named export targets.

## Linux Chromium runtime check

A Python Playwright harness launched the system Chromium and loaded the production `src/core/ui-infrastructure.js` into a real DOM.

Runtime sequence:

1. Create cards A/B/C in one home grid.
2. Wrap B and C as Core PortableViews.
3. Move both to whole-workspace floating.
4. Restore B and C to `home` in an order that would make the old `nextSibling` implementation append them incorrectly.
5. Open a production Core `ContextMenu`, send a pointerdown inside its menu item and activate the item.

Observed result:

```json
{"order":"A,B,C","menuSurvivedPointerDown":true,"menuInvoked":true,"menuClosed":true}
```

No browser JavaScript errors were reported. The screenshot is generated outside the repository as `v338_visual/portable-home-menu.png`.

A second Playwright harness loaded the production Plugin Kernel with two test activity/plugin export contributors and switched the active activity from Pulse to TER. Observed:

- Pulse context: `当前：脉冲 / 读取分析`; visible plugin export: `当前文件 · 原始波形数据 CSV`.
- TER context: `当前：TER 热图 / TER_Max 分析`; visible plugin export: `TER 全组合热图 · PNG`.
- The system trigger remained `导出数据 ▾`.
- Legacy generic main-plot exports were hidden while contextual plugin exports were available.
- No browser JavaScript errors were reported.

Screenshot artifact: `v338_visual/contextual-export-menu.png`.

## Export semantics

The shell keeps one system trigger named `导出数据`. When a plugin workspace is active, the plugin contribution area is filtered by the active activity and the menu identifies the current workspace.

Examples:

- Resonance: `共振 I–V 主图 · SVG`, `共振 I–V 主图数据 · CSV`, `峰参数 CSV`.
- Pulse: `当前文件 · 原始波形数据 CSV`, `当前可见结果 · 读取电流图 SVG`, `当前可见结果 · 分析汇总 CSV`.
- TER: `TER 全组合热图 · Long CSV`, `R–V 联动图 · SVG`, `TER_Max–Vg · CSV`, `TER_Max–Vd · PNG`.
- Data Center: `当前数据表 · CSV`, `数据中心图形预览 · PNG`, `当前数据对象 · 复制来源链 JSON`.

Thus the word “主图” is no longer used as a generic shell concept for unrelated plugin workspaces.
