> **v3.71.121 WIP — Desktop Shell Density / Pulse Data Center Routing & Batch**：Desktop 项目标签栏按 Host 合同整体压缩 20%：层高 40→32 px、标签高度 34→27.2 px、关闭按钮 20→16 px、新建按钮高度 33→26.4 px，并同步将 Desktop shell top 占用从 92→84 px；Shared/Core 与 Native Mobile 基线不变。Desktop 所有共享 ScientificPlot 悬浮导航按钮保持 25.2 px 高度，但横向尺寸从 25.2 px 再缩小 20% 至 20.16 px，整组横向 padding 同步缩小。Pulse Analysis 2.12.14 保持冻结的 analysis-service 不变，在插件数据边界新增只读 DataTable→Pulse 输入投影：Core 仍先按 dataAssignments 完成可见性隔离，Data Center 通过“数据用途”分配给 Pulse 的普通数值表再由插件领域适配器投影为 Pulse 可读输入，canonical Artifact 不被改写；参数面板只负责显示和配置数据；顶部既有主操作“分析勾选”本身即对所有勾选文件调用 analyzeChecked 批处理链，不在参数面板复制第二套主操作。SDK 仍为 1.51.76，Unit Templates 2.5.38 不变。

> **v3.71.120 WIP — Primary Titlebar Close Direct Shutdown**：针对真实用户通过桌面端自绘标题栏 × 关闭应用的路径，主窗口 `windows:closeCurrent` 不再先调用 `BrowserWindow.close()` 再依赖 `close` 事件间接触发退出，而是直接进入 Main Process 的 shutdown coordinator；插件/独立窗口仍保持原有 close/hide 语义。Windows CI 新增 renderer/preload 驱动的 `closeCurrentWindow()` 打包退出门禁，验证与用户点击 × 相同的 IPC 路径后完整进程树必须归零。SDK 仍为 1.51.76，Unit Templates 2.5.38 不变。

> **v3.71.119 WIP — Packaged Windows Process-Tree Exit Gate**：针对 3.71.118 在真实机器上仍可能残留进程的问题，Desktop shutdown 增加统一有界 drain deadline，任何单一窗口/socket/服务 Promise 都不能无限阻塞最终退出；LAN updater 与 SSDP/mDNS discovery 增加 shutdown epoch/状态门禁，禁止 stop 之后由异步探测或网络变化任务重新创建 WebSocket/UDP socket。Windows Action 新增真实打包程序退出门禁：分别启动 win-unpacked 与 Portable EXE，发送正常主窗口关闭请求，并检查整个进程树是否在限定时间内归零；若失败，CI 输出残留 PID、父 PID、路径与命令行。SDK 仍为 1.51.76，Unit Templates 2.5.38 不变。

> **v3.71.118 WIP — Deterministic Desktop Process Exit**：修正 3.71.117 仍可能出现“窗口已关闭但任务管理器仍有进程”的退出缺口。Desktop shutdown 现在等待所有辅助 BrowserWindow 真正触发 closed、等待 LAN Web/MCP/SSDP/mDNS/更新发现 socket 完整释放，并终止仍在运行的 SMB 子进程；所有应用资源排空后由 Main Process 通过 app.exit(0) 提交最终退出，不再重新进入可被隐藏窗口/renderer 生命周期拦截的 app.quit() 关闭链。SDK 仍为 1.51.76，Unit Templates 2.5.38 不变。

> **v3.71.117 WIP — Desktop Plugin Manager Single Row / Coordinated Shutdown**：桌面端插件管理工具栏恢复为固定单行合同，搜索、状态、类型、安装插件、从 Python / Jupyter 创建、插件目录共六个槽位，不因新增操作按钮自动换到第二行；Native Mobile 的独立响应式布局保持不变。桌面主进程新增统一 shutdown coordinator：退出前先停止更新发现、等待 LAN Web / MCP HTTP 服务真正关闭、终止仍在运行的 SMB PowerShell/nbtstat 子进程、清理 pending host 请求并关闭辅助窗口，再允许 Electron quit，避免窗口关闭后任务管理器仍残留后台进程。SDK 仍为 1.51.76，Unit Templates 2.5.38 不变。

> **v3.71.116 WIP — Desktop Plot Chrome / Resonance Default Companions**：桌面端所有共享科学数据图的悬浮导航按钮从 28×28 px 等比缩小 10% 至 25.2×25.2 px，Native Mobile 的 22.5×20.4 px 触控几何保持不变。共振插件在 Desktop 默认打开“曲线检查器”和“组图”，Mobile 默认状态不变；PRIME autoOpen 同时改为尊重 PortableView 已保存的用户停靠位置，不再用 defaultPlacement 覆盖。SDK 仍为 1.51.76，Unit Templates 2.5.38 不变；CHANGELOG 当前补丁标识同步为 3.71.116。

> **v3.71.115 WIP — Notebook Host Effects / SDK 1.51.76**：`DataFrame.plot()` 与 `to_clipboard()` 不再阻塞已闭合的 Table Transform compute。计算仍由纯 JavaScript Core Task 完成；Task 结束后，宿主只把所需 DataTable snapshot 投影到公共 ScientificPlot，或通过 `ctx.io.clipboard.writeText` 写入剪贴板。为 Host effect 所需的中间表只作为 Task 输出保留，不改变真正的 terminal result；Worker 内不允许 UI、剪贴板、Store、Electron、Python/Pandas 访问。`to_csv/to_excel`、未映射 plot 参数、`loc` 与 `mean/median/std` 仍保留精确 Cell/行号 blocker。

> **v3.71.115 WIP — Explicit Multi-source Workflow Binding / SDK 1.51.75**：多 `read_csv/read_excel` 工作流不再因为数据源数量大于 1 而整体拒绝构建。现有 Field Unit 增加通用 `setOptions()` handle；每个 Workflow source symbol 自动生成普通 select Field，并通过 `artifact-table/sourceField` 绑定真实 `artifactId`。源码中的文件名只作为 hint：只有 scoped source 唯一或文件名唯一匹配时自动选择，其余情况保持“请选择数据源”，禁止按 source 0/1 顺序猜测。未新增 Unit、Presenter 分支、私有 `<option>` DOM 或 Python/Pandas runtime。

