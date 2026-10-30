from __future__ import annotations

import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from dkds_plugin_gen import PluginBuilder


def scale_table(x: list, y: list, gain: float) -> dict:
    points = []
    rows = []
    out_x = []
    out_y = []
    count = min(len(x), len(y))
    for i in range(count):
        xv = float(x[i])
        yv = float(y[i]) * gain
        points.append({"x": xv, "y": yv})
        rows.append({"x": xv, "scaled": yv})
        out_x.append(xv)
        out_y.append(yv)
    return {"points": points, "rows": rows, "x": out_x, "scaled": out_y}


SPEC = {
    "schema": "dkds.declarative-plugin.v1",
    "plugin": {
        "id": "com.example.generated-artifact-workbench",
        "name": "Generated Artifact Workbench",
        "version": "1.0.0",
        "description": "Phase F bounded Artifact -> JS Task -> Artifact/Table/Plot reference.",
        "order": 932,
    },
    "page": {
        "id": "generated-artifact-workbench",
        "label": "Generated Artifact",
        "title": "Generated Artifact Workbench",
        "subtitle": "Artifact/DataTable -> JavaScript Task -> Artifact/Table/Plot",
        "variant": "analysis",
    },
    "workspace": {
        "activity": "generated-artifact-workbench",
        "primaryRole": "scientific-primary",
        "primaryLabel": "主界面",
        "primaryScroll": "safe",
    },
    "data": {
        "accepts": ["science.transport.iv"],
        "produces": ["science.generated.scaled-table"],
    },
    "actions": [
        {
            "id": "run",
            "label": "处理数据",
            "variant": "primary",
            "statusMessage": "正在读取分配数据并执行生成的 JavaScript Task..."
        }
    ],
    "parameters": {
        "id": "parameters",
        "label": "参数",
        "fields": [
            {"id": "gain", "type": "number", "label": "增益", "value": 2.0, "step": 0.1}
        ]
    },
    "content": [
        {
            "kind": "note",
            "variant": "meta",
            "text": "输入来自 scoped Artifact/DataTable；Python 仅参与生成，不进入运行时。"
        },
        {
            "kind": "plot",
            "id": "scaled-curve",
            "title": "缩放曲线",
            "xTitle": "X",
            "yTitle": "Scaled Y",
            "source": "generated-artifact-reference",
            "points": []
        },
        {
            "kind": "table",
            "id": "scaled-table",
            "title": "缩放结果",
            "columns": [
                {"key": "x", "label": "X"},
                {"key": "scaled", "label": "Scaled Y"}
            ],
            "rows": []
        }
    ]
}

builder = PluginBuilder(SPEC)
builder.add_portable_task(
    "scale-table",
    scale_table,
    action_id="run",
    input_bindings={
        "x": {
            "kind": "artifact-column",
            "source": {"semanticType": "science.transport.iv", "kind": "data.table", "index": 0},
            "column": {"role": "x"},
            "maxRows": 65536
        },
        "y": {
            "kind": "artifact-column",
            "source": {"semanticType": "science.transport.iv", "kind": "data.table", "index": 0},
            "column": {"role": "y"},
            "maxRows": 65536
        },
        "gain": {"kind": "parameter", "field": "gain"}
    },
    result_plot="scaled-curve",
    result_key="points",
    result_table="scaled-table",
    result_rows_key="rows",
    publish_table={
        "id": "generated-scaled-table",
        "name": "Generated scaled table",
        "semanticType": "science.generated.scaled-table",
        "columns": [
            {"key": "x", "name": "X", "role": "x", "resultKey": "x"},
            {"key": "scaled", "name": "Scaled Y", "role": "y", "resultKey": "scaled"}
        ]
    },
    success_status="数据处理完成"
)

output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "generated"
builder.write(output)
print(f"Generated Artifact pipeline reference -> {output}")
