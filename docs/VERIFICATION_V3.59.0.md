# DK Data Studio v3.59.0 Verification

## Scope

This release verifies the unified TableSurface/SettingsSurface and interaction-foundation changes without weakening the v3.58 Host Neutralization boundary.

## Required gates

- `npm run check` — full architecture/science/plugin regression suite.
- `npm test` — full runtime/unit regression suite.
- `npm run table-surface:test` — TableSurface public/runtime/SDK contract.
- `npm run sdk:test` — SDK copied outside the repository, then validate/package against the standalone contract.
- `npm run data-source-lifecycle:test` — generic source rename/exclude/remove ownership.
- `npm run host-neutralization:test` — canonical project root and domain-neutral Host.
- `git diff --check` — whitespace integrity.

## TableSurface acceptance

A managed table must support:

- drag column resize;
- column/all auto-size;
- ascending/descending/original-order sort;
- hide and restore columns;
- copy cell, row and visible table;
- semantic column keys;
- explicit stable state persistence/restoration;
- automatic enhancement of normal dynamically inserted tables;
- opt-out via `data-dkds-table="off"`;
- plugin access through Plugin API 1.9 `ctx.ui.tables`.

Transient anonymous tables must not accidentally share persistent column state. Mutation handling must hydrate newly added nodes rather than rescan the complete document for every change.

## Architecture acceptance

- Plugin API reported by Core is `1.9.0`; API 1.8 packages remain accepted by the 1.x compatibility rule.
- First-party plugins declare their consumed Core requirements.
- Resonance entry remains a thin dispatcher; source lifecycle wiring stays in shared View/runtime layers.
- Imported source lifetime remains owned by the project Host and exposed through `core.data-sources`.
- No scientific domain state returns to `src/app.js`.

## Built-in Automation Runner

Runner `1.15.0` contains a real DOM `table.surface` case. It binds and mounts managed tables, verifies resize handles, verifies automatic enhancement of a dynamically inserted normal table, exercises key-based visibility/state restore, and serializes the visible table.
