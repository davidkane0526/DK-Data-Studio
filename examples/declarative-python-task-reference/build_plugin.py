from __future__ import annotations

import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from dkds_plugin_gen import PluginBuilder


def analyze_curve(sample_count: int, gain: float, normalize: bool) -> dict:
    points = []
    for i in range(sample_count):
        x = i - (sample_count - 1) / 2
        y = x * x * gain
        if normalize:
            y = y / (1 + abs(y))
        points.append({"x": x, "y": y})
    return {"points": points, "count": len(points)}


SPEC = {
    "schema": "dkds.declarative-plugin.v1",
    "plugin": {
        "id": "com.example.generated-task-workbench",
        "name": "Generated Task Workbench",
        "version": "1.0.0",
        "description": "Phase F portable Python authoring compiled to a JavaScript Core Task.",
        "order": 931,
    },
    "page": {
        "id": "generated-task-workbench",
        "label": "Generated Task",
        "title": "Generated Task Workbench",
        "subtitle": "Python authoring -> JavaScript Task Runner",
        "variant": "analysis",
    },
    "workspace": {
        "activity": "generated-task-workbench",
        "primaryRole": "scientific-primary",
        "primaryLabel": "主界面",
        "primaryScroll": "safe",
    },
    "data": {"accepts": ["science.transport.iv"]},
    "actions": [
        {
            "id": "run",
            "label": "运行分析",
            "variant": "primary",
            "statusMessage": "正在执行生成的 JavaScript Task..."
        }
    ],
    "parameters": {
        "id": "parameters",
        "label": "参数",
        "fields": [
            {"id": "sample-count", "type": "number", "label": "样本数", "value": 9, "step": 1},
            {"id": "gain", "type": "number", "label": "增益", "value": 2.0, "step": 0.1},
            {"id": "normalize", "type": "checkbox", "label": "归一化", "value": False}
        ]
    },
    "content": [
        {
            "kind": "note",
            "variant": "meta",
            "text": "Python 仅参与生成；运行时仅执行标准 JavaScript Task。"
        },
        {
            "kind": "plot",
            "id": "generated-curve",
            "title": "生成曲线",
            "xTitle": "X",
            "yTitle": "Y",
            "source": "generated-task-reference",
            "points": []
        }
    ]
}

builder = PluginBuilder(SPEC)
builder.add_portable_task(
    "analyze-curve",
    analyze_curve,
    action_id="run",
    parameter_map={
        "sample_count": "sample-count",
        "gain": "gain",
        "normalize": "normalize"
    },
    result_plot="generated-curve",
    result_key="points",
    success_status="分析完成"
)

output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "generated"
builder.write(output)
print(f"Generated portable-task reference -> {output}")
