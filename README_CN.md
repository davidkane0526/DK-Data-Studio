# DK Data Studio — v3.61.6



## v3.61.6 工作台数据作用域与 SDK 1.13

- `pluginType: workbench` 的独立页面在未声明 TOP/SUPPORT workspace role 时，默认注册为顶层主活动；只有显式 `presentation: toolbar` 才进入当前工作台的上下文按钮区。因此独立 Vth 等第三方分析插件不会再被误放进“共振分析”的子功能区域。
- SDK 不再要求插件必须自带图标。插件可声明 `icon` / `workspace.icon`，未声明时 Core 按 `foundation / data / algorithm / workbench / task / extension / developer` 自动提供默认图标。
- `ctx.ui.scientificPlot.create()` 现在可以直接接普通容器；Core 自动创建、尺寸管理并销毁内部 SVG。第三方插件无需知道 ScientificCurveSurface 实际使用 SVG/D3，也不应自行搭建绘图交互基础设施。
- 新增工程级“数据用途/assignment”：一份物理导入数据只保存一次，但可同时分配给多个工作台。普通 workbench 通过 `ctx.data.sources.list()` 自动获得按插件 ID 隔离的 scoped view；不会再因为 Vth/脉冲数据导入而污染共振数据列表。
- “导入数据”仍由统一 Host 导入工作台维护，但增加“数据用途”多选，默认选择当前活动工作台；不选择任何工作台时数据只进入数据中心。数据中心保留单一全局目录，并按“用途”筛选/重新分配，而不是为每个插件复制一套数据标签页。
- Interaction Behavior 增加普通 DOM 列表/树/表格的委托绑定。第一方插件的右键策略统一走 Core Context Action，不再允许插件自行注册 `contextmenu`。
- Plugin API 升级为 `1.13.0`；1.10/1.11/1.12 插件继续兼容。


## v3.61.5 交互行为基座与 SDK 1.12

- 新增独立 `ctx.ui.interactionBehaviors` 能力，把鼠标、键盘、右键、框选和滚轮统一为 Core 的 Interaction Behavior。稳定手势词汇为 `click / double-click / context / drag / box / wheel / key`。
- Interaction Behavior 只负责 **Gesture → Intent / Command**。`ScientificCurveSurface` 继续负责可视 Surface，`point / axis / range` Manipulator 负责直接几何编辑，Selection 负责选中状态，Command Registry 负责最终语义状态变化。
- 科学图交互仲裁固定为“可操纵对象优先于 Selection，Selection/激活优先于背景行为”。拖动结束产生的 click 不得改变 Selection；右键由 Core Context Menu 渲染；框选可声明为区域选择或缩放。
- 键盘采用完整标准化 chord，例如 `Ctrl+Z`、`Ctrl+ArrowLeft`、`Shift+ArrowLeft`，避免仅按 modifier 匹配造成快捷键冲突。
- 共振插件已经作为 Plugin API 1.12 参考消费者迁移：Shift+左键添加点、Shift+右键快速删除、普通右键菜单及键盘操作均通过 Interaction Behavior + Command Registry；插件不再注册私有鼠标/键盘监听。
- 撤销按钮和 `Ctrl+Z` 现在汇合到同一个 `builtin.resonance.undo` Command，避免按钮与快捷键再次出现两套业务路径。
- SDK Workspace 模板同步示范 Command + Interaction Behavior，第三方插件无需复制共振插件代码即可获得同一套键盘、右键、框选与直接操纵基础设施。Plugin API 升级为 `1.12.0`，1.10/1.11 包继续兼容加载。

## v3.61.4 通用直接操纵基座与 SDK 1.11

- `ScientificCurveSurface` 将峰拖动、FWHM 手柄进一步抽象为领域无关的 `Manipulator`：`point`、`axis`、`range`。峰、阈值线、拟合区间、积分区间、裁剪范围、基线控制点、FWHM 分析窗口都只是插件对这些几何原语的领域解释。
- 插件通过 `getManipulators()` 声明可编辑几何，Core 统一负责拖拽、曲线吸附、约束、局部预览、拖动后 click 抑制和一次性 semantic commit。新插件不应再实现私有 D3 拖动循环。
- 共振插件已经迁移为参考实现：峰位是附着在 marker 上的 `point`，FWHM 分析窗口是 X 轴 `range`；插件只在 `onManipulationCommit` 中把通用几何映射回科学状态。
- `getMarkerWidth` 仅负责 FWHM 基线、半高线和交点等测量结果的呈现，不再拥有编辑手柄。旧 `onMarkerDrag*` / `onWidth*` 接口仅保留为 Core 内部的 1.10 兼容适配。
- Plugin API / 独立 SDK 升级到 `1.11.0`；新的 SDK 模板目标版本为 1.11，已有 1.10 插件仍可加载。

## v3.61 交互与多视图绘图性能

- FWHM 边界拖动改为“**拖动预览 / 释放提交**”两阶段。鼠标移动阶段只改变 D3 几何，不再调用 FWHM/局部基线算法；释放后才提交一次科学 transaction 并重算派生量。
- 共振 sweep 的电压边界使用对象级缓存，拖动时不再反复遍历、分配整条曲线数组。
- `ScientificPlot 2.3.0` 新增 Core 统一多图渲染调度。主图可以立即渲染，次要重图按 frame/idle 优先级逐帧补齐，同一视图的未执行请求会合并，避免一次动作把多张 Plotly 图同时压进主线程。
- TER 只声明视图优先级：TER 主热图优先，R–V 下一帧，变换热图和 reduction 图后台补齐；真正的队列、合并和帧调度仍由 Core 管理，不形成 TER 私有性能实现。
- 桌面与移动端 Plotly 从全量 distribution 切换为 Cartesian distribution。当前 DKDS 标准 Plotly 图使用二维 scatter/heatmap，不再为未使用的 3D、地图等模块承担正常加载/解析成本。
- TOP 仍不 `await` Plotly：轻量 Core 依赖装载后立即启动一次非等待的 renderer preload，与插件脚本/工程恢复并行；ready 后 idle warmup 只作复用/兜底。这样 activity-open 首图不必等到 ready 之后才开始加载 Plotly。
- Automation Runner 升级到 `1.17.0`，新增真实 Plotly `Scientific multi-view render scheduling` 测试；源码性能门槛同时防止 FWHM pointermove 再次进入昂贵 metric getter。


## v3.60 科学响应依赖基座

- 独立 TOP 仍不让 Plotly 阻塞窗口启动；声明 Plotly 的插件在窗口 ready 后由 Core 空闲预热，减少第一次计算/出图时的冷启动等待。

- Plugin API / 独立 SDK 升级到 `1.10.0`，新增 `ctx.data.reactive`。插件声明科学状态、派生结果和视图之间的依赖，Core 统一负责 revision、transaction 合并、依赖传播、帧调度以及过期异步结果拒绝。
- 新增 `Scientific Reactive Runtime 1.0.0`。一次用户编辑可以只提交一次 semantic touch；依赖它的 FWHM、Inspector、组图、物理结果或其他视图在同一依赖链上刷新，不再要求插件维护一串 `renderX()` / `renderKey=''` 调用顺序。
- Resonance 作为第一迁移样板：Peak geometry、FWHM window、Peak metrics、identity/visibility/selection/group settings 已进入 reactive dependency；异步峰度量采用 latest-result 语义，旧计算不能覆盖更新后的峰状态。
- 二维框选现在保留 X/Y 几何范围并声明 `targetType`。共振框选以 Peak marker/entity 为目标，不再把矩形 X 范围内的原始曲线采样点误当成峰选择。
- TER 作为第二迁移样板：analysis service 回归纯计算/状态职责，Feature Runtime 是唯一绘图 owner；TOP 不再存在两个 ScientificPlot scope 竞争同一 Plotly DOM。
- TER 选择联动采用轻量 `restyle/relayout` 更新高亮、marker 和 Vds 指示线，只有结果拓扑变化才重建完整 R–V traces，避免每次点击都重新 `Plotly.react()` 整张多曲线图。
- Plotly 继续负责标准结果图/热图，D3 继续负责强交互编辑画布；二者通过统一 Selection/Reactive/ScientificPlot 契约共享状态一致性，不要求插件按 renderer 编写不同的数据刷新逻辑。
- Automation Runner 升级到 `1.16.0`，新增 `Scientific Reactive Dependency` 运行时测试，验证 transaction 合并、依赖传播和 stale async result rejection。


## v3.59 统一表格与交互基座

- Plugin API / 独立 SDK 升级到 `1.9.0`。`ctx.ui.tables` 与 `ctx.ui.settings` 现在是正式公共能力；旧 1.8 插件仍按 1.x 兼容契约加载。
- Core 新增统一 `TableSurface`。普通数据表格默认自动获得拖动列宽、双击/命令自动列宽、排序、恢复原顺序、隐藏/恢复列、复制单元格/行/可见表格以及稳定列状态恢复；插件不再需要自己实现这些基础表格操作。
- 插件可以显式通过 `ctx.ui.tables.bind()` / `mount()` 使用同一接口。动态生成表格由 Core 定向接管，临时匿名表格默认不跨页面共享列状态。
- Core 新增 `SettingsSurface`。插件可以保存用户默认偏好而不污染工程科学状态；共振插件已用于“检查/组图默认位置”和“组图每行列数”。
- Plotly 与 D3 继续保留各自 renderer 优势，但通过统一交互基座收敛 Tooltip、悬浮图工具、缩放/归位和生命周期体验。
- `Ctrl+S` 属于 Core 项目快捷键，独立 TOP 插件窗口也会保存所属工程，插件不应私有覆盖。
- 数据中心和共振数据列表统一使用工程级源数据生命周期：右键可修改标签、排除/恢复、删除；分析插件不拥有源数据本体。
- 共振修复寻峰 Undo、二维框选/局部寻峰、误点击拖峰、峰移动后组图/度量缓存失效刷新等交互问题。
- 插件管理器按“系统插件 / 用户插件”分组。

## v3.58.2 运行时一致性与源数据生命周期

- 修复 TER 独立 TOP 窗口错误注入原始 `DKDSCharts` 导致 `charts.scalarField is not a function`；TOP/SUPER 现在都通过同一 `ScientificPlot` 契约绘制普通图和标量场。
- 修复共振组图被 FWHM 等可选峰度量结果阻塞的问题。Vpk、Ipk 与峰身份直接来自已采纳峰；FWHM、峰高、面积等度量计算完成后再合并，不再导致整组图空白。
- 明确导入源数据所有权：工程 Host 持有 canonical source dataset，Artifact Store 保存其标准 DataTable 投影。分析插件的数据列表只负责分析参与、显示和选择，不负责删除源数据。
- 数据中心新增“移除源数据”。删除直接导入的数据时，同时按 Artifact lineage 清理依赖该源生成的派生结果；其他源数据不受影响。
- 新增 `core.data-sources` 通用 Capability，Data Center 通过公开 Core 能力管理源数据生命周期，独立 TOP 窗口通过现有 Capability Runtime 远程调用主工程所有者。


