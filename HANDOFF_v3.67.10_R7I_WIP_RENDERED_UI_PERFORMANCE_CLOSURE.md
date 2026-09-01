# DK Data Studio v3.67.10 — R7I WIP Rendered UI / Performance Closure Handoff

**Status:** WIP / 未完成最终 Windows Electron 验收  
**Baseline:** v3.67.10 R7H Clean Dev Repo  
**Current scope:** R7 UI / performance recovery  
**GitHub:** 本轮未访问、未拉取、未推送用户 GitHub 仓库。

## 1. 为什么仍标记 WIP

R7I 的源码、Core 回归、样式架构和 Chromium computed-style 验证已经完成，但用户上一轮 Windows Electron 自动化报告仍是旧 R7H 结果：42 PASS / 3 FAIL / 4 SKIP。R7I 必须在 Windows Electron 43.4.0 环境重新运行 `npm run visual:closure:windows` 后，才能确认三个旧失败是否在真实 Windows runtime 中归零。因此当前不能标 Final/Freeze。

旧 R7H Windows 三项失败：

1. Presenter compact command：`峰间距 = 59.60px`，预期 48px rhythm。
2. Theme idle runtime：`semanticAssignCalls = 24`。
3. Theme light coverage：`lowContrastControls = 68`。

R7I 已直接针对这三条和用户截图中的五项 UI/性能问题修改真实 owner。

## 2. R7I 已完成源码修改

### 2.1 GroupPlot / bottom split：真正 compositor-only preview

文件：`src/core/ui/modules/layout/workspace.js`

旧 R7F/R7H 的问题是 pointermove 虽进入 rAF，但每帧仍修改真实 panel geometry，因此 GroupPlot / ScientificPlot 仍然需要参与 layout/paint/resize。

R7I 现在：

- pointermove 仅更新 splitter handle 的 `transform: translate(...)` 预览；
- 拖动期间真实 panel geometry 不变；
- `ResizeScheduler` 在 drag 生命周期暂停；
- pointerup 才执行一次 `apply(... persist:true ...)`；
- 松手只产生一次真实布局提交与 resize；
- 保留 `dkds-split-drag-active`，GroupPlot ResizeObserver 在 drag 期间继续跳过昂贵 layout。

目标：解决用户实际拖动组图高度时的持续卡顿，而不是仅减少持久化次数。

### 2.2 顶部两组按钮收回同一个 segmented command owner

文件：

- `src/index.html`
- `src/styles/structure/schema-and-plugin-ui.css`
- `src/styles/structure/workbench-components.css`
- `src/styles/structure/super-top-contract.css`
- `src/styles/presentation/shell.css`
- `src/styles/theme/component-appearance.css`

`导入 / 保存 / 导出` 与 `数据管理 / 工具 / 软件管理` 现在都声明：

`dkds-segmented-command-group`

统一内容：

- group height / min-height
- padding
- border/radius/shadow/background owner
- child padding
- nested `menu-anchor` 布局
- child hover/focus/active appearance
- first/last child radius

此前 `导出 / 工具 / 软件管理` 因多一层 menu-anchor DOM 会逃逸共享 flatten/hover 规则，R7I 已把 nested button 纳入同一个 Core appearance contract。

### 2.3 状态栏 hover hit region 缩小并真正覆盖 global button min-height

文件：`src/styles/presentation/control-status.css`

此前虽然写过 status item height，但全局 button `min-height` 会把实际 computed height 再撑大，因此用户看到 hover 几乎顶住状态栏上下边缘。

R7I 明确设置：

- status bar：28px
- plugin/status action：18px `height + min-height`
- computed vertical inset：约 5px + 5px

不是只改视觉背景，而是修最终盒模型。

### 2.4 Aurora 数据图 / 曲线检查器标题渐变恢复到 Core semantic header

文件：

- `src/styles/theme/material-renderer.css`
- `src/styles/theme/component-appearance.css`

Aurora Provider 的 `headerGradientStart / headerGradientEnd` token 从未真正删除，回退发生在 Material ownership 重构后：Core 的 `panelHeader / inspectorHeader` 不再消费该 effect。

R7I：

- `panelHeader / inspectorHeader` 由 Material Renderer 统一消费 Theme gradient effect；
- Default / Thin Glass token 为 transparent，因此不会被 Aurora selector 污染；
- Aurora light/dark 自动得到 provider 自己定义的 gradient；
- Component Appearance 改用 `background-color`，避免后加载的 `background` shorthand 把 `background-image` 清掉。

这是 Core semantic title owner 修复，不是 Resonance/Aurora 页面补丁。

### 2.5 Theme profile + light/dark 切换改为同步视觉事务

文件：

- `src/core/theme/runtime.js`
- `src/core/theme/component-appearance.js`
- `src/core/theme/material-renderer.js`
- `src/core/ui/component-runtime.js`
- `src/styles/theme/component-appearance.css`

R7I 新流程：

1. Theme/profile root token 更新；
2. 同步执行 Material + Component composition，`syncSemantic:false`；
3. 再发 `dkds:theme-changed`，标记 `visualSynchronized:true`；
4. listeners 看到同步标记后不再重复整页 assign；
5. profile restore/register/unregister/broadcast 统一经 `commitProfile(...)`，不再存在另外一条非同步 profile path；
6. Component auto hydrate 对 Semantic Registry 改为 `schedule`，不再同步重复扫描 root；
7. 主题切换两帧内通过 `dkds-theme-switching` 暂停 background/color/border transition，避免旧暗色组件在新亮色 canvas 上插值形成视觉“重叠”。

