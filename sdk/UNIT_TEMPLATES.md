Mobile geometry note (2.5.38 / SDK 1.51.53): Unit geometry is internal to its allocated Surface. Mobile right/bottom companion outer tracks are owned exclusively by the Workspace SplitController, which resolves preference and bounds from the actual Workspace geometry; shared Mobile CSS only consumes the final track token, and Unit content does not negotiate parent tracks. Parameter Drawer intrinsic-width fitting remains a separate overlay contract.

# Unit Templates 2.5.38 — SDK 1.51.53

SDK 1.51 promotes Unit Templates from a small scientific-composition helper into the canonical **unit-level UI composition contract** for future DK Data Studio plugin authoring.

The long-term acceptance target is strict:

> Every current native plugin must be reconstructable from public Unit Templates with 1:1 functional and visual parity. SDK development must adapt to accepted native UI; accepted native plugins are not allowed to change merely to fit the SDK.

SDK 1.51 does **not** migrate current native plugins. Their source and existing authored styles remain frozen reference assets. The SDK is being made complete enough to reproduce them first; migration can happen later, plugin by plugin, under parity gates.


## Architecture


## SDK 1.51.53 generated Tool-designer blueprint reconstruction

SDK 1.51.53 does not add or modify a Unit. The second production-shaped Phase F gate proves that the existing Workspace, Tabs, Layout, Action, Toolbar, Table and PRIME contracts can reproduce a Tool-designer spine independently of the first Vth-style workbench proof. Authors may declare the already-public bounded Workspace left width/minimum/reserve and content end inset, explicit parameter PRIME priority/embedded/auto-open state, compact Tabs, field-layout recipes, Action Grid, segment Toolbar and parameter-owned Table.

The accepted Pulse Sampler presentation is reconstruction evidence only. Its plugin id, live-domain/state, waveform algorithm, Task implementation, private DOM hooks and historical presentation details are not imported into generated runtime. The public catalog remains **41 Units / 73 Layout recipes** and `UNIT_TEMPLATE_SPEC_VERSION` remains **2.5.38**.

## SDK 1.51.52 generated grouped control-surface authoring

SDK 1.51.52 does not add or modify a Unit. Phase F can now reconstruct a multi-section data-control PRIME by declaring groups that compose the existing Panel, Header, Chip, Field, Check, Note and Toolbar Units. Headed/plain group choice, stack/form-grid layout and action placement are authoring declarations only; Core continues to own Unit anatomy, geometry, accessibility, paint and interaction plumbing.

PageHeader actions and group Toolbars project from one shared action catalog. Hosted TOP/Tool pages may declare close behavior through the already-published workspace lifecycle; standalone generated plugins do not acquire workspace-only close code. The public catalog remains **41 Units / 73 Layout recipes** and `UNIT_TEMPLATE_SPEC_VERSION` remains **2.5.38**.

## SDK 1.51.51 generated production-shaped blueprint reconstruction

SDK 1.51.51 does not add or modify a Unit. Phase F now proves that a production-shaped scientific workbench spine can be generated entirely from already-published Unit contracts: `fill-rows` Layout, titleless data-control PRIME, Metric grid, ScientificPlot, Table and resizable SplitPane. Split gesture/persistence/reflow remain Core-owned; Metric/Table/Plot projection remains Unit-owned; the generator only declares composition and task-result bindings.

The production Transfer Vth blueprint is acceptance evidence only and is never imported into runtime generation. The public catalog remains **41 Units / 73 Layout recipes** and `UNIT_TEMPLATE_SPEC_VERSION` remains **2.5.38**.

## SDK 1.51.50 generated hosted workspace authoring

SDK 1.51.50 does not add or modify a Unit. Hosted generation only selects existing host lifecycle contracts around the same Unit composition: standalone, TOP workbench, or Tool Workspace. Activity/Page/TopWorkspace registration controls where the same Unit Workspace is hosted; it does not create a second composition path. Generated parameter PRIME remains the existing fixed-titleless data-control Unit and generated PRIMARY keeps its declared public presentation role.

The public catalog remains **41 Units / 73 Layout recipes** and `UNIT_TEMPLATE_SPEC_VERSION` remains **2.5.38**. Dedicated-window geometry belongs to the existing host/window contract, not Unit or Presenter geometry.

## SDK 1.51.49 generated scientific interaction authoring

SDK 1.51.49 does not add or modify a Unit. Generated plots only declare interaction metadata consumed by the existing ScientificPlot/Interaction contracts: stable reference identity, selection target, scientific axis semantics, viewport-link policy and bounded legend-link policy. Command registration remains a Core execution concern and does not become a Unit responsibility.

The public catalog remains **41 Units / 73 Layout recipes** and `UNIT_TEMPLATE_SPEC_VERSION` remains **2.5.38**. Presenter, Unit geometry and production plugin presentation ownership are unchanged.

## SDK 1.51.48 generated scientific workbench composition

SDK 1.51.48 does not add or modify a Unit. Phase F generation may now select the already-published PlotGroup, PlotView, ScientificPlot and Table composition paths to build multi-result scientific workbenches. Multiple scoped DataTable inputs and multiple result projections are authoring/compiler concerns only; Core remains the sole Task/Artifact owner, Unit remains the sole scientific composition owner, and Presenter remains platform-only.

The public catalog remains **41 Units / 73 Layout recipes** and `UNIT_TEMPLATE_SPEC_VERSION` remains **2.5.38**. Generated workbenches receive Mobile/Desktop behavior from those existing contracts rather than generated CSS or plugin-specific Presenter rules.

## SDK 1.51.47 generated Artifact pipeline authoring

