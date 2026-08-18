# Plugin API v1.3

Global runtime:

```js
window.DKDSPlugins
```

A plugin registers itself with:

```js
DKDSPlugins.define(manifest, async ctx => {
  // activate
  return {
    deactivate() {}
  };
});
```

## Manifest

`plugin.json`:

```json
{
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "0.1.0",
  "apiVersion": "1.3.0",
  "entry": "plugin.js",
  "enabled": true,
  "order": 300,
  "description": "Example",
  "capabilities": ["ui.page", "analysis.custom"]
}
```

Plugin ids are permanent. Do not rename an id after project files have stored state under it.


## Workspace UI API v1.3

Activity-scoped keyboard behavior must use `ctx.ui.shortcuts.add(...)`; plugins should listen to the generic `layout:resize` event to resize their own canvases. Core must not know domain shortcut keys or domain plot IDs.

For full scientific-workspace customization, read:

```text
docs/WORKSPACE_PLUGIN_API.md
```

v1.3 keeps the v1.x API additive and adds first-class selection menus plus desktop auxiliary-activity windows. Workspace contributions include:

```text
ui.activities
ui.sidebar
ui.mainViews
ui.selectionMenus
ui.mainOverlays
ui.mainTools
ui.inspectors
ui.groupViews
ui.groupCharts
ui.pages
ui.panels
ui.statusBar
peak.detectors
```

This is the preferred route for scientific UI. A feature plugin should own its activity, sidebar, main-view contract, inspector, group charts and domain pages rather than append permanent controls to the global shell.


## `ctx.host`

The host bridge exposes stable host functions.

Stable host services include:

```js
ctx.host.setStatus(text)
ctx.host.renderAll()
ctx.host.scheduleMainPlotRelayout()
ctx.host.openAnalysisPage(pageId)
ctx.host.closeAnalysisPage(pageId)
ctx.host.copyTextToClipboard(text, label)
ctx.host.savePlotlyImage(plotId, baseName, format)
ctx.host.getState()
ctx.host.platform
ctx.host.isAuxiliaryWindow
ctx.host.openActivityWindow(activityId)
ctx.host.closeCurrentWindow()
```

The current built-in workbench also exposes shared renderer controllers (`renderSpacingPage`, `renderGateAnalysis`, `renderTerMaxPage`, `renderPulseAnalysis`, `togglePhysicsPanel`). These are presentation/workspace services, not scientific algorithms. New unrelated plugins should create their own page/view rather than call them.

For a top-level activity that should open in a dedicated desktop window, prefer the declarative activity contract rather than calling the host directly:

```js
ctx.ui.activities.add({
  id: 'my-analysis',
  label: '数据分析',
  openMode: 'window',
  onActivate: () => ctx.host.openAnalysisPage('my-page')
});
```

The shell opens the auxiliary Electron window from the main renderer and activates the same plugin in that window. Project snapshots are synchronized back to the owning project tab when the auxiliary activity changes data or closes.

## Shared scientific engine

Reusable mature calculations are exposed through:

```js
window.DKDSScience
```

Examples:

```js
DKDSScience.detectPeaks(...)
DKDSScience.solvePeakTracks(...)
DKDSScience.analyzePhysicalFamilies(...)
DKDSScience.pairGateSeries(...)
DKDSScience.computeTerMatrix(...)
DKDSScience.analyzePulseReadData(...)
```

Plugins should consume this shared engine instead of copying an algorithm. If a new pure calculation is useful across workflows/runtimes, add a tested module under `src/science/`.

## Commands

Register:

```js
ctx.commands.register('com.example.do-analysis', async ({ datasetId }) => {
  // ...
});
```

Run:

```js
await ctx.commands.run('com.example.do-analysis', { datasetId });
```

Commands are useful for:
- toolbar buttons;
- keyboard maps;
- context menus;
- automation;
- cross-plugin integration without importing private code.

## Toolbar contribution

```js
ctx.ui.toolbar.add({
  id: 'myToolbarButton',
  group: 'analysis',
  label: 'My Analysis',
  title: 'Open my analysis',
  order: 300,
  className: 'accent-soft',
  onClick: () => {}
});
```

