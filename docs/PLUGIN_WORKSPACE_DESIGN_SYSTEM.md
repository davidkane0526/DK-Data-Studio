# Plugin Workspace Design System — v3.35

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
