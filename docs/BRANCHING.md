# Branching Model — v3.61.x Stabilization

## Current local repository

- Application checkpoint: **v3.61.22**; the current branch contains repository/documentation cleanup only.
- Current checkout: `chore/v3.61.22-repo-cleanup` (repository-only cleanup; runtime stays v3.61.22).
- Previous runtime-fix branch: `fix/v3.61.22-legacy-resonance-runtime`.
- Existing `main` / `dev` refs are historical baselines and are not the current delivered application state.
- This cleanup does **not** create, move, push or publish the future GitHub `plugin` branch; branch publication is a separate explicit step.

The repository history from v3.30 through v3.61 documents the migration from a monolithic analysis UI to the current Core-first plugin architecture. Those older branch names are historical context, not current development targets.

## Stabilization policy

v3.61.x is architecture-frozen. Prefer changes in this order:

1. P0: incorrect/lost data, corrupt projects, crashes.
2. P1: unusable real workflow, broken cross-view state, Undo/Redo failures, severe performance or window/data synchronization defects.
3. P2: clear UI/interaction defects.
4. P3: new features or abstractions only when there is a demonstrated need.

Do not restructure Artifact, Data Sources, Plugin Kernel, TOP/SUPER, ScientificPlot, Capability Runtime, Scientific Pipeline or Algorithm Provider layers merely for code aesthetics.

## Recommended local feature flow

Until the publishing branch is explicitly selected, continue from the latest delivered checkpoint:

```bash
git switch <latest-stable-local-ref>
git switch -c fix/<issue>
# implement
npm run check
npm test
npm run performance:test
git diff --check
git commit
```

Repository maintenance changes may use `chore/*`. New scientific or host behavior should use a focused `fix/*` or `feature/*` branch.

## GitHub publication rule

Do not push or move remote refs implicitly. When publication is requested, choose the target branch explicitly, then push the already-verified local history. CI should run from committed lockfiles with `npm ci`; dependency-tree changes must be reviewed as source changes.

## Current architectural checkpoint

The current host boundary is:

```text
Platform → Generic Core → Scientific infrastructure → Algorithm Providers → Domain plugins
```

TOP and Tool workspaces share the same dedicated-window lifecycle; the current user-facing distinction is their host entry category. SUPER is a host promotion of the same plugin workspace, not a separate plugin implementation. Project compatibility is handled by one-way migration into canonical state rather than permanent forward-compatibility branches inside the host.
