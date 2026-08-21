# Next Session Handoff — v3.61.7

## Baseline

- Application: `3.61.7`
- Branch: `refactor/v3.61.7-host-import-action`
- Public Plugin API / standalone SDK: `1.14.0`
- Plugin API 1.10 / 1.11 / 1.12 / 1.13 packages remain compatibility-loadable when their declared requirements are available.

## Workbench import contract

Workbench import UI is Core-owned.

1. New workbenches declare semantic inputs in `manifest.data.accepts`.
2. Core automatically supplies `导入数据`.
3. A plugin may place only an empty `<div data-dkds-slot="workbench-import"></div>` marker to choose the action position.
4. If the marker/header is absent, Core falls back to the host contextual action. Embedded SUPER uses that host action directly.
5. Workbench-local import is scoped: assignment is locked to the current plugin, the global target chooser is hidden, and importer providers are filtered by compatible output types.
6. The shell-level global Import action remains the multi-target routing entry.
7. New workbench plugins must not create file inputs, duplicate import buttons, or private file-picker/import pipelines.
8. API 1.10–1.13 workbenches without `data.accepts` receive the Core action in compatibility mode; assignment is still scoped, while importer filtering is intentionally permissive.

## Data baseline

Canonical model:

`Importer Provider -> typed Data Artifact -> assignment -> scoped workbench view`

- One physical source can be assigned to multiple workbenches without duplication.
- Workbenches read `ctx.data.sources` / `ctx.data.artifacts` through assignment scope.
- Data Center owns the global source catalog and assignment/delete operations.
- `builtin.flexible-import` provides `science.transport.iv`.
- `builtin.pulse-import` provides `science.pulse.trace`; Pulse Analysis only consumes it.
- Old project datasets without assignments are wildcard-visible (`*`) for compatibility.

## Interaction baseline

Surface, Manipulator, Interaction Behavior, Selection and Command remain orthogonal. Do not add plugin-local pointer/keyboard/context-menu/box-selection infrastructure when Core primitives can express the behavior.

## External Vth compatibility

The user-provided `com.dkds.transfer-vth-lab` API 1.10 package remains an important compatibility case. It has no `data.accepts`, so Core must still provide its standard scoped import action without adding a Vth-specific branch. Its normal DIV plot continues through Core ScientificPlot and its legacy data-source proxy remains assignment-scoped.

## Required gates

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
