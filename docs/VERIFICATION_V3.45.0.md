# DK Data Studio v3.45.0 Verification

## Scope

v3.45.0 introduces the canonical scientific Data Type / Selection contract and the built-in post-build Automation Test Center.

## Canonical scientific types

Core now owns stable semantic parents for raw I–V, background-removed I–V, derivatives, dI/dV, d²I/dV², dln|I|/dV, dV/dI, resistance, resonance peaks, FWHM, TER scalar values and TER matrices. Plugin-specific types inherit these parents, so consumers can accept scientific semantics rather than hard-code producer plugin IDs.

Registry validation checks missing parents and inheritance cycles. The Interaction Runtime can test accepted types, import compatible selections and observe typed selections produced by another plugin.

## Built application acceptance test

Open **Software Management → Automation Test → Run all automated tests**.

The desktop runner executes in the actual built application and checks:

1. Core runtime globals and application shell.
2. Enabled plugin activation and registry state.
3. Canonical scientific Data Type Registry integrity.
4. Cross-plugin typed Selection acceptance/import.
5. Artifact Store lineage round-trip.
6. Project-format serialization round-trip.
7. Scientific transforms: raw, detrend, dI/dV, d²I/dV², dln|I|/dV, dV/dI and resistance.
8. A real off-screen Plotly render and purge.
9. Every enabled TOP activity through its real Electron independent-renderer bootstrap. Each diagnostic TOP uses an isolated blank project, waits for ready/failed and is then destroyed.
10. Unhandled renderer errors captured during the run.

The test does not read or export active project datasets, experimental values or dataset file paths. The structured report is automatically written to the application diagnostics directory as `dkds-automation-<version>-<timestamp>.json`. Use the **Log folder** button to locate it.

## Source regression commands

- `node scripts/test-data-type-selection-v345.js`
- `node scripts/test-automation-test-center-v345.js`
- `npm test`
- `npm run check`

The first test includes an intentionally invalid cyclic type graph and verifies that validation rejects it, then verifies registry recovery after the temporary owner is disposed.
