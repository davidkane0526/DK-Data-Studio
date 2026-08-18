# DK Data Studio SUPER / TOP / PRIME / SUB 工作区契约（v3.23）

本契约规定插件的**界面角色与组合方式**，不规定插件具体做什么科学计算。

## 1. 角色

- **SUPER**：当前主界面宿主角色。同一时刻只能有一个，由用户在“软件管理 → 插件管理”中显式选择。
- **TOP**：可独立运行、也可被提升为 SUPER 的一级工作区插件。
- **PRIME**：TOP 的可选增强界面。允许声明 `float / right / bottom` 放置方式，可组合、停靠或浮动。
- **SUB**：拥有自己界面的功能页/工具页，点击后显示自己的页面，不改变 SUPER 身份。

SUPER 不是独立插件类型，而是某个满足 TOP 契约的插件在当前设备上的**唯一主界面选择**。

## 2. 不变量

1. SUPER 必须同时满足：插件已启用、已激活、`workspace.role = top`、TOP 工作区契约完整。
2. 当前 SUPER 不能直接停用或卸载。必须先显式选择另一个 TOP 为 SUPER。
3. 已保存的 SUPER 缺失、损坏或不可用时，主窗口进入“尚未指定主界面”，**绝不自动选择下一个 TOP**。
4. 仅从旧版首次迁移、且本机从未保存 SUPER 选择时，允许把 `builtin.resonance-workbench` 作为一次性初始 SUPER。
5. SUPER 选择属于本机 UI 偏好，不写入工程文件，避免打开工程时擅自改变用户主界面。
6. 非 SUPER 的 TOP 继续作为独立窗口工作，并遵守统一 `manifest.window` 预热、隐藏复用和持久化策略。
7. 当前 SUPER 不参与独立窗口预热，避免同一插件同时存在主窗口副本和后台预热副本。

## 3. TOP manifest

```json
{
  "workspace": {
    "role": "top",
    "activity": "example",
    "icon": "E",
    "title": "Example"
  },
  "window": {
    "activity": "example",
    "prewarm": true,
    "reuse": true,
    "persistence": "project"
  }
}
```

TOP 必须同时注册一级 Activity 与 TOP 工作区。

## 4. TOP 工作区布局

推荐 `split` 模式：

```js
ctx.ui.topWorkspace.register({
  id: 'example',
  activity: 'example',
  label: 'Example',
  icon: 'E',
  layout: {
    mode: 'split',
    root: { selector: '.example-workspace' },
    left: {
      role: 'data-display',
      selector: '.example-data-panel',
      defaultFraction: 0.20,
      minFraction: 0.14,
      maxFraction: 0.42,
      sticky: true
    },
    main: {
      role: 'primary-data',
      selector: '.example-main-canvas',
      interaction: 'plugin-owned'
    }
  }
});
```

`split` 模式由核心只按语义槽位组合：

```text
┌────── 可调 LEFT ──────┬──────────── MAIN ────────────┐
│ 数据 / 列表 / 显示控制 │ 主图 / 主数据操作 / 鼠标交互   │
│                       │ PRIME 可停靠 / 浮动 / 组合      │
└───────────────────────┴───────────────────────────────┘
```

核心**不得识别插件名称或页面 ID**。插件通过 `root / left / main` 选择器声明自己的 DOM 槽位。

### layout 字段

- `mode: 'split'`：由通用 SUPER 组合器形成左右布局。
- `mode: 'native'`：插件/宿主本身已经符合 SUPER 左右骨架，仅使用统一宽度与角色状态；当前共振主工作区采用此模式。
- `root.selector`：`split` 布局根容器。
- `left.selector / left.selectors / left.mount`：左侧必需区域，可声明多个 selector。
- `main.selector / main.selectors / main.mount`：主区域必需区域。
- `flatten`：需要使用 `display: contents` 展开的中间包装层 selector 列表。
- `left.sticky`：左槽可在滚动时保持可见。
- `left.spanRows`：左槽跨越主区域多行，适合文件列表类侧栏。
- `left.stack`：将左槽内容按纵向堆叠，适合参数/显示控制。
- `defaultFraction / minFraction / maxFraction`：SUPER 左区默认、最小、最大宽度比例。

