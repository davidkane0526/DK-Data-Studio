from __future__ import annotations

import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from dkds_plugin_gen import PluginBuilder


def compare_curves(x_a: list, y_a: list, x_b: list, y_b: list, gain: float) -> dict:
    count = len(x_a)
    if len(y_a) < count:
        count = len(y_a)
    if len(x_b) < count:
        count = len(x_b)
    if len(y_b) < count:
        count = len(y_b)

    points_a = []
    points_b = []
    delta_points = []
    rows = []
    x_out = []
    a_out = []
    b_out = []
    delta_out = []

    for i in range(count):
        xv = float(x_a[i])
        av = float(y_a[i]) * gain
        bv = float(y_b[i]) * gain
        dv = bv - av
        points_a.append({"x": xv, "y": av})
        points_b.append({"x": xv, "y": bv})
        delta_points.append({"x": xv, "y": dv})
        rows.append({"x": xv, "a": av, "b": bv, "delta": dv})
        x_out.append(xv)
        a_out.append(av)
        b_out.append(bv)
        delta_out.append(dv)

    return {
        "points_a": points_a,
        "points_b": points_b,
        "delta_points": delta_points,
        "rows": rows,
        "x": x_out,
        "a": a_out,
        "b": b_out,
        "delta": delta_out,
    }


AXES = {
    "x": {
        "name": "Vds",
        "unit": "V",
        "dimension": "voltage",
        "quantity": "drain-source-voltage",
    },
    "y": {
        "name": "Id",
        "unit": "A",
        "dimension": "current",
        "quantity": "drain-current",
    },
}

SPEC = {
    "schema": "dkds.declarative-plugin.v1",
    "plugin": {
        "id": "com.example.generated-interactive-workbench",
        "name": "Generated Interactive Workbench",
        "version": "1.0.0",
        "description": "Phase F scientific interaction and replayable command reference.",
        "order": 934,
    },
    "page": {
        "id": "generated-interactive-workbench",
        "label": "Generated Interactive",
        "title": "Generated Interactive Workbench",
        "subtitle": "Core Interaction + replayable validated Command",
        "variant": "analysis",
    },
    "workspace": {
        "activity": "generated-interactive-workbench",
        "primaryRole": "scientific-primary",
        "primaryLabel": "交互分析",
        "primaryScroll": "safe",
    },
    "data": {
        "accepts": ["science.transport.iv"],
        "produces": ["science.generated.interactive-comparison"],
    },
    "interaction": {
        "id": "generated-interactive",
        "selection": {
            "multiple": True,
            "defaultType": "data.series",
        },
        "selectionLink": {
            "enabled": True,
            "group": "generated-series-selection",
            "acceptTypes": ["data.series"],
        },
    },
    "actions": [
        {
            "id": "compare",
            "label": "比较并记录",
            "variant": "primary",
            "statusMessage": "正在执行可重放比较...",
        }
    ],
    "parameters": {
        "id": "parameters",
        "label": "参数",
        "fields": [
            {"id": "gain", "type": "number", "label": "统一增益", "value": 1.0, "step": 0.1}
        ],
    },
    "content": [
        {
            "kind": "note",
            "variant": "meta",
            "text": "Selection、viewport、legend 与 command history 均复用 Core 公共合同。",
        },
        {
            "kind": "plot-group",
            "id": "interactive-group",
            "title": "联动比较",
            "columns": 2,
            "maxColumns": 3,
            "minItemWidth": 260,
            "density": "regular",
            "responsive": True,
            "plots": [
                {
                    "id": "curve-a",
                    "title": "数据 A",
                    "xTitle": "Vds (V)",
                    "yTitle": "Id (A)",
                    "points": [],
                    "selectionTarget": "series",
                    "identity": {"input": "y_a", "entityType": "data.series"},
                    "axisSemantics": AXES,
                    "viewport": {
                        "link": True,
                        "linkGroup": "generated-vds-viewport",
                        "linkedAxes": ["x"],
                    },
                    "legend": {
                        "link": True,
                        "linkGroup": "generated-series-legend",
                        "maxLinkedTargets": 8,
                    },
                },
                {
                    "id": "curve-b",
                    "title": "数据 B",
                    "xTitle": "Vds (V)",
                    "yTitle": "Id (A)",
                    "points": [],
                    "selectionTarget": "series",
                    "identity": {"input": "y_b", "entityType": "data.series"},
                    "axisSemantics": AXES,
                    "viewport": {
                        "link": True,
                        "linkGroup": "generated-vds-viewport",
                        "linkedAxes": ["x"],
                    },
                    "legend": {
                        "link": True,
                        "linkGroup": "generated-series-legend",
                        "maxLinkedTargets": 8,
                    },
                },
                {
                    "id": "curve-delta",
                    "title": "差值 B - A",
                    "xTitle": "Vds (V)",
                    "yTitle": "ΔId (A)",
                    "points": [],
                    "selectionTarget": "series",
                    "axisSemantics": AXES,
                    "viewport": {
                        "link": True,
                        "linkGroup": "generated-vds-viewport",
                        "linkedAxes": ["x"],
                    },
                },
            ],
        },
        {
            "kind": "table",
            "id": "comparison-table",
            "title": "比较结果",
            "columns": [
                {"key": "x", "label": "Vds", "unit": "V"},
                {"key": "a", "label": "A", "unit": "A"},
                {"key": "b", "label": "B", "unit": "A"},
                {"key": "delta", "label": "B - A", "unit": "A"},
            ],
            "rows": [],
        },
    ],
}

