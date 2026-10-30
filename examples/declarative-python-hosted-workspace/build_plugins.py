from __future__ import annotations

import copy
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from dkds_plugin_gen import PluginBuilder


BASE = {
    "schema": "dkds.declarative-plugin.v1",
    "plugin": {
        "id": "com.example.generated-hosted",
        "name": "Generated Hosted Workspace",
        "version": "1.0.0",
        "description": "Phase F hosted TOP/Tool lifecycle generation reference.",
        "order": 934,
    },
    "page": {
        "id": "generated-hosted-page",
        "label": "Generated Hosted",
        "title": "Generated Hosted Workspace",
        "subtitle": "Unit-first shared composition",
        "variant": "analysis",
    },
    "workspace": {
        "activity": "generated-hosted",
        "primaryRole": "scientific-primary",
        "primaryLabel": "科学分析",
        "primaryScroll": "safe",
    },
    "data": {"accepts": ["science.transport.iv"]},
    "parameters": {
        "id": "parameters",
        "label": "参数",
        "fields": [
            {"id": "gain", "type": "number", "label": "增益", "value": 1.0, "step": 0.1}
        ],
    },
    "content": [
        {
            "kind": "plot",
            "id": "reference",
            "title": "Reference",
            "xTitle": "X",
            "yTitle": "Y",
            "points": [[0, 0], [1, 1], [2, 4]],
        }
    ],
}


def make(kind: str) -> dict:
    spec = copy.deepcopy(BASE)
    if kind == "top":
        spec["plugin"]["id"] = "com.example.generated-top"
        spec["plugin"]["name"] = "Generated TOP Workspace"
        spec["workspace"]["activity"] = "generated-top"
        spec["host"] = {
            "kind": "top",
            "label": "Generated TOP",
            "contextLabel": "Generated TOP Workspace",
            "icon": "◇",
            "defaultSuper": True,
            "window": {
                "title": "Generated TOP Workspace",
                "width": 1280,
                "height": 820,
                "minWidth": 860,
                "minHeight": 560,
                "prewarm": False,
                "reuse": True,
                "persistence": "project",
                "artifactHydration": "live",
            },
        }
    else:
        spec["plugin"]["id"] = "com.example.generated-tool"
        spec["plugin"]["name"] = "Generated Tool Workspace"
        spec["workspace"]["activity"] = "generated-tool"
        spec["workspace"]["primaryRole"] = "utility-primary"
        spec["page"]["variant"] = "tool"
        spec["host"] = {
            "kind": "tool",
            "label": "Generated Tool",
            "contextLabel": "Generated Tool Workspace",
            "icon": "⌁",
            "window": {
                "title": "Generated Tool Workspace",
                "width": 1080,
                "height": 720,
                "minWidth": 760,
                "minHeight": 520,
                "persistence": "memory",
                "artifactHydration": "project",
            },
        }
    return spec


out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "generated"
PluginBuilder(make("top")).write(out / "top")
PluginBuilder(make("tool")).write(out / "tool")
print(f"Generated hosted TOP + Tool references -> {out}")