SDK 1.51.47 does not change Unit Templates. Phase F generation can now bind lowered JavaScript Tasks to bounded canonical DataTable inputs and project results into the existing Table and ScientificPlot Units. Source discovery remains `ctx.data.sources`; column enumeration/range reads remain Artifact Store contracts; derived publication remains `ctx.data.model` + `ctx.data.artifacts`. The generator adds no UI renderer, data store, Presenter behavior, Python runtime, or alternate worker path.

The public catalog therefore remains **41 Units / 73 Layout recipes**, and `UNIT_TEMPLATE_SPEC_VERSION` remains **2.5.38**.

## SDK 1.51.46 authoring-only portable Task lowering

SDK 1.51.46 does not change the Unit catalog. Phase F adds an authoring compiler outside the application runtime: Python source may be used to describe a bounded pure function, but generation must lower it completely to a JavaScript `DKDSTaskDefinition` before packaging. Runtime plugins continue to use the existing Plugin API 1.19 + Core Task Runner path and do not load Python, Pyodide, Python providers, or a second execution backend.

Unsupported or semantically unproven Python constructs fail closed during generation. This authoring capability therefore does not alter Unit/Presenter ownership, Mobile behavior, or production UI.

## SDK 1.51.45 maturity freeze

SDK 1.51.45 freezes the mature Unit ownership model without adding a 42nd Unit or a 74th Layout recipe. The production catalog remains **41 Units / 73 Layout recipes**.

Production plugin CSS may retain only source-faithful internal detail geometry that is not already managed by a Unit. Managed PlotGroup/PlotView geometry, canonical parameter density, responsive Form/Action grids, and Vth production presentation geometry are Unit-owned. The production CSS dependency audit is part of architecture hygiene and rejects a second private owner for those managed properties.

Vth production presentation is fully CSS-free after cutover; its PlotView, result SplitPane, parameter stack and responsive behavior are expressed through public Unit contracts. TER and Resonance retain only source-detail CSS that is not duplicated by managed scientific Unit geometry.

The SDK geometry vocabulary remains source-derived: retired private CSS cannot survive only as a stale geometry blueprint, bridge, or accepted value. Historical blueprint/value provenance must be removed when its production owner is retired.

`UNIT_TEMPLATE_SPEC_VERSION` remains **2.5.38**. SDK 1.51.45 is therefore a contract/ownership maturity release, not a Unit-catalog expansion.

## 2.5.38 Mobile workspace-owned companion geometry contract

The Unit catalog remains unchanged at **41 Units / 73 Layout recipes**, but SDK 1.51.43 clarifies the ownership boundary. A Unit owns only geometry **inside the Surface allocated to it**. `detailGeometry.minContentInlinePx`, `minContentBlockPx`, PlotGroup density, responsive recipes and internal `scrollHeight` may influence the Unit's own reflow/scrolling, but they must not resize a parent Mobile right/bottom companion track.

Every semantic `companion-right` and `companion-bottom` uses the same outer chain: **Workspace SplitController default/user preference → shared live-viewport bound → CSS track**. Mobile Presenter projects the Surface into that track but does not inspect descendant content, install content ResizeObserver/MutationObserver negotiation, or publish Unit-derived track tokens. This is domain-blind and profile-blind.

Mobile split persistence is isolated from Desktop through one Core-owned schema. Plugins and profiles cannot request private split generations. Contract migrations happen once at the framework schema boundary rather than through per-plugin/per-profile state keys.

Parameter/data-control Drawer sizing is intentionally separate because it is an overlay rather than a scientific companion track. Its minimum reasonable inline size may consume generic Unit inline constraints so labels/actions/Tabs are not clipped, but Drawer width cannot reserve, shrink or otherwise feed back into scientific companion allocation. Parameter Header anatomy, the final visible safe inset and hidden overall Drawer scrollbar remain unchanged.

## 2.5.33 Mobile companion live-fit / parameter Drawer closure

Historical note: 2.5.33 introduced Drawer scroll/drag improvements together with content-driven companion block fitting. SDK 1.51.43 retires the companion block-fitting portion. Drawer scroll/drag behavior remains; scientific outer tracks are Workspace-owned.

## 2.5.32 Mobile companion safe-area constraints

Historical note: non-parameter PRIME and GroupArea may still publish bounded detail/intrinsic geometry for their own internal composition, but SDK 1.51.43 no longer lets Mobile Presenter consume those values for right/bottom outer-track allocation. Drawer safe-area behavior is governed by the current Drawer contract.

## 2.5.31 Mobile parameter Surface closure

Parameter-purpose PRIME surfaces remain bounded Unit compositions, while Mobile Presenter is the only final Drawer allocator. The Drawer has a 25% live-page hard lower bound; live Unit intrinsic constraints may raise it. Parameter legends are explicit width followers: they adapt to at most three horizontal rows and then use hidden-scrollbar horizontal overflow. Plugins must not use legends, Desktop rail widths, or persisted Drawer widths as Mobile width owners. The historical Drawer-occupancy coupling to scientific companions is retired; Drawer allocation is independent from right/bottom companion tracks.

## 2.5.30 Uniform parameter PRIME outer inset

Parameter-purpose PRIME surfaces now use one Core-owned 6 px four-side outer inset on desktop and mobile. A plugin may still configure its internal Unit composition and may declare `minContentInlinePx`, but it may not supply `detailGeometry.contentInsetPx` for `presentationPurpose:'parameters'`; doing so is rejected. `contentInsetPx` remains a bounded tunable for non-parameter PRIME surfaces. This keeps the outer parameter-list spacing uniform while preserving plugin freedom inside the Surface.

## 2.5.29 Unit geometry ownership registry

The shared Unit geometry registry transports intrinsic/local constraints without exposing Unit-private recipe anatomy. Under SDK 1.51.43 its platform use is deliberately narrow: parameter-Drawer inline fitting may consume generic Unit inline deficits, while scientific right/bottom outer tracks do not consume Unit content constraints.

