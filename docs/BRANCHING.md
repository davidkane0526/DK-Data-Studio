# Branching Model — v3.61.x Stabilization

## Active branches

The repository uses only two active branches:

- `main`: current stable / release-ready baseline.
- `dev`: current development branch.

At the current v3.61.22 checkpoint, `main` and `dev` intentionally point to the same verified source state.

## Development flow

All normal development continues on `dev`:

```bash
git switch dev
# implement changes
npm run check
npm test
npm run performance:test
git diff --check
git commit
git push origin dev
```

After a change has been verified and is ready to become the stable baseline, update `main` from `dev`.

No long-lived `plugin`, `release`, `archive`, `fix/*`, or `chore/*` publishing branches are part of the repository model. Temporary local branches may be used when useful, but the remote repository should remain centered on `main` and `dev`.

## Stabilization policy

v3.61.x is architecture-frozen. Prefer changes in this order:

1. P0: incorrect/lost data, corrupt projects, crashes.
2. P1: unusable real workflow, broken cross-view state, Undo/Redo failures, severe performance or window/data synchronization defects.
3. P2: clear UI/interaction defects.
4. P3: new features or abstractions only when there is a demonstrated need.

Do not restructure Artifact, Data Sources, Plugin Kernel, TOP/SUPER, ScientificPlot, Capability Runtime, Scientific Pipeline or Algorithm Provider layers merely for code aesthetics.

## Current architectural checkpoint

```text
Platform → Generic Core → Scientific infrastructure → Algorithm Providers → Domain plugins
```

TOP and Tool workspaces share the same dedicated-window lifecycle; the current user-facing distinction is their host entry category. SUPER is a host promotion of the same plugin workspace, not a separate plugin implementation. Project compatibility is handled by one-way migration into canonical state rather than permanent compatibility branches inside the host.
