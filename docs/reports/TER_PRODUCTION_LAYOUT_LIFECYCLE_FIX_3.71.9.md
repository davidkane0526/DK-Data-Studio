# TER Production Unit Layout/Lifecycle Fix — v3.71.9 WIP

## Acceptance trigger

The real Windows Electron screenshot after v3.71.8 showed that the TER production Unit cutover was not actually presentation-complete: the left data-control PRIME shell existed but its body was empty, the main scientific workspace was largely blank, and the user reported severe memory growth. This report treats that observation as the source of truth; prior static/side-by-side gates were insufficient to claim real-runtime acceptance.

## Root-cause chain

### Detached PRIME body content

The production TER Unit presentation passed its controls through `prime.build({content})`. The generic Unit PRIME builder did not mount that field into the canonical workbench body, so the shell/header existed while the controls remained detached. The fix is generic: declared PRIME content is appended exactly once to the actual PRIME body before any caller mount callback.

### Generated PRIME retention on reopen

Generated PRIME lookup ignored an existing `row.container`, so a close/reopen cycle could allocate a new generated subtree instead of reusing the parked panel. Core now reuses the generated container, closing a concrete DOM-retention path.

### Dual scientific renderer ownership

The formal cutover created Unit `ScientificCurveSurface` instances and then retained the production TER `feature-runtime`, which independently rendered the same seven targets through the Core ScientificPlot runtime. One target therefore had two renderer lifecycles and additional resize/interaction observers. Unit Templates 2.5.5 introduces explicit `renderOwner:'runtime'`: the Unit owns semantic composition, while the already-existing Core runtime owns the single renderer/resize-observer/interaction lifecycle. Delegated Unit plots cannot declare their own interaction extensions.

This removes a concrete memory/CPU churn mechanism. No exact heap-growth number is claimed because the reported Windows Electron heap was not instrumented in this environment.

### Cyclic responsive card height ownership

`plot-card-fill` and TER normal plot targets claimed `height:100%` while living in responsive Grid auto rows. The child therefore attempted to own a height that should be decided by the parent PlotGroup. The fixed contract removes the external 100% height and retains only minimum/internal-row constraints. The R–V card used a separate layout path, consistent with the reported screenshot where it was the only visibly structured scientific card.

## Architectural result

- Production TER remains Unit-only.
- The legacy TER `plugin.css` and `shared-views.js` stay deleted.
- `analysis-service`, controller, domain adapter and `feature-runtime` remain the unique business/numeric/interaction owners.
- No TER selector/id branch was added to Core.
- Unit Templates advance from 2.5.4 to **2.5.5** while the catalog stays **41 Units**.
- The SDK publishes `renderOwner:'runtime'` instead of relying on an undocumented TER cutover convention.

## Validation

Final frozen-source validation before clean delivery:

- `npm test`: **430 / 430 PASS**
- `npm run check`: **437 / 437 covered PASS**
- Check-only gates: **11 / 11 PASS**
- Mobile: **103 / 103 PASS**
- SDK Harness: **PASS**
- Scientific parity: **PASS**
- Plugin Boundary: **0**
- Hard Visual Invariants: **87 / 87 PASS**
- Architecture Hygiene: **PASS**
- Native Analysis strict audit: **all zero**
- Plugin manifests/packages: **17 / 17 PASS**
- Authored CSS: **44 files / 0 `!important`**
- TER formal Unit cutover, side-by-side live presentation and real numeric parity: **PASS**
- `tests/test-v3719-ter-unit-cutover-layout-lifecycle.js`: **PASS**
- Clean-source Mobile bootstrap with no pre-existing `src/generated`: **103 / 103 PASS**
- Generated runtime deleted again; TER layout/lifecycle, formal cutover, side-by-side live presentation, real numeric parity and repository hygiene rerun: **PASS**

The fix removes concrete duplicate-renderer/observer and retained-generated-PRIME mechanisms found in v3.71.8. It does **not** claim an instrumented Windows Electron heap plateau; that remains a real-client acceptance item.