## v3.58 Host Neutralization 与工程状态单轨化

- 主宿主 `src/app.js` 已移除 Resonance/Peak/FWHM/TER/Gate/Pulse/Sweep 等领域状态、计算、页面渲染和旧交互实现；Core 只保留工程、Artifact、插件生命周期、通用 UI、I/O 与宿主能力。
- 工程格式升级为 schema v2。当前保存只写通用根结构与 `plugins[pluginId]` 命名空间，领域字段不再写回工程根。
- `src/core/project-format.js` 是旧工程的唯一迁移边界：旧 root fields 在读取时一次性迁入对应插件 slice，运行时 Plugin Kernel 与第一方插件不再接收 `legacyProject`。
- TOP 窗口只支持插件自有的 dedicated renderer；已删除重新加载完整 `index.html + app.js` 的 compatibility TOP 路径及其生命周期状态。
- Resonance、TER、Pulse 的持久化只恢复各自 plugin slice；TER 不再读取 Resonance 私有扫描可见性，Resonance Gate 也不再读取 TER 插件私有工程状态。跨插件复用通过公开 Algorithm/Data/Selection/Artifact Contract 完成。
- 新增 `host-neutralization:test` 与硬性源码边界检查，阻止领域状态重新进入 Core，并验证旧工程只做单向迁移。
- v3.57 的独立 SDK 继续有效：普通第三方插件开发仍只需要 `sdk/` 和 DK Data Studio，不需要项目源码。

## v3.57 独立 Plugin SDK 与插件运行时去宿主依赖

- v3.57 首次新增可脱离项目源码单独分发的 `sdk/`（当时为 Plugin API 1.8）；当前 v3.59 分发的 SDK 已升级为 Plugin API 1.9，并继续包含类型声明、manifest schema、独立校验/打包 CLI，以及完整 UI Workspace 与 Algorithm Provider 两类模板。
- 第三方开发者只需要 SDK 和已安装的 DK Data Studio，即可生成可安装的 `.dkplugin`，不再需要复制 `src/` 或使用项目内构建脚本。
- Resonance、TER、Pulse 的 TOP 运行时 Service 改为插件命名空间所有，不再回退到主宿主提供的 `resonance / ter / pulse` 领域 Service。
- 主宿主 `DKDSPlugins.configure(...)` 不再公开 Resonance/TER/Pulse 领域服务或领域页面回调。
- 新增 `sdk:test`：把 SDK 复制到仓库外临时目录后完成 validate → package，再由真实应用 `.dkplugin` normalizer 验证安装包契约。
- v3.58 已完成上述 Host Neutralization：历史领域状态不再存在于主宿主正常运行路径，旧工程只在 `project-format` 入口做一次性迁移。

## v3.56 共享 Scientific Scalar Field 与共振跨曲线特征场

- `DKDSScientificPlot` 升级到 2.2.0，新增共享 `scalarField()`：热图坐标轴/单位、colorbar、diverging zmid、hover、缩放、导出与 renderer 生命周期统一由 Core 管理。
- TER 主热图与可选 Transport Transform 热图已经迁到同一共享 surface；TER/Transform 数值定义没有改变。
- 共振 `gate-analysis` 现在除原有栅压分析结果外，还发布标准 `resonance.feature-field` Matrix Artifact。
- 共振栅压页新增跨曲线特征场，可在峰位、FWHM、峰高、Prominence、面积、局域基线、峰/背景比之间切换，并按正扫/反扫/全部筛选。
- 热图单元保留真实 peak ID；点击后继续进入统一 Selection/Inspector 联动，而不是生成孤立的热图选择。
- 特征场计算不依赖页面 controller，可从可见已采纳峰直接推导峰族，适合 Pipeline、自动化与未来后台计算。

## v3.55 算法包目录、兼容范围与缺失算法恢复

- Algorithm Provider 可以在 manifest 中用 `algorithmProvides` 声明可离线索引的精确算法版本；Core 不需要执行插件代码即可知道某个包是否包含工程锁定的算法。
- 新增 `compatibility.app`、`compatibility.pluginApi` 和 `pluginDependencies` 版本范围；安装、LAN 更新、历史回退与运行时加载使用同一兼容判断。
- TER 与共振在精确算法版本缺失时保留原锁定，并提供“定位/恢复缺失算法”。Core 会优先查当前包和历史包，只恢复兼容候选，恢复后再次验证精确版本。
- 插件包版本与科学算法版本继续分离：Standard Resonance Algorithms 包升级到 2.2.0、Standard Transport Algorithms 包升级到 1.1.0，但现有科学算法仍是 1.0.0，数值定义未改变。
- v3.52.2 的 Lazy Plotly、v3.53 的 Provider 路由和 v3.54 的默认版本/工程精确锁定机制保持不变。

## 历史说明：v3.28.0 及之前

## v3.27 核心 UI / 状态基础设施

- 新增插件无关的 `DKDSUI` 基础设施：布局区域、持久化分栏、动态按钮组、Activity 快捷键、鼠标/指针交互、右键菜单、联动选择、Plotly 生命周期、View/Controller Host 和通用 Workbench。
- 任意插件图表/数据卡可以注册为 Portable View：恢复原位、固定左/右/底部、悬浮、拖动、缩放、双击切换、右键选择位置，并由核心保存位置。
- 新增 `DKDSState`，统一插件状态订阅、迁移、撤销/重做和工程命名空间持久化。工程格式仍自包含，不依赖原始 CSV/TXT/DAT。
- 共振 `super-layout.js` / `window-runtime.js` 已缩减为纯 Host Adapter；科学功能、渲染和交互由共享 Controller / View / `feature-runtime.js` 持有。
- TER、Pulse、Data Center 开始迁移到同一基础设施：统一动态命令栏和 Portable scientific views；Data Center 同时迁入核心 State Store。
- Plugin API 升级到 v1.4.0。新插件应以 `docs/PLUGIN_UI_INFRASTRUCTURE.md` 为基础，不再自己实现 docking、全局 keydown 或 resize 框架。

## v3.24 插件内存 / 共振独立窗口 / 工程兼容性

- 插件管理器为所有具有独立窗口的插件提供“预热”选项。DKDS 内置 TOP 插件默认关闭预热以降低空闲内存，用户可以逐个开启。
- 共振分析 TOP 已改为真正的 dedicated plugin window，不再通过 compatibility 模式启动第二套完整应用；SUPER 模式仍保留成熟的完整共振工作区。
- 桌面版与网页版统一使用 `src/core/project-format.js` 打开/保存工程。工程继续同时保存原始文本与解析后的点数据，因此复制 `.dkds.json` 到没有原始 CSV/TXT 的电脑仍可完整显示和继续分析。
- （v3.24 历史行为）当时旧工程根字段仍会继续保留；自 v3.58 起已改为读取时一次性迁移，新的保存结果不再写回这些领域根字段。
- TER 吸收 Graphene Resonance Studio 中经过 Python 参考脚本校验的电压网格/自动容差逻辑，并增加 R–V 联动、图表排列、逐图导出等交互；没有移植其旧的整体应用架构。
- 插件启停/重载后插件管理器回到有效顶部视口，分析页采用 top/bottom 约束，避免再次出现内容整体上移后下方大面积空白。

## v3.23 SUPER / TOP / PRIME / SUB 工作区契约

- 主界面不再等同于“第一个独立插件”。用户在插件管理器中显式选择唯一 **SUPER**；当前 SUPER 不能直接停用。
- 所有满足契约的独立插件都是 **TOP**，均可被提升为 SUPER；非 SUPER TOP 继续使用独立窗口、预热和隐藏复用。
- TOP 用通用 `root / left / main / flatten` 语义槽位声明主界面布局。核心不再写死 Data Center、TER、Pulse 等插件名。
- SUPER 主工作区统一为可调宽 LEFT + MAIN：LEFT 默认约 1/5，用于数据/显示控制；MAIN 默认约 4/5，用于主图、主要数据操作、鼠标交互与浮动工具。
- **PRIME** 是可停靠/浮动的增强界面，允许 `float / right / bottom`；**SUB** 拥有自己的工具页/面板，关闭后回到当前 SUPER。
- SUPER 选择是本机 UI 偏好，不随工程文件改变。若已保存 SUPER 不可用，软件要求用户重新选择，不会偷偷切换到另一个 TOP。
- 顶部一级/二级按钮统一为 34 px 控件高度，并移除选中工作区按钮底部蓝色描边。

完整开发契约见 `docs/SUPER_TOP_WORKSPACE_CONTRACT_CN.md`。


## v3.22 共享工具链与应用图标

- 新增精简 DK 专属图标，并接入桌面标题栏、Electron 窗口、Windows 安装包和 Android 图标。
- DKDS 与 PyDroid 构建工具统一支持 `DK_TOOL_ROOT` / `DK_CACHE_ROOT`。本机存在 `D:\Code\NodeJs` 时会自动把 `D:\Code` 作为共享工具根目录。
- JDK、Android SDK、Node、Python 等可安装一次后跨项目复用；npm/pnpm、Electron、electron-builder 和 Gradle 使用公共缓存，避免重复下载。
- Electron、electron-builder 和 Gradle **不做全局固定版本安装**，仍由各项目声明版本，只共享下载缓存，避免项目间版本冲突。
- 新增 `DKDS.cmd toolchain`，可直接查看当前实际复用的工具与缓存路径。

推荐：

```text
DK_TOOL_ROOT=D:\Code
DK_CACHE_ROOT=D:\Code\BuildCache
```

完整说明见 `docs/guides/SHARED_TOOLCHAIN_CN.txt`。

> v3.28.0 完成 TOP/SUPER 通用化修复与 TER / Pulse / Data Center 共享 Controller/View/Feature Runtime 迁移；图表位置控制改为统一紧凑位置菜单。
> v3.27.1 修复了 Developer Toolbox 的缓存绑定：修改“共享缓存根目录”后，npm/pnpm/Electron/electron-builder/Gradle 与共享 node_modules 会真正跟随新目录，构建日志会显示并校验实际生效路径。


## v3.21 UI / 插件界面 / 多窗口工作区

v3.21 将软件正式更名为 **DK Data Studio**，外部插件统一使用 `.dkplugin`。本版本重点修复顶部 UI、组图布局偏好、导入行为、插件可配置界面以及 Android 构建环境。

