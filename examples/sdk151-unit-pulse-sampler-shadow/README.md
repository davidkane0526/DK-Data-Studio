# Pulse Sampler Tool Unit Shadow

This example is the non-production Unit reconstruction and live acceptance harness for `com.dkds.tools.pulse-sampler`.

## Live side-by-side stage

The shadow now connects through the dependency-gated domain adapter:

`com.dkds.tools.pulse-sampler/live`

It consumes the **same production state/result owner** and routes visible Unit interactions back to the **same production actions**. It does not contain a second pulse generator, a second segment model, a second extraction task, or a second project-state store.

Live projections cover:

- Vd / Vs / Vg active channel;
- all eight pulse parameters;
- active-channel segment rows;
- merged waveform rows and curve points;
- source/column/trim controls;
- extraction result rows and result-plot points;
- generate/add/clear/remove/export/extract/copy/result-mode actions.

The shadow still ships **no CSS**. Geometry and component appearance remain expressed by the existing public 41-Unit catalog and accepted reusable Layout recipes.

`productionReplaced` remains `false`. The next stage is a formal production presentation cutover only after Windows/Mobile acceptance of this live parity baseline.
