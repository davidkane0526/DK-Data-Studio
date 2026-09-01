# DK Data Studio v3.67.10 — R7J WIP Startup / Integrated Chrome / Theme Scope Handoff

**Status:** WIP / 未完成最终 Windows Electron 验收  
**Baseline:** v3.67.10 R7I Clean Dev Repo  
**Current scope:** R7 UI / performance recovery  
**GitHub:** 本轮未访问、未拉取、未推送用户 GitHub 仓库。

## 1. R7I Windows 反馈作为本轮最高证据

用户在 Windows x64 / Electron 43.4.0 / Chrome 150 上重新验证 R7I：

- 47 PASS / 1 FAIL / 1 SKIP；
- Theme runtime idle performance 已 PASS，idle delta 已降到 Material / Appearance / Semantic 各 1 次 assign + 1 次 flush；
- Theme Coverage 已 PASS；
- 唯一自动化失败：`ui.visual-geometry-closure` → `Aurora semantic header lost its Theme gradient: floating-header drag-handle`；
- 用户实际截图仍指出：冷启动偏慢、Aurora ScientificPlot 浮动按钮像独立按钮拼接、Default 曲线检查器标题栏呈现 Aurora/青绿色风格。

因此 R7J 不再扩大 Hard Gate 数量证明“已完成”，而是直接修这三条最终渲染/启动路径。

## 2. Theme Header Effect：从永久 gradient 改为显式主题 effect scope

相关文件：

- `src/core/theme/runtime.js`
- `src/styles/theme/material-renderer.css`
- `src/diagnostics/automation-visual-cases.js`
- `tools/quality/visual-invariants.js`

R7I 的问题有两层：

1. 所有 `panelHeader / inspectorHeader` 都永久得到 `linear-gradient(transparent, transparent)`，即使当前 Theme 没有 Header Effect；
2. glass parent flattening 随后又对 `.floating-header / .dkds-surface-header` 写 `background-image:none`，因此 Aurora 的浮动 header 反而丢失 gradient。

R7J 改为：

- Theme runtime 每次 profile/mode transaction 都重新计算 `data-dkds-theme-header-effect=true|false`；
- 只有当前 Theme 两个 header gradient endpoint 都实际可见时，Core 才绘制 header gradient；
- 切换回 Default / Thin Glass 时明确清除 effect flag，不允许旧 Aurora gradient 留在 DOM；
- glass parent 仍负责取消嵌套 header 的第二层 blur/shadow，但不再删除 header 本身的 tonal/gradient paint；
- Default `inspectorHeader` 从历史青绿色改回中性灰蓝：
  - light: `#f5f8fc`
  - dark: `#1d2532`
- Windows visual closure 现在同时 fail-close：
  - 声明 Header Effect 的 Theme 必须得到 gradient；
  - 中性 Theme 不得残留任何 stale gradient。

这是 Theme/Core scope 修复，不是给 Default 或 Aurora 写 selector 补丁。

## 3. Scientific floating toolbar：SDK 1.24.0 硬性“一体化 silhouette”规则

相关文件：

- `src/styles/structure/sdk-semantic-surfaces.css`
- `src/styles/theme/component-appearance.css`
- `sdk/visual-contract.js`
- `sdk/README.md`
- `sdk/THEME_CONTRACT.md`
- `sdk/contract.json`
- `src/diagnostics/automation-visual-cases.js`

用户要求：数据图浮动按钮必须融为一体，不能看出是独立按钮拼在一起，而且要进入 SDK 成为硬规则。

R7J 正式定义：

- `.dkds-scientific-nav-tools` / integrated floating chrome 的 **outer container** 是唯一 silhouette owner；
- 外层唯一拥有：Material surface、border、radius、shadow/depth；
- 内部 drag / zoom-in / zoom-out / home 等 ToolbarAction：
  - `gap: 0`
  - `border-radius: 0`
  - `border-color: transparent`
  - `box-shadow: none`
  - 允许 Theme 通过统一状态填充表达 hover / active / selected，但禁止形成第二个按钮卡片；
- 外层 `overflow:hidden`，统一裁切为一个整体轮廓；
- SDK validator 新增 `PLUGIN_RESTYLES_INTEGRATED_CHROME`：插件若重写 integrated/scientific floating chrome 的 gap / padding / margin / overflow / radius / shadow / height 等几何，直接拒绝；
- SDK 1.24.0 README / Theme Contract / contract note 已写入该硬性规则；
- Windows computed-style automation 现在要求 gap=0、外壳 fused padding、每个 child radius=0 / shadow=none。

这条规则对 Default、Thin Glass、Aurora 和未来 Theme 一视同仁。

## 4. 冷启动：从“延迟 activation”继续推进到“延迟 entry script load”

相关文件：

- `src/core/plugins/kernel/modules/package-runtime.js`
- `src/app/modules/dedicated-plugin-windows.js`
- `tests/test-v36710-r7j-integrated-chrome-startup.js`

