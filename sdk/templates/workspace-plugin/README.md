# SDK Standalone Workbench Example

This is the **Unit-first** standalone workbench template for Plugin API 1.19.

Default authoring path:

```text
domain/state -> ctx.ui.unitTemplates -> Unit Workspace -> PRIMARY / PRIME / SUB -> Presenter
```

Start from named Unit variants and Layout recipes. Do not begin a new plugin by writing page HTML, workspace geometry, private CSS grids, or host-specific Desktop/Mobile branches. The lower-level `ctx.ui.workspaceSurface` API remains public for advanced infrastructure work, but it is not the default authoring path.

Use `sdk/templates/top-workspace-plugin/` when the plugin is a true TOP with a dedicated window. Use `sdk/UNIT_TEMPLATES.md` and `sdk/UNIT_RESPONSIVE_DENSITY.md` for the public composition contract.

Validate/package with:

```bash
node sdk/tools/dkds-plugin.js validate sdk/templates/workspace-plugin
node sdk/tools/dkds-plugin.js package sdk/templates/workspace-plugin workspace-example.dkplugin
```