关键变化：

- 顶部命令栏增大字号与控件高度，`共振分析` 与其专属命令归入同一视觉组。
- 共振框选菜单改为 `ui.selectionMenus` 插件贡献，不再由核心写死。
- 主图局部工具由 `ui.mainTools` 插件贡献，包括“适应视图”。
- 组图每行列数是本机 UI 偏好，跨新建、导入和打开项目保持，不再被工程文件重置。
- 打开“导入数据”只显示导入工作台；只有点击“导入文件”才弹出系统文件选择器。
- 独立分析插件通过统一 `manifest.window` 契约打开 Electron 窗口；当前数据中心、TER、脉冲分析均使用该机制，安装的 `.dkplugin` 也可使用同一契约。窗口支持自动预热、关闭后隐藏复用、插件命名空间结果缓存与 artifact 增量合并，不再依赖三个功能名的白名单。
- Android 构建仍只生成独立签名的 release APK，并自动搜索 Android SDK、`adb`、Android Studio JBR/JDK 与常见 JDK 安装位置。

### 顶部工作区布局

```text
DK Data Studio | 导入/项目 | 编辑 | [共振分析 + 共振命令] | 数据中心/TER/脉冲 | 导出 | 管理
```

在 v3.21 中，`openMode:'window'` 的分析 Activity 默认使用独立窗口且主窗口固定为共振；**v3.23 起该规则已由显式 SUPER 选择取代**。新增 TOP 仍无需修改主程序窗口名单。

## v3.20 UI 与工程整理

v3.20 不增加新的科学定义，重点是把 plugin 分支整理成适合下一阶段长期开发的工程。

### 单行自适应命令栏

桌面顶部不再固定分成两行。当前结构为：

```text
DKDS | 导入/工程 | 编辑 | Activity | 当前工作区命令 | 导出 | 管理
```

Activity 过多自动进入 `工作区 ▾`；当前插件命令过多则按插件声明的 `priority / order / section` 自动保留高优先级动作，其余进入 `更多 ▾`，而不是新增第二行。

普通 UI 使用统一字号和控制高度 token，按钮更紧凑但保持完整命中范围。

### Windows 工具入口只剩两个

```text
DKDS_GUI.cmd   推荐的图形开发工具箱
DKDS.cmd       统一命令行入口
```

旧的构建、Android、更新服务器、自启动等一批 CMD 已合并到：

```text
tools/windows/dkds-tools.ps1
tools/windows/dkds-gui.ps1
```

详细说明：`docs/guides/TOOLBOX_CN.md`。

### 工程目录整理

```text
services/update-server/   局域网更新服务
config/                   默认运行配置
tools/windows/            Windows 开发/构建工具
docs/guides/              操作指南
docs/releases/            发布快照
```

下一会话首先阅读：`docs/HANDOFF_NEXT_SESSION.md`。


## v3.19 成熟共振工作区完成 Plugin-Native UI 迁移

v3.19 的目标不是增加新的科学功能，而是用现有成熟共振工作流验证插件框架的完整性。

### UI 从“功能按钮堆叠”改为 Activity / Context

顶栏分成：

```text
全局命令 | 工作区 Activity | 系统命令
                 ↓
          当前工作区工具栏
```

插件越多时，Activity 自动进入 `工作区 ▾`；当前工作区工具过多时自动进入 `更多 ▾`。

科学插件不再把所有按钮永久堆在顶栏。

### 共振 UI 已归属插件

`builtin.resonance-workbench` 现在负责：

```text
共振 Activity
数据列表 sidebar
寻峰/算法选择 sidebar
共振显示 sidebar
主图 provider
主图工具
框选菜单 overlay
曲线/峰检查器 provider
组图 view + subplot providers
物理机制 panel
峰间距 page
栅压分析 page
共振专用导出
```

核心 `index.html` 不再包含“智能寻峰”“手动操作”、共振 range menu、物理机制 panel、峰间距/栅压页面等测量场景 UI。

### 寻峰算法是独立插件

成熟的 multichannel/multiscale Ricker 寻峰器已拆成：

```text
builtin.resonance-detector-robust
```

共振工作台只消费 `peak.detectors` provider。

因此以后可以同时安装：

```text
robust detector
ML detector
instrument-specific detector
high-SNR detector
...
```

每个 detector 自己声明：
- detect 算法；
- presets；
- 参数 UI / parameter schema；
- evidence 名称；
- 峰标记形状；
- detector version。

工作台不再为某个具体寻峰算法硬编码设置面板。

### Transport / TER 数值算法同样插件化（v3.53+）

Core 继续拥有 Transform Registry、Scientific Pipeline、数据类型和 provenance，但不再把可升级的数值实现视为 Core 的最终权威。内置 `builtin.standard-transport-algorithms` 以精确版本提供：

```text
transport.raw@1.0.0
transport.detrend@1.0.0
transport.didv@1.0.0
transport.d2idv2@1.0.0
transport.dlog@1.0.0
transport.dvdi@1.0.0
transport.resistance@1.0.0
transport.scalar-field@1.0.0
ter.high-low-ratio@1.0.0
```

Workbench 只声明需要的算法类别，Dedicated TOP 由宿主按类别自动装载本地 Provider。工程结果锁定 `pluginId + algorithmId + algorithmVersion + parameters`；未来 2.0 算法可以与 1.0 并存，不会静默改变旧结果。`src/science/*` 中对应入口只保留兼容/参考职责。

### 主图 / 检查器 / 组图均成为 provider

新的 Workspace API v1.2 包含：

```text
ui.activities
ui.sidebar
ui.mainViews
ui.mainTools
ui.mainOverlays
ui.inspectors
ui.groupViews
ui.groupCharts
ui.pages
ui.panels
peak.detectors
```

因此未来 Raman / FET / Retention / Image 等插件可以替换：
- 主图类型和交互；
- 检查器内容；
- 组图有哪些子图；
- 子图数据来源；
- Plotly 绘制方式；
- 单击图中数据后的联动行为；
- CSV / SVG / PNG 导出语义。

### TER 与 Pulse 页面也不再属于 Core HTML

`TER` 和 `Pulse / Read` 页面现在由各自插件运行时动态创建，核心只保留通用 analysis-page host 和成熟兼容计算服务。

### 空间占用优化

永久显示的“手动操作”说明块和：

```text
拖框=操作 · Ctrl+拖框=缩放
```

提示已删除。

快捷键/操作说明以后应放到插件帮助、context menu 或可展开帮助中，而不是长期占据科学工作区。

### 稳定性约束

新增：

```bash
node scripts/check-plugin-boundaries.js
```

并纳入：

```bash
npm run check
```

如果以后 AI 再把智能寻峰、共振页面、Pulse/TER 页面等硬编码回 `src/index.html`，检查会直接失败。

详细开发接口见：

```text
docs/WORKSPACE_PLUGIN_API.md
```





### 可安装的外部插件包

桌面端插件管理器支持安装受信任的 `.dkplugin`。因此新的寻峰算法、工作区、Inspector 或组图实现可以作为独立插件安装，而不必重新修改 Core。更新同 ID 外部插件时，如果新版本加载/激活失败，运行时会尝试恢复旧包。

开发/打包说明：

```text
docs/PLUGIN_PACKAGES.md
examples/external-plugins/resonance-detector-template/
```

上下文工具栏还支持插件声明 `section` 和 `priority`：同类命令自动形成视觉分组，窗口不足时低优先级命令先进入“更多”菜单。

## v3.18 可定制数据处理中心：完成 Data Model / Workflow / Recipe / 参数 Schema / Formula

本版本不是继续增加一个新的“专用分析功能”，而是完成下一层通用平台能力。

新增内置插件：

```text
Data Center
```

它提供一个面向不写代码用户的通用工作区：

```text
数据对象
  ↓
公式派生列
  ↓
Processor / Analyzer 工作流
  ↓
Recipe 保存
  ↓
Chart Provider
  ↓
Provenance 检查
```

### 1. 标准 Data Model + Provenance

新增：

```text
src/core/data-model.js
```

核心对象包括：

```text
DataTable
Series
Sweep
EventSeries
ImageData
PeakSet
FitResult
AnalysisResult
Annotation
```

每个工程标签页都有自己的 Artifact Store。

现有石墨烯 I–V 数据会自动映射成标准 `data.table`，但这些镜像对象标记为 transient，因此保存工程时不会再复制一份原始 I–V 数据。

新的派生数据会真正写入工程：

```json
{
  "dataModel": {
    "schema": 1,
    "artifacts": []
  }
}
```

每个派生结果保留：

```text
源数据
处理器
插件
版本
参数
输入 artifact id
输出 artifact id
workflow execution id
node id
人工/自动状态
时间
```

### 2. Processor / Analyzer / Chart 插件接口

Plugin API 更新为 v1.1，并新增：

```js
ctx.workflow.processors.register(...)
ctx.workflow.analyzers.register(...)
ctx.charts.register(...)
ctx.workflow.recipes.register(...)
```

不同实验场景以后优先增加 provider，而不是增加主程序分支判断。

### 3. Workflow / Recipe Engine

新增：

```text
src/core/workflow-engine.js
```

支持：

```text
DAG 节点依赖
拓扑排序
循环依赖检查
Processor / Analyzer / Chart node
input:xxx / node:xxx 引用
Recipe 级参数
参数绑定
输入/输出 Artifact 类型检查
运行进度事件
执行 provenance
```

Data Center 中已经提供顺序工作流编辑器，用户可以添加、删除、上下移动 Processor / Analyzer，并保存为当前工程的 Recipe。

### 4. Schema-driven 参数面板

新增：

```text
src/core/parameter-schema.js
```

插件现在可以声明参数，而不必重复编写 HTML：

```text
text
textarea
formula
number / integer
boolean
select / multiselect
column / columns
color
```

系统统一负责：

```text
默认值
必填
min/max
正则验证
自定义验证
条件显示
DataTable 列选择
桌面布局
手机单列布局
触摸屏控件尺寸
```

### 5. Formula / Derived Column

新增：

```text
src/core/formula-engine.js
```

例如直接输入：

```text
abs(Vd / Id)
log10(abs(Id))
sqrt(X^2 + Y^2)
[Gate Voltage] / 10
```

即可生成新的 DataTable 列。

Formula Engine 使用 tokenizer + parser + AST，不使用 `eval()` 或 `new Function()`。

因此既适合科研数据表达式，也不会把公式框变成任意 JavaScript 执行入口。

### Data Center 当前内置的通用 provider

```text
Processor
├─ 公式派生列
├─ 选择列
└─ 有限值筛选

Analyzer
└─ 列统计摘要

Chart
└─ XY 多序列图
```