> **v3.71.115 WIP — No-function Workflow Packaging / SDK 1.51.74**：没有顶层函数的单源 Python/Jupyter 工作流现在也可作为 `workflow:table-transform` 候选直接 Build。前提是 Table Transform IR 与 Core Task execution 均闭合；生成包继续复用同一个 `PluginBuilder.add_compiled_task()`、bounded `artifact-table`、Core Task Runner 和生产 Plugin Manager 验证/安装事务。运行时未知的结果列结构通过动态 DataTable 发布合同验证后进入 canonical Artifact Store 并保留 lineage。多 `read_csv/read_excel` 工作流仍 fail closed，等待动态 Source Picker 明确绑定，禁止按数据源列表顺序猜测。

> **v3.71.115 WIP — Executable Table Transform Task / SDK 1.51.73**：`dkds.table-transform-plan.v1` 的第一批闭合计算语义现在可以直接 lower 为普通 `DKDSTaskDefinition`。Task 只消费 1.51.71 的 bounded `artifact-table` detached snapshot，内部不访问 Store/Host，也不携带 Python/Pandas runtime。首批可执行算子包括位置型 `iloc`、`abs`、`copy`、`reset_index`、`diff(axis=0)`、`dropna(axis=0)`、`sort_index(axis=0)`、`concat(axis=0/1)`；`loc`、`mean/median/std` 的 Series 语义以及 `plot/clipboard/export` 继续保留精确 Cell/行号 blocker，不静默丢弃。

> **v3.71.115 WIP — Table Transform IR v1 / SDK 1.51.72**：真实 Notebook 的 Pandas-shaped workflow 开始进入结构化转换层。首批 IR 覆盖 `read_csv/read_excel → DKDS DataTable source`、静态 `iloc/loc`、`abs/copy/reset_index/diff/dropna/sort_index/mean/median/std`、静态 `pd.concat`，以及 `plot/to_clipboard/to_csv/to_excel` 的 Host 映射；所有未覆盖语句继续保留 Cell/行号 blocker。此阶段 IR 仍是 authoring plan，不执行 Pandas，也不新增运行时；下一步会把已闭合 IR 编译到 1.51.71 的 bounded `artifact-table` + Core Task Runner。

> **v3.71.115 WIP — Bounded Artifact Table Input / SDK 1.51.71**：为真实 Pandas/DataFrame workflow lowering 增加通用 `artifact-table` 任务输入合同。生成任务只通过 `ctx.data.sources` 选择作用域 DataTable，先读取 `columnMetadata()`，再在显式 `maxRows/maxColumns` 边界内逐列 `readColumnRange()`，构造 detached table snapshot 交给既有 Core Task Runner；禁止通过 `artifacts.get()` 整表水合，不新增 Python/Pandas runtime、第二数据后端或插件特化路径。

> **v3.71.115 WIP — Python/Jupyter Source Workflow / SDK 1.51.70**：真实科研 Notebook 导入从“只发现顶层函数”升级为 `dkds.python-source-model.v2`。每个 code cell 静态记录定义/读取符号、跨 Cell 依赖、imports、执行角色与调用分类；`read_csv/read_excel`、`plot`、`to_clipboard`、`to_csv/to_excel` 被识别为应由 DKDS DataTable / ScientificPlot / Host I/O 接管的宿主行为，Pandas/NumPy/SciPy 计算语义则单独列为后续 Table/Array/Scientific Transform lowering blocker。分析过程不执行用户源码，也不会因为识别出宿主行为就错误宣称整个 Notebook 已可构建；纯 Portable 函数仍沿用既有 Blueprint → JS Task → Plugin Manager 生产安装链。

> **v3.71.115 WIP — Phase F Resonance Inspector Domain-bound Actions / SDK 1.51.68**：共振 declarative Inspector 的 5 个固定操作按钮已接入通用 Surface `domainAction`：采纳状态切换、锁定状态切换、FWHM 自动窗口、删除峰、选中所属曲线。所有按钮只从生产 Domain Adapter snapshot 的 `selectedPeak.id` 获取 enablement，并经 dependency-scoped `liveDomain.invoke(...)` 调用既有 production Inspector mutation owner；不新增领域状态、selection bus、Unit、Presenter 分支或 Resonance 专用 generator 路径。动态类别调色板与类别标签编辑仍由 production Inspector runtime 持有。SDK 1.51.68；Plugin API 1.19.0；Unit Templates 2.5.38（41 Units / 73 recipes）不变。

> **v3.71.115 WIP — Phase F Resonance Inspector Read-only Reconstruction**：生产曲线检查器与 Domain Adapter 共享唯一 `inspector-detail-projection.js`，选中曲线/峰的只读详情不再在 declarative 壳中重复计算。生成样例直接使用现有公共 Status/Table live binding 显示 `inspector.title` 与 `inspector.rows`；类别编辑、FWHM 编辑、辅助 transform 图仍由生产 Inspector runtime 单独拥有。未新增 Unit、未新增 Presenter 分支、未复制领域 selection/metric owner。SDK 1.51.67；Plugin API 1.19.0；Unit Templates 2.5.38（41 Units / 73 recipes）不变。

> **v3.71.115 WIP — Phase F Live Marker Projection**：声明式 ScientificPlot 新增 bounded marker-array binding。共振的 marker 可见性、accepted/rejected、shape 规则已经抽成唯一 `main-marker-projection.js`，旧生产主图和 Domain Adapter 共用；生成器只映射 adapter 给出的 marker 字段，并通过公共 `getSelectedMarkerIds()` 回显生产选中峰。marker 点击仅把 `id/additive` 与声明的固定标量参数交给 Domain Adapter；共振 `openInspector:true` 最终仍由生产 `selectPeak` owner 执行。SDK 1.51.66；Plugin API 1.19.0；Unit Templates 2.5.38（41 Units / 73 recipes）不变。

> **v3.71.115 WIP — Phase F Selected-Curve Focus Projection**：live curve-array ScientificPlot 新增 `selectedIdPath`。生成壳从生产 Domain Adapter snapshot 读取 authoritative 选中曲线 id，并通过 Core ScientificCurveSurface 已有 `getSelectedCurveId()` 合同绘制焦点；不创建新的 Selection bus，不持有 selectedSweep/selectedCurve 领域状态，不加插件私有 focus CSS。共振样例使用 `selectedSweep.id`，仍由生产 owner 决定真正选择语义。SDK 升至 1.51.65；Plugin API 1.19.0；Unit Templates 2.5.38（41 Units / 73 recipes）保持冻结。

