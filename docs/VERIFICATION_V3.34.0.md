# v3.34.0 verification — plugin visual contract and GRS-parity Resonance

## Architecture findings

1. The project already had general UI font tokens, but plugin workbenches could bypass them. Data Center and Pulse still contained historical 8–10 px text, and several action bars inherited wrapping behavior that produced multiple rows before horizontal space was exhausted. This was a UI-infrastructure contract gap, not a Data Center-only defect.
2. The supplied `graphene_resonance_studio` reference uses a D3/SVG interactive main plot. The v3.33 Resonance implementation used a Plotly main plot, so styling the Plotly cards could not reproduce the reference interaction or curve-color semantics. The View/Interaction Runtime therefore required replacement while keeping the current Controller, Artifact, Selection, detector-capability and project-state architecture.
3. Dedicated TOP windows did not include D3 in the generic dependency allowlist/loader. SUPER could therefore render a D3 surface while a demoted TOP could not. This was a host dependency-contract defect and was fixed in Core.
4. The parity root initially collapsed its main plot to zero height after being mounted inside AnalysisWorkbench because the reference `main-workspace` grid-fill constraint was missing. This was fixed at the shared Resonance View layout boundary rather than with a TOP-specific workaround.

## Visual checks on Linux

Actual Chromium rendering was used for the workbench DOM/CSS instead of relying only on source inspection. At a 1440 px desktop viewport:

- Data Center: button text 12.5 px, button height 32 px, labels 12 px, metadata 11 px; the tested toolbar computed `nowrap` and remained one row.
- TER: button text 12.5 px, 32 px controls and a single-row action bar.
- Pulse/Read: 12.5 px buttons, 12 px labels, 32 px controls and a single-row toolbar.
- Resonance parity layout: 280 px left data/control rail plus a full-height primary plot workspace; the primary chart wrapper measured non-zero width/height and the 1440 px header actions fit without wrapping. Synthetic reference sweeps rendered with the same semantic palette: Vg mapped through Turbo, reverse sweeps dashed, and peak families using the reference cool/warm discrete palettes.

The source ZIP does not contain `node_modules`, and the server could not complete an external npm dependency download during this session. Therefore the Linux visual comparison used system Chromium for real DOM/CSS/layout rendering and a synthetic SVG chart for color/layout verification, while D3 event behavior is protected by the project runtime/architecture regression tests rather than claiming a downloaded Electron/D3 browser run.

## Automated validation

- `npm test`: PASS
- `npm run check`: PASS (including science parity and plugin-boundary validation)
- `scripts/test-plugin-visual-contract.js`: PASS
- `scripts/test-resonance-shared-architecture.js`: PASS
- `scripts/test-plugin-windows.js`: PASS
- TER live Artifact integration: PASS (`1 Vg × 40 Vd`)

