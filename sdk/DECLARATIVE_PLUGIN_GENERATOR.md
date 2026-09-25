# Declarative Plugin Generator — Phase F prototype

This prototype is a thin authoring layer above the frozen DK Data Studio SDK. It does not define a second UI runtime.

The ownership chain is:

Python declaration -> declarative schema v1 -> generated Plugin API 1.19 source -> public Unit Templates -> existing Core / Presenter.

Unit Templates remain 2.5.38 with 41 Units and 73 Layout recipes. The generator may only select published Unit variants and bounded public configuration. It must not generate private CSS, raw page HTML, plugin-id branches, Presenter rules, or Unit_for_xxx specializations.

## Python authoring

A plugin can be authored directly in Python:

    from dkds_plugin_gen import PluginBuilder

    spec = {
        "schema": "dkds.declarative-plugin.v1",
        "plugin": {
            "id": "com.example.generated",
            "name": "Generated Workbench",
            "version": "1.0.0",
            "description": "Generated from Python"
        },
        "page": {
            "id": "generated-page",
            "label": "Generated",
            "title": "Generated Workbench",
            "subtitle": "Unit-first"
        },
        "workspace": {
            "activity": "generated-workbench",
            "primaryRole": "scientific-primary"
        },
        "data": {"accepts": ["science.transport.iv"]},
        "content": [
            {"kind": "note", "text": "Generated with public Units only."},
            {
                "kind": "plot",
                "id": "reference",
                "title": "Reference curve",
                "xTitle": "X",
                "yTitle": "Y",
                "points": [[-1, 1], [0, 0], [1, 1]]
            }
        ]
    }

    PluginBuilder(spec).write("dist/generated")

The output is an ordinary plugin folder containing plugin.json, plugin.js and README.md. It can be checked with the existing SDK validator:

    node sdk/tools/dkds-plugin.js validate dist/generated

For JSON-driven workflows the same schema is available through the CLI:

    python sdk/python/dkds_plugin_gen.py check plugin.spec.json
    python sdk/python/dkds_plugin_gen.py build plugin.spec.json dist/generated

## v1 scope

Schema v1 remains additive and deliberately bounded. It supports standalone workbench identity, data accepts/produces, page metadata, semantic PRIMARY role, header actions, a titleless parameter PRIME with number/text/select/checkbox fields, notes, curve plots, canonical Unit tables, and bounded Unit PlotGroup compositions. Python-authored pure functions may be lowered at build time and bound to existing Core Task Runner actions.

Generated data bindings use only current Plugin API contracts. Task inputs may come from parameter Units or bounded columns of one or more plugin-scoped DataTable sources. Task results may update multiple Unit ScientificPlot/Table surfaces, including plots owned by a Unit PlotGroup, and may publish multiple declared canonical DataTable Artifacts. Standalone, TOP and Tool hosting may be selected through the bounded host declaration. Arbitrary data mutation, dynamic Python semantics, private interaction semantics, and new runtime abstractions remain outside this generator layer unless separately expressed by existing public SDK contracts.

## Acceptance rules

Generated output must pass the normal SDK plugin validator. It must contain no private stylesheet and no raw DOM authoring. Parameter presentation must use the existing fixed-titleless data-control PRIME contract. Generated plots must use Unit ScientificPlot. Mobile behavior comes from the existing Presenter semantics, not generated mobile CSS.

The checked-in Python reference under examples/declarative-python-reference is the executable Phase F proof.

## Real notebook Source Workflow — SDK 1.51.70

The source importer no longer treats a Jupyter notebook as merely a bag of function definitions. `dkds.python-source-model.v2` embeds one static `dkds.source-workflow.v1` graph.

For every code cell the model records top-level definitions, loaded names, imports, cross-cell producer dependencies, execution role, and classified effects. This lets authoring distinguish three different things that are often mixed in research notebooks:

- **Host behavior** — `pd.read_csv/read_excel`, plotting calls, clipboard export, and CSV/Excel export are candidates for canonical DKDS DataTable / ScientificPlot / Host I/O replacement.
- **Scientific transform semantics** — Pandas/DataFrame, NumPy-array, and SciPy operations are explicit lowering requirements. They are not silently carried into the package and do not cause a Python runtime to be embedded.
- **Portable pure compute** — functions already proven by the existing bounded Portable compiler may still build immediately through the JavaScript Task path.

Cross-cell state is represented by symbol edges such as `cell:2 --raw--> cell:3`. The workflow candidate remains fail-closed while unlowered transform families exist. The purpose of the graph is to provide a deterministic basis for the next Table/Array Transform IR stage, not to emulate a live notebook kernel.


## Python / Jupyter Source Import — SDK 1.51.69

