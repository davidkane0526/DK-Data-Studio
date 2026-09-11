# Development Guide — v3.61.x


## Dependency installation

The current repository does **not** commit root/mobile npm lockfiles, so the supported install path is:

```bash
npm install --no-audit --no-fund
cd mobile && npm install --no-audit --no-fund
```

On Windows, prefer `DKDS.cmd install-deps` or `DKDS_GUI.cmd`; the toolbox also manages the shared npm/Electron caches and Electron binary installation separately. If lockfiles are introduced later, CI and this guide should switch together to `npm ci`.

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

## Build proxy

The build toolbox has one shared proxy contract for npm/npx, Electron/electron-builder, Git child processes, Gradle and managed JDK downloads. The easiest persistent setup is the **网络与代理** page in `DKDS_GUI.cmd`.

One-off Windows build through a local HTTP proxy:

```bat
DKDS.cmd build-windows -Proxy http://127.0.0.1:7890
```

Or use ordinary environment variables before starting the toolbox:

```bat
set HTTPS_PROXY=http://127.0.0.1:7890
set HTTP_PROXY=http://127.0.0.1:7890
set NO_PROXY=127.0.0.1,localhost
DKDS.cmd build-windows
```

Inspect the effective configuration without building:

```bat
DKDS.cmd network
```

`-ProxyMode off` explicitly disables inherited/configured proxies for that toolbox process. Proxy credentials are redacted from diagnostics. HTTP/HTTPS proxies are fully supported for PowerShell-managed JDK downloads; Node/npm/Electron may additionally inherit other proxy schemes supported by their own transports.

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

Use the semantic font/control tokens exposed through `src/core.css` / Theme Contract rather than introducing arbitrary font sizes for ordinary controls.
