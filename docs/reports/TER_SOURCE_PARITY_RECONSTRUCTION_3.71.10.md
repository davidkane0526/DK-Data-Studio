# TER Source-Parity Reconstruction — v3.71.10 WIP

## Purpose

v3.71.10 corrects the migration model after the first formal TER Unit cutover proved that semantic/functional parity alone does not guarantee a 1:1 native reconstruction.

The accepted native source is now the reconstruction oracle. Unit Templates own only the cross-plugin minimum contract: semantics, owner boundaries, lifecycle, accessibility, mandatory structure and shared material/theme behavior. A plugin may retain explicit accepted detail geometry until all native plugins have been reconstructed and those parameters can be classified globally.

## Project-wide reconstruction rule

1. Every first-party native plugin must first be reproduced 1:1 from its accepted source.
2. Unit abstractions represent the minimum common denominator across plugins, not a mandatory final appearance.
3. Plugin-specific detail parameters may remain explicit: width/height/min/max, spacing, grid/flex ratios, control widths, local anatomy, responsive thresholds and similar accepted geometry.
4. The plugin may not use those detail parameters to reclaim semantic paint/theme/material/lifecycle ownership from Core/Units.
5. Only after every native plugin passes 1:1 reconstruction do we classify parameters as:
   - shared defaults;
   - plugin-tunable details;
   - immutable hard contracts.
6. One already-decided hard contract is immediate: **parameter-purpose panels never have a title/header bar** on Desktop, Mobile, first-party, third-party or Unit-based presentations.

## TER reconstruction changes

- Restored `src/plugins/ter-analysis/plugin.css` as an accepted geometry-only source and restored it to the exact pre-cutover v3.71.6 bytes.
- Accepted TER geometry stylesheet SHA-256:
  `a601985b774667acb6c8d8fea9255db87537a46afe4bdecc2d07504ef7a1442b`
- Restored manifest ownership of that stylesheet.
- Retained Unit/Core ownership of action/header semantics, Material/Theme paint, scientific rendering lifecycle and accessibility.
- Restored accepted TER detail geometry including:
  - 14 px PlotGroup gap;
  - 118/135 px analysis parameter inputs;
  - 105/112 px heatmap display controls;
  - 860 px / 760 px heatmap card width behavior;
  - accepted R–V card/header anatomy and content sizing;
  - compact transform form;
  - accepted responsive threshold.
- Preserved accepted state namespaces instead of inventing cutover-only state:
  - data-control `presentation-v1`;
  - PlotView `ter-plot-view-v3`.
- Parameter PRIME is hard-normalized titleless/headerless/chromeless. Its content starts directly at the panel body.
- `accepted-scientific-data-control` no longer implies a visible parameter titlebar.
- Generic `canonical-header` PRIME adoption remains intact for non-parameter consumers such as Pulse.
- The TER shadow example was aligned with source-parity geometry and also made titleless for parameter-purpose PRIME.
- Private TER geometry is now explicitly represented in the native geometry census rather than pretending TER has no plugin detail geometry.

## Important ownership boundary

The restored TER stylesheet is geometry-only. Tests continue to reject plugin-owned semantic paint/typography such as background, color, borders, shadows and font ownership. Core/Unit remains the visual/material owner; TER only preserves accepted layout/detail geometry needed for 1:1 reproduction.

## Validation

Final source baseline:

- App: `3.71.10`
- SDK: `1.51.10`
- Plugin API: `1.19.0`
- Unit Templates: `2.5.6`
- Unit count: `41`
- Android versionCode: `151`

Validation completed on the final source:

- Test manifest: **431/431 covered and PASS**.
- Check coverage: **438/438 covered and PASS** (`427` shared with test, `11` check-only; manifest relationship verified by the current-contract coverage gate).
- Mobile: **103/103 PASS**.
- SDK Harness: **PASS**.
- Hard Visual Invariants: **87/87 PASS**.
- Architecture Hygiene: **PASS**.
- Native Analysis strict audit: lifecycle/dialog/observer/timer/host-global/orphan = **0**.
- Plugin manifests/packages: **17/17 PASS**.
- Scientific parity: **PASS**.
- Plugin Boundary: **0**.
- Authored CSS: **0 `!important`**.
- Native geometry census: **477 rules / 1372 properties** expressible through Unit/accepted-detail contracts.
- TER production cutover, side-by-side live presentation and real numeric parity remain PASS.

## What is not claimed

This is a source-parity reconstruction baseline, not a claim that the user has already visually accepted the Windows Electron result. Real Windows Electron comparison remains mandatory before TER is marked visually closed. If a mismatch remains, the accepted native source should be used to identify the missing detail parameter or structural contract; do not tune toward a screenshot by arbitrary pixel patches.

## Next work

Continue from this exact baseline in a new conversation:

1. Run/inspect TER in real Windows Electron against the accepted pre-cutover TER. Any mismatch must be traced back to source anatomy/geometry/state behavior and expressed as a Unit parameter or plugin detail contract.
2. Once TER is truly 1:1, apply the same source-parity method to Pulse Analysis.
3. Then Resonance Workbench, Data Center and the remaining first-party plugins.
4. Do **not** globally normalize detail parameters during this phase.
5. After all first-party plugins are 1:1, perform a cross-plugin parameter census and decide shared defaults vs tunable plugin details vs immutable contracts.