Do not add a feature button directly to `index.html`.

## Bottom status-bar contribution

The global bottom status bar is a shared shell surface. Plugins may contribute nothing, or add compact status items without editing `index.html`:

```js
const item = ctx.ui.statusBar.add({
  id: 'connection',
  side: 'right',          // `left` or `right`
  order: 200,
  icon: '◉',
  label: '已连接',
  title: '打开连接面板',
  state: 'ok',            // `ok`, `warn`, `error`, `info` or empty
  onClick: () => openPanel()
});

item.update({ label: '断开', state: 'warn' });
item.remove();
```

Status contributions are lifecycle-owned by the registering plugin and are removed automatically when that plugin is deactivated. Keep them compact and status-oriented; full configuration UI belongs in a panel/page. The built-in `builtin.status-monitor` is the reference implementation for runtime memory and LAN Web state.

## Analysis page contribution

A plugin can mount an existing page:

```js
ctx.ui.pages.add({
  id: 'my-page',
  pageId: 'myExistingPage',
  label: 'My Page',
  order: 300,
  onOpen: () => render()
});
```

Or create a page entirely from the plugin:

```js
ctx.ui.pages.add({
  id: 'my-page',
  label: 'My Page',
  order: 300,
  html: `
    <div class="analysis-page-header">...</div>
    <div class="analysis-page-body">...</div>
  `,
  onOpen: ({ page }) => render(page)
});
```

A page can ship its own DOM and CSS from the plugin.

## Panel contribution

For an existing panel:

```js
ctx.ui.panels.addToggle({
  id: 'my-panel',
  panelId: 'myPanel',
  label: 'My Panel',
  order: 250,
  toggle: ({ panel }) => panel.classList.toggle('hidden')
});
```

For new UI, a plugin can create its own element and then use a toolbar command; dynamic-panel factory helpers can be added to the host without changing domain plugins.

## Plugin CSS / UI adjustment plugin

UI-only plugins are supported:

```js
ctx.ui.styles.add('compact-card-layout', `
  .analysis-chart-card {
    border-radius: 14px;
  }

  .dkds-size-compact .my-plugin-grid {
    grid-template-columns: 1fr;
  }
`);
```

This is the preferred mechanism for feature-specific visual changes.

A global visual/accessibility change belongs in core only when every plugin should inherit it.

## Registry contributions

Register any typed extension:

```js
ctx.registry.add('analysis.providers', 'my-analysis', {
  id: 'my-analysis',
  analyze(dataset, settings) {}
});
```

Read contributions:

```js
const providers = DKDSPlugins.registry.values('analysis.providers');
```

Important registry kinds include:
- `data.importers`
- `analysis.providers`
- `peak.detectors`
- `workflow.processors`
- `workflow.analyzers`
- `workflow.recipes`
- `charts.renderers`
- `ui.activities`
- `ui.inspectors`
- `ui.mainViews`
- `ui.selectionMenus`
- `ui.groupViews`
- `ui.groupCharts`

DOM-mounted sidebar/toolbar/menu/overlay contributions and typed `ui.selectionMenus` are lifecycle-tracked by the same plugin kernel.

New kinds are allowed when the contract is documented.

Prefer a reusable generic kind instead of a feature-name-specific registry.

## Project state

```js
ctx.project.registerSlice('settings', {
  serialize() {
    return {
      schema: 1,
      threshold: state.threshold
    };
  },

  restore(data, { legacyProject }) {
    if (!data) return;
    // migrate schema if needed
  },

  reset() {}
});
```

Saved state is automatically namespaced:

```json
{
  "plugins": {
    "com.example.my-plugin": {
      "settings": {}
    }
  }
}
```

## Events

```js
const unsubscribe = ctx.events.on('project:restored', payload => {});
ctx.events.emit('my-plugin:analysis-complete', result);
```

Listeners registered through `ctx.events.on()` are automatically tracked for plugin cleanup.

Core events currently include:
- `plugins:ready`
- `plugin:activated`
- `plugin:deactivated`
- `project:restored`
- `analysis:opened`
- `analysis:closed`
- `app:ready`

