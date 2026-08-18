# Local Git history

This project archive now contains a local `.git` repository on branch `main`.

The history was reconstructed from the exact project ZIP snapshots delivered during the 2026-08-18 DK Data Studio development session. It is intentionally local and was created without reading from, pushing to, or modifying any remote repository.

Reconstructed sequence:

1. User-provided `DK-Data-Studio.zip` baseline.
2. LAN automatic discovery and plugin-only LAN update delivery.
3. Unified status bar, status monitor, project save/save-as choice, and LAN panel minimize/restore.
4. LAN overlay z-index and control geometry cleanup.
5. Toolbar outline and LAN minimize glyph polish.
6. Current follow-up: force standalone menu outer-height alignment, refine the minimize glyph, and stabilize plugin-manager scrolling during plugin lifecycle changes.

The reconstructed commits preserve the file contents of those delivered snapshots so later changes can be reviewed with normal `git log`, `git diff`, and `git checkout` workflows.
