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


SPEC = {
    "schema": "dkds.declarative-plugin.v1",
    "plugin": {
        "id": "com.example.generated-scientific-workbench",
        "name": "Generated Scientific Workbench",
        "version": "1.0.0",
        "description": "Phase F multi-source scientific PlotGroup generation reference.",
        "order": 933,
    },
    "page": {
        "id": "generated-scientific-workbench",
        "label": "Generated Scientific",
        "title": "Generated Scientific Workbench",
        "subtitle": "Two scoped DataTables -> one JS Task -> PlotGroup/Table/Artifacts",
        "variant": "analysis",
    },
    "workspace": {
        "activity": "generated-scientific-workbench",
        "primaryRole": "scientific-primary",
        "primaryLabel": "科学分析",
        "primaryScroll": "safe",
    },
    "data": {
        "accepts": ["science.transport.iv"],
        "produces": [
            "science.generated.comparison",
            "science.generated.delta",
        ],
    },
    "actions": [
        {
            "id": "compare",
            "label": "比较两组数据",
            "variant": "primary",
            "statusMessage": "正在比较两个分配的数据对象...",
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
            "text": "两个输入均来自当前插件 scoped source catalog；结果组图完全由 Unit PlotGroup/PlotView/ScientificPlot 生成。",
        },
        {
            "kind": "plot-group",
            "id": "comparison-group",
            "title": "比较组图",
            "columns": 2,
            "maxColumns": 3,
            "minItemWidth": 260,
            "density": "regular",
            "responsive": True,
            "plots": [
                {"id": "curve-a", "title": "数据 A", "xTitle": "X", "yTitle": "Y", "points": []},
                {"id": "curve-b", "title": "数据 B", "xTitle": "X", "yTitle": "Y", "points": []},
                {"id": "curve-delta", "title": "差值 B - A", "xTitle": "X", "yTitle": "ΔY", "points": []},
            ],
        },
        {
            "kind": "table",
            "id": "comparison-table",
            "title": "比较结果",
            "columns": [
                {"key": "x", "label": "X"},
                {"key": "a", "label": "A"},
                {"key": "b", "label": "B"},
                {"key": "delta", "label": "B - A"},
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
    result_tables=[
        {"id": "comparison-table", "key": "rows"},
    ],
    publish_tables=[
        {
            "id": "generated-comparison",
            "name": "Generated comparison",
            "semanticType": "science.generated.comparison",
            "columns": [
                {"key": "x", "name": "X", "role": "x", "resultKey": "x"},
                {"key": "a", "name": "A", "role": "y", "resultKey": "a"},
                {"key": "b", "name": "B", "role": "y", "resultKey": "b"},
            ],
        },
        {
            "id": "generated-delta",
            "name": "Generated delta",
            "semanticType": "science.generated.delta",
            "columns": [
                {"key": "x", "name": "X", "role": "x", "resultKey": "x"},
                {"key": "delta", "name": "B - A", "role": "y", "resultKey": "delta"},
            ],
        },
    ],
    success_status="双源比较完成",
)

output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "generated"
builder.write(output)
print(f"Generated scientific workbench reference -> {output}")
