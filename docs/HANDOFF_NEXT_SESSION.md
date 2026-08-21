# Next Session Handoff — v3.58.1

## Current baseline

- Application: `3.58.1`
- Branch: `fix/v3.58.1-import-workbench`
- Architecture baseline remains v3.58 Host Neutralization: Core/Host is domain-neutral; scientific state is plugin-owned; TOP renderers are dedicated-only; legacy project migration terminates in `project-format`.
- Plugin SDK: v1.8.0 remains the public plugin development surface.

## v3.58.1 regression fixed

The v3.58.0 import workbench could display checked files while the footer remained `0/0`. Host Neutralization removed `gateFmt()` with the Gate-analysis code, but generic import preview rendering still called it. This raised a runtime `ReferenceError` before `renderImportGlobalSummary()` could run.

v3.58.1 replaces the dependency with a generic import formatter and adds a real built-in automation smoke for import preview + checkbox summary + commit-button state.

## Validation gates

- `npm run check`
- `npm test`
- `npm run import-workbench:test`
- software built-in Automation Test Center: verify `UI / Import -> Import workbench selection & preview` passes

## Architecture direction

Do not reintroduce Resonance/TER/Pulse/Gate domain logic into `src/app.js`. Future scientific features belong to plugins or Algorithm Providers. Only extend Core/SDK when a real plugin demonstrates a missing general-purpose contract.
