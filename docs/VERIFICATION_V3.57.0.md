# DK Data Studio v3.57.0 Verification

## Scope

v3.57 is an architecture/SDK release. It does not add a new scientific analysis feature.

The release target is that plugin development no longer requires the DK Data Studio source tree, and that first-party analysis plugins do not depend on host-owned domain services.

## Contract checks

- Application: `3.57.0`
- Plugin API: `1.8.0`
- Package schema: `1`
- Standalone SDK: `sdk/`
- New conformance test: `scripts/test-plugin-sdk-v357.js`

The SDK test copies `sdk/` to a temporary directory outside the repository, validates and packages both supplied templates using only the copied SDK, then parses those packages through the real application `normalizePluginPackage()` implementation.

## First-party plugin independence

Resonance, TER and Pulse no longer fall back to host-owned service ids. Dedicated TOP renderer services are plugin-owned and namespaced:

```text
builtin.resonance-workbench.runtime
builtin.ter-analysis.runtime
builtin.pulse-analysis.runtime
```

The main `DKDSPlugins.configure(...)` host object exposes only generic runtime/application infrastructure services. Domain renderer services and domain page callbacks are no longer part of that host configuration.

## Remaining debt

The plugin runtime contract is SDK-ready, but `src/app.js` still retains historical Resonance/TER project-root state and migration code. This remains a host cleanup task. It should be removed through one-way project migration and canonical plugin/data-model persistence rather than by adding another compatibility abstraction.

## Required validation

```bash
npm run sdk:test
npm run check
npm run test
```

The built-in Automation Test Center remains the runtime acceptance layer. Development Electron still reports packaged-build identity as skipped until installer/portable acceptance is run.