> **v3.71.115 WIP — Phase F Live Curve Selection**：live curve-array ScientificPlot binding 新增可选 `selectAction`。公共 ScientificPlot 的曲线点击只把 `curve.id` 作为 `{id}` 传给声明的 Domain Adapter action；生成壳不保存 selectedSweep/selectedCurve、不判断 Inspector 打开策略、不复制选择语义。共振样例将主图曲线点击直接交给生产 owner 的 `selectSweep`。SDK 升至 1.51.64；Plugin API 保持 1.19.0；Unit Templates 保持 2.5.38（41 Units / 73 recipes）。

> **v3.71.115 WIP — Phase F Live ScientificPlot Projection**：声明式/Python 生成器新增 Unit-owned curve plot 的 live curve-array binding。声明只提供 Domain Adapter `statePath`、点数组路径和 x/y/id 等字段键；生成壳只构造 detached render projection 并请求公共 ScientificPlot 重绘，不自行判断可见 sweep、不计算峰/TER/物理量、不保存第二份科学状态。共振生产 adapter 仅投影现有 `visibleSweepIds()` 选中的 sweep，生产 service/算法 owner 不变。SDK 升至 1.51.63；Plugin API 保持 1.19.0；Unit Templates 仍冻结 2.5.38（41 Units / 73 recipes）。

> **v3.71.115 WIP — Phase F Writable Live Parameter Binding**：声明式/Python 生成器将 canonical 参数 PRIME 接入双向 Domain Adapter binding。Number/Text/Select/Checkbox 只声明 `statePath + domainAction`，可附一个动态值与最多 8 个固定标量参数；状态回读复用同一 authoritative snapshot refresh，用户修改只通过公共 Unit `onChange` 调用生产 owner 白名单 action，不保存第二份领域状态、不写私有 DOM listener、不增加 Unit/Presenter/plugin-id 特化。SDK 升至 1.51.62；Plugin API 仍为 1.19.0；Unit Templates 仍冻结 2.5.38（41 Units / 73 recipes）。

> **v3.71.115 WIP — Phase F Live Snapshot Projection**：声明式/Python 生成器新增只读 Domain Adapter snapshot 绑定：Status、Metric、Field/Check、Table 通过同一次 authoritative snapshot 刷新各自公开 Unit handle；Table 使用 `setData()`，Metric 使用公开 `value`，Field/Check 使用公开 `control/input`，不使用私有 selector，也不保存第二份领域状态。Summary 暂不绑定，因为当前公开 Unit handle 没有更新接口。SDK 升至 1.51.61；Plugin API 仍为 1.19.0；Unit Templates 仍冻结 2.5.38（41 Units / 73 recipes）。

> **v3.71.115 WIP — Phase F Live Domain Consumer**：声明式/Python 生成器现在可通过 `domainAdapter` 声明依赖受限的生产领域 owner；PRIME `choice-menu` 可用 `domainAction + statePath` 直接从 adapter snapshot 读取状态并调用白名单 action，不再需要任何插件局部状态镜像。原有 `commandId` + Core command history 路径继续保留。SDK 升至 1.51.60；Plugin API 仍为 1.19.0；Unit Templates 仍冻结 2.5.38（41 Units / 73 recipes）。

> **v3.71.115 WIP — Phase F Resonance Local Action Closure**：声明式/Python 生成器补齐共振组图 PRIME 的动态本地 ActionGroup 菜单表达。新的 `choice-menu` 仍复用既有 canonical Header action host 与 Core ActionGroup；当前选项从 Core domain-command history 投影，修改仅调用声明的 domain command 并在完成后刷新 ActionGroup，不新增插件局部偏好状态、菜单 runtime、专用 Unit、Presenter 分支或私有 CSS。SDK 升至 1.51.59；Plugin API 保持 1.19.0；Unit Templates 保持 2.5.38（41 Units / 73 Layout recipes）。

> **v3.71.115 WIP — Phase F Third Production Scientific Blueprint Parity**：声明式/Python 生成器完成第三个独立生产形态重建门禁。新增均为已有公共 Unit 的作者侧声明：Summary、retained List、EmptyState 和 portable PlotView；PlotView 继续由 Core 持有移动/停靠/导出生命周期，ScientificPlot 继续持有科学渲染与交互。验收使用 Pulse Analysis 的 Unit blueprint 作为独立结构证据，但生成器不读取 Pulse 插件 ID 做分支，也不复制批处理状态、分段/读取算法、生产 DOM/CSS、feature runtime 或 Presenter 路径。SDK 升至 1.51.54；Plugin API 保持 1.19.0；Unit Templates 保持 2.5.38（41 Units / 73 Layout recipes）。

> **v3.71.115 WIP — Phase F Second Production Tool Blueprint Parity**：声明式/Python 生成器完成第二个独立生产形态重建门禁，不再只以 Vth 类工作台验证通用性。新增的均为公共作者侧声明：Workspace `leftWidth/leftMin/leftReserve` 与 content end inset、参数 PRIME 的 priority/embedded/autoOpen、compact Tabs、独立 Field Grid、Action Grid、segment Toolbar 和参数内 Table。验收使用 Pulse Sampler 的 Unit blueprint 与生产 Unit presentation 作为独立结构证据，但生成器不读取 Pulse 插件 ID 做分支，也不复制 live-domain/state、波形算法、稳态提取 Task、私有 DOM/CSS 或 Presenter 路径。SDK 升至 1.51.53；Plugin API 保持 1.19.0；Unit Templates 保持 2.5.38（41 Units / 73 Layout recipes）。

> **v3.71.115 WIP — Phase F Grouped Control Surface Generation**：声明式/Python 生成器继续向第一方插件完整可重建推进。`data-control` PRIME 现在可声明多组 headed/plain Panel，并组合现有 Header、Chip、Field、Check、Note、Toolbar Unit；PageHeader 与组内 Toolbar 从同一 action catalog 投影，不增加第二套命令系统。`page.close` 仅允许 TOP/Tool hosted 生命周期，standalone 生成物不再携带任何 workspace-only close 代码。Transfer Vth 仍只作为独立 Unit blueprint 验收样本，生产 Vth 源码、Core、Presenter 与 Unit 合同均未特化。SDK 升至 1.51.52；Plugin API 保持 1.19.0；Unit Templates 保持 2.5.38（41 Units / 73 Layout recipes）。

