# AI Plugin Development Guide

This document is written specifically for future AI-assisted development.

## Prime directive

When the user asks for a new scientific function on the `plugin` branch:

> Create a plugin. Do not modify the monolithic host first.

Before coding, classify the request.

## Step 1 — classify the requested feature

### A. Data importer

Examples:
- a new instrument CSV;
- HDF5/JSON export;
- different multi-column convention.

Implement under:

```text
src/plugins/<name>/
```

Register a `data.importers` contribution.

Do not add parsing branches to `Analysis.parseFlexibleData()` unless the format is universally useful.

### B. Analysis algorithm

Examples:
- Hall analysis;
- FET mobility;
- Raman peak fitting;
- hysteresis statistics;
- endurance/retention;
- a new TER definition.

Register an `analysis.providers` contribution and a plugin page if needed.

Do not append 500 lines to `app.js`.

### C. New chart or dashboard

Create the page/UI in the plugin.
Use Plotly/D3 through the shared browser environment.
Keep data extraction and visualization separate.

Recommended structure:

```text
my-plugin/
  plugin.json
  plugin.js
  analysis.js
  view.js
  style.css
  README.md
```

The first version may concatenate these files via script entries later, but keep responsibilities separate inside the folder.

### D. UI adjustment specific to one workflow

Implement a UI plugin or add CSS in that feature plugin with:

```js
ctx.ui.styles.add(...)
```

Use:
- `.grs-size-compact`
- `.grs-size-medium`
- `.grs-size-large`
- `.grs-pointer-coarse`
- `.grs-orientation-portrait`
- `.grs-orientation-landscape`

Do not use desktop pixel coordinates as the only layout rule.

### E. Core capability

Only modify core when the request cannot be expressed by the Plugin API.

Examples:
- a generic dock manager needed by many plugins;
- a worker service;
- Android native file picker bridge;
- generic drag/gesture router.

If you extend core, also extend `docs/PLUGIN_API.md` so future plugins can consume the new capability.

## Step 2 — create a plugin from the template

Copy:

```text
src/plugins/_template
```

to:

```text
src/plugins/<new-folder>
```

Change:
- plugin id;
- name;
- version;
- entry;
- capabilities.

Then run:

```bash
npm run plugin:index
npm run plugin:validate
```

No HTML script tag should be manually added.

## Step 3 — define a stable data contract

Do not couple analysis directly to current DOM.

Bad:

```js
const x = document.querySelector('#someCoreInput').value;
```

Preferred:

```js
const settings = pluginState.settings;
const result = analyze(dataset, settings);
render(result);
```

A plugin should have:

```text
input data
→ pure analysis
→ result model
→ renderer
```

This makes later Android/web migration much easier.

## Step 4 — keep raw data and derived data distinct

Scientific plugins must preserve:
- source file identity;
- raw sample coordinates;
- processing settings;
- derived values;
- manual overrides;
- algorithm version.

Never overwrite raw samples simply to make visualization easier.

## Step 5 — persistence

If plugin state affects reproducibility, register a project slice.

Always include:

```js
{ schema: 1, ... }
```

When schema changes:

```js
restore(data) {
  if (data.schema === 1) data = migrateV1toV2(data);
}
```

Do not depend on application package version for plugin-state migration.

## Step 6 — UI and interaction

Desktop fine pointer:
- hover is allowed;
- right click is allowed;
- smaller targets are acceptable.

Touch/coarse pointer:
- no hover-only feature;
- no right-click-only feature;
- targets should be at least the platform minimum;
- use tap, long-press, drag handles, bottom sheets, explicit action menus;
- do not require modifier keys such as Ctrl for the only path to a feature.

If a desktop shortcut exists, provide a visible touch path.

## Step 7 — tests

Every new plugin should test:
1. manifest validation;
2. activation;
3. core analysis with synthetic data;
4. persistence serialize/restore;
5. compact-layout contract if it adds UI;
6. no dependency on unavailable Electron APIs in web mode.

Tests can remain in `tests.js` initially or move to a future structured test directory.

## Step 8 — documentation

Add:
- plugin README;
- formula/algorithm definition;
- meaning and units of output columns;
- edge cases;
- interaction description;
- whether result is measurement-derived, fitted, inferred, or heuristic.

## Step 9 — Git

Feature work:

```bash
git switch plugin
git switch -c feature/<plugin-id>
```

After tests:

```bash
git add src/plugins/<plugin> docs tests.js
git commit -m "plugin(<id>): add <feature>"
```

Do not commit generated `node_modules`, `dist`, or `build-info.json`.