Ownership is split by boundary: the **plugin** supplies only accepted/bounded Unit configuration; the **Unit** owns its intrinsic/internal layout; the **Workspace SplitController** owns scientific companion default/user size preference and resolves its final bound against actual Workspace geometry; shared Mobile CSS only consumes that final track token; persisted user geometry is preference-only. `units.geometryOwnershipPolicy` exposes this policy read-only.

The default Unit recipe remains the complete, visually accepted state. A plugin may choose only parameters explicitly accepted by that Unit—such as variant, preferred columns, gap/density, `detailGeometry`, or accepted responsive states. Supplying such a value never transfers parent-track ownership to the plugin or Unit.

## 2.5.28 Mobile block-axis constraint contract

Scientific PlotGroup/GroupArea may report live **minimum** and **preferred** block requirements for its own internal composition and diagnostics. SDK 1.51.43 explicitly prevents those values from resizing the parent Mobile companion lane.

Plugins continue to tune only accepted Unit parameters such as PlotView `contentAspectRatio`, `contentMinHeightPx`, `contentMaxHeightPx`, PlotGroup columns/density/gap, and responsive composition. They do not write Mobile companion height or viewport caps. A user drag writes the Workspace split preference; shared Mobile CSS bounds that preference against the current viewport.

The same release restores PRIMARY scroll ownership on Mobile: `contained` PRIMARY workspaces remain externally non-scrolling, while only the explicit `primaryScroll:'auto'` contract grants the canvas center outer scrolling. This prevents a second scrollbar/gutter around internally scrolling Unit content. The public catalog remains **41 Units / 73 Layout recipes**.

## 2.5.27 Mobile Surface geometry single-owner contract

Mobile parameter/data-control Surfaces now use one constraint→allocation chain instead of competing width owners. Layout Units execute responsive geometry from the **real allocated local width** and publish an intrinsic inline constraint when crossing a declared breakpoint would enter a last-resort single-column/column state. PRIME may additionally declare `detailGeometry.minContentInlinePx` for an accepted content-box minimum. Mobile Presenter consumes those live constraints and owns only the final Drawer frame allocation; it no longer knows recipe names, scans plugin labels/buttons, or fabricates a larger width for Unit reflow.

`detailGeometry.contentInsetPx` remains the PRIME-owned outer content inset. The Mobile Drawer frame and scroll viewport are edge-to-edge and add no second content padding. A plugin may tune these bounded Unit parameters, but the final geometry write stays with Unit Templates/Presenter according to ownership. Persisted Drawer width is only a user preference and is clamped to the current live Surface minimum on every open.

The resulting rule is: **plugin supplies bounded parameters; Unit tree owns intrinsic/local geometry; Presenter owns outer Surface allocation**. There is one width truth and one inset owner. The catalog remains **41 Units / 73 Layout recipes**.

## 2.5.26 Pulse intrinsic result geometry cleanup

Unit Templates 2.5.26 removes retired Pulse-only viewport-fill geometry values from the public accepted Layout vocabulary. The accepted vocabulary remains derived from live native geometry, generic Layout recipes, and canonical bridges rather than preserving obsolete values after a native source changes.

Pulse result composition is now a single sequential PRIMARY content flow: comparison header → two responsive result PlotViews → result table → raw diagnostic PlotView. The result/table region no longer uses SplitPane, and the raw diagnostic no longer becomes a second PRIME. PlotView itself keeps canonical portable placement. No new Unit type or Layout recipe is added; the catalog remains **41 Units / 73 Layout recipes**.

## 2.5.25 Workspace PRIMARY end-inset ownership

Every Unit Workspace now guarantees a visible inline-end breathing room for PRIMARY content. The default owner is the Workspace Unit itself at **12 px** through `primaryEndInset:{mode:'unit',px:12}`; omitting the field uses that default. Plugins may tune the Unit-owned value only within **8–32 px**.

When an accepted source composition already owns the same visible end inset inside its PRIMARY root, declare `primaryEndInset:{mode:'content'}`. This is an ownership declaration, not an opt-out from spacing: the content root must already provide the accepted inset. The generic Core dock/main slots remain edge-to-edge (`padding:0`), so this contract does not reintroduce global page padding or domain-specific Core CSS.

This closes the Vth production-cutover regression where its Unit PRIMARY reached the right edge while TER/Data Center/Pulse retained source-owned insets. New Unit workspaces cannot silently omit the right/end breathing room. The public Unit catalog remains **41 Units / 73 Layout recipes**.

## 2.5.24 Mobile scientific touch arbitration

ScientificPlot touch/pen box capture is now opt-in with `mobileBoxGesture`. The default is `none`, so a drag over a chart remains available to the enclosing Mobile scroll owner. Declare `select-region` or `zoom-box` only when the chart genuinely needs a box gesture on Mobile. Desktop `scientific-standard-v1` bindings remain unchanged.

## 2.5.23 SplitPane / fill-chain closure

Created `splitPane` regions now own a canonical min-size-safe fill host: each first/second region uses a single-track fill grid so its Unit child stretches to the exact allocated split track. This closes the gap where the split track was tall but a child Plot Panel remained at intrinsic height.

`Panel.sizing:'fill'` now completes the second half of the same chain: the Material shell is a column fill-container and its dedicated Unit body uses `flex:1 1 auto; min-height:0`. Headered and headerless fill Panels therefore propagate the assigned pane height into their content body without plugin `height:100%` repair CSS.

These are generic Unit guarantees. Plugin-specific source geometry such as content padding/gaps still belongs in public `Layout` geometry, not private CSS.

## 2.5.22 Panel shell/body containment

