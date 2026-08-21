# Contributing

Development target: `plugin` branch.

Read:
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/PLUGIN_API.md`
- `docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md`

Checks:

```bash
npm run check
npm test
```

New scientific features should be plugins.

Keep commits scoped. Do not mix broad formatting changes with scientific algorithm changes.

## Algorithm versioning (v3.54+)

Replaceable scientific algorithms are versioned providers. New-analysis defaults may change, but persisted scientific results/projects must store exact algorithm references. Tests must prove that changing a default does not change an exact lock, and missing exact versions must be diagnosed rather than silently upgraded. External `.dkplugin` provider upgrades use the Core Plugin Manager history/rollback path.
