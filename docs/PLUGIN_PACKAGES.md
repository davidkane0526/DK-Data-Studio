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
    "apiVersion": "1.2.0",
    "entry": "plugin.js",
    "scripts": ["plugin.js"],
    "styles": ["style.css"],
    "enabled": true,
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

Package any external plugin folder with:

```bash
npm run plugin:package -- examples/external-plugins/resonance-detector-template detector.dkplugin
```

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