这些只是平台能力示例；以后 Raman、FET、Retention、Endurance 等插件可以继续注册新的 Processor / Analyzer / Chart / Recipe，而不修改 Data Center 主体。

详细开发文档：

```text
docs/DATA_MODEL.md
docs/WORKFLOW_RECIPES.md
docs/PARAMETER_SCHEMA.md
docs/FORMULA_ENGINE.md
```


## v3.17 插件管理

顶部新增：

```text
插件
```

打开后可查看全部已打包插件的：

```text
名称 / ID / 版本 / API 版本
Capabilities
已注册运行时贡献
启用 / 停用 / 错误状态
```

支持：

```text
搜索
状态筛选
即时启用 / 停用
重新加载
错误重试
恢复默认
复制插件诊断
```

插件开关是本机全局设置，不写进单个 `.dkds.json` 工程。

停用插件前会先保存当前工程中该插件的 namespaced state。即使插件处于停用状态，保存工程时也会保留原有 plugin namespace；重新启用后自动恢复，因此停用插件不会导致其工程数据被静默删除。

当前插件管理器管理**已经随应用打包/发现的插件**。外部插件包安装、权限声明与签名校验属于后续插件分发层，不在本版中伪装成“安装”按钮。



## 3.16.0-plugin.1：成熟科学逻辑重写 + React Native Android

这次不再保留“科学算法通过旧 `analysis.js` 兼容桥运行”的方案。

原来集中的成熟计算逻辑已经拆为共享科学引擎：

```text
src/science/
├─ common.js
├─ presets.js
├─ import.js
├─ peaks.js
├─ identity.js
├─ physics.js
├─ gate.js
├─ ter.js
└─ pulse.js
```

`src/analysis.js` 只保留历史 API facade。桌面、LAN 网页和 Android 都执行同一份 `DKDSScience`。

重写后增加：

```bash
npm run science:parity
```

该脚本会从 Git 的 `main` 分支直接读取原 v3.14 `src/analysis.js`，用代表性数据对比新旧：

```text
CSV 解析
扫描重构
信号变换
寻峰
TER matrix
脉冲 / 读取提取
```

从而让“重构代码”和“改变科学结果”成为两件可分别审查的事情。

### Android 可安装测试版源码

新增：

```text
mobile/
```

技术路线：

```text
React Native / Expo SDK 57
        ↓
react-native-webview
        ↓
Android 离线 assets
        ↓
完整插件界面 + DKDSScience
```

Android 壳层提供原生：

```text
DocumentPicker 多文件选择
Clipboard
CSV / JSON / SVG / PNG 保存与分享
Safe Area
Android 生命周期容器
```

Windows 最简单的 APK 测试流程：

```text
DKDS.cmd android-build
```

成功后生成：

```text
mobile-dist\DK-Data-Studio.apk
```

本地构建使用独立 release 签名，签名文件保存在 `%LOCALAPPDATA%\DKDataStudio\android-signing`，不会写入 Git。建议备份该目录以保持后续 APK 的覆盖安装能力。 若设备仍安装旧签名版本，首次切换需先卸载旧版，再安装新的 release APK。

然后：

```text
DKDS.cmd android-install
```

或者连接开启 USB 调试的手机后运行：

```text
DKDS.cmd android-run
```

详细环境见：

```text
mobile/README_ANDROID_CN.md
```




> **分支身份非常重要**
>
> - `main`：保留原来的 v3.14 完整基线，不与本分支混用。
> - `plugin`：当前检出的插件架构开发分支。
> - Git tag `v3.14.0-main-baseline` 指向插件化之前的基线。

## plugin 分支开发入口

先阅读：

```text
AGENTS.md
docs/ARCHITECTURE.md
docs/PLUGIN_API.md
docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md
docs/ANDROID_PORTING.md
docs/BRANCHING.md
```

检查工程：

```bash
npm run check
npm test
```

启动开发版：

```bash
npm start
```

新增插件时，不需要修改 `index.html`。在：

```text
src/plugins/<plugin-name>/
```

增加 `plugin.json`、`plugin.js` 和 README，然后：

```bash
npm run plugin:index
npm run plugin:validate
```

正常的 `npm start / npm test / npm run check / npm run dist` 都会自动重新生成内置插件索引。

### 当前插件化边界

3.16 开始，成熟的**科学计算逻辑已经完成共享引擎重写**：

- 插件系统负责发现、加载、功能入口、工具栏、页面/面板、扩展注册表和插件工程状态；
- `src/science/*` 统一提供导入解析、扫描重构、寻峰、峰序轨迹、物理分类、栅压计算、TER 与脉冲分析；
- `src/analysis.js` 只保留历史 API facade，不再承载算法实现；
- Electron、LAN 网页和 React Native Android 使用同一份 `DKDSScience`；
- 成熟工作区的 DOM/Plotly/D3 交互控制仍由共享 renderer host 组织，插件负责功能入口与工作流；后续 UI 原生化不得复制科学算法；
- 新增科学功能默认写为插件，跨插件可复用的纯计算才进入 `src/science`。




## v3.14 局域网网页版二维码与连接面板重构

### 二维码连接

桌面端顶部：

```text
网页版
```

面板现在直接显示二维码。

服务运行后，例如选择：

```text
http://192.168.1.100:45910/
```

会自动生成对应二维码。

#### 使用 4 位 Key 时

假设当前 Key 为：

```text
4827
```

二维码内部实际使用一次连接链接：

```text
http://192.168.1.100:45910/?key=4827
```

手机扫码后服务器会：

```text
验证二维码中的 Key
→ 建立 HttpOnly 配对会话
→ 跳转 /app/
→ 直接进入 DK Data Studio
```

因此扫码使用时不再需要再手动输入一次 4 位 Key。

浏览器最终会跳转到 `/app/`，Key 不会继续保留在地址栏中。

当你：
- 点击“换一个 Key”
- 或重新启动网页版服务

旧二维码携带的旧 Key 将不能再自动配对。

#### 免 Key 模式

勾选：

```text
免 Key 访问
```

后，二维码只包含普通局域网地址：

```text
http://192.168.1.100:45910/
```

扫码即可直接进入。

### 多网卡 / 多 IP

如果电脑同时连接：
- Wi-Fi
- 有线网卡
- USB 网卡
- 虚拟网卡

面板左侧会列出服务器可用的局域网地址。

点击某个地址后：

```text
当前地址
→ 分享链接
→ 二维码
```

三者同步切换。

通常应选择与访问设备处于同一局域网中的 IP。

### 新布局

“局域网网页版”面板改为：

```text
┌─────────────────────────┬─────────────────────┐
│ 服务状态                │ 扫码连接            │
│                         │                     │
│ 服务设置                │      [ QR ]         │
│ - 开启网页版            │                     │
│ - 免 Key                │ 当前分享地址        │
│ - 端口                  │                     │
│ - 4 位 Key              │ 复制扫码链接        │
│                         │ 刷新二维码          │
│ 可用局域网地址          │                     │
└─────────────────────────┴─────────────────────┘
```

窄窗口下自动变为上下单栏，不再强行挤压两侧内容。

新增操作：

```text
复制地址
复制扫码链接
刷新二维码
换一个 Key
```

其中：
- “复制地址”复制不含 Key 的普通 LAN 地址；
- “复制扫码链接”在启用 Key 时包含本次临时 Key，与二维码内容一致。

二维码使用本地 `qrcode` 生成，不调用任何互联网二维码网站。



## v3.13 多文件脉冲分析工作区

脉冲分析的数据模型从单文件改为：

```text
Pulse Analysis Project
├─ File A
│  ├─ label
│  ├─ column mapping
│  ├─ extraction settings
│  └─ result
├─ File B
│  ├─ ...
└─ File C
   └─ ...
```

### 一次导入多个文件

点击：

```text
添加文件
```

系统文件选择器支持多选。

左侧文件管理器支持：

```text
勾选 / 取消勾选
全选
全不选
移除勾选
点击某个文件设为当前文件
```

文件条目显示：
- 显示标签
- 原始文件名
- 待处理 / 已分析 / 错误
- 识别出的读取电压
- 脉冲 / 读取对数量

### 每个文件独立设置

当前文件可以单独设置：

```text
显示标签
时间列
电流列
脉冲电压列
每个平台点数
稳态窗口
读取平台配对方式
```

这些参数存放在文件自身，而不是一个全局参数对象。

如果一批文件来自同一种仪器格式，可以使用：

```text
当前设置应用到勾选文件
```

然后：

```text
分析全部勾选文件
```

### 多文件结果呈现

原始波形诊断：

```text
始终只显示当前文件
```

因为 Time–Vd / Time–Id 瞬态波形如果几十个文件一起叠加，会失去诊断意义。

提取结果图提供：

```text
显示范围：
  全部勾选文件
  仅当前文件
```

多文件模式下：

```text
每个文件 = 一条 Plotly trace
```

因此可以直接比较：
- 不同读取电压
- 不同器件
- 不同循环
- 不同测试条件
- 同一器件不同时间点

两张结果图都继续支持：
- 复制当前可见数据
- 导出当前可见 CSV
- 导出 SVG
- 导出 PNG

### 批量结果表

结果表增加：

```text
标签
源文件
```

再接：

```text
Vpulse
Ipulse
Vread
Iread
Pulse time
Read time
Pulse block
Read block
```

因此多个文件合并复制或导出后仍能追溯每一行数据来自哪个文件。

### 工程隔离与持久化

脉冲工作区现在和主数据导入管理器一样按项目标签页隔离。

```text
项目 A -> A 的脉冲文件
项目 B -> B 的脉冲文件
新建项目 -> 空脉冲工作区
```

保存 `.dkds.json` 时会保存：
- 原始脉冲文本数据
- 文件标签
- 勾选状态
- 每文件提取设置
- 是否已完成分析

重新打开工程时会恢复这些内容，并重新生成分析结果。



## v3.12 组图默认 3 列与脉冲分析界面重构

### 组图初始排列

新建工程默认：

```text
每行 3 个子图
```

而不是“自动”。

用户仍可以在组图面板中切换：

```text
自动 / 1 / 2 / 3 / 4 / 5 / 6
```

旧工程如果已经保存过自己的排列方式，仍继续使用工程中保存的设置。

### 脉冲分析页面重新排版

脉冲分析现在按四个独立区域组织：

```text
数据源与提取设置

原始波形诊断
  Vd-Time
  Id-Time

脉冲电压 → 读取电流
脉冲电压 → 脉冲电流

提取结果表
```

