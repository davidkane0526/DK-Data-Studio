# Architecture — plugin branch

## 1. Goal

Graphene Resonance Studio is a reusable scientific-data-analysis host rather than a single graphene-only Electron program.

The `plugin` branch separates four layers:

```text
Platform shells
├─ Electron desktop
├─ LAN/browser client
└─ React Native Android shell
        ↓
Generic application host
├─ project tabs
├─ file/clipboard/export bridge
├─ plugin lifecycle / commands / registries
├─ generic toolbar/page/panel mounting
└─ responsive/touch profile
        ↓
Shared scientific engine
├─ import / sweep reconstruction
├─ peak transforms and detection
├─ smart peak identity tracking
├─ physical-family classification
├─ gate-voltage mathematics
├─ TER
└─ pulse/read extraction
        ↓
Plugins
├─ flexible-import
├─ resonance-workbench
├─ ter-analysis
└─ pulse-analysis
```

The preserved `main` branch remains the v3.14 baseline. All architecture and Android work belongs to `plugin`.

## 2. Shared scientific engine

The former monolithic `src/analysis.js` has been rewritten into independent modules under `src/science/`:

```text
common.js     shared constants/statistics/index helpers
presets.js    peak-detection presets
import.js     encodings, delimiter/header detection, multicolumn import
peaks.js      sweep reconstruction, transforms, detector, peak metrics
identity.js   cross-Vg peak-track assignment / missing-peak aware order solver
physics.js    R/H/D/X/Q family classification and M0–M3 model hierarchy
gate.js       V0, delta, delta/w, fits/correlations, carrier-density conversion
ter.js        strict same-Vd TER matrix and resonance-associated TER
pulse.js      repeated pulse/read platform detection and stable-window extraction
```

`src/analysis.js` is now only a compatibility facade that exposes `GRSScience` as the historical `Analysis` API.

Desktop, LAN web, and Android execute the same `src/science/*` code. There must never be a separate Android peak/TER implementation.

### Scientific regression guard

`scripts/verify-science-parity.js` loads the preserved implementation directly from Git:

```text
git show main:src/analysis.js
```

and compares representative mature workflows with the rewritten engine. It currently checks:
- CSV parsing;
- sweep reconstruction;
- transformed signals;
- peak detection;
- TER matrix;
- pulse/read extraction.

Run:

```bash
npm run science:parity
```

This parity check is part of `npm run check`.

## 3. Runtime shells

### Electron desktop

```text
main.js
  ↓
preload.js
  ↓
src/index.html + app.js + plugin kernel + science engine
```

Electron owns desktop-only concerns such as native dialogs, window management, packaged updater and LAN server.

### LAN/browser

```text
lan-web-server.js
  ↓
web-bridge.js
  ↓
same renderer/plugins/science engine
```

### React Native Android

```text
mobile/App.tsx
  ↓ react-native-webview
file:///android_asset/grs/index.html
  ↓
same renderer/plugins/science engine
```

`mobile/scripts/sync-web-assets.js` creates the offline web bundle. The Expo config plugin `mobile/plugins/withGrsWebAssets.js` copies it into the generated Android project at prebuild time.

React Native provides native:
- document selection;
- clipboard;
- save/share for CSV/JSON/SVG/PNG;
- native lifecycle/container.

Scientific plotting and the mature interactive workspace remain in the shared renderer so Android can run the same features immediately.

## 4. Plugin host

`src/core/plugin-kernel.js` owns:
- manifest definitions;
- discovery/activation/deactivation;
- commands;
- contribution registries;
- toolbar contributions;
- analysis pages;
- panel toggles;
- plugin CSS;
- event bus;
- namespaced project slices.

Built-in plugin discovery is generated from `src/plugins/*/plugin.json` by:

```bash
npm run plugin:index
```

No new plugin should require adding a `<script>` tag or a feature button to core HTML.

## 5. Plugin ownership

### `builtin.flexible-import`

Provides the generic text/multicolumn importer provider. The core import workbench resolves the parser/inspector through the plugin registry.

### `builtin.resonance-workbench`

Owns resonance-specific feature entry points and registers the shared resonance analysis provider. Peak detection/tracking/physics calculations come from `GRSScience` rather than a private plugin copy.

### `builtin.ter-analysis`

Owns TER feature entry and registers the shared TER provider.

### `builtin.pulse-analysis`

Owns pulse feature entry, shared pulse-analysis provider, and its namespaced project-state slice. It migrates v3.14 root-level `pulseAnalysis` state when old projects are opened.

## 6. Core vs shared science vs plugin

| Concern | Core host | Shared science | Plugin |
|---|---:|---:|---:|
| Electron/Android/browser bridges | yes | no | no |
| plugin manager | yes | no | no |
| generic project container | yes | no | no |
| generic panel/page mounting | yes | no | no |
| generic responsive/touch profile | yes | no | consume |
| numerical/statistical reusable algorithm | no | yes | consume |
| domain workflow/UI | no | consume | yes |
| feature-specific project state | no | no | yes |
| data format provider | host acquisition only | parser if reusable | yes |
| chart dashboard | primitive only | data math | yes |

Rule: if an algorithm is useful to more than one plugin/runtime, put the pure calculation in `src/science`. If it is a workflow/UI for one measurement type, put it in a plugin.

## 7. Project files

Plugin state is namespaced:

```json
{
  "plugins": {
    "com.example.my-plugin": {
      "settings": {
        "schema": 2
      }
    }
  }
}
```

Never add feature-specific fields to the root project format.

Every persistent plugin owns its schema/migration logic.

## 8. Cross-plugin communication

Allowed:
- commands;
- contribution registries;
- event bus;
- documented host services;
- shared `GRSScience` pure functions.

Disallowed:
- reading another plugin's private variables;
- modifying another plugin's DOM/private state;
- duplicating another plugin's scientific algorithm.

## 9. What remains in `app.js`

`app.js` is now primarily the mature interactive workspace/state controller: project tabs, curve/peak interaction, generic import UI, plot coordination and shared renderer plumbing.

Scientific computations that had independent meaning have been moved to `src/science`. Future changes should continue shrinking `app.js` by moving workflow-specific presentation into plugins, but do not duplicate or fork the shared science engine.

## 9. Core Plugin Manager

Plugin management is a host/core responsibility rather than a plugin because it controls plugin lifecycle itself.

Files:

```text
src/core/plugin-kernel.js
src/core/plugin-manager-ui.js
```

The manager controls only plugins already discovered by the runtime. Current built-in discovery still comes from generated manifests/entries under `src/plugins/`.

The manager provides:
- runtime activation/deactivation;
- reload/retry;
- locally persistent desired enable state;
- activation error diagnostics;
- contribution counts;
- safe preservation/restoration of per-project plugin state;
- responsive/touch management UI.

External plugin installation is intentionally a separate future layer because it requires package validation, permissions, compatibility and code-trust policy. It should not be implemented as arbitrary script execution from an untrusted ZIP.
