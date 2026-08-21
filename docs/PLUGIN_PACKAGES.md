# Installable Plugin Packages (`.dkplugin`)

## Purpose

The `plugin` branch supports installable desktop plugins so a new algorithm or scientific workflow does not require rebuilding the application.

A package is a text-only JSON container with the extension `.dkplugin`.

```text
DK Data Studio desktop
        ↓ Plugin Manager → Install Plugin
<userData>/plugins/<plugin-id>.dkplugin
        ↓
Plugin Kernel
        ↓
commands / activities / UI / detectors / workflows / charts
```

This mechanism is intentionally separate from built-in plugins. External plugins **cannot** use the reserved `builtin.*` namespace and cannot overwrite a built-in plugin.

## Package format

Schema version 1:

```json
{
  "schema": 1,
  "manifest": {
    "id": "com.example.strong-detector",
    "name": "Strong Detector",
    "version": "1.0.0",
    "apiVersion": "1.10.0",
    "entry": "plugin.js",
    "scripts": ["plugin.js"],
    "styles": ["style.css"],
    "enabled": true,
    "requiresCore": ["analysis.algorithms", "analysis.detectors"],
  "capabilities": ["analysis.peak-detector"]
  },
  "files": {
    "plugin.js": "...JavaScript source...",
    "style.css": "...CSS source..."
  }
}
```

Limits are enforced before installation:

- package id must be valid and cannot start with `builtin.`;
- all paths must be relative and cannot traverse outside the package;
- JavaScript entries must end in `.js`;
- styles must end in `.css`;
- only text files are accepted;
- file count and total package size are bounded;
- the declared Plugin API must be compatible with the v1 API family.

## Build a package

A complete external detector template is in:

```text
examples/external-plugins/resonance-detector-template/
```

For application maintainers, package any external plugin folder with:

```bash
npm run plugin:package -- examples/external-plugins/resonance-detector-template detector.dkplugin
```

For third-party developers, the standalone SDK requires no application source tree:

```bash
node sdk/tools/dkds-plugin.js validate my-plugin
node sdk/tools/dkds-plugin.js package my-plugin my-plugin.dkplugin
```

The distributable SDK contains the manifest schema, API declarations, validator/packager and workspace/algorithm templates.

The folder must contain `plugin.json` and its declared source/style files.

## Install / update / uninstall

Desktop application:

```text
Plugins
→ Install Plugin
→ choose *.dkplugin
```

The application displays a warning before installation because the package contains executable JavaScript.

Installing another package with the same external plugin id is treated as an update. Runtime loading/activation is part of the transaction. If the updated plugin fails to load, the kernel restores the previous installed package and runtime definition when possible.

External plugin cards expose:

```text
enable / disable
reload / retry
uninstall
```

Uninstalling a plugin does **not** delete its namespaced project data. Reinstalling a compatible plugin with the same id can restore that project state.

## Peak detector plugin contract

Peak detectors are normal plugins. A detector registers a provider:

```js
ctx.analysis.detectors.register('my-detector-v1', {
  name: 'My Detector',
  description: '...',
  default: false,

  defaultSettings() {
    return { threshold: 3 };
  },

  parameterSchema: {
    fields: [
      { id: 'threshold', type: 'number', label: 'Threshold', default: 3 }
    ]
  },

  evidence: {
    custom: { key: 'custom', label: 'Custom evidence', glyph: '◆', symbol: 'diamond' }
  },

  detect(sweep, settings, options) {
    // Return peak candidate objects using raw sampled V/I coordinates.
  }
});
```

The Resonance Workbench discovers `peak.detectors` dynamically. It does not know the detector id in advance. Therefore a stronger detector can replace the built-in robust detector without editing the workbench or core application.

### Scientific invariant

For resonance analysis, an external detector must preserve the established contract:

> transformed/derived signals may locate candidate regions, but the final reported `Vpk` must map back to a real raw I–V sample coordinate.

Do not return derivative extrema as physical `Vpk` values.

## UI plugins

An external package can also customize its own user interface through Plugin API contributions:

```text
ui.activities
ui.sidebar
ui.toolbar
ui.mainTools
ui.mainOverlays
ui.mainViews
ui.inspectors
ui.groupViews
ui.groupCharts
ui.pages
ui.panels
ui.shortcuts
ui.styles
```

