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

## 10. Data Center foundation — v3.18

The customization layer now adds five generic core modules:

```text
src/core/data-model.js
src/core/formula-engine.js
src/core/parameter-schema.js
src/core/workflow-engine.js
src/plugins/data-center/
```

The intended dependency direction is:

```text
Artifact Store / Data Model
          ↓
Formula + generic processors
          ↓
Workflow / Recipe engine
          ↓
Plugin Processor / Analyzer / Chart providers
          ↓
Schema-generated parameter UI
          ↓
Data Center or feature-specific workspaces
```

The Data Center is not meant to replace dedicated scientific plugins. It is the generic place where users can combine providers, derive columns, save Recipes and inspect provenance without changing core application code.

Detailed contracts:
- `docs/DATA_MODEL.md`
- `docs/WORKFLOW_RECIPES.md`
- `docs/PARAMETER_SCHEMA.md`
- `docs/FORMULA_ENGINE.md`


## 11. Plugin-native workspace shell — v3.19

The resonance workbench is now the reference proof that a mature domain workflow can live inside the generic host.

The core renderer provides generic surfaces:

```text
activity switcher
context toolbar + overflow
sidebar mount
main-view mount
main-tool mount
inspector host
group-panel host
page/panel factories
export menu
```

`builtin.resonance-workbench` contributes:
- the `resonance` activity;
- dataset navigator;
- detector selector;
- resonance display settings;
- main-view provider;
- range-action overlay;
- inspector provider;
- group-view provider;
- individual group-chart providers;
- physical-mechanism panel;
- peak-spacing page;
- gate-analysis page;
- resonance-specific exports.

`builtin.resonance-detector-robust` separately contributes the mature peak algorithm, its parameter UI and evidence/marker metadata.

This separation is deliberate:

```text
Resonance Workbench UI
        ↓ chooses
Peak Detector Provider
        ↓ returns peaks + detector provenance
Shared GRSScience primitives
```

A stronger detector can therefore be added without rewriting the workbench. A different measurement plugin can replace the entire main view/inspector/group charts without modifying the core shell.

The old mature D3 resonance canvas remains a compatibility implementation inside `app.js`, but the core no longer selects it directly. It runs only because the resonance plugin registers `ui.mainViews/resonance-main`. This preserves mature interaction behavior while making the ownership boundary real.

`npm run check` includes `scripts/check-plugin-boundaries.js`, which rejects regression such as putting resonance smart-detection/range/gate/physics UI back into core HTML.

## External plugin distribution

The desktop host has a user plugin directory and `.grsplugin` loader. External packages are validated by the main process, loaded through the context-isolated renderer plugin kernel, and managed by the same lifecycle as built-ins. Runtime update is transactional: if a replacement package cannot load/activate, the prior installed package is restored when possible. See `PLUGIN_PACKAGES.md`.