## Platform profile

```js
const p = ctx.platform.profile;

p.runtime      // electron | web
p.size         // compact | medium | large
p.orientation  // portrait | landscape
p.pointer      // coarse | fine
p.touch
p.android
p.interaction.targetMinPx
p.interaction.curveHitPx
p.interaction.nearestCurvePx
p.interaction.peakHitRadiusPx
```

Listen for changes:

```js
ctx.platform.onChange(profile => {
  // reflow plugin UI
});
```

## Deactivation

If the plugin creates resources outside the tracked APIs, return cleanup:

```js
return {
  deactivate() {
    observer.disconnect();
    worker.terminate();
  }
};
```

Do not leave window listeners, timers, workers, or DOM nodes alive after deactivation.

## Plugin Manager lifecycle API

The core Plugin Manager is available through:

```js
DKDSPlugins.manager
```

Read current plugin states:

```js
const rows = DKDSPlugins.manager.list();
const one = DKDSPlugins.manager.get('com.example.plugin');
```

Each state includes:

```text
id / name / version / apiVersion
enabled      desired persistent state
active       currently activated in this runtime
status       active | disabled | available | error
error
capabilities
contributionCounts
preference   undefined = manifest default, boolean = user override
```

Lifecycle operations:

```js
await DKDSPlugins.manager.enable(id);
await DKDSPlugins.manager.disable(id);
await DKDSPlugins.manager.reload(id);
await DKDSPlugins.manager.setEnabled(id, boolean);
await DKDSPlugins.manager.resetPreferences();
```

Enable/disable preferences are stored locally by the host under:

```text
dkds.plugin.preferences.v1
```

They are intentionally not project state.

### State safety during disable/reload

Before an active plugin is deactivated, the host captures the active project tab. Its registered project slices are serialized before cleanup.

When it is enabled again, the plugin activates first, registers its slices again, and the manager restores the current project's saved namespace.

Core project serialization merges active plugin slices into previously preserved plugin blobs. This means a disabled, missing, or temporarily failing plugin does not lose its saved project data merely because its slice is not active at save time.

### Activation failure rollback

If a plugin throws during `activate()`, every contribution already registered during that partial activation is rolled back before the plugin enters `error` state. This makes Retry/Reload safe from duplicated commands, styles, registry rows, and toolbar buttons.

# Plugin API v1.1 additions — Data Center foundation

v1.1 is additive. Plugins declaring any `1.x` API remain loadable.

## Standard data model

```js
ctx.data.model        // DKDSData
ctx.data.formula      // DKDSFormula
ctx.data.artifacts.list()
ctx.data.artifacts.get(id)
ctx.data.artifacts.add(artifact)
ctx.data.artifacts.upsert(artifact)
ctx.data.artifacts.remove(id)
ctx.data.artifacts.syncLegacy()
```

## Processor

```js
ctx.workflow.processors.register('my.processor', {
  name:'My Processor',
  inputKinds:['data.table'],
  outputKinds:['data.table'],
  parameterSchema:{ fields:[...] },
  run({ inputs, parameters, context, signal, execution }) {
    return outputArtifact;
  }
});
```

## Analyzer

```js
ctx.workflow.analyzers.register('my.analyzer', {
  name:'My Analyzer',
  inputKinds:['data.table'],
  outputKinds:['result.analysis'],
  parameterSchema:{ fields:[...] },
  run({ inputs, parameters }) {
    return DKDSData.createAnalysisResult(...);
  }
});
```

## Chart provider

```js
ctx.charts.register('my.chart', {
  name:'My Chart',
  inputKinds:['data.table'],
  parameterSchema:{ fields:[...] },
  render({ container, artifact, parameters }) {}
});
```

## Recipe

```js
ctx.workflow.recipes.register('my.recipe', recipeDefinition);
```

## Schema UI

```js
const panel=ctx.parameters.render(container, provider.parameterSchema, {
  value:settings,
  context:{table},
  onChange(next,validation){}
});
```

## Workflow execution

```js
const result=await ctx.workflow.run(recipe, {
  inputs:{main:table},
  parameters:{...}
});
```

