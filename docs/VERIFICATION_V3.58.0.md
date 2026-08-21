# DK Data Studio v3.58.0 Verification

## Scope

v3.58 is an architecture cleanup release. It does not add a new scientific feature or change the numerical definitions of existing algorithms.

- Application: `3.58.0`
- Plugin API: `1.8.0`
- Project format schema: `2`
- Branch: `feat/v3.58-host-neutralization`

## Acceptance criteria

1. `src/app.js` contains no Resonance/Peak/FWHM/TER/Gate/Pulse/Sweep domain implementation or state.
2. Current project saves contain no domain root fields; domain persistence lives under `plugins[pluginId]`.
3. Old projects migrate once through `src/core/project-format.js`.
4. Plugin Kernel and first-party plugin restore paths do not accept `legacyProject`.
5. TOP windows use only dedicated plugin renderers.
6. First-party plugins do not read another plugin's private project state.
7. The standalone v3.57 SDK remains valid and detached from application source.

## Source validation

```bash
npm run check
npm test
npm run sdk:test
npm run host-neutralization:test
git diff --check
```

`npm run check` covers the project-format migration, host-neutralization boundary, plugin lifecycle, TOP/SUPER lifecycle, scientific contracts, Algorithm Providers, Artifact/Selection/Pipeline/Transform integration and existing plugin regressions.

## Built-runtime validation

Software Management → Automation Test remains the built-runtime acceptance path. A development Electron run may skip packaged-build identity. Installer/portable resource-layout validation is intentionally separate from this source architecture release.
