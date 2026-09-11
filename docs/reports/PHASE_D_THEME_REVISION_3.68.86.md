# Phase D Theme Revision — 3.68.86

## Goal

Phase D step 4 narrows Theme invalidation so ordinary DOM does not participate in a revision-driven repaint loop. Theme revision is a Core execution signal only for consumers that cannot update from CSS custom properties alone: raster surfaces and code that must read computed style.

## Before

Theme setting changes projected root tokens and then emitted the broad `dkds:theme-changed` event. Component Appearance, Material Renderer and Scientific Chart could all react to that event, which allowed a single setting edit to schedule additional document-level composition/repaint work after the Theme transaction had already changed tokens. Scientific Chart also depended directly on the broad global event.

## 3.68.86 ownership

Core Theme Runtime now owns a selective revision channel:

```text
Theme transaction
  ├─ update active root/profile tokens
  ├─ synchronize Material + Component composition once
  ├─ publish Theme revision
  │    └─ FrameScheduler coalesces `theme.revision.notify`
  │         ├─ raster consumers
  │         └─ computed-style consumers
  └─ broadcast semantic `dkds:theme-changed` state
       ├─ Status Monitor state text
       └─ Mobile Host native-shell snapshot
```

`subscribeRevision()` accepts only:

- `raster`
- `computed-style`

A DOM consumer is rejected. This is intentional: revision is not a second general Theme event bus.

## Current consumers

At 3.68.86, Scientific Chart is the only authored selective subscriber and registers as `computed-style`. The Canvas heatmap remains reached through the Scientific Chart Theme paint path, so no duplicate raster subscription is required.

The only broad `dkds:theme-changed` listeners left in authored source are semantic bridges:

- Status Monitor updates the displayed Theme mode/profile state.
- Mobile Host publishes the Theme snapshot required by the Native shell.

Component Appearance and Material Renderer no longer subscribe to the broad event for repaint.

## Active vs inactive settings

An active-profile Theme setting/reset performs exactly one synchronous Core visual composition before semantic broadcast and advances Theme revision. Editing an inactive Theme profile persists that profile setting without repainting the active application and without advancing the active Theme revision.

## Coalescing

Revision publication uses the shared Core `DKDSFrameScheduler` task id `theme.revision.notify`. Repeated Theme changes before the next frame replace the pending task and expose the latest pending revision snapshot when the frame flushes. This bounds raster/computed-style notification work during rapid controls such as Theme sliders.

## Contract boundary

This is an internal Core invalidation change. Public versions remain:

- SDK: 1.36.0
- minimum app for SDK: 3.68.81
- Plugin API: 1.19.0
- Theme Contract: 3.10.0

Third-party plugins do not receive a new public revision hint and cannot choose Core repaint strategy.

## Acceptance / verification

The 3.68.86 regression verifies that:

- `consumer:'dom'` Theme revision subscription is rejected;
- only raster/computed-style are accepted;
- Scientific Chart uses selective revision and not the broad Theme event;
- Component Appearance and Material Renderer do not broad-listen for Theme repaint;
- active setting changes synchronize Material/Component composition once;
- inactive-profile settings do not advance active revision;
- Status Monitor and Mobile Host remain semantic broad-event bridges only.

Release-gate results for this source state are recorded in `HANDOFF_3.68.86_WIP.md`.
