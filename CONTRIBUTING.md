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