`Panel` now exposes generic `sizing:'content'|'fill'`. When a sizing mode is declared, Core always creates a dedicated `body` even when `header:false`, so Material ownership remains on the Panel shell while geometry and domain content live in the body. `sizing:'content'` is intrinsic normal-flow composition and prevents a flex parent from shrinking the painted Material shell below its body; `sizing:'fill'` is the bounded counterpart for panels intended to consume available height. Plugins must apply Layout Units to `panel.body`, not the Material shell, whenever a sizing mode is declared.

## 2.5.21 compact-first density contract + complete content anatomy

Unit Layout now treats a width of `0` / unknown as **unmeasured**, not as an ultra-narrow viewport. Detached Unit compositions therefore keep their base multi-column recipe until a real width is available. This closes a systemic failure mode where a two-column form or four-column action group could collapse to one/two columns before it was mounted.

The generic form/action defaults are also less greedy: `form-grid-2` keeps two useful columns down to the accepted 310 px compact boundary, `form-grid-4` first reduces to two columns at 620 px, and `action-grid-4` keeps four actions on one line through ordinary PRIME widths and only reduces 4→2 at the accepted 280 px last-resort threshold. Plugins may still declare accepted `responsiveGeometry` when their own information density requires a different threshold. The Unit owns validation/execution; plugins only provide allowed parameters.

For Desktop parameter/`data-control` PRIME regions, Workspace geometry is also part of the public Unit contract. A plugin may declare a restrained `leftWidth`, `leftMin` and `leftReserve`; Core treats `leftMin` as a real usable-width floor rather than allowing the rail to collapse and then asking child controls to survive with emergency wrapping. `leftReserve` keeps that minimum bounded by the need to preserve a viable main workspace.

Unit Layout also publishes an internal density floor for recipes whose final fallback is one column. Mobile/overlay Presenters consume that metadata when sizing parameter drawers, so a stored or dragged drawer width cannot silently cross below the usable two-column floor and then hide/rewrap tabs or actions. Plugins do not set this internal marker; they keep using public Layout recipes and accepted responsive parameters.

Direct `Action` Units now consume the same canonical control-height token as `Field` controls. A grid action aligned beside labeled fields therefore has the **control height**, not the combined label+control height.

For source-faithful nested scientific panels, outer `Panel` containment and inner Plot/Table geometry remain separate owners: the outer Panel may declare accepted `width/maxWidth/minWidth` and content-sized rows, while ScientificPlot/Table own rendering and scrolling inside those rows. This prevents a child result stack from painting below the parent surface shadow.


`Tabs` now also exposes a public `compact` visual-density variant for small scientific channel selectors. It keeps semantic `role=tab` state/a11y, but its Core-owned geometry/paint deliberately matches the accepted toolbar-action silhouette: 42 px minimum width, 30 px action height, 3 px group gap/inset, toolbar-action radius, and toolbar active-state visual tokens. This is a reusable Unit visual recipe, not Pulse CSS.

`Panel` and `Surface` Units declare their Core Material Role immediately. When composition is detached, full semantic Material assignment is deferred until the node is connected, before paint; this preserves deterministic fill/shadow while avoiding synchronous semantic work for every detached card in plot-heavy tools such as TER. Material paint remains entirely Theme/Core-owned. `Toolbar variant:'ordinary'` stays a plain toolbar and does not inherit integrated-action chrome.

Header Unit adds public, Core-styled `eyebrow`, `titleEmphasis` (`standard | prominent | compact`) and `metaPlacement` (`inline | trailing`). This restores common scientific card hierarchy without plugin CSS. Typography, spacing, truncation and paint remain Core-owned.

Pulse Sampler is the first production consumer of this refinement: its Unit composition restores the accepted card hierarchy, titleless PRIME inset, compact two-column parameter grid, four-action row, stretch-to-fill segment table, wave plot/table proportions and result workspace entirely through public Unit composition/detail parameters. No Pulse-specific Unit or CSS owner is introduced. The public catalog remains **41 Units**.

The responsive/density rule is now an executable public contract exposed as `units.responsiveDensityPrinciple` plus a complete 41-Unit `units.responsiveDensityAudit`. The hard default is **compact first, single column last**: an unmeasured width keeps the base recipe; density-oriented grids keep useful columns while controls still meet their minimum geometry; large grids reduce columns in stages rather than jumping directly to one/two columns. Plugins may tune only declared Unit parameters such as column preference, minimum item width, accepted gap/density, accepted responsive geometry, content inset, fill sizing and Header hierarchy. Theme paint, typography scale, minimum hit geometry, state/a11y, lifecycle and owner boundaries remain locked by Core.

Generic Header now includes `variant:'content'` for an in-content scientific heading that uses the canonical title/eyebrow/meta/action hierarchy without becoming a painted panel-title strip. `metaPlacement:'title-inline'` keeps a short status beside the title under an eyebrow. Field now accepts `unit` and Core renders the label/unit row, so plugins no longer hand-build label geometry. These capabilities are common Units, not Pulse-specific behavior.

For a fixed parameter/data-control PRIME that must occupy the available dock height, use the existing canonical `sizing:'fill'` parameter. The plugin still owns only the decision to request fill; PortableView/Core owns the actual dock geometry.

## 2.5.15 composable Unit identity

Unit composition is **additive**, not destructive. A Unit facade that adopts or decorates an existing DOM node must preserve the node's structural Unit identity and variant. It records its own role in namespaced Unit-role metadata instead of replacing `data-dkds-unit-template`.

This applies to `layout.apply(...)`, host-owned `parameterForm`, portable/movable behavior, PlotView/PlotGroup/ScientificPlot adoption, Workspace/ComponentTree adoption, meters and SplitPane behavior. The rule allows one node to participate in several public Unit capabilities while retaining one stable structural identity.

