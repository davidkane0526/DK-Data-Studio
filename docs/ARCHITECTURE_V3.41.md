# DK Data Studio v3.41 Architecture — Core-Owned Plugin Infrastructure

## 1. Objective

v3.41 turns the existing plugin system into an enforceable ownership architecture. The key invariant is:

> Plugins define domain behavior; Core supplies and governs every reusable application capability.

This is intentionally stronger than “plugins are separate folders”. A plugin is not allowed to smuggle infrastructure through direct Electron/Plotly/DOM globals, private module namespaces, domain-specific host fields or patch files.

## 2. Layer model

```text
Electron / Web Host
  └─ Host adapters and platform bridge
      └─ DKDS Core
          ├─ Plugin Kernel + Contract Runtime
          ├─ IO Runtime
          ├─ Data Model + Data Flow Runtime
          ├─ Chart Runtime
          ├─ Scoped DOM / Component Runtime
          ├─ UI Infrastructure / Analysis Workbench
          ├─ State / Project / Workflow
          ├─ Service / Capability / Module registries
          └─ Core Host Recipes
              ↓ typed ctx API only
          Plugins
              ├─ domain model/state
              ├─ scientific algorithms/providers
              ├─ domain Controller/ViewModel
              └─ domain view content
```

## 3. New/strengthened Core runtimes

### IO Runtime (`src/core/io-runtime.js`)
Owns open/read/save, clipboard, CSV/text/image export and plugin-scoped cleanup.

### Data Flow Runtime (`src/core/data-flow-runtime.js`)
Owns importer/exporter/transformer/analyzer registries. Plugins register formats and algorithms; they do not add host parsing branches.

### Chart Runtime (`src/core/chart-runtime.js`)
Owns Plotly/D3 access and chart lifecycle calls. Raw Plotly is prohibited in first-party plugins.

### Component Runtime (`src/core/component-runtime.js`)
Owns scoped DOM primitives, event/observer cleanup, declarative generic components and frame/timer scheduling. Completed one-shot frame/timeout tasks remove their cleanup closure immediately, avoiding long-session accumulation.

### Service Runtime (`src/core/service-runtime.js`)
Replaces direct `host.resonance/host.ter/host.pulse` plugin bridges with a generic service registry. Mature domain compatibility services may still exist behind this registry; the kernel no longer grows a new top-level host field for each plugin.

### Plugin Module Runtime (`src/core/plugin-module-runtime.js`)
Replaces plugin-owned `window.DKDS...` globals. Multi-file plugins register internal modules into a Core namespace keyed by plugin ID.

### Plugin Contract Runtime (`src/core/plugin-contract-runtime.js`)
Validates API 1.8 and declared Core requirements before activation. The JSON schema and runtime requirement catalog are regression-tested for equality.

### Host Recipe Runtime (`src/core/host-recipe-runtime.js`)
Owns reusable shell/application behavior. Shell Navigation and Workspace Safeguards are now thin registrations that consume `ctx.recipes`; implementation resides under `src/core/recipes/`.

## 4. Data ownership

Canonical live imported data is the Artifact Store. Plugin project slices store domain settings/results, not a parallel source-data universe. Legacy `project.datasets` remains a migration/bootstrap fallback.

The flow is:

```text
Core IO
  → registered importer
  → Artifact/Data Model
  → registered transformer/analyzer/workflow
  → typed result Artifact / project slice
  → Core chart/workspace/selection surfaces
  → Core exporter / clipboard / image export
```

This gives import and export the same ownership model as computation and visualization.

## 5. UI ownership

Core owns outer geometry and reusable interaction mechanics. Scientific plugins retain their current visible domain content, but mount it into Core surfaces.

- TOP/SUPER: same domain implementation;
- PRIMARY: main persistent surface;
- PRIME: Core-placeable auxiliary surface;
- SUB: derived full analysis surface;
- PlotView/Portable/Grid: Core owns placement/resize/export/z-order;
- plugin-specific CSS may style domain content but may not create a parallel window/dock framework.

