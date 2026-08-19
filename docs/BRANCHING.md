# Branching Model

## Current local repository

This delivery contains a reconstructed local Git repository on branch `main`. The commits correspond to the actual ZIP snapshots produced during this DK Data Studio session. No remote repository was read or modified when creating this history.

Current development baseline: **v3.31.2**.

## Recommended future flow

Keep `main` as the local delivered baseline. For larger follow-up work, create a local feature branch and merge it only after tests pass:

```bash
git switch main
git switch -c feature/<name>
# implement
npm test
npm run check
git commit
git switch main
git merge --no-ff feature/<name>
```

Do not access, push to, or modify any remote repository unless the user explicitly requests it.

## Current delivery checkpoint

`v3.31.2` is a runtime-interaction hotfix on top of v3.31.1. It restores the Resonance shared feature-runtime bootstrap and fixes the Core ContextMenu capture-phase bug that made TER layout and portable chart-placement menu items appear but never execute. AnalysisWorkbench now also receives explicit portable-placement callbacks so dock regions and managed grids resynchronize immediately.

`v3.31.1` is a Windows tooling patch on top of the unified runtime. It makes the selected shared dependency/cache folders authoritative, avoids running npm reify through a project `node_modules` Junction, separates Electron binary acquisition from npm package installation, and adds retry/mirror fallback for transient binary download failures.

`v3.31.0` completes the unified runtime: AnalysisWorkbench v4 owns outer geometry without mutating plugin DOM, PRIMARY/PRIME/SUB share one view tree across SUPER/TOP, and Capability Runtime v2 adds query/require/watch semantics.

`v3.30.0` establishes the unified Core analysis surface: `AnalysisWorkbench` owns PRIMARY / PRIME / SUB composition, managed responsive grids, dock/floating regions, resize lifecycle and portable scientific views. `Capability Runtime` publishes serializable plugin providers from the main renderer and makes them available to dedicated TOP renderers through a generic IPC bridge.

TER, Pulse / Read and Data Center mount the same shared Controller + Shared Views + Feature Runtime stack into this workbench regardless of SUPER/TOP hosting. Resonance keeps its mature scientific renderer but now shares the same Controller/View contracts and PRIMARY/PRIME/SUB topology; its TOP renderer receives detector providers and parameter schemas from the same capability registry used by the main renderer. Host adapters are restricted to container/lifecycle mapping.

Project files remain self-contained: raw imported text, parsed points, plugin state and analysis results are preserved so a copied project remains usable without the original source files.

`v3.31.1` supersedes the v3.27.1 shared-cache implementation: the selected shared cache root remains bound to npm, pnpm, Electron, electron-builder and Gradle, while shared `node_modules` is now an immutable signature-keyed dependency cache that npm never reifies through directly.
