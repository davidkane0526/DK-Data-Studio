# DK Data Studio v3.67.11 — R7N WIP Shell Command Correction Handoff

## Status

**WIP / Windows Electron visual acceptance still required.**

R7N corrects an R7M visual overcorrection and establishes a release-version policy for future testable development ZIPs. It does not claim final R7 closure until the user validates the actual Windows Electron rendering.

## Source baseline

- Input baseline: `DK-Data-Studio-v3.67.10-WIP-R7M-Segmented-Default-Dark-Closure-Clean-Dev-Repo.zip`
- Application version after this round: **3.67.11**
- R7N is the current clean development checkpoint.
- No access to the user's GitHub repository was performed.

## Why R7M was corrected

R7M made the shell segmented controls too aggressive:

- it added `toolbar-group` to the system command DOM solely to force visual parity;
- it clipped the entire segmented parent with `overflow:hidden`;
- it removed the first/last child-state radii and forced active state fills into hard rectangular blocks;
- it removed parent depth globally.

The resulting Windows screenshot looked like a web tab strip rather than the intended DK Data Studio desktop command surface. R7N explicitly rolls back that over-flattening instead of patching it further.

## R7N implementation

### 1. File and system command groups share a visual contract without faking identical DOM semantics

- File commands keep: `toolbar-group file-command-group dkds-segmented-command-group`.
- System commands keep: `system-core-tools-group dkds-segmented-command-group`.
- Both continue to receive the same Core `toolbarGroup` / `toolbarAction` semantic appearance contract.
- The system group is no longer given an extra `toolbar-group` class merely for styling.

### 2. Segmented state geometry restored to the accepted direction

- Child buttons still cannot draw independent persistent shadows.
- Interior state remains integrated.
- First/last state fills again follow the outer rounded silhouette rather than becoming square blocks.
- R7M's parent-level forced `box-shadow:none` and `overflow:hidden` over-flattening were removed.

### 3. Compact presentation-command centering retained

The useful R7M fix remains:

- 48 px compact commands use `padding:0` and `line-height:1`;
- content is centered by the existing flex hit box rather than font padding;
- short labels such as `参数 / 检查 / 组图` stay visually centered.

### 4. Default Dark is now genuinely neutral graphite

Default Dark no longer borrows Thin-Glass-like blue depth:

- toolbar group: neutral graphite `#252b34`;
- hover: `#303640`;
- active / selected: `#3a4049`;
- active border: transparent;
- no hover / active / selected blue glow;
- panel/inspector indicators are neutral gray rather than blue.

Thin Glass and Aurora keep their own Theme identities and are not changed by this Default-theme correction.

### 5. Application version policy fixed

The repository already contained `scripts/set-version.js` and `npm run version:patch`, but R7F–R7M incorrectly remained on application version 3.67.10.

R7N uses the existing version tool and bumps:

- `package.json`: 3.67.10 -> **3.67.11**;
- visible `src/index.html` version;
- application-owned runtime/project/window/web bridge version sources;
- README release identity.

Built-in/external plugin semantic versions remain independent and are not bumped as a side effect.

### 6. Historical tests no longer pin the application forever to 3.67.10

Two v3.67.10 Visual Closure tests contained exact-version assertions. They now treat 3.67.10 as a **historical minimum capability baseline**, so later patch releases can preserve the same freeze contracts without pretending to still be 3.67.10.

Legacy tests that had been rewritten by R7M to demand the extra `toolbar-group` class on the system DOM were also restored to assert the shared segmented visual contract instead of identical class names.

## Validation completed

- `npm test`: **229/229 PASS**
- `npm run check`: **237/237 PASS**
- `npm run mobile:test`: **12/12 PASS**
- `npm run sdk:harness`: **PASS**
- `npm run science:parity`: **PASS**
- `npm run renderer:test`: **PASS**
- `npm run plugin-manager:test`: **PASS**
- Hard Visual Invariants: **62/62 PASS**
- authored CSS: **44 files / 0 `!important`**
- plugin manifests/packages: **17 PASS**
- `git diff --check`: **PASS**

Expected activation-failure messages printed by the plugin/super-workspace negative tests are test fixtures and do not indicate a suite failure.

## Windows Electron acceptance still required

The user should verify in actual Windows Electron:

1. The top-left `导入 / 保存 / 导出` group no longer looks like three hard rectangular web tabs.
2. `数据管理 / 工具 / 软件管理` has the same visual rhythm without losing its system-command semantic structure.
3. Default Dark `共振分析 / 参数` selected surfaces are neutral graphite, not blue/glass-like.
4. `参数 / 检查 / 组图` labels are visually centered.
5. The title bar displays **v3.67.11**.

If any of these fail in Windows computed rendering, continue from this R7N ZIP and the new screenshot/report. Do not revert to the R7M segmented flattening.

## Delivery policy from this checkpoint onward

Every testable full project ZIP should increment the **application patch version** unless the user explicitly requests otherwise. R7 labels remain internal handoff identifiers; they must not substitute for the app's visible semantic version.
