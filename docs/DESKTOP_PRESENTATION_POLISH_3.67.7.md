# DK Data Studio 3.67.7 — Desktop Presentation Polish

This patch does **not** reopen the platform-neutral Presentation Contract frozen in 3.67.6. The fixes are below that boundary:

- Desktop `PluginWorkspace` dock geometry is layout-only. Material paint belongs to the mounted semantic surface, preventing nested translucent backgrounds.
- Desktop side rails span the workspace height; the scientific bottom dock occupies the center canvas only.
- Fixed desktop control rails may opt out of `PortableView` placement chrome without creating a second panel implementation.
- Desktop Presenter surface commands are ordered before plugin utility commands; plugin utilities may remain trailing.
- Shell/window command geometry and shared panel-close chrome are Core desktop/component presentation concerns, not plugin-domain styles.

Project-size policy:

- `src/generated/runtime/*`, generated plugin index/SDK authoring reference, `assets/dkds-icon.png`, and generated mobile icons are build products and stay ignored.
- They may exist during validation, but should not be included in a clean Dev Repo package because `npm test`, `npm run check`, `npm start`, and install/build scripts recreate them.
- Preserve `.git` for a Dev Repo, then compact reachable Git objects before packaging rather than deleting history.