R7I 已经取消 TER 默认 prewarm，并把非必要插件 activation 推迟到 first paint 后，但仍存在一个阻塞：

`initializePluginArchitecture()` 在首帧前仍串行加载 17 个 built-in 的全部 entry/support scripts，并等待 external package 扫描。

R7J 正常主窗口改为两阶段：

### 首帧前 critical set

只加载/激活：

- order <= 20 的 shell/data/import foundation；
- systemCritical；
- Theme providers；
- Algorithm providers；
- Scientific Data Contracts；
- 当前 SUPER（默认 Resonance；若用户保存了其他 built-in SUPER，则使用保存项）；
- 上述插件的 transitive `pluginDependencies`。

当前 generated plugin index 共 17 个 built-in / 46 个 scripts：

- 首帧前 critical：12 plugins / 30 scripts；
- 首帧后 deferred：5 plugins / 16 scripts（Connectivity、Pulse、TER、Pulse Sampler、Vth，具体取决于当前 SUPER/设置）。

### 首帧后 idle 阶段

- 先加载 deferred built-in scripts；
- 再扫描/加载普通 external packages；
- 再激活尚未 active 的插件；
- 完成后重新 publish capability snapshot 一次，使 LAN/Mobile/remote consumers 得到完整 registry。

兼容性保护：

- 若用户保存的 SUPER 是 external plugin，则 external package 必须首帧前加载，避免性能 staging 改变用户工作区；
- Windows `dkdsAutomation=visual-closure` 保持原来的 **全量同步 load + activate**，保证自动化不会因为 staging 漏测插件；
- auxiliary/dedicated window 仍走完整确定性加载路径。

R7J 当前只声明“减少首帧阻塞工作”，不在没有新的 Windows cold-start 实测前声称具体毫秒收益。

## 5. 新增防回退测试

新增：

`tests/test-v36710-r7j-integrated-chrome-startup.js`

并进入 `test` + `check` manifest。

覆盖：

- Header Effect 必须显式 gated；
- Default Inspector Header 必须中性；
- integrated floating chrome 的 fused geometry；
- SDK 必须拒绝插件拆开 scientific floating chrome；
- SDK 文档必须声明 one silhouette；
- normal main startup 必须 staged script-load + staged activation；
- external SUPER 必须保留首帧前加载；
- deferred registry 完成后 capability snapshot 必须重发；
- Windows visual closure 必须保持 full load / full activation。

## 6. 最新代码侧验证

R7J 最终源码在清理 generated artifacts 前已经执行：

- `npm test`: **227 / 227 PASS**
- `npm run check`: **235 / 235 PASS**
- `npm run mobile:test`: **12 / 12 PASS**
- `npm run sdk:harness`: **PASS**
- `npm run science:parity`: **PASS**
- `npm run renderer:test`: **PASS**
- `npm run plugin-manager:test`: **PASS**
- `npm run visual:gate`: **Hard Visual Invariants 62 / 62 PASS**
- Style architecture: **44 authored CSS / 0 `!important`**
- Plugin manifests/packages: **17 PASS**
- `git diff --check`: **PASS**

注意：这些代码侧结果仍不能替代 Windows Electron 最终截图与 computed-style 验收。

## 7. 项目清理 / 交付形态

交付前：

- 删除 R7I 旧 handoff，只保留 R7J 当前 handoff；
- `npm run clean:generated` 删除 8 个可重建 generated artifacts；
- 不包含 `node_modules`；
- 不包含临时 Chromium harness / 测试截图；
- 保留 `.git` 本地历史，可继续开发；
- 不访问用户 GitHub 仓库。

## 8. Windows R7J 下一步必须验证

使用 R7J 完整源码运行：

```bash
npm run visual:closure:windows
```

期望：

- 48 PASS / 0 FAIL / 1 SKIP（若当前 Runner 用例数不变）；
- `ui.visual-geometry-closure` 不再出现 Aurora floating header gradient failure；
- Theme runtime performance / Theme coverage 继续 PASS。

手动重点：

1. 冷启动体感，并记录启动到完整主界面可操作的时间；
2. Aurora 下主图、组图、Pulse/Vth 等 ScientificPlot 浮动工具条应只看到一个整体轮廓，内部按钮不再有独立圆角/阴影卡片；
3. Default light/dark 下曲线检查器标题栏必须中性，不能有 Aurora 紫/绿或历史青绿色；
4. Aurora 下 chart / inspector / floating header gradient 必须保留；
5. 快速 Aurora ↔ Default ↔ Thin Glass 切换，确认不发生 stale header effect。

## 9. 交接原则

如果 R7J Windows Electron 仍出现任何差异，以用户 Windows screenshot / computed style / automation report 为最高证据。不得用 `npm test`、Hard Gate 或 Linux/Chromium 静态结果反驳最终 Windows 渲染。
