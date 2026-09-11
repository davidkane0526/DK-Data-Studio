# Platform Presentation Final Freeze Audit — v3.67.6

## Scope

This release adds no Presentation feature. It audits and freezes ownership after Phase 1–4, the legacy consumer audit and Plugin API 1.19 cutover.

## Frozen data flow

```text
Plugin domain/state/scientific renderer
        ↓
PluginWorkspace semantic surfaces
        ↓
TopWorkspace semantic contract
        ↓
Core Presentation Model
     ┌──┴──┐
Desktop   Mobile Presenter
     ↓       ↓
platform shell / input adapter
```

The Core Presentation Model contains semantic identity and state only: surface id/kind, presentation role, semantic kind, priority, collapsibility, label and active state. Desktop docking geometry is not part of this model.

## Semantic contract

The only cross-platform surface roles are defined by `src/core/contracts/presentation.js`:

- `scientific-primary`
- `data-primary`
- `utility-primary`
- `data-control`
- `inspector`
- `scientific-secondary`

`ctx.ui.topWorkspace.register(...)` may declare role, semantic kind, priority and collapsibility. It must not declare `placement`, `placements` or `defaultPlacement`. Desktop docking belongs to the live `PluginWorkspace` surface (`registerPrime/registerSub`) and is consumed only by Desktop runtime layout.

## Duplicate-contract audit

First-party plugins and the built-in template no longer advertise the historical `ui.prime` / `ui.sub` contribution capabilities. New TOP/SUPER UI composition uses `ctx.ui.workspaceSurface` PRIMARY/PRIME/SUB plus one `ctx.ui.topWorkspace` semantic contract.

The already-public `ctx.ui.prime` / `ctx.ui.sub` facades are not removed in this patch because that would silently change Plugin API 1.19. They are compatibility-level low-level contributions, not a second recommended Workspace composition architecture. Any future removal must happen at an explicit Plugin API boundary.

## Frozen prohibitions

- no `ctx.ui.desktop` / `ctx.ui.mobile`;
- no Mobile Host reverse-read of Desktop DOM/CSS state;
- no Desktop placement metadata in the Core Presentation Model;
- no TOP `leftNode / leftHtml`;
- no page-level Mobile legacy workspace bridge;
- no domain/plugin selector ownership in generic Core visual style;
- no first-party TOP/SUPER page composition through `ctx.ui.prime / ctx.ui.sub`.

## Change policy after freeze

A later UI issue does not justify modifying the Presentation architecture. Core should change only when a genuinely reusable semantic capability is missing. Platform geometry belongs to Presenter/platform layout; domain layout belongs to the plugin; scientific rendering remains shared. Breaking the frozen semantic contract requires an explicit future Plugin API version boundary.