> **v3.71.115 WIP — Phase F Production-shaped Unit Blueprint Parity**：声明式/Python 生成器开始进入生产插件可重建性阶段。新增通用 `fill-rows` PRIMARY、Metric Grid 与 canonical `result-split` 组合；同一个 lowered JavaScript Task 可同时驱动 ScientificPlot、结果 Table 和多个 Metric。首个门禁仅把已验收的 Transfer Vth Unit blueprint 作为独立结构证据，验证生成器能用现有 Page/Header/Workspace、titleless data-control PRIME、Metric、ScientificPlot、SplitPane、Table 重建相同的公共 Unit 骨架；生成代码不包含 `transfer-vth-lab` 分支，不复制生产 CSS、状态库、算法或 Presenter 路径。SDK 升至 1.51.51；Unit Templates 继续冻结为 2.5.38（41 Units / 73 Layout recipes）。

> **v3.71.115 WIP — Phase F Hosted TOP / Tool Generation**：声明式/Python 生成器扩展到现有宿主生命周期。生成插件可保持 standalone，也可通过受限 `host` 声明生成 TOP Workbench 或 Tool Workspace；hosted 输出只复用既有 `workspace/window` manifest、`ctx.ui.activities`、`ctx.ui.pages`、`ctx.ui.topWorkspace` 与同一份 Unit Workspace 组合。ScientificPlot 存在时 dedicated window 的 `scientific-renderer` 依赖由生成器自动推导；参数 PRIME 同步以标准 `data-control / parameters` 元数据进入 TopWorkspace。没有新增私有窗口 runtime、Presenter 分支、host fork 或专用 Unit。SDK 升至 1.51.50；Plugin API 仍为 1.19.0，Unit Templates 继续冻结为 2.5.38（41 Units / 73 Layout recipes）。

> **v3.71.115 WIP — Phase F Scientific Interaction / Replay Command Generation**：声明式/Python 生成器继续复用现有 Core Interaction 与 validated domain-command registry。生成 Plot 可声明稳定 series identity、reference-only selection、带维度/单位语义的 viewport linking，以及有界 legend visibility linking；portable Task 可同时生成可重放 domain command 元数据，并依赖现有 replay/stale-input 校验，不另建 Interaction Hub、command bus、Worker、Data Store、Python runtime 或 Presenter 分支。SDK 升至 1.51.49；Plugin API 仍为 1.19.0，Unit Templates 继续冻结为 2.5.38（41 Units / 73 Layout recipes）。

> **v3.71.115 WIP — Phase F Multi-source Scientific Workbench Generation**：声明式/Python 生成器扩展到多源、多结果科学分析工作台。一个 lowered JavaScript `DKDSTaskDefinition` 现在可以同时消费多个独立 scoped DataTable 源，在同一次 Core Task Runner 执行后刷新多个 Unit PlotGroup / PlotView / ScientificPlot 子图与多个结果表，并发布多个声明在 `data.produces` 中的 canonical DataTable Artifact；每个派生对象保留全部真实输入 Artifact lineage，参数 provenance 仍只记录参数而不复制源列。整个能力复用现有 Plugin API 1.19、Artifact Store、Task Runner 与 Unit 科学图体系，不新增 Python runtime、私有 Worker、第二 Data Store、私有科学图渲染器或 Presenter 分支。SDK 升至 1.51.48；Unit Templates 继续冻结为 2.5.38（41 Units / 73 Layout recipes）。

> **v3.71.115 WIP — Phase F Bounded Artifact/DataTable Pipeline Generation**：声明式/Python 生成插件扩展到真实科学数据链路。Python 仍只存在于作者侧/构建侧；生成运行时通过当前插件的 scoped `ctx.data.sources` 选择输入，只用 `columnMetadata()` 枚举列并以作者声明的 `maxRows ≤ 65536` 调用 `readColumnRange()` 做显式有界读取，再由既有 Core Task Runner 执行已 lowering 的 JavaScript `DKDSTaskDefinition`。结果可进入 Unit ScientificPlot / Table，也可通过 `ctx.data.model.createTable()` + `ctx.data.artifacts.publish()` 发布声明在 `data.produces` 中的 canonical DataTable，并记录真实 source lineage 与参数快照。禁止整表 `get()` 输入、Python fallback/provider、第二 Data Store 或第二 Worker 路径。SDK 升至 1.51.47；Unit Templates 继续冻结为 2.5.38（41 Units / 73 Layout recipes）。

> **v3.71.115 WIP — Phase F Portable Python Authoring → JavaScript Task**：新增声明式/Python 生成插件第二阶段。Python 仅作为作者侧/构建侧输入，不进入 DK Data Studio 默认后端；受控 Python 函数经 fail-closed AST lowering 完整转换为标准 JavaScript `DKDSTaskDefinition`，运行时仍只走现有 Plugin API 1.19 + Core Task Runner。无法静态证明等价的 import、自由全局、异步/状态型结构及未支持语法直接构建失败，不提供 Python fallback/provider。生成插件包不包含 `.py/.pyc`。SDK 升至 1.51.46；Unit Templates 继续冻结为 2.5.38（41 Units / 73 Layout recipes），Presenter/Core/现有第一方插件不因该能力增加第二运行时。

> **v3.71.115 WIP — Unit Maturity Freeze / Production CSS Dependency Closure**：完成生产 Unit 最终纯度审计。Unit Templates 继续冻结为 2.5.38（41 Units / 73 Layout recipes），不增加第 42 个 Unit。删除 Vth production cutover 后未被 manifest 加载的死 `plugin.css`；Resonance 组图改用 canonical `accepted-group-grid`，删除与 Unit PlotGroup 重复的 grid token；TER 由 Unit PlotGroup / PlotView `detailGeometry` 独占 group gap 与 scientific content minimum，删除重复 CSS token。新增 `unit:css-dependency` 全局门禁：禁止生产目录残留未加载 CSS、禁止插件 CSS 抢占 Presenter 外框或 Unit 内部 selector、禁止再次写回由 Unit runtime 持有的 managed Grid / Plot content token。SDK 升至 1.51.45；Windows `dev` CI 同步执行完整 `npm run check`，用于架构冻结验证。

