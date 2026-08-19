# DK Data Studio Analysis Workbench Architecture (v3.30)

## 1. Rule of ownership

DK Data Studio Core owns reusable application infrastructure. Scientific plugins own domain state, algorithms, domain commands, scientific ViewModels, and view content.

A plugin must not implement a second window manager, docking system, keyboard router, chart resize manager, selection bus, or provider registry when the Core service can express the requirement.

The standard stack is:

```text
Plugin Controller / Scientific services
            ↓
Shared Views + Feature Runtime
            ↓
Core Analysis Workbench
  ├─ PRIMARY
  ├─ PRIME
  └─ SUB
            ↓
Host adapter
  ├─ SUPER: embedded in the main application
  └─ TOP: fills a dedicated BrowserWindow
```

`super-layout.js` and `window-runtime.js` are host adapters. They may map containers, lifecycle, status and resize events. They must not contain scientific computation or feature rendering.

## 2. Analysis Workbench

`src/core/ui-infrastructure.js` provides `AnalysisWorkbench`.

The workbench owns:

- responsive left rail and persisted splitter;
- primary content surface;
- right and bottom dock rails;
- floating overlay layer;
- PRIMARY / PRIME / SUB navigation;
- portable view placement;
- responsive grid management;
- resize propagation to chart surfaces;
- lifecycle cleanup through the plugin scope.

Plugins mount existing shared DOM or generated views into semantic slots. Core does not rewrite a plugin's internal grid into another grid.

### PRIMARY

The plugin's main working surface. It is persistent and is the default view. A plugin normally has one PRIMARY composition containing its data navigator, parameter controls and principal scientific result views.

### PRIME

High-frequency auxiliary surfaces that belong to the same task as PRIMARY and should not become a separate application page. PRIME views can be:

- inline in PRIMARY;
- pinned to the right rail;
- pinned to the bottom rail;
- floated;
- restored to their home position.

Examples:

- Resonance curve inspector;
- Resonance group analysis;
- TER R–V linked inspector;
- Pulse raw-waveform diagnostic;
- Data Center chart preview.

### SUB

Full derived analysis surfaces that temporarily replace the PRIMARY content while preserving the same plugin workbench and project state. They are appropriate when the analysis is sufficiently large to need its own complete surface.

Examples in Resonance:

- physical mechanism analysis;
- peak-spacing analysis;
- gate-voltage analysis.

## 3. SUPER and TOP

SUPER and TOP are hosting modes, not different plugin implementations.

A TOP plugin registers one `ui.topWorkspace` contract. The contract includes semantic `primary`, `prime`, and `sub` metadata. If that plugin is selected as SUPER, the main shell embeds its registered workbench. Otherwise, activating it opens its dedicated window.

Dedicated windows load the same plugin Controller / Shared Views / Feature Runtime layers declared by the plugin manifest. The adapter only provides the host boundary.

## 4. Capability Runtime

`src/core/capability-runtime.js` provides the generic Capability Runtime.

A provider is described by:

- stable capability id;
- kind;
- owner plugin;
- version;
- serializable metadata;
- callable method names.

The main renderer publishes a serializable provider snapshot to each dedicated TOP window. A TOP window imports remote provider descriptors and invokes methods through Electron IPC. Therefore a dedicated window can consume providers registered by other enabled plugins without loading the entire main application or re-implementing those providers.

Current capability-backed registries include:

- peak detectors;
- Workflow processors;
- Workflow analyzers;
- chart providers that expose serializable `buildSpec` behavior;
- arbitrary plugin services registered through `ctx.capabilities`.

Capability registry changes are republished automatically.

## 5. Shared infrastructure exposed to plugins

Plugin API 1.5 exposes, among other APIs:

- `ctx.ui.analysisWorkbench` / `ctx.ui.analysisSurface`;
- `ctx.ui.grid`;
- `ctx.ui.portable`;
- `ctx.ui.actions`;
- `ctx.ui.shortcuts`;
- `ctx.ui.interactions`;
- `ctx.ui.contextMenus`;
- `ctx.ui.selection`;
- `ctx.ui.charts`;
- `ctx.state.create()`;
- `ctx.capabilities`;
- `ctx.analysis.detectors`;
- `ctx.workflow.processors/analyzers/charts`.

A plugin scope owns every registered listener, ResizeObserver, shortcut, chart surface and portable panel and releases them at deactivation.

## 6. Migrated first-party plugins

### Resonance

Semantic topology:

- PRIMARY: Resonance analysis;
- PRIME: Curve inspector, Group analysis;
- SUB: Physical mechanism, Peak spacing, Gate-voltage analysis.

The dedicated window consumes detector providers through the Capability Runtime. PRIME views use the workbench dock/float system rather than becoming unrelated pages.

### TER

- PRIMARY: TER controls, heatmap and TER maxima views;
- PRIME: linked R–V inspector;
- Core GridController owns responsive chart columns.

### Pulse / Read

- PRIMARY: file/configuration editor and extracted comparison results;
- PRIME: raw waveform diagnostic.

### Data Center

- PRIMARY: artifact navigator, formula/workflow/provenance work area;
- PRIME: general chart preview;
- Controller uses the Core state/project store.

## 7. Project compatibility

The workbench refactor does not change the self-contained project principle. Project files continue to carry imported source text/data, parsed points, analysis state and plugin project slices. A project copied to another computer can still be opened and analysed without the original CSV/TXT/DAT source files.

The UI layout store is intentionally separate from scientific project data. Dock positions and splitter widths are local UI preferences; scientific results remain in the project.

## 8. Architecture guardrails

Automated checks reject regressions such as:

- feature logic inside SUPER/TOP host adapters;
- migrated plugins using the transitional existing-DOM Workbench as layout owner;
- TOP workspaces falling back to separate split compositions;
- loss of PRIMARY / PRIME / SUB declarations;
- TER chart layout bypassing Core GridController;
- dedicated TOP windows lacking Capability Runtime bridging.