No v3.41 change intentionally alters the visible layout of the existing built-in plugins.

## 6. Patch ownership cleanup

Two previous plugin “patch” areas were converted into Core recipes:

- responsive shell navigation → `core/recipes/shell-navigation.js`;
- import/workspace safeguards → `core/recipes/workspace-safeguards.js`.

The active safeguard recipe no longer calls a Resonance-specific runtime. Generic import/shell protection is Core-owned; Resonance state preservation remains in the plugin's canonical state path.

## 7. First-party plugin boundary after migration

The automated boundary check rejects first-party plugin source containing:

- direct Electron bridge access;
- raw Plotly calls;
- raw document infrastructure access;
- private ResizeObserver/MutationObserver creation;
- raw animation-frame/timer/microtask scheduling;
- `ctx.host`;
- `ctx.registry.add`;
- private `window.DKDS... =` module exports;
- direct `DKDSHostRecipes` access.

Complex plugin support files may use the **Core-owned** `DKDSPluginModules` registry because those files load before activation; activated code consumes them through `ctx.modules`.

## 8. Abstraction and file-size audit

The pre-v3.41 code had several large files: `app.js`, `style.css`, `ui-infrastructure.js`, `plugin-kernel.js`, Resonance `feature-runtime.js`/`view-components.js`, TER feature runtime and Pulse analysis runtime.

v3.41 deliberately extracts **cross-cutting ownership seams** rather than splitting files only to reduce line count:

- IO, charts, scoped DOM/components, data-flow, services, modules, contract and recipes moved into independent Core runtimes;
- SUPER/TOP host adapters remain thin;
- plugin-internal domain modules are registered through Core Module Runtime;
- host `app.js` no longer needs a new top-level API field per domain plugin.

Remaining large files are mainly mature renderer/domain implementations. Splitting them further is safe only at stable domain seams (model → controller → view projection → renderer), and should be done with visual parity tests. A mechanical split of `ui-infrastructure.js` or mature Resonance rendering was intentionally avoided because it changes load ordering without improving ownership.

## 9. Reliability and performance audit

Reliability improvements:

- declared Core dependency validation before activation;
- machine equality between `plugin.json` and runtime `requiresCore`;
- duplicate typed-contribution rejection;
- Core-scoped cleanup for services, charts, DOM listeners, observers and schedulers;
- namespaced project slices and artifact deltas in dedicated windows;
- one shared domain implementation for SUPER/TOP;
- architecture boundary test in `npm run check`.

Performance-sensitive design:

- selection stores compact references instead of large canonical arrays;
- chart resize remains frame-coalesced;
- plugin raw timers/animation-frame scheduling has been moved behind scoped Core scheduling;
- completed one-shot scheduler cleanup entries are deleted immediately;
- dedicated plugin windows load declared dependencies rather than the full application renderer;
- project synchronization uses namespaced plugin state/artifact deltas rather than unconditional whole-project replacement.

## 10. Compatibility policy

`ctx.host` still exists internally as a compatibility bridge for old external packages, but new/first-party v1.8 plugins are forbidden to use it. Removing it outright would unnecessarily break third-party packages; the boundary checker ensures the built-in architecture does not regress to it.

Likewise mature TER/Pulse/Resonance compatibility services may remain implemented in the host, but plugins can reach them only through the generic `ctx.services` registry. Future migrations can replace service implementations without changing the plugin contract.

## 11. Enforcement

Architecture is enforced by:

- `docs/plugin-manifest.schema.json`;
- `scripts/validate-plugins.js`;
- `scripts/test-core-plugin-contract-v18.js`;
- `scripts/check-plugin-boundaries.js`;
- architecture-specific SUPER/TOP/workbench/window tests;
- generated-data Core data-flow test;
- preserved-baseline science parity test.

A future AI should treat any failure from these checks as an ownership regression, not as something to bypass with a compatibility patch.
