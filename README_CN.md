# DK Data Studio

当前版本：**v3.62.6**  ·  Plugin API：**1.18.0**  ·  SDK：**1.18.0**  ·  Theme Contract：**3.6.0**

DK Data Studio 是面向科学数据分析的插件化桌面工作台。Electron、LAN Web 与移动端共享数据、算法与插件契约；Core 负责宿主无关的数据生命周期、科学绘图基础设施、Material/Theme 语义和插件运行时，具体领域分析由插件提供。

## 当前架构原则

- **Core 保持领域中立。** 共振、TER、Pulse、Vth 等领域逻辑不得进入 Core selector、Material role 判定或通用布局 fallback。
- **Core 按职责组织。** `src/core/` 根目录不放实现文件，代码进入 `data / project / scientific / plugins / ui / theme / services / host / performance / workflow / recipes`。
- **插件声明语义，Core 提供基础设施。** PlotView、ScientificPlot、Table、ActionGroup、Selection、History、Theme Material 等由 Core/SDK 统一实现。
- **算法可替换。** 峰检测、FWHM/基线、TER、transport transform 等通过 Algorithm Provider 注册、版本化并记录 provenance。
- **CSS 依靠所有权而不是 specificity。** 已删除 `base/modern` 双层结构和 authored CSS 中的 `!important`，统一使用 Cascade Layers。
- **Theme 采用 Role → Recipe → Tokens。** Core 决定 `chrome/sidebar/surface/elevated/popover/control/floating` 语义角色，主题决定 `clear/thin-glass/soft-glass/liquid-glass` recipe 与 token。
- **语义 Surface 只有一个 base-paint owner。** Workbench 的 Sidebar/Elevated/Surface slot 由 Core 决定 Material Role 与基础 token；插件放入 slot 的直接内容默认透明，不得再用 `surfaceSoft` 覆盖父级语义 Surface。
- **内置插件是可回退的发行版基线，不是不可升级特权。** 同 ID 且版本更高的 `.dkplugin` 可作为 managed override 安装，重启后生效；移除更新层即可恢复 bundled baseline。
- **生成文件不是源码。** `src/generated/` 中的 runtime、Plugin Index、SDK Authoring Reference 和派生图标均可重建，不应手工编辑或提交 Git。
- **自动化测试不等同于实机视觉验收。** Windows Electron 的最终布局、字体与 GPU backdrop-filter 仍需实机确认。

## 项目结构

```text
DK-Data-Studio/
├─ desktop/                    Electron Host、窗口、LAN/更新宿主逻辑
├─ src/
│  ├─ app/                     Application composition source
│  ├─ core/
│  │  ├─ data/                 数据、实体、flow、schema、state
│  │  ├─ project/              项目格式与历史
│  │  ├─ scientific/           ScientificPlot/transform/pipeline/algorithm
│  │  ├─ plugins/              Plugin contract/module/kernel/manager/devtools
│  │  ├─ ui/                   通用 UI infrastructure
│  │  ├─ theme/                Theme runtime / Material renderer
│  │  ├─ host/ services/       Host-neutral bridges
│  │  └─ performance/ workflow/ recipes/
│  ├─ styles/
│  │  ├─ foundation/
│  │  ├─ structure/
│  │  ├─ presentation/
│  │  ├─ theme/
│  │  └─ platform/
│  ├─ plugins/                 第一方插件及 manifest-owned plugin.css
│  ├─ science/                 与 UI 无关的科学基础代码
│  ├─ diagnostics/             跨层集成诊断，不属于 Core
│  ├─ project-importers/       旧工程 → Schema v3 的单一兼容入口，不参与当前运行时
│  └─ generated/               可重建运行时产物/索引
├─ sdk/                        外部插件 SDK、契约与模板
├─ tests/                      回归、契约、边界与性能测试
├─ scripts/                    生成、验证、打包、版本维护
├─ mobile/                     移动端 Shell
├─ services/                   服务实现
├─ tools/windows/              Windows 开发工具箱
└─ docs/                       架构、SDK 与维护文档
```

详细所有权见 `docs/ARCHITECTURE.md`，当前技术债见 `docs/CODE_QUALITY_AUDIT.md`，历史版本统一记录在 `CHANGELOG.md`。

## CSS Cascade

`src/core.css` 明确声明：

```text
foundation < plugin < structure < presentation < theme < platform < window
```

禁止重新建立 `src/styles/base/`、`src/styles/modern/`，禁止在 authored renderer CSS 中使用 `!important`。

## 启动

Node.js 22.12+：

```bash
npm install
npm start
```

`npm start` 会校验 CSS 架构、生成运行时 composition、品牌派生资源、SDK Authoring Reference 与第一方插件索引。

Windows 开发工具箱：

```text
DKDS_GUI.cmd
```

## 验证

```bash
npm run check
```

常用专项：

```bash
npm run sdk:test
npm run performance:test
npm run scientific-plot:test
npm run algorithms:test
npm run plugin-manager:test
npm run mobile:test
```

## 生成文件与清理

当前生成文件包括：

```text
src/generated/runtime/app.js
src/generated/runtime/ui-infrastructure.js
src/generated/runtime/plugin-kernel.js
src/generated/plugin-index.js
src/generated/sdk-authoring-reference.js
assets/dkds-icon.png
mobile/assets/icon.png
mobile/assets/adaptive-icon.png
```

清理：

```bash
npm run clean:generated
```

`assets/dkds-icon-source.png` 是品牌源文件；`assets/dkds-icon.ico` 保留供 Windows 工具箱和打包入口直接使用。

## 关于 Core Runtime composition

Core 与 Application 的**源码组织已经不是单一文件或共享 `.inc` 闭包**。Plugin Kernel、UI Infrastructure 与 Application shell 均为真实 CommonJS 模块图，依赖通过 `require()` 与明确的 runtime entry 表达。`composition.json` 只声明可导入模块与浏览器 entry，生成器把它们确定性打包到 `src/generated/runtime/` 供当前 classic-script renderer 使用；生成物不进入 Git，也不是源码真相。单模块继续执行 48 KiB 上限，同时 Application 的跨模块调用会校验目标导出符号，避免“路径可解析但函数未导出”的重构回归。

## 插件开发

第一方与外部插件遵守同一 Plugin API/SDK 边界。静态领域布局通过 `manifest.styles` 声明，Theme/Material paint 由 Core 统一控制。

```bash
npm run plugin:validate
npm run sdk:harness
node sdk/tools/dkds-plugin.js validate <plugin-directory>
```

## Windows 构建

```bash
npm run dist
```

## 维护规则

新功能或修复进入 Core 前先确认是否属于跨插件基础设施。若只服务某个领域插件，应留在插件；若多个插件需要同一能力，应先抽象为 Core/SDK semantic contract。禁止通过增加 specificity、`!important` 或版本号 hotfix block 继续叠补丁。
