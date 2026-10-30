# Phase F — First-Party Declarative Reconstruction Census (3.71.115)

## Purpose

This audit advances Phase F from structural Unit parity toward full first-party reconstructability.

The frozen runtime baseline remains unchanged:

- Plugin API 1.19.0
- Unit Templates 2.5.38
- 41 Units
- 73 Layout recipes
- Core / Presenter remain domain-blind
- Python remains authoring-time only

No new Unit type or Layout recipe is proposed by this audit.

## Classification rule

Every production presentation requirement is classified as exactly one of:

1. **DECLARATIVE** — already expressible by the current Phase F schema/generator.
2. **BOUNDED DETAIL** — legitimate plugin/domain detail that may remain declared as bounded data/geometry and must not become a specialized Unit.
3. **VOCABULARY GAP** — an existing public Unit/contract exists, but Phase F cannot yet declare it in the required composition position.
4. **DOMAIN BINDING** — belongs to production state/controller/algorithm/runtime and must remain separate from presentation generation.

A missing generator spelling is not evidence for a 42nd Unit.

## Vth

### Already declarative

- hosted TOP lifecycle
- Page + PageHeader
- titleless data-control PRIME
- grouped parameter controls
- action catalog and action placement
- Metric grid
- ScientificPlot
- resizable SplitPane
- Unit Table
- bounded Artifact column reads
- portable Task lowering
- Plot/Table/Metric result projection

The checked-in Unit blueprint parity reference is sufficient to treat the Vth presentation spine as **declaratively reconstructable**.

### Remaining work

The next Vth gate should compare the generated blueprint against production at the semantic contract level rather than source text:

- PRIMARY / PRIME identity and roles
- parameter group/field ordering
- action variants/order
- Metric ids
- SplitPane axis/sizing contract
- Plot/Table ids
- hosted lifecycle metadata

Production analysis runtime and threshold algorithm remain DOMAIN BINDING.

## Pulse Sampler

### Already declarative

- Tool hosting
- titleless embedded parameter PRIME
- Tabs
- form-grid-2
- action-grid-4
- segment Toolbar
- parameter-owned Table
- waveform ScientificPlot
- output Table
- Workspace rail preferences

The checked-in Tool blueprint parity reference proves the public composition spine without a Pulse-specific Unit.

### Remaining work

Waveform generation, steady-state extraction, live-domain state and export semantics remain DOMAIN BINDING.

No new public Unit is required by the accepted presentation structure.

## Pulse Analysis

### Already declarative

- titleless parameter PRIME
- Summary
- retained List
- EmptyState
- PlotView + ScientificPlot
- Table
- hosted scientific Workspace

The third production blueprint reference proves these public Units can be generated without private CSS or raw DOM composition.

### Remaining work

Batch segmentation, read-window extraction, production result state and controller behavior remain DOMAIN BINDING.

No new Unit is justified by the accepted basic presentation spine.

## TER

TER is the first plugin where the current generator exposes a real composition-position gap.

### Already declarative

- Page / PageHeader
- titleless data-control PRIME
- Field / Check / Action / Note
- Summary
- PlotGroup
- PlotView / ScientificPlot
- runtime-owned heatmap/scalar-field authoring
- Unit Table
- Menu contribution
- standalone ParameterForm authoring
- Legend authoring
- hosted Workspace

### Vocabulary gaps

1. **Nested ParameterForm inside a parameter PRIME group.**
   Production TER mounts the existing public ParameterForm inside the titleless data-control surface. Phase F currently exposes ParameterForm as top-level PRIMARY content, not as a child of a grouped PRIME composition.

2. **General nested public-Unit children inside a control group.**
   TER's transform controls demonstrate that a group cannot be modeled forever as a fixed tuple of fields + tabs + toolbar + table. The generator needs a bounded child composition vocabulary that reuses existing public Units. This is a schema/compiler gap, not a Unit gap.

3. **Runtime-owned PlotGroup child detail declaration.**
   Heatmap/scalar-field ownership already delegates to ScientificPlot runtime correctly. The TER parity gate still needs to prove that PlotGroup children can preserve bounded public PlotView detail geometry and runtime render ownership without plugin-specific branches.

