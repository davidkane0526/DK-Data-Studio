# AI Development Rules — Graphene Resonance Studio

This repository uses a plugin-first architecture.

## Branch rule

- `main` is the preserved v3.14 baseline.
- `plugin` is the plugin-architecture development branch.
- Do **not** merge `plugin` into `main` unless the user explicitly requests it.
- New feature work on the plugin branch should normally be implemented as a plugin.
- Do not rewrite `src/app.js`, `src/analysis.js`, `main.js`, or `preload.js` just to add a feature unless the Plugin API cannot express the requirement.

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
