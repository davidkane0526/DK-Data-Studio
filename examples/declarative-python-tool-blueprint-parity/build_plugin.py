from __future__ import annotations

import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from dkds_plugin_gen import PluginBuilder

SPEC = {
    "schema": "dkds.declarative-plugin.v1",
    "plugin": {
        "id": "com.example.generated-tool-blueprint-parity",
        "name": "Generated Tool Blueprint Parity",
        "version": "1.0.0",
        "description": "Second production-shaped blueprint parity reference using only public Unit contracts.",
        "order": 937,
    },
    "page": {
        "id": "generated-tool-blueprint-parity",
        "label": "Generated Tool",
        "title": "Generated Tool Blueprint Parity",
        "subtitle": "Tool designer + waveform result surfaces",
        "variant": "tool",
        "close": True,
        "actionIds": [],
    },
    "workspace": {
        "activity": "generated-tool-blueprint-parity",
        "primaryRole": "utility-primary",
        "primaryLabel": "工具",
        "primaryScroll": "safe",
        "mainLayout": "stack-comfortable",
        "leftWidth": 540,
        "leftMin": 520,
        "leftReserve": 520,
        "primaryEndInset": "content",
        "layoutStateVersion": "generated-tool-parity-v1",
    },
    "host": {
        "kind": "tool",
        "label": "Tool",
        "contextLabel": "Generated Tool",
        "icon": "⌁",
        "window": {
            "title": "Generated Tool",
            "width": 1320,
            "height": 860,
            "minWidth": 960,
            "minHeight": 640,
            "prewarm": False,
            "reuse": True,
            "persistence": "project",
            "artifactHydration": "live",
        },
    },
    "data": {
        "accepts": ["data.table"],
    },
    "actions": [
        {"id": "generate", "label": "生成预览", "variant": "primary", "order": 10, "statusMessage": "已生成预览"},
        {"id": "add-segment", "label": "加入序列", "order": 20, "statusMessage": "已加入片段"},
        {"id": "clear-channel", "label": "清空通道", "order": 30, "statusMessage": "已清空通道"},
        {"id": "export-wave", "label": "导出合并 CSV", "order": 40, "statusMessage": "已准备导出"},
        {"id": "remove-segment", "label": "删除最后片段", "order": 50, "statusMessage": "已删除最后片段"},
    ],
    "parameters": {
        "id": "parameters",
        "label": "参数",
        "priority": 96,
        "embedded": True,
        "autoOpen": False,
        "stateVersion": "generated-tool-parameters-v1",
        "groups": [
            {
                "id": "designer",
                "title": "Vd",
                "variant": "headed",
                "layout": "fill-rows",
                "fieldLayout": "form-grid-2",
                "tabs": {
                    "id": "channels",
                    "variant": "compact",
                    "items": [
                        {"id": "Vd", "label": "Vd", "selected": True},
                        {"id": "Vs", "label": "Vs"},
                        {"id": "Vg", "label": "Vg"},
                    ],
                },
                "fields": [
                    {"id": "voltage-max", "type": "number", "label": "脉冲电压上限", "value": 4, "step": "any"},
                    {"id": "voltage-step", "type": "number", "label": "电压步长 / 方波数", "value": 0.5, "step": "any"},
                    {"id": "voltage-read", "type": "number", "label": "读取电压", "value": 0, "step": "any"},
                    {"id": "pulse-time", "type": "number", "label": "脉冲时间", "value": 0.05, "step": "any"},
                    {"id": "read-time", "type": "number", "label": "读取时间", "value": 0.05, "step": "any"},
                    {"id": "time-shift", "type": "number", "label": "时间偏移", "value": 0, "step": "any"},
                    {"id": "cycle", "type": "number", "label": "周期", "value": 0.5, "step": 0.25},
                    {"id": "ratio", "type": "number", "label": "拉伸系数", "value": 1, "step": "any"},
                ],
                "actionGrid": {
                    "layout": "action-grid-4",
                    "actionIds": ["generate", "add-segment", "clear-channel", "export-wave"],
                },
                "toolbar": {
                    "variant": "ordinary",
                    "layout": "segment-bar",
                    "label": "已加入片段",
                    "actionIds": ["remove-segment"],
                },
                "table": {
                    "id": "segment-table",
                    "layout": "scroll-pane",
                    "columns": [
                        {"key": "index", "label": "#"},
                        {"key": "voltageMax", "label": "上限", "unit": "V"},
                        {"key": "step", "label": "步长"},
                        {"key": "read", "label": "读取", "unit": "V"},
                        {"key": "cycle", "label": "周期"},
                    ],
                    "rows": [],
                },
            }
        ],
    },
    "content": [
        {
            "kind": "plot",
            "id": "waveform",
            "title": "三路合并波形",
            "xTitle": "Time (s)",
            "yTitle": "Voltage (V)",
            "points": [[0, 0], [1, 1]],
        },
        {
            "kind": "table",
            "id": "wave-table",
            "title": "波形数据",
            "columns": [
                {"key": "time", "label": "Time", "unit": "s"},
                {"key": "Vd", "label": "Vd", "unit": "V"},
                {"key": "Vs", "label": "Vs", "unit": "V"},
                {"key": "Vg", "label": "Vg", "unit": "V"},
            ],
            "rows": [],
        },
    ],
}

output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "generated"
PluginBuilder(SPEC).write(output)
print(f"Generated tool blueprint parity reference -> {output}")
