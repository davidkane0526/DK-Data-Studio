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