## AI checklist before finishing

- [ ] Is this actually a plugin?
- [ ] Did I avoid changing unrelated core code?
- [ ] Does the plugin have its own manifest?
- [ ] Is project state namespaced?
- [ ] Does it work with web bridge?
- [ ] Does it have a touch path?
- [ ] Does it adapt to compact portrait and landscape?
- [ ] Are CSV/image exports owned by the plugin?
- [ ] Did I preserve scientific definitions?
- [ ] Did I run `npm run check` and `npm test`?

## Plugin Manager rules for future AI work

Do not add a second feature-specific plugin manager.

Use the existing core lifecycle API:

```js
GRSPlugins.manager.list()
GRSPlugins.manager.enable(id)
GRSPlugins.manager.disable(id)
GRSPlugins.manager.reload(id)
```

When adding a new built-in plugin, make sure its runtime `GRSPlugins.define()` manifest contains useful:
- `name`;
- `version`;
- `description`;
- `capabilities`;
- `source`;
- `order`.

These fields are displayed by the Plugin Manager.

A plugin must tolerate deactivation and later reactivation. All registrations should use tracked Plugin API methods so cleanup is automatic. Resources created outside the Plugin API must be released from the returned `deactivate()` hook.

Never delete unknown/disabled plugin namespaces from project JSON.

## v3.18 rule: use the Data Center contracts before inventing feature-specific plumbing

For a new plugin, first decide which standard contribution it provides:

```text
Importer   -> data.importers
Processor  -> ctx.workflow.processors
Analyzer   -> ctx.workflow.analyzers
Chart      -> ctx.charts
Recipe     -> ctx.workflow.recipes
```

Use `GRSData` artifacts as provider inputs/outputs.

Do not invent a private table object if `data.table` is sufficient.

Do not hand-code an ordinary settings form. Declare `parameterSchema` and use `ctx.parameters.render()`.

Do not use arbitrary JavaScript evaluation for user formulas. Use `GRSFormula`.

Do not make a new analysis page merely because two existing processors need to run in sequence. Prefer a Recipe first. Create a dedicated page when the workflow needs genuinely specialized interaction or visualization.

Every new Processor/Analyzer should document:
- input artifact kinds;
- output artifact kinds;
- parameter schema;
- units;
- provenance meaning;
- whether it mutates source data (normally it must not);
- numerical edge cases.

## Provider IDs must be globally unique

For Processor / Analyzer / Chart / Recipe and other globally addressed provider registries, never use generic IDs such as `fit`, `summary`, or `chart` in a third-party plugin. Prefer a plugin namespace:

```text
<plugin-id>.<operation>
```

Example:

```text
com.lab.raman.baseline
com.lab.raman.fit-peaks
com.lab.raman.spectrum-chart
```

The plugin host intentionally rejects duplicate provider IDs instead of silently selecting whichever plugin loaded first.


## v3.19: Never grow the global toolbar for domain features

The top application bar is now an activity shell.

When adding a top-level scientific workflow:

```js
ctx.ui.activities.add(...)
```

Then contribute its activity-scoped tools:

```js
ctx.ui.toolbar.add({ activity:'...' })
ctx.ui.mainTools.add({ activity:'...' })
```

Do not add another permanent button beside Import/Save/Update/Plugins.

When a workflow needs a different central graph, register:

```js
ctx.ui.mainViews.register(...)
```

When it needs custom inspection or summary charts:

```js
ctx.ui.inspectors.register(...)
ctx.ui.groupViews.register(...)
ctx.ui.groupCharts.register(...)
```

When an algorithm can be replaced by a stronger algorithm, define a provider interface rather than hard-code it into the workbench. The built-in robust resonance detector is the reference:
- detector algorithm = `builtin.resonance-detector-robust`;
- detector settings UI = detector provider;
- resonance workbench = generic detector selector/consumer.

See `docs/WORKSPACE_PLUGIN_API.md`.


Desktop shortcuts that are specific to a workflow belong to `ctx.ui.shortcuts.add(...)`. Do not append Raman/FET/resonance keys to the global `window.keydown` block.

Plugins that own Plotly/D3 canvases should react to `layout:resize` themselves. Do not put domain plot IDs into core resize handlers.

## Packaging a finished plugin

When a feature should be installable without rebuilding Graphene Resonance Studio, give it a non-`builtin.*` id and package it with `npm run plugin:package -- <folder> <name>.grsplugin`. Read `PLUGIN_PACKAGES.md`. For detector plugins, the Resonance Workbench must discover the provider dynamically; do not add detector-name branches to the workbench.