> **v3.71.113 WIP — Unit-first SDK Authoring Closure / Declarative Generation Readiness**：官方新插件作者入口统一切换为 Unit-first：`src/plugins/_template` 与 SDK Workspace / TOP / Tool 模板均由 `ctx.ui.unitTemplates` 创建 Page、Layout、Workspace 与 PRIMARY/PRIME 组合，TOP/Tool 默认私有 `plugin.css` 删除，模板不再手写页面 HTML、`workspaceSurface.create` 或细节 geometry。低层 Workspace facade 继续作为 Plugin API 1.19 高级原语保留。新增 `unit:sdk-authoring` 长期审计并接入 `architecture:hygiene` 与 Android CI；Unit Templates 仍冻结为 2.5.38、41 Units / 73 recipes，生产插件 UI 不变。SDK 升至 1.51.44。

> **v3.71.112 WIP — Production Unit Cutover Closure / Generability Gate**：六个生产 UI 插件（Resonance / TER / Pulse Analysis / Pulse Sampler / Vth / Data Center）现已统一进入 production Unit presentation inventory。新增全局 cutover audit，要求生产 manifest 显式依赖 `ui.unit-templates`、加载 `unit-presentation.js`、机器可读 Unit blueprint 与当前 Unit Templates 版本同步，并禁止其它生产 JS 重新创建 Workspace / PRIME / composition 第二 owner。本轮不修改 Presenter、Unit runtime 或已验收界面，只把“生产 Unit 已完成切换、可作为声明式/Python 生成插件的稳定参照”变成长期架构门禁。

> **v3.71.111 WIP — Parameter Unit Responsive/Density Ownership Closure**：完成五个生产参数 PRIME（Resonance / TER / Pulse Analysis / Pulse Sampler / Vth）的响应式密度所有权审计。Resonance 的扫描按钮、寻峰按钮与移动端显示参数网格迁回 Unit Layout；Pulse Analysis 主参数表改用 canonical `form-grid-2`。TER、Pulse Sampler、Vth 已有 Unit-owned 结构保持不动。`unit:density` 现在同时审计生产参数 PRIME，禁止把已迁移的列数/单列降级重新写回插件 Mobile CSS。插件仍可声明领域内容和允许的 Unit geometry，Presenter 继续只消费通用 intrinsic constraint。

> **v3.71.110 WIP — Resonance parameter Unit density closure**：修复共振参数 Drawer 在移动端竖屏被压得过窄的问题。没有恢复 25%/固定 px 最小宽度，也没有在 Presenter 中加入共振插件分支；共振的“标签 + 控件”响应式结构改为通过 Unit Layout 的 accepted geometry / responsiveGeometry 声明，Unit 自动发布 avoid-last-resort intrinsic constraint，Presenter 继续只消费通用 Unit 约束。宽度足够时保持紧凑的标签/控件同行，只有真实内容宽度不足时才退回单列。其他已验收移动端布局保持不变。

> **v3.71.109 WIP — Mobile orientation / reflow contract**：移动端 Presenter 改用 live visualViewport 尺寸并在 orientation/viewport settle 后统一重投影；Drawer 用户宽度按 portrait/landscape 分域持久化，删除 25% 页面机械硬下限，最小合理宽度完全由 Unit intrinsic/density constraint 与真实 overflow 求解。Core Unit Action 强制原子单行文字。SplitPane 在用户调整后以保存的 ratio 作为跨 viewport 的首选意图，横竖屏切换时自动按新的可见 block extent 重算，避免 Vth 结果区和拖拽手柄停留在旧像素轨道。

> **v3.71.109 WIP — Mobile Presenter orientation / reflow contract**：旋转与 WebView viewport 变化统一经过 settled viewport publication，优先使用 `visualViewport` 并在布局稳定后再次发布 Presenter 快照；Unit Direct Action 统一消费 Core `dkds-action-button` 单行操作几何，使 Drawer 最小宽度由真实不可换行控件参与求解。Vth 数据控制 PRIME 显式声明 `sizing:fill`，并移除已退休的私有 920px 响应式覆盖；Data Center 移除 419px 强制单列阈值，移动端继续保持 source 全宽、tool/chart 并排。

> **v3.71.108 WIP — Mobile Drawer fill-sizing 合同修复**：修复 PRIME 经 Mobile Presenter 重投影后丢失 `sizing=fill` 的通用问题。此前 Presenter 会把非参数 Drawer 根强制写成 `height:auto`，导致需要占满剩余空间的列表/表格在真实移动端被压缩；现在 Unit 的 fill sizing 会传递到 Drawer frame，并由 Core 提供确定的 block-size containing block。Data Center 仅通过标准 PRIME 参数声明 `sizing:'fill'`，不再用插件私有 `height:100%` 抢占 Presenter 几何所有权。

> **v3.71.107 WIP — Data Center 初始 Catalog Seed 生命周期修复**：Data Center 挂载完成后立即从当前 canonical Artifact Store 建立首个 Unit/Presentation 快照，不再依赖后续 `analysis:opened` 或 `data:artifacts-changed` 才让已有工程数据出现；事件只负责 mount 后的增量同步。新增 executable mount 回归：预载 DataTable 后不发送任何刷新事件，列表必须立即出现条目。Data Center 1.15.39，Android versionCode 247。

> **v3.71.105 WIP — Data Center retained Unit List / Presenter reparent 闭环**：Unit List 新增 retained handle、原子 `setItems()` 与 Core-owned `leading/title/meta` anatomy；Data Center 持有 Unit 创建的同一列表实例，不再在 PRIME 被 Mobile Presenter reparent 后通过 page/global ID 重新寻找列表。项目恢复后的 86 个 metadata 现在直接作为 item descriptors 提交到 retained List Unit。SDK 1.51.43 / Unit Templates 2.5.38。Android 实机仍是最终验收。

> **v3.71.104 WIP — Data Center 动态 Unit 列表 / Mobile Drawer 弹出菜单逻辑归属修复**：Data Center 数据对象列表改为先在离屏容器中通过 canonical Unit ListItem 完整物化，再原子提交到可见列表；单条恢复 metadata 异常只降级该行，不再清空整份 catalog。Selectable ListItem 同步获得 Core `menuItem` component identity，避免等待异步语义 hydration 才获得正常可见/选中外观。Mobile Drawer 的 outside-tap 判定新增 transient popup 的逻辑归属：由 Drawer 内 select/menu 锚点打开、实际挂载在 `document.body` 的 ContextMenu 仍被视为 Drawer 内部交互，点击下拉条目不再关闭参数面板。无插件 ID 分支。SDK 1.51.42 / Unit Templates 2.5.37 不变。Android 实机仍是最终验收。