### Bounded detail, not vocabulary

- accepted TER plot-card detail geometry
- heatmap aspect/detail bounds
- domain labels and export names
- TER-specific result columns
- stable domain ids required by the existing controller

### Domain binding

- analysis service
- controller
- TER numeric pipeline
- transformed scalar-field production
- selection mapping
- export payload generation

## Resonance

Resonance is intentionally last because it tests composition breadth rather than a missing scientific renderer.

### Already represented by public Units in production

Production already composes:

- Workspace
- data-control PRIME
- inspector PRIME
- scientific-secondary PRIME
- scientific-secondary SUB views
- List
- Field / Check
- Action
- Note
- Legend
- FloatingChrome
- ScientificPlot
- Panel / Header
- Summary / Status
- Table
- PlotView / PlotGroup
- Menu behavior

Therefore the production source itself is evidence that a specialized Resonance Unit is unnecessary.

### Vocabulary gaps

1. **Multiple declarative PRIME surfaces.**
   Phase F currently has a dedicated parameters declaration, but no general schema for additional inspector/scientific-secondary PRIME surfaces with existing public PRIME metadata.

2. **Declarative SUB surfaces.**
   Physics / spacing / gate analysis are existing Workspace SUB semantics. The generator needs a bounded SUB declaration instead of flattening them into PRIMARY.

3. **Nested surface composition tree.**
   Resonance needs public Header, FloatingChrome, Legend, Status, Panel, Layout and scientific children composed inside PRIME/SUB/PRIMARY regions. A generic bounded child tree is preferable to adding one schema field per plugin screenshot.

4. **Existing Menu / action-group placement inside nested headers.**
   The generator has Menu contribution, but Resonance also requires bounded local action/menu composition in public Header/Toolbar hosts.

5. **Domain-owned lifecycle callbacks.**
   onShow/onPlacementChanged/render hooks must remain DOMAIN BINDING. The declarative compiler should reference bounded domain commands/adapters rather than serialize arbitrary JavaScript callbacks.

### Bounded detail, not vocabulary

- accepted main-plot geometry
- inspector/group minimum content sizes
- allowed portable placements
- responsive detail parameters
- scientific labels and report/table columns

### Domain binding

All peak detection, peak editing, feature calculation, selection, grouping, physics analysis, gate analysis, TER integration and controller rendering remain outside the presentation schema.

## Required next compiler step

Do **not** add Unit 42.

The next generic Phase F compiler change should introduce one bounded composition concept above existing Units:

```text
Surface declaration
  role: PRIMARY | PRIME | SUB
  semantic/presentation metadata
  children:
    existing public Unit declarations only
```

The child vocabulary should initially cover the already-public units required by TER/Resonance:

- Layout
- Panel
- Header
- Field
- Check
- Action / Toolbar
- Tabs
- Note
- Chip / Legend
- ParameterForm
- Summary / Status
- List / EmptyState
- ScientificPlot / PlotView / PlotGroup
- Table
- FloatingChrome
- Menu contribution

This is a compiler IR/composition improvement only. It must lower to the same public Unit Templates and Workspace composition path.

## Acceptance order

1. **Vth semantic reconstruction gate** — prove current declaration reproduces the accepted Unit spine.
2. **Pulse Sampler semantic reconstruction gate**.
3. **Pulse Analysis semantic reconstruction gate**.
4. **TER declarative reconstruction** after nested control-group children are available.
5. **Resonance declarative reconstruction** after general PRIME/SUB surface declarations are available.

At every step:

- production domain/state/algorithm owners stay frozen;
- generated package contains no private CSS by default;
- no raw host page HTML;
- no plugin-id branch;
- no generated Desktop/Mobile branch;
- no second Workspace/PRIME runtime;
- ordinary SDK validate/package remains the final package path.

## Conclusion

The current evidence does **not** justify expanding the 41-Unit catalog. The remaining blocker is mainly the declarative compiler's ability to compose the already-existing public Unit vocabulary in nested PRIME/SUB surfaces.

That distinction is important: Phase F should become more expressive by improving the authoring IR, not by making Core more domain-aware.
