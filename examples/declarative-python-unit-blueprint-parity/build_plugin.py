from __future__ import annotations

import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from dkds_plugin_gen import PluginBuilder


def analyze_threshold(x: list, y: list, branch: str) -> dict:
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
        yv = float(y[i])
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
                yv = float(y[i])
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
        "branch": branch,
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
        "close": True,
        "actionIds": ["refresh", "fit", "settings"],
    },
    "workspace": {
        "activity": "generated-unit-blueprint-parity",
        "primaryRole": "scientific-primary",
        "primaryLabel": "分析工作台",
        "primaryScroll": "contained",
        "mainLayout": "fill-rows",
    },
    "host": {
        "kind": "top",
        "label": "Vth",
        "contextLabel": "Vth 工作台",
        "icon": "Vₜ",
        "window": {
            "title": "Vth 工作台",
            "width": 1420,
            "height": 900,
            "minWidth": 900,
            "minHeight": 620,
            "prewarm": False,
            "reuse": True,
            "persistence": "project",
            "artifactHydration": "live",
        },
    },
    "data": {
        "accepts": ["science.transport.iv"],
    },
    "actions": [
        {
            "id": "refresh",
            "label": "刷新数据",
            "icon": "↻",
            "order": 10,
            "statusMessage": "数据已刷新",
        },
        {
            "id": "fit",
            "label": "适应视图",
            "icon": "⌂",
            "order": 20,
            "statusMessage": "视图已适应",
        },
        {
            "id": "settings",
            "label": "默认设置",
            "icon": "⚙",
            "order": 30,
            "statusMessage": "打开默认设置",
        },
        {
            "id": "demo",
            "label": "示例",
            "order": 40,
            "statusMessage": "示例已载入",
        },
        {
            "id": "analyze",
            "label": "执行分析",
            "variant": "primary",
            "order": 50,
            "statusMessage": "正在执行分析...",
        },
    ],
    "parameters": {
        "id": "data-control",
        "label": "数据",
        "groups": [
            {
                "id": "data",
                "title": "数据",
                "variant": "headed",
                "layout": "stack",
                "badge": {"text": "—", "variant": "quiet"},
                "fields": [
                    {
                        "id": "curve",
                        "type": "select",
                        "label": "当前曲线",
                        "value": "active",
                        "options": [{"value": "active", "label": "当前数据"}],
                    }
                ],
                "note": {
                    "variant": "meta",
                    "text": "数据导入由 Core 统一提供；这里只显示分配给工作台的数据。",
                },
                "actionIds": ["refresh", "demo"],
            },
            {
                "id": "extraction",
                "title": "阈值提取",
                "variant": "plain",
                "layout": "stack",
                "fields": [
                    {
                        "id": "method",
                        "type": "select",
                        "label": "方法",
                        "value": "linear-window",
                        "options": [
                            {"value": "linear-window", "label": "恒流邻域线性回归"},
                            {"value": "interpolation", "label": "恒流插值"},
                        ],
                    },
                    {
                        "id": "branch",
                        "type": "select",
                        "label": "扫描段",
                        "value": "auto",
                        "options": [
                            {"value": "auto", "label": "自动"},
                            {"value": "first", "label": "第一扫描段"},
                            {"value": "second", "label": "第二扫描段"},
                            {"value": "all", "label": "全部数据"},
                        ],
                    },
                    {"id": "target-current", "type": "number", "label": "目标电流 / A", "value": 0.0, "step": "any"},
                    {"id": "low-current", "type": "number", "label": "拟合下限 / A", "value": 0.0, "step": "any"},
                    {"id": "high-current", "type": "number", "label": "拟合上限 / A", "value": 0.0, "step": "any"},
                    {"id": "absolute-current", "type": "checkbox", "label": "使用 |I|", "value": True},
                    {"id": "log-y", "type": "checkbox", "label": "对数显示", "value": True},
                    {"id": "show-all-curves", "type": "checkbox", "label": "显示全部曲线", "value": True},
                ],
                "actionIds": ["analyze"],
            },
        ],
    },
    "content": [
        {
            "kind": "metrics",
            "id": "analysis-metrics",
            "items": [
                {"id": "metric-vth", "label": "Vth", "value": "—"},
                {"id": "metric-branch", "label": "扫描段", "value": "—"},
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
        "branch": {"kind": "parameter", "field": "branch"},
    },
    result_plots=[
        {"id": "transfer-curve", "key": "points"},
    ],
    result_tables=[
        {"id": "fit-results", "key": "rows"},
    ],
    result_metrics=[
        {"id": "metric-vth", "key": "vth"},
        {"id": "metric-branch", "key": "branch"},
        {"id": "metric-r2", "key": "r2"},
        {"id": "metric-n", "key": "n"},
    ],
    success_status="分析完成",
)

output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "generated"
builder.write(output)
print(f"Generated Unit blueprint parity reference -> {output}")