原始波形诊断不再隐藏在折叠面板中，也不再把 Vd 与 Id 强行叠加在同一绘图区。
现在采用上下两个独立 y 轴区域并共享 Time 轴，因此完整脉冲序列更容易检查。

### 每张图都有自己的数据与图形导出

原始波形：

```text
适应全部
复制数据
导出 CSV
导出 SVG
导出 PNG
```

读取电流图：

```text
复制数据
导出 CSV
导出 SVG
导出 PNG
```

脉冲电流图：

```text
复制数据
导出 CSV
导出 SVG
导出 PNG
```

CSV 始终输出原始物理单位：
- 电压：V
- 电流：A

图中为了可读性自动显示 mA / µA / nA / pA，不会改变导出的数值。

### 提取结果表

“提取结果”现在有独立标题、分析摘要和操作按钮。
数据表位于下方全宽区域，支持滚动，表头固定。

完整表格包含：

```text
Vpulse
Ipulse
Vread
Iread
Pulse time
Read time
Pulse block
Read block
```

并保留“复制全部数据 / 导出全部 CSV”。



## v3.11 双向共振 TER / 局域网网页版 / 脉冲分析

### 1. 组图 TER 改为双向共振候选

旧“峰位 TER”要求同一个峰标签在正扫和反扫都存在峰位，因此如果：

```text
正扫：没有检测到该共振峰
反扫：存在清楚共振峰
```

该 Vg 会被漏掉。

v3.11 改为：

```text
正扫峰位集合 ∪ 反扫峰位集合
        ↓
作为共振候选 Vd
        ↓
在每个候选 Vd 上读取正扫和反扫原始 I-V
        ↓
同一个 Vd 计算 R_up / R_down
        ↓
TER = (R_high - R_low) / R_low × 100%
        ↓
取该峰族最大的共振位 TER
```

因此反扫单独出现的共振仍可计算 TER。

这与独立 `TER_max` 页面仍有区别：
- 组图“共振位 TER”只检查已确认共振峰提供的候选 Vd；
- `TER_max` 页面扫描完整同 Vd 网格，不依赖峰。

### 2. 组图新增峰电流 Ipk

组图现在新增：

```text
峰电流 Ipk vs Vg
```

保留正扫/反扫的方向和颜色区别，并可点击点反向定位主图。

### 3. 局域网网页版

顶部新增：

```text
网页版
```

桌面端可以直接启动一个局域网 HTTP 服务。

默认端口：

```text
45910
```

默认生成随机 4 位 Key，例如：

```text
4827
```

同学在同一 Wi-Fi / 局域网浏览器打开面板显示的地址：

```text
http://192.168.x.x:45910/
```

第一次输入 4 位 Key 即可进入。

也可以勾选：

```text
不需要配对 Key
```

此时同局域网设备可直接打开。

网页版复用同一套 D3 / Plotly / Analysis / app.js，支持：
- 数据导入工作台
- 多项目
- 寻峰
- 框选与峰编辑
- 组图
- TER / TER_max
- 峰间距
- 栅压分析
- 脉冲分析
- 工程 JSON 读取 / 下载
- CSV / SVG / PNG 导出
- 剪贴板复制

网页版的数据文件由访问网页的那台电脑/平板自己选择，不会上传到第三方服务器。

### 4. 导入管理器按工程隔离

待导入文件列表现在属于具体项目标签页。

```text
项目 A -> A 自己的待导入文件
项目 B -> B 自己的待导入文件
新建项目 -> 空导入列表
```

另外增加文件选择器重入锁，快速双击“导入”也只打开一个系统文件管理器。

### 5. 框选统一峰序 / 峰标签

直接框选多个峰后，菜单新增：

```text
统一峰序 / 峰标签
```

可以把框选峰统一设置成同一峰类别，例如：

```text
峰序 3
标签 AB
```

这些点会作为跨 Vg ridge 的人工 anchor。

### 6. 新建工程默认布局

默认改为：

```text
主图右侧：曲线检查器
主图下方：组图
```

两者仍可随时恢复成悬浮窗口。

### 7. DataDeal 风格脉冲分析

新增：

```text
脉冲分析
```

针对类似：

```text
Time, Id, Time, Vd
```

的瞬态脉冲数据，程序自动：
1. 识别时间 / 电流 / Vd 列；
2. 识别每个电压平台的采样点数；
3. 判断重复出现的读取电压平台；
4. 对每个平台中心稳定窗口求平均；
5. 将脉冲平台与相邻读取平台配对。

直接生成两张图：

```text
脉冲电压 Vpulse -> 读取电流 Iread
脉冲电压 Vpulse -> 脉冲电流 Ipulse
```

默认稳定窗口为平台的 25%–75%，也可修改。
平台点数填 `0` 时自动识别。

同时提供原始 Time-Vd / Time-Id 诊断图和完整 CSV 结果。



## v3.10 主图交互与 Vg 标记

### Vg 可直接标记
左侧数据列表原来的：

```text
Vg=? V
```

改为可直接编辑的数值框。

修改一个数据组的 Vg 后，会同步更新：
- 对应正扫/反扫 sweep
- 峰参数中的 Vg
- 组图横坐标
- 峰间距 / 栅压分析
- TER 按 Vg 的重新计算

支持留空表示未知。

### 导入工作台逐列 / 逐数据组 Vg
“列映射”下面新增“每组数据的 Vg”。

例如：

```text
Vd    I1    I2    I3
```

使用“共享一个 V + 多个 I”时，可以分别填写：

```text
I1 -> -10 V
I2 ->   0 V
I3 -> +20 V
```

留空则继续使用：
- 列标题自动识别
- 文件名 / 文件头识别
- 全局手动 Vg

逐列填写值具有最高优先级。

对：

```text
V1/I1, V2/I2, V3/I3
```

成对多列格式同样可以逐数据组设置 Vg。

### 曲线更容易点击
显示曲线仍保持原线宽，但增加一条 14 px 宽的不可见命中轨道。

此外，即使鼠标没有精确落在轨道上，主图背景单击也会在约 18 px 范围内寻找最近曲线。

因此：
- 普通点击更容易凸显曲线
- Ctrl + 点击附近即可向最近曲线添加峰
- 不需要精确命中 1 px 左右的绘图线

### 峰位点击和拖拽不再互相排斥
峰位视觉标记与鼠标命中区现在分离。

每个峰都有更大的透明命中圆，统一处理：
- 单击：选中峰并打开曲线检查器
- 双击：打开/置顶检查器
- 拖拽：移动峰位
- Ctrl + 右键：删除

拖拽使用 7 px movement threshold，轻微鼠标抖动不会吞掉 click。

单击峰后立即成为 `selectedPeak`，因此可以直接：

```text
← / →          移动峰位
Ctrl + ← / →   切换上一个 / 下一个峰
```

### 主图滚轮缩放
鼠标位于绘图区时直接滚轮：

```text
滚轮向上 -> 放大
滚轮向下 -> 缩小
```

X/Y 同时围绕鼠标所在数据位置缩放。

仍保留：

```text
Ctrl + 拖框 -> 框选缩放
R           -> 重新居中
```

### 主图图例重排
Vg 图例不再绘制在 SVG 左上角。

现在主图顶部采用独立布局：

```text
[主图操作按钮] [横向可滚动 Vg 图例]
```

主图数据区域为该顶部栏预留空间，因此图例不会再与“智能峰序 / 锁定 / 物理标记”等按钮重叠。

点击图例条目也可以凸显对应数据。

### 曲线检查器：悬浮 / 右侧停靠
曲线检查器标题栏新增：

```text
停靠右侧
```

可在：

```text
悬浮窗口
↔
主图右侧嵌入
```

之间切换。

右侧停靠时：
- 主图宽度自动减小
- 检查器不会遮挡曲线
- 拖动检查器左边缘可改变宽度
- 点击“恢复悬浮”重新变成可拖动/缩放窗口

停靠模式、停靠宽度和悬浮窗口位置均保存在工程中。



## v3.9 数据导入工作台

顶部 Windows/Electron 原生 `File / Edit / View / Window / Help` 菜单栏已完全移除。
应用自己的工具栏不受影响。

点击“导入”现在进入独立的 **数据导入工作台**，默认自动识别，特殊数据可逐文件调整。

支持的文本型文件：
- CSV
- TXT
- DAT
- TSV
- ASC
- XY
- IV
- “All Files”中的其他文本格式

支持：
- 自动 / UTF-8 / GB18030(Gbk) / Big5 / Shift-JIS / UTF-16 LE/BE / Windows-1252 编码
- 跳过前 N 行
- 指定结束行
- 自动 / 逗号 / Tab / 分号 / 空格 / 竖线分隔
- 自动表头 / 第一行表头 / 无表头
- 小数点或小数逗号
- `#`、`%`、`//`、`!` 等注释行
- V、mV、µV 与 A、mA、µA、nA、pA 单位缩放

列结构支持三类：

```text
1) 单组
Vd, I

2) 共享 V，多组 I
Vd, I(Vg=-10V), I(Vg=0V), I(Vg=20V)

3) 成对多列
Vd1, I1, Vd2, I2, Vd3, I3 ...
```

“共享 V + 多 I”模式可逐列勾选要导入的 I 列。
每个 I 列会成为软件中的独立数据组，Vg 优先从列标题自动解析，例如：

```text
Vg=-10 V
0V
+20 V
```

导入面板会显示：
- 检测到的编码
- 分隔符
- 表头
- 数值行数
- 自动建议的数据排列
- X/Y 列映射
- 预计生成的数据组数量
- 前 40 行数值预览

每个文件可以使用不同设置，也可以点击“当前设置应用到全部文件”。

新导入的数据会保存已解析的 `(Vd,I)` 点、源文件、编码和导入配置到 `.dkds.json` 工程中，
因此重新打开工程不依赖再次猜测原始文件格式；旧工程仍兼容。



## v3.8 无密钥局域网热更新

为了让实验室同学直接使用，v3.8 将局域网热更新改成 **可信 LAN 简化模式**。

完全移除：
- Ed25519
- 公钥 / 私钥
- `SETUP_UPDATE_KEYS.cmd`
- `update-public-key.pem`
- `update-private-key.pem`
- `dkds-release.sig`
- 发布签名步骤

保留：
- multicast 自动发现
- WebSocket 新版本推送
- generic LAN HTTP update server
- NSIS Setup 自动更新
- electron-updater
- `latest.yml`
- 安装文件 SHA512 完整性校验
- HTTP Range
- 版本专属 release 目录
- 30 天 packaged build 规则

日常只需要：

```text
DKDS.cmd update-server
```

以及：

```text
DKDS.cmd build-publish-update -Version 3.22.0
```

即可。

