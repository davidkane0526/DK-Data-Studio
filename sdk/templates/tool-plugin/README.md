# SDK Tool Workspace Example

This is the **Unit-first** Tool Workspace template for Plugin API 1.19.

Tool Workspace keeps the same machine lifecycle as TOP; the only host-level distinction is that Core places its opener under the global Tools entry. The presentation is composed from public Unit Templates and contains no private layout stylesheet.

Use Unit Workspace + PRIMARY/PRIME/SUB for composition, Unit ScientificPlot for scientific content, and named Layout recipes for internal flow. Keep `ctx.ui.workspaceSurface` only for advanced low-level infrastructure cases.

Validate/package:

```bash
node sdk/tools/dkds-plugin.js validate sdk/templates/tool-plugin
node sdk/tools/dkds-plugin.js package sdk/templates/tool-plugin sdk-tool-example.dkplugin
```