This is the preferred route for new experimental workflows. Do not patch `src/index.html` or the global toolbar merely to add a domain feature.

## Security model

An external plugin is **executable JavaScript**, not a passive data file.

Renderer context isolation prevents it from directly importing Node/Electron modules, but a plugin can use documented host/plugin APIs, inspect data made available to it, manipulate its DOM UI, and use ordinary browser capabilities.

Therefore:

- install only plugins you trust or whose source you have reviewed;
- do not install unknown `.dkplugin` files received from untrusted sources;
- the application deliberately shows a warning before installation.

This is not a cryptographically signed marketplace system.

## Web and Android

Runtime installation of executable `.dkplugin` packages is currently **desktop-only**.

LAN Web and Android/React Native use the same built-in plugin architecture, Recipe system, formula engine, and science engine, but arbitrary runtime JavaScript installation is deliberately disabled there for now.

A mobile release can bundle additional plugins at build time. Scientific algorithms should remain shared; do not create a separate Android-only implementation.

## Optional dedicated window in an external package

Installed `.dkplugin` packages may use the same `manifest.window` contract as built-in plugins. When present, `scripts/package-plugin.js` automatically includes `window.runtime` and `window.scripts` in the package in addition to the ordinary plugin scripts/styles.

```json
"window": {
  "activity": "my-analysis",
  "title": "My Analysis",
  "prewarm": true,
  "reuse": true,
  "persistence": "project",
  "runtime": "window-runtime.js",
  "scripts": ["analysis-engine.js"],
  "dependencies": ["plotly", "platform", "plugin-kernel"]
}
```

The package still registers its Activity normally with `openMode:'window'`. Project-safe results should be registered through `ctx.project.registerSlice(...)` or stored as Data Model artifacts. The dedicated renderer merges only the external plugin's namespace and artifact deltas back into the project, so it cannot replace unrelated plugin state with an older prewarmed project snapshot.

If an installed package is updated while DK Data Studio is running, the package installation revision changes. Any hidden renderer from the previous revision is destroyed and a fresh dedicated renderer is created/prewarmed from the updated package.

## Version history and rollback (v3.54+)

Desktop installation keeps one active package per plugin id. When an external `.dkplugin` is updated, the previous package is archived under the application plugin-history store. Plugin Manager can list those archived versions and roll back; the package being replaced by the rollback is archived as well.

This package history is not the same as scientific algorithm-version coexistence. A single active Algorithm Provider package may register multiple versions of the same algorithm simultaneously. Projects/results store exact algorithm references, while package rollback is a recovery mechanism when an old implementation is no longer supplied by the active package.


## Algorithm package catalog and compatibility (v3.55+)

Algorithm Provider packages should declare the exact algorithms that the package can supply in `algorithmProvides`. This allows DK Data Studio to search built-in providers, the active external/override packages and archived external-package history without executing package JavaScript.

```json
{
  "algorithmProvider": true,
  "algorithmCategories": ["transport-transform", "ter-analysis"],
  "algorithmProvides": [
    {"category":"transport-transform","id":"transport.didv","version":"1.0.0"},
    {"category":"ter-analysis","id":"ter.high-low-ratio","version":"1.0.0"}
  ],
  "compatibility": {
    "app": ">=3.60.0 <4.0.0",
    "pluginApi": "^1.10.0"
  }
}
```

`pluginDependencies` may additionally declare package-level dependencies as `{id, range, optional}`. The Catalog marks a candidate compatible only when the current DK Data Studio version, Plugin API version and required plugin-package versions satisfy all declared ranges. The same compatibility result is enforced when installing/updating locally, applying a LAN update, loading an already-installed external/override package, or rolling an archived package back.

When a project locks an unavailable algorithm version, Workbench code must not scan package directories or execute candidate code itself. Use the Core Algorithm API to locate/recover the package. Current compatible providers can be re-enabled/reloaded; archived external providers can be restored through package history. Override candidates are diagnostic only while the host is running because hot-swapping a built-in override would violate host/window lifecycle guarantees.

Package recovery never rewrites the scientific project lock. After a recovery action, Core resolves the original exact algorithm reference again and reports failure if that exact version is still unavailable.
