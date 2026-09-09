# 脉冲与采样处理 v1.9.2

DK Data Studio Plugin API 1.19.0 Tool Workspace。它将旧版 PyQt `Pulse Generator + Data Pick` 的核心能力重新实现为一个不依赖应用私有源码的原生工具插件。

## 作为 DK Data Studio 3.64 内置插件

- 发行版内置基线更新为本插件 **v1.9.2**，不再依赖用户外部安装。
- 脉冲生成、三通道合并、采样边界匹配、稳态平均、结果与 CSV 语义保持 v1.9.2 原实现。
- 作为第一方插件，视觉职责重新收敛到 Core：卡片、工具组、按钮、字段分别消费 `dkds-surface`、`dkds-toolbar`、Core button 与 `dkds-field-control`，插件 CSS 仅保留领域布局。
- 插件 CSS 不含 `!important`，也不再固定亮/暗主题颜色、边框、阴影或控件尺寸。

## 功能对应

### 1. 三路脉冲生成

- 独立管理 `Vd`、`Vs`、`Vg`。
- 参数：脉冲电压上限、电压步长/方波数、读取电压、脉冲时间、读取时间、时间偏移、周期、拉伸系数。
- 保留原 `pulse.py::pulse_generator_type_1` 的四种扫描方向和方波模式。
- `cycle` 规则与原脚本一致：`0.25`、`0.5` 或 `>=1` 的整数。
- 每个通道支持多个片段顺序拼接。
- 自动构建统一时间轴，并按“上一状态保持”规则合并 Vd/Vs/Vg。

### 2. 工程数据采样/清洗

- 通过 Core 的标准 Import Workbench 导入和分配工程数据，不创建插件私有文件选择器。
- 从 `ctx.data.sources` / `ctx.data.artifacts` 读取规范 `data.table` Artifact。
- 自动识别 Time / Current 候选列，同时允许用户手动选择。
- 按当前通道脉冲边界切分测量时间序列。
- 每个区段支持前/后数据点剔除，再计算稳态平均电流。
- 未填写剔除点数时，根据实测采样间隔的小数精度自动推导，与旧程序“按采样精度剔除首尾点”的意图一致。
- 按原程序语义将偶数区段映射为 Read，奇数区段映射为 Pulse。

### 3. 结果查看

- Core ScientificPlot 显示三路合并波形和提取结果。
- Core TableSurface 显示片段、合并时间表和结果表。
- 结果 X 轴可选 Read/Pulse Voltage 或序号；Y 轴可选 Read/Pulse Current。
- 结果图的线性/对数显示由 Plugin API 1.19.0 的 Core ScientificPlot 统一管理，插件不再自行变换 `|Current|` 数据。
- 支持复制结果表，以及导出合并波形 / 提取结果 CSV。

## 相比旧 Python 实现的修正

1. **时间边界匹配不再要求浮点值完全相等。** 旧版使用 `list.index(Pulse_time)`，实测时间存在微小舍入误差时会直接匹配失败。新版使用最近采样点匹配，并以约 `0.55 ×` 采样间隔作为默认容差。
2. **三通道合并改为确定性的统一时间轴 + sample-and-hold。** 避免旧 `merge_sort` 在两路长度不同或起始时间不同时发生索引/通道错配。
3. **`read_time = 0` 时显式保留脉冲点。** 避免旧脚本该分支可能产生 time/value 长度不一致。
4. **保存逻辑不再使用旧代码中 Vd/Vs 数量字段互换的写法。** 新插件直接从当前规范数据生成 CSV。
5. **工程状态只存插件 slice。** 脉冲参数和片段随工程保存，不读取旧工程根字段，也不复制工程原始数据。

## SDK 契约

- `pluginType: "tool"`
- `workspace.role: "top"`
- 独立窗口 Activity：`pulse-sampler-tool`
- 使用公开 Core：PluginWorkspace、ScientificPlot、TableSurface、Project Slice、Data Sources / Artifacts / Data Model。
- 使用空的 `workbench-import` slot，由 Core 提供统一导入入口。

## 验证

开发时已使用 SDK 自带 `dkds-plugin.js validate` 通过 Plugin API 1.19.0 静态契约、布局安全和 Theme Coverage 校验。

同时对 JS 脉冲生成实现与原始 `pulse.py` 做了数值对照，覆盖：

- 正上限 + 正步长，cycle = 0.25 / 0.5 / 1 / 2
- 负上限 + 正步长
- 正上限 + 负步长
- 负上限 + 负步长
- 方波模式
- 非 1 拉伸系数、非零读取电压和时间偏移

上述测试的 time / voltage 数组长度和数值均与原 Python 实现一致（常规 `read_time > 0` 路径）。


## v1.0.2 · 新 SDK 对齐

- 重新使用当前 SDK 1.15.0（minimum app 3.61.18）的 validator 与 packager 验证和打包。
- 保持 Tool Workspace 的标准 TOP-equivalent 生命周期：`workspace.role=top`、dedicated `window`、`ui.activities` 与 `ui.topWorkspace` 四项一致。
- 保留页面顶部 `workbench-import` Core slot，使用 dedicated-window Core Import forwarding，不引入插件私有文件选择器。
- 按新版 SDK 的显示契约移除插件私有 `|Current|` 对数变换与复选框。ScientificPlot 的 Y 轴线性/对数切换完全交给 Core，避免显示状态污染插件领域状态或导出数据。
- 兼容旧工程 slice：读取旧状态时会忽略已经废弃的 `analysis.logY` 字段，脉冲参数与已保存片段保持可恢复。


