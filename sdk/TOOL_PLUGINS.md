# Tool Workspaces — Plugin API 1.15

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

```js
const workspace = ctx.ui.pluginWorkspace.create(host, {
  primaryScroll: 'contained'
});
```

CSS 高度链必须包含 `height:100%` / `min-height:0`，图形所在 grid row 使用 `minmax(0, 1fr)`。不要使用 intrinsic-height parent + `minmax(<positive px>, 1fr)` 的自增长组合。

依赖也必须由独立窗口显式声明：

- `ctx.ui.scientificPlot.create(...)` 是 Core D3 ScientificCurveSurface，声明 `"d3"`；
- `ctx.ui.scientificPlot.react(...)` / `createPlotly(...)` 声明 `"plotly"`。

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