**从旧 v3.7 签名版迁移到 v3.8，需要同学手动安装一次 v3.8 Setup。**
之后的更新不再需要任何密钥。

完整说明：`docs/guides/UPDATE_SERVER_CN.md`















## Windows 发布脚本兼容性修复

v3.20 起不再维护一组彼此独立的 Windows CMD。所有操作统一由 `DKDS.cmd` / `DKDS_GUI.cmd` 调用 `tools/windows/dkds-tools.ps1`。后端脚本负责：

- 依赖安装；
- Windows 构建；
- Android 环境检查/构建/安装；
- 局域网更新服务；
- 插件索引与验证。

发布新版本时使用显式版本号：

```text
DKDS.cmd build-publish-update -Version 3.22.0
```

图形界面可直接使用 `DKDS_GUI.cmd` 的“局域网更新”页。


## v3.7 直接框选 / 局部寻峰 / 跨 Vg 智能峰序

### 主图交互统一
不再要求先进入“框选峰”或“框选放大”模式：

```text
直接拖框
→ 弹出局部操作菜单

Ctrl + 拖框
→ 缩放
```

框选菜单提供：
- 局部寻峰
- 删除框选峰
- 锁定框选峰
- 解锁框选峰

框选区域本身不会改变主图缩放；局部寻峰只重新分析框内区域。
如果框选前已经凸显某条曲线，则局部寻峰只作用于该曲线；否则作用于全部可见曲线。

### 鼠标快捷键
改为：

```text
Ctrl + 左键点击曲线  → 新增手动峰
Ctrl + 右键点击峰点  → 删除峰
Ctrl + 拖框          → 缩放
```

### 峰点点击/双击修复
旧版本中峰宽半透明 `width-band` 位于峰点上层且会接收鼠标事件；
同时 D3 drag 的点击移动阈值为 0，轻微鼠标抖动可能使 click/dblclick 被拖拽逻辑吞掉。

v3.7：
- `width-band` / `width-line` 强制 `pointer-events:none`
- 只有两个 width handle 接收鼠标
- 峰点拖拽增加 5 px clickDistance
- width handle 同样增加拖拽阈值并阻止双击冒泡

因此选中一个峰后可以直接点击同曲线另一个峰，不需要先 Esc；
从数据列表凸显曲线后，该曲线峰点也仍可正常单击、双击和拖动。

### 局部寻峰
直接框选后点“局部寻峰”。

算法只在框选的 `(Vd,I)` 范围内接受最终峰位：
- 框外峰完全不变
- 手动峰不变
- 锁定峰不变
- 框内未锁定自动峰重新分析

最终 Vpk 仍必须落在原始 I–V 的真实采样点。

### 寻峰核心升级
默认仍只有：

```text
可靠 / 平衡 / 灵敏
```

不增加普通用户参数。

内部新增“鲁棒滚动中值背景 + 多尺度零均值 matched filter”：
- 先从 `|I|` 去除鲁棒局域背景
- 使用多个物理电压尺度的 Mexican-hat/Ricker 匹配滤波寻找窄峰和 shoulder
- 要求跨尺度持续性
- 与 raw / residual / slope 证据交叉确认
- `R=|V/I|` 与 `dV/dI` 仍只能辅助，不能单独确认峰
- 导数/电阻坐标只用于候选发现
- 最终峰位回投影到原始 I–V

### 组图 → 主图反向定位
点击组图任一参数子图的数据点：
- 自动选中对应峰
- 自动选中其所属曲线
- 主图保证该点处于当前视野
- 该曲线和峰保持正常透明度
- 其他曲线、峰和主图图例同步变淡

放大的组图同样支持点击点反向定位。

### 键盘
```text
Ctrl + ← / →
    选择当前曲线的上一个 / 下一个峰

← / →
    移动当前选中峰 1 个真实采样点

Shift + ← / →
    移动 5 个真实采样点
```

Delete / Backspace 可删除当前选中的单峰或框选多峰。

### 跨 Vg 智能峰序
“峰序排序”升级为跨栅压 ridge 追踪，不再简单对每一条曲线重新从 1 连续编号。

软件先从峰数最完整的曲线建立参考轨迹，再通过：
- Vd 连续性
- 正负偏压区间
- 栅压趋势
- 单调轨迹匹配
- locked / 人工改序 anchor

在各 Vg 间分配峰序。

例如其他栅压通常存在：

```text
负区：峰1、峰2
正区：峰3、峰4
```

如果某个 Vg 的峰2消失：

```text
峰1、[缺峰2]、峰3、峰4
```

正区第一个峰仍保持“峰3”，不会因为当前曲线只剩 3 个峰而错误压缩成“峰2”。

人工把一个峰从 `m` 改成 `n` 时，该点成为排序 anchor，并按物理左右顺序级联处理冲突编号，然后重新推导邻近 Vg 的 ridge 身份。


## v3.6 峰序一键自动排序

主图工具栏新增：

```text
峰序排序
```

点击后按每条曲线中的 Vd 从小到大，对“已采纳峰”自动编号：

```text
峰1 → 峰2 → 峰3 → ...
```

作用范围按以下优先级自动判断：

1. 若当前框选了多个峰：排序这些峰所在的曲线；
2. 若没有框选峰、但当前选中了一条曲线：只排序当前曲线；
3. 若两者都没有：排序全部当前可见曲线。

曲线检查器中也新增“按 Vd 自动排序当前曲线峰序”按钮。

排序只修改：
- peakOrder
- 对应类别/颜色

不会修改：
- Vpk
- Ipk
- FWHM / width handles
- accepted 状态
- locked 状态

未采纳峰不参与排序，因此不会占用峰1、峰2等编号。

此操作写入 Undo 历史，可用 Ctrl+Z 回退。



## v3.4 多通道智能寻峰 / 原始 I–V 回投影 / CSV 剪贴板

### 1. 数据列表中的辅助变换
每个数据文件在正扫/反扫选择下增加“辅助”下拉框：

- 原始 I–V
- 去背景 `I-Ibg`
- `dI/dV`
- `d²I/dV²`
- `d ln|I|/dV`
- `dV/dI`
- `R=|V/I|`

选择后，曲线检查器显示对应辅助变换。主图始终保持原始 I–V。

辅助变换图上会投影显示当前已经确认的峰位，但这些点的横坐标来自原始 I–V 峰位。

### 2. 峰位只允许来自原始 I–V
自动寻峰采用两阶段流程：

1. 多个变换通道、多种平滑尺度并行发现候选；
2. 将同一区域的证据聚类；
3. 回到原始 `I(Vd)`：
   - 若局部存在真实 I–V 极大值，吸附到该真实采样点；
   - 若只是单调 shoulder，则在原始 I–V 上用局域去背景残差重新定位，并仍吸附到一个真实采样点；
4. 最终保存的 `Vpk` 和 `Ipk` 一定是一对原始 I–V 数据。

导数、电阻、dV/dI 的极值坐标不会直接成为最终 Vpk。

自动峰新增：
- `confidence`
- `supportChannels`
- `supportScales`
- `candidateCenterV`
- `projectionMethod`

峰参数 CSV 也会导出 confidence 和 projection_method，便于审计。

### 3. 更简单的寻峰 UI
左侧不再默认展示大量参数，而是只保留三个灵敏度：

- 可靠
- 平衡（默认）
- 灵敏

默认“平衡”会自动融合多个独立证据。
详细的每通道阈值仍保留在“高级设置（一般不用改）”折叠区，普通使用不需要打开。

`R=|V/I|` 和 `dV/dI` 被作为辅助/佐证通道，不能单独凭一个异常点直接确认为峰。

锁定逻辑保持不变：已锁定峰再次智能寻峰时不会被移动、删除或覆盖。

### 4. 所有 CSV 导出支持直接复制
Electron 主进程新增系统剪贴板接口。

所有现有 CSV 类型都具有“复制”入口：

- 主图 I–V 数据
- 峰参数
- 组图每个子图 CSV
- 放大图 CSV
- 峰间距 CSV
- 栅压物理分析 CSV
- TER_long
- TER_matrix
- TER_Max–Vg
- TER_Max–Vd

点击复制后可直接粘贴到 Origin、Excel 或文本编辑器，无需先保存临时 CSV 文件。

打包版 30 天限制 / 开发版无限制逻辑保持不变。


## v3.3 栅压物理分析面板

顶部“分析”区新增“栅压分析”。

页面允许选择两条已确认峰序列作为 resonance ridge A / B，并自动生成：
1. V_R,A(Vg)、V_R,B(Vg)
2. V0(Vg)=(VA+VB)/2
3. δ(Vg)=(VB−VA)/2 与 |δ|
4. HWHM/FWHM 以及 |δ|/w_eff
5. TER_max(Vg)
6. Vd*(Vg)，即 TER_max 对应的 Vd
7. 同一峰标签的正/反扫峰位回滞 ΔV_R(Vg)
8. TER_max vs |δ|/w
9. Vd* vs V0
10. 峰高 A_A/A_B 与 η_eff=A_A/(A_A+A_B)
11. 局域背景和 |Ipk|/Ibg
12. 可选 δ(n_g)、TER_max(n_g)

其中 w_eff 默认定义为两条 ridge 的平均 HWHM。

### 分析报告
页面自动生成保守的机制报告，包括：
- V0(Vg) 线性斜率与 R²
- |δ|(Vg) 斜率
- |δ|/w 范围
- TER_max 与 |δ|/w 的 Pearson 相关系数
- Vd* 与 V0 的 Pearson 相关系数
- η_eff 范围
- 正反扫峰位回滞范围
- 数据不足/不能直接下结论的项目

报告明确限制：
- ridge A/B 不会被程序自动声称为 AB/BA；物理归属由用户根据独立证据决定。
- δ 是有效共振分裂，不是裸极化电压、势垒差或 coercive voltage。
- η_eff 是有效电学权重，不直接等同于畴面积。
- ΔV_R 是扫描峰位回滞，不自动等同于 Vc+、Vc− 或 ΔV_H。
- 当前没有独立 switching-step/Vc 标注时，软件不会从共振峰伪造 Vc。
- n_g=C_g(V_g−V_CNP)/e 只是单栅电容近似。

支持导出：
- gate_physics_analysis.csv
- gate_physics_analysis_report.md
- 每张 Plotly 图可使用图中相机按钮导出 PNG。

打包版 30 天限制、开发版无限制逻辑保持不变。


## v3.2 TER 热图 / TER_Max–Vg / TER_Max–Vd

### TER 热图
TER 热图明确表示完整二维矩阵：

`TER(Vd, Vg)`

每个像素都由同一个 `(Vd, Vg)` 下的正扫/反扫电流得到，不使用峰位插值。