## v1.0.5 · Plugin API 1.17.0 迁移

- 插件 API 升级到 `1.16.0`，最低宿主升级到 DK Data Studio `3.61.29`。
- Tool Workspace 的 Primary 改为 `primaryScroll: "safe"` / `scroll: "safe"`，由 Core 管理外层滚动与 Layout Guard。
- 移除插件根节点的 `height:100%`、语义卡片的 `overflow:hidden`，并去除 `minmax(<positive px>,1fr)` 的高风险科学布局，避免内容被裁剪、ScientificPlot 空白或 ResizeObserver 自增长。
- ScientificPlot 容器以 `min-height` 表达首选尺寸，实际紧凑渲染与空间恢复交给 Core。
- DOM 写入和事件绑定进一步收敛到 `ctx.ui.dom`，事件监听器在 Workspace 卸载时通过 Core disposer 统一释放。
- 脉冲生成、Vd/Vs/Vg 拼接、采样时间匹配、稳态平均和 CSV 数据语义保持不变。


## 1.0.5 波形图例

- 三路合并波形为 Vd、Vs、Vg 使用固定且互相区分的颜色。
- 图表上方提供 Vd / Vs / Vg 图例。
- 单击任一图例，仅显示对应通道；再次单击当前图例恢复三路同时显示。
- 通道筛选只影响 ScientificPlot 的显示，不改变脉冲数据、合并表格或 CSV 导出。


## 1.3.0 · TableSurface 视觉完全回归 Core

- 三张数据表继续使用 `ctx.ui.tables.mount(...)` / Core TableSurface，未改为插件自绘表格。
- 删除 `.ps-mini-table` / `.ps-table` 上对表格容器的自定义 `overflow`、边框、圆角和背景，仅保留布局所需的 `min-width` / `min-height`。
- 删除 `.pulse-sampler-shell table { font-size: 10px; }`，不再覆盖 Core TableSurface 内部字体。
- 表头、单元格、选择态、悬停态、滚动条、列宽、排序和主题适配全部由 DK Data Studio Core 管理。
- 本次修改只影响表格视觉职责边界，不改变脉冲生成、三路合并、图例筛选、稳态采样和 CSV 导出数据。


## v1.3.0 / SDK 1.17 migration

- Targets SDK 1.17.3 / Plugin API 1.17.0 and DK Data Studio >= 3.61.36.
- Dedicated scientific workspace dependency is now `scientific-renderer`; renderer vendors are Core implementation details.
- The merged Vd/Vs/Vg plot now uses the Core-owned ScientificPlot legend. All available channels are always declared to ScientificPlot; Core owns legend packing, curve/legend focus, click-to-isolate and click-again-to-restore behavior.
- Vd/Vs/Vg series identity and colors are registered through `ctx.ui.series`, so series presentation remains stable and theme-compatible without plugin-owned legend CSS.
- Plugin-owned `.ps-wave-legend`, `waveFocus`, channel visibility filtering, and legend click handlers were removed.
- TableSurface remains fully Core-owned; the plugin does not target table internals.
- Pulse generation, channel merge, sampling-boundary matching and steady-state averaging algorithms are unchanged from v1.0.6.


## v1.9.0 / SDK 1.17.6 对齐

- Targets SDK 1.17.6 / Plugin API 1.17.0 and DK Data Studio >= 3.61.39.
- 保留 `.dkplugin` manifest 作为 owner renderer 与 dedicated renderer 的一致契约；Activity、TOP Workspace 与 Page 的注册关系保持不变。
- 按 SDK 1.17.6 的 PluginWorkspace safe geometry 规则，将工作区根节点和主 shell 的 `min-height:100%` 改为 `min-height:0`，避免内容固有高度反向撑大 Core-owned Primary viewport。
- 为多行 `auto` Grid（主 shell 与脉冲设计器）增加 `align-content:start`，避免同排较高区域导致空余高度被分散到表单行之间。
- ScientificPlot 继续使用 `scientific-renderer` 与 Core 原生 legend/series；SDK 1.17.4 的稳定 Cartesian autorange padding 自动生效，插件不重复实现坐标范围 padding。
- 脉冲生成、三通道拼接、边界匹配、稳态平均、表格与 CSV 数据语义均未改变。


## SDK 1.18 migration

- Targets Plugin API 1.19.0 / DK Data Studio 3.67.5+.
- Keeps source access on the canonical Artifact-only path: `ctx.data.sources` → `ctx.data.artifacts` → `ctx.data.model`.
- Uses Core-owned ScientificPlot legend/series and Core TableSurface.
- Plugin styling now references semantic DKDS UI tokens and leaves ScientificPlot/TableSurface visual internals to Core.


## v1.9.2 / SDK 1.18.0 重新发布

- 使用当前 SDK 1.27.0 / Plugin API 1.19.0 / Theme Contract 3.10.0 重新校验和打包。
- 本次 SDK 与 v1.9.0 所使用的 SDK 逐文件一致，因此不引入额外兼容层或无意义的实现改动。
- 插件仍使用 canonical Artifact-only 数据路径、Core ScientificPlot legend/series、Core TableSurface 和 safe PluginWorkspace。
- 脉冲生成、三通道合并、时间边界匹配、稳态平均、结果显示与 CSV 数据语义均保持不变。
