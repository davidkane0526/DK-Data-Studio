# DK Data Studio Architecture — v3.61.91

## 1. Runtime layers

```text
Platform shells
├─ Electron Desktop
├─ LAN / Browser
└─ Mobile
        ↓
Host-neutral Core
├─ data / project lifecycle
├─ plugin kernel
├─ scientific runtimes
├─ semantic UI infrastructure
├─ Theme + Material renderer
├─ host/service bridges
└─ workflow / diagnostics / performance
        ↓
Plugin API / SDK
        ↓
Domain plugins and Algorithm Providers
```

Dependency direction is one-way. Core may expose generic contracts to plugins; Core must not import or special-case a domain plugin. A first-party plugin receives no private host privilege merely because it ships with the application.

## 2. Authored Core organization

`src/core/` is a responsibility root, not an implementation file dump:

```text
src/core/
├─ data/
├─ project/
├─ scientific/
├─ plugins/
│  └─ kernel/
├─ ui/
│  └─ composition/
├─ theme/
├─ services/
├─ host/
├─ performance/
├─ workflow/
├─ diagnostics/
└─ recipes/
```

Implementation files are forbidden directly under `src/core/`. Legacy authored/derived files such as `src/core/plugin-kernel.js` and `src/core/ui-infrastructure.js` are forbidden.

Plugin Kernel, UI Infrastructure and the Application shell are authored as independently importable CommonJS module graphs. Their local `composition.json` manifests declare module IDs, source paths and one runtime entry; the build generator packages those graphs into **untracked build products** under `src/generated/runtime/` for the current classic-script renderer. The generated scripts are compatibility artifacts, not source of truth. The generator rejects duplicate/missing modules and any authored runtime module above 48 KiB. Cross-module Application symbol use is additionally checked against explicit CommonJS exports so a resolvable module path cannot silently ship with an incomplete runtime contract.

## 3. Ownership boundaries

### Core owns

Project and data lifecycle, plugin activation/package policy, generic workspaces, PlotView/ScientificPlot, Table/Selection/History primitives, import routing, algorithm registries, Theme role assignment, Material rendering, shell/status chrome and host-neutral service interfaces.

### Plugins own

Domain models, domain-specific panels and geometry, analysis orchestration, domain labels, plugin-specific chart composition, plugin state slices and Algorithm Provider implementations. Static domain layout belongs in `plugin.css` declared through `manifest.styles`.

### SDK owns the public authoring contract

The SDK describes supported capabilities and semantic components. It must not teach plugin authors to reproduce private Core DOM, hard-code host paint or patch backdrop behavior. Built-in and packaged plugins use the same manifest/script/style semantics.

## 4. CSS cascade ownership

The old `base/modern` specificity architecture is removed. Authored renderer CSS uses one explicit cascade order:

```text
dkds.foundation
    < dkds.plugin
    < dkds.structure
    < dkds.presentation
    < dkds.theme
    < dkds.platform
    < dkds.window
```

`src/core.css` is the canonical import entry. Core authored CSS, first-party plugin CSS, mobile CSS and dedicated-window CSS may not use `!important`. Overrides are expressed by ownership layer and semantic selector, not by escalating specificity.

Core styles may not contain TER/Pulse/Data Center/Resonance identities. If multiple plugins need one behavior, Core exposes a semantic class/attribute/SDK contract and plugins opt in.

## 5. Theme and Material architecture

```text
Theme Profile
  ├─ semantic color / radius / shadow / motion tokens
  └─ role → recipe policy
              ↓
Core Material Role
chrome | sidebar | surface | elevated | popover | control | floating
              ↓
Core Material Renderer
clear | thin-glass | soft-glass | liquid-glass
```

Theme identity must never appear in Material composition selectors. A translucent MaterialSurface owns one backdrop layer; nested headers/content/action groups are transparent composition children unless they explicitly request an independent material surface. Integrated actions inside a `chrome` surface are hit regions, not nested cards. Status-bar commands follow the same rule.

## 6. Scientific algorithms

Reusable scientific algorithms are versioned providers. A plugin resolves an algorithm by category/id/version, passes explicit parameters and receives provenance. UI plugins should not silently embed a second implementation of an algorithm already represented by a provider contract.

## 7. Generated artifacts

Generated files are disposable and untracked:

```text
src/generated/runtime/app.js
src/generated/runtime/ui-infrastructure.js
src/generated/runtime/plugin-kernel.js
src/generated/plugin-index.js
src/generated/sdk-authoring-reference.js
assets/dkds-icon.png
mobile/assets/icon.png
mobile/assets/adaptive-icon.png
```

Normal `start/test/check/dist` commands regenerate what they need. `npm run clean:generated` returns the repository to authored-source form.

## 8. Compatibility policy

Compatibility code is permitted only at explicit boundaries: project-format migration, public SDK/API compatibility, external plugin package compatibility and documented runtime capability negotiation. Compatibility selectors or domain-plugin fallbacks do not belong in generic Core layout/Material code.

## 9. Validation

`npm run check` is the release gate for generation, syntax, plugin manifests, source boundaries, CSS structure/cascade contracts and regression suites. It is not a substitute for Windows Electron visual validation, GPU/backdrop-filter behavior or device-specific layout validation.
