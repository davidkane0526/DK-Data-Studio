# Next Session Handoff — v3.61.6

## Baseline

- Application: `3.61.6`
- Branch: `refactor/v3.61.6-data-routing-sdk`
- Public Plugin API / standalone SDK: `1.13.0`
- Plugin API 1.10 / 1.11 / 1.12 packages remain compatibility-loadable when their declared requirements are available.

## Core interaction baseline

The interaction stack remains orthogonal:

1. Surface renders content.
2. Manipulator declares editable `point / axis / range` geometry.
3. Interaction Behavior maps normalized input to intents/Commands, including DOM-delegated context behavior.
4. Selection owns selected entities/ranges/focus.
5. Command Registry owns semantic state changes.

Do not add plugin-local mouse/keyboard/context-menu/box-selection infrastructure when a generic Core primitive can express the behavior.

## Workbench/navigation baseline

- `pluginType: workbench` + a page + no explicit TOP/SUPPORT role => standalone primary Activity.
- `presentation: toolbar` is required to intentionally add a contextual toolbar page.
- Plugin icon is optional; Core supplies a category default.
- `ctx.ui.scientificPlot.create()` accepts a normal DIV/container and Core owns its internal SVG/lifecycle.

## Data baseline

Canonical model:

`Importer Provider -> typed Data Artifact -> assignment -> scoped workbench view`

- One physical source can be assigned to multiple workbenches without duplication.
- Workbenches read `ctx.data.sources` and `ctx.data.artifacts` through assignment scope.
- Workbenches open `ctx.data.importWorkbench`; they do not implement file pickers.
- Data Center owns the global source catalog and assignment/delete operations.
- `builtin.flexible-import` provides `science.transport.iv`.
- `builtin.pulse-import` provides `science.pulse.trace`; Pulse Analysis only consumes it.
- Old project datasets without assignments are wildcard-visible (`*`) for compatibility.

## External Vth compatibility

The user-provided `com.dkds.transfer-vth-lab` Plugin API 1.10 package is an important compatibility case. It must remain a standalone primary Activity, receive the default workbench icon when none is supplied, render its normal DIV plot through Core ScientificPlot, and see only sources/artifacts assigned to it. Do not add a Vth-specific Core branch.

## Required gates

Before the next delivery run:

- `npm run check`
- `npm test`
- `npm run performance:test`
- `npm run reactive:test`
- `npm run sdk:test`
- `npm run table-surface:test`
- `npm run host-neutralization:test`
- `node scripts/check-plugin-boundaries.js`
- `node scripts/validate-plugins.js`
- `git diff --check`
