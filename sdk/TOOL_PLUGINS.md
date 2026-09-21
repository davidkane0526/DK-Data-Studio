# Tool Workspaces — Plugin API 1.19

> **默认作者路径（SDK 1.51.44）：Unit-first。** Tool Workspace 的 lifecycle 仍与 TOP 相同，但页面、布局、Workspace 与 PRIMARY/PRIME/SUB 组合应优先使用 `ctx.ui.unitTemplates`。默认模板不再附带私有布局 CSS。低层 `ctx.ui.workspaceSurface` 继续保留为高级原语，而不是新插件起点。

工具（`pluginType: "tool"`）现在是与 TOP 工作台并列的正式 UI 分类。

**当前版本刻意不定义额外的工具语义。** 一个拥有界面的 Tool Workspace 与 TOP 使用相同的 workspace/window/activity 生命周期；当前唯一宿主级区别是入口分类：

- TOP 工作区显示在 TOP/Activity 区域；
- Tool Workspace 收纳到应用顶部 **“工具”** 按钮中；
- Tool 被提升为 SUPER 时，仍复用同一份工作区实现；
- 后续如果工具类需要新的专用能力，再扩展本文件，不要求插件现在提前实现假设性的工具契约。

## 1. Tool Workspace

推荐的新工具插件形式与 TOP 完全相同，只把 `pluginType` 改为 `tool`：

```json
{
  "pluginType": "tool",
  "workspace": {
    "role": "top",
    "activity": "my-tool"
  },
  "window": {
    "activity": "my-tool",
    "reuse": true,
    "persistence": "project"
  }
}
```

运行时同样注册 Activity 与 TopWorkspace：

```js
ctx.ui.activities.add({
  id: 'my-tool',
  label: 'My Tool',
  openMode: 'window',
  onActivate: () => ctx.workspace.openPage('myToolPage')
});

ctx.ui.topWorkspace.register({
  id: 'my-tool',
  activity: 'my-tool',
  layout: {
    mode: 'native',
    root: { selector: '#myToolPage .dkds-plugin-workspace' },
    primary: { id: 'main', role: 'analysis-primary' },
    prime: [],
    sub: []
  }
});
```

Core 会自动把这个工作区的打开入口放到顶部 **工具** 菜单，而不是 TOP 标签栏。插件不要自行创建全局“工具”按钮。

Tool Workspace 使用与 [`TOP_WORKSPACES.md`](./TOP_WORKSPACES.md) 相同的独立窗口、Artifact hydration、PluginWorkspace、ScientificPlot、TableSurface、Project Slice、Data Sources 等公开契约。

## 2. 数据与导入

工具是否消费工程数据由插件自己决定。需要数据时可像 TOP 一样声明：

```json
"data": { "accepts": ["science.transport.iv"] }
```

并通过：

```js
const rows = ctx.data.sources.list();
const artifact = ctx.data.artifacts.get(rows[0]?.artifactId);
```

读取分配给工具的工程数据。若声明 `data.accepts` 并提供 `workbench-import` slot，Core 可以提供标准导入入口；工具不应创建私有文件选择器。

## 3. 图形与布局

Tool Workspace 与 TOP 使用相同的 bounded-layout 规则。填充窗口的图形推荐：


> **Runtime facade:** `ui.workspace` is the manifest requirement and `ui.plugin-workspace` is a capability label. Plugin code must call `ctx.ui.workspaceSurface`; `ctx.ui.pluginWorkspace` is not a Plugin API 1.19 runtime property and is rejected during SDK/package validation.

```js
const workspace = ctx.ui.workspaceSurface.create(host, {
  primaryScroll: 'safe'
});
```

在当前合同中，PRIMARY 是工作台主内容面，不是一个默认生成的“同名功能按钮”。`navigation: "auto"` 时，Core 只有在存在 SUB 页面、需要“返回 PRIMARY”这一真实导航语义时才生成 PRIMARY 按钮；PRIME（参数、数据、检查器等）仍按自身语义显示。若插件确实需要始终暴露 PRIMARY 操作，可显式使用 `navigation: "always"`；`navigation: "hidden"` 则关闭整条工作台导航。

PRIME/PlotView 的 `placements` 同样按“真实选择”呈现：若只声明一个位置（例如 `placements: ["left"]`），Core 会固定该位置且**不生成位置菜单**。插件不得再自行隐藏一个无意义的位置按钮；需要可移动时应声明两个或更多合法位置。

优先让 PluginWorkspace 的 `safe` 模式管理滚动：Core 为 Primary 提供固定视口和唯一滚动容器，插件内容可以超出视口，但不能反向把 Host/窗口撑高。插件根节点使用 `min-height:0`，不要串联 `min-height:100%`；表单/卡片若使用多行 `auto` Grid，应显式 `align-content:start`，避免被同排更高卡片拉伸后把空余高度分散到各行。只有有意参与文档流增长时才使用 `auto`，真正固定视口且不需要 Host 滚动时才使用 `contained`。

依赖也必须由独立窗口显式声明：

- 所有 `ctx.ui.scientificPlot.*` 绘图入口统一声明 `"scientific-renderer"`；
- Core 科学绘图只有一个 D3 后端。插件只声明 `"scientific-renderer"`，不得直接声明 renderer vendor；统一使用 `createRenderer(...)`。

SDK validator 会检查这些依赖。

## 4. Command-only Tool

仍保留轻量 command-only 工具作为兼容/简化形式。此类插件不声明 `workspace.role: "top"`，通过：

```js
ctx.commands.register('com.example.tool.run', () => {});
ctx.ui.menus.add({ id:'run', label:'运行工具', command:'com.example.tool.run' });
```

直接向 **工具** 菜单贡献动作。

这只是 Tool 的轻量形式，不是 Tool Workspace 的不同宿主等级。

## 5. SDK 校验

对拥有 `workspace.role: "top"` 的 Tool，SDK 使用与 TOP 相同的机器校验：

- `workspace.activity` 与 `window.activity` 必须一致；
- 必须声明 `workspace`、`ui.activities`、`ui.top-workspace`；
- 必须调用 `ctx.ui.activities.add(...)` 与 `ctx.ui.topWorkspace.register(...)`；
- Activity 必须 `openMode: "window"`；
- 独立窗口中的 ScientificPlot 依赖必须明确声明。

默认模板见 `sdk/templates/tool-plugin/`。


## SDK 1.19+ layout/legend/table guarantees

- `PluginWorkspace` owns viewport safety and records overflow/containment risks before recovering unsafe regions with scrolling.
- Multi-series `ScientificPlot` legends are Core-owned by default; Core reserves their measured/estimated footprint and exposes legend metrics. Do not add a second plugin legend unless domain semantics genuinely require one.
- `TableSurface` owns table CSS. Style the host only; use TableSurface `appearance` for supported variations. Direct internal table CSS is a validator error unless a narrow row override is declared.
