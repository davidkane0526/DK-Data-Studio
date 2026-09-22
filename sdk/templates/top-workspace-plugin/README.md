# SDK TOP Workspace Example

This is the **Unit-first** reference template for a true TOP workbench in Plugin API 1.19.

A TOP still requires the same machine lifecycle contract: matching `workspace.role:"top"`, `window.activity`, `ctx.ui.activities.add({openMode:"window"})`, and `ctx.ui.topWorkspace.register(...)`. The UI composition itself should now be built from `ctx.ui.unitTemplates`.

Default authoring path:

```text
domain/state -> Unit Page/Header/Layout -> Unit Workspace -> PRIMARY / PRIME / SUB -> Presenter
```

The template intentionally ships **no plugin.css** and no hand-written page HTML. Named Unit variants provide the default complete presentation. Add bounded Unit parameters only when domain structure genuinely requires them.

The lower-level `ctx.ui.workspaceSurface` facade remains available as an advanced Plugin API primitive; do not use it as the starting point for ordinary generated/new workbenches.

Plugin API 1.19 keeps a **main-only PRIMARY** contract even when authored through Unit Workspace. PRIMARY is exactly one semantic main surface; persistent controls/parameters/inspectors are separate PRIME surfaces and derived full analyses are SUB surfaces. This cutover removes `leftNode` / `leftHtml` from the public contract rather than recreating a Desktop-shaped left rail inside the Unit-first template.

Validate/package:

```bash
node sdk/tools/dkds-plugin.js validate sdk/templates/top-workspace-plugin
node sdk/tools/dkds-plugin.js package sdk/templates/top-workspace-plugin sdk-top-example.dkplugin
```
