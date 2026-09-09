# Mobile Semantic Surface Routing — v3.67.25

## Ownership model

The Mobile UI has two layers that must agree but must not own each other's state:

1. **Core workspace runtime** owns whether a workbench surface is mounted/available.
2. **Mobile route state** owns which contextual surface is currently presented on the Mobile platform.

Desktop `autoOpen` is therefore not a valid Mobile visibility signal. It can keep a PRIME mounted for Desktop without forcing Mobile to render or highlight that PRIME.

## Projection

```text
Core Registry / PluginWorkspace
        |
        v
Core Presentation Model
        |
        +---- DesktopPresenter -> Desktop dock/floating placement
        |
        +---- MobilePresenter  -> main / sheet / rail / route
                                      ^
                                      |
                             Mobile route + orientation
```

`MobilePresenter` combines the semantic surface role, current route and actual orientation:

- scientific/data/utility primary -> `main`
- inspector/data-control portrait -> `sheet`
- inspector/data-control landscape -> `rail`
- other secondary analysis surfaces -> `route`

The route selects active PRIME/SUB presentation. Desktop mounted state is only a prerequisite (`active !== false`), not the selection itself.

## Host action semantics

`workspaces.invoke(...)` is a toggle and remains useful for Desktop command behavior.

Mobile navigation requires idempotent activation, so Core now exposes `workspaces.activate(...)`:

- PRIMARY -> `showPrimary`
- PRIME -> `openPrime`
- SUB -> `openSub`

Mobile route close for a PRIME removes only the route. It does not toggle the underlying Desktop-mounted surface.

## Orientation

Mobile Host forwards `DKDSPlatform.profile.orientation` on every Presenter snapshot and republishes on `dkds:platform-change`. This prevents landscape devices from silently using the `portrait` Presenter default.

## Geometry boundary

`native-workspace-presentation.css` only realizes Presenter regions. It does not infer Desktop left/right/bottom placement and does not contain plugin/domain selectors. Desktop portable-placement triggers are suppressed because they would constitute a second geometry owner on Mobile.
