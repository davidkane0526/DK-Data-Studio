from __future__ import annotations

import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from dkds_plugin_gen import PluginBuilder

ACTIONS = [
    {"id": "close-inspector", "label": "关闭", "statusMessage": "关闭检查器", "variant": "quiet"},
    {"id": "collapse-group", "label": "缩小", "statusMessage": "缩小组图", "variant": "quiet"},
    {"id": "close-group", "label": "关闭", "statusMessage": "关闭组图", "variant": "quiet"},
    {"id": "back-main", "label": "返回主图", "statusMessage": "返回主图", "variant": "secondary"},
    {"id": "refresh-gate", "label": "刷新分析", "statusMessage": "刷新栅压分析", "variant": "primary"},
]

def plot_panel(node_id: str, title: str, source: str):
    return {
        "kind": "panel",
        "id": node_id,
        "variant": "plot-card",
        "header": False,
        "layout": "plot-card-fill",
        "children": [
            {"kind": "header", "id": node_id + "-header", "headerKind": "plot", "variant": "plot", "title": title},
            {"kind": "scientific-plot", "id": node_id + "-plot", "plotVariant": "curve", "source": source, "renderOwner": "runtime"},
        ],
    }

SPEC = {
    "schema": "dkds.declarative-plugin.v1",
    "plugin": {
        "id": "com.example.resonance-surface-reconstruction",
        "name": "Resonance Surface Reconstruction",
        "version": "1.0.0",
        "description": "Phase F structural reconstruction of Resonance PRIME/SUB surfaces using frozen public Units.",
    },
    "page": {
        "id": "resonance-surface-reconstruction",
        "label": "共振分析",
        "title": "共振分析",
        "variant": "analysis",
        "actionIds": [],
    },
    "workspace": {
        "activity": "resonance-surface-reconstruction",
        "primaryRole": "scientific-primary",
        "primaryLabel": "共振分析",
        "primaryScroll": "contained",
    },
    "data": {"accepts": ["science.transport.iv"]},
    "actions": ACTIONS,
    "parameters": {
        "id": "data-control",
        "label": "参数",
        "priority": 100,
        "autoOpen": True,
        "fields": [
            {"id": "show-rejected", "type": "checkbox", "label": "显示不采纳峰", "value": False},
            {"id": "show-width", "type": "checkbox", "label": "显示选中峰宽", "value": False},
        ],
    },
    "content": [
        {
            "kind": "plot",
            "id": "main-plot",
            "title": "共振主图",
            "xTitle": "V",
            "yTitle": "I",
            "source": "resonance:main",
            "renderOwner": "runtime",
        }
    ],
    "surfaces": [
        {
            "id": "curve-inspector",
            "label": "检查",
            "role": "prime",
            "presentationRole": "inspector",
            "semanticKind": "panel",
            "priority": 90,
            "defaultPlacement": "right",
            "placements": ["float", "global", "left", "right", "bottom"],
            "detailGeometry": {"minContentInlinePx": 320, "minContentBlockPx": 220},
            "lifecycle": {
                "onOpenCommand": "resonance.renderInspection",
                "onPlacementChangedCommand": "resonance.resize",
            },
            "children": [
                {
                    "kind": "header",
                    "id": "inspector-header",
                    "headerKind": "portable",
                    "variant": "portable",
                    "title": "曲线检查器",
                    "actionIds": ["close-inspector"],
                },
                {"kind": "status", "id": "inspector-status", "variant": "text", "text": "尚未选择曲线。"},
            ],
        },
        {
            "id": "group-analysis",
            "label": "组图",
            "role": "prime",
            "presentationRole": "scientific-secondary",
            "semanticKind": "panel",
            "priority": 70,
            "defaultPlacement": "bottom",
            "placements": ["float", "global", "left", "right", "bottom"],
            "detailGeometry": {"minContentBlockPx": 220},
            "lifecycle": {
                "onOpenCommand": "resonance.renderGroup",
                "onCloseCommand": "resonance.closeGroupViews",
                "onPlacementChangedCommand": "resonance.resize",
            },
            "children": [
                {
                    "kind": "header",
                    "id": "group-header",
                    "headerKind": "portable",
                    "variant": "portable",
                    "title": "组图面板",
                    "actionIds": ["collapse-group", "close-group"],
                },
                {
                    "kind": "floating-chrome",
                    "id": "group-toolbar",
                    "variant": "ordinary",
                    "actionIds": ["collapse-group", "close-group"],
                },
                {
                    "kind": "layout",
                    "id": "group-grid",
                    "variant": "accepted-group-grid",
                    "children": [plot_panel("group-preview", "组图预览", "resonance:group")],
                },
            ],
        },
        {
            "id": "physics",
            "label": "物理机制",
            "role": "sub",
            "presentationRole": "scientific-secondary",
            "semanticKind": "view",
            "priority": 60,
            "order": 60,
            "collapsible": True,
            "lifecycle": {"onShowCommand": "resonance.renderPhysics"},
            "children": [
                {
                    "kind": "header",
                    "id": "physics-header",
                    "headerKind": "section",
                    "variant": "content",
                    "title": "物理机制分析",
                    "actionIds": ["back-main"],
                },
                {"kind": "summary", "id": "physics-summary", "variant": "row", "items": []},
                plot_panel("physics-plot", "稳定 ridge：V0 与有效分裂 δ", "resonance:physics"),
                {
                    "kind": "table",
                    "id": "physics-table",
                    "columns": [{"key": "name", "label": "名称"}, {"key": "value", "label": "值"}],
                    "rows": [],
                },
            ],
        },
        {
            "id": "spacing",
            "label": "峰间距",
            "role": "sub",
            "presentationRole": "scientific-secondary",
            "semanticKind": "view",
            "priority": 50,
            "order": 50,
            "collapsible": True,
            "lifecycle": {"onShowCommand": "resonance.renderSpacing"},
            "children": [
                {
                    "kind": "header",
                    "id": "spacing-header",
                    "headerKind": "section",
                    "variant": "content",
                    "title": "两峰间距分析",
                    "actionIds": ["back-main"],
                },
                plot_panel("spacing-plot", "峰间距随 Vg 变化", "resonance:spacing"),
                {
                    "kind": "table",
                    "id": "spacing-table",
                    "columns": [{"key": "vg", "label": "Vg"}, {"key": "spacing", "label": "间距"}],
                    "rows": [],
                },
            ],
        },
        {
            "id": "gate-analysis",
            "label": "栅压分析",
            "role": "sub",
            "presentationRole": "scientific-secondary",
            "semanticKind": "view",
            "priority": 40,
            "order": 40,
            "collapsible": True,
            "lifecycle": {"onShowCommand": "resonance.renderGate"},
            "children": [
                {
                    "kind": "header",
                    "id": "gate-header",
                    "headerKind": "section",
                    "variant": "content",
                    "title": "栅压物理分析",
                    "actionIds": ["back-main"],
                },
                {
                    "kind": "panel",
                    "id": "gate-controls",
                    "variant": "plain",
                    "header": False,
                    "layout": "form-grid-2",
                    "children": [
                        {
                            "kind": "field",
                            "id": "gate-a",
                            "type": "select",
                            "label": "ridge A",
                            "options": [{"value": "1", "label": "1"}],
                        },
                        {
                            "kind": "field",
                            "id": "gate-b",
                            "type": "select",
                            "label": "ridge B",
                            "options": [{"value": "2", "label": "2"}],
                        },
                        {"kind": "action", "id": "gate-refresh", "actionId": "refresh-gate"},
                    ],
                },
                plot_panel("gate-plot", "栅压特征", "resonance:gate"),
                {
                    "kind": "table",
                    "id": "gate-table",
                    "columns": [{"key": "vg", "label": "Vg"}, {"key": "feature", "label": "特征"}],
                    "rows": [],
                },
            ],
        },
    ],
}

output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "generated"
PluginBuilder(SPEC).write(output)
print(f"Generated Resonance surface reconstruction -> {output}")
