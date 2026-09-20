# TER Unit-only Shadow Reconstruction

This example is a **parallel reconstruction fixture**, not a replacement for `builtin.ter-analysis`.

It rebuilds the visible TER workbench from the public `ctx.ui.unitTemplates` facade and deliberately ships **no CSS**. The production TER plugin remains byte-frozen. Domain actions are mapped to the native TER service method names and recorded as shadow intents; the fixture does not duplicate the scientific calculation or mutate production TER state.

The fixture covers:

- page + page header actions;
- the `data-control` PRIME with TER settings, display controls and schema-driven transform controls;
- summary strip;
- one responsive PlotGroup containing all seven TER plots;
- square heatmap geometry, the special R–V card anatomy, PlotView portability/export contracts and ScientificPlot interaction policy;
- export action row and two managed result tables;
- adaptive Desktop/Mobile presentation through the same semantic workbench contract.

See `parity.json` and `docs/reports/TER_UNIT_SHADOW_PARITY_3.71.1.md` for the seven-layer comparison and the contract gap discovered by this real reconstruction.