For outer geometry, ownership remains mutually exclusive: `layoutOwner:'core'` lets the Core Unit write geometry; `layoutOwner:'host'` requires an existing Layout role and prevents the derived Unit from becoming a second geometry writer. Repeated destroy/remount cycles must therefore preserve the same structural role and remain valid.

**Do not** create plugin-specific Units or recover parity with selector specificity. Express variation through public Unit variants, accepted detail geometry, responsive targets and explicit owner contracts.

There is one composition stack, not two:

```text
Core canonical components/runtimes
        ↓
Unit Templates
        ↓
free manual composition
        ↓
optional presets
```

`accepted-scientific-v1` is therefore **not** an alternate renderer. Its primary surface and PRIME definitions are composed only through public Unit Template facades. A third-party plugin may manually call the same Units and obtain the same canonical composition.

## Public entry point

```js
const units = ctx.ui.unitTemplates;
```

Declare:

```json
"requiresCore": ["ui.unit-templates"]
```

`units.version` is `2.5.38` in SDK 1.51.53.






### 2.5.14 Explicit SplitPane outer-layout ownership

`splitPane` now uses the same single-owner rule as other source-parity composition. The default remains `layoutOwner:'core'`: Core writes the split track and optional `reflowBelow` geometry. An adopted **Layout Unit** may instead declare `layoutOwner:'host'`; in that mode Core writes no `display` / grid / flex / min-size / handle-visibility geometry. The host's accepted Desktop/Mobile stylesheet is then the sole outer-layout owner, while the canonical SplitController remains the only resize gesture, persistence and `--dkds-unit-*` split-size-token owner.

`layoutOwner:'host'` and `reflowBelow` are mutually exclusive. This prevents a CSS/container-query reflow and Core responsive reflow from competing on the same element. It is a generic ownership seam, not a plugin-specific Unit.

```js
const shell = units.layout.create(parent, { variant:'identity', className:'domain-results-split' });
const handle = units.splitHandle.create(shell, { axis:'horizontal' });
units.splitPane.adopt({
  id:'results-height',
  layoutOwner:'host',
  container:shell,
  handle,
  target:results,
  axis:'y',
  trackToken:'--dkds-unit-results-height',
  defaultSize:540,
  min:380,
  reserve:220
});
```

Use this only when the host truly needs accepted responsive detail that cannot be expressed by the common Core split recipe. Do not use it to bypass canonical split interaction or to introduce a second pointer-resize implementation.

### 2.5.13 Ancestor-responsive detail + single ParameterForm grid owner

Two generic contracts close source-parity cases where a nested Unit must preserve accepted layout without creating a second style owner:

- `units.layout.create/apply(..., { responsiveTarget })` measures responsive geometry from the declared semantic ancestor instead of the already-shrunk local Unit. The target is an `Element` or selector; Core still validates and writes the resulting Unit geometry.
- `units.parameterForm.mount(..., { layoutOwner:'host' })` delegates **only the outer form grid** to the enclosing Layout Unit / accepted-detail host. The host must itself be a Layout Unit. ParameterSchema disables its default grid in this mode, so Core default grid and host detail grid can never both own `grid-template-columns`.
- Canonical field generation, labels, validation, field/control size, focus/Theme paint and accessibility remain Core-owned in both modes.
- This is a general authoring contract, not a Data Center special case. No plugin id enters Core and the catalog remains **41 Units**.

Data Center 3.71.33 uses the contract to preserve the accepted formula/chart layout while its Unit-only public shadow demonstrates the same composition with Layout detail geometry. The production source-parity stylesheet remains geometry-only where accepted detail has not yet been globally classified.

### 2.5.12 PlotGroup orientation and immediate column commitment

- `PlotGroup.getOrientation()` is now public on both the Core runtime controller and the Unit PlotGroup facade. Desktop/Web report the physical orientation resolved by GroupArea instead of forcing plugins to infer it from viewport state.
- Orientation-specific group controls must commit through `PlotGroup.setColumns(...)`. This immediately reapplies the existing GroupArea/GridController and updates `--dkds-grid-columns`; a later data render or resize is not required for the new column count to become visible.
- This closes a source-parity gap where a plugin could store the requested column preference while the current grid remained unchanged until the next scientific update. The Unit catalog remains **41 Units**.

### 2.5.11 Runtime source-parity ownership closure

- Portable Header reconstruction may provide an explicit `actionsClassName` together with `integratedActions:false`. In that case the Header Unit adopts exactly that authored action host and does **not** pre-claim the `dkds-portable-controls` identity. `PortableView` remains the single owner of placement controls and may inject its one placement subgroup into the adopted host. This prevents nested/duplicate portable control chrome while preserving accepted action order and callbacks.
- `scientificPlot.create(target, { renderOwner:'runtime' })` now preserves the authored target's structural classes until the canonical runtime renderer actually attaches. The delegated Unit still records Unit ownership/lifecycle metadata, but it does not pre-add a generic chart-host class or create a second Material/interaction owner.
- These are generic runtime ownership corrections extracted from Resonance source-parity reconstruction. The Unit catalog remains **41 Units**.

### 2.5.10 Namespace-correct structural primitives

`units.layout.create(...)` now accepts `namespace`, including `namespace:'svg'`. The Layout Unit resolves the SVG namespace to `http://www.w3.org/2000/svg` and uses `document.createElementNS(...)`, so accepted source anatomy containing a real SVG host can be reconstructed without raw plugin DOM creation. Namespace selection is structural Unit capability; each plugin still declares the namespace required by its accepted element. The Unit catalog remains **41 Units**.

### 2.5.9 Explicit responsive detail ownership

