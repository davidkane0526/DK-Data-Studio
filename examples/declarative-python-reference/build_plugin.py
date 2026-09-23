from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from dkds_plugin_gen import PluginBuilder

SPEC = {
    "schema": "dkds.declarative-plugin.v1",
    "plugin": {
        "id": "com.example.generated-workbench",
        "name": "Generated Unit Workbench",
        "version": "1.0.0",
        "description": "Phase F Python-generated Unit-first DK Data Studio workbench.",
        "order": 930,
    },
    "page": {
        "id": "generated-unit-workbench",
        "label": "Generated",
        "title": "Generated Unit Workbench",
        "subtitle": "Python declaration -> Plugin API 1.19 + Unit Templates",
        "variant": "analysis",
    },
    "workspace": {
        "activity": "generated-unit-workbench",
        "primaryRole": "scientific-primary",
        "primaryLabel": "主界面",
        "primaryScroll": "safe",
    },
    "data": {
        "accepts": ["science.transport.iv"]
    },
    "actions": [
        {
            "id": "run",
            "label": "运行",
            "variant": "primary",
            "statusMessage": "Generated reference action invoked."
        }
    ],
    "parameters": {
        "id": "parameters",
        "label": "参数",
        "fields": [
            {"id": "sample-count", "type": "number", "label": "样本数", "value": 64, "step": 1},
            {
                "id": "mode",
                "type": "select",
                "label": "模式",
                "value": "linear",
                "options": [
                    {"value": "linear", "label": "线性"},
                    {"value": "smooth", "label": "平滑"}
                ]
            },
            {"id": "normalize", "type": "checkbox", "label": "归一化", "value": True}
        ]
    },
    "content": [
        {
            "kind": "note",
            "variant": "meta",
            "text": "该界面完全由 Python 声明生成，未包含插件私有 CSS。"
        },
        {
            "kind": "plot",
            "id": "reference-curve",
            "title": "参考曲线",
            "xTitle": "X",
            "yTitle": "Y",
            "source": "generated-reference",
            "points": [[-2, 4], [-1, 1], [0, 0], [1, 1], [2, 4]]
        }
    ]
}

output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "generated"
PluginBuilder(SPEC).write(output)
print(f"Generated reference plugin -> {output}")
