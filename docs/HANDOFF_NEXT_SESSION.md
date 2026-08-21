# Next Session Handoff — v3.57.0

## Current checkout

- Branch: `feat/v3.57-plugin-sdk-readiness`
- Application: `3.57.0`
- Plugin API: `1.8.0`
- Standalone SDK: `sdk/`

## Architecture checkpoint

The current architecture target is strict **Host/Core/Plugin separation**.

Core owns application infrastructure: project lifecycle, Artifact/Entity/Selection contracts, data/pipeline/transform/algorithm registries, ScientificPlot lifecycle, workspace geometry, I/O, scheduling and plugin lifecycle.

Plugins own domain logic, domain state, domain types and domain views. Resonance, TER and Pulse no longer use host-provided `resonance / ter / pulse` services as a runtime fallback. Their dedicated TOP runtimes publish plugin-owned namespaced services:

```text
builtin.resonance-workbench.runtime
builtin.ter-analysis.runtime
builtin.pulse-analysis.runtime
```

The main host no longer exposes those three domain services through `DKDSPlugins.configure(...)`.

## Standalone Plugin SDK

`sdk/` is deliberately usable without the application source tree. It contains:

```text
sdk/
├─ README.md
├─ contract.json
├─ plugin-api.d.ts
├─ plugin-manifest.schema.json
├─ tools/dkds-plugin.js
└─ templates/
   ├─ workspace-plugin/
   └─ algorithm-provider/
```

A third-party developer can copy only `sdk/` and run:

```bash
node sdk/tools/dkds-plugin.js validate my-plugin
node sdk/tools/dkds-plugin.js package my-plugin my-plugin.dkplugin
```

`node scripts/test-plugin-sdk-v357.js` copies the SDK to a temporary directory outside the repository before validating and packaging both templates. The generated packages are then accepted by the application's real `.dkplugin` normalizer. This is the release gate for “SDK does not depend on application source”.

## Remaining architecture debt

The **public plugin runtime path is now independent**, but `src/app.js` still contains historical domain state and legacy project-root fields for Resonance/TER migration and old shell compatibility. This is not a dependency of the SDK, but it is still host baggage.

The next architecture stage should therefore be **Project Host Neutralization**, not new security infrastructure:

1. make current project saves canonical around `dataModel + plugins + generic panel/project metadata`;
2. move legacy root-field migration into isolated compatibility readers rather than keeping dual live domain state;
3. remove dead Resonance/TER/Pulse renderer/state code from `app.js` once no current path consumes it;
4. add a host-neutral fixture that loads first-party TOP/SUPER plugins using only public Core contracts.

Do not add capability permission/sandbox systems unless a real product requirement appears. The expected deployment is primarily trusted/local use.

## Validation

Run before delivery:

```bash
npm run check
npm run test
npm run sdk:test
```

For built-runtime acceptance, run Software Management → Automation Test. Development Electron may still skip packaged-build identity; installer/portable validation is a separate release gate.
