# Development Guide — v3.61.x


## Dependency installation

For an unchanged checkout with committed lockfiles:

```bash
npm ci
cd mobile && npm ci
```

Use `npm install` only when intentionally changing dependencies; review and commit the corresponding lockfile update. Desktop and mobile are independent npm projects.

## Normal development

GUI-first on Windows:

```text
DKDS_GUI.cmd
```

Command line:

```bat
DKDS.cmd dev
DKDS.cmd check
DKDS.cmd test
```

Before delivery, run at least:

```bat
DKDS.cmd check
DKDS.cmd test
```

## Windows package

```bat
DKDS.cmd build-windows
```

Outputs go to `dist/`.

## Android

```bat
DKDS.cmd android-check
DKDS.cmd android-build
DKDS.cmd android-install
```

Or use the Android tab in `DKDS_GUI.cmd`.

## LAN update

```bat
DKDS.cmd update-server
DKDS.cmd publish-update
DKDS.cmd build-publish-update -Version 3.22.0
```

The server implementation is under `services/update-server/`.

## Plugin development

Do not edit the host merely to add a scientific feature. Read:

- `docs/PLUGIN_API.md`
- `docs/WORKSPACE_PLUGIN_API.md`
- `docs/PLUGIN_PACKAGES.md`
- `docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md`

For a new built-in plugin, add a folder below `src/plugins/`, then run:

```bat
DKDS.cmd plugin-validate
```

For an installable external plugin, application source is no longer required. Distribute/copy only `sdk/` and use:

```bash
node sdk/tools/dkds-plugin.js validate my-plugin
node sdk/tools/dkds-plugin.js package my-plugin my-plugin.dkplugin
```

Start from `sdk/templates/top-workspace-plugin/` for a dedicated TOP, `sdk/templates/tool-plugin/` for a Tool Workspace, the generic workspace template for non-TOP UI contributions, or `sdk/templates/algorithm-provider/` for a versioned scientific algorithm. `examples/external-plugins/` remains an application-repository integration example.

## UI shell rule

The desktop shell uses one command row above project tabs. Do not reintroduce a permanent second toolbar row. New plugin actions must declare `priority`, `order`, `section` and `activity`; the host decides what stays visible and what moves to overflow.

Use the semantic font/control tokens in `src/style.css` rather than introducing new arbitrary font sizes for ordinary controls.
