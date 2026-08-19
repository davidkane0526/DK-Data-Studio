# Branching Model

## Current local repository

This delivery contains a reconstructed local Git repository with `refactor/v3.33-resonance-parity-dataflow` checked out; `main` remains the v3.32.0 baseline until this refactor is explicitly merged. The commits correspond to the actual ZIP snapshots produced during this DK Data Studio session. No remote repository was read or modified when creating this history.

Current development baseline: **v3.33.0**.

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

`v3.33.0` restores the v3.25 Resonance presentation contract on the shared SUPER/TOP runtime and makes the Artifact Store the live imported-data bridge used by Data Center, TER, Resonance and dedicated plugin windows.

`v3.32.0` is the interaction/performance completion pass: Core coalesces resize notifications and rejects recursive layout feedback; plugins can register heterogeneous raw/derived/result data types; typed selections carry compact references/ranges/context; Sticky is distinct from Dock; TER restores the R–V sticky inspector; Resonance restores shared main/trend/inspector/group selection linkage without rebuilding full plots on each click.

`v3.31.2` is a runtime-interaction hotfix on top of v3.31.1. It restores the Resonance shared feature-runtime bootstrap and fixes the Core ContextMenu capture-phase bug that made TER layout and portable chart-placement menu items appear but never execute. AnalysisWorkbench now also receives explicit portable-placement callbacks so dock regions and managed grids resynchronize immediately.

`v3.31.1` is a Windows tooling patch on top of the unified runtime. It makes the selected shared dependency/cache folders authoritative, avoids running npm reify through a project `node_modules` Junction, separates Electron binary acquisition from npm package installation, and adds retry/mirror fallback for transient binary download failures.

`v3.31.0` completes the unified runtime: AnalysisWorkbench v4 owns outer geometry without mutating plugin DOM, PRIMARY/PRIME/SUB share one view tree across SUPER/TOP, and Capability Runtime v2 adds query/require/watch semantics.

`v3.30.0` establishes the unified Core analysis surface: `AnalysisWorkbench` owns PRIMARY / PRIME / SUB composition, managed responsive grids, dock/floating regions, resize lifecycle and portable scientific views. `Capability Runtime` publishes serializable plugin providers from the main renderer and makes them available to dedicated TOP renderers through a generic IPC bridge.

TER, Pulse / Read and Data Center mount the same shared Controller + Shared Views + Feature Runtime stack into this workbench regardless of SUPER/TOP hosting. Resonance keeps its mature scientific renderer but now shares the same Controller/View contracts and PRIMARY/PRIME/SUB topology; its TOP renderer receives detector providers and parameter schemas from the same capability registry used by the main renderer. Host adapters are restricted to container/lifecycle mapping.

Project files remain self-contained: raw imported text, parsed points, plugin state and analysis results are preserved so a copied project remains usable without the original source files.

`v3.31.1` supersedes the v3.27.1 shared-cache implementation: the selected shared cache root remains bound to npm, pnpm, Electron, electron-builder and Gradle, while shared `node_modules` is now an immutable signature-keyed dependency cache that npm never reifies through directly.