> **v3.71.103 WIP — Mobile 横竖屏重布局与 Data Center 恢复闭环**：参数 Drawer 在 orientation/viewport 变化后的重新投影会再次执行 Unit 最小合理宽度拟合；纵向 SplitPane 不再因窄屏误触发横向 reflow，从而保留 Vth 拖拽手柄与结果区 fill；Data Center 在正常手机竖屏继续保持“公式/派生列 + 通用图形预览”双列，仅在 ≤419 CSS px 时单列；Mobile auto-flow PRIMARY host 不再作为第二层 Material/shadow owner；项目恢复/Artifact Store 替换会显式失效 Data Center catalog cache，列表直接消费 bounded metadata，避免“对象计数正确但条目为空”。SDK 1.51.42 / Unit Templates 2.5.37 不变。Android 实机仍是最终视觉验收。

> **v3.71.98 WIP — Mobile scientific companion 回归恢复**：TER 关闭参数 Drawer 不再触发 scientific companion 的 Grid/Unit/Chart resize；`accepted-scientific-v1` 删除 3.71.97 的 JS shadow allocator，恢复 3.71.60 的 viewport-bounded (`46vw / 58vh`) 与 scroll-safe companion shell 合同，并通过 `accepted-scientific-v2` Mobile split generation 一次性失效过去坏版本遗留的共振 right/bottom 尺寸。其他插件参数 Drawer、Pulse 单行 Header、最后数据表 fill、6 px safe inset 与 Material flattening 不变。Android 实机仍是最终验收。

> **v3.71.96 WIP — Mobile 投影生命周期完整性修复**：针对 3.71.95 Android 实机仍存在的两项问题继续收敛。Mobile Presenter 不再只在首次投影时规范 Surface 外部几何：右/底 scientific companion 的真实 projected root 现在明确 `height:100%` 填满 Presenter frame，并由通用 projection integrity guard 在后续 Unit/Portable 生命周期改写根 style 时重新确立 Presenter 的外部几何所有权。参数 PRIME 一旦被 close/park 移出 Drawer frame，旧 frame 会在同一 MutationObserver microtask 内立即回收，不再等待下一次 Presentation snapshot，因此避免 TER 关闭参数时约 0.5 s 的白色空壳。该 guard 只响应 projected root 自身 style 或真正 detach，不响应普通图表内部 DOM 更新。其余已验收参数 Drawer 的表格填充、安全留白、单行 Header、Material flattening 均未改动。Chromium 使用当前生成 runtime 验证：260 px companion frame/root 始终等高，即使强制写回 `height:auto` 也会恢复；节点移入 parking 后 frame 立即从 DOM 删除。仍以 Android 实机为最终验收。

> **v3.71.90 WIP — Mobile companion live-fit / 参数 Drawer 滚动与拖拽闭环**：移动端参数 Drawer 保留触摸/滚轮纵向滚动但取消整体右侧滚动条；parameter PRIME 仍是唯一四边 6 px content inset owner，投影内容恢复自然高度，因此列表滚到底部时底部 6 px 留白可见。参数宽度拖拽改为 RAF 合并，拖动过程中只写宽度与 Presenter occupancy，不再每个 pointer move 重排全部 Unit/科学图，结束时再统一 reflow。右侧/底部 companion 的 Presenter shell 不再成为第二层滚动 owner，进入 companion 时清零旧 shell scroll offset；通用 block resolver 同时读取 Unit hard minimum 与内部 canonical scroll owner 的 live preferred height，并通过 ResizeObserver + MutationObserver 在换行、Grid/Plot resize 后重新求解，避免共振曲线检查器/组图冻结在首次打开尺寸。

> **v3.71.89 WIP — Mobile companion safe-area / 参数右侧留白闭环**：修复 3.71.88 仍未解决的两个实机问题。参数 Drawer 的滚动条现在占用 Presenter 自己的 3 px trailing chrome lane，不再覆盖 parameter PRIME 统一的 6 px 右侧 outer inset，因此四边留白仍由 PRIME 单一 owner 决定且右侧可见。右侧/底部 companion 通过 Unit geometry registry 发布真实 intrinsic minimum：共振曲线检查器声明 320 px inline / 220 px block 内容下限，GroupArea 由通用 `minItemWidth` 发布一列最小宽度并声明 220 px block 下限；Presenter 用这些约束限制已打开 Drawer 的最大宽度、保护右侧 inspector 的顶行高度，并把底部 companion 从“全宽 + 左 padding”改成真实缩窄的 uncovered viewport。Drawer occupancy 改变后统一触发 managed Grid / scientific plot reflow，插件仍不拥有最终 Mobile 宽高。

> **v3.71.88 WIP — 移动端参数 Surface 几何闭环**：参数 Drawer 增加统一的 **页面宽度 25% 硬下限**，但 25% 只是下限而不是默认目标；超过该下限后仍由真实 Unit intrinsic constraint 决定最小合理宽度。共振参数 PRIME 删除 361 px 私有最小宽度，参数面板中的图例永远不再参与 Drawer 宽度求解，而是反向适配当前面板：横向排布最多三行，面板更宽时自动收为两行/一行，三行仍不足时横向滑动且不显示滚动条。Pulse Analysis 不再用 310/260 px 之类插件私有阈值决定参数面板宽度：表单在窄面板下保持可压缩的双列 Unit 布局，文件操作条保持横向，由真实按钮行的 intrinsic overflow 反向抬高最小宽度，因此只为实际内容多占空间。Pulse Designer 参数 header/tabs 允许在真实内容宽度下换行且 Drawer 滚动区预留 scrollbar gutter，避免 Vg 被右侧裁切。Presenter 同时发布唯一 Drawer occupancy token，右侧 Inspector 与底部 Group companion 都据此避开固定参数 Drawer，不再被覆盖。

> **v3.71.87 WIP — 参数 PRIME 四边留白统一 / TER 过大 inset 修正**：参数列表的四边 outer inset 现在由 Core 的 parameter-purpose PRIME 统一拥有，Desktop/Mobile 均为 **6 px**。TER 原先私有的 12 px、Pulse Sampler 的 14 px、Resonance 的 10 px outer inset 声明全部移除；Pulse Analysis、Vth 等此前没有私有 inset 的参数 PRIME 也自动获得同一 6 px 默认。插件仍可修改参数 Surface 内部的 Unit 组合/Panel padding/布局参数和 `minContentInlinePx`，但不得再覆盖参数 PRIME 的最外层四边留白；非参数 PRIME 的 `detailGeometry.contentInsetPx` 仍保留为有界 tunable。TER 的最外层留白由 12 px 降至 6 px，正好减少 50%。

