from __future__ import annotations

import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from dkds_plugin_gen import PluginBuilder

ACTIONS = [
    {"id": "apply-display", "label": "应用显示", "statusMessage": "显示参数已应用", "variant": "primary"},
    {"id": "reset-display", "label": "自动色阶/刻度", "statusMessage": "显示参数已重置", "variant": "secondary"},
    {"id": "export-long", "label": "TER_long.csv", "statusMessage": "导出 long", "variant": "secondary"},
    {"id": "export-matrix", "label": "TER_matrix.csv", "statusMessage": "导出 matrix", "variant": "secondary"},
]

PLOTS = [
    {
        "id": "ter-heatmap", "title": "TER(Vd, Vg) 全组合热图",
        "plotVariant": "heatmap", "renderOwner": "runtime",
        "detailGeometry": {"contentAspectRatio": 1, "contentMinHeightPx": 80, "contentMaxHeightPx": 860},
    },
    {
        "id": "transform-heatmap", "title": "dI/dV · 正扫",
        "plotVariant": "heatmap", "renderOwner": "runtime",
        "detailGeometry": {"contentAspectRatio": 1, "contentMinHeightPx": 80, "contentMaxHeightPx": 860},
    },
    {
        "id": "resistance", "title": "R–V 全 Vg · 正扫 / 反扫",
        "plotVariant": "curve", "renderOwner": "runtime",
        "detailGeometry": {"contentMinHeightPx": 320},
    },
    {"id": "max-vg", "title": "TER_Max–Vg：max over Vd", "plotVariant": "curve", "renderOwner": "runtime"},
    {"id": "max-vg-arg", "title": "Vd@TER_Max–Vg", "plotVariant": "curve", "renderOwner": "runtime"},
    {"id": "max-vd", "title": "TER_Max–Vd：max over Vg", "plotVariant": "curve", "renderOwner": "runtime"},
    {"id": "max-vd-arg", "title": "Vg@TER_Max–Vd", "plotVariant": "curve", "renderOwner": "runtime"},
]
for plot in PLOTS:
    plot.setdefault("xTitle", "")
    plot.setdefault("yTitle", "")
    plot.setdefault("source", "ter:" + plot["id"])

VG_COLUMNS = [
    {"key": "vg", "label": "Vg (V)"},
    {"key": "terMax", "label": "TER_Max–Vg (%)"},
    {"key": "vdsAtMax", "label": "Vd@max (V)"},
    {"key": "iUp", "label": "I_up (A)"},
    {"key": "iDown", "label": "I_down (A)"},
    {"key": "rUp", "label": "R_up (Ω)"},
    {"key": "rDown", "label": "R_down (Ω)"},
    {"key": "mode", "label": "方式"},
]
VD_COLUMNS = [
    {"key": "vds", "label": "Vd (V)"},
    {"key": "terMax", "label": "TER_Max–Vd (%)"},
    {"key": "vgAtMax", "label": "Vg@max (V)"},
    {"key": "iUp", "label": "I_up (A)"},
    {"key": "iDown", "label": "I_down (A)"},
    {"key": "rUp", "label": "R_up (Ω)"},
    {"key": "rDown", "label": "R_down (Ω)"},
    {"key": "mode", "label": "方式"},
]

SPEC = {
    "schema": "dkds.declarative-plugin.v1",
    "plugin": {
        "id": "com.example.ter-reconstruction",
        "name": "TER Declarative Reconstruction",
        "version": "1.0.0",
        "description": "Phase F presentation-spine reconstruction of production TER using frozen public Units.",
    },
    "page": {
        "id": "ter-reconstruction",
        "label": "TER 分析",
        "title": "TER 分析",
        "variant": "analysis",
        "actionIds": ["export-long", "export-matrix"],
    },
    "workspace": {
        "activity": "ter-reconstruction",
        "primaryRole": "scientific-primary",
        "primaryLabel": "TER 分析",
        "primaryScroll": "safe",
        "mainLayout": "stack-comfortable",
    },
    "data": {"accepts": ["science.transport.iv"]},
    "actions": ACTIONS,
    "parameters": {
        "id": "data-control",
        "label": "参数",
        "priority": 90,
        "autoOpen": True,
        "groups": [
            {
                "id": "display",
                "title": "热图显示",
                "variant": "plain",
                "layout": "stack",
                "fieldLayout": "form-grid-2",
                "fields": [
                    {
                        "id": "color-scale", "type": "select", "label": "色图", "value": "Viridis",
                        "options": [{"value": value, "label": value} for value in ["Viridis", "Turbo", "Cividis", "Jet", "Hot"]],
                    },
                    {"id": "color-min", "type": "number", "label": "色阶最小 (%)"},
                    {"id": "color-max", "type": "number", "label": "色阶最大 (%)"},
                    {"id": "color-tick", "type": "number", "label": "色阶刻度 (%)"},
                    {"id": "vds-tick", "type": "number", "label": "Vds 刻度 (V)"},
                    {"id": "vg-tick", "type": "number", "label": "Vg 刻度 (V)"},
                ],
                "actionGrid": {"layout": "action-grid-2", "actionIds": ["apply-display", "reset-display"]},
            },
            {
                "id": "transform",
                "title": "Vg–Vd 数据变换热图",
                "variant": "plain",
                "layout": "stack",
                "parameterForm": {
                    "id": "transform-settings",
                    "compact": True,
                    "autoFit": True,
                    "layoutOwner": "core",
                    "fields": [
                        {
                            "id": "type", "type": "select", "label": "处理量", "required": True, "default": "didv",
                            "options": [{"value": "didv", "label": "dI/dV（微分电导）"}],
                        },
                        {
                            "id": "direction", "type": "select", "label": "扫描方向", "required": True, "default": "1",
                            "options": [{"value": "1", "label": "正扫（Vds 递增）"}, {"value": "-1", "label": "反扫（Vds 递减）"}],
                        },
                    ],
                },
            },
        ],
    },
    "content": [
        {"kind": "summary", "id": "ter-summary", "variant": "strip", "items": []},
        {
            "kind": "plot-group", "id": "ter-plots", "title": "TER 科学图组",
            "columns": 3, "maxColumns": 7, "minItemWidth": 260, "density": "comfortable", "responsive": True,
            "plots": PLOTS,
        },
        {"kind": "table", "id": "ter-max-vg-table", "title": "TER_Max–Vg 数据", "columns": VG_COLUMNS, "rows": []},
        {"kind": "table", "id": "ter-max-vd-table", "title": "TER_Max–Vd 数据", "columns": VD_COLUMNS, "rows": []},
    ],
}

output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "generated"
PluginBuilder(SPEC).write(output)
print(f"Generated TER reconstruction -> {output}")
