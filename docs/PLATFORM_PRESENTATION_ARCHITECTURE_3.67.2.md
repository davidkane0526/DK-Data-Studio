# Platform Presentation Architecture — v3.67.2 Phase 3

## 1. Phase 3 goal

Phase 3 uses Resonance Workbench as the first complete reference migration of a multi-surface scientific workspace. It does not create a mobile Resonance plugin. The existing Resonance Controller, state, commands and ScientificPlot surfaces remain shared; only platform presentation is projected downstream from one semantic contract.

```text
Resonance domain state / Controller / ScientificPlot
  -> one PluginWorkspace + TOP Workspace semantic contract
  -> Core Presentation Model
      -> DesktopPresenter -> Desktop Presentation Shell
      -> MobilePresenter  -> Native Mobile Shell
```

## 2. Resonance semantic surfaces

The canonical Resonance presentation contract is owned by `workbench-shared.js` and declares:

- `main` -> `scientific-primary`;
- `data-control` -> `data-control`;
- `curve-inspector` -> `inspector`;
- `group-analysis` -> `scientific-secondary`;
- `physics`, `spacing`, `gate-analysis` -> `scientific-secondary`.

The former data/parameter `leftNode` is now a real `data-control` PRIME surface. Desktop may dock it left; Mobile may present it as a portrait sheet or landscape rail. The plugin does not declare `mobile-bottom`, `desktop-sidebar` or any second platform API.

## 3. Desktop surface projection

`DesktopPresenter` now exposes `workspaceSurfaces` for the active workspace. `DesktopPresentationShell` renders those semantic PRIME/SUB surfaces into the host context toolbar and dispatches the shared `workspace.surface.activate` Interaction Intent.

Resonance therefore no longer registers duplicate host toolbar commands for Check, Group Plot, Physics, Peak Spacing and Gate Analysis. Settings and export remain ordinary plugin actions because they are commands/menus rather than workspace surfaces.

## 4. Mobile surface projection

The React Native shell consumes `surface.presentation.region` and `surface.presentation.navigation`:

- scientific/data/utility primary -> `main`;
- data-control / inspector -> portrait `sheet`, landscape `rail`;
- scientific-secondary -> `route`.

The old generic `panel:left` control remains only as a temporary fallback for workspaces that have not yet declared a semantic `data-control` surface. Resonance no longer needs that fallback.

The Mobile Host re-reads Presenter state after a surface intent. Closing a PRIME therefore removes its route instead of blindly pushing another route, and workspace presentation changes publish fresh native state.

## 5. Ownership and Phase 4 boundary

Phase 3 does not remove `mobile.css`. Web-rendered portable/docking geometry is still present for compatibility while additional workspaces migrate. Phase 4 may delete obsolete mobile page/layout overrides only after their equivalent behavior is represented by semantic surfaces and Presenter mapping.

No `ctx.ui.desktop` or `ctx.ui.mobile` API is introduced. Plugin API 1.18 remains singular.
