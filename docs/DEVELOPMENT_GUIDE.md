# Development Guide — plugin branch

## Normal development

GUI-first on Windows:

```text
GRS_GUI.cmd
```

Command line:

```bat
GRS.cmd dev
GRS.cmd check
GRS.cmd test
```

Before delivery, run at least:

```bat
GRS.cmd check
GRS.cmd test
```

## Windows package

```bat
GRS.cmd build-windows
```

Outputs go to `dist/`.

## Android

```bat
GRS.cmd android-check
GRS.cmd android-build
GRS.cmd android-install
```

Or use the Android tab in `GRS_GUI.cmd`.

## LAN update

```bat
GRS.cmd update-server
GRS.cmd publish-update
GRS.cmd build-publish-update -Version 3.20.0-plugin.2
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
GRS.cmd plugin-validate
```

For an installable external plugin, use `examples/external-plugins/` as the starting point.

## UI shell rule

The desktop shell uses one command row above project tabs. Do not reintroduce a permanent second toolbar row. New plugin actions must declare `priority`, `order`, `section` and `activity`; the host decides what stays visible and what moves to overflow.

Use the semantic font/control tokens in `src/style.css` rather than introducing new arbitrary font sizes for ordinary controls.