Generic Layout Unit recipes no longer carry a Pulse-derived `file-toolbar` collapse threshold. `file-toolbar` supplies only the common horizontal file-action strip geometry. A native reconstruction that needs an accepted breakpoint declares it explicitly through `responsiveGeometry`. Pulse Analysis declares its accepted **310 px** collapse threshold, so widths from 311–520 px remain the original three-button row instead of being forced into a generic column. This keeps responsive detail at the plugin-to-Unit boundary while the 41-Unit catalog remains unchanged.


### 2.5.8 Unit-owned accepted detail geometry

Accepted source geometry that belongs to a Unit must now be declared through the Unit contract rather than by leaking raw lower-level service options through Unit composition. The catalog remains **41 Units**.

- `prime.detailGeometry.contentInsetPx` expresses the exact accepted content inset for parameter/data-control PRIME surfaces. Unit Templates validate and own the geometry write.
- `plotView.detailGeometry.contentAspectRatio`, `contentMinHeightPx`, and `contentMaxHeightPx` express accepted scientific content sizing. Unit Templates validate these values and translate them to the existing generic PlotView execution service.
- Raw `contentInset` is rejected by `units.prime`; raw `contentAspectRatio/contentMinHeight/contentMaxHeight` are rejected by Unit PlotView composition. Direct lower-level Workbench/PlotView APIs remain generic Core services and are not changed by this Unit authoring rule.
- TER production now consumes the uniform Core parameter PRIME inset and keeps only its square PlotView content geometry as plugin detail. No TER identity or special-case selector is introduced into Core.
- Source-parity Header anatomy now supports stacked title/subtitle composition, optional omission of the action host (`actions:false`), and the generic `plot-minimal` variant for accepted PlotView headers that must not inherit legacy analysis-title geometry.
- `field.create(..., { controlOnly:true })` creates only the canonical input/select/textarea while preserving Unit ownership. It is intended for accepted compound layouts (for example two range inputs inside one plugin-owned row), not as a bypass for field paint or interaction ownership.
- Pulse Analysis is the first production consumer of these anatomy refinements: its three PlotViews, titleless data-control PRIME, result splitter and table are Unit-composed while its existing domain/controller/scientific render owners and accepted geometry stylesheet remain unchanged.

### 2.5.6 Source-parity reconstruction contract

Unit Templates now define the **minimum common contract**, not a mandatory final look for every plugin. Core owns each Unit's semantics, owner/lifecycle boundary, accessibility and mandatory minimum structure. During native-plugin reconstruction, the plugin may explicitly provide accepted source-detail parameters—such as field widths, local gaps, grid proportions, responsive thresholds and source-faithful anatomy variants—when required for 1:1 parity with the accepted implementation. These parameters remain plugin detail until every native plugin has completed 1:1 reconstruction and the project explicitly classifies them as defaults, tunable values or immutable contracts.

`presentationPurpose:'parameters'` is already a hard rule: a parameter PRIME must be titleless and headerless on every host. `header`, `chrome` or surface-owned placement chrome is rejected rather than hidden by CSS.

TER is the first source-parity production reconstruction. Its geometry-only `plugin.css` is intentionally retained as explicit plugin detail while theme/material paint remains Core-owned. Its accepted persisted workspace and PlotView state keys are preserved rather than reset to Unit defaults.

### 2.5.5 Production cutover lifecycle closure

- Generic `prime.build({ content })` now mounts declared content into the canonical PRIME body exactly once. Generated PRIME containers are persistent and reused after close/reopen instead of allocating parked duplicate subtrees.
- `scientificPlot.create(target, { renderOwner: "runtime" })` is the explicit single-owner bridge for a Unit-composed plot whose final renderer already belongs to `ctx.ui.scientificPlot.react(...)` or `scalarField(...)`. In this mode the Unit records canonical semantics but does **not** create a second `ScientificCurveSurface`, SVG canvas, resize observer, or interaction owner.
- Runtime-delegated ScientificPlot Units reject `interactionExtensions` / `onIntent`; the existing runtime renderer remains the only scientific interaction owner.
- Responsive `plot-card-fill` no longer claims `height:100%`, so PlotGroup auto rows determine card height without a cyclic external sizing relationship. The Unit catalog remains **41 types**; this release tightens composition/lifecycle ownership rather than adding a new type.

### 2.5.4 Data-workbench reconstruction refinement

- `chip.create(..., { onInvoke })` now expresses an invokable semantic chip without changing the Chip Unit's canonical geometry or paint. Core renders the interactive form as a native `button` with keyboard activation; a passive Chip remains a display element.
- This capability was extracted from Data Center formula-reference chips (`Vd`, `Id`, `Vg`), which are buttons in production but visually remain canonical chips. It avoids either private button-plus-chip CSS or misusing the ordinary Action geometry.
- Data Center's chart preview dossier is corrected to `plotView:prime-contained`: the enclosing `scientific-secondary` PRIME is the single position owner and the inner PlotView retains title/export ownership.
- TER, Pulse, Resonance and Data Center now all close their Unit-only shadow reconstructions with the catalog still fixed at 41 Unit types.

### 2.5.3 composition refinements

- `section.create(..., { variant: "disclosure" })` is the Core-owned inline disclosure unit. It renders native `details/summary` semantics, owns the open state reflection, and accepts `open` / `onToggle` without plugin-authored disclosure CSS.
- `popover.create(..., { anchor | point, placement, offset })` keeps positioning inside the existing Popover Unit. Core clamps the resolved position to the viewport, owns `left/top` through StyleGate, tracks anchor/viewport changes, and exposes `reposition(...)`.
- `popover` variant `picker` defaults to dialog semantics when used as a rich anchored action surface. Plugins provide domain content and the anchor/point intent; they do not own absolute-position paint or viewport collision logic.
- These additions were extracted from the Resonance Workbench shadow reconstruction and do not add a 42nd Unit type.

