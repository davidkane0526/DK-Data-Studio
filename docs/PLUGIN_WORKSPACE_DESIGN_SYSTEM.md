# Plugin Workspace Design System — v3.37

## Goal

The mature Graphene Resonance Studio workspace is the visual and interaction reference for DK Data Studio scientific plugins. Resonance is **not** a special shell. Its stable layout and direct-manipulation behavior are extracted into Core primitives that every plugin may consume.

The design system has two layers:

```text
Core Plugin Workspace Design System
├─ PluginWorkspace
│  ├─ PRIMARY / PRIME / SUB semantics
│  ├─ left / main / right / bottom / overlay regions
│  ├─ split resizing
│  ├─ floating + docking
│  └─ host-invariant SUPER / TOP composition
└─ ScientificCurveSurface
   ├─ continuous curve palette (Turbo by default)
   ├─ direction line semantics
   ├─ direct curve selection
   ├─ modifier + curve action
   ├─ box range selection
   ├─ Ctrl box zoom
   ├─ wheel zoom around pointer
   ├─ double-click reset
   ├─ draggable snapped markers
   ├─ modifier + right-click marker action
   └─ editable width handles
```

Plugins own domain meaning and data. Core owns reusable interaction mechanics.



## v3.37 workspace ordering and portable-view scopes

The control/data rail and scientific canvas express responsibility, not a mandatory percentage. Splitters and responsive hosts may change their actual widths.

PRIMARY declares scrolling explicitly: `contained` is for direct-manipulation canvases whose inner renderer owns zoom/pan; `auto` is for long analysis workspaces whose content must remain vertically reachable.

Portable views distinguish two floating scopes. `float` is scientific-canvas managed and participates in edge docking. `global` is whole-plugin free floating and never auto-snaps into the scientific dock zones. Left/right/bottom dock zones stack multiple occupants instead of placing them at the same absolute coordinates.

SUB is a workspace-level page, not a scientific-canvas child. Opening a SUB hides the PRIMARY canvas and gives the SUB the full plugin content region with independent scrolling.

Core PortableView owns close/collapse and plot-resize lifecycle. Plugins provide domain callbacks, not duplicate window mechanics.

System edit commands use the active-plugin edit provider contract. Undo/deselect are shell commands whose implementation is supplied by the active plugin when supported.

## v3.36 scientific-canvas geometry

GRS is the reference implementation for the common control/science split. Fixed placement commands use a **scientific canvas**, not the entire plugin rectangle:

```text
PluginWorkspace
├─ control rail (~1/5)
└─ scientific canvas (~4/5)
   ├─ canvas-left
   ├─ canvas-main
   ├─ canvas-right
   ├─ canvas-bottom
   └─ canvas-overlay / floating
```

The ~1/5 and ~4/5 ratio is a default visual language rather than an absolute prohibition. Splitters remain resizable. Explicit Left/Right/Bottom placement buttons stay inside the scientific canvas; manual floating can be moved more freely within that canvas and snaps to its edges. Core prevents a fixed scientific child from being interpreted as an application-side panel.

A PRIME or portable scientific child therefore uses the same coordinate system in SUPER and TOP. A host transition must not rewrite its internal placement. Persisted placement keys may use `stateVersion` when geometry semantics change, so obsolete coordinates are not restored into a new workspace model.

### Host command projection

Plugin commands have one semantic definition and different **presentation hosts**:

- SUPER: PRIME/SUB commands are contributed to the DKDS top toolbar; the plugin does not render a duplicate local command strip.
- TOP: the same commands are rendered in the independent plugin-window header.
- Export is a single semantic menu in either host.

This is presentation transformation only. The underlying PRIME/SUB views, controller state and capabilities are identical.

### Performance boundary

Direct-manipulation surfaces must separate pointer-frequency visual updates from state/render commits. During drag, Core updates the affected SVG marker/band/handle directly. Domain state is committed continuously as needed, but expensive full surface/Plotly rebuilds are deferred until drag end or a coalesced animation frame.

## Host invariance

A TOP promoted to SUPER and a SUPER demoted to TOP must keep the same internal workspace tree and capabilities.

```text
SUPER host                 TOP host
    │                          │
    └── PluginWorkspace        └── PluginWorkspace
        └── same plugin            └── same plugin
            PRIMARY/PRIME/SUB          PRIMARY/PRIME/SUB
```

`hostMode` is metadata for lifecycle/debugging. It must not be used to select a reduced renderer, alternative DOM tree, different chart palette, or different interaction set.

Allowed host-level differences:
- PRIME/SUB host controls;
- native window title/close affordances;
- promotion/demotion controls;
- outer window geometry.

Not allowed to change on SUPER/TOP transition:
- plugin toolbar/content layout;
- plot semantics/colors;
- selection behavior;
- domain commands;
- inspector/group content;
- range/zoom/drag behavior;
- Artifact/Selection access.

## API

Preferred workspace API:

```js
const wb = ctx.ui.pluginWorkspace.create(root, {
  header: false,
  activity: 'my-analysis',
  hostMode: ctx.host.isAuxiliaryWindow ? 'top' : 'super'
});

wb.compose({
  primary: { ... },
  primes: [ ... ],
  subs: [ ... ]
});
```

`ctx.ui.workspaceSurface` is the semantic composition facade. `ctx.ui.analysisWorkbench` and `ctx.ui.analysisSurface` remain compatibility aliases.

Preferred direct scientific curve API:

```js
const plot = ctx.ui.scientificPlot.create(svg, {
  container,
  xTitle: 'Voltage (V)',
  yTitle: 'Current (A)',
  getCurves: () => curves,
  // Keep scientific colors stable even when a subset of curves is hidden.
  getColorDomainValues: () => allGateVoltages,
  getMarkers: () => markers,
  getView: () => state.view,
  setView: next => state.view = next,
  onCurveSelect({curve}) { ... },
  onCurveModifiedClick({curve, x}) { ... },
  onMarkerDrag({marker, curve, index, point}) { ... },
  onRangeSelect(range) { ... },
  onWheelZoomStart() { ... }
});
```

Core supplies geometry, stable color-domain handling, pointer interaction and zoom lifecycle. A plugin maps those neutral events to scientific operations.

## Visual tokens

The GRS-derived workspace uses the shared plugin type scale and adds workspace-level geometry tokens:

```css
--plugin-font-body
--plugin-font-label
--plugin-font-meta
--plugin-font-title
--plugin-font-section
--plugin-control-height

--plugin-workspace-sidebar-width
--plugin-workspace-panel-radius
--plugin-workspace-panel-border
--plugin-workspace-surface
--plugin-workspace-muted-surface
--plugin-workspace-grid
--plugin-workspace-shadow
--plugin-workspace-tool-gap
--plugin-workspace-panel-gap
```

Plugins should not create private replacements for these values unless the scientific representation genuinely requires it.

## Resonance reference implementation

`builtin.resonance-workbench` is the first full reference consumer:
- the plugin supplies resonance sweeps/peaks and scientific commands;
- `PluginWorkspace` owns PRIMARY/PRIME/SUB and placement;
- `ScientificCurveSurface` owns main-plot direct manipulation;
- SUPER and TOP call the same `mountUnified()` composition.

The architecture guard `scripts/test-plugin-workspace-foundation.js` prevents these Core capabilities from drifting back into private resonance plumbing.