> **v3.71.86 WIP — Unit Geometry Constraint Registry / Bounded Configuration**：将 3.71.84/85 已验证的 inline/block 单 owner 模型收口到一个通用 Unit geometry constraint registry。Layout、PRIME、PlotGroup/GroupArea 只发布固有约束，Mobile Presenter 只消费通用 resolver 并独占最终 Surface 分配；插件只能通过 Unit 已接受的 variant / detailGeometry / responsiveGeometry 等参数进行有界配置，不能成为第二个 geometry writer。`units.geometryOwnershipPolicy` 公开这一边界供 SDK 作者读取。

> **v3.71.85 WIP — Mobile Geometry Single Owner Phase 2**：将 v3.71.84 的 inline-axis 约束链扩展到 block axis。PlotGroup/GroupArea 由 PlotView accepted detailGeometry 实时汇总最小/首选高度，Mobile Presenter 作为唯一 companion lane owner 结合真实 viewport 与 PRIMARY 保留区求解最终高度；用户拖拽只写 preference，不再拥有 58vh/680px 等独立上限。移动端同时恢复 Workspace `primaryScroll` 的单一滚动 owner，`contained` PRIMARY 不再被平台层额外包一层 `overflow:auto`，用于消除 Vth 等页面的右侧冗余 scrollbar/gutter。

> **v3.71.84 WIP — Mobile Geometry Single Owner Phase 1**：移动端参数 Surface 开始从“Presenter 猜宽度 + Unit/插件各自响应”收口为单一约束链。Layout/PRIME Unit 发布真实 intrinsic inline constraints，Mobile Presenter 只负责最终 Drawer frame 分配；Unit 始终使用真实宽度，不再伪造宽度阻止降列；Drawer scroll viewport 不再叠加第二层 outer inset，PRIME 成为唯一外层内容 inset owner；持久化宽度只作为 preference。同步修复 ContextMenu/Select popup 的 toggle 与 Presenter 生命周期统一关闭，并将 Resonance 参数 Drawer 的 360 px accepted minimum/inset 迁入 PRIME detailGeometry。

> **v3.71.82 WIP — TER 首开真实热路径 / 关闭隔离二次修正**：移除 TER 首次点击和 runtime-only 预热路径中的整项目 `captureActiveProjectTab()` / `makeProject()` 同步序列化，独立窗口只接收目标插件切片与 live Artifact snapshot；Artifact revision 作为轻量变化令牌，避免主进程再次对完整 snapshot 做 JSON+SHA1。可复用 TOP 关闭/隐藏只刷新插件切片，不携带 Artifact、不生成完整 project，也不再触发主窗口整项目 capture；旧 `prewarm.v1` 状态被隔离为 v2，避免历史错误的 `false` 继续阻止 TER 预热。

# DK Data Studio

> **v3.71.115 WIP — Export / Desktop Lifetime / Brand Closure**：数据图复制与 CSV 导出改为读取 Scientific Chart 的逻辑 source snapshot，不再依赖 renderer DOM 的 `plot.data`；空值/NaN gap 与不配对尾项不再生成空白 CSV 行。PlotView 的保存/复制统一经 Host I/O，Desktop 与 Android 共用同一入口。Desktop 主窗口成为应用 lifetime owner，关闭主窗口会进入真实 app quit 并强制回收所有可复用 TOP 窗口；Windows process title 与打包元数据加入品牌校验。Windows/Android raster icon 统一由同一 canonical renderer 生成，Android adaptive 背景与品牌底色一致。SDK 仍为 1.51.68。

> **v3.71.80 WIP — TER 首开预热恢复 / 关闭隔离**：恢复 TER 已接受的 runtime-only dedicated-window 预热默认值，避免首次点击重新承担独立渲染器与科学图运行时冷启动；修正独立 TER 窗口关闭时 final snapshot 重放已实时同步 Artifact、误触发全局 `data:artifacts-changed` 与全局重绘的问题。相同 Artifact 的 final recovery delta 现在幂等，final snapshot 不再天然等价于全局视觉失效；嵌入分析页关闭也只恢复 SUPER 可见性，不重新调用 SUPER `onActivate`。


> **v3.71.75 WIP — 移动端参数 Drawer 硬约束修正**：实机证明 v3.71.74 仍会把参数面板撑到接近整页。进一步定位到宽度判定把普通字段/勾选标签当成必须单行完整显示的硬约束，长标签会迫使求解器一直扩大到可用页面宽度。现在普通标签允许换行且不拥有 Drawer 宽度；控件可缩、Unit 可重排，但固定 gap/padding 不缩，真正的结构越界和实际 Action/Fill 按钮文字仍是硬约束。失败的 v11 宽度状态通过 v12 namespace 失效。

> **v3.71.72 WIP — Mobile 最小合理宽度 / 层级根因修正**：修复 3.71.70 实机仍未生效的关键竞态：Presenter 二分探测宽度时，Unit 响应式重排过去要等待 `ResizeObserver`，导致探测读取旧多列布局并错误放大面板。现在每个候选宽度都会先同步执行 Unit reflow，再测真实溢出；输入框/选择框等可缩控件不得贪婪占宽，主要 Action 文字仍必须完整显示。同步隔离旧 Mobile Drawer、右侧 Split 和 PortableView 持久化状态；Pulse Sampler 正常宽度固定 3+3 排布，Pulse Analysis 结果区恢复单一顺序流 owner。Android 编译路径继续保持 3.71.71 的规则，编译前不自动运行任何 test/typecheck/Gradle help preflight。

> **v3.71.71 WIP — Android 直接编译路径**：`DKDS.cmd android-build` 与 `android-run` 不再在编译前自动执行 `mobile:test`、`typecheck` 或额外的 Gradle `help` 预检；完成必要的工具链/依赖/签名与离线资源准备后直接进入 `assembleRelease`。这些验证命令仍可手动运行，但不再阻塞 APK 编译。

> **v3.71.66 WIP — Pulse Unit 几何验证修复**：修复 3.71.65 在 Pulse 结果表响应式 Unit Layout 中声明未被当前 Unit 几何词汇接受的 `max-height:360px` 所导致的运行时失败。保持严格 Unit 验证，不放宽合同，不回退到插件 CSS；改用已接受的 `330px` 详细几何参数。

