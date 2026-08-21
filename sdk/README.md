# DK Data Studio Plugin SDK 1.8

This directory is a **standalone plugin-development kit**. A plugin developer does not need the DK Data Studio source tree.

## Requirements

- Node.js 18 or newer for validation/packaging.
- DK Data Studio 3.57.0 or newer for the current SDK contract.

## Create a plugin

Copy one template directory and change the plugin id/name/version.

```text
sdk/templates/workspace-plugin/     full UI/workbench example
sdk/templates/algorithm-provider/   versioned scientific algorithm example
```

The public runtime entry is `DKDSPlugins.define(manifest, activate)`. New plugins target `apiVersion: "1.8.0"` and declare every Core surface they use in `requiresCore`.

## Validate

```bash
node sdk/tools/dkds-plugin.js validate path/to/my-plugin
```

Validation checks the manifest, referenced files, runtime-manifest parity, declared Core requirements and forbidden infrastructure bypasses.

## Package

```bash
node sdk/tools/dkds-plugin.js package path/to/my-plugin my-plugin.dkplugin
```

Install the resulting `.dkplugin` from DK Data Studio's Plugin Manager.

## Public contract

- `plugin-manifest.schema.json` — machine-readable manifest contract.
- `plugin-api.d.ts` — editor/TypeScript declarations for `DKDSPlugins` and `ctx`.
- `contract.json` — SDK/API/package versions.

Plugins own domain logic, domain state, domain types and domain views. Core owns application infrastructure: project persistence, I/O, artifacts, entities, selection, workspace layout, chart lifecycle, scheduling and plugin lifecycle.

Do not use application source files or private globals from a plugin. If a feature cannot be implemented through this SDK, that is a missing public Core contract and should be added to the SDK/Core rather than worked around by importing application source.
