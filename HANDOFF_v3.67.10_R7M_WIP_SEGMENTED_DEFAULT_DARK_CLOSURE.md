# DK Data Studio v3.67.10 — R7M WIP Segmented / Default Dark Closure Handoff

Status: **WIP / Windows Electron visual acceptance still required**  
Baseline: R7L Clean Dev Repo (`7d48faf`)  
Current local commit: recorded after this handoff is added  
GitHub: **not accessed**

## User feedback addressed in R7M

1. Import / Save / Export and Data Management / Tools / Software Management still did not read as the same fused segmented control.
2. The Import command still appeared to carry a persistent bright halo in some themes.
3. Compact Presenter commands such as `参数` looked optically off-center.
4. Default Theme dark active buttons were too blue and too close to Thin Glass dark styling.

## Root causes

### A. The two persistent shell groups did not share the same structural base

The file group used:

`toolbar-group file-command-group dkds-segmented-command-group`

while the system group used:

`system-core-tools-group dkds-segmented-command-group`

Both were semantically ToolbarGroup, but they did not enter every Structure rule through exactly the same class path.

### B. Segmented children still owned external corner radii

R7L flattened child borders/shadows, but first/last children still received their own ToolbarAction radii. Aurora authors `toolbarGroup.radius=10` and `toolbarAction.radius=8`, so the final result could still look like a rounded outer shell containing smaller rounded cards.

### C. Segment parent depth remained theme-authored

Even when child Import shadow was flattened, the top shell ToolbarGroup could retain a persistent theme shadow/glow. That visually read as a halo attached to the primary Import segment.

### D. Compact Presenter labels still used padding-based vertical rhythm

`dkds-presentation-command[data-dkds-presentation-compact=true]` inherited `6px` vertical padding and `20px` line-height. The hit box was geometrically centered, but short Chinese labels could look optically high/low depending on font metrics.

### E. Default Dark used cool-blue active/glow tokens

Default Dark `surfaceActive/surfaceSelected=#202d55` and blue glow shadows were too close to Thin Glass dark's cool-blue optical language.

## R7M changes

### 1. One structural base for both shell command groups

`src/index.html`

System group now also carries `toolbar-group`:

`toolbar-group system-core-tools-group dkds-segmented-command-group`

This makes both persistent groups consume exactly the same canonical Structure owner.

### 2. True fused segmented silhouette

`src/styles/structure/schema-and-plugin-ui.css`

- segmented group keeps canonical 38px envelope / 1px padding;
- adds `overflow:hidden` so state fills are clipped by the parent silhouette.

`src/styles/theme/component-appearance.css`

- segmented `toolbarGroup` parent is the only persistent radius/edge/depth owner;
- segmented parent shadow is suppressed;
- every direct or menu-wrapped child ToolbarAction has `border-radius:0`, transparent border, and no box-shadow;
- hover/active/selected child state may change fill/text only.

This removes the remaining “several independent rounded buttons assembled together” look and prevents Import from carrying a persistent halo in any Theme.

### 3. Compact command centering

`src/styles/structure/shell-navigation.css`

48px compact Presenter commands now use:

- `padding:0`
- `line-height:1`
- existing `inline-flex / align-items:center / justify-content:center`

so `参数`, `检查`, `组图` use the full hit box for centering rather than padding-based text positioning.

### 4. Default Dark visual identity separated from Thin Glass

`src/core/theme/runtime.js`

Default Dark changed from cool blue active/glow to neutral graphite:

- toolbar group surface: `#242b36`
- hover: `#303844`
- active / selected: `#333c49`
- neutral gray borders
- restrained black physical depth for standalone controls
- grouped controls have no glow/depth
- panel/inspector indicators changed from blue to neutral gray

Thin Glass remains the Theme with cool-blue glass and optical glow. Aurora retains purple/teal expression.

## Regression contract changes

The former R7L regression file is replaced by:

`tests/test-v36710-r7m-segmented-default-dark.js`

It protects:

- same toolbar-group structural base for file/system clusters;
- parent clipping / single silhouette;
- child radius/shadow suppression;
- compact 48px content centering;
- neutral Default Dark active tokens;
- existing R7L lazy Theme tooling and on-demand network behavior;
- Thin Glass and Aurora depth contracts.

Historical tests that matched the old system-group class string were updated to the now-canonical class composition. No behavior contract was weakened.

## Validation completed

- Hard Visual Invariants: **62/62 PASS**
- `npm test`: **229/229 PASS**
- `npm run check`: **237/237 PASS**
- Mobile: **12/12 PASS**
- SDK Harness: **PASS**
- Scientific parity: **PASS**
- Renderer tests: **PASS**
- Plugin Manager tests: **PASS**
- Plugin manifests/packages: **17 PASS**
- authored CSS: **44 files / 0 `!important`**
- `git diff --check`: run before packaging

Expected-error log lines from plugin activation failure/duplicate-provider tests are intentional negative test cases and the suites pass.

## Windows Electron acceptance still required

R7M must remain WIP until the user visually checks the actual Windows renderer. Priority checks:

1. Aurora/Thin Glass/Default: Import / Save / Export is one fused silhouette and Import has no persistent bright halo.
2. Aurora/Thin Glass/Default: Data Management / Tools / Software Management has the same silhouette/rhythm as the file group.
3. `参数` / `检查` / `组图` text is optically centered.
4. Default Dark active `共振分析` / `参数` uses graphite gray, not Thin-Glass-like blue.
5. Re-run `npm run visual:closure:windows` after visual inspection.

## Carry-forward R7 items

Do not reopen already-fixed architecture without Windows evidence. Still evaluate user-observed runtime items from earlier R7 if they recur:

- cold-start time on Windows;
- GroupPlot resize follow behavior/perceived latency;
- Theme switching overlap;
- Windows network prompt should occur only at first real network use.

## Packaging hygiene

- Root contains only this current R7M handoff; R7L handoff removed.
- No `node_modules` included.
- Generated runtime/plugin index/SDK authoring artifacts are retained because the current fast `npm start` path intentionally reuses valid generated outputs.
- `.git` retained for a complete local Dev Repo checkpoint.
- No GitHub repository access performed.
