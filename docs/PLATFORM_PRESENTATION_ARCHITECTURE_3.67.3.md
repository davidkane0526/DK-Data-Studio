# Platform Presentation Architecture — v3.67.3 Phase 4

## 1. Phase 4 goal

Phase 4 removes obsolete native-client page overrides that inferred mobile geometry from Desktop DOM placement. It does not remove the shared WebView renderer: scientific plots and plugin content still render once in the common runtime, while React Native owns application chrome and MobilePresenter owns constrained-platform surface geometry.

```text
Core Registry / PluginWorkspace state
  -> Core Presentation Model
  -> MobilePresenter (main / sheet / rail / route)
  -> Mobile Web Surface Presenter
  -> semantic DOM projection attributes
  -> native-workspace-presentation.css
```

The DOM projector is downstream-only. It never reads Desktop layout state to decide presentation.

## 2. Surface identity in the shared renderer

AnalysisWorkbench now marks Core-owned surface hosts with stable platform-neutral identity:

- `data-dkds-workspace-activity`;
- `data-dkds-workspace-surface-id`;
- `data-dkds-workspace-surface-kind`.

These values identify a Core surface. They do not specify Desktop or Mobile geometry.

## 3. Complete semantic contracts

The Presentation Model distinguishes an explicitly declared semantic role from a compatibility-inferred role. A TOP workspace receives `presentationComplete: true` only when every declared/runtime surface is backed by an explicit `presentationRole` / `semanticRole` contract.

Only a complete contract is eligible for Presenter-driven WebView geometry. This prevents an old workspace from silently changing layout merely because Core can infer a fallback role.

## 4. Mobile Web Surface Presenter

`mobile-web-surface.js` consumes the already-built MobilePresenter snapshot and writes:

- `data-dkds-mobile-presentation="semantic"` on the active semantic workbench;
- `data-dkds-mobile-region="main|sheet|rail|route"` on Core surface hosts;
- `data-dkds-mobile-role`;
- `data-dkds-mobile-navigation`;
- `data-dkds-mobile-active`.

It does not use `getComputedStyle`, Desktop placement, dock classes, or page/plugin selectors to infer state.

## 5. CSS ownership split

`src/mobile.css` is now an entrypoint only:

- `native-client-shell.css` — React Native/WebView shell ownership, common dialogs/import/status/scientific viewport behavior;
- `native-workspace-presentation.css` — Presenter-driven semantic surface geometry;
- `native-legacy-workspace.css` — explicit compatibility fallback for incomplete workspaces.

`touch.css` no longer contains a second React Native page-layout implementation.

The semantic stylesheet realizes `sheet`, `rail`, `route`, and `main`; it does not inspect `dock-left`, `dock-right`, `dock-bottom`, or persisted Desktop placement.

## 6. Legacy boundary

Desktop-geometry bridging is isolated behind:

`data-dkds-mobile-workspace-mode="legacy"`

The old PRIMARY-left drawer and canvas dock translation remain available only for incomplete/non-migrated workspaces. New TOP workspaces must declare complete semantic presentation and therefore must not depend on this fallback.

Resonance, the Phase 3 reference migration, qualifies for the semantic path and no longer depends on Desktop placement to determine its mobile presentation.

## 7. What Phase 4 intentionally does not do

- no second Mobile Plugin API;
- no mobile Resonance implementation;
- no domain-specific CSS in Core platform styles;
- no deletion of shared ScientificPlot/WebView rendering;
- no opportunistic UI bug fixes;
- no forward-compatibility bridge inside plugins.

The next cleanup should migrate any remaining incomplete TOP surface contracts, then reduce/remove the explicit legacy fallback when its consumer count reaches zero.
