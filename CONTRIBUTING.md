# Contributing

Development target: the current v3.62.x Legacy-Free stabilization baseline. Use focused local `fix/*`, `feature/*`, or `chore/*` branches; remote publication is a separate explicit step.

## First rule

Keep the code structure clean. Do not solve defects with override patches, compatibility aliases, specificity escalation, duplicate ownership, or silent fallbacks. Core owns generic infrastructure; plugins own domain behavior; CSS must have one semantic owner. Historical project compatibility belongs only to the Project Compatibility Gateway.

Read:
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/PLUGIN_API.md`
- `docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md`

After the repository contains committed root/mobile lockfiles, install unchanged dependency trees with:

```bash
npm ci
cd mobile && npm ci
```

Checks:

```bash
npm run check
npm test
npm run sdk:test
npm run performance:test
git diff --check
```

New scientific/domain features should be plugins or versioned Algorithm Providers. Do not add domain-specific compatibility branches to the generic host.

Keep commits scoped. Do not mix broad formatting changes with scientific algorithm changes.

## Algorithm versioning (v3.54+)

Replaceable scientific algorithms are versioned providers. New-analysis defaults may change, but persisted scientific results/projects must store exact algorithm references. Tests must prove that changing a default does not change an exact lock, and missing exact versions must be diagnosed rather than silently upgraded. External `.dkplugin` provider upgrades use the Core Plugin Manager history/rollback path.
## Bundled plugin package parity

First-party plugins are not exempt from the standalone package contract. `npm run plugin:validate` packages/normalizes every bundled manifest through Plugin API 1.18. If a bundled plugin fails because of semantic clipping, host-owned selectors or layout ownership, fix the plugin/Core ownership; do not weaken the external SDK validator.

When publishing a same-ID update to a bundled plugin, increment that plugin's own semantic version. The Desktop Plugin Manager installs a strictly newer compatible package as a managed override and activates it after restart; the bundled version remains the rollback baseline. App patch versions and plugin versions remain independent.

Plugin API naming is layer-specific. In particular, `requiresCore: ["ui.workspace"]` and the capability label `ui.plugin-workspace` map to the single runtime facade `ctx.ui.workspaceSurface`. Do not infer `ctx.ui.pluginWorkspace` or add aliases for guessed names. The standalone SDK and Desktop installer must share the same source-contract validation.
