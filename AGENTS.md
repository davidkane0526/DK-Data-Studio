# AI Development Rules — Graphene Resonance Studio

This repository uses a plugin-first architecture.

## Branch rule

- `main` is the preserved v3.14 baseline.
- `plugin` is the plugin-architecture development branch.
- Do **not** merge `plugin` into `main` unless the user explicitly requests it.
- New feature work on the plugin branch should normally be implemented as a plugin.
- `src/analysis.js` is now a compatibility facade. New/reworked reusable scientific calculations belong in `src/science/*`; feature workflow/UI belongs in a plugin. Do not put new scientific algorithms back into `app.js`.

## Before changing code

1. Read `docs/ARCHITECTURE.md`.
2. Read `docs/PLUGIN_API.md`.
3. Read `docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md`.
4. For mobile/touch work, also read `docs/ANDROID_PORTING.md`.
5. Run:
   ```bash
   npm run check
   npm test
   ```
6. If Android is affected, also inspect `mobile/README_ANDROID_CN.md` and keep the shared renderer compatible with the React Native bridge.

## Plugin-first decision rule

Create or extend a plugin when the feature is any of the following:

- a new scientific analysis algorithm;
- a new data format / importer;
- a new chart or chart family;
- a new analysis page;
- a new floating/docked panel;
- a workflow specific to a measurement type;
- a domain-specific project-state slice;
- a UI layout/presentation variation for a particular workflow;
- export logic specific to a feature.

Core changes are appropriate only for:

- plugin lifecycle / registry;
- platform bridges (Electron/browser/Android);
- project shell and plugin project-state orchestration;
- generic file/clipboard/save APIs;
- generic window/layout primitives;
- generic chart host primitives;
- security/update/LAN infrastructure;
- accessibility and input abstraction;
- bug fixes that affect every plugin.

## Forbidden shortcuts

- Do not add a feature button directly to the core analysis toolbar. Register it from a plugin.
- Do not hard-code a new analysis page into `openAnalysisPage()`. Register a plugin page.
- Do not add feature-specific project fields to the root project JSON. Register a plugin project slice.
- Do not make a plugin import Electron/Node APIs from the renderer. Use host/platform services.
- Do not assume mouse input. Use Pointer Events and the platform interaction profile.
- Do not assume a desktop width.
- Do not silently change existing peak/TER definitions.

## Definition of done for a new plugin

A plugin is complete only when it has:

- `plugin.json`;
- `plugin.js`;
- a README;
- a unique plugin id;
- API version declaration;
- tests;
- project-state migration when persistence is used;
- responsive/touch behavior;
- clean deactivation behavior when resources are registered;
- no direct dependency on another plugin's internal variables.

Run `npm run plugin:index` after adding/removing plugin folders. Normal `npm start`, `npm test`, `npm run check`, and `npm run dist` already regenerate the index.

## Shared science rule

Pure, runtime-independent calculations that are useful across desktop/web/Android live in `src/science/`.

Examples already moved there:
- import/parser primitives;
- sweep reconstruction and peak detection;
- cross-Vg peak identity tracking;
- physical-family classification;
- gate-voltage calculations;
- TER;
- pulse/read extraction.

A plugin should call `window.GRSScience`; it must not copy these algorithms.

Use `npm run science:parity` whenever a mature scientific algorithm is refactored.

## Android build rule

React Native source lives in `mobile/`.

Do not commit generated `mobile/android`, `mobile/ios`, `mobile/node_modules`, `mobile/assets/web` or `mobile-dist`.

For Android changes, preserve these routes:

```text
BUILD_ANDROID_DEBUG.cmd
RUN_ANDROID_DEVICE.cmd
INSTALL_ANDROID_APK.cmd
```

The Android shell must remain a consumer of the same plugins and `src/science/*` engine.

## Plugin Manager

The core Plugin Manager already owns enable/disable/reload/preferences. Do not build a second manager inside a feature plugin.

When a built-in plugin is added, its runtime manifest should include `name`, `version`, `description`, `capabilities`, `source`, and `order` so the manager can present it clearly.

Disabling a plugin must never delete that plugin's namespaced project state.

## Data Center / Workflow rule (v3.18+)

Before adding a feature-specific state object or settings form, inspect:

- `docs/DATA_MODEL.md`
- `docs/WORKFLOW_RECIPES.md`
- `docs/PARAMETER_SCHEMA.md`
- `docs/FORMULA_ENGINE.md`

New reusable processing operations should normally be `workflow.processors` or `workflow.analyzers` that consume/return `GRSData` artifacts.

New ordinary parameter UIs should use `parameterSchema`; do not hand-build repetitive form markup.

New user-defined numeric columns must use the safe `GRSFormula` parser; never use `eval()` or `new Function()`.


## Workspace ownership rule (v3.19+)

Read `docs/WORKSPACE_PLUGIN_API.md` before changing any scientific workspace UI.

Do not put domain-specific content in `src/index.html` merely because it is convenient.

For a measurement plugin, the plugin should normally own:
- activity;
- sidebar;
- algorithm/provider selectors;
- main-view provider;
- main-view tools/overlays;
- inspector provider;
- group view/chart providers;
- domain analysis pages;
- domain floating panels;
- domain export actions.

Algorithms that are alternatives to one another should be separate providers/plugins. In particular, a peak detector should register `peak.detectors`; its algorithm-specific parameter UI belongs to the detector provider through `renderSettings` or `parameterSchema`.

The generic workbench may select a detector; it must not contain special-case controls for a particular detector implementation.

Run `node scripts/check-plugin-boundaries.js` (included in `npm run check`) before committing workspace changes.


Domain keyboard shortcuts belong to `ctx.ui.shortcuts`; only universal project/file commands belong in the core key handler.

Domain canvases own their resize behavior via the generic `layout:resize` event. Never add lists of feature-specific Plotly element IDs to core resize code.

## Installable plugins

Desktop runtime supports trusted local `.grsplugin` packages. Read `docs/PLUGIN_PACKAGES.md` before adding package installation, update, uninstall, or external detector behavior. New algorithm plugins should be independently installable when practical; never reserve a hard-coded detector id in the Resonance Workbench.