SDK 1.51.69 adds one authoring path above the existing declarative generator; it does **not** add a Python runtime or a Jupyter kernel to DK Data Studio.

    .py -------------------\
                            -> dkds.python-source-model.v1
    .ipynb -> code cells --/          |
                                      -> signature/default/type analysis
                                      -> Portable compatibility report
                                      -> dkds.declarative-blueprint.v1
                                      -> existing PluginBuilder / Portable Task lowering
                                      -> production Plugin Manager validation
                                      -> .dkplugin export or direct install

The importer is static. It uses Python's standard-library AST parser and never imports or executes the user's module. Notebook markdown is ignored; code cells feed the same Source Model as ordinary Python. Jupyter magics, shell escapes and unsupported Python constructs are reported with file line or notebook cell/line coordinates rather than collapsed into a generic conversion error.

Automatic Blueprint inference is deliberately conservative. Portable scalar parameters become public ParameterForm fields. A parameter explicitly annotated as `list[...]` becomes one bounded DataTable column input selected by the argument name. Ambiguous inputs such as untyped required parameters, `dict`, `Any` and `object` fail with `BLUEPRINT_INPUT_UNRESOLVED` instead of guessing domain semantics. Dictionary results named `points`, `rows`, and scalar keys may become public ScientificPlot, Table and Metric projections when their shape can be proven statically.

Command-line inspection/build is available with:

    python sdk/python/dkds_source_import.py analyze analysis.py --output report.json
    python sdk/python/dkds_source_import.py analyze notebook.ipynb --output notebook-report.json
    python sdk/python/dkds_source_import.py build analysis.py --function-id py:1:analyze --package analyze.dkplugin --report build.json

Desktop Plugin Manager exposes the same pipeline through **从 Python / Jupyter 创建**. It previews the generated declarative Blueprint, runs the production package validator before enabling export/install, and installs through the existing Plugin Manager transaction. Python 3 is needed only during this authoring operation; the resulting package contains no `.py`, bytecode, notebook, Python provider, interpreter, or fallback backend.

## Portable Python task lowering — SDK 1.51.46

Python is not a DK Data Studio runtime backend. It is an optional authoring language used before packaging.

A Python-authored task follows this one-way pipeline:

    Python function
        -> bounded AST validation
        -> JavaScript DKDSTaskDefinition
        -> plugin package
        -> existing Core Task Runner

The generated package contains no Python source or bytecode and does not declare a Python provider/runtime. There is no runtime fallback. If lowering cannot prove the construct belongs to the portable subset, generation fails.

The rule is intentionally modeled after PyDroid-Node's conservative portable-function lowering, but DK Data Studio is stricter: PyDroid-Node may preserve source-authoritative Python when a construct cannot be promoted; DKDS cannot, because Python is not the default or fallback backend.

Current portable subset:

- one synchronous function with explicit arguments and simple portable annotations;
- local assignments and structured-cloneable list/dictionary results;
- numeric arithmetic, scalar boolean/comparison expressions, approved pure builtins and approved math functions;
- if/else;
- bounded for/range loops;
- list.append;
- direct item read/write;
- a hard generated-task iteration ceiling.

Current fail-closed exclusions include imports, free/global names, global/nonlocal state, async/await, yield, while, try/raise, with, classes, lambdas, comprehensions, generator expressions, dynamic keyword-call semantics, slices and any construct not explicitly lowered.

Python functions are attached from the Python authoring API:

    builder.add_portable_task(
        "analyze",
        analyze_function,
        action_id="run",
        parameter_map={"sample_count": "sample-count"},
        result_plot="result-curve",
        result_key="points"
    )

The builder writes a standard manifest tasks entry, a generated-task-*.js worker and the normal plugin.js. The action submits through ctx.tasks; the result may be projected into a Unit ScientificPlot. No alternate worker pool or runtime is created.

The executable reference is examples/declarative-python-task-reference. The release gate executes the generated JavaScript task in Node, verifies its numeric result, validates the complete generated plugin with sdk/tools/dkds-plugin.js, and verifies that the output directory contains no Python files.

## Bounded Artifact/DataTable pipeline — SDK 1.51.47

The generated runtime does not obtain an unscoped/global project table and does not use a full-Artifact `get()` as its task-input shortcut. An `artifact-column` input binding follows this fixed chain:

    ctx.data.sources.list()
        -> source selector
        -> ctx.data.artifacts.columnMetadata(artifactId)
        -> exact column selector
        -> declared maxRows check
        -> ctx.data.artifacts.readColumnRange(...)
        -> structured-cloneable JS task payload