> **v3.71.65 WIP — 脉冲分析结果流 Unit ownership 修正**：结果双图、PlotView 固有高度与批量结果表的几何统一由既有 Unit Layout / PlotView detailGeometry / SplitPane 合同负责；Desktop/Mobile Presenter 只决定平台摆放。宽 PRIMARY 保持双列，仅 PRIMARY 实际宽度 `<=520px` 时由 Unit Layout 降为单列；插件与 Mobile CSS 不再拥有结果流几何。

> **v3.69.4 Final Archive 保持不变**：Phase E 的正式互操作合同仍冻结于 3.69.0；3.69.4 继续作为完成 Phase A–E 与真实 Android 验收后的长期归档基线。

当前版本：**v3.71.121**  ·  状态：**WIP**  ·  Plugin API：**1.19.0**  ·  SDK：**1.51.76**  ·  Unit Templates：**2.5.38**  ·  Theme Contract：**3.10.0**

DK Data Studio 是面向科学数据分析的插件化桌面工作台。Electron、LAN Web 与移动端共享数据、算法与插件契约；Core 负责宿主无关的数据生命周期、科学绘图基础设施、Material/Theme 语义和插件运行时，具体领域分析由插件提供。

## 当前架构原则

- **Core 保持领域中立。** 共振、TER、Pulse、Vth 等领域逻辑不得进入 Core selector、Material role 判定或通用布局 fallback。
- **Core 按职责组织。** `src/core/` 根目录不放实现文件，代码进入 `data / project / scientific / plugins / ui / theme / services / host / performance / workflow / recipes`。
- **插件声明语义，Core 提供基础设施。** PlotView、ScientificPlot、Table、ActionGroup、Selection、History、Theme Material 等由 Core/SDK 统一实现。
- **Mobile 参数 Drawer 完全由 Unit intrinsic / density constraint 求最小合理宽度。** Presenter 只从最小 canonical control footprint 开始探测，并由真实 Unit 双列密度、固定 gap/padding、必要结构及主要 Action 完整文字反向抬高宽度；不再设置页面百分比或固定 px 硬下限。横竖屏分别保存用户宽度偏好，避免旧方向的窄宽度污染新方向。参数图例不拥有 Drawer 宽度，只跟随面板宽度重排/横向滚动。
- **参数 PRIME 的最小宽度是受约束的 Workspace/Unit 几何参数。** Desktop 必须尊重插件通过公共合同声明的克制 `leftMin`，不能把面板压过最小可用宽度后再依靠子控件异常换行兜底；同时用 `leftReserve` 保护主工作区，禁止贪婪占宽。
- **Domain migration 共享唯一业务 owner。** `ctx.services.domain` 只投影 production service 的可序列化 snapshot、白名单 action 与订阅事件；并行 Unit shell 不得复制 controller、state store、算法或计算 pipeline，跨插件消费必须显式声明 `pluginDependencies`。
- **科学显示投影与科学数据分离。** 超大曲线允许按可视区做有界显示采样，但 Artifact、计算、复制与导出始终保持全分辨率；显示采样必须保留端点、极值、NaN gap、scan segment 与原始 source row identity。
- **大矩阵显示采用独立 Raster owner。** Heatmap 单元格由 Canvas 2D 绘制，SVG 只负责坐标轴、标签、colorbar、annotation 与轻量交互层；Theme/geometry 变化应复用未变化的 matrix/colorscale raster，不得重新创建逐单元格 DOM。
- **算法可替换。** 峰检测、FWHM/基线、TER、transport transform 等通过 Algorithm Provider 注册、版本化并记录 provenance。
- **领域命令只有一条执行路径。** UI、脚本与 MCP 对可外部调用的分析/数据处理操作统一进入 Core validated domain-command registry；可重放命令记录输入 Artifact revision/fingerprint、精确算法/插件版本、参数、执行状态和输出引用，默认在输入 revision 改变后拒绝静默 replay。
- **跨视图 Interaction 使用项目级事务。** Selection 继续走唯一 `dkds:selection-changed` 桥；link group 携带 project/scope/runtime transaction metadata，远端应用在 Core 内按 transaction 去重且不再广播，避免 A→B→A 回环与跨项目泄漏。
- **跨视图科学轴必须先证明维度/单位兼容。** `ctx.science.units` 是唯一 Scientific Units owner；联动不能靠轴标题或显示字符串猜测，未知单位与维度冲突均 fail closed，合法 SI/复合/仿射单位通过显式转换关系进入 Interaction。
- **Legend 联动使用稳定 series reference。** 跨视图图例可见性只接受 `artifactId + seriesId`，状态与 Selection/viewport 独立；标签、颜色、trace index 仅是本地 presentation，不能成为联动身份。
- **CSS 依靠所有权而不是 specificity。** 已删除 `base/modern` 双层结构和 authored CSS 中的 `!important`，统一使用 Cascade Layers。
- **Core-managed Grid 的最终几何只允许 Core 持有。** 插件可通过 GridController 的列偏好与 `--dkds-grid-*` 配置 token 声明需求，但不得再用插件选择器写 `grid-template-columns / gap / align-items` 等最终网格属性；语义所有权审计会把这种别名覆写直接判为失败。
- **Theme 采用 Role → Recipe → Tokens。** Core 决定 `chrome/sidebar/surface/elevated/popover/control/floating` 语义角色，主题决定 `clear/thin-glass/soft-glass/liquid-glass` recipe 与 token。
- **Theme revision 只服务 Raster/Computed Style。** 普通 DOM 组件依赖 CSS variables 与一次同步 Core composition 自然更新，不得订阅 Theme revision 做全页面 repaint；Canvas/ScientificPlot 等必须读取计算样式或重绘 raster 的消费者才使用选择性 revision。
- **语义 Surface 只有一个 base-paint owner。** Workbench 的 Sidebar/Elevated/Surface slot 由 Core 决定 Material Role 与基础 token；插件放入 slot 的直接内容默认透明，不得再用 `surfaceSoft` 覆盖父级语义 Surface。
- **插件运行时只支持当前正式合同。** 插件包必须精确满足当前 Plugin API / manifest / Theme Contract；不提供旧 SDK、旧宿主或旧插件包的转换、降级或兼容执行路径。
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

`mobile:test` 可直接在干净源码/新 clone 上运行：它会先由 canonical composition source 重建被忽略的 `src/generated/runtime/*`，再执行 Mobile 架构回归。

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
