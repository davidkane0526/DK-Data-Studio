# Branching Model — v3.62 Legacy-Free Freeze

## Current local repository

- Application checkpoint: **v3.62.0**.
- Public contracts: **Plugin API 1.19.0**, **SDK 1.24.0**, **Theme Contract 3.10.0**, **Project Schema v3**.
- v3.62 is the architectural cut that removes runtime legacy bridges. Historical project files are accepted only at the Project Compatibility Gateway and are converted one-way into canonical Schema v3 state before normal runtime code sees them.
- Existing remote refs may be historical baselines; changing or publishing remote refs is a separate explicit operation.

Repository history before v3.62 documents how the current Core-first plugin architecture evolved. Historical branch names and retired APIs are context only; they are not valid implementation targets for current code.

## Freeze policy

v3.62 is architecture-frozen. Prefer changes in this order:

1. P0: incorrect/lost data, corrupt projects, crashes.
2. P1: unusable real workflow, broken cross-view state, Undo/Redo failures, severe performance or window/data synchronization defects.
3. P2: clear UI/interaction defects.
4. P3: new features or abstractions only when there is a demonstrated need.

Do not reintroduce parallel project/runtime schemas, retired Plugin API adapters, Theme aliases, split TOP/SUPER contracts, plugin-specific Core styling, or compatibility branches inside the normal runtime. If an old project format must be accepted, implement that conversion at the Project Compatibility Gateway and emit current canonical state.

## Recommended local feature flow

Continue from the latest verified local checkpoint:

```bash
git switch <latest-stable-local-ref>
git switch -c fix/<issue>
# implement
npm run check
npm test
git diff --check
git commit
```

Repository maintenance changes may use `chore/*`. New scientific or host behavior should use a focused `fix/*` or `feature/*` branch.

## GitHub publication rule

Do not push or move remote refs implicitly. When publication is requested, choose the target branch explicitly, then push the already-verified local history. CI should run from committed lockfiles with `npm ci`; dependency-tree changes must be reviewed as source changes.

## Current architectural checkpoint

```text
Platform
  ↓
Generic Core
  ↓
Scientific infrastructure
  ↓
Algorithm Providers
  ↓
Domain plugins
```

TOP and SUPER use the same native PluginWorkspace implementation; SUPER is host promotion, not a second plugin implementation. Plugins depend only on public Plugin API/SDK contracts. Core never imports plugin identities or domain-specific plugin styles. Historical project compatibility terminates at the Compatibility Gateway.