builder = PluginBuilder(SPEC)
builder.add_portable_task(
    "compare-curves",
    compare_curves,
    action_id="compare",
    input_bindings={
        "x_a": {
            "kind": "artifact-column",
            "source": {"semanticType": "science.transport.iv", "kind": "data.table", "index": 0},
            "column": {"role": "x"},
            "maxRows": 65536,
        },
        "y_a": {
            "kind": "artifact-column",
            "source": {"semanticType": "science.transport.iv", "kind": "data.table", "index": 0},
            "column": {"role": "y"},
            "maxRows": 65536,
        },
        "x_b": {
            "kind": "artifact-column",
            "source": {"semanticType": "science.transport.iv", "kind": "data.table", "index": 1},
            "column": {"role": "x"},
            "maxRows": 65536,
        },
        "y_b": {
            "kind": "artifact-column",
            "source": {"semanticType": "science.transport.iv", "kind": "data.table", "index": 1},
            "column": {"role": "y"},
            "maxRows": 65536,
        },
        "gain": {"kind": "parameter", "field": "gain"},
    },
    result_plots=[
        {"id": "curve-a", "key": "points_a"},
        {"id": "curve-b", "key": "points_b"},
        {"id": "curve-delta", "key": "delta_points"},
    ],
    result_tables=[{"id": "comparison-table", "key": "rows"}],
    publish_tables=[
        {
            "id": "generated-interactive-comparison",
            "name": "Generated interactive comparison",
            "semanticType": "science.generated.interactive-comparison",
            "columns": [
                {"key": "x", "name": "Vds", "unit": "V", "role": "x", "resultKey": "x"},
                {"key": "a", "name": "A", "unit": "A", "role": "y", "resultKey": "a"},
                {"key": "b", "name": "B", "unit": "A", "role": "y", "resultKey": "b"},
                {"key": "delta", "name": "B - A", "unit": "A", "role": "y", "resultKey": "delta"},
            ],
        }
    ],
    domain_command={
        "id": "generated.compare-curves",
        "domain": "analysis.generated",
        "version": "1.0.0",
        "title": "Generated curve comparison",
        "description": "Replay-safe generated comparison over two scoped DataTables.",
        "replayable": True,
        "destructive": False,
        "algorithm": {
            "category": "generated.analysis",
            "id": "compare-curves",
            "version": "1.0.0",
        },
    },
    success_status="交互比较完成",
)

output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "generated"
builder.write(output)
print(f"Generated interactive workbench reference -> {output}")
