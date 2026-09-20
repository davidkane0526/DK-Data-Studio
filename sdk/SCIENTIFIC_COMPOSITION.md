# Scientific Composition — SDK 1.49.0

SDK 1.49 keeps Plugin API 1.19.0 and formalizes scientific composition **from the already accepted DK Data Studio workbench UI**. The contract is not a visual redesign. When an existing current-contract surface is migrated to the new semantic primitives, its DOM hierarchy, chrome, placement behavior, spacing, radius and Theme appearance must remain unchanged unless the plugin explicitly asks for a different presentation.

The built-in 3.70.5-era Resonance / TER / Pulse / Data Center presentation is the reference template for this SDK layer. A semantic migration that changes those accepted visuals is a contract regression.

## Visual-preservation rule

SDK 1.49 semantic markers such as `scientific-card`, `plot-group`, `ScientificSection`, `contentInset` and PRIME header metadata do **not** create a second visual owner.

- Existing accepted cards keep their existing canonical classes and DOM.
- `surface:'scientific-card'` identifies a card; it does not apply a new `.dkds-scientific-card` paint layer.
- `PlotGroup.adoptPlot(...)` adds ownership/PlotView semantics without restyling or rebuilding the card.
- A newly created ScientificCard uses the established `analysis-chart-card / analysis-chart-title / analysis-chart` visual template.
- Existing PRIME headers default to **adopt** mode. Core only generates a new header when the plugin explicitly requests generated chrome/header.
- `contentInset` is opt-in. Omitting it preserves the existing content geometry.

## PRIME rules

`presentationRole` describes meaning, not Desktop docking.

### data-control

`presentationRole:'data-control'` means a data/parameter control surface. It does **not** imply that the Desktop surface is fixed.

By default, data-control placement chrome is host-managed (`placementControl:'host'`) so accepted workbenches keep their existing behavior:

- Resonance may remain `placements:['left']` with `chrome:false`.
- TER / Pulse / Data Center may retain `['left','global','right','bottom']` where that is their accepted behavior.

Use `fixed:true` only when the plugin intentionally declares a one-placement PRIME. `fixed:true` with multiple placements is invalid.

```js
workbench.registerPrime({
  id:'parameters',
  presentationRole:'data-control',
  existingNode:parameterNode,
  placements:['left','global','right','bottom'],
  defaultPlacement:'left',
  placementControl:'host'
});
```

### Surface-controlled movable PRIME

For inspectors and scientific-secondary surfaces whose placement controls live in the surface header (`placementControl:'surface'`), a movable `existingNode` PRIME must use one of these forms:

1. explicit `handle` + `controlsHost`, adopting the existing accepted header; or
2. `chrome:'auto'`, explicitly asking Core to create a wrapper/header.

Core does not guess arbitrary section/chart titles for **surface-controlled** movable PRIME surfaces. The historical handle discovery remains available only to host-managed data-control surfaces so migration does not alter accepted behavior.

A Core-created/generated header may declare `header.title`, `header.meta`, `header.actions`, and `header.controls`. Existing-node PRIME defaults to `header.mode:'adopt'`; adopt mode never injects replacement title/column/close UI into an already accepted header.

`contentInset` accepts `none | compact | standard | comfortable`, but has no role-based default. Omit it to preserve the existing geometry.

## ScientificSection

`ctx.ui.sections.create(...)` provides semantic normal-flow ownership for workflow, primary plot, group, result, warning or controls blocks. It does not impose new workspace padding/gap/radius styling. If a title is requested, the generated title consumes the existing `analysis-section-title` visual language.

Plugins must not use negative offsets to make one scientific section overlap another.

## ScientificCard / PlotView

`surface:'scientific-card'` is a semantic contract over the existing PlotView/card system.

```js
const view = ctx.ui.plotViews.create('main-iv', host, {
  title:'I–V 实验 / 模型',
  surface:'scientific-card',
  portable:true,
  placements:['home','left','right','bottom','float','global'],
  render(plotHost) { /* render scientific content */ }
});
```

When Core creates the card, it uses the established visual structure:

```text
analysis-chart-card dkds-surface
├─ analysis-chart-title
└─ analysis-chart dkds-scientific-chart-host
```

When Core binds/adopts an existing card, it must not add a new visual class or overwrite the existing card/header paint. Plugins still must not create a competing paint owner for canonical PlotView chrome.

## PlotGroup

`ctx.ui.plotGroups.create(...)` adds composition/ownership validation over the established GroupArea + PlotView system:

```text
GroupArea → accepted card → PlotView → ScientificPlot host
```

For existing built-ins, prefer `adoptPlot(...)`: it binds the already accepted card in place and preserves child order, title chrome, actions, spacing and Theme presentation.

```js
const group = ctx.ui.plotGroups.create(host, {
  preferredColumns:3,
  maxColumns:6,
  minItemWidth:260,
  responsive:true
});

group.adoptPlot('metric', existingCard, {
  plot: existingPlot,
  header: '.existing-header',
  actionsHost: '.existing-actions'
});
```

Group spacing remains the established Managed Grid contract. The Core default is `--dkds-grid-gap: 10px`, while an accepted plugin may request another value through the existing public `--dkds-grid-gap` configuration token. For example, the reference Resonance group remains 12 px and TER remains 14 px. SDK 1.49 does not normalize those values to a new density-derived gap.

Do not write raw `gap / row-gap / column-gap` onto Core `dkds-group-area-grid`/`dkds-plot-group` semantic owners. Use the established Managed Grid configuration token or existing plugin group wrapper where appropriate.

`density` remains semantic metadata and must not silently restyle an already existing/adopted group.

