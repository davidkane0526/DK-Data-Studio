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

Schema v1 remains additive and deliberately bounded. It supports standalone workbench identity, data accepts/produces, page metadata, semantic PRIMARY role, header actions, a titleless parameter PRIME with number/text/select/checkbox fields, notes, curve plots, and canonical Unit tables. Python-authored pure functions may be lowered at build time and bound to existing Core Task Runner actions.

Generated data bindings use only current Plugin API contracts. Task inputs may come from parameter Units or bounded columns of a plugin-scoped DataTable source. Task results may update Unit ScientificPlot/Table surfaces and may publish one declared canonical DataTable Artifact. TOP/dedicated-window lifecycle, PlotGroup composition, interaction linking, arbitrary data mutation, dynamic Python semantics, and new runtime abstractions remain outside this generator layer unless separately expressed by existing public SDK contracts.

## Acceptance rules

Generated output must pass the normal SDK plugin validator. It must contain no private stylesheet and no raw DOM authoring. Parameter presentation must use the existing fixed-titleless data-control PRIME contract. Generated plots must use Unit ScientificPlot. Mobile behavior comes from the existing Presenter semantics, not generated mobile CSS.

The checked-in Python reference under examples/declarative-python-reference is the executable Phase F proof.

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
