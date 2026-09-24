from __future__ import annotations

import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from dkds_plugin_gen import PluginBuilder


def analyze_threshold(x: list, y: list, offset: float) -> dict:
    count = len(x)
    if len(y) < count:
        count = len(y)

    points = []
    rows = []
    sx = 0.0
    sy = 0.0
    sxx = 0.0
    sxy = 0.0

    for i in range(count):
        xv = float(x[i])
        yv = float(y[i]) + offset
        points.append({"x": xv, "y": yv})
        rows.append({"x": xv, "y": yv})
        sx = sx + xv
        sy = sy + yv
        sxx = sxx + xv * xv
        sxy = sxy + xv * yv

    slope = 0.0
    intercept = 0.0
    vth = 0.0
    r2 = 0.0
    if count > 1:
        den = float(count) * sxx - sx * sx
        if den != 0.0:
            slope = (float(count) * sxy - sx * sy) / den
            intercept = (sy - slope * sx) / float(count)
            if slope != 0.0:
                vth = -intercept / slope

            mean = sy / float(count)
            ss_tot = 0.0
            ss_res = 0.0
            for i in range(count):
                xv = float(x[i])
                yv = float(y[i]) + offset
                fitted = slope * xv + intercept
                dy = yv - mean
                dr = yv - fitted
                ss_tot = ss_tot + dy * dy
                ss_res = ss_res + dr * dr
            if ss_tot != 0.0:
                r2 = 1.0 - ss_res / ss_tot

    return {
        "points": points,
        "rows": rows,
        "vth": vth,
        "r2": r2,
        "n": count,
    }


SPEC = {
    "schema": "dkds.declarative-plugin.v1",
    "plugin": {
        "id": "com.example.generated-unit-blueprint-parity",
        "name": "Generated Unit Blueprint Parity",
        "version": "1.0.0",
        "description": "Production-shaped Unit composition generated without a plugin-specific runtime branch.",
        "order": 936,
    },
    "page": {
        "id": "generated-unit-blueprint-parity",
        "label": "Generated Parity",
        "title": "Generated Unit Blueprint Parity",
        "subtitle": "Metric + ScientificPlot + SplitPane + Table",
        "variant": "analysis",
    },
    "workspace": {
        "activity": "generated-unit-blueprint-parity",
        "primaryRole": "scientific-primary",
        "primaryLabel": "分析工作台",
        "primaryScroll": "contained",
        "mainLayout": "fill-rows",
    },
    "data": {
        "accepts": ["science.transport.iv"],
    },
    "actions": [
        {
            "id": "analyze",
            "label": "执行分析",
            "variant": "primary",
            "statusMessage": "正在执行分析...",
        }
    ],
    "parameters": {
        "id": "parameters",
        "label": "参数",
        "fields": [
            {"id": "offset", "type": "number", "label": "Y 偏移", "value": 0.0, "step": 0.1},
        ],
    },
    "content": [
        {
            "kind": "metrics",
            "id": "analysis-metrics",
            "items": [
                {"id": "metric-vth", "label": "Vth", "value": "—"},
                {"id": "metric-r2", "label": "R²", "value": "—"},
                {"id": "metric-n", "label": "拟合点数", "value": "—"},
            ],
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
            "plot": {
                "id": "transfer-curve",
                "title": "转移曲线",
                "xTitle": "Gate voltage",
                "yTitle": "Current",
                "points": [],
            },
            "table": {
                "id": "fit-results",
                "title": "拟合结果",
                "columns": [
                    {"key": "x", "label": "X"},
                    {"key": "y", "label": "Y"},
                ],
                "rows": [],
            },
        },
    ],
}

builder = PluginBuilder(SPEC)
builder.add_portable_task(
    "analyze-threshold",
    analyze_threshold,
    action_id="analyze",
    input_bindings={
        "x": {
            "kind": "artifact-column",
            "source": {"semanticType": "science.transport.iv", "kind": "data.table", "index": 0},
            "column": {"role": "x"},
            "maxRows": 65536,
        },
        "y": {
            "kind": "artifact-column",
            "source": {"semanticType": "science.transport.iv", "kind": "data.table", "index": 0},
            "column": {"role": "y"},
            "maxRows": 65536,
        },
        "offset": {"kind": "parameter", "field": "offset"},
    },
    result_plots=[
        {"id": "transfer-curve", "key": "points"},
    ],
    result_tables=[
        {"id": "fit-results", "key": "rows"},
    ],
    result_metrics=[
        {"id": "metric-vth", "key": "vth"},
        {"id": "metric-r2", "key": "r2"},
        {"id": "metric-n", "key": "n"},
    ],
    success_status="分析完成",
)

output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "generated"
builder.write(output)
print(f"Generated Unit blueprint parity reference -> {output}")
