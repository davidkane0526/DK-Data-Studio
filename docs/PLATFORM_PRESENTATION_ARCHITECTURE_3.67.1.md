# Platform Presentation Architecture — v3.67.1 Phase 2

## 1. Phase 2 goal

Phase 2 turns the Phase 1 Presentation boundary into an actual Desktop composition path. The Presenter is no longer only a mobile/native snapshot facade: the Desktop activity shell now consumes a Presenter projection, while Plugin Kernel keeps registration, activation and lifecycle ownership.

The runtime direction is now:

```text
Plugin Activity / TOP Workspace / live Workspace registries
  -> Core Presentation Model
  -> DesktopPresenter.navigation
  -> Desktop Presentation Shell
  -> Activity / Tool chrome

same Core Presentation Model
  -> MobilePresenter
  -> Native Mobile Host
```

No `ctx.ui.desktop` or `ctx.ui.mobile` API exists. Platform mapping remains downstream of the one Plugin API 1.18 contract.

## 2. Desktop navigation projection

`DesktopPresenter` now emits four domain-blind navigation slots:

- `primary`: first-class workspace activities;
- `secondary`: non-primary activities;
- `tools`: TOP tool workspaces grouped under the global Tools command on the main Desktop host;
- `system`: system-owned activities that are not normal workspace tabs.

The Presenter also resolves `activation: window | embedded` from host mode, TOP/SUPER state and Activity metadata. Plugin Kernel no longer contains the former `pluginType === tool` shell-composition branch.

`src/core/ui/modules/presentation/desktop-shell.js` is the Desktop platform renderer. It consumes this projection and routes user activation through `DesktopMouseKeyboardAdapter` and the shared `Interaction Intent` schema.

## 3. Contract/runtime surface merge

A mounted `PluginWorkspace` is live runtime state; a registered `topWorkspace.layout` is semantic contract state. Phase 1 preferred live state wholesale, which meant a mounted surface could accidentally discard `presentationRole`, `priority`, `collapsible` or a contract-declared surface that had not mounted yet.

Phase 2 merges the two by stable `kind + surfaceId`:

- live state owns active/mounted placement;
- the TOP contract supplies missing semantic role, priority, collapsibility and declared placements;
- contract-only surfaces remain visible to presenters before they are mounted.

This lets plugins declare platform semantics once instead of duplicating them in Desktop and Mobile code.

## 4. Expanded primary semantics

Phase 2 adds two platform-neutral primary roles where `scientific-primary` was too narrow:

- `data-primary`: primary data-management workspace;
- `utility-primary`: primary utility/tool workspace.

Both map to the Mobile `main` region, while `inspector` / `data-control` remain contextual sheet/rail surfaces and `scientific-secondary` remains a secondary route.

## 5. First semantic declarations

Data Center, TER, Pulse Analysis, Pulse Sampler Tool and Transfer Vth Lab now declare explicit Presentation roles in their existing `ctx.ui.topWorkspace.register(...)` contract. SDK templates and TypeScript authoring declarations expose the same optional fields.

Resonance is intentionally not migrated in Phase 2. It remains the Phase 3 reference migration, where Desktop/Mobile parity can be checked against a meaningful multi-surface scientific workspace rather than being mixed into infrastructure construction.

## 6. Deferred to Phase 3 / 4

Phase 2 still does not:

- redesign Resonance layout;
- fix scattered visual bugs;
- remove page-level `mobile.css` overrides;
- create platform-specific Plugin APIs.

Next: Phase 3 migrates Resonance to explicit semantic surfaces and validates equivalent state/actions with different Desktop/Mobile presentation geometry. Phase 4 then removes obsolete mobile page overrides made redundant by Presenter ownership.
