# 脉冲与采样处理 1.4.1

Plugin API 1.18 Tool/TOP 工作台。

- Vd / Vs / Vg 三路脉冲独立生成与片段拼接。
- Core `ScientificPlot` 统一显示三路波形，颜色由 `SeriesRegistry` 分配。
- Core `TableSurface` 显示合并波形与稳态采样结果。
- 工程数据只通过 `data.sources` / `data.artifacts` 读取，不访问 Core 私有状态。
- 插件 CSS 只负责领域布局；按钮、表格、卡片、颜色和 Theme paint 均由 Core semantic classes/tokens 负责。