## Complete catalog

The runtime catalog is generated from one source of truth and includes:

- composition/layout: `workspace`, `page`, `pageHeader`, `section`, `layout`, `splitHandle`, `splitPane`;
- surfaces/chrome: `surface`, `panel`, `header`, `portable`, `popover`, `movableWindow`;
- actions/controls: `toolbar`, `action`, `actionRow`, `tabs`, `field`, `check`, `componentTree`, `parameterForm`, `menu`, `dialog`;
- display/data: `chip`, `note`, `message`, `summary`, `divider`, `emptyState`, `metric`, `meter`, `list`, `table`, `status`;
- scientific: `prime`, `plotView`, `plotGroup`, `scientificPlot`, `legend`, `floatingChrome`;
- nonvisual migration marker: `provider`.

The authoritative generated catalog is `UNIT_TEMPLATE_CATALOG.md`. Machine-readable mirrors are:

- `unit-template-catalog.json`;
- `native-plugin-unit-blueprints.json`.

They are generated by `tools/sdk/generate-unit-template-reference.js` during `sdk:authoring`; stale generated references fail release checks.

## Ownership rule

A Unit is not a CSS convenience class. It is an ownership contract.

For every Unit the catalog states:

- accepted anatomy and named slots;
- canonical Core classes/runtimes;
- the complete published variant set;
- frozen metrics where applicable;
- responsive behavior;
- accessibility obligations;
- hard invariants;
- plugin extension points;
- forbidden overrides;
- what the plugin may provide;
- what Core exclusively owns.

`units.contracts` exposes this same contract data at runtime. Unit Template factories reject unpublished variants with `UNIT_TEMPLATE_UNKNOWN_VARIANT`; a plugin cannot create a private pseudo-variant and still claim canonical Unit ownership.

A plugin may choose **which** Units exist and how they are arranged. It may not redefine the final geometry/paint/mandatory behavior of a standard Unit.

Examples:

- `action`: plugin owns label/icon/command/semantic variant; Core owns action height, padding, radius, hover/active/disabled paint and compact header geometry.
- `header`: plugin owns title/meta/declared domain actions; Core owns padding, gap, action hit geometry and material appearance.
- `field`: plugin owns label/value/options/validation; Core owns height, padding, radius and focus/hover state.
- `portable`: plugin owns allowed placements and initial bounds; Core owns drag, resize, placement, history, chrome and z-order.

## Workbench composition remains free

Unit Templates do not force all plugins to resemble Resonance.

```js
const units = ctx.ui.unitTemplates;
const wb = units.workspace.create(root, {
  id:'custom-workbench',
  activity:'custom-workbench',
  header:false
});

const page = units.page.create(root).element;
const panel = units.panel.create(page,{title:'Results'});
units.field.create(panel.body,{label:'Threshold',inputType:'number',value:0.5});
units.action.create(panel.body,{id:'run',label:'Run',variant:'primary',onInvoke:run});
```

The information architecture can be completely different from Resonance, TER, Pulse or Data Center. Reusing the same Unit means reusing the same accepted UI grammar.

## Host contribution Units

Unit Templates also cover UI contributions that previously required a separate authoring path:

```js
units.toolbar.contribute({...});
units.status.contribute({...});
units.menu.contribute({...});
```

These delegate to the existing Host contribution runtime; they do not introduce another toolbar/status/menu implementation.

## Page and overlay Units

`pageHeader.create(...)` reproduces the established analysis page-header anatomy, including optional subtitle, action group and page-close command.

`popover.create(...)` creates a non-portable fixed popover using the canonical popover Material role and Core outside-click dismissal behavior.

`portable.create(...)` delegates drag/resize/dock/global placement to the existing PortableView runtime. Unit Templates never become a second placement-geometry owner.

## Strict PlotView

`unitTemplates.plotView` is a complete data-plot Unit and is intentionally stricter than low-level `ctx.ui.plotViews`.

A Unit PlotView always requires:

1. non-empty title;
2. canonical data-plot header;
3. exactly one position owner;
4. export capability;
5. Core-owned card/header/action geometry.

`plotView:complete` owns multiple Core placements and its Portable position control. `plotView:prime-contained` is the nested form discovered by the Pulse shadow reconstruction: it keeps PlotView title/header/export semantics but delegates movement to exactly one enclosing movable PRIME (`positionOwner:'prime'`) and therefore must not create a second Portable owner.

Rejected states include:

```text
UNIT_PLOTVIEW_TITLE_REQUIRED
UNIT_PLOTVIEW_HEADER_REQUIRED
UNIT_PLOTVIEW_POSITION_REQUIRED
UNIT_PLOTVIEW_EXPORT_REQUIRED
```

A raw plot canvas without plot chrome is `scientificPlot`, not a partial PlotView.


## Responsive SplitPane

`splitPane` continues to use the canonical Core SplitController for resizing and persistence. Created first/second regions are canonical fill hosts, so a fill-capable Unit child consumes the full allocated track. `reflowBelow` accepts only published Unit layout breakpoints. At or below that width Core temporarily stacks the two regions vertically and hides the resize handle; when space returns, the same split controller and preferred size state resume. Plugins do not add a second media-query/pointer-resize implementation.

```js
units.splitPane.create(host,{
  id:'results', axis:'y', defaultSize:540, min:380, reserve:220,
  reflowBelow:980, first:plots, second:table
});
```

## Strict PlotGroup

`plotGroup` owns grouped-plot composition.

Every scientific child is a complete Unit PlotView.

For a PlotGroup PRIME the title/header has only two legal states:

- `standard`: complete Core header — title, optional context/meta, `每行：N`, position, collapse and close;
- `none`: no visual header at all, and the surface is fixed/non-movable.

