# Unit Cross-Layer Ownership Audit — v3.71.34 WIP

## Scope

This audit was restarted from the ownership boundary rather than from the latest Data Center screenshot. It covers every current first-party production presentation that has completed Unit cutover:

- `ter-analysis`
- `pulse-analysis`
- `resonance-workbench`
- `data-center`

The public Unit catalog remains **41 types**. No plugin-specific `Unit_for_xxx` type was added.

The audit specifically targets the failure class exposed after the Data Center cutover: the same rendered geometry property being written by both Unit runtime geometry and plugin-authored CSS, or by two active responsive/layout mechanisms.

## Why the previous gates missed it

The existing style architecture gates correctly protected authored CSS ownership, Theme paint, semantic owner boundaries and `!important` debt. However, they did not compare **runtime geometry written by Unit Templates** with **authored plugin CSS geometry on the same rendered element**.

Therefore a Unit recipe could write `display/grid-template/gap/padding/...` while `plugin.css` or `mobile.css` wrote the same property to the same element. Both source layers could independently look valid and the old gates would still pass.

This is why earlier releases could report style ownership PASS while Windows Electron still exposed source-parity layout regressions.

## Historical re-audit

The current v3.71.34 ownership analyzer was run against clean archived source ZIPs, without changing those releases' application code. The analyzer used each release's own Unit layout recipes while applying the current cross-layer conflict definition.

| Source baseline | Production Unit layouts | SplitPane mounts | Cross-layer conflicts | Data Center | Pulse | Resonance | TER |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3.71.28 | 83 | 1 | **130** | 65 | 65 | 0 | 0 |
| 3.71.29 | 83 | 1 | **130** | 65 | 65 | 0 | 0 |
| 3.71.30 | 83 | 1 | **130** | 65 | 65 | 0 | 0 |
| 3.71.31 | 83 | 1 | **130** | 65 | 65 | 0 | 0 |
| 3.71.32 | 84 | 1 | **127** | 62 | 65 | 0 | 0 |
| 3.71.34 current | 82 | 1 | **0** | 0 | 0 | 0 | 0 |

This confirms the issue was not introduced only by the last Data Center patch. Data Center carried the conflict from its v3.71.28 production Unit cutover, while Pulse carried the same class of conflict from its earlier v3.71.16 production Unit cutover. Resonance and TER are included in the same current audit and do not show this cross-layer geometry conflict class.

## Permanent gate

`tools/quality/unit-runtime-style-ownership.js` now audits every production `unit-presentation.js` and cross-checks:

- Unit Layout recipe geometry;
- explicit Unit `geometry`;
- explicit Unit `responsiveGeometry`;
- SplitPane runtime layout geometry;
- PRIME detail inset geometry;
- matching properties in plugin `plugin.css` and `mobile.css`.

A property collision on the same rendered element fails the release gate.

Current census:

- production Unit presentations: **4**
- Unit Layout mounts: **82**
- SplitPane mounts: **1**
- violations: **0**

## Generic ownership contracts added/clarified

### Layout responsive target

`Layout` may declare `responsiveTarget` so responsive geometry is measured from the semantic containing region rather than from a newly-created or already-shrunk local node. Unit remains the geometry writer; only the measurement source changes.

### ParameterForm outer-grid owner

`ParameterForm` now has a mutually-exclusive outer-layout contract:

- `layoutOwner:'core'` — default; ParameterSchema owns the outer grid.
- `layoutOwner:'host'` — only valid inside a Layout Unit; the host Layout is the sole outer-grid owner.

Field anatomy, control geometry, state, Theme, accessibility and validation remain Core-owned in either mode.

### SplitPane outer-layout owner

`SplitPane` now has:

- `layoutOwner:'core'` — default; Core owns grid/flex/reflow geometry.
- `layoutOwner:'host'` — only valid for an adopted Layout Unit host; accepted host CSS owns outer layout while Core remains the sole resize gesture, persisted size and split-size-token owner.

`layoutOwner:'host'` cannot be combined with Core `reflowBelow`. This makes the two geometry paths structurally mutually exclusive instead of relying on CSS specificity.

## Data Center corrections

- Removed Unit layout recipes/wrappers that competed with the already accepted `.dc-main` source-parity Grid.
- Restored formula/workflow/provenance and chart surfaces as the expected direct Grid children where source parity requires that structure.
- Formula and chart ParameterForms no longer have two outer-grid owners.
- Preview-note right inset is expressed by the Unit Layout owner, not a Data Center CSS patch.
- No Data Center-specific Unit was introduced.

## Pulse corrections

- The production Unit migration was re-audited instead of assuming its earlier "style gate PASS" proved runtime/CSS single ownership.
- File toolbar, active-file head and form-grid accepted details are represented through Unit Layout ownership where Unit writes geometry.
- Result split uses explicit host outer-layout ownership; Desktop/Mobile accepted CSS owns the outer reflow, while Core owns split gesture/state and exposes the canonical split-size token.
- Historical regression tests were updated to protect the accepted spacing at its new canonical owner instead of requiring duplicate plugin CSS.

## Unit architecture conclusion

The intended architecture is not "everything must look the same" and not "plugins may override Unit CSS until they match".

The rule is:

1. **Unit defines the common semantic/structural/state/accessibility contract.**
2. **Reusable geometry recipes provide the default.**
3. **Plugins may express accepted detail geometry only through public generic extension points.**
4. **For every rendered geometry/property path, exactly one owner is active.**
5. **Platform differences are expressed by Presenter/host contracts, not plugin IDs in Core.**
6. **No `Unit_for_xxx` is created merely to reproduce one first-party plugin.**

This preserves both standardization and source-parity flexibility.

## Validation

- Test manifest: **452 / 452 PASS** (executed in original manifest order in bounded ranges after runner timeout)
- Check coverage: **459 / 459 PASS**
  - 448 shared Test/Check cases covered by the Test manifest
  - 11 check-only cases executed separately and passed
  - 4 test-only cases passed
- Mobile: **103 / 103 PASS**
- clean-source Mobile after removing `src/generated`: **103 / 103 PASS**
- Hard Visual Invariants: **87 / 87 PASS**
- Style architecture: **45 authored CSS / 0 `!important` / rendered-property ownership unique**
- Plugin Boundary: **0**
- Plugin manifests/packages: **17 / 17 PASS**
- Scientific parity: **PASS**
- SDK Harness: **PASS**
- Unit runtime ↔ plugin CSS ownership: **0 violations**

Windows Electron screenshot acceptance remains a separate real-host acceptance step; the architecture gate does not claim GPU/font/pixel acceptance on the user's machine.
