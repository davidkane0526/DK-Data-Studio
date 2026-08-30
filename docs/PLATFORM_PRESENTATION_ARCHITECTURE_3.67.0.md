# Platform Presentation Architecture — v3.67.0 Phase 1

## 1. Scope

v3.67.0 introduces the first platform-presentation boundary on top of the v3.66.10 Core Freeze Audit. This phase changes architecture ownership, not plugin-domain behavior or page-specific styling.

The target pipeline is:

```text
Core data / project / history / plugin runtime / scientific state
  -> Core Presentation Model
  -> Desktop Presenter -----------------> Desktop shell
  -> Mobile Presenter ------------------> Native mobile shell

Desktop mouse + keyboard ---------\
                                  -> Interaction Intent -> Core command/workspace runtime
Mobile touch + gesture -----------/
```

Desktop and mobile do **not** receive separate Plugin APIs. Plugins continue to register one Activity/TOP workspace/action/status contract through Plugin API 1.18.0. Platform presenters interpret the same semantic model.

## 2. Core Presentation Model

`src/core/ui/modules/presentation/model.js` is platform-neutral and reads only registered/in-memory Core state:

- `DKDSPlugins.activities` for activities;
- `DKDSPlugins.workspace.top` for TOP workspace contracts;
- `DKDSUI.workspaces` for live PRIMARY / PRIME / SUB surface state;
- `DKDSUI.actions` for semantic actions;
- `DKDSPlugins.statusBar` for status items;
- an app-state project/history provider configured by the host.

It does not infer application state from Desktop DOM geometry, CSS visibility, page IDs or project-tab nodes.

### Surface semantics

Phase 1 normalizes existing workspace declarations into four presentation roles without changing the public Plugin API:

- `scientific-primary`: principal scientific/data workspace;
- `data-control`: controls or supporting panel;
- `inspector`: inspection/context surface;
- `scientific-secondary`: secondary analysis route/view.

Every surface also carries `priority` and `collapsible`. Existing `semanticKind`, placement metadata and runtime state are consumed when available. Phase 3 will migrate Resonance as the reference plugin to declare these semantics explicitly rather than relying on normalization defaults.

## 3. Presenters

`DesktopPresenter` and `MobilePresenter` consume exactly the same Core Presentation Model.

The Desktop Presenter preserves semantic surfaces and Core state for the desktop shell. Phase 1 establishes the boundary but does not rewrite the existing desktop layout.

The Mobile Presenter maps semantic roles to mobile presentation regions:

- `scientific-primary` -> main;
- `inspector` / `data-control` -> portrait sheet or landscape rail;
- `scientific-secondary` -> secondary route.

This mapping is presenter logic, not plugin logic.

## 4. Interaction Intent

`src/core/ui/modules/interaction/intent.js` defines one platform-neutral intent schema. Current intent families are navigation, back, command, panel, workspace surface, workspace action, status action and keyboard key intents.

`DesktopMouseKeyboardAdapter` maps mouse/keyboard bindings into these intents. `MobileGestureAdapter` maps native-host requests and touch gestures into the same intents. Platform input differences therefore terminate at the adapter boundary.

## 5. Mobile Host ownership

`src/core/host/mobile-host-runtime.js` protocol 3 now consumes `DKDSPresentation.present('mobile', ...)` and uses the Mobile Gesture Adapter. It no longer reconstructs project/activity/workspace/status state by querying Desktop renderer DOM.

The Mobile Gesture Adapter may interact with mobile-owned transient DOM mechanics such as the mobile drawer resize handle or Escape-close behavior. That is input/transient-layer ownership, not presentation-state discovery.

## 6. Deliberately deferred

Phase 1 does not:

- repair scattered UI bugs;
- fork `ctx.ui` into desktop/mobile APIs;
- migrate all plugins to explicit semantic roles;
- delete `mobile.css` page-level overrides yet;
- reimplement Desktop layout through the new presenter yet.

Planned sequence:

1. **Phase 2** — completed in v3.67.1: Desktop Activity/Tool composition consumes Presenter navigation and live surfaces merge with their registered semantic contract.
2. **Phase 3** — migrate Resonance as the reference semantic workspace and validate Desktop/Mobile parity.
3. **Phase 4** — remove page-level `mobile.css` overrides that became unnecessary after presenter migration.