显示改为正方形画布，保留：
- 色图选择
- 色阶 min/max
- colorbar 刻度
- Vd / Vg 坐标刻度
- Hover / zoom / pan
- TER_long.csv
- TER_matrix.csv
- SVG / PNG

### TER_Max–Vg
固定 Vg，沿 Vd 方向取：

`TER_Max–Vg(Vg) = max_Vd TER(Vd,Vg)`

同时保存：
- TER_Max–Vg
- Vd@TER_Max–Vg
- 对应 I_up / I_down / R_up / R_down

支持 CSV / SVG / PNG。

### TER_Max–Vd
固定 Vd，沿 Vg 方向取：

`TER_Max–Vd(Vd) = max_Vg TER(Vd,Vg)`

同时保存：
- TER_Max–Vd
- Vg@TER_Max–Vd
- 对应 I_up / I_down / R_up / R_down

支持 CSV / SVG / PNG。

打包版 30 天限制与开发版无限制逻辑保持不变。


## v3.1 打包版 30 天运行期限

此限制只作用于编译/打包后的 Electron 程序。

### 开发版
以下启动方式不受时间限制：

```text
DKDS.cmd dev
npm start
```

Electron 在开发模式下 `app.isPackaged === false`，因此不会执行到期检查。

### Windows 打包版
运行：

```text
DKDS.cmd build-windows
```

或：

```text
npm run dist
```

时，会先自动运行：

```text
scripts/generate-build-info.js
```

生成 `build-info.json`，记录本次真实打包时间：

```text
builtAt
expiresAt = builtAt + 30 days
```

生成的 Portable EXE 在 `app.isPackaged === true` 时才读取该信息。

行为：
- 构建后 30×24 小时内正常启动；
- 到期后再次启动时立即退出，不显示提示窗口；
- 程序如果连续运行跨过到期时间，会在定时检查时直接退出；
- 如果打包版的 `build-info.json` 缺失或损坏，也直接退出，避免产生意外的无限期打包版本。

每次重新执行 `npm run dist` 都会以新的实际构建时间重新开始 30 天周期。


## v3.0 工具栏 / 峰位 TER / TER_max 热图

### 顶部工具栏
顶部按钮重新分为四组：
- 文件：导入 / 读取 / 保存
- 编辑：Undo / 退出选中
- 分析：检查器 / 组图 / 物理机制 / 峰间距 / TER_max
- 导出：主图 SVG / PNG / 数据 / 峰参数

按钮高度、间距、字体和背景统一，窄窗口时允许横向滚动，不再用大量分隔竖线挤占空间。

### 两种 TER 同时保留
组图恢复“峰位 TER”：
- 对同一峰标签，配对正扫和反扫的峰顶；
- 横轴为 Vg；
- 保留此前的峰顶电流比 TER 逻辑；
- 正反扫峰顶 Vpk 可以不同，因此它表示“峰位处 TER 随 Vg”，不是严格同一 Vds 的 TER。

独立 TER_max 页面继续使用 ter_matrix.py 定义：
- 同一 Vds 配对 up/down；
- R=|Vds/I|；
- TER=(Rhigh-Rlow)/Rlow×100%；
- TER_max(Vg)=max_Vds TER(Vds,Vg)。

因此两个量不再互相替代。

### TER_max 热图
热图使用宽矩形布局，不强制正方形单元。

新增显示设置：
- colorscale
- TER 色阶最小值
- TER 色阶最大值
- colorbar 刻度间隔
- Vds 轴刻度间隔
- Vg 轴刻度间隔
- 一键恢复自动色阶/刻度

这些设置只改变显示，不改变 TER 原始矩阵。

仍支持：
- TER_long.csv
- TER_matrix.csv
- TER_max.csv
- 热图 SVG / PNG
- TER_max SVG / PNG


## v2.9 两峰间距 / TER_max

### 两峰间距
顶部新增“峰间距”按钮，进入独立分析页面。

两个下拉框分别选择完整峰序列，例如：
- 正扫·峰1
- 反扫·峰1
- 正扫·峰2
- 反扫·峰2

只有两个序列同时存在的 Vg 才参与计算。

同时输出：
- VA(Vg)
- VB(Vg)
- 有符号差 `VB-VA`
- 绝对间距 `|VB-VA|`

图中可切换显示绝对间距或有符号差，并支持缩放、平移、Hover、SVG/PNG/CSV 导出。

### TER_max：按 ter_matrix.py 逻辑重写
v2.8 及以前组图中的 “TER” 不是严格的 TER(Vds,Vg)：
旧逻辑比较同一峰标签的正扫峰顶电流和反扫峰顶电流，但两者可能位于不同 Vds，因此峰位存在回滞时不能等同于同偏压 TER。

v2.9 将旧 TER 从峰参数组图移除，新增独立“TER_max”页面。

JS 实现逐步复现 ter_matrix.py：
1. 使用原始 CSV 采集顺序，而不是峰位；
2. 为每个原始点判断升压/降压方向；
3. 在同一目标 Vds 下按 tolerance 匹配 up/down；
4. `R_up=|Vds/I_up|`，`R_down=|Vds/I_down|`；
5. `TER=(R_high-R_low)/R_low*100%`；
6. 0 V 不进入电阻/TER 网格；
7. 对每个 Vg 的所有 Vds 取最大值得到 `TER_max(Vg)`；
8. 同时保存 `Vds@TER_max`。

页面输出：
- TER(Vds,Vg) 热图
- TER_max(Vg)
- Vds@TER_max(Vg)
- TER_max 数值表
- TER_long.csv
- TER_matrix.csv
- TER_max.csv
- 热图/TER_max 的 SVG/PNG

默认参数与 Python 一致：
- Vds min/max：从全部当前项目 CSV 自动检测
- vstep：全部数据中的最小非零相邻 Vds 步长
- tolerance：vstep/20
- current floor：1e-15 A

所有参数也可以手动覆盖。


## v2.8 主图几何机制重写 / 快速峰审阅

### 1. 主图右下角错位：彻底取消 viewBox
v2.6/v2.7 仍保留 SVG `viewBox`，因此在 Electron/CSS Grid 某些延迟布局情况下仍可能产生旧 viewBox 与新 viewport 比例不一致，出现主图被缩放/居中到右下方。

v2.8 主图不再使用 `viewBox`：
- SVG width/height 直接等于 `mainPlotWrap` 当前真实 CSS 像素；
- D3 坐标直接按这些 CSS 像素绘制；
- 强制 SVG `left=0, top=0, transform=none`；
- 每次布局变化检查 SVG 与容器的 left/top/width/height 是否一致；
- 若几何不一致，自动强制归零并重绘；
- “重新居中/R”同时清除数据缩放和 SVG 几何残留。

这样从机制上消除了旧 viewBox 被浏览器按比例居中/letterbox 的路径。

### 2. 物理类型标记
物理类型文字可通过：
- 主图工具栏“物理标记”按钮；
- 左侧“主图标注物理类型”复选框；
- 快捷键 `P`

随时隐藏/显示。

当选中一条曲线后：
- 选中曲线保持正常；
- 其他曲线变淡；
- 其他曲线的峰位点同步变淡；
- 其他曲线的 R/H/D/X/? 物理文字也同步变淡。

### 3. ↑/↓ 切换曲线后自动选中局部唯一峰
在主图已框选放大时，用 ↑/↓ 切换曲线：
- 程序只检查“当前 x/y 视野”内该曲线的可见峰位点；
- 如果恰好只有 1 个峰，自动把它设为当前峰；
- 此时无需再鼠标点击，直接按 ←/→ 即可移动峰位；
- Shift+←/→ 仍一次移动 5 个真实采样点；
- 若视野内为 0 个或多个峰，则只切换曲线，不武断选峰。


## v2.7 多项目标签页 / 物理机制 / 多峰锁定

### 1. 多项目标签页
顶部新增项目标签页栏。
- `+` 或 `Ctrl+N`：新建完全独立的项目；
- “读取工程”会在新的标签页打开，不覆盖当前项目；
- 每个标签页分别保存 datasets、sweeps、peaks、峰类别、显示状态、寻峰参数、Undo、主图缩放和组图布局；
- 切换标签页时只挂载该标签页的数据，项目间不会混用峰、Vg、扫描方向或 Undo 历史；
- 保存工程只保存当前活动标签页。

### 2. 物理机制分析
新增“物理机制”悬浮面板，并在主图峰位旁显示简写：
- `R`：静态共振候选；
- `H`：历史依赖共振；
- `D`：动态/切换候选；
- `X`：额外稳定 ridge；
- `?`：证据不足/待定。

判据保持保守：
- 先看同一峰族是否在多个 Vg 连续出现；
- 再比较正扫与反扫；
- 用正反扫峰位差与 FWHM 判断历史依赖；
- 第三条及以上双向稳定 ridge 只标为“额外稳定 ridge”，不会直接宣布为有限转角；
- “D”也只表示动态/切换候选，不等于已经证明畴壁运动。

物理面板还给出当前更优先的模型层级：
M1 静态两-ridge → M2 动态/历史依赖 → M3 额外稳定 ridge/有限转角候选。

若有两条稳定主 ridge，还自动列出：
`V0(Vg)` 和 `delta(Vg)`。

### 3. 框选多个峰并锁定
主图工具栏新增：
- “框选峰”；
- “锁定所选”；
- “解锁所选”。

快捷键：
- `B`：框选峰；
- `L`：锁定；
- `Shift+L`：解锁。

被框选的峰会用深色外框标出。

### 4. 锁定峰与重新寻峰
重新寻峰时：
- 手动峰始终保留；
- 所有 `locked=true` 的峰始终保留；
- 锁定峰的 Vpk、FWHM、峰类别和采纳状态不会被新算法覆盖；
- 新自动候选若落在锁定峰邻域内，会被抑制，避免重复峰；
- 解锁后的自动峰才允许下一次重新寻峰重新生成/替换。

因此可以按如下方式逐步工作：

1. 用较宽松算法找一批候选；
2. 人工确认正确峰；
3. 框选这些峰并锁定；
4. 切换另一种算法/阈值；
5. 再次寻峰，只补充剩余未锁定区域；
6. 逐轮确认和锁定。

峰参数 CSV 也新增 `locked`、`physical_code` 和 `physical_type` 字段。


## v2.6 主图错位修复

本版修复主图在窗口初始化、组图停靠/恢复、拖动组图高度或窗口尺寸变化后偶发跑到右下方且“重新居中”无法恢复的问题。

