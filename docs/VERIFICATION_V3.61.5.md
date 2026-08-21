# DK Data Studio v3.61.5 Verification

## Release identity

- App version: `3.61.5`
- Plugin API / standalone SDK: `1.12.0`
- Development branch: `refactor/v3.61.5-interaction-behavior-core`
- Compatibility: Plugin API `1.10.0` and `1.11.0` packages remain loadable when their declared Core requirements are available.

## Interaction architecture verified

Plugin API 1.12 introduces `ctx.ui.interactionBehaviors` as the public policy layer between raw input and semantic state changes.

The validated responsibility split is:

1. `Surface` owns rendering and gesture geometry.
2. generic `point / axis / range` manipulators own directly editable geometry;
3. `Interaction Behavior` resolves normalized gestures to intents or Commands;
4. Selection owns focus/items/ranges;
5. Command Registry owns semantic state changes.

The stable normalized gesture vocabulary is `click`, `double-click`, `context`, `drag`, `box`, `wheel`, and `key`. Exact keyboard chords are normalized before arbitration. Scientific direct manipulation has higher priority than selection/background behavior. Ctrl+click additive selection, Ctrl+box zoom, normal box region selection, marker context actions and wheel zoom are expressed through Core behavior bindings rather than plugin-local modifier branches.

## Resonance reference-plugin migration

The first-party Resonance workbench now verifies the intended SDK pattern:

- peak editing is a generic point manipulator;
- FWHM analysis-window editing is a generic range manipulator;
- Shift+left-click curve action is an Interaction Behavior -> Command binding;
- normal marker right-click opens Core-rendered context actions;
- Shift+right-click is a higher-priority declared delete Command;
- keyboard operations use exact-chord Interaction Behavior bindings;
- `Ctrl+Z`, the visible undo control and the system Edit Contract all route to `builtin.resonance.undo`;
- `Escape` and the system deselect action route to `builtin.resonance.deselect`;
- the reference plugin no longer uses `ctx.ui.shortcuts`, raw DOM keyboard listeners, private D3 drag loops, or feature-specific modified-click/right-click surface callbacks.

## SDK verification

The standalone SDK was updated to Plugin API 1.12 and includes:

- `DKDSInteractionGesture`, `DKDSInteractionIntent`, `DKDSInteractionBehaviorBinding`, `DKDSInteractionBehaviorProfile`, and `DKDSInteractionBehaviorRuntime` declarations;
- `ui.interaction-behavior` in the machine-readable manifest schema;
- Workspace template usage of Command Registry + Interaction Behavior without application source;
- documentation for keyboard, context-action, box and direct-manipulation composition.

## Automated gates

The final working tree passed:

- `npm run check`
- `npm test`
- `npm run performance:test`
- `npm run reactive:test`
- `npm run sdk:test`
- `npm run table-surface:test`
- `npm run host-neutralization:test`
- `git diff --check`

`npm run check` and `npm test` include `scripts/test-interaction-behavior-v3615.js`. The negative plugin-manager and failed-activity cases intentionally emit test errors while their suites pass.

## Regression rules

Future first-party plugins must not regain raw mouse/keyboard/context-menu infrastructure. If a new interaction cannot be expressed through existing Interaction Behavior + Manipulator + Selection + Command contracts, extend the Core/SDK primitive vocabulary instead of adding a plugin-specific pointer/keyboard path.
