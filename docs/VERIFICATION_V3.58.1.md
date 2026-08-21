# DK Data Studio v3.58.1 Verification

## Scope

- Application: `3.58.1`
- Fix: Data Import Workbench selected-file summary / preview rendering regression introduced by v3.58.0 Host Neutralization.
- No scientific plugin behavior or public SDK contract was changed.

## Root cause

`renderImportPreview()` still called the removed Gate-analysis helper `gateFmt()`. The resulting runtime `ReferenceError` aborted `renderImportWorkbench()` before the global selected-file summary refreshed, leaving the footer at `0/0` even though file rows were already present and checked.

## Fix

- Replaced the removed domain helper with `formatImportNumber()`, owned by the generic import workbench.
- Render selected/total summary immediately after file selection, before sequential file reads.
- Render the global selection summary before the editor/preview path.
- Added built-in runtime smoke `ui.import-workbench`, which renders a synthetic CSV preview and verifies `1/1 -> 0/1 -> 1/1` checkbox state plus import-button enable/disable behavior.
- Added `scripts/test-import-workbench-v3581.js` to both `npm test` and `npm run check`.

## Verification

- `npm run check` — PASS
- `npm test` — PASS
- `node scripts/test-import-workbench-v3581.js` — PASS
- `git diff --check` — PASS

The built-in Electron automation now contains one additional `UI / Import` case. In a development renderer the expected total becomes 31 cases, with packaged-build identity still skipped when running from source.