根因：
旧版在 CSS Grid 尚未完成布局时，`mainPlotWrap.clientHeight` 可能瞬间为 0。代码随后使用 300 px 作为假高度创建 SVG viewBox。等容器真正变高后，旧 viewBox 被浏览器按比例居中显示，造成大面积空白和主图偏到右下/下方。原“重新居中”只重置数据坐标范围，未重新测量 SVG 几何尺寸，因此无法修复。

v2.6：
- 不再为临时 0 高度制造 300 px 假画布；
- 尺寸不足时延迟到两个 animation frame 后重新测量；
- SVG width/height/viewBox 与当前主图容器实际像素尺寸同步；
- 关闭 viewBox 的居中 letterbox 行为；
- 主图区、工作区、底部组图槽、窗口变化均触发布局重测；
- 增加绘制后的几何 watchdog；
- “重新居中/R”现在同时重置数据范围和 SVG 几何布局。

## v2.5：工程文件、图片导出与底部停靠组图

### 工程文件
- **保存项目**：首次保存选择 `.dkds.json` 路径；再次 `Ctrl+S` 直接覆盖当前工程。
- **打开项目**：恢复 CSV 原始数据、扫描显示、峰位/峰宽、峰类别、采纳状态、寻峰参数、组图列数以及组图停靠状态。
- 快捷键：`Ctrl+S` 保存工程，`Ctrl+O` 打开工程。

### 导出图片
- 主图可直接导出 **SVG** 或高分辨率 **PNG（2×）**。
- 组图子图双击放大后仍可使用 Plotly 常规缩放/平移/Reset，并导出 SVG/图像。

### 组图停靠到底部
组图标题栏新增：
- **停靠底部**：组图进入主图所在工作区下方，不再覆盖主图；主图自动上移并缩小高度。
- **恢复悬浮**：返回可拖动、可自由调整大小的悬浮窗口。
- **缩小 / 展开**：组图可以收成一条标题栏，需要时再展开。
- 底部停靠且展开时，可拖动组图最上边缘上下调整组图高度。

停靠位置、是否缩小以及底部高度会写入工程文件，下次打开工程自动恢复。


基于 JavaScript + Node.js + Electron 的石墨烯共振隧穿 I–V 交互分析工具。



## v2.4 峰类别与颜色系统修正

1. 正扫仍使用冷色系、反扫仍使用暖色系，但相邻峰序改为高区分度色板，避免多个峰看起来几乎同色。
2. 双击任意峰位点会自动选中该峰并打开“曲线检查器”。
3. 删除任意颜色选择器。峰的颜色现在只能来自“峰类别”：
   - 点击已有颜色/标签，把当前峰归入现有类别；
   - 点击“＋ 新增类别/颜色”，自动创建下一峰序，并生成对应的正扫冷色 + 反扫暖色；
   - 可以重命名当前类别标签，重命名会应用到同一峰序的所有点。
4. 主图与组图统一使用唯一的 `colorForPeakOrder(order, direction)` 映射，不再允许单点自定义颜色造成不一致。
5. TER 是正/反扫配对量：TER 曲线采用该峰正扫的冷色，marker 外圈采用同一峰反扫的暖色；两种颜色都与主图完全一致，不再使用独立的紫色 TER 色板。

## v2.3 组图排列与快速手动峰操作

### 组图排列
组图面板新增“每行”按钮：
- 自动
- 1 / 2 / 3 / 4 / 5 / 6

自动模式对 6 张参数图会优先选择整齐矩阵：
- 窗口足够宽时优先 3 列 × 2 行；
- 中等宽度 2 列 × 3 行；
- 很窄时 1 列。

每张子图的图例不再集中挤占组图顶部，而是单独放在该子图下方，水平排列并自动换行。
每个子图仍可双击进入独立放大窗口，放大后支持缩放、平移、框选、套索、Reset axes、Autoscale、Hover 与图像导出。

### 快速手动峰
- Shift + 鼠标左键点击曲线：在鼠标对应的 Vd 位置创建手动峰，并吸附到最近真实采样点。
- Shift + 鼠标右键点击峰位点：立即删除该峰。
- 删除和新增都进入 Undo 历史，可用 Ctrl+Z 回退。

## v2.2 新增主图/组图交互

### 主图视图控制

主图左上增加：

- `选择`：普通曲线/峰点选择与编辑；
- `框选放大`：鼠标拖出矩形区域后同时放大 X/Y；
- `重新居中`：恢复到全部当前可见数据范围。

快捷键：

- `S`：选择模式；
- `Z`：框选放大；
- `R`：重新居中；
- 双击主图空白区域：重新居中。

所有曲线和峰点都放在同一裁剪区域中，缩放/窗口变化时不会越出坐标框。切换正扫/反扫显示时会自动清除旧缩放范围，避免旧坐标域造成错位。

### 曲线和峰位点联动透明度

选中一条曲线后：

- 当前曲线保持高亮；
- 其他可见曲线显著变淡；
- **其他曲线对应的峰位点也同步变淡**；
- 只有当前选中曲线上的峰位点可以拖动。

### 组图重新排布

- 小图不再在绘图区内显示 Plotly 图例；
- 所有系列图例移到组图面板顶部统一显示；
- 小图使用自适应两列/单列布局，图本身占据更多面积；
- **双击任意小图**会打开可移动、可缩放的放大面板；
- 放大图开启 Plotly 常规工具栏：框选缩放、平移、选择、套索、自动缩放、复位、滚轮缩放等。

### 键盘快速审阅

- `↑ / ↓`：在当前可见曲线之间快速切换；
- 选中峰点后 `← / →`：沿实际采样点逐点移动峰位；
- `Shift + ← / →`：一次移动 5 个采样点；
- 键盘移动仍然吸附到原始曲线，并同步平移原有峰宽窗口；
- 输入框获得焦点时，方向键仍用于正常文本/数字编辑，不触发曲线切换。

## 原有核心规则

### 1. “峰标签”和“寻峰算法”彻底分离

- **峰标签 / 峰序**：表示“这是第几个峰、属于哪一族峰”，例如 `峰1`、`峰2`、`R1`、`R2`。
- **寻峰算法**：只表示这个候选点最初由哪种方法发现。

寻峰算法不再决定圆点颜色，也不再被当成物理峰类别。

### 2. 寻峰算法用形状表示

| 算法 | 主图形状 |
|---|---|
| Raw Prominence | 圆形 ● |
| Local SNR | 菱形 ◆ |
| Differential resistance | 三角 ▲ |
| Detrended shoulder | 方形 ■ |
| Curvature | 十字 ✚ |
| 手动新增 | 星形 ★ |

如果多个算法同时发现同一候选峰，主图使用“主算法”的形状，悬停信息中显示全部支持算法。

### 3. 峰序用颜色表示

正扫使用冷色系；反扫使用暖色系。

例如：

- 正扫·峰1：蓝
- 正扫·峰2：青
- 正扫·峰3：蓝绿
- 反扫·峰1：红
- 反扫·峰2：橙
- 反扫·峰3：金黄

因此即使 `峰1` 在正扫和反扫中被认为是对应峰，它们在参数图中仍是两个独立序列：

- `正扫·峰1`
- `反扫·峰1`

TER 再使用相同的“峰标签”将正扫与反扫配对。

### 4. 峰序 / 标签可以人工修改

点击峰点后，在“曲线检查器”中可以修改：

- 峰序：1、2、3……
- 峰标签：峰1、R1、A、主峰等
- 可选自定义颜色
- “恢复峰序自动色”可回到正扫冷色 / 反扫暖色的默认配色

其中：

- **峰序决定默认颜色**；
- **峰标签决定跨 Vg 分组与 TER 配对**；
- **寻峰算法只决定形状**。

### 5. 未选中任何曲线/峰时，组图显示全部可见数据

按 `Esc` 或点击“退出选中”后，组图面板不会空白，而是显示当前所有可见扫描中的：

- Vpk(Vg)
- FWHM(Vg)
- 峰高 A(Vg)
- 峰面积 S(Vg)
- Prominence(Vg)
- TER(Vg)

正扫和反扫按各自颜色独立显示。

选中一个峰时：只显示该“扫描方向 + 峰标签”的跨栅压序列，并显示该标签的 TER。

选中一条曲线时：显示该曲线上所有已采纳峰标签在相同扫描方向下的跨栅压序列，并显示这些标签的 TER。

### 6. 数据列表增加三级显示控制

每个数据文件都有：

- 总开关
- `正扫` 开关
- `反扫` 开关

因此可实现：

- 某个 Vg 全部隐藏
- 某个 Vg 只显示正扫
- 某个 Vg 只显示反扫
- 所有 Vg 只看正扫
- 所有 Vg 只看反扫
- 所有扫描全部显示

顶部提供：

- 全部扫描
- 仅正扫
- 仅反扫
- 全不选

隐藏扫描不会删除数据，也不会删除人工峰标记。

### 7. 正反扫重建逻辑

对于常见采集顺序：

`0 -> +Vmax -> -Vmax -> 0`

程序会重建为：

- 正扫：`-Vmax -> +Vmax`
- 反扫：`+Vmax -> -Vmax`（内部为便于绘图按 Vd 排序，但保留 direction=-1）

不会错误拆成“正扫1 + 反扫 + 正扫2”。

## 交互规则

- 点击曲线：选中曲线，其他曲线变浅。
- 只有**当前选中曲线**上的峰点可以拖动。
- 未选中曲线的峰点可以点击查看，但不可拖动。
- 拖动峰点会吸附到实际采样点。
- 点击峰点显示 FWHM 半透明区域和左右手柄。
- 拖动手柄可人工修改峰宽。
- Shift + 左键点击曲线：新增手动峰。
- Shift + 右键点击峰位点：删除该峰。
- Ctrl + Z：回退上一步。
- Esc：退出选中/退出框选放大。
- ↑ / ↓：快速切换当前可见曲线。
- 选中峰点后 ← / →：沿原始采样点移动峰位；Shift 可一次移动 5 点。
- Z：进入主图框选放大；R：主图重新居中；S：回到选择模式。
- 组图中的每个小图双击可在独立悬浮面板放大，并提供 Plotly 常规缩放/平移/复位操作。

## 导出

- 主图 SVG
- 当前可见 I–V 数据 CSV
- 全部峰参数 CSV
- 每一张趋势图 CSV
- 放大趋势图 SVG
- `.dkds.json` 项目文件

峰参数 CSV 明确输出：

- peak_order
- peak_label
- scan_direction
- marker_color
- marker_shape
- primary_algorithm
- all supporting algorithms
- Vpk
- Ipk
- FWHM
- amplitude
- area

## 启动

双击：

`DKDS.cmd dev`

首次会自动安装 npm 依赖。

## 构建 Windows Portable

双击：

`DKDS.cmd build-windows`

输出位于 `release/`。
