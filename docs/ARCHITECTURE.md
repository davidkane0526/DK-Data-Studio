# Architecture — Current v3.61.x Baseline


## Current architecture checkpoint — v3.61.22

The runtime architecture is considered feature-complete and is now in stabilization mode. New work should prefer fixing demonstrated P0/P1 defects over introducing new host/runtime abstraction layers.

```text
Platform shells
├─ Electron desktop
├─ LAN/browser
└─ React Native Android
        ↓
Generic Core / Host
├─ Project Format + one-way legacy migration
├─ Artifact Store + Provenance + lineage
├─ Data Sources + assignment scope
├─ Data Types + Selection + Entity
├─ Project History + Commands + Interaction
├─ Import Workbench
├─ ScientificPlot + TableSurface + UI Infrastructure
├─ Capability Runtime + dedicated TOP window bridge
├─ TOP / SUPER / PRIME / SUB / Tool workspace hosting
└─ Plugin Kernel + package/override lifecycle
        ↓
Scientific infrastructure
├─ Scientific Reactive
├─ Scientific Pipeline
├─ Transform Registry
├─ Scalar Field
└─ Algorithm Registry / version locks / package catalog
        ↓
Versioned Algorithm Providers
        ↓
Domain plugins
├─ Resonance Workbench
├─ TER Analysis
├─ Pulse / Read Analysis
├─ Data Center
└─ external Vth / Tool plugins
```

Current invariants:

- The main shell is domain-neutral. Legacy domain knowledge belongs in one-way Project Format migration or the owning plugin, not `app.js`.
- Imported physical data is owned once by the project; workbenches consume scoped views through assignments rather than duplicating source data.
- Dedicated TOP windows must preserve the same public Core contracts as the main renderer; IPC transport must not silently change synchronous read semantics exposed by the SDK.
- User commands enter project/plugin history explicitly. Derived/background Artifact mutations do not automatically pollute Undo/Redo.
- Scientific algorithms remain replaceable versioned providers; exact versions are persisted in provenance/locks.
- Core visual behavior such as ScientificPlot toolbar placement is not an SDK concern unless it becomes a public plugin-configurable contract.
- v3.61.x is an architecture-freeze line: split large files only when a concrete change benefits from it; do not refactor solely to reduce file size.

## 1. Goal

DK Data Studio is a reusable scientific-data-analysis host rather than a single graphene-only Electron program.

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
Shared scientific primitives / compatibility engine
├─ import / sweep reconstruction
├─ stable numerical helpers
├─ compatibility science APIs
└─ cross-runtime deterministic primitives
        ↓
Versioned Algorithm Providers
├─ peak detection
├─ peak metrics / FWHM
└─ future replaceable scientific algorithms
        ↓
Algorithm Package Catalog / Compatibility
├─ exact algorithmProvides metadata
├─ app / Plugin API compatibility ranges
├─ package dependency ranges
└─ current + history package recovery
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

`src/analysis.js` is now only a compatibility facade that exposes `DKDSScience` as the historical `Analysis` API.

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


## 2.1 Algorithm package catalog and recovery

Scientific reproducibility spans both an exact algorithm identity and the package that can supply it. Provider manifests therefore publish metadata-only `algorithmProvides` entries and optional package compatibility/dependency ranges. Core `algorithm-package-catalog.js` indexes built-ins, active external/override packages and external package history without executing candidate JavaScript.

A project lock remains `category + algorithmId + algorithmVersion`. If the exact version is missing, Core distinguishes “algorithm unavailable” from “package exists but is incompatible”, returns candidate package diagnostics, and may recover a compatible current/history Provider. Recovery never changes the project lock; the exact algorithm is resolved again after the package action. Override candidates are not hot-swapped into the active host.

Compatibility is a single policy used by catalog lookup, local/LAN installation, external/override startup loading and package-history rollback. This prevents a package from being advertised as incompatible while another code path still executes it.

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
file:///android_asset/dkds/index.html
  ↓
