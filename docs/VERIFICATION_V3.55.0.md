# DK Data Studio v3.55.0 Verification

## Scope

v3.55.0 adds the Algorithm Package Catalog and compatibility-aware recovery path. A project can keep an exact algorithm lock, locate a package that declares that exact algorithm version, reject incompatible candidates, and restore a compatible current/history Provider without silently changing the scientific algorithm reference.

## Versions

- Application: `3.55.0`
- Resonance Workbench: `3.55.0`
- TER Analysis: `3.9.0`
- Standard Resonance Algorithms package: `2.2.0` (algorithm versions remain `1.0.0`)
- Standard Transport Algorithms package: `1.1.0` (algorithm versions remain `1.0.0`)
- Scientific Algorithm Runtime: `1.1.0`
- Algorithm Package Catalog: `1.0.0`
- Automation Runner: `1.10.0`

## Required contracts

1. Algorithm Provider manifests may publish an offline `algorithmProvides` index of exact `category + id + version` entries.
2. `compatibility.app` and `compatibility.pluginApi` are version ranges. `pluginDependencies` declares package-level plugin version ranges.
3. Local install/update, LAN update and history rollback use the same compatibility evaluator as the Package Catalog.
4. Already-installed incompatible external/override packages are not executed after a host upgrade.
5. `ctx.analysis.algorithms.locate(exactRef)` returns current/history package candidates and compatibility diagnostics without changing the project lock.
6. `ctx.analysis.algorithms.recover(exactRef)` may reload/enable a compatible current Provider or roll an external Provider package back to a compatible history package; it must verify that the requested exact algorithm version exists after recovery.
7. TER and Resonance expose recovery actions only when an exact project lock is missing. Selecting an alternative algorithm remains an explicit user action.
8. Override candidates may be located, but are not hot-swapped automatically because replacing a built-in definition at runtime would violate host lifecycle guarantees.

## Expected built-app automation

Development Electron: `28 pass / 0 fail / 1 skip / 29 total`; the only skip is packaged-build identity.

Packaged installer/portable: `29 pass / 0 fail / 0 skip`.

The new case is `Algorithm Package Catalog & compatibility`. It must find compatible built-in catalog entries for `baseline-fwhm-v1@1.0.0` and `ter.high-low-ratio@1.0.0`, while an unavailable exact version must return zero exact candidates.

TOP coverage remains 4/4. Lazy Plotly, provider routing, algorithm version locks and scientific parity remain unchanged.

## Source verification

```bash
npm run algorithms:test
npm run plugin-manager:test
npm test
npm run check
npm run performance:test
git diff --check
```
