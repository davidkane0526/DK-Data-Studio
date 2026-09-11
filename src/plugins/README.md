# Built-in Plugins

Each non-underscore directory containing `plugin.json` is discovered by `scripts/generate-plugin-index.js`.

Current built-ins include scientific workspaces (`resonance-workbench`, `ter-analysis`, `pulse-analysis`, `data-center`) and smaller support plugins (`flexible-import`, detector/status/shell/safeguard plugins).

Folders beginning with `_` are ignored and may be used as templates/examples.

New scientific plugins should be **infrastructure-first**: use core state, layout, portable views, chart lifecycle, actions, shortcuts, mouse interaction, context menus and selection channels rather than creating a second UI framework inside the plugin. See:

```text
docs/PLUGIN_UI_INFRASTRUCTURE.md
docs/PLUGIN_API.md
```

To add a plugin, copy `_template`, change its manifest and implementation, then run:

```bash
npm run plugin:index
npm run plugin:validate
```
