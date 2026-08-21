# Next Session Handoff — v3.58.0

## Current checkout

- Branch: `feat/v3.58-host-neutralization`
- Application: `3.58.0`
- Plugin API: `1.8.0`
- Project format: schema `2`
- Standalone SDK: `sdk/`

## Architecture checkpoint

DK Data Studio is now **SDK-first and host-neutral for scientific plugins**.

Core owns only generic infrastructure: project/file lifecycle, Artifact/Entity/Selection contracts, plugin lifecycle, Data/Pipeline/Transform/Algorithm registries, ScientificPlot/UI/workspace infrastructure, I/O, platform bridges and TOP/SUPER hosting.

Scientific plugins own their domain state, domain views and workflow. Versioned Algorithm Provider plugins own replaceable algorithms. The main host no longer contains Resonance, Peak/FWHM, TER, Gate, Pulse or Sweep implementations.

## Canonical project contract

Current projects use a generic root and namespaced plugin state:

```text
Project
├─ format / schemaVersion
├─ datasets
├─ dataModel
├─ plugins
│  ├─ builtin.resonance-workbench
│  ├─ builtin.ter-analysis
│  └─ builtin.pulse-analysis
└─ host
```

Feature-specific state must not be added to the project root. `src/core/project-format.js` is the only historical migration layer. It converts old root fields to canonical plugin slices once; Plugin Kernel and plugins never receive an old project root through a `legacyProject` fallback.

## TOP / SUPER contract

TOP uses only dedicated plugin renderers. The removed compatibility mode must not be restored. SUPER and TOP host the same plugin-owned Controller/View/feature runtime; host-role transition synchronizes only that plugin's project slice and Artifact delta.

## Standalone Plugin SDK

A third-party developer should normally receive only `sdk/`, not the application source. The SDK can validate and package `.dkplugin` files outside the repository:

```bash
node sdk/tools/dkds-plugin.js validate my-plugin
node sdk/tools/dkds-plugin.js package my-plugin my-plugin.dkplugin
```

`scripts/test-plugin-sdk-v357.js` remains the detached-SDK release gate. A plugin requiring private `app.js` knowledge or another plugin's private state is an architecture regression.

## First-party plugin rule

Resonance, TER, Pulse and Data Center must use the same public Core contracts available to external plugins. Shared scientific exchange should use typed Artifacts, canonical Data Types, Selection, Pipeline/Transform/Algorithm registries or documented services/capabilities. Do not introduce host callbacks named after scientific domains.

## What remains worth doing in the base architecture

Do not add security/permission/sandbox layers without a real product requirement. Future base work should be driven by concrete plugin-development friction or measurable performance/maintainability problems.

The next meaningful base milestone is **SDK completeness validation by external-style plugins**: when a new plugin needs a genuinely generic capability that the SDK lacks, extend the Core contract once and document/test it. Otherwise new scientific features belong in plugins, not the host.

## Validation

Before delivery run:

```bash
npm run check
npm test
npm run sdk:test
npm run host-neutralization:test
git diff --check
```

For built-runtime acceptance, use Software Management → Automation Test. Development Electron may still skip packaged-build identity; installer/portable validation remains a separate release gate.