### 2.6 Presenter 48px compact command

文件：

- `src/core/ui/modules/presentation/desktop-shell.js`
- `src/styles/structure/shell-navigation.css`

短标签 compact Presenter command 显式声明 `data-dkds-presentation-compact=true`，最终 width/min/max-width = 48px。长标签仍保持普通 command 几何。

直接针对旧 Windows 自动化 `峰间距=59.60px`。

### 2.7 冷启动：取消隐藏 TER renderer 自动 prewarm

文件：

- `src/plugins/ter-analysis/plugin.json`
- `src/plugins/ter-analysis/plugin.js`
- `tests/test-interaction-performance-v361.js`

TER 由 3.12.2 -> 3.12.3，`window.prewarm` 从 true -> false。

旧 Windows profile 中 TER 是唯一默认 prewarm 的 built-in TOP，应用启动后隐藏 renderer 长时间存在。当前 TOP 首次打开本身已经在亚秒级，因此 R7I 优先避免 app cold start 为未使用 TER 建窗口/加载主题和算法 provider。

## 3. 实际 Chromium computed-style 验证

由于当前容器没有可用 Electron binary，且公开 npm 下载通道此前受容器 DNS/网络出口限制，本轮使用系统 Chromium + Playwright 做了真实 CSS cascade / computed-style 验证，不用静态字符串代替渲染结果。

R7I 实际 Chromium computed values：

### 顶部两个 command group

`fileGroup` 与 `systemGroup`：

- height: 38px
- padding: 1px
- border: `1px solid rgb(201, 211, 226)`
- border-radius: 9px
- background: `rgba(255,255,255,.86)`
- shadow：一致

180ms hover 后 `保存 / 导出 / 数据管理 / 工具 / 软件管理`：

- background：`rgba(111, 80, 255, 0.1)`
- border：transparent
- shadow：none
- first/last radius：按统一 segmented geometry 生效

### 状态栏

- bar height: 28px
- plugin item height: 18px
- top inset: 5px
- bottom inset: 5px
- hover 后仍保持 18px，不再顶边

### Aurora semantic header

`panelHeader` / `inspectorHeader` computed background-image：

`linear-gradient(90deg, rgba(111,80,255,.18), rgba(22,201,149,.13))`

验证截图在开发环境生成过，但未写入项目仓库；临时 harness 已删除。

## 4. 自动化 / 回归验证

R7I 最新源码（在清理 generated artifact 前）已执行：

- `npm test`: **226 / 226 PASS**
- `npm run check`: **234 / 234 PASS**
- `npm run mobile:test`: **12 / 12 PASS**
- `npm run sdk:harness`: **PASS**
- `npm run science:parity`: **PASS**
- `npm run renderer:test`: **PASS**
- `npm run plugin-manager:test`: **PASS**
- `npm run visual:gate`: **Hard Visual Invariants 62 / 62 PASS**
- `npm run styles:build`: **44 authored CSS / 0 `!important`**
- `git diff --check`: **PASS**

HARD-62 新增保护：

- compositor-only split preview；
- atomic theme/profile composition；
- no duplicate Semantic sync from Component hydration；
- canonical segmented top groups；
- 18px status actions；
- Windows computed top-group parity diagnostics；
- Windows status hit-height diagnostics；
- Windows Aurora semantic header gradient diagnostics。

注意：Hard Gate 仍只是架构防回退，不能替代 Windows Electron 最终视觉验收。

## 5. 项目清理

交付前执行：

- 删除旧 R7H handoff，只保留本 R7I handoff；
- 删除可重建 `src/generated/*` runtime/index/reference；
- 删除可重建 PNG staging assets；
- 不包含 `node_modules`；
- 不保留 Chromium 临时 harness / 测试截图在项目中；
- 保留 `.git` 本地历史，便于继续开发；
- 不访问用户 GitHub。

生成物可通过标准 scripts 重新生成。

## 6. 下一步 Windows Electron 必须执行

在 Windows R7I 完整源码根目录安装已有依赖后：

```bash
npm run visual:closure:windows
```

重点确认：

1. `ui.visual-geometry-closure`：compact command 回到 48px；
2. `ui.theme-runtime-performance`：idle semantic assign 不再为 24；
3. `ui.theme-coverage`：light `lowContrastControls` 从 68 清零；
4. 手动快速连续切换 DK Data Studio / Thin Glass / Aurora + 亮/暗模式，不出现旧主题残影；
5. 拖 GroupPlot 高度，拖动期间应只移动 splitter preview，图本身松手后一次 resize；
6. 对比两组顶部按钮 hover；
7. 检查状态栏 hover 上下留白；
8. 检查 Aurora 所有 chart/curve inspector 标题 gradient。

建议保留原 Windows localStorage/profile 状态进行冷启动，验证 profile restore 不再发生旧/新主题重叠。

## 7. 交接原则

如果上述 Windows Electron 中仍出现任何视觉差异，以 Windows 最终 computed style / screenshot / automation report 为最高证据，不以静态 Hard Gate PASS 反驳实际结果。
