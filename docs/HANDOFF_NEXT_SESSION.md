# Next Session Handoff — v3.20.0-plugin.3

## Repository identity

- Stable baseline branch: `main`
- Stable baseline tag: `v3.14.0-main-baseline`
- Active development branch: `plugin`
- Current delivery: `v3.20.0-plugin.3`

Never confuse `main` with `plugin`. Continue new work from `plugin`.

## What v3.20 changed

### UI shell

The former two-row Activity/Context toolbar was collapsed into one adaptive command row above project tabs.

Current order:

```text
GRS | Import/Project | Edit | Activities | Current activity actions | Export | Manage
```

- Activity overflow remains automatic (`工作区 ▾`).
- Plugin context actions use priority-aware overflow (`更多 ▾`).
- Update / LAN Web / Plugin Manager live in the compact `管理 ▾` menu.
- Undo / deselect live in `编辑 ▾`.
- No permanent second toolbar row should be reintroduced.

### UI density

`src/style.css` defines semantic UI tokens:

```text
--ui-font-size
--ui-font-small
--ui-font-title
--ui-font-page-title
--ui-control-h
```

Use these for ordinary UI. Scientific axes/annotations may keep domain-specific sizes.

### Windows tooling

All old one-off CMD files were removed. Root contains only:

```text
GRS.cmd
GRS_GUI.cmd
```

Backend: `tools/windows/grs-tools.ps1`
GUI: `tools/windows/grs-gui.ps1`

`v3.20.0-plugin.2` repaired the Windows toolbox after the first consolidation:

- `Invoke-Step` now uses the explicit `-Arguments` parameter; never rename it back to PowerShell's automatic `$Args` variable.
- `GRS.cmd install-deps` explicitly runs `npm.cmd install`; `GRS.cmd doctor` checks Node/npm/Git and dependency state.
- the WinForms GUI uses responsive Flow/Table layouts and typed geometry constructors instead of fixed `(X,Y)` placement.
- `scripts/test-windows-tooling.js` is part of both `npm run check` and `npm test`.
- keep `tools/windows/*.ps1` as UTF-8 with BOM for Windows PowerShell 5.1 Chinese text compatibility.

Add new developer/build actions there instead of creating more CMDs.

### Project structure

- update server moved to `services/update-server/`
- updater defaults moved to `config/update-config.default.json`
- operational guides moved under `docs/guides/`
- release snapshots live under `docs/releases/`

Read `docs/PROJECT_STRUCTURE.md` before moving files again.

## Architecture status inherited from v3.19

Core remains plugin-first. Mature resonance UI is plugin-native:

- Activity/sidebar/main view/main tools/overlay
- detector providers
- inspector provider
- group/subplot providers
- domain pages/panels/exports

Shared scientific logic remains in `src/science/` and must stay common to Electron, Web and Android.

## Before coding in a new AI session

Read in this order:

1. `AGENTS.md`
2. `docs/HANDOFF_NEXT_SESSION.md`
3. `docs/ARCHITECTURE.md`
4. `docs/PROJECT_STRUCTURE.md`
5. `docs/DEVELOPMENT_GUIDE.md`
6. feature-specific Plugin/Data/Workflow docs

Then run:

```bat
GRS.cmd check
GRS.cmd test
```

## Next recommended work

Do not continue changing the shell merely for visual novelty. The next architecture-validation milestone should be a genuinely different scientific plugin (for example Raman/FET/retention) implemented without core changes, so the plugin framework is tested outside the resonance domain.
