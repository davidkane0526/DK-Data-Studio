# Architecture

## 1. Goal

Graphene Resonance Studio is being converted from a single-domain Electron application into a reusable scientific-data-analysis host.

The architecture deliberately separates:

```text
Generic Application Host
├─ platform/runtime abstraction
├─ plugin lifecycle
├─ project shell
├─ generic file/clipboard/export bridges
├─ generic page/panel/toolbar mounting
├─ generic responsive/touch behavior
└─ update/LAN infrastructure

Built-in Plugins
├─ flexible text import
├─ resonance workbench
├─ TER analysis
└─ pulse/read transient analysis
```

The current `plugin` branch uses a **compatibility-backed migration**: stable v3.14 domain implementations are not rewritten merely to move lines between files. Instead, the plugin kernel owns feature discovery, entry points, project slices, import providers, and extension registries; built-in plugins call the existing stable implementation through a restricted host bridge. New functionality should be written directly as plugins.

This minimizes regression risk while making the architectural boundary real.

## 2. Runtime layers

### Desktop runtime

```text
main.js
  ├─ Electron BrowserWindow
  ├─ filesystem dialogs / save
  ├─ updater
  ├─ LAN update server
  └─ LAN web server
        ↓
preload.js
        ↓
renderer
```

### Renderer host

```text
src/core/platform.js
src/core/plugin-kernel.js
src/web-bridge.js
src/app.js
```

`platform.js` describes runtime/input/screen characteristics.

`plugin-kernel.js` owns:
- plugin definitions;
- plugin loading;
- activation/deactivation;
- commands;
- contribution registries;
- toolbar/page/panel contributions;
- plugin styles;
- namespaced project-state slices;
- events.

`app.js` is currently the compatibility host for the mature v3.14 workspace.

## 3. Built-in plugin discovery

Each built-in plugin is a directory:

```text
src/plugins/<folder>/
  plugin.json
  plugin.js
  README.md
```

`scripts/generate-plugin-index.js` scans those manifests and generates:

```text
src/plugins/plugin-index.generated.js
```

Therefore a new built-in plugin does **not** require editing `index.html` or `app.js`.

The following commands regenerate the index automatically:

```text
npm start
npm test
npm run check
npm run dist
```

## 4. Current plugin ownership

### `builtin.flexible-import`

Owns the generic flexible-text importer contribution:
- inspection;
- delimiter/header/encoding options;
- multi-column parsing.

The existing import workbench resolves its parser from the plugin registry.

### `builtin.resonance-workbench`

Owns feature entry points for:
- physical-mechanism panel;
- peak spacing page;
- gate-voltage analysis page.

It also advertises resonance detector/metric providers and the resonance chart semantic theme.

The detailed mature peak editing implementation is still compatibility-backed by `app.js` / `analysis.js`.

### `builtin.ter-analysis`

Owns:
- TER_max page entry;
- TER analysis provider registration.

### `builtin.pulse-analysis`

Owns:
- pulse analysis page entry;
- pulse analysis provider;
- pulse workspace project-state slice.

Pulse project persistence is no longer a top-level core project field. New project data is stored under:

```json
{
  "plugins": {
    "builtin.pulse-analysis": {
      "workspace": {}
    }
  }
}
```

The plugin still migrates old v3.14 `pulseAnalysis` project data.

## 5. Core versus plugin decision matrix

| Concern | Core | Plugin |
|---|---:|---:|
| Electron/window/update infrastructure | yes | no |
| Browser/Android runtime bridge | yes | no |
| Plugin manager | yes | no |
| Generic project container | yes | no |
| Feature-specific project state | no | yes |
| Generic import file acquisition | yes | optionally |
| Specific importer/parser | no | yes |
| Resonance peak physics | no | yes |
| TER | no | yes |
| Pulse/read extraction | no | yes |
| New chart family | host primitive only | yes |
| New analysis page | mounting API only | yes |
| Layout variant for a workflow | layout API | yes |
| Touch/accessibility primitives | yes | plugins consume |

## 6. Project file contract

Core project data remains backward-compatible. Plugin data is namespaced by plugin id.

Plugins must never place unnamespaced fields at root.

Recommended plugin state:

```json
{
  "plugins": {
    "com.example.my-analysis": {
      "settings": {
        "schema": 2,
        "threshold": 0.3
      }
    }
  }
}
```

Every persistent plugin should carry its own schema number and migrate old schemas in `restore()`.

## 7. No direct cross-plugin internals

One plugin must not call variables inside another plugin.

Allowed communication:
- registered contributions;
- commands;
- host services;
- event bus;
- documented shared data model.

Disallowed:
- `window.SomeOtherPluginPrivateObject`;
- DOM scraping another plugin's private implementation;
- modifying another plugin's saved state directly.

## 8. Migration map from the v3.14 monolith

The plugin branch intentionally distinguishes three statuses.

### Already host-level

- Electron/preload/browser bridge;
- update infrastructure;
- LAN web infrastructure;
- project tab shell;
- common panel mechanics;
- platform/input profile;
- plugin lifecycle.

### Plugin-fronted, compatibility-backed implementation

- resonance peak workflow;
- gate analysis;
- spacing;
- TER;
- pulse analysis.

The feature is enabled/discovered through plugins, but mature implementation functions still live in the compatibility host.

### Future extraction targets

Move implementation into plugin folders when modifying those areas substantially:
1. pulse workspace renderer;
2. TER page renderer;
3. gate-analysis renderer;
4. resonance trend rendering;
5. peak detection/editing model;
6. flexible import UI.

Do extraction feature-by-feature. Do not perform a blind rewrite of the entire app.
