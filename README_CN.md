# DK Data Studio

当前版本：**v3.61.84**  ·  Plugin API：**1.17.0**  ·  SDK：**1.17.16**  ·  Theme Contract：**3.5.0**

DK Data Studio 是面向科学数据分析的插件化桌面工作台。Electron、LAN Web 与移动端共享数据、算法与插件契约；Core 负责宿主、数据生命周期、科学绘图基础设施、Material/Theme 语义和插件运行时，具体领域分析由插件提供。

## 当前架构原则

- **Core 保持领域中立。** 共振、TER、Pulse、Vth 等领域逻辑不得进入 Core selector、Material role 判定或通用布局 fallback。
- **插件声明语义，Core 提供基础设施。** PlotView、ScientificPlot、Table、ActionGroup、Selection、History、Theme Material 等由 Core/SDK 统一实现。
- **算法可替换。** 峰检测、FWHM/基线、TER、transport transform 等通过 Algorithm Provider 注册、版本化并记录 provenance。
- **Theme 采用 Role → Recipe → Tokens。** Core 决定 `chrome/sidebar/surface/elevated/popover/control/floating` 语义角色，主题决定 `clear/thin-glass/soft-glass/liquid-glass` recipe 与 token，插件不得针对宿主结构注入任意主题 CSS。
- **生成文件不是源码。** `src/app.js`、Core runtime bundle、CSS bundle、Plugin Index、SDK Authoring Reference 和派生图标均由命令生成，不应手工编辑。
- **失败应明确。** 不让 readiness、自恢复、fallback 或自动诊断干预正常生产路径；自动化测试通过也不等同于实机 UI 验收。

## 项目结构

```text
DK-Data-Studio/
├─ desktop/                 Electron Host、窗口、LAN/更新宿主逻辑
├─ src/
│  ├─ app/                  App runtime 分段源码
│  ├─ core/
│  │  ├─ plugin-kernel/     插件生命周期/包/权限
│  │  ├─ ui-infrastructure/ 通用 UI、PlotView、ScientificPlot 等
│  │  └─ theme/             Theme runtime / Material renderer / coverage
│  ├─ styles/
│  │  ├─ base/              基础布局与兼容层
│  │  └─ modern/            现代视觉、Material、Theme 层
│  ├─ plugins/              第一方插件
│  ├─ science/              与 UI 无关的科学算法
│  └─ generated/            运行前生成的索引/参考文件
├─ sdk/                     外部插件 SDK、契约与模板
├─ tests/                   回归、契约、边界与性能测试
├─ scripts/                 生成、验证、打包、版本维护
├─ mobile/                  移动端 Shell
├─ services/                SMB、MCP、更新服务等
├─ tools/windows/           Windows 开发工具箱
└─ docs/                    架构、SDK 与维护文档
```

详细所有权规则见 `docs/ARCHITECTURE.md`，当前代码质量与技术债见 `docs/CODE_QUALITY_AUDIT.md`，历史版本变更统一放在 `CHANGELOG.md`。

## 启动

首次使用需要 Node.js 22.12+。Windows 开发工具箱：

```text
DKDS_GUI.cmd
```

命令行开发启动：

```bash
npm install
npm start
```

`npm start` 会先重新生成 Core runtime、现代/基础 CSS、品牌派生资源、SDK authoring reference 与第一方插件索引，因此源码包可以不携带这些派生产物。

## 验证

完整检查：

```bash
npm run check
```

主要专项入口：

```bash
npm run sdk:test
npm run performance:test
npm run scientific-plot:test
npm run algorithms:test
npm run plugin-manager:test
npm run mobile:test
```

测试用于阻止结构和行为回归，但 Windows Electron 的最终布局、玻璃效果、字体与 GPU backdrop-filter 仍需要实机视觉验收。

## 生成文件与清理

以下文件由构建流程生成：

```text
src/app.js
src/core/ui-infrastructure.js
src/core/plugin-kernel.js
src/style.css
src/ui-modern.css
src/generated/plugin-index.js
src/generated/sdk-authoring-reference.js
assets/dkds-icon.png
mobile/assets/icon.png
mobile/assets/adaptive-icon.png
```

清理派生产物：

```bash
npm run clean:generated
```

`assets/dkds-icon-source.png` 是品牌源文件；`assets/dkds-icon.ico` 保留在仓库中供 Windows Developer Toolbox 与打包入口直接使用。

## 插件开发

第一方与外部插件遵守同一 Plugin API/SDK 边界。外部插件应优先使用 SDK 提供的语义组件，而不是复制 Core DOM 或宿主选择器。

常用命令：

```bash
npm run plugin:validate
npm run sdk:harness
node sdk/tools/dkds-plugin.js validate <plugin-directory>
```

Theme 插件应通过 `ui.theme` 注册 profile。选择相同 Material Recipe 的内置主题与 SDK Theme 插件共享同一 Core Material Renderer、Popover Portal、控件绘制和可读性规则。

## Windows 构建

```bash
npm run dist
```

输出包含 NSIS 安装包和 Portable 构建。构建前会重新生成所有派生产物并执行插件验证。

## 维护规则

新功能或修复进入 Core 前先确认它是否真正属于跨插件基础设施。若代码只服务某个领域插件，应留在插件；若多个插件需要同一能力，应先抽象为明确的 Core/SDK contract，再迁移调用方。禁止以版本号注释不断追加覆盖层来解决样式冲突，已有 override 应在确认最终语义后合并回单一所有权文件。