The source selector operates on the current plugin's scoped source catalog. A column selector may match stable metadata such as `id`, `key`, `name`, `role`, `quantity`, or `dimension`; it must resolve exactly one column. `maxRows` is required to remain within the Core single-range ceiling and is limited to 1..65536. Oversized or ambiguous input fails before the worker is submitted.

Example authoring:

    builder.add_portable_task(
        "scale-table",
        scale_table,
        action_id="run",
        input_bindings={
            "x": {
                "kind": "artifact-column",
                "source": {"semanticType": "science.transport.iv", "index": 0},
                "column": {"role": "x"},
                "maxRows": 65536
            },
            "gain": {"kind": "parameter", "field": "gain"}
        },
        result_plot="scaled-curve",
        result_table="scaled-table",
        publish_table={
            "id": "generated-result",
            "name": "Generated result",
            "semanticType": "science.generated.result",
            "columns": [
                {"key": "x", "role": "x", "resultKey": "x"},
                {"key": "y", "role": "y", "resultKey": "y"}
            ]
        }
    )

A published semantic type must already appear in `data.produces`. The generator creates the output through `ctx.data.model.createTable()` and publishes it through `ctx.data.artifacts.publish()`. Its lineage parents are the real input Artifact IDs; lineage parameters contain parameter-bound scalar/configuration values, not duplicated source-column arrays.

Table output uses the existing Unit Table/TableSurface path, plot output uses Unit ScientificPlot, and execution remains the existing Core Task Runner. No Python source, Python bytecode, Python provider, alternate Store, alternate table renderer, or private worker pool is generated.

The executable reference is `examples/declarative-python-artifact-reference`; its release gate verifies bounded reads, numerical JS-task execution, Unit Table/Plot projection, canonical Artifact publication, lineage, oversized-input rejection, ordinary SDK validation, and absence of Python runtime files.

## Multi-source scientific workbench generation — SDK 1.51.48

SDK 1.51.48 generalizes the bounded pipeline without adding another runtime. A single generated Task may bind arguments to different scoped source indexes and may fan one immutable Task result out to several public scientific surfaces:

    scoped DataTable A ─┐
                         ├─> bounded column reads ─> generated JS Task
    scoped DataTable B ─┘                              │
    parameter Units ──────────────────────────────────┘
                                                       ├─> Unit PlotGroup / PlotView / ScientificPlot
                                                       ├─> Unit Table
                                                       └─> one or more canonical DataTable Artifacts

