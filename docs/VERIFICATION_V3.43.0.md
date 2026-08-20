# DK Data Studio v3.43.0 Verification

## Scope

v3.43.0 hardens the host-invariance contract for first-level scientific workspaces. The immediate regression was Resonance Workbench opening correctly as SUPER but failing when demoted to TOP because its dedicated renderer did not load the Core parameter-schema module implied by `requiresCore: ["parameters"]`.

## Root cause

The plugin manifest carried two dependency declarations with different responsibilities. `requiresCore` correctly declared `parameters`, while `window.dependencies` omitted `parameter-schema`. SUPER ran inside the full renderer and therefore masked the omission. The dedicated TOP renderer loaded only its manifest window dependencies, so the shared Resonance detector picker could reach `ctx.parameters.render(...)` before `window.DKDSParameters` existed. Startup then failed while the BrowserWindow was still hidden.

## v3.43.0 contract

- `requiresCore` is canonical for Core infrastructure. The window manager automatically derives:
  - `parameters` -> `parameter-schema`
  - `data.model` -> `data-model`
  - `data.formula` -> `formula-engine`
  - `workflow` -> `workflow-engine`
  - `state` -> `state-store`
- Domain/vendor modules such as Plotly, D3 and science modules remain explicit dedicated-window dependencies.
- Dedicated startup has separate `ready` and `failed` states.
- A user-requested failed TOP becomes visible with its startup error instead of remaining hidden behind `show:false`.
- The main renderer receives the failure and surfaces it in host status.

## Regression coverage

`node scripts/test-top-window-lifecycle.js` verifies the derived dependency contract, the Resonance regression fixture, failure propagation, failed-window visibility semantics and owner status propagation. Existing plugin-window, TOP architecture, Resonance shared architecture and runtime bootstrap suites remain part of the full check.

## Version

Application / Resonance: `3.43.0`
