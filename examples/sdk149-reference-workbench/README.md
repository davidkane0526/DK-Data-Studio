# Scientific Reference Studio

SDK 1.49 reference workbench for `accepted-scientific-v1`.

This example is intentionally **not** an internal scientific-analysis plugin and intentionally ships **no plugin CSS**. It proves that a third-party workbench can obtain the accepted complex scientific-panel layout and chrome details using public SDK composition only.

It uses:

- `ctx.ui.scientificWorkbench.create(...)`
- `profile:'accepted-scientific-v1'`
- `template:'analysis-main'`
- `template:'data-control'`
- `template:'inspector'`
- `template:'plot-group'`
- public PlotGroup / PlotView behavior

The example contains no private built-in-plugin class names and no plugin-id special case exists in Core. Its profile geometry is release-gated by `tests/test-sdk149-reference-plugin-parity.js`.

Validate it with:

```bash
node sdk/tools/dkds-plugin.js validate examples/sdk149-reference-workbench
```