A declarative \`plot-group\` selects the existing public PlotGroup contract. Its bounded authoring fields are \`columns\`, \`maxColumns\`, \`minItemWidth\`, \`density\`, \`responsive\`, and two or more child curve plots. The generator does not emit group CSS, draggable-window geometry, Mobile rules, or a private plot implementation. PlotGroup owns grouping and responsive scientific layout; PlotView owns portable plot lifecycle; ScientificPlot owns rendering and standard scientific interaction.

Plural Task projections are explicit:

    builder.add_portable_task(
        "compare-curves",
        compare_curves,
        action_id="compare",
        input_bindings={
            "x_a": {
                "kind": "artifact-column",
                "source": {"semanticType": "science.transport.iv", "index": 0},
                "column": {"role": "x"},
                "maxRows": 65536
            },
            "x_b": {
                "kind": "artifact-column",
                "source": {"semanticType": "science.transport.iv", "index": 1},
                "column": {"role": "x"},
                "maxRows": 65536
            }
        },
        result_plots=[
            {"id": "curve-a", "key": "points_a"},
            {"id": "curve-b", "key": "points_b"}
        ],
        result_tables=[
            {"id": "comparison-table", "key": "rows"}
        ],
        publish_tables=[
            {
                "id": "comparison",
                "name": "Comparison",
                "semanticType": "science.generated.comparison",
                "columns": [...]
            },
            {
                "id": "delta",
                "name": "Delta",
                "semanticType": "science.generated.delta",
                "columns": [...]
            }
        ]
    )

The singular \`result_plot\`, \`result_table\` and \`publish_table\` arguments remain supported for backward-compatible simple generators. Plural projections must target unique declared IDs. Every published semantic type must be listed in \`data.produces\`.

The executable reference is \`examples/declarative-python-scientific-workbench\`. Its gate proves two separate scoped DataTables, four bounded column reads, one lowered JavaScript Task, three generated PlotGroup curves, one Unit Table projection, two canonical output Artifacts, dual-source lineage, and preservation of the existing strict plot-projection lifecycle.

This remains an authoring capability only. It does not change Plugin API 1.19, Unit Templates 2.5.38, Core Task Runner, Artifact Store, Presenter, or the production plugins.


## Scientific interaction and replay-safe domain commands — SDK 1.51.49

Phase F generated workbenches may now opt into the existing scientific interaction path instead of writing plot-local synchronization code.

Top-level \`interaction\` declares one Core interaction context. Individual generated plots may then declare:

- \`identity.input\` and \`identity.entityType\` for stable reference identity;
- \`selectionTarget:"series"\` for reference-only selection;
- \`axisSemantics\` with explicit quantity/unit/dimension metadata;
- \`viewport.link\`, \`linkGroup\` and bounded \`linkedAxes\`;
- \`legend.link\`, \`linkGroup\` and bounded \`maxLinkedTargets\`.

Viewport linking is accepted only when every linked axis has explicit quantity and unit semantics. Legend linking is accepted only when the plot declares stable identity. The generator does not infer scientific compatibility from labels or colors.

Generated runtime wiring remains:

    generated plot declaration
        -> Unit ScientificPlot / PlotView
        -> ctx.ui.interaction
        -> existing project-scoped transaction/link machinery

Portable Tasks may also declare \`domain_command\`. The generator registers that command through the existing validated command registry and attaches the same task/data bindings needed for replay metadata. Re-execution remains subject to existing source identity/revision checks; the generator does not create a second command bus or bypass stale-input rejection.

The checked-in executable reference under \`examples/declarative-python-interactive-workbench\` and \`tests/test-phase-f-interaction-command-generator.js\` verifies interaction creation/link lifecycle, stable series reference metadata, scientific viewport semantics, bounded legend linkage, domain-command registration/execution and replay-safe source snapshots.

This release changes only the authoring/compiler surface. Plugin API remains 1.19.0; Unit Templates remain 2.5.38; Core Interaction, Selection, command registry, Artifact Store, Task Runner, Presenter and production plugins retain their existing ownership.


## Hosted TOP / Tool workspace generation — SDK 1.51.50

The declarative \`host\` block chooses only among existing host contracts:

    "host": {
      "kind": "standalone" | "top" | "tool"
    }

\`standalone\` remains the default and does not emit a dedicated-window contract. TOP and Tool hosting add a bounded host declaration with labels/icon and window preferences:

    "host": {
      "kind": "top",
      "label": "Generated TOP",
      "contextLabel": "Generated TOP Workspace",
      "icon": "◇",
      "defaultSuper": true,
      "window": {
        "title": "Generated TOP Workspace",
        "width": 1280,
        "height": 820,
        "minWidth": 860,
        "minHeight": 560,
        "prewarm": false,
        "reuse": true,
        "persistence": "project",
        "artifactHydration": "live"
      }
    }

The generator does not accept raw host scripts, runtime files or arbitrary dependency arrays. It derives the ordinary Plugin API manifest and runtime wiring:

    host.kind = top
        -> pluginType: workbench
        -> workspace.role: top
        -> matching workspace.activity / window.activity
        -> ctx.ui.activities.add(... openMode:'window')
        -> ctx.ui.pages.add(... activity/pageId)
        -> ctx.ui.topWorkspace.register(...)
        -> the same generated Unit Workspace

    host.kind = tool
        -> the same lifecycle
        -> pluginType: tool
        -> Core places the opener in the existing Tool category

If generated content contains ScientificPlot surfaces, the hosted manifest automatically declares the established \`scientific-renderer\` dedicated-window dependency. It is not an author-controlled renderer selector.

Generated parameter PRIME metadata is mirrored into the TopWorkspace layout as the standard \`presentationPurpose:'parameters'\` / \`presentationRole:'data-control'\` contract. PRIMARY retains the declared public \`workspace.primaryRole\`. Mobile/Desktop projection remains owned by the existing Presenter and Unit contracts.

Window geometry is deliberately bounded. Width/height and minima are author preferences inside the existing window contract; they do not become Unit geometry and do not affect Mobile Presenter allocation.

The executable reference is \`examples/declarative-python-hosted-workspace\`. Its gate builds both a TOP package and a Tool package, validates each with the ordinary SDK validator, executes each generated plugin in a VM host, and verifies Activity -> Page -> TopWorkspace -> Unit Workspace lifecycle plus canonical parameter PRIME projection.

No private BrowserWindow code, IPC path, Presenter branch, dedicated-window fork, specialized Unit or alternate lifecycle is generated.


## Production-shaped Unit blueprint parity — SDK 1.51.51

SDK 1.51.51 moves Phase F from capability examples toward production-plugin reconstructability without introducing plugin-specific generation. The declarative schema can now select the existing \`fill-rows\` PRIMARY layout, canonical Metric grid and a bounded \`result-split\` composition backed by the public SplitPane, ScientificPlot and Table Units.

A production-shaped result region is declared rather than hand-built:

    "workspace": {
        "primaryRole": "scientific-primary",
        "primaryScroll": "contained",
        "mainLayout": "fill-rows"
    },
    "content": [
        {
            "kind": "metrics",
            "id": "analysis-metrics",
            "items": [
                {"id": "metric-value", "label": "Value", "value": "—"}
            ]
        },
        {
            "kind": "result-split",
            "id": "analysis-results",
            "axis": "y",
            "resizeTarget": "second",
            "defaultSize": 180,
            "min": 140,
            "reserve": 300,
            "reflowBelow": 920,
            "plot": {...},
            "table": {...}
        }
    ]

The generated runtime maps this directly onto public Unit ownership:

    Layout(fill-rows)
        -> Metric(metric-grid)
        -> Panel(detached, fill) -> ScientificPlot
        -> SplitPane(resizable)
             first  = plot panel
             second = Unit Table

Portable Tasks may project scalar outputs into Metric Units through \`result_metrics=[{"id":...,"key":...}]\` in the same execution that updates generated Plot and Table outputs.

The executable reference is \`examples/declarative-python-unit-blueprint-parity\`. Its release gate compares the generated public Unit vocabulary against the accepted production \`transfer-vth-lab\` Unit blueprint as independent evidence, then executes the generated plugin and task. The generator never switches on that plugin id and does not copy its private CSS, state store, threshold implementation or presentation source.

This is the first production-shaped reconstruction gate, not a production-plugin replacement. Full 1:1 native-plugin reconstruction still requires the remaining generic composition vocabulary to be represented declaratively and validated under the same no-specialization rule.


## Grouped control surfaces — SDK 1.51.52

A titleless parameter/data-control PRIME may use either the original flat \`parameters.fields\` form or a grouped form. The two forms are mutually exclusive. Grouped authoring reuses existing Units and does not define a new panel runtime.

Each group declares \`id\`, \`title\`, \`variant:"headed"|"plain"\`, \`layout:"stack"|"form-grid-2"\`, optional \`badge\`, \`fields\`, \`note\`, and \`actionIds\`. Headed groups use the canonical headed Panel. Plain groups use a plain Panel plus canonical content Header. Fields map to Field/Check, badges to Chip, notes to Note, and actions to Toolbar.

Top-level \`actions[]\` remains the only action catalog. Actions may declare \`icon\` and \`order\`; \`page.actionIds\` and group \`actionIds\` only select from that catalog and create no second command path.

\`page.close:true\` is valid only for \`host.kind:"top"\` or \`"tool"\` and lowers to the existing hosted workspace close lifecycle. Standalone generation emits no \`ctx.workspace\` close reference.

The executable reference \`examples/declarative-python-unit-blueprint-parity\` now covers the accepted Transfer Vth public Unit spine including grouped Data/Extraction controls, hosted TOP lifecycle, titleless data-control PRIME, Metric grid, ScientificPlot and resizable SplitPane/Table. The generator contains no Transfer-Vth-specific branch and production plugin source remains unchanged.


## Second production blueprint: Tool-designer composition — SDK 1.51.53

SDK 1.51.53 adds a second independent production-shaped reconstruction gate so Phase F is not validated only against one Vth-style scientific workbench. The accepted Pulse Sampler Unit presentation is used as external evidence for generic Tool composition only; the generator does not branch on its plugin id or copy its domain/runtime source.

The public declarative vocabulary now includes bounded Workspace rail preferences:

    "workspace": {
        "primaryRole": "utility-primary",
        "leftWidth": 540,
        "leftMin": 520,
        "leftReserve": 520,
        "primaryEndInset": "content",
        "layoutStateVersion": "tool-layout-v1"
    }

and a titleless parameter PRIME may declare public presentation metadata:

    "parameters": {
        "priority": 96,
        "embedded": true,
        "autoOpen": false,
        "stateVersion": "tool-parameters-v1",
        "groups": [...]
    }

A group may independently select:

- a body layout such as \`stack\` or \`fill-rows\`;
- a field-only sublayout such as \`form-grid-2\`, \`analysis-control-grid\`, or \`result-control-grid\`;
- compact/standard Tabs;
- an \`action-grid-2\` or \`action-grid-4\` populated from the single validated top-level action catalog;
- an ordinary/header/floating/segmented Toolbar, optionally projected through the public \`segment-bar\` or \`toolbar-wrap\` recipe;
- one parameter-owned Unit Table.

All action surfaces reuse the same action-to-Task/Command/status invocation mapping. Explicit \`page.actionIds: []\` now means no PageHeader actions; only an omitted \`actionIds\` field inherits the full catalog.

The executable reference is \`examples/declarative-python-tool-blueprint-parity\`. Its gate compares the generated public Unit vocabulary with the accepted Pulse Sampler blueprint and production Unit presentation as independent evidence, then executes the generated Tool host and verifies Workspace 540/520/520 preferences, compact Tabs, form-grid-2, action-grid-4, segment Toolbar, parameter Table, and PRIME priority/embedded/auto-open metadata.

This proof does not copy Pulse Sampler live-domain/state, waveform generation, steady-state extraction Task, private DOM hooks or plugin-specific presentation logic. Python remains authoring-time only and the generated runtime stays on existing Plugin API 1.19 + Unit/Core contracts.


## Third production scientific blueprint parity — SDK 1.51.54

SDK 1.51.54 extends the declarative authoring vocabulary with four existing public Units that are important for production scientific workbenches:

- \`summary\` -> Unit Summary (\`row\` or \`strip\`);
- \`list\` -> retained Unit List with canonical leading/title/meta item anatomy;
- \`empty-state\` -> Unit EmptyState;
- \`plot-view\` -> portable Unit PlotView wrapping the existing Unit ScientificPlot.

A declarative PlotView owns only bounded public authoring preferences such as placements, default placement and content min/max height. Portable lifecycle, plot chrome, export actions and move/dock behavior remain owned by Core PlotView/Portable; rendering and scientific interaction remain owned by ScientificPlot.

The executable reference is \`examples/declarative-python-pulse-analysis-parity\`. The accepted production Pulse Analysis blueprint is used only as independent structural evidence that these Units are required by a real first-party scientific workflow. The generated reference deliberately contains no Pulse batch controller, segmentation/read-window algorithm, production DOM ids, plugin CSS, feature runtime or Presenter branch.

This is the third independent production-shaped reconstruction gate after the Vth-style scientific workbench and Pulse Sampler-style Tool designer. Python remains authoring-time only and Unit Templates remain unchanged.


## Nested public ParameterForm in grouped PRIME — SDK 1.51.55

The first TER reconstruction gap is now represented without adding a Unit or a second parameter runtime. A grouped titleless parameter PRIME may declare one bounded `parameterForm` child with `id`, public Parameter Schema `fields`, `compact`, `autoFit`, and `layoutOwner:"core"|"host"`.

The compiler lowers this directly to `units.parameterForm.mount(...)` inside the existing group Panel and keeps the outer PRIME on the canonical `fixed-titleless` data-control contract. Arbitrary JavaScript, private CSS, plugin-owned layout, and plugin-specific Unit names remain invalid.

This closes the concrete composition-position gap identified by TER's transformed Vg–Vd controls. It is intentionally a compiler vocabulary change only: Plugin API remains 1.19.0, Unit Templates remain 2.5.38, and the 41-Unit / 73-recipe freeze is unchanged.


## Generic PRIME / SUB surface composition — SDK 1.51.56

The authoring IR now has an optional `surfaces` array for non-parameter PRIME and SUB surfaces. A surface owns only semantic/workbench metadata and a bounded recursive `children` tree; it does not introduce a new runtime or Unit type.

Current bounded child vocabulary: `layout`, `panel`, `header`, `note`, `field`, `toolbar`, `parameter-form`, `summary`, `empty-state`, `list`, `legend`, and `table`. Every node lowers directly to the corresponding existing public Unit Template call. Arbitrary DOM, CSS, JavaScript callbacks, plugin-specific Unit names, and plugin-owned parameter PRIME surfaces remain rejected.

PRIME surfaces lower through `units.prime.build(...)`; SUB surfaces lower to the existing Workbench SUB registration shape; both are passed to the same `workbench.compose({ primary, primes, subs })` call as production plugins. Hosted TOP/Tool metadata is derived from the same normalized surfaces, avoiding a second presentation description.

This is the generic compiler mechanism needed by Resonance's inspector/group/detail surfaces while preserving the frozen 41-Unit / 73-recipe catalog and Plugin API 1.19.0.


## TER reconstruction specimen — SDK 1.51.57

PlotGroup child declarations now carry bounded public `placements`, `defaultPlacement`, and `detailGeometry` (`contentAspectRatio`, `contentMinHeightPx`, `contentMaxHeightPx`). These values lower directly to the existing PlotView contract owned by PlotGroup; they do not create plugin CSS or a second geometry engine.

`examples/declarative-ter-reconstruction/build_plugin.py` is the first production-shaped reconstruction specimen. It proves the TER presentation spine can be authored through the frozen public vocabulary: canonical titleless parameter PRIME, grouped controls, nested ParameterForm, seven runtime-owned scientific plots in PlotGroup, accepted heatmap/R–V detail geometry, and the two result tables. Production TER algorithms/controllers remain intentionally outside this authoring specimen and are not duplicated.


## Resonance-shaped multi-surface reconstruction — SDK 1.51.58

Generic non-parameter PRIME surfaces now support bounded `detailGeometry` and lifecycle command references (`onOpenCommand`, `onCloseCommand`, `onPlacementChangedCommand`); SUB surfaces support `onShowCommand`. These callbacks contain no authored JavaScript: generated code only routes a bounded event payload to the existing `ctx.commands` service when that command is registered. Surface children additionally support public Status, direct Action, FloatingChrome, and runtime-owned ScientificPlot Units.

`examples/declarative-resonance-surfaces/build_plugin.py` proves the structural spine required by the production Resonance workbench: curve-inspector PRIME, group-analysis PRIME, and physics/spacing/gate SUB surfaces with nested public Units. The remaining production-shaped gap is the dynamic local group-columns menu/action model; it is deliberately not replaced with a plugin-id branch or copied Resonance domain state.


### Movable PRIME canonical chrome ownership

A generic movable PRIME must bind exactly one declared public Header child as its canonical drag/control chrome. `chromeHeaderId` may select that Header explicitly; when exactly one top-level Header exists it is inferred. The compiler lowers the same Header handle to PRIME `handle` and `controlsHost`, so Core does not synthesize a duplicate titlebar. A movable PRIME without a canonical Header fails generation rather than falling back to private selectors or duplicate chrome.


## PRIME choice-menu actions — SDK 1.51.59

Generic PRIME surfaces may declare bounded `actions` of kind `choice-menu`. The compiler does not create a menu implementation: it passes a dynamic action descriptor to the existing Workbench `ActionGroup` and reuses the same canonical Header action host selected by `chromeHeaderId`.

The menu's current value is projected from `ctx.commands.history({ commandId, status: 'completed', limit: 1 })`. Selecting an item invokes only the declared command with one bounded argument key, then asks the existing PRIME ActionGroup to render again after completion. This deliberately avoids a second mutable preference/state owner in generated presentation code. The Resonance-shaped specimen now covers the accepted `每行：auto/1..6` group-columns action structurally; production numerical/state ownership remains outside the generator.


## Dependency-scoped live Domain Adapter consumption — SDK 1.51.60

A declarative package may declare one top-level `domainAdapter` with a provider-qualified `ref` and matching plugin `dependency`. The generated manifest adds the ordinary `services` Core requirement and a dependency-scoped `pluginDependencies` entry; activation connects through `ctx.services.domain.connect(ref)`. No raw service is exposed.

PRIME `choice-menu` actions support either the existing `commandId` path or a mutually exclusive `domainAction + statePath` path. Domain-bound menus read the selected value from `liveDomain.snapshot().state` and invoke only the declared adapter action. The connection subscription re-renders only affected ActionGroups when the authoritative owner publishes a change. The generator stores no duplicate preference value.


## Read-only live snapshot bindings — SDK 1.51.61

Surface nodes may bind public Status, Metric, Field/Check and Table Units to a `domainAdapter` snapshot through a dotted `statePath`. Text-like bindings may add `fallback`, `prefix` and `suffix`; Table bindings consume an array path. The generated shell creates one `liveBindings` collection and one `refreshLiveBindings()` pass, so one authoritative adapter snapshot fans out to every bound public Unit handle.

The lowering uses only public update surfaces: Table `setData(columns, rows)`, Metric `value.textContent`, Field `control.value`, Check `input.checked`, and the Status element returned by the Unit. Bindings are read-only. Summary is intentionally not supported because the current public Summary handle exposes no `setItems()`-style updater; the generator will not reach into private descendants to simulate one.


## Writable live parameter bindings — SDK 1.51.62

Canonical parameter PRIME fields may declare a bounded `binding` with `statePath`, `domainAction`, optional `argumentKey` (default `value`) and up to eight flat scalar `staticArgs`. The field still comes from the existing public Field/Check Unit. Snapshot refresh writes through the public handle; user change is captured only by the Unit's public `onChange` callback and invokes `liveDomain.invoke(domainAction, payload)`.

Type lowering is fixed: Checkbox -> boolean, Number -> finite number or null for an empty field, Select/Text -> string. No authored JavaScript, nested payload object, private selector, DOM query, local state store or second command bus is accepted. The Resonance specimen now binds `showRejected` and `showWidth` directly to the production `setPeakDisplay` Domain Adapter action while reading `workspace.peakDisplay.*` from the same owner snapshot.


## Live ScientificPlot curve-array projection — SDK 1.51.63

A top-level Unit-owned `content.kind:"plot"` may declare a bounded `binding` with one adapter `statePath`, one per-curve `pointsPath`, required `xKey/yKey`, and optional `idKey/labelKey/colorValueKey/directionKey`. All paths/keys are declarative identifiers; no mapping function or authored JavaScript is accepted.

The generated shell owns only a detached `curves[]` render projection. Each live snapshot refresh maps finite x/y values to the public ScientificCurve shape and calls the existing ScientificPlot handle's `requestRender('domain-adapter')`. The generator does not decide visibility, filtering, peak acceptance, analysis or scientific identity. A bound plot must be `plotVariant:"curve"`, `renderOwner:"unit"`, must declare a top-level Domain Adapter, and may not also declare static points or explicit linked interaction policy.

The Resonance specimen uses this path for its PRIMARY plot: production `visibleSweepIds()` remains the visibility owner; the Resonance Domain Adapter publishes only the matching detached `visibleSweeps`; the declarative plot maps each sweep's `points[].v/i` into ScientificCurve points.


## Live curve selection — SDK 1.51.64

A live curve-array binding may optionally declare `selectAction`. The generated public ScientificPlot receives an `onCurveSelect` callback that extracts only the projected `curve.id` and invokes `liveDomain.invoke(selectAction, { id })`. No arbitrary payload mapping, authored callback, local selected-id store or domain navigation logic is accepted. The production Domain Adapter remains responsible for what selecting that id means.

The Resonance specimen declares `selectAction:"selectSweep"`; therefore PRIMARY curve clicks reach the same production selection owner while the declarative shell remains presentation-only. Marker selection, direct peak manipulation, double-click navigation and range actions remain outside this gate.


## Selected-curve focus projection — SDK 1.51.65

A live curve-array plot may add `selectedIdPath`. The path is resolved against the same Domain Adapter snapshot used for curve projection. Generated code retains only a transient string render projection and exposes `getSelectedCurveId:()=>selectedId` to the existing public ScientificCurveSurface. Core remains the visual focus owner.

This is intentionally separate from `selectAction`: `selectAction` routes user intent back to the production owner, while `selectedIdPath` reads the production owner's resulting selection back into the view. Neither side creates a second selection model. Resonance uses `selectAction:"selectSweep"` plus `selectedIdPath:"selectedSweep.id"`.


## Live marker-array projection — SDK 1.51.66

A live curve-array plot may include a nested `markers` binding. The adapter owns which marker rows exist; authoring declares only `statePath`, marker field keys, optional `selectedIdPath`, optional `selectAction`, and up to eight static scalar arguments. Generated code maps rows into the public ScientificMarker shape, uses `getSelectedMarkerIds()` for Core-owned focus paint, and invokes the selected adapter action with `{...staticArgs,id,additive}`.

The generator deliberately has no peak acceptance, visibility, marker-shape, locking, physics, FWHM or inspector logic. Resonance extracts its existing marker rules into one pure `main-marker-projection.js`; both the accepted production ScientificCurveSurface and the Domain Adapter call that same projector. The Resonance declarative specimen reads `mainMarkers`, `selectedPeak.id`, and routes marker selection to `selectPeak` with `openInspector:true` as a fixed adapter argument.


## Resonance Inspector read-only reconstruction — SDK 1.51.67

No new declarative primitive is required for the first Inspector cutover slice. Resonance extracts its accepted selected-sweep/selected-peak detail rows into one pure `inspector-detail-projection.js`. The production Inspector and its Domain Adapter both consume that same projector. The generated Resonance specimen reads `inspector.title` with the existing Status live binding and `inspector.rows` with the existing Table rows binding.

This slice is intentionally read-only. Peak category controls, label editing, accept/lock/delete actions, FWHM analysis-window edits, and the auxiliary transformed curve remain owned by the accepted production Inspector runtime until separate parity gates are defined. The generator owns no second metric calculation, category model or selection state.

## Resonance Inspector domain-bound operation buttons — SDK 1.51.68

The generic Surface Action `domainAction` path is now exercised by the Resonance Inspector reconstruction. Its five fixed operation-grid buttons (accept-state toggle, lock-state toggle, FWHM automatic-window reset, peak deletion, and source-sweep selection) are ordinary public Action Units inside the existing `action-grid-2` Layout recipe. Each button uses `enabledPath: "selectedPeak.id"` and invokes only the declared dependency-scoped live Domain Adapter action.

The Domain Adapter does not implement those mutations. It delegates them to the already-existing production Resonance Inspector mutation service, so generated UI owns neither peak state nor a parallel selection/mutation controller. Dynamic category-palette assignment and label editing still require dynamic collection/value authoring and therefore remain with the production Inspector runtime in this release.
