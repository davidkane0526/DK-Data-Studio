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

The first schema intentionally stays small. It supports standalone workbench identity, data accepts/produces, page metadata, semantic PRIMARY role, header actions with status effects, a titleless parameter PRIME with number/text/select/checkbox fields, notes, and curve plots with optional static reference points.

This phase does not attempt to encode domain algorithms, Task Runner code, tables, TOP/dedicated windows, PlotGroup, interaction linking, or data mutation. Those should be added only after the thin generation boundary is proven. Domain logic will remain ordinary SDK/Task capabilities rather than becoming hidden generator behavior.

## Acceptance rules

Generated output must pass the normal SDK plugin validator. It must contain no private stylesheet and no raw DOM authoring. Parameter presentation must use the existing fixed-titleless data-control PRIME contract. Generated plots must use Unit ScientificPlot. Mobile behavior comes from the existing Presenter semantics, not generated mobile CSS.

The checked-in Python reference under examples/declarative-python-reference is the executable Phase F proof.
