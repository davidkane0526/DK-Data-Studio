# DKDS GitHub Releases / Actions cleanup — 2026-11-11

## Scope
Repository: `davidkane0526/DK-Data-Studio`. The purpose is to keep DK Data Studio generic and independent from DK Test Studio.

## Verified cleanup results
- Original GitHub Release count: **128**.
- Removed **82** obsolete cross-project Releases matching `DKTS-FSPro-*` and `4200-*`, including 26 DKTS-FSPro and 56 4200A preview releases.
- Remaining Release count after removal: **46**. All `v*` and `dkds-*` releases were preserved, including the complete-update records for **v3.72.4** and the prior rollback releases.
- Removed **28** superseded, cancelled `dev` Actions runs created on 2026-11-11. Historical failed/successful diagnostic runs were retained.
- All three permanent `dev` workflows remain: **Build Windows**, **Build Android**, **DKDS Fast UI Hot Update**.
- Removed the one-off `.github/workflows/release-prune-once.yml` after its task completed; it is not part of the permanent repository.
- Verified separate `davidkane0526/DK-Test-Studio` Releases include Windows and Android builds before deleting the legacy cross-project DKTS artifacts.

## Audit exception
The cleanup job was marked failed because two **draft** Releases had no corresponding Git tag refs, causing tag deletion to return HTTP 422. Both Releases themselves were successfully deleted. Final audit: **82/82 Release removals**, **28 cancelled-run removals**, only **2 nonexistent draft tag reference errors**.

## Audit artifact
Run: https://github.com/davidkane0526/DK-Data-Studio/actions/runs/42965180194

Artifact: `DKDS-Cleanup-20261111-Audit` (contains `release-manifest.json` and `summary.json`, 90-day retention). The manifest records removed release names, IDs, targets, asset names, SHA-256 digests and download URLs.

## Retention contract
- Never delete a `v*`, `dkds-android-*`, `dkds-windows-*` or `dkds-ui-*` release merely because it is older. They may be required for installed clients, rollback or diagnostic reproduction.
- Preserve main stable branch and dev release branch.
- Instrument-specific DKTS / Keithley 4200A code and releases belong in `DK-Test-Studio`, not DKDS.
- DKDS in-app **full-program updates** must have signed/published Windows and Android installation assets, rather than only a source version bump.
