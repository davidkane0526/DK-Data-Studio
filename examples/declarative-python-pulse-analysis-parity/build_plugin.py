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
        "id": "com.example.generated-pulse-shaped-parity",
        "name": "Generated Scientific List/PlotView Parity",
        "version": "1.0.0",
        "description": "Third production-shaped parity reference using only public Unit contracts.",
        "order": 938,
    },
    "page": {
        "id": "generated-pulse-shaped-parity",
        "label": "Generated Scientific",
        "title": "Generated Scientific List/PlotView Parity",
        "subtitle": "List + Summary + EmptyState + PlotView + Table",
        "variant": "analysis",
        "close": True,
        "actionIds": [],
    },
    "workspace": {
        "activity": "generated-pulse-shaped-parity",
        "primaryRole": "scientific-primary",
        "primaryLabel": "科学分析",
        "primaryScroll": "safe",
        "mainLayout": "stack-comfortable",
        "leftWidth": 390,
        "leftMin": 300,
        "leftReserve": 640,
        "primaryEndInset": "content",
        "layoutStateVersion": "generated-pulse-shaped-v1",
    },
    "host": {
        "kind": "top",
        "label": "Generated Scientific",
        "contextLabel": "Generated Scientific Workspace",
        "icon": "▥",
        "window": {
            "title": "Generated Scientific",
            "width": 1320,
            "height": 860,
            "minWidth": 920,
            "minHeight": 650,
            "prewarm": False,
            "reuse": True,
            "persistence": "project",
            "artifactHydration": "live",
        },
    },
    "data": {"accepts": ["science.pulse.trace"]},
    "parameters": {
        "id": "data-control",
        "label": "参数",
        "priority": 92,
        "embedded": False,
        "autoOpen": True,
        "stateVersion": "generated-pulse-shaped-params-v1",
        "groups": [
            {
                "id": "settings",
                "title": "当前文件与提取设置",
                "variant": "headed",
                "layout": "stack",
                "fieldLayout": "form-grid-2",
                "fields": [
                    {"id": "cycle-samples", "type": "number", "label": "每周期点数", "value": 300, "step": 1},
                    {"id": "sample-interval", "type": "number", "label": "采样间隔", "value": 0.001, "step": "any"},
                    {"id": "window-start", "type": "number", "label": "稳态窗口起点", "value": 25, "step": 1},
                    {"id": "window-end", "type": "number", "label": "稳态窗口终点", "value": 75, "step": 1},
                ],
                "note": {
                    "variant": "meta",
                    "text": "该参考只验证公共 Unit 组合，不包含 Pulse Analysis 生产算法。"
                }
            }
        ],
    },
    "content": [
        {
            "kind": "summary",
            "id": "file-summary",
            "variant": "strip",
            "items": [{"text": "2 个文件"}, {"text": "2 个已分析"}],
        },
        {
            "kind": "list",
            "id": "artifact-list",
            "items": [
                {"leading": "✓", "title": "Device A", "meta": "已分析", "selectable": True, "selected": True},
                {"leading": "✓", "title": "Device B", "meta": "已分析", "selectable": True},
            ],
            "emptyText": "尚未添加数据文件",
        },
        {
            "kind": "empty-state",
            "id": "result-empty",
            "text": "暂无可显示的已分析结果",
        },
        {
            "kind": "plot-view",
            "id": "read-current",
            "title": "脉冲条件 → 读取电流",
            "xTitle": "Pulse",
            "yTitle": "Read current",
            "points": [[0, 1], [1, 2], [2, 3]],
            "contentMinHeight": 320,
            "contentMaxHeight": 320,
        },
        {
            "kind": "plot-view",
            "id": "raw-diagnostic",
            "title": "原始波形诊断",
            "xTitle": "Time",
            "yTitle": "Current",
            "points": [[0, 0], [1, 1], [2, 0]],
            "contentMinHeight": 360,
            "contentMaxHeight": 360,
        },
        {
            "kind": "table",
            "id": "results-table",
            "title": "批量提取结果",
            "columns": [
                {"key": "file", "label": "文件"},
                {"key": "value", "label": "读取电流"},
            ],
            "rows": [
                {"file": "Device A", "value": 1.2},
                {"file": "Device B", "value": 1.5},
            ],
        },
    ],
}

output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "generated"
PluginBuilder(SPEC).write(output)
print(f"Generated third blueprint parity reference -> {output}")
