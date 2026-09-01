# DK Data Studio v3.67.18 — R7U Segmented Command Fill Ownership — WIP Handoff

## Status

**WIP / code-side closure complete for this issue; Windows Electron rendered acceptance still required.**

This checkpoint continues directly from v3.67.17 / R7T. The user's GitHub repository was not accessed.

## User-confirmed visual contract

The Desktop top shell has two persistent command families:

1. `导入 / 保存 / 导出`
2. `数据管理 / 工具 / 软件管理`

Both families must behave as one segmented shell component:

- one outer silhouette;
- one outer background/fill;
- one outer border/radius/depth;
- child buttons are integrated hit regions rather than independent cards;
- child hover/pressed feedback may be transient;
- no child has a persistent idle fill that visually breaks the group.

Most importantly, **导入 is a peer task command**. It is not a selected tab and must not consume a persistent `primary` fill.

## Root cause

The global Import button still carried the historical class:

```html
<button id="openBtn" class="toolbar-btn strong">导入</button>
```

Core Semantic UI maps `.primary,.strong` to the `primary` ToolbarAction variant. Component Appearance then correctly rendered the theme's primary surface, which produced the persistent purple Import fill visible in the Windows screenshot.

This was therefore not a shadow bug. It was a semantic variant ownership bug.

## R7U implementation

### 1. Import no longer owns primary semantics

File: `src/index.html`

Changed the global Import button from:

```html
class="toolbar-btn strong"
```

to:

```html
class="toolbar-btn"
```

Import / Save / Export are now peer idle ToolbarActions.

### 2. Both top-shell command families consume the same outer component identity

File: `src/index.html`

File commands now use:

```html
<div class="toolbar-group file-command-group dkds-segmented-command-group"
     role="group" aria-label="文件操作">
```

System commands now use:

```html
<div class="toolbar-group system-core-tools-group dkds-segmented-command-group"
     role="group" aria-label="系统数据、工具与软件管理">
```

Both therefore resolve through the same canonical `ToolbarGroup` appearance path while retaining their task-specific shell classes.

### 3. Segmented idle children no longer paint independent cards

File: `src/styles/theme/component-appearance.css`

For direct and menu-wrapped ToolbarActions inside `.dkds-segmented-command-group`, Core Component Appearance now sets:

```css
--dkds-ca-action-surface: transparent;
--dkds-ca-action-text: var(--dkui-component-toolbar-group-text,var(--dkui-text));
--dkds-ca-action-border: transparent;
```

The outer ToolbarGroup owns the idle fill/text context/edge/depth. Existing hover/active/selected state variables remain available for transient interaction feedback, while per-child shadows remain flattened.

This is a canonical component rule, not a `.file-command-group #openBtn` screenshot patch.

### 4. Regression gates

Added:

- `tests/test-v36718-r7u-segmented-command-fill-ownership.js`
- R7U style-validator checks in `scripts/validate-styles.js`
- HARD-80 in `tools/quality/visual-invariants.js`

HARD-80 now rejects:

- Import regaining `strong / primary / active / selected` persistent identity;
- File/System command families diverging from the same `ToolbarGroup + segmented` outer contract;
- segmented idle child fill no longer being transparent/group-owned.

Historical tests were updated to protect the behavior rather than the obsolete exact `strong`/class-string implementation.

## Version progression

Application version:

**3.67.17 → 3.67.18**

Branch:

`fix/v3.67.18-r7u`

Built-in plugin versions remain independent and were not bumped.

## Validation

Completed after the final source changes:

- `npm test`: **234/234 PASS**
- `npm run check`: **242/242 PASS**
  - the first command reached 137/242 before the execution time limit;
  - cases 138–242 were then resumed from the unchanged manifest and all passed;
  - no test was skipped.
- `npm run mobile:test`: **12/12 PASS**
- `npm run sdk:harness`: **PASS**
- `npm run science:parity`: **PASS**
- `npm run renderer:test`: **PASS**
- `npm run plugin-manager:test`: **PASS**
- `npm run plugin:validate`: **17 plugin packages PASS**
- Hard Visual Invariants: **80/80 PASS**
- authored CSS: **44 files / 0 `!important`**
- `git diff --check`: **PASS**

Expected negative-fixture activation/duplicate logs from Plugin Manager tests remain intentional and the suite passes.

## Electron runtime / Windows acceptance

An Electron dependency installation was explicitly attempted in the current Linux execution environment with:

```text
npm install --no-package-lock --no-audit --no-fund
```

The installation did not complete before the environment command timeout, and no usable local Electron runtime was materialized. Therefore this checkpoint does **not** claim a real Windows Electron screenshot acceptance.

The code-side root cause is now directly removed, but Windows rendered validation remains authoritative. On the next user run, verify specifically:

- Import / Save / Export have one group background and no persistent purple Import fill;
- Data Management / Tools / Software Management use the same outer visual contract;
- hover/pressed feedback remains transient and does not create independent child cards;
- group focus remains one outer silhouette.

If any discrepancy remains, use R7T's `DKDSThemeDebug.traceOwnership(...)` on the affected child and group before changing CSS.

## Repository hygiene

The delivery ZIP must retain `.git` and deterministic generated runtime files required by the development-start path, while excluding `node_modules`, caches and temporary artifacts.

The previous R7T root handoff is removed. Only this current R7U handoff remains at project root.

## Continuation rule

Use this **v3.67.18 / R7U clean ZIP** as the sole source baseline for the next round. Do not roll back to earlier R7 packages. Do not access the user's GitHub repository.