Partial lookalike headers are invalid.

### Spacing

Raw `gap`, `rowGap` and `columnGap` are forbidden. Plugins choose only accepted semantic density:

| Density | Gap | Accepted source |
|---|---:|---|
| `compact` | 10 px | managed-grid compact/default |
| `regular` | 12 px | accepted Resonance group |
| `comfortable` | 14 px | accepted TER group |

Core owns the resulting row and column gap.

## Scientific interaction policy

Unit ScientificPlot uses the fixed base policy:

```text
scientific-standard-v1
```

Core owns the established base gesture grammar: manipulator drag, marker/curve selection and additive selection, activation/context behavior, background clear/reset, box selection, Ctrl box zoom and wheel zoom.

Plugins may add non-conflicting domain interactions through `interactionExtensions`; they may not replace a mandatory binding.

```text
UNIT_SCIENTIFIC_INTERACTION_POLICY_FIXED
UNIT_SCIENTIFIC_INTERACTION_OVERRIDE
```

## State and accessibility contract

Unit Templates 2.5 adds `units.state`. Plugins update semantic state instead of directly mutating canonical `.active/.selected/.hidden`, native control state and `aria-*` attributes. The public channels are `visible`, `enabled`, `selected`, `pressed`, `checked`, `expanded`, `busy`, `readonly`, `required`, `current`, `invalid` and `loading`.

Each Unit publishes the channels it accepts and the current Core keyboard/accessibility owner. The contract intentionally describes **current accepted behavior**, not an idealized future accessibility model. For example, current Tabs expose canonical `tablist/tab + aria-selected`, while complete roving arrow-key navigation is not claimed unless the current Core runtime actually owns it.

The generated `native-plugin-state-census.json` and state blueprint layer preserve existing state/ARIA/keyboard semantics as migration evidence. Future Unit reconstruction may not silently drop a state or invent a parallel state owner.

## Preset rule

`accepted-scientific-v1` is a mature Unit Template composition example.

Its implementation is required to call public Unit facades such as:

```text
units.layout.create
units.floatingChrome.create
units.legend.create
units.status.create
units.prime.build
units.plotGroup.buildPrime
```

A release gate rejects a preset that bypasses Unit Templates with private reference DOM/CSS/runtime behavior.

For `floatingChrome`, the outer Unit owns the complete silhouette and its inset. A direct `action-v2` inside that chrome is therefore context-sized to the chrome content box; the Field-height policy used by direct Actions beside form controls must not enlarge the floating action and consume the chrome inset. This preserves equal top/right/bottom/left spacing across Desktop and Mobile.

Two executable proofs are retained:

- `examples/sdk149-reference-workbench/` — consumes the preset;
- `examples/sdk151-unit-resonance-parity/` — does **not** consume the preset and manually composes the same accepted layout from Unit Templates.

These two paths must produce the same canonical composition signature.

## Native plugin blueprints

Native-plugin blueprints are **SDK authoring/migration evidence only**. They are generated and validated under `tools/sdk` / SDK artifacts and are intentionally excluded from the runtime UI composition. Runtime Core knows Unit contracts and generic policies, never native plugin ids or private selectors.

Every directory under `src/plugins` has a Unit Blueprint. The blueprint now records not only vocabulary but also region-level reconstruction recipes: Unit, variant, semantic role, placement/header/density details where applicable, and the parity dimensions required for migration. Nonvisual providers explicitly use `provider` rather than being silently omitted.

A source-census release gate scans the current native plugin sources for canonical Core UI usage (Workspace, Page/Header, Action/Toolbar, Field/Check, List/Table, PlotView/PlotGroup/ScientificPlot, Legend, SplitHandle, Dialog/Menu, Status and Portable). If a native plugin uses one of these canonical primitives but its Blueprint omits the corresponding Unit, the SDK release fails.

The blueprint is a migration contract, not permission to modify the current plugin. Every visual plugin targets `function + structure + geometry + style + interaction + responsive + mobile` parity; migration is complete only when the replacement passes all seven dimensions.

## Current migration status

SDK 1.51 establishes the complete catalog/runtime/type/documentation foundation and proves the complex Resonance-style workbench can be built both through the preset and through manual Units.

Current native plugins remain on their accepted implementation path. Future phases should migrate them one at a time under shadow/parity tests; no bulk rewrite is allowed.

## Lower-level APIs

Current low-level APIs remain available because unusual domain UIs may need them:

- `ctx.ui.workspaceSurface`
- `ctx.ui.plotViews`
- `ctx.ui.plotGroups`
- `ctx.ui.groupArea`
- `ctx.ui.scientificPlot`
- `ctx.ui.components`

They are not a second visual design system. Unit Templates are the strict reusable contract; low-level APIs are infrastructure primitives.

## Accepted geometry parameters

`layout.create(...)` and `layout.apply(...)` may request exact geometry only through the Core-owned accepted vocabulary published as `units.layoutGeometryValues` / `units.layout.geometryValues`. Responsive geometry may use only `units.layoutBreakpoints`. Arbitrary values are rejected at runtime; plugin-private CSS variables and container names are not public contract.

```js
const row = ctx.ui.unitTemplates.layout.create(host,{
  variant:'row',
  geometry:{gap:'8px',width:'100%'},
  responsiveGeometry:[
    {maxWidth:760,geometry:{flexDirection:'column'}}
  ]
});

ctx.ui.unitTemplates.layout.apply(existingUnit,{
  variant:'identity',
  geometry:{padding:'12px 10px'}
});
```

This layer exists for 1:1 reconstruction of accepted native-plugin geometry while keeping Core/StyleGate as the only style writer. It is not an escape hatch for arbitrary CSS.

