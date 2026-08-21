# DK Data Studio v3.54.0 Verification

## Scope

v3.54.0 closes the scientific reproducibility loop around versioned Algorithm Providers: new-analysis defaults, exact project locks, missing-version diagnostics, and external Provider package rollback history. Scientific numerical definitions are unchanged.

## Versions

- Application: `3.54.0`
- Resonance Workbench: `3.54.0`
- TER Analysis: `3.8.0`
- Scientific Algorithm Runtime: `1.1.0`
- Automation Runner: `1.9.0`
- Standard Resonance Algorithms remains `2.1.0`
- Standard Transport Algorithms remains `1.0.0`

## Required contracts

1. `setPreferred()` may change only versionless/new-analysis resolution.
2. `lock()` produces an exact `{category,id,version}` and later preference changes cannot redirect it.
3. `diagnose(exactRef)` returns `missing-version` with alternatives when the algorithm family exists but the requested version is absent.
4. TER and Resonance must not silently replace a missing exact lock.
5. External `.dkplugin` upgrades archive the previous package; rollback archives the current package and activates the selected historical package.
6. One plugin ID has one active package. Multiple scientific algorithm versions coexist inside the Algorithm Registry.

## Expected built-app automation

Development Electron: `27 pass / 0 fail / 1 skip / 28 total`; the only skip is packaged-build identity. Packaged installer/portable: `28 pass / 0 fail / 0 skip`.

The new case is `Algorithm default / lock / missing-version management`. TOP coverage remains 4/4 with lazy Plotly and category-driven local Algorithm Provider routing.

## Source verification

Run:

```bash
npm run algorithms:test
npm run plugin-manager:test
npm test
npm run check
npm run performance:test
git diff --check
```
