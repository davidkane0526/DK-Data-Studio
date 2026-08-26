# DK Data Studio Architecture — v3.61.85

## 1. Runtime layers

```text
Platform shells
├─ Electron Desktop
├─ LAN / Browser
└─ Mobile
        ↓
Host-neutral Core
├─ project / data lifecycle
├─ plugin kernel
├─ scientific UI infrastructure
├─ algorithm / transform registries
├─ Theme + Material renderer
└─ service bridges
        ↓
Plugin API / SDK
        ↓
Domain plugins and Algorithm Providers
```

The dependency direction is one-way. Core may expose generic contracts to plugins; Core must not import or special-case a domain plugin. A first-party plugin has no private host privilege merely because it ships with the application.

## 2. Ownership boundaries

### Core owns

Project and data lifecycle, plugin activation and package policy, generic workspaces, PlotView/ScientificPlot, Table/Selection/History primitives, import routing, algorithm registries, Theme role assignment, Material rendering, status/shell chrome, and host-neutral service interfaces.

### Plugins own

Domain models, domain-specific panels and geometry, analysis orchestration, domain labels, plugin-specific chart composition, plugin state slices, and Algorithm Provider implementations. Static domain layout belongs in `plugin.css` declared through `manifest.styles`; first-party plugins do not receive a separate style-injection path.

### SDK owns the public authoring contract

The SDK describes supported capabilities and semantic components. It must not teach plugin authors to reproduce private Core DOM, hard-code host colors, or patch backdrop behavior. Built-in and packaged plugins use the same manifest/script/style semantics.

Static stylesheet order is also part of the contract: base Core structure loads first, manifest-owned plugin layout is inserted next, and `ui-modern.css` / Theme-Material chrome remains the final visual authority. Plugin activation order therefore cannot turn domain CSS into an accidental late theme override.

## 3. Scientific algorithms

Reusable scientific algorithms are versioned providers. A plugin resolves an algorithm by category/id/version, passes explicit parameters and receives provenance. UI plugins should not silently embed a second implementation of an algorithm already represented by a provider contract.

## 4. Theme and Material architecture

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

Theme identity must never appear in Material composition selectors. Recipe behavior is shared by built-in and SDK themes. A translucent MaterialSurface owns one backdrop layer; nested headers/content/action groups are transparent composition children unless they explicitly request an independent material surface.

Integrated actions inside a `chrome` surface are hit regions, not nested cards. Status-bar commands follow the same rule. Popovers use a body-level portal only when the selected recipe requires an independent backdrop root.

## 5. Generated runtime policy

Authored sources are split into ordered modules:

```text
src/app/*.inc                         → src/app.js
src/core/ui-infrastructure/*.inc      → src/core/ui-infrastructure.js
src/core/plugin-kernel/*.inc          → src/core/plugin-kernel.js
src/styles/base/*.css                 → src/style.css
src/styles/modern/*.css               → src/ui-modern.css
```

Plugin Index, SDK Authoring Reference and derived PNG icons are also generated. Normal `start/test/check/dist` commands regenerate them. They are not source-of-truth files and are excluded from the clean source repository.

## 6. Repository organization

Root JavaScript host files are forbidden. Electron host files live under `desktop/`; generation/validation under `scripts/`; regression tests under `tests/`; Windows-only developer tooling under `tools/windows/`; Theme runtime under `src/core/theme/`.

The CSS order number expresses ownership/layering, not release chronology. Do not create files named after release numbers and do not append `v3.61.xx fix` blocks to the end of a stylesheet. When a rule changes, edit the owning semantic block.

## 7. Compatibility policy

Compatibility code is permitted only at explicit boundaries: project-format migration, public SDK/API compatibility, external plugin package compatibility, and documented runtime capability negotiation. Compatibility selectors or domain-plugin fallbacks do not belong in generic Core layout/Material code.

## 8. Validation

`npm run check` is the release gate for source contracts, generation parity, plugin manifests, boundary checks and regression suites. It is intentionally not treated as a substitute for Electron visual validation, GPU/backdrop-filter behavior or device-specific layout validation.
