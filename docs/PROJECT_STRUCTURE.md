# Project Structure — plugin branch

This repository intentionally keeps the root small and separates runtime, tools, services, docs, mobile, plugins and scientific code.

```text
Graphene Resonance Studio/
├─ GRS.cmd                  # single CLI entry on Windows
├─ GRS_GUI.cmd              # graphical developer toolbox
├─ main.js                  # Electron main entry
├─ preload.js               # Electron renderer bridge
├─ update-client.js         # desktop LAN updater client
├─ lan-web-server.js        # embedded LAN web server
├─ plugin-package.js        # .grsplugin package helpers
├─ package.json
├─ README_CN.md
├─ AGENTS.md
├─ CHANGELOG.md
├─ CONTRIBUTING.md
│
├─ src/
│  ├─ core/                 # generic host/platform/plugin/data/workflow infrastructure
│  ├─ science/              # shared runtime-independent scientific algorithms
│  ├─ plugins/              # built-in plugins
│  ├─ app.js                # compatibility host / mature workspace bridge
│  ├─ index.html
│  ├─ style.css
│  └─ web-bridge.js
│
├─ mobile/                  # React Native / Expo Android shell
├─ services/
│  └─ update-server/        # LAN update server and release storage
├─ config/
│  └─ update-config.default.json
├─ tools/
│  └─ windows/
│     ├─ grs-tools.ps1      # all Windows developer/build/update operations
│     └─ grs-gui.ps1       # WinForms launcher for grs-tools.ps1
├─ scripts/                 # cross-platform Node maintenance/test/build scripts
├─ examples/                # external plugin examples
└─ docs/
   ├─ guides/               # practical build/update/toolbox guides
   ├─ releases/             # release snapshots
   └─ architecture/API/development docs
```

## Root-file policy

New helper scripts should not be added to the repository root. Add reusable cross-platform scripts under `scripts/`, and Windows-only tooling under `tools/windows/`.

Do not create new one-off `.cmd` files. Add a new `-Action` to `tools/windows/grs-tools.ps1`, then expose it in `tools/windows/grs-gui.ps1` if it is useful to non-command-line users.

The only root CMD launchers should remain:

```text
GRS.cmd
GRS_GUI.cmd
```