same renderer/plugins/science engine
```

`mobile/scripts/sync-web-assets.js` creates the offline web bundle. The Expo config plugin `mobile/plugins/withDkdsWebAssets.js` copies it into the generated Android project at prebuild time.

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

Owns resonance-specific feature entry points and registers the shared resonance analysis provider. Peak detection and peak metrics/FWHM are resolved from versioned Algorithm Providers. Stable compatibility/scientific primitives remain available through `DKDSScience`.

### `builtin.ter-analysis`

Owns TER feature entry and registers the shared TER provider.

### `builtin.pulse-analysis`

Owns pulse feature entry, shared pulse-analysis provider, and its namespaced project-state slice. Historical root-level `pulseAnalysis` data is migrated centrally by `src/core/project-format.js` before plugin restoration.

## 6. Core vs shared science vs plugin

| Concern | Core host | Shared science | Plugin |
|---|---:|---:|---:|
| Electron/Android/browser bridges | yes | no | no |
| plugin manager | yes | no | no |
| generic project container | yes | no | no |
| generic panel/page mounting | yes | no | no |
| generic responsive/touch profile | yes | no | consume |
| stable numerical/statistical primitive | no | yes | consume |
| replaceable/versioned scientific algorithm | registry only | compatibility only | provider plugin owns |
| domain workflow/UI | no | consume | yes |
| feature-specific project state | no | no | yes |
| data format provider | host acquisition only | parser if reusable | yes |
| chart dashboard | primitive only | data math | yes |

Rule: stable low-level numerical primitives shared by runtimes may live in `src/science`. A scientific algorithm whose behavior/version can change independently belongs to a versioned Algorithm Provider plugin. Workbench plugins own workflow/UI, not algorithm implementations.
Version management rule (v3.54+): versionless algorithm resolution is a user/default choice for new analysis only. Persisted project/result provenance stores an exact version lock. Missing locks are diagnosed and preserved; they are never silently redirected to a newer version.

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

Since v3.58, `project-format` canonicalization is one-way: old domain root fields are read and folded into plugin slices, then removed from the canonical object. Plugin Kernel restore accepts only the `plugins` namespace.

Every persistent plugin owns its **current namespaced slice schema**. Historical application-level root-field migration is centralized in `src/core/project-format.js`; plugins do not receive the old project root at runtime.

## 8. Cross-plugin communication

Allowed:
- commands;
- contribution registries;
- event bus;
- documented host services;
- shared `DKDSScience` pure functions.

Disallowed:
- reading another plugin's private variables;
- modifying another plugin's DOM/private state;
- duplicating another plugin's scientific algorithm.

## 9. What remains in `app.js`

`app.js` is the generic renderer host: project tabs, generic import shell, Artifact/project synchronization, generic workspace/UI coordination, platform/LAN/update integration and plugin host wiring.

It must not implement or store Resonance, Peak/FWHM, TER, Gate, Pulse, Sweep or other scientific-domain state. Domain workflow and presentation belong to plugins; reusable low-level numerical primitives remain in `src/science`, while independently versioned algorithms belong to Algorithm Provider plugins.

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
Shared DKDSScience primitives
```

A stronger detector can therefore be added without rewriting the workbench. A different measurement plugin can replace the entire main view/inspector/group charts without modifying the core shell.

The mature Resonance visualization is now plugin-owned. Its shared Controller/View implementation is mounted by `builtin.resonance-workbench`; `app.js` contains no Resonance renderer or scientific fallback. This preserves mature interaction behavior while keeping the ownership boundary structural rather than conventional.

`npm run check` includes `scripts/check-plugin-boundaries.js`, which rejects regression such as putting resonance smart-detection/range/gate/physics UI back into core HTML.

## External plugin distribution

The desktop host has a user plugin directory and `.dkplugin` loader. External packages are validated by the main process, loaded through the context-isolated renderer plugin kernel, and managed by the same lifecycle as built-ins. Runtime update is transactional: if a replacement package cannot load/activate, the prior installed package is restored when possible. See `PLUGIN_PACKAGES.md`.

## v3.20 Shell and developer-tooling boundary

The desktop shell now has one adaptive command row above project tabs. It is a host primitive, not a plugin-specific toolbar layout.

```text
Global project/data commands
→ Activity switcher
→ active Activity plugin commands
→ Export / Manage menus
```

Activity and context command overflow are width-driven. Plugins should declare `activity`, `priority`, `order`, and `section`; they must not add another permanent toolbar row to solve overflow.

Windows operational tooling is outside the application runtime:

```text
DKDS.cmd / DKDS_GUI.cmd
        ↓
tools/windows/dkds-tools.ps1
        ↓
Node / Electron Builder / Expo / Gradle / LAN update service
```

The LAN update server is a development/deployment service under `services/update-server/`, not part of the renderer plugin architecture.

## Resonance shared View/Controller layer (v3.26)

The Resonance workbench no longer treats SUPER and independent TOP as two separately implemented applications. The plugin owns one feature spine:

```text
builtin.resonance-workbench
├─ workbench-shared.js
│  ├─ canonical six-view catalog
│  ├─ workspace/schema normalization
│  ├─ shared controller facade
│  ├─ trend/group ViewModel
│  └─ peak-spacing ViewModel
├─ view-components.js
│  ├─ shared feature View descriptors
│  ├─ mature SUPER spacing/gate templates
│  ├─ dedicated TOP view composition
│  └─ TOP styles / mount adapter
├─ super-layout.js
│  └─ SUPER placement / dock / host contribution adapter
├─ window-runtime.js
│  └─ dedicated TOP project/runtime adapter
└─ plugin.js
   └─ thin mode dispatcher only
```

The architectural rule is that scientific/workspace state and reusable feature ViewModels belong to the shared Controller layer, while feature identity and reusable View composition belong to the shared View-component layer. SUPER and TOP may arrange or bind those components differently, but must not create an independent workspace schema, duplicate a scientific ViewModel, or move mature feature templates back into a shell adapter. This specifically prevents the earlier failure mode where TOP visually existed but silently lost curve inspection, group analysis, physics or gate-dependent features as SUPER evolved.

