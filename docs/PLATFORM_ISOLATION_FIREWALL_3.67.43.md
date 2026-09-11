# Platform Isolation Firewall — v3.67.43

## Goal

Desktop and Mobile share the same host-neutral Core state, project/data lifecycle, plugin runtime, scientific algorithms and semantic Presentation contract. They must **not** share platform geometry, platform mutation code or platform-only paint ownership.

A Mobile-only change must be unable to alter Desktop layout or visual behavior accidentally. A Desktop-only change must likewise be unable to become a Mobile layout patch.

## Executable platform firewalls and visual-closure policy

### 1. Immutable host identity

`src/index.html` decides the document host before authored CSS loads and exposes it as both:

- immutable `window.__DKDS_HOST_KIND__`;
- `html[data-dkds-host]` for CSS scoping.

`src/core/host/platform-boundary.js` treats the immutable value as authoritative. The native marker class is **not** a host detector. Accidentally adding `.react-native-client` to a Desktop document therefore cannot turn Desktop runtime logic into Mobile logic.

### 2. Mutually exclusive Presentation shells

The shared UI runtime instantiates exactly one platform shell:

```text
host-neutral Presentation Model
            │
            ├── desktop/web → Desktop Presentation Shell
            └── mobile      → Mobile Surface Presenter
```

The Mobile Presenter also owns an internal mutation guard. Even if it is called accidentally on a Desktop document, it returns before querying, wrapping, reparenting or changing workspace DOM.

Long term, generated runtime packaging should move from “both modules bundled, one instantiated” to **separate Desktop and Mobile platform entry bundles**. That is a packaging hardening step, not a second Core.

### 3. Platform stylesheet firewall

Desktop does not activate `mobile.css`. The stylesheet is present in the document only as `media="not all"` and is activated only when the immutable host identity is `mobile`.

Core native selectors additionally require two independent keys:

```css
html[data-dkds-host="mobile"].react-native-client ...
```

Plugin native geometry must live in a separate plugin-owned `mobile.css` and may only target a plugin-owned native marker provided from `ctx.runtime.isNativeClient`. Native plugin CSS may not target Core shell ancestors.

### 4. Desktop visual closure is behavioral, not a whole-file hash freeze

The v3.67.40 SHA-256 fixture is retained only as historical regression archaeology. From v3.67.54 onward it is **not** an active release gate. Whole-file hashes cannot distinguish a deliberate owner refactor from an accidental regression, and a matching hash does not prove computed layout, hover geometry, scroll chaining, drag behavior or rendered pixels.

Active platform isolation remains executable through immutable host identity, mutually exclusive Presenter activation, dual-key Mobile CSS scope, platform-neutral shared controllers and runtime inertness tests. Desktop visual closure uses semantic ownership/source contracts plus real Chromium/Windows rendering and interaction checks. Mobile-only work still must not change Desktop behavior unless the task explicitly includes Desktop changes, but that rule is enforced by ownership and behavioral evidence rather than a brittle checksum.

## State isolation rules

Platform UI state must be namespaced. Mobile drawer width, overlay state and Mobile workspace geometry may not reuse Desktop docking/portable-view persistence keys. Shared scientific/project/plugin state remains host-neutral.

A platform-specific copy of Core is forbidden. The correct split is:

```text
Shared Core / algorithms / state / semantic contracts
                    │
        ┌───────────┴───────────┐
        │                       │
Desktop Presenter          Mobile Presenter
Desktop Interaction        Mobile Interaction
Desktop geometry/state     Mobile geometry/state
Desktop platform CSS       Mobile platform CSS
```

## Source ownership rule for future Mobile work

A routine Mobile-only change should be confined to Mobile Host/Presenter/Interaction code, native platform styles, Mobile client code, or a plugin-owned `mobile.css`. If it requires changing a shared/Desktop visual owner, the task must be treated as a cross-platform change and receive Desktop parity verification rather than being hidden inside Mobile-only work.

Direct checks of `.react-native-client` inside shared Core are legacy risk points. They must not proliferate. Future cleanup should migrate them behind `DKDSPlatformBoundary` or semantic runtime capabilities; changes to shared Desktop owners require an explicit parity-tested refactor.
