# Built-in Plugins

Each non-underscore directory containing `plugin.json` is discovered by `scripts/generate-plugin-index.js`.

Current built-ins:

- `flexible-import`
- `resonance-workbench`
- `ter-analysis`
- `pulse-analysis`

Folders beginning with `_` are ignored and may be used as templates/examples.

To add a plugin, copy `_template`, change its manifest and implementation, then run:

```bash
npm run plugin:index
npm run plugin:validate
```