Built-in plugins may declare ordered `manifest.scripts`. The generated plugin index preserves that order, so plugin-private support code stays inside the plugin package rather than becoming a hard-coded core-shell dependency. Dedicated windows use `window.scripts` for the subset needed before their runtime.

`test-resonance-shared-architecture.js` enforces this boundary.

## v3.35 GRS-derived PluginWorkspace foundation

The mature Graphene Resonance Studio interaction model is now a Core UI foundation rather than a Resonance-only exception. `PluginWorkspace` is the preferred scientific workspace primitive and `ScientificCurveSurface` owns reusable direct plot interaction. Resonance remains a normal TOP plugin and is the reference consumer. SUPER/TOP transitions must be host-invariant: the plugin mounts the same workspace and the host may only change outer lifecycle/window controls. See `docs/PLUGIN_WORKSPACE_DESIGN_SYSTEM.md`.

## v3.36 scientific-canvas docking and host command projection

`PluginWorkspace` now distinguishes the outer plugin control rail from an inner scientific canvas. Core portable fixed positions (`left`, `right`, `bottom`) are resolved against this scientific canvas. This keeps PRIME/SUB/child scientific views out of the GRS-derived control/data rail while preserving flexible floating and snap behavior in the plotting workspace.

SUPER/TOP is a host presentation concern. A SUPER plugin contributes semantic PRIME/SUB commands to the shell toolbar; an independent TOP renders the same commands locally. The plugin's Workspace/View/Controller tree is unchanged.

Project slice restore also obeys project identity: an absent plugin slice resets the controller. Historical root-data migration occurs before runtime restoration in `project-format`; previous-tab controller state and project-root fallbacks are never inputs to a new project's plugin state.

Pointer-frequency scientific interactions use direct geometry fast paths in Core. Expensive full renders occur at drag completion or through frame-coalesced scheduling.


## v3.37 workspace ordering and active-plugin runtime contracts

- PRIMARY scrolling is explicit (`contained` vs `auto`) rather than globally forcing `overflow:hidden`.
- The control rail/scientific canvas split is semantic and resizable, not a fixed percentage contract.
- PortableView `float` is canvas-managed/snappable; `global` is whole-plugin free floating.
- Same-zone docks are flow/stack containers and must not overlap occupants.
- SUB pages live at PluginWorkspace level outside the scientific-canvas coordinate system.
- PortableView owns close/collapse and descendant chart resize lifecycle.
- Shell edit actions dispatch to the active plugin through `ctx.ui.edit` before any legacy fallback.
- Resonance group plots consume live visible/accepted-peak state and preserve PortableView identity across `Plotly.react` updates.
- Pulse optional sample bounds preserve null/blank semantics in the science core; rerun failure must not destroy a previous valid analysis result.

## v3.41 Core-owned plugin infrastructure

Plugin API v1.10 establishes an enforceable Core-first boundary. New IO, Data Flow, Chart, scoped DOM/Component, Service, Plugin Module, Plugin Contract and Host Recipe runtimes centralize reusable application capabilities. First-party plugins must declare `requiresCore` and cannot directly access Electron, raw Plotly, raw document infrastructure, private observers/schedulers, `ctx.host`, private DKDS globals or the generic untyped registry. See `docs/ARCHITECTURE_V3.41.md` and `docs/PLUGIN_API.md` for the authoritative model.

## v3.50–v3.51 scientific pipeline and transform registry

Scientific derivations use a Core-owned composition path instead of plugin-to-plugin knowledge:

```text
typed Artifact / Sweep
        ↓
Scientific Transform Registry
        ↓
Scientific Data Pipeline
        ↓
provenance + lineage + typed Artifact
        ↓
Selection / ViewModel / ScientificPlot
```

`ctx.data.pipeline` owns execution metadata, caching, publication and projections. `ctx.data.transforms` owns discoverable transform semantics. Every public transform receives a canonical curve stage `transform.<id>` and may receive a scalar-field stage `scalar-field.<id>`. TER and Resonance consume this registry rather than maintaining independent transform catalogs. Adding a new reusable transform must not require a host change or a TER-specific heatmap branch. SUPER and dedicated TOP derive the same transform/pipeline runtimes from `requiresCore`, preserving host invariance.

## v3.56 shared scalar-field rendering and feature matrices

Typed matrix data is not a renderer contract. Scientific plugins publish `science.scalar-field` or a registered subtype and use `ctx.ui.scientificPlot.scalarField()` for the common heatmap surface. This keeps color/axis/hover/viewport/export/lifecycle behavior consistent while allowing the field producer to remain headless. Resonance `gate-analysis` demonstrates a multi-output Pipeline stage by publishing both its legacy analysis Artifact and `resonance.feature-field`; the latter retains peak-set lineage and source peak IDs so heatmap cells project back into the shared peak Selection/Inspector. TER uses the same surface for both TER and transform scalar fields.
