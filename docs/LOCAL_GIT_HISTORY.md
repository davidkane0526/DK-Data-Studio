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

13. v3.29.0: repair native TOP/dedicated runtime contracts; add isolated local portable docking zones; flatten TER six-chart layout; refine Data Center/Pulse portable UI and panel chrome.

14. v3.30.0: introduce the unified Analysis Workbench with PRIMARY/PRIME/SUB semantics and managed grids; add a cross-renderer Capability Runtime; migrate TER/Pulse/Data Center to the same workbench composition and move Resonance TOP onto the same semantic workbench/capability contract while preserving self-contained project files.
15. v3.31.0: complete the unified AnalysisWorkbench v4 runtime, Capability Runtime v2, and one shared Resonance PRIMARY/PRIME/SUB composition across SUPER/TOP; migrate all first-party analysis views to the same Core composition contract.
16. v3.31.1: make Windows shared dependency caching immutable and authoritative, separate Electron binary installation from npm reify, and add retry/mirror fallback for Electron/electron-builder binary downloads.
17. v3.31.2: repair Resonance runtime bootstrap and Core ContextMenu/AnalysisWorkbench placement dispatch; restore TER layout and chart-placement commands.
18. v3.32.0: add typed plugin data/result registration and shared Interaction Runtime, coalesce resize dispatch, separate sticky pinning from Dock, restore TER R–V sticky behavior, and rebuild mature Resonance cross-view selection linkage on the unified SUPER/TOP runtime.
19. v3.33.0: restore Resonance v3.25 presentation parity and replace plugin-local dataset snapshots with the shared live Artifact/legacy bridge across Data Center, TER, Resonance and TOP windows; clear completed import drafts.
20. v3.34.0: add the Core plugin visual contract, normalize non-Resonance plugin typography/action rows, rebuild Resonance against the supplied D3 GRS UI/interaction reference, and add D3 to the generic TOP dependency contract.
21. v3.35.0: promote the GRS workspace and direct scientific-curve interaction model into Core `PluginWorkspace` + `ScientificCurveSurface`; make SUPER/TOP host mode metadata-only, migrate Data Center/TER/Pulse to the same workspace foundation, and enforce the extraction with architecture/boundary tests.
22. v3.36.0: refine PluginWorkspace with scientific-canvas-local docking, GRS visual parity for Resonance data/Inspector/range controls, portable group subplots, SUPER/TOP command projection, project-tab slice isolation and direct-manipulation performance fast paths.
23. v3.37.0: audit PluginWorkspace ordering with explicit PRIMARY scrolling, independent SUB pages, managed vs whole-interface floating, dock conflict stacking, active-plugin Edit routing, live stable Resonance group plots and Pulse repeat-analysis science/runtime fixes.