如果 TOP 没有同时声明有效的 `left` 与 `main`，插件管理器会显示“TOP 契约缺失”，该插件不能被提升为 SUPER。

## 5. PRIME

PRIME 是 TOP 的增强能力，不改变 TOP 的必需 LEFT/MAIN 骨架。核心提供统一 placement manager；插件只声明自己真正支持的位置，不允许“声明能停靠、实际没有实现”。

带自定义 adapter 的 PRIME：

```js
ctx.ui.prime.register('curve-inspector', {
  activity: 'example',
  label: '曲线检查',
  placements: ['right', 'float'],
  defaultPlacement: 'right',
  getPlacement: () => panelState.mode,
  place: placement => setPanelPlacement(placement)
});

await ctx.ui.prime.place('curve-inspector', 'float');
const current = ctx.ui.prime.placement('curve-inspector');
```

若 PRIME 根节点可以安全地在宿主之间 re-parent，可使用通用 portable 模式，无需自己实现 placement adapter：

```js
ctx.ui.prime.register('statistics', {
  activity: 'example',
  label: '统计面板',
  target: '#statisticsPanel',
  portable: true,
  placements: ['right', 'bottom', 'float'],
  defaultPlacement: 'right'
});
```

允许的语义位置只有：

- `float`：主界面浮动层；
- `right`：MAIN 右侧 PRIME dock；
- `bottom`：MAIN 下方 PRIME dock。

核心 API：

```js
DKDSPlugins.workspace.placePrime(pluginId, primeId, placement);
DKDSPlugins.workspace.primePlacement(pluginId, primeId);
```

默认情况下 PRIME placement 属于本机 UI 偏好并自动记忆；插件已有自己的工程级布局状态时，可以声明 `persistPlacement:false`，并用 `getPlacement/place` adapter 保持原有工程语义。只有当前 SUPER 的 PRIME 可以写入主窗口 dock，避免非 SUPER TOP 越权修改主界面。切换 SUPER 时，旧 SUPER 的 portable PRIME 会恢复原 DOM 位置。

当前共振实现作为两个 adapter 示例：

- 曲线检查：`right / float`；
- 组图分析：`bottom / float`。

这三个语义位置以后可以继续扩展组合策略，而无需改变 TOP/SUPER 状态机。

## 6. SUB

```js
ctx.ui.sub.register('physics', {
  activity: 'example',
  label: '物理机制',
  target: 'physicsPanel',
  display: 'panel'
});
```

SUB 自己拥有界面生命周期。打开 SUB 时只是暂时覆盖/显示工具页；关闭后回到当前 SUPER，不会把其他 TOP 自动变成主界面。

## 7. 独立窗口

非 SUPER TOP 统一依赖 `manifest.window`：

- `prewarm` 默认 `true`
- `reuse` 默认 `true`
- `persistence` 默认 `project`
- 关闭默认隐藏并复用 renderer/DOM/Plotly/内存状态
- restart-safe 结果使用 `ctx.project.registerSlice(...)` 和 artifact store

若插件必须依赖完整主 Renderer，可声明：

```json
"mode": "compatibility"
```

否则使用默认 `dedicated`。两种模式共享同一套 manifest 驱动的预热/隐藏复用生命周期，不允许再为插件名称写白名单。

## 8. 插件管理器

TOP 卡片的插件图标同时是 SUPER 选择器：

- 未选：TOP
- 选中：TOP + SUPER，图标出现主界面标记
- TOP 契约缺失：不能选择为 SUPER
- 当前 SUPER：启停开关锁定，并提示先选择另一个 TOP

## 9. 回归守卫

`node scripts/test-super-workspace.js` 必须覆盖：

- SUPER 唯一选择及本机持久化
- 禁止直接停用当前 SUPER
- 无效保存值不 fallback
- 不完整 TOP 禁止提升
- 非 SUPER TOP 走独立窗口
- PRIME placement 校验
- 核心 SUPER CSS 不出现内置 TOP 插件名称
- SUPER 预热排除
- 顶部统一按钮高度与无蓝色下描边

该测试已加入 `npm test` 和 `npm run check`。