See the dedicated Data Center documentation for the complete contracts.

### Provider / Recipe ID uniqueness

The following registries are globally addressed and therefore require an ID that is unique across all enabled plugins:

```text
workflow.processors
workflow.analyzers
workflow.recipes
charts.renderers
data.importers
analysis.providers
```

Use a stable namespace for third-party plugins, for example:

```js
ctx.workflow.processors.register('com.example.raman.baseline', { ... });
ctx.workflow.analyzers.register('com.example.raman.fit-peaks', { ... });
ctx.charts.register('com.example.raman.spectrum', { ... });
```

The host rejects a second plugin that tries to claim an already registered globally addressed ID. This prevents Recipe/provider resolution from depending on plugin load order.

## Installable package distribution

Plugin API v1.3 can be distributed as desktop `.dkplugin` packages. See `PLUGIN_PACKAGES.md`. External packages use exactly the same contribution APIs as built-ins; a packaged detector, activity, inspector, group-chart set, or workflow should not require a core source modification.

## Dedicated plugin windows

A plugin can opt into a dedicated Electron window with `manifest.window`. The host discovers these manifests dynamically; core code must not maintain an activity-name whitelist.

```json
{
  "id": "builtin.example-analysis",
  "name": "Example Analysis",
  "entry": "plugin.js",
  "window": {
    "activity": "example-analysis",
    "title": "示例分析",
    "prewarm": true,
    "reuse": true,
    "persistence": "project",
    "runtime": "window-runtime.js",
    "scripts": ["private-engine.js"],
    "dependencies": ["plotly", "platform", "plugin-kernel"]
  }
}
```

Lifecycle defaults are deliberately useful for analysis workspaces:

- `prewarm`: defaults to `true`. Enabled dedicated activities are created in the background after the current project is mounted.
- `reuse`: defaults to `true`. Closing the native window hides it; reopening reuses the same renderer, DOM, Plotly instances and in-memory state.
- `persistence`: defaults to `project`. Supported values are `project`, `memory`, and `none`.
- `scripts`: optional plugin-local support files loaded before `runtime`/`entry`. This allows a new independent analysis to carry its own implementation without adding private modules to the host dependency allowlist. For `.dkplugin` packages, `scripts`, `runtime`, package scripts and styles are all loaded from the installed package into the dedicated renderer.
- `dependencies`: shared host modules only. Private plugin implementation should normally use `scripts`.

An activity registered with `openMode:'window'` defaults to first-level navigation (`primary:true`) unless the plugin explicitly sets `primary:false`.

### Result persistence contract

`persistence:'project'` does not attempt to serialize arbitrary JavaScript closures. Reproducible state must use the normal plugin project contract:

```js
ctx.project.registerSlice('workspace', {
  serialize: () => ({ settings, result }),
  restore: data => { /* restore cached result without recomputing */ },
  reset: () => { /* reset plugin state */ }
});
```

Large or reusable data products should be stored through `ctx.data.artifacts`. Dedicated windows send only their owning plugin namespace plus incremental artifact upserts/removals back to the main project. They do **not** replace the whole project snapshot. This prevents two simultaneously prewarmed windows from overwriting one another with stale copies of the project.

For old project formats, `restore(data, { legacyProject })` may migrate previous root-level fields into the namespaced slice. TER analysis uses this migration pattern.

### Host guarantees

For every enabled built-in **or installed `.dkplugin`** with `manifest.window` and a registered `openMode:'window'` activity, the desktop host provides the same generic behavior:

1. manifest discovery and validation;
2. optional prewarm;
3. first visible show only after the plugin reports ready;
4. hide/reuse on normal close when `reuse` is enabled;
5. final snapshot flush before hide;
6. namespaced project-state merge;
7. incremental artifact merge;
8. cached-window disposal when the plugin is disabled or its project tab is closed.

Regression coverage lives in `scripts/test-plugin-windows.js`, including both a synthetic future built-in plugin and an installed external `.dkplugin` fixture. New independent plugins must not require edits to `main.js` or `src/app.js` merely to participate in this lifecycle. External package updates carry an installation revision; cached windows using an older revision are destroyed and recreated before reuse.