## SDK 1.50 relationship

SDK 1.50 adds `ctx.ui.unitTemplates` above these lower-level primitives. Unit Templates are the strict, composable design-system contract; this SDK 1.49 Scientific Composition layer remains the lower-level semantic infrastructure. `accepted-scientific-v1` is therefore an optional example preset, not the canonical shape every plugin must use. See `UNIT_TEMPLATES.md`.

## ScientificWorkbench

`ctx.ui.scientificWorkbench.create(...)` is a declarative helper over the same accepted Workspace/PRIME/PlotView components. It is not a second theme or layout system. `workspaceSurface` remains the lower-level current API; there is no legacy adapter or old/new rendering path.


### `accepted-scientific-v1`：非领域 reference profile

当第三方插件需要与当前已验收的复杂科学工作台采用**同一套面板布局与细节**，而不复制任何内置插件私有 CSS/DOM 时，可以直接使用公开 profile：

```js
const wb = ctx.ui.scientificWorkbench.create(root, {
  id:'my-workbench',
  activity:'my-workbench',
  profile:'accepted-scientific-v1',
  primary:{
    id:'main',
    template:'analysis-main',
    tools:mainToolButtons,
    legend:legendItems,
    content:myPlotContent,
    status:'数据 8 · 可见 6'
  },
  primes:[
    {
      id:'parameters',
      template:'data-control',
      presentationRole:'data-control',
      content:parameterContent,
      fixed:true,
      placements:['left']
    },
    {
      id:'inspector',
      template:'inspector',
      title:'曲线检查器',
      presentationRole:'inspector',
      content:inspectorContent,
      placements:['float','global','left','right','bottom']
    },
    {
      id:'group',
      template:'plot-group',
      title:'组图面板',
      meta:'当前可见数据：6 条扫描',
      presentationRole:'scientific-secondary',
      placements:['float','global','left','right','bottom'],
      group:{columns:3,maxColumns:6,minItemWidth:290,responsive:true},
      plots:plotSpecs
    }
  ]
});
```

这个 profile 不是 Resonance 特判，也不引用 `respar-* / reswin-*`。它把已验收复杂科学工作台中**可复用的布局/chrome 几何**抽成 Core 公共模板，包括：

- Workspace：`leftWidth=280`、`leftMin=230`、canvas left/right/bottom=`360/390/360`；
- 主图 floating chrome：高度 `34px`，正常宽度偏移 `left 82 / right 18 / top 8`；
- Inspector：`390×560`，`right 24 / top 56`；
- Group panel：高度 `620`，`right 24 / bottom 44`，最大参考宽度 `880`；
- PRIME body inset：`10px`；
- group gap：`12px`；
- Group PRIME 默认生成与已验收模板一致的“每行：N”菜单（自动排列 / 每行 1..N）、折叠、关闭和位置 chrome；
- Inspector 不生成无意义的空 action host，因此关闭按钮间距与已验收模板一致；
- group child floating/docked/global 最小几何沿用已验收 PlotView 规则；
- `<=1050px` 与 `<=980px` 的主图标题栏响应式偏移沿用已验收规则。

插件仍然只负责自己的领域内容、参数、图形绘制和动作。Theme、PortableView、Action、Material、GroupArea、PlotView 的最终外观仍由 Core 现有组件系统提供。

仓库内的 `examples/sdk149-reference-workbench/` 是可执行证明：它没有私有 CSS，也没有任何 Resonance 私有 class，仅使用公开 SDK 1.49 API。`test-sdk149-reference-plugin-parity.js` 会逐项比较其公共 profile 与已验收模板的关键结构/几何；如果未来 SDK 改动使二者不再等价，`npm test` 和 `npm run check` 都会失败。

## Activity-scoped contributions

Toolbar and menu contributions from workbench/tool plugins default to activity scope. Non-active activity commands are projected out and restored exactly once on reactivation. This changes visibility ownership only; it must not alter component appearance.

## Validation commands

```bash
node sdk/tools/dkds-plugin.js validate path/to/plugin
node sdk/tools/dkds-plugin.js test-runtime path/to/plugin
node sdk/tools/dkds-plugin.js test-layout path/to/plugin
node sdk/tools/dkds-plugin.js package path/to/plugin output.dkplugin
```

`test-layout` verifies bounded composition geometry. It is not a replacement for visual-template parity. `test-sdk149-visual-template-parity.js` separately guards the accepted built-in DOM/style behavior so semantic SDK changes cannot silently become visual changes.

## Reference implementations

- `resonance-workbench`: accepted complex workbench; fixed Resonance data-control, movable adopted inspector/group headers, 12 px group gap.
- `ter-analysis`: accepted movable data-control + PlotGroup/PlotViews, 14 px group gap.
- `pulse-analysis`: accepted host-managed/chrome-less data-control + scientific PlotViews.
- `data-center`: accepted data-centric layout; only actual scientific preview consumes PlotView semantics.

These references define the SDK composition template. They are not Core plugin-id exceptions.

## Composition lint / layout gate

Current gates validate PRIME presentation roles, explicit fixed-vs-movable intent, surface-controlled canonical chrome, PlotView/PlotGroup ownership, responsive-height rules, duplicate semantic ownership and section flow. They deliberately do **not** force all plugins into one new visual density or placement pattern.

The layout harness exercises 64 synthetic Surface combinations (8 combinations × 4 Desktop sizes + 8 combinations × 4 Mobile sizes) for overlap/clipping/escape safety. Synthetic harness numbers are test geometry only and are not design tokens for production UI.

The same current-contract gate set is required in both `npm test` and `npm run check`.
