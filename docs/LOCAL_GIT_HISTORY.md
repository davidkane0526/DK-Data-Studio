# Local Git history

This project archive now contains a local `.git` repository on branch `main`.

The history was reconstructed from the exact project ZIP snapshots delivered during the 2026-08-18 DK Data Studio development session. It is intentionally local and was created without reading from, pushing to, or modifying any remote repository.

Reconstructed sequence:

1. User-provided `DK-Data-Studio.zip` baseline.
2. LAN automatic discovery and plugin-only LAN update delivery.
3. Unified status bar, status monitor, project save/save-as choice, and LAN panel minimize/restore.
4. LAN overlay z-index and control geometry cleanup.
5. Toolbar outline and LAN minimize glyph polish.
6. Force standalone menu outer-height alignment, refine the minimize glyph, and stabilize plugin-manager scrolling during plugin lifecycle changes.
7. v3.24.0: user-controlled plugin prewarming, dedicated Resonance runtime, portable project-format layer, stronger plugin-manager viewport repair, and TER improvements selectively absorbed from the supplied reference project.
8. v3.25.0: harden Plugin Manager lifecycle scroll reset and restore full major Resonance TOP views in the dedicated renderer.
9. v3.26.0: move Resonance onto plugin-owned shared Controller and View-component layers; SUPER and TOP use different layout adapters over the same workspace schema, canonical views, shared feature templates, and trend/spacing ViewModels.

The reconstructed commits preserve the file contents of those delivered snapshots so later changes can be reviewed with normal `git log`, `git diff`, and `git checkout` workflows.

10. v3.27.0: establish plugin-neutral UI/state infrastructure, reduce Resonance SUPER/TOP adapters to host mapping only, and migrate TER/Pulse/Data Center to portable plots and shared command controls.

11. v3.27.1: fix Developer Toolbox cache binding so selected shared cache directories are actually used by npm, pnpm, Electron, electron-builder, Gradle and shared node_modules.

12. v3.28.0: remove resonance-specific SUPER assumptions; repair plugin-manager/overlay/TOP navigation regressions; replace portable chart icon strips with a compact location menu; and refactor TER/Pulse/Data Center into Controller + Shared Views + Feature Runtime stacks over core Workbench/Selection/Split/Chart infrastructure.
