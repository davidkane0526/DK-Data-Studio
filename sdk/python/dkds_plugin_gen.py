#!/usr/bin/env python3
"""DK Data Studio declarative plugin generator.

Phase F prototype: converts a deterministic Python/JSON declaration into an
ordinary Plugin API 1.19 Unit-first workbench. It adds no runtime, style system,
Unit variant, or Presenter branch.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List

from dkds_portable_task import CompiledPortableTask, PortableTaskError, compile_portable_task

SCHEMA = "dkds.declarative-plugin.v1"
PLUGIN_API = "1.19.0"
IDENT = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
SEMVER = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$")
FIELD_TYPES = {"number", "text", "select", "checkbox"}
PRIMARY_ROLES = {"scientific-primary", "data-primary", "utility-primary"}
PAGE_VARIANTS = {"analysis", "tool"}
ACTION_VARIANTS = {"primary", "secondary", "quiet"}
NOTE_VARIANTS = {"meta", "ordinary"}


class SpecError(ValueError):
    pass


def _expect_object(value: Any, name: str) -> Dict[str, Any]:
    if not isinstance(value, dict):
        raise SpecError(f"{name} must be an object")
    return value


def _expect_list(value: Any, name: str) -> List[Any]:
    if not isinstance(value, list):
        raise SpecError(f"{name} must be an array")
    return value


def _nonempty(value: Any, name: str) -> str:
    text = str(value if value is not None else "").strip()
    if not text:
        raise SpecError(f"{name} must be non-empty")
    return text


def _ident(value: Any, name: str) -> str:
    text = _nonempty(value, name)
    if not IDENT.fullmatch(text):
        raise SpecError(f"{name} must match {IDENT.pattern}")
    return text


def _js(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _var(value: str) -> str:
    return "g_" + re.sub(r"[^A-Za-z0-9_]", "_", value)


class PluginBuilder:
    """Build one Unit-first standalone workbench from a declarative spec."""

    def __init__(self, spec: Dict[str, Any]):
        self._portable_tasks: list[dict[str, Any]] = []
        self.spec = self._normalize(spec)

    @classmethod
    def from_json(cls, path: str | Path) -> "PluginBuilder":
        return cls(json.loads(Path(path).read_text(encoding="utf-8")))

    def _normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        spec = _expect_object(raw, "spec")
        allowed = {"schema", "plugin", "page", "workspace", "host", "data", "actions", "parameters", "interaction", "content", "surfaces", "domainAdapter"}
        extra = sorted(set(spec) - allowed)
        if extra:
            raise SpecError(f"unsupported top-level fields: {', '.join(extra)}")
        if spec.get("schema") != SCHEMA:
            raise SpecError(f"schema must be {SCHEMA}")

        plugin = _expect_object(spec.get("plugin"), "plugin")
        extra = sorted(set(plugin) - {"id", "name", "version", "description", "order", "enabled"})
        if extra:
            raise SpecError(f"unsupported plugin fields: {', '.join(extra)}")
        version = _nonempty(plugin.get("version"), "plugin.version")
        if not SEMVER.fullmatch(version):
            raise SpecError("plugin.version must be semver")
        normalized_plugin = {
            "id": _ident(plugin.get("id"), "plugin.id"),
            "name": _nonempty(plugin.get("name"), "plugin.name"),
            "version": version,
            "description": _nonempty(plugin.get("description"), "plugin.description"),
            "order": int(plugin.get("order", 900)),
            "enabled": bool(plugin.get("enabled", True)),
        }

        domain_adapter = None
        if spec.get("domainAdapter") is not None:
            raw_domain = _expect_object(spec.get("domainAdapter"), "domainAdapter")
            extra = sorted(set(raw_domain) - {"ref", "dependency"})
            if extra:
                raise SpecError(f"unsupported domainAdapter fields: {', '.join(extra)}")
            dependency = _ident(raw_domain.get("dependency"), "domainAdapter.dependency")
            ref = _nonempty(raw_domain.get("ref"), "domainAdapter.ref")
            if not ref.startswith(dependency + "/") or ref.count("/") != 1:
                raise SpecError("domainAdapter.ref must be dependency/id for the declared dependency")
            adapter_id = _ident(ref.split("/", 1)[1], "domainAdapter.ref id")
            domain_adapter = {"ref": dependency + "/" + adapter_id, "dependency": dependency}

        page = _expect_object(spec.get("page"), "page")
        extra = sorted(set(page) - {"id", "label", "title", "subtitle", "variant", "close", "actionIds"})
        if extra:
            raise SpecError(f"unsupported page fields: {', '.join(extra)}")
        page_variant = str(page.get("variant", "analysis"))
        if page_variant not in PAGE_VARIANTS:
            raise SpecError(f"page.variant must be one of {sorted(PAGE_VARIANTS)}")
        normalized_page = {
            "id": _ident(page.get("id"), "page.id"),
            "label": _nonempty(page.get("label"), "page.label"),
            "title": _nonempty(page.get("title"), "page.title"),
            "subtitle": str(page.get("subtitle", "")),
            "variant": page_variant,
            "close": bool(page.get("close", False)),
            "actionIds": [_ident(value, "page.actionIds[]") for value in page.get("actionIds", [])],
            "actionIdsExplicit": "actionIds" in page,
        }

        workspace = _expect_object(spec.get("workspace"), "workspace")
        extra = sorted(set(workspace) - {"activity", "primaryRole", "primaryLabel", "primaryScroll", "mainLayout", "leftWidth", "leftMin", "leftReserve", "primaryEndInset", "layoutStateVersion"})
        if extra:
            raise SpecError(f"unsupported workspace fields: {', '.join(extra)}")
        role = str(workspace.get("primaryRole", ""))
        if role not in PRIMARY_ROLES:
            raise SpecError(f"workspace.primaryRole must be one of {sorted(PRIMARY_ROLES)}")
        scroll = str(workspace.get("primaryScroll", "safe"))
        if scroll not in {"safe", "contained"}:
            raise SpecError("workspace.primaryScroll must be safe or contained")
        main_layout = str(workspace.get("mainLayout", "stack-comfortable"))
        if main_layout not in {"stack-comfortable", "fill-rows"}:
            raise SpecError("workspace.mainLayout must be stack-comfortable or fill-rows")
        left_width = workspace.get("leftWidth")
        left_min = workspace.get("leftMin")
        left_reserve = workspace.get("leftReserve")
        for key, value in (("leftWidth", left_width), ("leftMin", left_min), ("leftReserve", left_reserve)):
            if value is not None:
                number = int(value)
                if number < 180 or number > 1200:
                    raise SpecError(f"workspace.{key} must be in 180..1200")
        if left_width is not None and left_min is not None and int(left_width) < int(left_min):
            raise SpecError("workspace.leftWidth must be >= leftMin")
        primary_end_inset = str(workspace.get("primaryEndInset", "none"))
        if primary_end_inset not in {"none", "content"}:
            raise SpecError("workspace.primaryEndInset must be none or content")
        normalized_workspace = {
            "activity": _ident(workspace.get("activity"), "workspace.activity"),
            "primaryRole": role,
            "primaryLabel": str(workspace.get("primaryLabel", "主界面")),
            "primaryScroll": scroll,
            "mainLayout": main_layout,
            "leftWidth": int(left_width) if left_width is not None else None,
            "leftMin": int(left_min) if left_min is not None else None,
            "leftReserve": int(left_reserve) if left_reserve is not None else None,
            "primaryEndInset": primary_end_inset,
            "layoutStateVersion": str(workspace.get("layoutStateVersion", "declarative-workspace-v1")),
        }

        host = _expect_object(spec.get("host", {"kind": "standalone"}), "host")
        extra = sorted(set(host) - {"kind", "label", "contextLabel", "icon", "defaultSuper", "window"})
        if extra:
            raise SpecError(f"unsupported host fields: {', '.join(extra)}")
        host_kind = str(host.get("kind", "standalone"))
        if host_kind not in {"standalone", "top", "tool"}:
            raise SpecError("host.kind must be standalone, top or tool")
        if host_kind == "standalone":
            extra_host = sorted(set(host) - {"kind"})
            if extra_host:
                raise SpecError("standalone host supports only kind")
            normalized_host = {"kind": "standalone"}
        else:
            window = _expect_object(host.get("window", {}), "host.window")
            extra_window = sorted(set(window) - {
                "title", "width", "height", "minWidth", "minHeight",
                "prewarm", "reuse", "persistence", "artifactHydration"
            })
            if extra_window:
                raise SpecError(f"unsupported host.window fields: {', '.join(extra_window)}")
            width = int(window.get("width", 1280 if host_kind == "top" else 1080))
            height = int(window.get("height", 820 if host_kind == "top" else 720))
            min_width = int(window.get("minWidth", 860 if host_kind == "top" else 760))
            min_height = int(window.get("minHeight", 560 if host_kind == "top" else 520))
            if width < 480 or width > 4096 or height < 360 or height > 2160:
                raise SpecError("host.window width/height are outside the bounded desktop range")
            if min_width < 320 or min_width > width:
                raise SpecError("host.window.minWidth must be in 320..width")
            if min_height < 240 or min_height > height:
                raise SpecError("host.window.minHeight must be in 240..height")
            persistence = str(window.get("persistence", "project"))
            if persistence not in {"project", "memory", "none"}:
                raise SpecError("host.window.persistence must be project, memory or none")
            artifact_hydration = str(window.get("artifactHydration", "live"))
            if artifact_hydration not in {"project", "live"}:
                raise SpecError("host.window.artifactHydration must be project or live")
            normalized_host = {
                "kind": host_kind,
                "label": _nonempty(host.get("label", normalized_page["label"]), "host.label"),
                "contextLabel": _nonempty(host.get("contextLabel", normalized_page["title"]), "host.contextLabel"),
                "icon": _nonempty(host.get("icon", "◇" if host_kind == "top" else "⌁"), "host.icon"),
                "defaultSuper": bool(host.get("defaultSuper", False)),
                "pageId": "dkdsGeneratedPage_" + re.sub(r"[^A-Za-z0-9_-]", "_", normalized_page["id"]),
                "window": {
                    "title": _nonempty(window.get("title", normalized_page["title"]), "host.window.title"),
                    "width": width,
                    "height": height,
                    "minWidth": min_width,
                    "minHeight": min_height,
                    "prewarm": bool(window.get("prewarm", False)),
                    "reuse": bool(window.get("reuse", True)),
                    "persistence": persistence,
                    "artifactHydration": artifact_hydration,
                },
            }

        if normalized_page["close"] and normalized_host["kind"] == "standalone":
            raise SpecError("page.close requires host.kind top or tool")

        data = _expect_object(spec.get("data"), "data")
        extra = sorted(set(data) - {"accepts", "produces"})
        if extra:
            raise SpecError(f"unsupported data fields: {', '.join(extra)}")
        accepts = [_nonempty(v, "data.accepts[]") for v in _expect_list(data.get("accepts"), "data.accepts")]
        if not accepts:
            raise SpecError("data.accepts must not be empty for a workbench")
        produces = [_nonempty(v, "data.produces[]") for v in data.get("produces", [])]
        normalized_data = {"accepts": accepts}
        if produces:
            normalized_data["produces"] = produces

        actions = []
        for index, row in enumerate(spec.get("actions", [])):
            row = _expect_object(row, f"actions[{index}]")
            extra = sorted(set(row) - {"id", "label", "variant", "statusMessage", "icon", "order"})
            if extra:
                raise SpecError(f"unsupported action fields at {index}: {', '.join(extra)}")
            action = {
                "id": _ident(row.get("id"), f"actions[{index}].id"),
                "label": _nonempty(row.get("label"), f"actions[{index}].label"),
                "statusMessage": _nonempty(row.get("statusMessage"), f"actions[{index}].statusMessage"),
                "icon": str(row.get("icon", "")),
                "order": int(row.get("order", (index + 1) * 10)),
            }
            if "variant" in row:
                action_variant = str(row["variant"])
                if action_variant not in ACTION_VARIANTS:
                    raise SpecError(f"actions[{index}].variant is invalid")
                action["variant"] = action_variant
            actions.append(action)
        if len(actions) > 8:
            raise SpecError("actions supports at most 8 entries")

        action_ids = {row["id"] for row in actions}
        if not normalized_page["actionIdsExplicit"]:
            normalized_page["actionIds"] = [row["id"] for row in actions]
        unknown_page_actions = [action_id for action_id in normalized_page["actionIds"] if action_id not in action_ids]
        if unknown_page_actions:
            raise SpecError(f"page.actionIds references unknown actions: {', '.join(unknown_page_actions)}")

        def normalize_parameter_field(field: Dict[str, Any], name: str) -> Dict[str, Any]:
            field = _expect_object(field, name)
            extra = sorted(set(field) - {"id", "type", "label", "value", "step", "options", "binding"})
            if extra:
                raise SpecError(f"unsupported parameter field keys in {name}: {', '.join(extra)}")
            kind = str(field.get("type", ""))
            if kind not in FIELD_TYPES:
                raise SpecError(f"{name}.type is invalid")
            normalized = {
                "id": _ident(field.get("id"), f"{name}.id"),
                "type": kind,
                "label": _nonempty(field.get("label"), f"{name}.label"),
            }
            if field.get("binding") is not None:
                if domain_adapter is None:
                    raise SpecError(f"{name}.binding requires top-level domainAdapter")
                raw_binding = _expect_object(field["binding"], f"{name}.binding")
                extra = sorted(set(raw_binding) - {"statePath", "domainAction", "argumentKey", "staticArgs"})
                if extra:
                    raise SpecError(f"unsupported {name}.binding fields: {', '.join(extra)}")
                state_path = str(raw_binding.get("statePath", "")).strip()
                if not state_path or not all(IDENT.fullmatch(part) for part in state_path.split(".")):
                    raise SpecError(f"{name}.binding.statePath must be a dotted identifier path")
                domain_action = _ident(raw_binding.get("domainAction"), f"{name}.binding.domainAction")
                argument_key = _ident(raw_binding.get("argumentKey", "value"), f"{name}.binding.argumentKey")
                raw_static = _expect_object(raw_binding.get("staticArgs", {}), f"{name}.binding.staticArgs")
                if len(raw_static) > 8:
                    raise SpecError(f"{name}.binding.staticArgs supports at most 8 entries")
                static_args = {}
                for key, value in raw_static.items():
                    normalized_key = _ident(key, f"{name}.binding.staticArgs key")
                    if value is not None and (isinstance(value, (dict, list)) or not isinstance(value, (str, int, float, bool))):
                        raise SpecError(f"{name}.binding.staticArgs.{normalized_key} must be a scalar")
                    static_args[normalized_key] = value
                normalized["binding"] = {
                    "statePath": state_path,
                    "domainAction": domain_action,
                    "argumentKey": argument_key,
                    "staticArgs": static_args,
                }
            if "value" in field:
                normalized["value"] = field["value"]
            if "step" in field:
                normalized["step"] = field["step"]
            if kind == "select":
                options = _expect_list(field.get("options"), f"{name}.options")
                if not options:
                    raise SpecError(f"{name} select fields require at least one option")
                normalized["options"] = []
                for option_index, option in enumerate(options):
                    option = _expect_object(option, f"{name}.options[{option_index}]")
                    if set(option) - {"value", "label"}:
                        raise SpecError("select option supports only value and label")
                    normalized["options"].append({
                        "value": option.get("value"),
                        "label": _nonempty(option.get("label"), f"{name}.options[{option_index}].label"),
                    })
            elif "options" in field:
                raise SpecError("options are only valid for select fields")
            return normalized

        parameters = None
        if spec.get("parameters") is not None:
            row = _expect_object(spec["parameters"], "parameters")
            extra = sorted(set(row) - {"id", "label", "fields", "groups", "priority", "embedded", "autoOpen", "stateVersion"})
            if extra:
                raise SpecError(f"unsupported parameters fields: {', '.join(extra)}")
            raw_fields = row.get("fields")
            raw_groups = row.get("groups")
            if raw_fields is not None and raw_groups is not None:
                raise SpecError("parameters must use fields or groups, not both")
            if raw_fields is None and raw_groups is None:
                raise SpecError("parameters requires fields or groups")

            fields = []
            groups = []
            if raw_fields is not None:
                for index, field in enumerate(_expect_list(raw_fields, "parameters.fields")):
                    fields.append(normalize_parameter_field(field, f"parameters.fields[{index}]"))
                if not fields:
                    raise SpecError("parameters.fields must not be empty")
            else:
                for group_index, group in enumerate(_expect_list(raw_groups, "parameters.groups")):
                    group = _expect_object(group, f"parameters.groups[{group_index}]")
                    extra = sorted(set(group) - {"id", "title", "variant", "layout", "fieldLayout", "fields", "badge", "note", "actionIds", "tabs", "actionGrid", "toolbar", "parameterForm", "table"})
                    if extra:
                        raise SpecError(f"unsupported parameters.groups[{group_index}] fields: {', '.join(extra)}")
                    variant = str(group.get("variant", "headed"))
                    if variant not in {"headed", "plain"}:
                        raise SpecError(f"parameters.groups[{group_index}].variant must be headed or plain")
                    layout = str(group.get("layout", "stack"))
                    if layout not in {"stack", "form-grid-2", "fill-rows"}:
                        raise SpecError(f"parameters.groups[{group_index}].layout must be stack, form-grid-2 or fill-rows")
                    field_layout = group.get("fieldLayout")
                    if field_layout is not None:
                        field_layout = str(field_layout)
                        if field_layout not in {"form-grid-2", "analysis-control-grid", "result-control-grid"}:
                            raise SpecError(f"parameters.groups[{group_index}].fieldLayout is invalid")
                    group_fields = []
                    for field_index, field in enumerate(_expect_list(group.get("fields", []), f"parameters.groups[{group_index}].fields")):
                        normalized_field = normalize_parameter_field(
                            field,
                            f"parameters.groups[{group_index}].fields[{field_index}]",
                        )
                        group_fields.append(normalized_field)
                        fields.append(normalized_field)

                    badge = None
                    if group.get("badge") is not None:
                        raw_badge = _expect_object(group["badge"], f"parameters.groups[{group_index}].badge")
                        extra = sorted(set(raw_badge) - {"text", "variant"})
                        if extra:
                            raise SpecError(f"unsupported parameters.groups[{group_index}].badge fields: {', '.join(extra)}")
                        badge_variant = str(raw_badge.get("variant", "quiet"))
                        if badge_variant not in {"quiet", "selected", "danger", "info"}:
                            raise SpecError(f"parameters.groups[{group_index}].badge.variant is invalid")
                        badge = {
                            "text": str(raw_badge.get("text", "")),
                            "variant": badge_variant,
                        }

                    note = None
                    if group.get("note") is not None:
                        raw_note = _expect_object(group["note"], f"parameters.groups[{group_index}].note")
                        extra = sorted(set(raw_note) - {"text", "variant"})
                        if extra:
                            raise SpecError(f"unsupported parameters.groups[{group_index}].note fields: {', '.join(extra)}")
                        note_variant = str(raw_note.get("variant", "meta"))
                        if note_variant not in NOTE_VARIANTS:
                            raise SpecError(f"parameters.groups[{group_index}].note.variant is invalid")
                        note = {"text": str(raw_note.get("text", "")), "variant": note_variant}

                    group_action_ids = [
                        _ident(value, f"parameters.groups[{group_index}].actionIds[]")
                        for value in group.get("actionIds", [])
                    ]
                    unknown_actions = [action_id for action_id in group_action_ids if action_id not in action_ids]
                    if unknown_actions:
                        raise SpecError(
                            f"parameters.groups[{group_index}].actionIds references unknown actions: {', '.join(unknown_actions)}"
                        )

                    tabs = None
                    if group.get("tabs") is not None:
                        raw_tabs = _expect_object(group["tabs"], f"parameters.groups[{group_index}].tabs")
                        extra = sorted(set(raw_tabs) - {"id", "variant", "items"})
                        if extra:
                            raise SpecError(f"unsupported parameters.groups[{group_index}].tabs fields: {', '.join(extra)}")
                        tabs_variant = str(raw_tabs.get("variant", "compact"))
                        if tabs_variant not in {"compact", "standard"}:
                            raise SpecError(f"parameters.groups[{group_index}].tabs.variant is invalid")
                        tab_items = []
                        for tab_index, item in enumerate(_expect_list(raw_tabs.get("items"), f"parameters.groups[{group_index}].tabs.items")):
                            item = _expect_object(item, f"parameters.groups[{group_index}].tabs.items[{tab_index}]")
                            extra = sorted(set(item) - {"id", "label", "selected"})
                            if extra:
                                raise SpecError(f"unsupported tab item fields at {group_index}:{tab_index}: {', '.join(extra)}")
                            tab_items.append({
                                "id": _ident(item.get("id"), f"parameters.groups[{group_index}].tabs.items[{tab_index}].id"),
                                "label": _nonempty(item.get("label"), f"parameters.groups[{group_index}].tabs.items[{tab_index}].label"),
                                "selected": bool(item.get("selected", False)),
                            })
                        if not tab_items:
                            raise SpecError(f"parameters.groups[{group_index}].tabs.items must not be empty")
                        if sum(1 for item in tab_items if item["selected"]) > 1:
                            raise SpecError(f"parameters.groups[{group_index}].tabs may select at most one item")
                        tabs = {
                            "id": _ident(raw_tabs.get("id"), f"parameters.groups[{group_index}].tabs.id"),
                            "variant": tabs_variant,
                            "items": tab_items,
                        }

                    action_grid = None
                    if group.get("actionGrid") is not None:
                        raw_grid = _expect_object(group["actionGrid"], f"parameters.groups[{group_index}].actionGrid")
                        extra = sorted(set(raw_grid) - {"layout", "actionIds"})
                        if extra:
                            raise SpecError(f"unsupported parameters.groups[{group_index}].actionGrid fields: {', '.join(extra)}")
                        grid_layout = str(raw_grid.get("layout", "action-grid-4"))
                        if grid_layout not in {"action-grid-2", "action-grid-4"}:
                            raise SpecError(f"parameters.groups[{group_index}].actionGrid.layout is invalid")
                        grid_actions = [_ident(value, f"parameters.groups[{group_index}].actionGrid.actionIds[]") for value in raw_grid.get("actionIds", [])]
                        unknown = [action_id for action_id in grid_actions if action_id not in action_ids]
                        if unknown:
                            raise SpecError(f"parameters.groups[{group_index}].actionGrid references unknown actions: {', '.join(unknown)}")
                        if not grid_actions:
                            raise SpecError(f"parameters.groups[{group_index}].actionGrid.actionIds must not be empty")
                        action_grid = {"layout": grid_layout, "actionIds": grid_actions}

                    toolbar = None
                    if group.get("toolbar") is not None:
                        raw_toolbar = _expect_object(group["toolbar"], f"parameters.groups[{group_index}].toolbar")
                        extra = sorted(set(raw_toolbar) - {"variant", "layout", "label", "actionIds"})
                        if extra:
                            raise SpecError(f"unsupported parameters.groups[{group_index}].toolbar fields: {', '.join(extra)}")
                        toolbar_variant = str(raw_toolbar.get("variant", "ordinary"))
                        if toolbar_variant not in {"ordinary", "header", "floating", "segmented"}:
                            raise SpecError(f"parameters.groups[{group_index}].toolbar.variant is invalid")
                        toolbar_layout = raw_toolbar.get("layout")
                        if toolbar_layout is not None:
                            toolbar_layout = str(toolbar_layout)
                            if toolbar_layout not in {"segment-bar", "toolbar-wrap"}:
                                raise SpecError(f"parameters.groups[{group_index}].toolbar.layout is invalid")
                        toolbar_actions = [_ident(value, f"parameters.groups[{group_index}].toolbar.actionIds[]") for value in raw_toolbar.get("actionIds", [])]
                        unknown = [action_id for action_id in toolbar_actions if action_id not in action_ids]
                        if unknown:
                            raise SpecError(f"parameters.groups[{group_index}].toolbar references unknown actions: {', '.join(unknown)}")
                        toolbar = {
                            "variant": toolbar_variant,
                            "layout": toolbar_layout,
                            "label": str(raw_toolbar.get("label", "")),
                            "actionIds": toolbar_actions,
                        }

                    group_parameter_form = None
                    if group.get("parameterForm") is not None:
                        raw_form = _expect_object(group["parameterForm"], f"parameters.groups[{group_index}].parameterForm")
                        extra = sorted(set(raw_form) - {"id", "fields", "compact", "autoFit", "layoutOwner"})
                        if extra:
                            raise SpecError(f"unsupported parameters.groups[{group_index}].parameterForm fields: {', '.join(extra)}")
                        form_fields = []
                        allowed_form_types = {"text", "textarea", "formula", "number", "integer", "boolean", "select", "multiselect", "column", "columns", "color"}
                        for form_index, form_field in enumerate(_expect_list(raw_form.get("fields"), f"parameters.groups[{group_index}].parameterForm.fields")):
                            form_field = _expect_object(form_field, f"parameters.groups[{group_index}].parameterForm.fields[{form_index}]")
                            extra = sorted(set(form_field) - {"id", "type", "label", "required", "default", "options", "min", "max", "visibleWhen"})
                            if extra:
                                raise SpecError(f"unsupported nested parameter-form field keys at {group_index}:{form_index}: {', '.join(extra)}")
                            form_type = str(form_field.get("type", "text"))
                            if form_type not in allowed_form_types:
                                raise SpecError(f"parameters.groups[{group_index}].parameterForm.fields[{form_index}].type is unsupported")
                            normalized_form_field = {
                                "id": _ident(form_field.get("id"), f"parameters.groups[{group_index}].parameterForm.fields[{form_index}].id"),
                                "type": form_type,
                                "label": _nonempty(form_field.get("label"), f"parameters.groups[{group_index}].parameterForm.fields[{form_index}].label"),
                                "required": bool(form_field.get("required", False)),
                            }
                            for key in ("default", "options", "min", "max", "visibleWhen"):
                                if key in form_field:
                                    normalized_form_field[key] = form_field[key]
                            form_fields.append(normalized_form_field)
                        if not form_fields:
                            raise SpecError(f"parameters.groups[{group_index}].parameterForm.fields must not be empty")
                        layout_owner = str(raw_form.get("layoutOwner", "core"))
                        if layout_owner not in {"core", "host"}:
                            raise SpecError(f"parameters.groups[{group_index}].parameterForm.layoutOwner must be core or host")
                        group_parameter_form = {
                            "id": _ident(raw_form.get("id"), f"parameters.groups[{group_index}].parameterForm.id"),
                            "fields": form_fields,
                            "compact": bool(raw_form.get("compact", True)),
                            "autoFit": bool(raw_form.get("autoFit", True)),
                            "layoutOwner": layout_owner,
                        }

                    group_table = None
                    if group.get("table") is not None:
                        raw_table = _expect_object(group["table"], f"parameters.groups[{group_index}].table")
                        extra = sorted(set(raw_table) - {"id", "columns", "rows", "layout"})
                        if extra:
                            raise SpecError(f"unsupported parameters.groups[{group_index}].table fields: {', '.join(extra)}")
                        table_columns = []
                        for column_index, column in enumerate(_expect_list(raw_table.get("columns"), f"parameters.groups[{group_index}].table.columns")):
                            column = _expect_object(column, f"parameters.groups[{group_index}].table.columns[{column_index}]")
                            extra = sorted(set(column) - {"key", "label", "unit"})
                            if extra:
                                raise SpecError(f"unsupported group table column fields at {group_index}:{column_index}: {', '.join(extra)}")
                            normalized_column = {
                                "key": _ident(column.get("key"), f"parameters.groups[{group_index}].table.columns[{column_index}].key"),
                                "label": _nonempty(column.get("label"), f"parameters.groups[{group_index}].table.columns[{column_index}].label"),
                            }
                            if "unit" in column:
                                normalized_column["unit"] = str(column.get("unit", ""))
                            table_columns.append(normalized_column)
                        if not table_columns:
                            raise SpecError(f"parameters.groups[{group_index}].table.columns must not be empty")
                        table_rows = []
                        for row_index, table_row in enumerate(raw_table.get("rows", [])):
                            table_row = _expect_object(table_row, f"parameters.groups[{group_index}].table.rows[{row_index}]")
                            table_rows.append({str(key): value for key, value in table_row.items()})
                        table_layout = str(raw_table.get("layout", "scroll-pane"))
                        if table_layout not in {"scroll-pane", "identity"}:
                            raise SpecError(f"parameters.groups[{group_index}].table.layout is invalid")
                        group_table = {
                            "id": _ident(raw_table.get("id"), f"parameters.groups[{group_index}].table.id"),
                            "columns": table_columns,
                            "rows": table_rows,
                            "layout": table_layout,
                        }
                    if not group_fields and note is None and not group_action_ids and tabs is None and action_grid is None and toolbar is None and group_parameter_form is None and group_table is None:
                        raise SpecError(f"parameters.groups[{group_index}] must contain fields, note, actions, parameterForm, or table")
                    groups.append({
                        "id": _ident(group.get("id"), f"parameters.groups[{group_index}].id"),
                        "title": _nonempty(group.get("title"), f"parameters.groups[{group_index}].title"),
                        "variant": variant,
                        "layout": layout,
                        "fieldLayout": field_layout,
                        "fields": group_fields,
                        "badge": badge,
                        "note": note,
                        "actionIds": group_action_ids,
                        "tabs": tabs,
                        "actionGrid": action_grid,
                        "toolbar": toolbar,
                        "parameterForm": group_parameter_form,
                        "table": group_table,
                    })
                if not groups:
                    raise SpecError("parameters.groups must not be empty")

            if len({field["id"] for field in fields}) != len(fields):
                raise SpecError("parameter field ids must be unique across the parameter PRIME")
            priority = int(row.get("priority", 90))
            if priority < 1 or priority > 100:
                raise SpecError("parameters.priority must be in 1..100")
            parameters = {
                "id": _ident(row.get("id"), "parameters.id"),
                "label": _nonempty(row.get("label"), "parameters.label"),
                "fields": fields,
                "groups": groups,
                "priority": priority,
                "embedded": bool(row.get("embedded", False)),
                "autoOpen": bool(row.get("autoOpen", True)),
                "stateVersion": str(row.get("stateVersion", "declarative-v2")),
            }

        normalized_interaction = None
        if spec.get("interaction") is not None:
            interaction = _expect_object(spec["interaction"], "interaction")
            extra = sorted(set(interaction) - {"id", "selection", "selectionLink"})
            if extra:
                raise SpecError(f"unsupported interaction fields: {', '.join(extra)}")
            selection = _expect_object(interaction.get("selection", {}), "interaction.selection")
            extra = sorted(set(selection) - {"multiple", "defaultType"})
            if extra:
                raise SpecError(f"unsupported interaction.selection fields: {', '.join(extra)}")
            normalized_selection = {
                "multiple": bool(selection.get("multiple", True)),
                "defaultType": _nonempty(selection.get("defaultType", "data.series"), "interaction.selection.defaultType"),
            }
            selection_link = None
            if interaction.get("selectionLink") is not None:
                link = _expect_object(interaction["selectionLink"], "interaction.selectionLink")
                extra = sorted(set(link) - {"enabled", "group", "acceptTypes"})
                if extra:
                    raise SpecError(f"unsupported interaction.selectionLink fields: {', '.join(extra)}")
                accept_types = [_nonempty(value, "interaction.selectionLink.acceptTypes[]") for value in link.get("acceptTypes", [])]
                selection_link = {
                    "enabled": bool(link.get("enabled", True)),
                    "group": _nonempty(link.get("group"), "interaction.selectionLink.group"),
                    "acceptTypes": accept_types,
                }
            normalized_interaction = {
                "id": _ident(interaction.get("id"), "interaction.id"),
                "selection": normalized_selection,
                "selectionLink": selection_link,
            }

        def normalize_plot_interaction(row: Dict[str, Any], name: str) -> Dict[str, Any]:
            identity = None
            if row.get("identity") is not None:
                raw_identity = _expect_object(row["identity"], f"{name}.identity")
                extra = sorted(set(raw_identity) - {"input", "entityType"})
                if extra:
                    raise SpecError(f"unsupported {name}.identity fields: {', '.join(extra)}")
                identity = {
                    "input": _ident(raw_identity.get("input"), f"{name}.identity.input"),
                    "entityType": _nonempty(raw_identity.get("entityType", "data.series"), f"{name}.identity.entityType"),
                }
            axes = None
            if row.get("axisSemantics") is not None:
                raw_axes = _expect_object(row["axisSemantics"], f"{name}.axisSemantics")
                extra = sorted(set(raw_axes) - {"x", "y"})
                if extra:
                    raise SpecError(f"unsupported {name}.axisSemantics fields: {', '.join(extra)}")
                axes = {}
                for axis in ("x", "y"):
                    raw_axis = _expect_object(raw_axes.get(axis, {}), f"{name}.axisSemantics.{axis}")
                    extra = sorted(set(raw_axis) - {"name", "unit", "dimension", "quantity"})
                    if extra:
                        raise SpecError(f"unsupported {name}.axisSemantics.{axis} fields: {', '.join(extra)}")
                    axes[axis] = {
                        "name": str(raw_axis.get("name", "")),
                        "unit": str(raw_axis.get("unit", "")),
                        "dimension": str(raw_axis.get("dimension", "")),
                        "quantity": str(raw_axis.get("quantity", "")),
                    }
            viewport = None
            if row.get("viewport") is not None:
                raw_viewport = _expect_object(row["viewport"], f"{name}.viewport")
                extra = sorted(set(raw_viewport) - {"link", "linkGroup", "linkedAxes"})
                if extra:
                    raise SpecError(f"unsupported {name}.viewport fields: {', '.join(extra)}")
                linked_axes = [str(axis).lower() for axis in raw_viewport.get("linkedAxes", ["x", "y"])]
                if not linked_axes or any(axis not in {"x", "y"} for axis in linked_axes):
                    raise SpecError(f"{name}.viewport.linkedAxes must contain x/y")
                viewport = {
                    "link": bool(raw_viewport.get("link", False)),
                    "linkGroup": _nonempty(raw_viewport.get("linkGroup"), f"{name}.viewport.linkGroup"),
                    "linkedAxes": list(dict.fromkeys(linked_axes)),
                }
            legend = None
            if row.get("legend") is not None:
                raw_legend = _expect_object(row["legend"], f"{name}.legend")
                extra = sorted(set(raw_legend) - {"link", "linkGroup", "maxLinkedTargets"})
                if extra:
                    raise SpecError(f"unsupported {name}.legend fields: {', '.join(extra)}")
                max_targets = int(raw_legend.get("maxLinkedTargets", 24))
                if max_targets < 1 or max_targets > 24:
                    raise SpecError(f"{name}.legend.maxLinkedTargets must be in 1..24")
                legend = {
                    "link": bool(raw_legend.get("link", False)),
                    "linkGroup": _nonempty(raw_legend.get("linkGroup"), f"{name}.legend.linkGroup"),
                    "maxLinkedTargets": max_targets,
                }
            selection_target = str(row.get("selectionTarget", "series"))
            if selection_target != "series":
                raise SpecError(f"{name}.selectionTarget currently supports only stable series references")
            if viewport is not None and viewport["link"]:
                if axes is None:
                    raise SpecError(f"{name}.viewport linkage requires axisSemantics")
                for axis in viewport["linkedAxes"]:
                    if not axes[axis]["unit"] or not axes[axis]["quantity"]:
                        raise SpecError(f"{name}.viewport linked axis {axis} requires unit and quantity")
            if legend is not None and legend["link"] and identity is None:
                raise SpecError(f"{name}.legend linkage requires stable identity.input")
            if any(value is not None for value in (identity, axes, viewport, legend)) and normalized_interaction is None:
                raise SpecError(f"{name} interaction policy requires top-level interaction")
            return {
                "selectionTarget": selection_target,
                "identity": identity,
                "axisSemantics": axes,
                "viewport": viewport,
                "legend": legend,
            }

        def normalize_plot_render(row: Dict[str, Any], name: str) -> Dict[str, Any]:
            variant = str(row.get("plotVariant", "curve"))
            if variant not in {"curve", "heatmap", "scalar-field"}:
                raise SpecError(f"{name}.plotVariant must be curve, heatmap or scalar-field")
            render_owner = str(row.get("renderOwner", "unit"))
            if render_owner not in {"unit", "runtime"}:
                raise SpecError(f"{name}.renderOwner must be unit or runtime")
            if variant != "curve" and render_owner != "runtime":
                raise SpecError(f"{name} non-curve generated plots currently require renderOwner=runtime")
            if render_owner == "runtime":
                if row.get("points"):
                    raise SpecError(f"{name} runtime-owned plot may not declare generated curve points")
                if any(row.get(key) is not None for key in ("identity", "axisSemantics", "viewport", "legend")):
                    raise SpecError(f"{name} runtime-owned plot delegates interaction/link policy to the existing renderer")
            return {"plotVariant": variant, "renderOwner": render_owner}

        def normalize_surface_parameter_form(raw_form: Dict[str, Any], name: str) -> Dict[str, Any]:
            raw_form = _expect_object(raw_form, name)
            extra = sorted(set(raw_form) - {"id", "fields", "compact", "autoFit", "layoutOwner"})
            if extra:
                raise SpecError(f"unsupported {name} fields: {', '.join(extra)}")
            fields = []
            allowed_types = {"text", "textarea", "formula", "number", "integer", "boolean", "select", "multiselect", "column", "columns", "color"}
            for index, field in enumerate(_expect_list(raw_form.get("fields"), f"{name}.fields")):
                field = _expect_object(field, f"{name}.fields[{index}]")
                extra = sorted(set(field) - {"id", "type", "label", "required", "default", "options", "min", "max", "visibleWhen"})
                if extra:
                    raise SpecError(f"unsupported {name}.fields[{index}] keys: {', '.join(extra)}")
                field_type = str(field.get("type", "text"))
                if field_type not in allowed_types:
                    raise SpecError(f"{name}.fields[{index}].type is unsupported")
                normalized_field = {
                    "id": _ident(field.get("id"), f"{name}.fields[{index}].id"),
                    "type": field_type,
                    "label": _nonempty(field.get("label"), f"{name}.fields[{index}].label"),
                    "required": bool(field.get("required", False)),
                }
                for key in ("default", "options", "min", "max", "visibleWhen"):
                    if key in field:
                        normalized_field[key] = field[key]
                fields.append(normalized_field)
            if not fields:
                raise SpecError(f"{name}.fields must not be empty")
            if len({field["id"] for field in fields}) != len(fields):
                raise SpecError(f"{name}.field ids must be unique")
            layout_owner = str(raw_form.get("layoutOwner", "core"))
            if layout_owner not in {"core", "host"}:
                raise SpecError(f"{name}.layoutOwner must be core or host")
            return {
                "id": _ident(raw_form.get("id"), f"{name}.id"),
                "fields": fields,
                "compact": bool(raw_form.get("compact", True)),
                "autoFit": bool(raw_form.get("autoFit", True)),
                "layoutOwner": layout_owner,
            }

        def normalize_domain_binding(raw_binding: Dict[str, Any], name: str, mode: str = "text") -> Dict[str, Any]:
            if domain_adapter is None:
                raise SpecError(f"{name} requires top-level domainAdapter")
            raw_binding = _expect_object(raw_binding, name)
            allowed = {"statePath"} if mode == "rows" else {"statePath", "fallback", "prefix", "suffix"}
            extra = sorted(set(raw_binding) - allowed)
            if extra:
                raise SpecError(f"unsupported {name} fields: {', '.join(extra)}")
            state_path = str(raw_binding.get("statePath", "")).strip()
            if not state_path or not all(IDENT.fullmatch(part) for part in state_path.split(".")):
                raise SpecError(f"{name}.statePath must be a dotted identifier path")
            normalized = {"statePath": state_path, "mode": mode}
            if mode != "rows":
                normalized.update({
                    "fallback": str(raw_binding.get("fallback", "")),
                    "prefix": str(raw_binding.get("prefix", "")),
                    "suffix": str(raw_binding.get("suffix", "")),
                })
            return normalized

        def normalize_surface_node(raw_node: Dict[str, Any], name: str) -> Dict[str, Any]:
            node = _expect_object(raw_node, name)
            kind = str(node.get("kind", "")).strip()

            if kind == "layout":
                extra = sorted(set(node) - {"kind", "id", "variant", "children"})
                if extra:
                    raise SpecError(f"unsupported {name} layout fields: {', '.join(extra)}")
                children = [
                    normalize_surface_node(child, f"{name}.children[{index}]")
                    for index, child in enumerate(_expect_list(node.get("children", []), f"{name}.children"))
                ]
                return {
                    "kind": "layout",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "variant": _nonempty(node.get("variant", "stack-comfortable"), f"{name}.variant"),
                    "children": children,
                }

            if kind == "panel":
                extra = sorted(set(node) - {"kind", "id", "variant", "title", "header", "sizing", "layout", "children"})
                if extra:
                    raise SpecError(f"unsupported {name} panel fields: {', '.join(extra)}")
                children = [
                    normalize_surface_node(child, f"{name}.children[{index}]")
                    for index, child in enumerate(_expect_list(node.get("children", []), f"{name}.children"))
                ]
                return {
                    "kind": "panel",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "variant": _nonempty(node.get("variant", "plain"), f"{name}.variant"),
                    "title": str(node.get("title", "")),
                    "header": bool(node.get("header", bool(node.get("title")))),
                    "sizing": _nonempty(node.get("sizing", "content"), f"{name}.sizing"),
                    "layout": str(node.get("layout", "")),
                    "children": children,
                }

            if kind == "header":
                extra = sorted(set(node) - {"kind", "id", "headerKind", "variant", "title", "actionIds"})
                if extra:
                    raise SpecError(f"unsupported {name} header fields: {', '.join(extra)}")
                action_ids_local = [_ident(value, f"{name}.actionIds[]") for value in node.get("actionIds", [])]
                unknown = [action_id for action_id in action_ids_local if action_id not in action_ids]
                if unknown:
                    raise SpecError(f"{name}.actionIds references unknown actions: {', '.join(unknown)}")
                return {
                    "kind": "header",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "headerKind": _nonempty(node.get("headerKind", "content"), f"{name}.headerKind"),
                    "variant": _nonempty(node.get("variant", "content"), f"{name}.variant"),
                    "title": _nonempty(node.get("title"), f"{name}.title"),
                    "actionIds": action_ids_local,
                }

            if kind == "note":
                extra = sorted(set(node) - {"kind", "id", "variant", "text"})
                if extra:
                    raise SpecError(f"unsupported {name} note fields: {', '.join(extra)}")
                return {
                    "kind": "note",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "variant": _nonempty(node.get("variant", "ordinary"), f"{name}.variant"),
                    "text": str(node.get("text", "")),
                }

            if kind == "field":
                extra = sorted(set(node) - {"kind", "id", "type", "label", "value", "step", "options", "binding"})
                if extra:
                    raise SpecError(f"unsupported {name} field keys: {', '.join(extra)}")
                normalized = normalize_parameter_field({key: value for key, value in node.items() if key not in {"kind", "binding"}}, name)
                normalized["kind"] = "field"
                normalized["binding"] = normalize_domain_binding(node["binding"], f"{name}.binding") if node.get("binding") is not None else None
                return normalized

            if kind == "toolbar":
                extra = sorted(set(node) - {"kind", "id", "variant", "layout", "label", "actionIds"})
                if extra:
                    raise SpecError(f"unsupported {name} toolbar fields: {', '.join(extra)}")
                action_ids_local = [_ident(value, f"{name}.actionIds[]") for value in node.get("actionIds", [])]
                unknown = [action_id for action_id in action_ids_local if action_id not in action_ids]
                if unknown:
                    raise SpecError(f"{name}.actionIds references unknown actions: {', '.join(unknown)}")
                return {
                    "kind": "toolbar",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "variant": _nonempty(node.get("variant", "ordinary"), f"{name}.variant"),
                    "layout": str(node.get("layout", "")),
                    "label": str(node.get("label", "")),
                    "actionIds": action_ids_local,
                }

            if kind == "parameter-form":
                normalized = normalize_surface_parameter_form(
                    {key: value for key, value in node.items() if key != "kind"},
                    name,
                )
                normalized["kind"] = "parameter-form"
                return normalized

            if kind == "summary":
                extra = sorted(set(node) - {"kind", "id", "variant", "items"})
                if extra:
                    raise SpecError(f"unsupported {name} summary fields: {', '.join(extra)}")
                items = []
                for index, item in enumerate(_expect_list(node.get("items", []), f"{name}.items")):
                    item = _expect_object(item, f"{name}.items[{index}]")
                    extra = sorted(set(item) - {"text", "variant"})
                    if extra:
                        raise SpecError(f"unsupported {name}.items[{index}] fields: {', '.join(extra)}")
                    items.append({"text": str(item.get("text", "")), "variant": str(item.get("variant", ""))})
                return {
                    "kind": "summary",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "variant": _nonempty(node.get("variant", "row"), f"{name}.variant"),
                    "items": items,
                }

            if kind == "empty-state":
                extra = sorted(set(node) - {"kind", "id", "text"})
                if extra:
                    raise SpecError(f"unsupported {name} empty-state fields: {', '.join(extra)}")
                return {
                    "kind": "empty-state",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "text": str(node.get("text", "")),
                }

            if kind == "list":
                extra = sorted(set(node) - {"kind", "id", "items", "emptyText"})
                if extra:
                    raise SpecError(f"unsupported {name} list fields: {', '.join(extra)}")
                items = []
                for index, item in enumerate(_expect_list(node.get("items", []), f"{name}.items")):
                    item = _expect_object(item, f"{name}.items[{index}]")
                    extra = sorted(set(item) - {"title", "meta", "leading", "selectable", "selected"})
                    if extra:
                        raise SpecError(f"unsupported {name}.items[{index}] fields: {', '.join(extra)}")
                    items.append({
                        "title": str(item.get("title", "")),
                        "meta": str(item.get("meta", "")),
                        "leading": str(item.get("leading", "")),
                        "selectable": bool(item.get("selectable", False)),
                        "selected": bool(item.get("selected", False)),
                    })
                return {
                    "kind": "list",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "items": items,
                    "emptyText": str(node.get("emptyText", "")),
                }

            if kind == "legend":
                extra = sorted(set(node) - {"kind", "id", "variant", "items"})
                if extra:
                    raise SpecError(f"unsupported {name} legend fields: {', '.join(extra)}")
                items = []
                for index, item in enumerate(_expect_list(node.get("items", []), f"{name}.items")):
                    item = _expect_object(item, f"{name}.items[{index}]")
                    extra = sorted(set(item) - {"label", "variant"})
                    if extra:
                        raise SpecError(f"unsupported {name}.items[{index}] fields: {', '.join(extra)}")
                    items.append({
                        "label": _nonempty(item.get("label"), f"{name}.items[{index}].label"),
                        "variant": str(item.get("variant", "quiet")),
                    })
                return {
                    "kind": "legend",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "variant": _nonempty(node.get("variant", "strip"), f"{name}.variant"),
                    "items": items,
                }

            if kind == "table":
                extra = sorted(set(node) - {"kind", "id", "columns", "rows", "layout", "binding"})
                if extra:
                    raise SpecError(f"unsupported {name} table fields: {', '.join(extra)}")
                columns = []
                for index, column in enumerate(_expect_list(node.get("columns"), f"{name}.columns")):
                    column = _expect_object(column, f"{name}.columns[{index}]")
                    extra = sorted(set(column) - {"key", "label", "unit"})
                    if extra:
                        raise SpecError(f"unsupported {name}.columns[{index}] fields: {', '.join(extra)}")
                    normalized_column = {
                        "key": _ident(column.get("key"), f"{name}.columns[{index}].key"),
                        "label": _nonempty(column.get("label"), f"{name}.columns[{index}].label"),
                    }
                    if "unit" in column:
                        normalized_column["unit"] = str(column.get("unit", ""))
                    columns.append(normalized_column)
                if not columns:
                    raise SpecError(f"{name}.columns must not be empty")
                rows = []
                for index, item in enumerate(node.get("rows", [])):
                    item = _expect_object(item, f"{name}.rows[{index}]")
                    rows.append({str(key): value for key, value in item.items()})
                return {
                    "kind": "table",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "columns": columns,
                    "rows": rows,
                    "layout": _nonempty(node.get("layout", "scroll-pane"), f"{name}.layout"),
                    "binding": normalize_domain_binding(node["binding"], f"{name}.binding", mode="rows") if node.get("binding") is not None else None,
                }

            if kind == "status":
                extra = sorted(set(node) - {"kind", "id", "variant", "text", "state", "binding"})
                if extra:
                    raise SpecError(f"unsupported {name} status fields: {', '.join(extra)}")
                return {
                    "kind": "status",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "variant": _nonempty(node.get("variant", "text"), f"{name}.variant"),
                    "text": str(node.get("text", "")),
                    "state": str(node.get("state", "")),
                    "binding": normalize_domain_binding(node["binding"], f"{name}.binding") if node.get("binding") is not None else None,
                }

            if kind == "metric":
                extra = sorted(set(node) - {"kind", "id", "variant", "label", "value", "binding"})
                if extra:
                    raise SpecError(f"unsupported {name} metric fields: {', '.join(extra)}")
                return {
                    "kind": "metric",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "variant": _nonempty(node.get("variant", "standard"), f"{name}.variant"),
                    "label": _nonempty(node.get("label"), f"{name}.label"),
                    "value": str(node.get("value", "—")),
                    "binding": normalize_domain_binding(node["binding"], f"{name}.binding") if node.get("binding") is not None else None,
                }

            if kind == "action":
                extra = sorted(set(node) - {"kind", "id", "actionId", "label", "variant", "domainAction", "staticArgs", "enabledPath"})
                if extra:
                    raise SpecError(f"unsupported {name} action fields: {', '.join(extra)}")
                has_action_id = node.get("actionId") is not None
                has_domain_action = node.get("domainAction") is not None
                if has_action_id == has_domain_action:
                    raise SpecError(f"{name} action requires exactly one of actionId or domainAction")
                if has_action_id:
                    if any(key in node for key in ("label", "variant", "staticArgs", "enabledPath")):
                        raise SpecError(f"{name} actionId mode does not accept domain action fields")
                    action_id = _ident(node.get("actionId"), f"{name}.actionId")
                    if action_id not in action_ids:
                        raise SpecError(f"{name}.actionId references unknown action: {action_id}")
                    return {
                        "kind": "action",
                        "id": _ident(node.get("id"), f"{name}.id"),
                        "actionId": action_id,
                    }
                if domain_adapter is None:
                    raise SpecError(f"{name}.domainAction requires top-level domainAdapter")
                variant = str(node.get("variant", "secondary"))
                if variant not in ACTION_VARIANTS:
                    raise SpecError(f"{name}.variant is invalid")
                raw_static = _expect_object(node.get("staticArgs", {}), f"{name}.staticArgs")
                if len(raw_static) > 8:
                    raise SpecError(f"{name}.staticArgs supports at most 8 entries")
                static_args = {}
                for key, value in raw_static.items():
                    normalized_key = _ident(key, f"{name}.staticArgs key")
                    if value is not None and (isinstance(value, (dict, list)) or not isinstance(value, (str, int, float, bool))):
                        raise SpecError(f"{name}.staticArgs.{normalized_key} must be a scalar")
                    static_args[normalized_key] = value
                enabled_path = str(node.get("enabledPath", "")).strip()
                if enabled_path and not all(IDENT.fullmatch(part) for part in enabled_path.split(".")):
                    raise SpecError(f"{name}.enabledPath must be a dotted identifier path")
                return {
                    "kind": "action",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "label": _nonempty(node.get("label"), f"{name}.label"),
                    "variant": variant,
                    "domainAction": _ident(node.get("domainAction"), f"{name}.domainAction"),
                    "staticArgs": static_args,
                    "enabledPath": enabled_path,
                }

            if kind == "floating-chrome":
                extra = sorted(set(node) - {"kind", "id", "variant", "actionIds"})
                if extra:
                    raise SpecError(f"unsupported {name} floating-chrome fields: {', '.join(extra)}")
                action_ids_local = [_ident(value, f"{name}.actionIds[]") for value in node.get("actionIds", [])]
                unknown = [action_id for action_id in action_ids_local if action_id not in action_ids]
                if unknown:
                    raise SpecError(f"{name}.actionIds references unknown actions: {', '.join(unknown)}")
                return {
                    "kind": "floating-chrome",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "variant": _nonempty(node.get("variant", "ordinary"), f"{name}.variant"),
                    "actionIds": action_ids_local,
                }

            if kind == "scientific-plot":
                extra = sorted(set(node) - {"kind", "id", "plotVariant", "source", "renderOwner", "xTitle", "yTitle"})
                if extra:
                    raise SpecError(f"unsupported {name} scientific-plot fields: {', '.join(extra)}")
                variant = str(node.get("plotVariant", "curve"))
                if variant not in {"curve", "heatmap", "scalar-field"}:
                    raise SpecError(f"{name}.plotVariant must be curve, heatmap or scalar-field")
                render_owner = str(node.get("renderOwner", "runtime"))
                if render_owner != "runtime":
                    raise SpecError(f"{name}.renderOwner currently supports runtime only inside generic surfaces")
                return {
                    "kind": "scientific-plot",
                    "id": _ident(node.get("id"), f"{name}.id"),
                    "plotVariant": variant,
                    "source": _nonempty(node.get("source", node.get("id")), f"{name}.source"),
                    "renderOwner": render_owner,
                    "xTitle": str(node.get("xTitle", "")),
                    "yTitle": str(node.get("yTitle", "")),
                }

            raise SpecError(f"{name}.kind is not in the bounded public surface vocabulary")

        surfaces = []
        for surface_index, raw_surface in enumerate(spec.get("surfaces", [])):
            surface = _expect_object(raw_surface, f"surfaces[{surface_index}]")
            extra = sorted(set(surface) - {
                "id", "label", "role", "presentationRole", "presentationPurpose", "semanticKind",
                "priority", "order", "collapsible", "fixed", "embedded", "autoOpen", "defaultPlacement",
                "placements", "sizing", "stateVersion", "keepLeft", "persistent", "layout", "chromeHeaderId", "detailGeometry", "lifecycle", "actions", "children"
            })
            if extra:
                raise SpecError(f"unsupported surfaces[{surface_index}] fields: {', '.join(extra)}")
            role = str(surface.get("role", "")).lower()
            if role not in {"prime", "sub"}:
                raise SpecError(f"surfaces[{surface_index}].role must be prime or sub")
            purpose = str(surface.get("presentationPurpose", ""))
            if purpose == "parameters":
                raise SpecError("generic surfaces may not declare presentationPurpose=parameters; use the canonical parameters block")
            placements = [str(value) for value in surface.get("placements", ["right", "bottom", "float"])]
            if role == "prime":
                if not placements:
                    raise SpecError(f"surfaces[{surface_index}].placements must not be empty for PRIME")
                if any(value not in {"inline", "left", "right", "bottom", "float", "global"} for value in placements):
                    raise SpecError(f"surfaces[{surface_index}].placements contains an unsupported placement")
                fixed = bool(surface.get("fixed", False))
                if fixed and len(set(placements)) > 1:
                    raise SpecError(f"surfaces[{surface_index}] fixed PRIME cannot declare multiple placements")
                default_placement = str(surface.get("defaultPlacement", placements[0]))
                if default_placement not in placements:
                    raise SpecError(f"surfaces[{surface_index}].defaultPlacement must be listed in placements")
            else:
                fixed = False
                default_placement = ""
                placements = []
            detail_geometry = None
            if surface.get("detailGeometry") is not None:
                raw_geometry = _expect_object(surface["detailGeometry"], f"surfaces[{surface_index}].detailGeometry")
                extra = sorted(set(raw_geometry) - {"contentInsetPx", "minContentInlinePx", "minContentBlockPx"})
                if extra:
                    raise SpecError(f"unsupported surfaces[{surface_index}].detailGeometry fields: {', '.join(extra)}")
                if role != "prime":
                    raise SpecError(f"surfaces[{surface_index}].detailGeometry is only valid for PRIME surfaces")
                detail_geometry = {}
                bounds = {
                    "contentInsetPx": (0, 96),
                    "minContentInlinePx": (120, 2400),
                    "minContentBlockPx": (80, 2400),
                }
                for key, bounds_row in bounds.items():
                    if raw_geometry.get(key) is None:
                        continue
                    value = int(raw_geometry[key])
                    if value < bounds_row[0] or value > bounds_row[1]:
                        raise SpecError(f"surfaces[{surface_index}].detailGeometry.{key} must be in {bounds_row[0]}..{bounds_row[1]}")
                    detail_geometry[key] = value
                if not detail_geometry:
                    detail_geometry = None

            lifecycle = None
            if surface.get("lifecycle") is not None:
                raw_lifecycle = _expect_object(surface["lifecycle"], f"surfaces[{surface_index}].lifecycle")
                extra = sorted(set(raw_lifecycle) - {"onOpenCommand", "onShowCommand", "onCloseCommand", "onPlacementChangedCommand"})
                if extra:
                    raise SpecError(f"unsupported surfaces[{surface_index}].lifecycle fields: {', '.join(extra)}")
                lifecycle = {}
                for key in ("onOpenCommand", "onShowCommand", "onCloseCommand", "onPlacementChangedCommand"):
                    if raw_lifecycle.get(key) is not None:
                        lifecycle[key] = _ident(raw_lifecycle[key], f"surfaces[{surface_index}].lifecycle.{key}")
                if role == "sub" and any(key in lifecycle for key in ("onOpenCommand", "onCloseCommand", "onPlacementChangedCommand")):
                    raise SpecError(f"surfaces[{surface_index}] SUB lifecycle supports onShowCommand only")
                if role == "prime" and "onShowCommand" in lifecycle:
                    raise SpecError(f"surfaces[{surface_index}] PRIME lifecycle uses onOpenCommand, not onShowCommand")
                if not lifecycle:
                    lifecycle = None

            surface_actions = []
            for action_index, raw_action in enumerate(_expect_list(surface.get("actions", []), f"surfaces[{surface_index}].actions")):
                raw_action = _expect_object(raw_action, f"surfaces[{surface_index}].actions[{action_index}]")
                extra = sorted(set(raw_action) - {"id", "kind", "labelPrefix", "title", "order", "commandId", "domainAction", "statePath", "argumentKey", "defaultValue", "items"})
                if extra:
                    raise SpecError(f"unsupported surfaces[{surface_index}].actions[{action_index}] fields: {', '.join(extra)}")
                if role != "prime":
                    raise SpecError(f"surfaces[{surface_index}].actions are only valid for PRIME surfaces")
                action_kind = str(raw_action.get("kind", "choice-menu"))
                if action_kind != "choice-menu":
                    raise SpecError(f"surfaces[{surface_index}].actions[{action_index}].kind currently supports choice-menu only")
                has_command = raw_action.get("commandId") is not None
                has_domain_action = raw_action.get("domainAction") is not None
                if has_command == has_domain_action:
                    raise SpecError(f"surfaces[{surface_index}].actions[{action_index}] requires exactly one of commandId or domainAction")
                command_id = _ident(raw_action.get("commandId"), f"surfaces[{surface_index}].actions[{action_index}].commandId") if has_command else ""
                domain_action = _ident(raw_action.get("domainAction"), f"surfaces[{surface_index}].actions[{action_index}].domainAction") if has_domain_action else ""
                state_path = str(raw_action.get("statePath", "")).strip()
                if has_domain_action:
                    if domain_adapter is None:
                        raise SpecError(f"surfaces[{surface_index}].actions[{action_index}].domainAction requires top-level domainAdapter")
                    if not state_path or not all(IDENT.fullmatch(part) for part in state_path.split(".")):
                        raise SpecError(f"surfaces[{surface_index}].actions[{action_index}].statePath must be a dotted identifier path")
                elif state_path:
                    raise SpecError(f"surfaces[{surface_index}].actions[{action_index}].statePath is only valid with domainAction")
                argument_key = _ident(raw_action.get("argumentKey", "value"), f"surfaces[{surface_index}].actions[{action_index}].argumentKey")
                items = []
                for item_index, raw_item in enumerate(_expect_list(raw_action.get("items"), f"surfaces[{surface_index}].actions[{action_index}].items")):
                    raw_item = _expect_object(raw_item, f"surfaces[{surface_index}].actions[{action_index}].items[{item_index}]")
                    extra = sorted(set(raw_item) - {"value", "label"})
                    if extra:
                        raise SpecError(f"unsupported surfaces[{surface_index}].actions[{action_index}].items[{item_index}] fields: {', '.join(extra)}")
                    if "value" not in raw_item:
                        raise SpecError(f"surfaces[{surface_index}].actions[{action_index}].items[{item_index}].value is required")
                    value = raw_item["value"]
                    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
                        raise SpecError(f"surfaces[{surface_index}].actions[{action_index}].items[{item_index}].value must be string or number")
                    items.append({
                        "value": value,
                        "label": _nonempty(raw_item.get("label"), f"surfaces[{surface_index}].actions[{action_index}].items[{item_index}].label"),
                    })
                if not items:
                    raise SpecError(f"surfaces[{surface_index}].actions[{action_index}].items must not be empty")
                item_keys = [str(item["value"]) for item in items]
                if len(set(item_keys)) != len(item_keys):
                    raise SpecError(f"surfaces[{surface_index}].actions[{action_index}].item values must be unique")
                default_value = raw_action.get("defaultValue", items[0]["value"])
                if str(default_value) not in item_keys:
                    raise SpecError(f"surfaces[{surface_index}].actions[{action_index}].defaultValue must match one declared item")
                surface_actions.append({
                    "id": _ident(raw_action.get("id"), f"surfaces[{surface_index}].actions[{action_index}].id"),
                    "kind": action_kind,
                    "labelPrefix": str(raw_action.get("labelPrefix", "")),
                    "title": _nonempty(raw_action.get("title", raw_action.get("id")), f"surfaces[{surface_index}].actions[{action_index}].title"),
                    "order": int(raw_action.get("order", (action_index + 1) * 10)),
                    "commandId": command_id,
                    "domainAction": domain_action,
                    "statePath": state_path,
                    "argumentKey": argument_key,
                    "defaultValue": default_value,
                    "items": items,
                })
            if len({action["id"] for action in surface_actions}) != len(surface_actions):
                raise SpecError(f"surfaces[{surface_index}].action ids must be unique")

            children = [
                normalize_surface_node(child, f"surfaces[{surface_index}].children[{index}]")
                for index, child in enumerate(_expect_list(surface.get("children"), f"surfaces[{surface_index}].children"))
            ]
            if not children:
                raise SpecError(f"surfaces[{surface_index}].children must not be empty")

            chrome_header_id = ""
            if surface.get("chromeHeaderId") is not None:
                chrome_header_id = _ident(surface.get("chromeHeaderId"), f"surfaces[{surface_index}].chromeHeaderId")
                if role != "prime":
                    raise SpecError(f"surfaces[{surface_index}].chromeHeaderId is only valid for PRIME surfaces")
            if role == "prime" and len(set(placements)) > 1:
                top_headers = [node["id"] for node in children if node.get("kind") == "header"]
                if not chrome_header_id and len(top_headers) == 1:
                    chrome_header_id = top_headers[0]
                if not chrome_header_id:
                    raise SpecError(f"surfaces[{surface_index}] movable PRIME requires one canonical top-level Header child or chromeHeaderId")
                stack = list(children)
                found_header = False
                while stack:
                    node = stack.pop()
                    if node.get("id") == chrome_header_id and node.get("kind") == "header":
                        found_header = True
                        break
                    stack.extend(node.get("children", []))
                if not found_header:
                    raise SpecError(f"surfaces[{surface_index}].chromeHeaderId must reference a Header child")
            elif chrome_header_id:
                stack = list(children)
                found_header = False
                while stack:
                    node = stack.pop()
                    if node.get("id") == chrome_header_id and node.get("kind") == "header":
                        found_header = True
                        break
                    stack.extend(node.get("children", []))
                if not found_header:
                    raise SpecError(f"surfaces[{surface_index}].chromeHeaderId must reference a Header child")
            if surface_actions and not chrome_header_id:
                raise SpecError(f"surfaces[{surface_index}].actions require chromeHeaderId or one inferable top-level Header child")

            surfaces.append({
                "id": _ident(surface.get("id"), f"surfaces[{surface_index}].id"),
                "label": _nonempty(surface.get("label"), f"surfaces[{surface_index}].label"),
                "role": role,
                "presentationRole": str(surface.get("presentationRole", "inspector" if role == "prime" else "detail")),
                "presentationPurpose": purpose,
                "semanticKind": str(surface.get("semanticKind", "panel")),
                "priority": int(surface.get("priority", 70)),
                "order": int(surface.get("order", 100)),
                "collapsible": bool(surface.get("collapsible", role == "prime")),
                "fixed": fixed,
                "embedded": bool(surface.get("embedded", False)),
                "autoOpen": bool(surface.get("autoOpen", False)),
                "defaultPlacement": default_placement,
                "placements": placements,
                "sizing": str(surface.get("sizing", "fill")),
                "stateVersion": str(surface.get("stateVersion", "declarative-surface-v1")),
                "keepLeft": bool(surface.get("keepLeft", False)),
                "persistent": bool(surface.get("persistent", True)),
                "layout": _nonempty(surface.get("layout", "stack-comfortable"), f"surfaces[{surface_index}].layout"),
                "chromeHeaderId": chrome_header_id,
                "detailGeometry": detail_geometry,
                "lifecycle": lifecycle,
                "actions": surface_actions,
                "children": children,
            })
        if len({surface["id"] for surface in surfaces}) != len(surfaces):
            raise SpecError("surface ids must be unique")
        if parameters is not None and any(surface["id"] == parameters["id"] for surface in surfaces):
            raise SpecError("surface ids must not collide with the canonical parameters PRIME id")

        def normalize_curve_array_binding(raw_binding: Dict[str, Any], name: str) -> Dict[str, Any]:
            if domain_adapter is None:
                raise SpecError(f"{name} requires top-level domainAdapter")
            raw_binding = _expect_object(raw_binding, name)
            extra = sorted(set(raw_binding) - {"statePath", "pointsPath", "xKey", "yKey", "idKey", "labelKey", "colorValueKey", "directionKey", "selectAction", "selectedIdPath", "markers"})
            if extra:
                raise SpecError(f"unsupported {name} fields: {', '.join(extra)}")
            def dotted(value: Any, field_name: str) -> str:
                path = str(value or "").strip()
                if not path or not all(IDENT.fullmatch(part) for part in path.split(".")):
                    raise SpecError(f"{field_name} must be a dotted identifier path")
                return path
            normalized = {
                "statePath": dotted(raw_binding.get("statePath"), f"{name}.statePath"),
                "pointsPath": dotted(raw_binding.get("pointsPath"), f"{name}.pointsPath"),
                "xKey": _ident(raw_binding.get("xKey"), f"{name}.xKey"),
                "yKey": _ident(raw_binding.get("yKey"), f"{name}.yKey"),
                "idKey": _ident(raw_binding.get("idKey", "id"), f"{name}.idKey"),
            }
            for key in ("labelKey", "colorValueKey", "directionKey"):
                if raw_binding.get(key) is not None:
                    normalized[key] = _ident(raw_binding.get(key), f"{name}.{key}")
            if raw_binding.get("selectAction") is not None:
                normalized["selectAction"] = _ident(raw_binding.get("selectAction"), f"{name}.selectAction")
            if raw_binding.get("selectedIdPath") is not None:
                normalized["selectedIdPath"] = dotted(raw_binding.get("selectedIdPath"), f"{name}.selectedIdPath")
            if raw_binding.get("markers") is not None:
                raw_markers = _expect_object(raw_binding["markers"], f"{name}.markers")
                extra = sorted(set(raw_markers) - {"statePath", "idKey", "curveIdKey", "xKey", "yKey", "colorKey", "shapeKey", "lockedKey", "acceptedKey", "selectedIdPath", "selectAction", "staticArgs"})
                if extra:
                    raise SpecError(f"unsupported {name}.markers fields: {', '.join(extra)}")
                marker_binding = {
                    "statePath": dotted(raw_markers.get("statePath"), f"{name}.markers.statePath"),
                    "idKey": _ident(raw_markers.get("idKey", "id"), f"{name}.markers.idKey"),
                    "curveIdKey": _ident(raw_markers.get("curveIdKey", "curveId"), f"{name}.markers.curveIdKey"),
                    "xKey": _ident(raw_markers.get("xKey", "x"), f"{name}.markers.xKey"),
                    "yKey": _ident(raw_markers.get("yKey", "y"), f"{name}.markers.yKey"),
                }
                for key in ("colorKey", "shapeKey", "lockedKey", "acceptedKey"):
                    if raw_markers.get(key) is not None:
                        marker_binding[key] = _ident(raw_markers.get(key), f"{name}.markers.{key}")
                if raw_markers.get("selectedIdPath") is not None:
                    marker_binding["selectedIdPath"] = dotted(raw_markers.get("selectedIdPath"), f"{name}.markers.selectedIdPath")
                if raw_markers.get("selectAction") is not None:
                    marker_binding["selectAction"] = _ident(raw_markers.get("selectAction"), f"{name}.markers.selectAction")
                raw_static = _expect_object(raw_markers.get("staticArgs", {}), f"{name}.markers.staticArgs")
                if len(raw_static) > 8:
                    raise SpecError(f"{name}.markers.staticArgs supports at most 8 entries")
                static_args = {}
                for key, value in raw_static.items():
                    normalized_key = _ident(key, f"{name}.markers.staticArgs key")
                    if value is not None and (isinstance(value, (dict, list)) or not isinstance(value, (str, int, float, bool))):
                        raise SpecError(f"{name}.markers.staticArgs.{normalized_key} must be a scalar")
                    static_args[normalized_key] = value
                marker_binding["staticArgs"] = static_args
                normalized["markers"] = marker_binding
            return normalized

        content = []
        for index, row in enumerate(_expect_list(spec.get("content"), "content")):
            row = _expect_object(row, f"content[{index}]")
            kind = str(row.get("kind", ""))
            if kind == "note":
                extra = sorted(set(row) - {"kind", "text", "variant"})
                if extra:
                    raise SpecError(f"unsupported note fields at {index}: {', '.join(extra)}")
                note_variant = str(row.get("variant", "meta"))
                if note_variant not in NOTE_VARIANTS:
                    raise SpecError(f"content[{index}].variant is invalid")
                content.append({"kind": "note", "text": str(row.get("text", "")), "variant": note_variant})
            elif kind == "plot":
                extra = sorted(set(row) - {"kind", "id", "title", "xTitle", "yTitle", "source", "points", "plotVariant", "renderOwner", "selectionTarget", "identity", "axisSemantics", "viewport", "legend", "binding"})
                if extra:
                    raise SpecError(f"unsupported plot fields at {index}: {', '.join(extra)}")
                points = []
                for p_index, pair in enumerate(row.get("points", [])):
                    if not isinstance(pair, (list, tuple)) or len(pair) != 2:
                        raise SpecError(f"content[{index}].points[{p_index}] must be [x,y]")
                    try:
                        points.append([float(pair[0]), float(pair[1])])
                    except (TypeError, ValueError) as exc:
                        raise SpecError(f"content[{index}].points[{p_index}] must be numeric") from exc
                binding = None
                if row.get("binding") is not None:
                    if row.get("points"):
                        raise SpecError(f"content[{index}].binding may not be combined with static points")
                    binding = normalize_curve_array_binding(row["binding"], f"content[{index}].binding")
                    if str(row.get("plotVariant", "curve")) != "curve":
                        raise SpecError(f"content[{index}].binding currently supports curve plots only")
                    if str(row.get("renderOwner", "unit")) != "unit":
                        raise SpecError(f"content[{index}].binding requires renderOwner=unit")
                    if any(row.get(key) is not None for key in ("identity", "axisSemantics", "viewport", "legend")):
                        raise SpecError(f"content[{index}].binding does not yet combine with explicit interaction/link policy")
                content.append({
                    "kind": "plot",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "title": _nonempty(row.get("title"), f"content[{index}].title"),
                    "xTitle": str(row.get("xTitle", "")),
                    "yTitle": str(row.get("yTitle", "")),
                    "source": str(row.get("source") or row.get("id")),
                    "points": points,
                    "binding": binding,
                    **normalize_plot_render(row, f"content[{index}]"),
                    **normalize_plot_interaction(row, f"content[{index}]"),
                })
            elif kind == "plot-group":
                extra = sorted(set(row) - {"kind", "id", "title", "columns", "maxColumns", "minItemWidth", "density", "responsive", "plots"})
                if extra:
                    raise SpecError(f"unsupported plot-group fields at {index}: {', '.join(extra)}")
                columns = int(row.get("columns", 2))
                max_columns = int(row.get("maxColumns", max(columns, 4)))
                min_item_width = int(row.get("minItemWidth", 260))
                density = str(row.get("density", "regular"))
                if columns < 1 or columns > 12:
                    raise SpecError(f"content[{index}].columns must be in 1..12")
                if max_columns < columns or max_columns > 12:
                    raise SpecError(f"content[{index}].maxColumns must be in columns..12")
                if min_item_width < 120 or min_item_width > 1200:
                    raise SpecError(f"content[{index}].minItemWidth must be in 120..1200")
                if density not in {"compact", "regular", "comfortable"}:
                    raise SpecError(f"content[{index}].density is invalid")
                plots = []
                for p_index, plot in enumerate(_expect_list(row.get("plots"), f"content[{index}].plots")):
                    plot = _expect_object(plot, f"content[{index}].plots[{p_index}]")
                    extra = sorted(set(plot) - {"id", "title", "xTitle", "yTitle", "source", "points", "plotVariant", "renderOwner", "selectionTarget", "identity", "axisSemantics", "viewport", "legend", "placements", "defaultPlacement", "detailGeometry"})
                    if extra:
                        raise SpecError(f"unsupported plot-group plot fields at {index}:{p_index}: {', '.join(extra)}")
                    points = []
                    for point_index, pair in enumerate(plot.get("points", [])):
                        if not isinstance(pair, (list, tuple)) or len(pair) != 2:
                            raise SpecError(f"content[{index}].plots[{p_index}].points[{point_index}] must be [x,y]")
                        try:
                            points.append([float(pair[0]), float(pair[1])])
                        except (TypeError, ValueError) as exc:
                            raise SpecError(f"content[{index}].plots[{p_index}].points[{point_index}] must be numeric") from exc
                    placements = [str(value) for value in plot.get("placements", ["home", "left", "right", "bottom", "float", "global"])]
                    if not placements or any(value not in {"home", "left", "right", "bottom", "float", "global"} for value in placements):
                        raise SpecError(f"content[{index}].plots[{p_index}].placements contains an unsupported placement")
                    default_placement = str(plot.get("defaultPlacement", placements[0]))
                    if default_placement not in placements:
                        raise SpecError(f"content[{index}].plots[{p_index}].defaultPlacement must be listed in placements")
                    detail_geometry = None
                    if plot.get("detailGeometry") is not None:
                        raw_geometry = _expect_object(plot["detailGeometry"], f"content[{index}].plots[{p_index}].detailGeometry")
                        extra = sorted(set(raw_geometry) - {"contentAspectRatio", "contentMinHeightPx", "contentMaxHeightPx"})
                        if extra:
                            raise SpecError(f"unsupported plot detailGeometry fields at {index}:{p_index}: {', '.join(extra)}")
                        detail_geometry = {}
                        if raw_geometry.get("contentAspectRatio") is not None:
                            aspect = float(raw_geometry["contentAspectRatio"])
                            if aspect <= 0 or aspect > 10:
                                raise SpecError(f"content[{index}].plots[{p_index}].detailGeometry.contentAspectRatio must be in (0,10]")
                            detail_geometry["contentAspectRatio"] = aspect
                        for key in ("contentMinHeightPx", "contentMaxHeightPx"):
                            if raw_geometry.get(key) is not None:
                                value = int(raw_geometry[key])
                                if value < 40 or value > 4000:
                                    raise SpecError(f"content[{index}].plots[{p_index}].detailGeometry.{key} must be in 40..4000")
                                detail_geometry[key] = value
                        if (
                            detail_geometry.get("contentMinHeightPx") is not None
                            and detail_geometry.get("contentMaxHeightPx") is not None
                            and detail_geometry["contentMinHeightPx"] > detail_geometry["contentMaxHeightPx"]
                        ):
                            raise SpecError(f"content[{index}].plots[{p_index}].detailGeometry min height must be <= max height")
                    plots.append({
                        "id": _ident(plot.get("id"), f"content[{index}].plots[{p_index}].id"),
                        "title": _nonempty(plot.get("title"), f"content[{index}].plots[{p_index}].title"),
                        "xTitle": str(plot.get("xTitle", "")),
                        "yTitle": str(plot.get("yTitle", "")),
                        "source": str(plot.get("source") or plot.get("id")),
                        "points": points,
                        "placements": list(dict.fromkeys(placements)),
                        "defaultPlacement": default_placement,
                        "detailGeometry": detail_geometry,
                        **normalize_plot_render(plot, f"content[{index}].plots[{p_index}]"),
                        **normalize_plot_interaction(plot, f"content[{index}].plots[{p_index}]"),
                    })
                if len(plots) < 2:
                    raise SpecError(f"content[{index}].plots must contain at least two plots")
                content.append({
                    "kind": "plot-group",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "title": _nonempty(row.get("title"), f"content[{index}].title"),
                    "columns": columns,
                    "maxColumns": max_columns,
                    "minItemWidth": min_item_width,
                    "density": density,
                    "responsive": bool(row.get("responsive", True)),
                    "plots": plots,
                })
            elif kind == "parameter-form":
                extra = sorted(set(row) - {"kind", "id", "fields", "compact", "autoFit", "layoutOwner"})
                if extra:
                    raise SpecError(f"unsupported parameter-form fields at {index}: {', '.join(extra)}")
                fields = []
                allowed_types = {"text", "textarea", "formula", "number", "integer", "boolean", "select", "multiselect", "column", "columns", "color"}
                for f_index, field in enumerate(_expect_list(row.get("fields"), f"content[{index}].fields")):
                    field = _expect_object(field, f"content[{index}].fields[{f_index}]")
                    extra = sorted(set(field) - {"id", "type", "label", "required", "default", "options", "min", "max", "visibleWhen"})
                    if extra:
                        raise SpecError(f"unsupported parameter-form field keys at {index}:{f_index}: {', '.join(extra)}")
                    field_type = str(field.get("type", "text"))
                    if field_type not in allowed_types:
                        raise SpecError(f"content[{index}].fields[{f_index}].type is unsupported")
                    normalized_field = {
                        "id": _ident(field.get("id"), f"content[{index}].fields[{f_index}].id"),
                        "type": field_type,
                        "label": _nonempty(field.get("label"), f"content[{index}].fields[{f_index}].label"),
                    }
                    for key in ("required", "default", "min", "max", "visibleWhen"):
                        if key in field:
                            normalized_field[key] = field[key]
                    if "options" in field:
                        options = []
                        for o_index, option in enumerate(_expect_list(field["options"], f"content[{index}].fields[{f_index}].options")):
                            if isinstance(option, dict):
                                option = _expect_object(option, "parameter-form option")
                                extra = sorted(set(option) - {"value", "label"})
                                if extra:
                                    raise SpecError(f"unsupported parameter-form option fields at {index}:{f_index}:{o_index}: {', '.join(extra)}")
                                options.append({
                                    "value": option.get("value"),
                                    "label": _nonempty(option.get("label", option.get("value")), "parameter-form option label"),
                                })
                            else:
                                options.append({"value": option, "label": str(option)})
                        normalized_field["options"] = options
                    fields.append(normalized_field)
                if not fields:
                    raise SpecError(f"content[{index}].fields must not be empty")
                if len({field["id"] for field in fields}) != len(fields):
                    raise SpecError(f"content[{index}].field ids must be unique")
                layout_owner = str(row.get("layoutOwner", "core"))
                if layout_owner not in {"core", "host"}:
                    raise SpecError(f"content[{index}].layoutOwner must be core or host")
                content.append({
                    "kind": "parameter-form",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "fields": fields,
                    "compact": bool(row.get("compact", False)),
                    "autoFit": bool(row.get("autoFit", False)),
                    "layoutOwner": layout_owner,
                })
            elif kind == "legend":
                extra = sorted(set(row) - {"kind", "id", "variant", "items"})
                if extra:
                    raise SpecError(f"unsupported legend fields at {index}: {', '.join(extra)}")
                variant = str(row.get("variant", "strip"))
                if variant not in {"top", "bottom", "left", "right", "strip", "accepted-main"}:
                    raise SpecError(f"content[{index}].variant is invalid")
                items = []
                for l_index, item in enumerate(_expect_list(row.get("items", []), f"content[{index}].items")):
                    item = _expect_object(item, f"content[{index}].items[{l_index}]")
                    extra = sorted(set(item) - {"label", "variant"})
                    if extra:
                        raise SpecError(f"unsupported legend item fields at {index}:{l_index}: {', '.join(extra)}")
                    items.append({
                        "label": _nonempty(item.get("label"), f"content[{index}].items[{l_index}].label"),
                        "variant": str(item.get("variant", "quiet")),
                    })
                content.append({
                    "kind": "legend",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "variant": variant,
                    "items": items,
                })
            elif kind == "menu":
                extra = sorted(set(row) - {"kind", "id", "menu", "label", "order", "actionId"})
                if extra:
                    raise SpecError(f"unsupported menu fields at {index}: {', '.join(extra)}")
                action_id = _ident(row.get("actionId"), f"content[{index}].actionId")
                if action_id not in {action["id"] for action in actions}:
                    raise SpecError(f"content[{index}].actionId references unknown action: {action_id}")
                content.append({
                    "kind": "menu",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "menu": _nonempty(row.get("menu", "export"), f"content[{index}].menu"),
                    "label": _nonempty(row.get("label"), f"content[{index}].label"),
                    "order": int(row.get("order", 100)),
                    "actionId": action_id,
                })
            elif kind == "summary":
                extra = sorted(set(row) - {"kind", "id", "variant", "items"})
                if extra:
                    raise SpecError(f"unsupported summary fields at {index}: {', '.join(extra)}")
                variant = str(row.get("variant", "row"))
                if variant not in {"row", "strip"}:
                    raise SpecError(f"content[{index}].variant must be row or strip")
                items = []
                for item_index, item in enumerate(_expect_list(row.get("items", []), f"content[{index}].items")):
                    item = _expect_object(item, f"content[{index}].items[{item_index}]")
                    extra = sorted(set(item) - {"text", "variant"})
                    if extra:
                        raise SpecError(f"unsupported summary item fields at {index}:{item_index}: {', '.join(extra)}")
                    items.append({"text": str(item.get("text", "")), "variant": str(item.get("variant", ""))})
                content.append({
                    "kind": "summary",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "variant": variant,
                    "items": items,
                })
            elif kind == "empty-state":
                extra = sorted(set(row) - {"kind", "id", "text"})
                if extra:
                    raise SpecError(f"unsupported empty-state fields at {index}: {', '.join(extra)}")
                content.append({
                    "kind": "empty-state",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "text": str(row.get("text", "")),
                })
            elif kind == "list":
                extra = sorted(set(row) - {"kind", "id", "items", "emptyText"})
                if extra:
                    raise SpecError(f"unsupported list fields at {index}: {', '.join(extra)}")
                items = []
                for item_index, item in enumerate(_expect_list(row.get("items", []), f"content[{index}].items")):
                    item = _expect_object(item, f"content[{index}].items[{item_index}]")
                    extra = sorted(set(item) - {"title", "meta", "leading", "selectable", "selected"})
                    if extra:
                        raise SpecError(f"unsupported list item fields at {index}:{item_index}: {', '.join(extra)}")
                    items.append({
                        "title": str(item.get("title", "")),
                        "meta": str(item.get("meta", "")),
                        "leading": str(item.get("leading", "")),
                        "selectable": bool(item.get("selectable", False)),
                        "selected": bool(item.get("selected", False)),
                    })
                content.append({
                    "kind": "list",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "items": items,
                    "emptyText": str(row.get("emptyText", "")),
                })
            elif kind == "plot-view":
                extra = sorted(set(row) - {"kind", "id", "title", "xTitle", "yTitle", "source", "points", "placements", "defaultPlacement", "contentMinHeight", "contentMaxHeight", "selectionTarget", "identity", "axisSemantics", "viewport", "legend"})
                if extra:
                    raise SpecError(f"unsupported plot-view fields at {index}: {', '.join(extra)}")
                points = []
                for p_index, pair in enumerate(row.get("points", [])):
                    if not isinstance(pair, (list, tuple)) or len(pair) != 2:
                        raise SpecError(f"content[{index}].points[{p_index}] must be [x,y]")
                    points.append([float(pair[0]), float(pair[1])])
                placements = [str(value) for value in row.get("placements", ["home", "left", "right", "bottom", "float", "global"])]
                allowed_placements = {"home", "left", "right", "bottom", "float", "global"}
                if not placements or any(value not in allowed_placements for value in placements):
                    raise SpecError(f"content[{index}].placements contains invalid placement")
                default_placement = str(row.get("defaultPlacement", "home"))
                if default_placement not in placements:
                    raise SpecError(f"content[{index}].defaultPlacement must appear in placements")
                min_height = int(row.get("contentMinHeight", 280))
                max_height = int(row.get("contentMaxHeight", max(320, min_height)))
                if min_height < 120 or min_height > 1400 or max_height < min_height or max_height > 1800:
                    raise SpecError(f"content[{index}] plot-view height bounds are invalid")
                content.append({
                    "kind": "plot-view",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "title": _nonempty(row.get("title"), f"content[{index}].title"),
                    "xTitle": str(row.get("xTitle", "")),
                    "yTitle": str(row.get("yTitle", "")),
                    "source": str(row.get("source") or row.get("id")),
                    "points": points,
                    **normalize_plot_render(row, f"content[{index}]"),
                    "placements": placements,
                    "defaultPlacement": default_placement,
                    "contentMinHeight": min_height,
                    "contentMaxHeight": max_height,
                    **normalize_plot_interaction(row, f"content[{index}]"),
                })
            elif kind == "metrics":
                extra = sorted(set(row) - {"kind", "id", "items"})
                if extra:
                    raise SpecError(f"unsupported metrics fields at {index}: {', '.join(extra)}")
                items = []
                for m_index, item in enumerate(_expect_list(row.get("items"), f"content[{index}].items")):
                    item = _expect_object(item, f"content[{index}].items[{m_index}]")
                    extra = sorted(set(item) - {"id", "label", "value"})
                    if extra:
                        raise SpecError(f"unsupported metric fields at {index}:{m_index}: {', '.join(extra)}")
                    items.append({
                        "id": _ident(item.get("id"), f"content[{index}].items[{m_index}].id"),
                        "label": _nonempty(item.get("label"), f"content[{index}].items[{m_index}].label"),
                        "value": str(item.get("value", "—")),
                    })
                if not items:
                    raise SpecError(f"content[{index}].items must not be empty")
                if len({item["id"] for item in items}) != len(items):
                    raise SpecError(f"content[{index}].items metric ids must be unique")
                content.append({
                    "kind": "metrics",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "items": items,
                })
            elif kind == "result-split":
                extra = sorted(set(row) - {"kind", "id", "axis", "resizeTarget", "defaultSize", "min", "reserve", "reflowBelow", "plot", "table"})
                if extra:
                    raise SpecError(f"unsupported result-split fields at {index}: {', '.join(extra)}")
                axis = str(row.get("axis", "y"))
                if axis not in {"x", "y"}:
                    raise SpecError(f"content[{index}].axis must be x or y")
                resize_target = str(row.get("resizeTarget", "second"))
                if resize_target not in {"first", "second"}:
                    raise SpecError(f"content[{index}].resizeTarget must be first or second")
                default_size = int(row.get("defaultSize", 180))
                minimum = int(row.get("min", 140))
                reserve = int(row.get("reserve", 300))
                reflow_below = int(row.get("reflowBelow", 920))
                if default_size < 80 or default_size > 1600:
                    raise SpecError(f"content[{index}].defaultSize must be in 80..1600")
                if minimum < 60 or minimum > default_size:
                    raise SpecError(f"content[{index}].min must be in 60..defaultSize")
                if reserve < 120 or reserve > 2400:
                    raise SpecError(f"content[{index}].reserve must be in 120..2400")
                if reflow_below < 480 or reflow_below > 1920:
                    raise SpecError(f"content[{index}].reflowBelow must be in 480..1920")

                plot = _expect_object(row.get("plot"), f"content[{index}].plot")
                extra = sorted(set(plot) - {"id", "title", "xTitle", "yTitle", "source", "points", "plotVariant", "renderOwner", "selectionTarget", "identity", "axisSemantics", "viewport", "legend"})
                if extra:
                    raise SpecError(f"unsupported result-split plot fields at {index}: {', '.join(extra)}")
                points = []
                for point_index, pair in enumerate(plot.get("points", [])):
                    if not isinstance(pair, (list, tuple)) or len(pair) != 2:
                        raise SpecError(f"content[{index}].plot.points[{point_index}] must be [x,y]")
                    try:
                        points.append([float(pair[0]), float(pair[1])])
                    except (TypeError, ValueError) as exc:
                        raise SpecError(f"content[{index}].plot.points[{point_index}] must be numeric") from exc
                normalized_plot = {
                    "id": _ident(plot.get("id"), f"content[{index}].plot.id"),
                    "title": _nonempty(plot.get("title"), f"content[{index}].plot.title"),
                    "xTitle": str(plot.get("xTitle", "")),
                    "yTitle": str(plot.get("yTitle", "")),
                    "source": str(plot.get("source") or plot.get("id")),
                    "points": points,
                    **normalize_plot_render(plot, f"content[{index}].plot"),
                    **normalize_plot_interaction(plot, f"content[{index}].plot"),
                }

                table = _expect_object(row.get("table"), f"content[{index}].table")
                extra = sorted(set(table) - {"id", "title", "columns", "rows"})
                if extra:
                    raise SpecError(f"unsupported result-split table fields at {index}: {', '.join(extra)}")
                columns = []
                for c_index, column in enumerate(_expect_list(table.get("columns"), f"content[{index}].table.columns")):
                    column = _expect_object(column, f"content[{index}].table.columns[{c_index}]")
                    extra = sorted(set(column) - {"key", "label", "unit"})
                    if extra:
                        raise SpecError(f"unsupported result-split table column fields at {index}:{c_index}: {', '.join(extra)}")
                    normalized_column = {
                        "key": _ident(column.get("key"), f"content[{index}].table.columns[{c_index}].key"),
                        "label": _nonempty(column.get("label"), f"content[{index}].table.columns[{c_index}].label"),
                    }
                    if "unit" in column:
                        normalized_column["unit"] = str(column.get("unit", ""))
                    columns.append(normalized_column)
                if not columns:
                    raise SpecError(f"content[{index}].table.columns must not be empty")
                rows = []
                for r_index, item in enumerate(table.get("rows", [])):
                    item = _expect_object(item, f"content[{index}].table.rows[{r_index}]")
                    rows.append({str(key): value for key, value in item.items()})
                normalized_table = {
                    "id": _ident(table.get("id"), f"content[{index}].table.id"),
                    "title": _nonempty(table.get("title", "结果"), f"content[{index}].table.title"),
                    "columns": columns,
                    "rows": rows,
                }
                content.append({
                    "kind": "result-split",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "axis": axis,
                    "resizeTarget": resize_target,
                    "defaultSize": default_size,
                    "min": minimum,
                    "reserve": reserve,
                    "reflowBelow": reflow_below,
                    "plot": normalized_plot,
                    "table": normalized_table,
                })
            elif kind == "table":
                extra = sorted(set(row) - {"kind", "id", "title", "columns", "rows"})
                if extra:
                    raise SpecError(f"unsupported table fields at {index}: {', '.join(extra)}")
                columns = []
                for c_index, column in enumerate(_expect_list(row.get("columns"), f"content[{index}].columns")):
                    column = _expect_object(column, f"content[{index}].columns[{c_index}]")
                    extra = sorted(set(column) - {"key", "label", "unit"})
                    if extra:
                        raise SpecError(f"unsupported table column fields at {index}:{c_index}: {', '.join(extra)}")
                    normalized_column = {
                        "key": _ident(column.get("key"), f"content[{index}].columns[{c_index}].key"),
                        "label": _nonempty(column.get("label"), f"content[{index}].columns[{c_index}].label"),
                    }
                    if "unit" in column:
                        normalized_column["unit"] = str(column.get("unit", ""))
                    columns.append(normalized_column)
                if not columns:
                    raise SpecError(f"content[{index}].columns must not be empty")
                rows = []
                for r_index, item in enumerate(row.get("rows", [])):
                    item = _expect_object(item, f"content[{index}].rows[{r_index}]")
                    rows.append({str(key): value for key, value in item.items()})
                content.append({
                    "kind": "table",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "title": _nonempty(row.get("title"), f"content[{index}].title"),
                    "columns": columns,
                    "rows": rows,
                })
            else:
                raise SpecError(f"content[{index}].kind must be note, plot, plot-view, plot-group, parameter-form, legend, menu, summary, empty-state, list, metrics, result-split or table")
        if not content:
            raise SpecError("content must not be empty")

        return {
            "schema": SCHEMA,
            "plugin": normalized_plugin,
            "page": normalized_page,
            "workspace": normalized_workspace,
            "host": normalized_host,
            "data": normalized_data,
            "actions": actions,
            "parameters": parameters,
            "interaction": normalized_interaction,
            "content": content,
            "surfaces": surfaces,
            "domainAdapter": domain_adapter,
        }

    def add_portable_task(
        self,
        task_id: str,
        function: Callable[..., Any] | str,
        *,
        action_id: str,
        parameter_map: Dict[str, str] | None = None,
        input_bindings: Dict[str, Dict[str, Any]] | None = None,
        result_plot: str | None = None,
        result_key: str = "points",
        result_table: str | None = None,
        result_rows_key: str = "rows",
        publish_table: Dict[str, Any] | None = None,
        result_plots: List[Dict[str, str]] | None = None,
        result_tables: List[Dict[str, str]] | None = None,
        result_metrics: List[Dict[str, str]] | None = None,
        publish_tables: List[Dict[str, Any]] | None = None,
        dynamic_publish_tables: List[Dict[str, Any]] | None = None,
        dynamic_table_plots: List[Dict[str, Any]] | None = None,
        host_effects: List[Dict[str, Any]] | None = None,
        domain_command: Dict[str, Any] | None = None,
        success_status: str = "任务完成",
        function_name: str | None = None,
    ) -> "PluginBuilder":
        """Lower Python once, then register through the shared compiled-task path."""
        compiled = compile_portable_task(task_id, function, function_name=function_name)
        return self.add_compiled_task(
            compiled,
            action_id=action_id,
            parameter_map=parameter_map,
            input_bindings=input_bindings,
            result_plot=result_plot,
            result_key=result_key,
            result_table=result_table,
            result_rows_key=result_rows_key,
            publish_table=publish_table,
            result_plots=result_plots,
            result_tables=result_tables,
            result_metrics=result_metrics,
            publish_tables=publish_tables,
            dynamic_publish_tables=dynamic_publish_tables,
            dynamic_table_plots=dynamic_table_plots,
            host_effects=host_effects,
            domain_command=domain_command,
            success_status=success_status,
        )

    def add_compiled_task(
        self,
        compiled: CompiledPortableTask,
        *,
        action_id: str,
        parameter_map: Dict[str, str] | None = None,
        input_bindings: Dict[str, Dict[str, Any]] | None = None,
        result_plot: str | None = None,
        result_key: str = "points",
        result_table: str | None = None,
        result_rows_key: str = "rows",
        publish_table: Dict[str, Any] | None = None,
        result_plots: List[Dict[str, str]] | None = None,
        result_tables: List[Dict[str, str]] | None = None,
        result_metrics: List[Dict[str, str]] | None = None,
        publish_tables: List[Dict[str, Any]] | None = None,
        dynamic_publish_tables: List[Dict[str, Any]] | None = None,
        dynamic_table_plots: List[Dict[str, Any]] | None = None,
        host_effects: List[Dict[str, Any]] | None = None,
        domain_command: Dict[str, Any] | None = None,
        success_status: str = "任务完成",
    ) -> "PluginBuilder":
        """Register an authoring-time compiled JavaScript Task through one production path."""
        if not isinstance(compiled, CompiledPortableTask):
            raise SpecError("compiled task must be a CompiledPortableTask")
        action_lookup = {row["id"]: row for row in self.spec["actions"]}
        action_ids = set(action_lookup)
        if action_id not in action_ids:
            raise SpecError(f"portable task action_id not found: {action_id}")
        if parameter_map is not None and input_bindings is not None:
            raise SpecError("use parameter_map or input_bindings, not both")

        fields = {
            row["id"]: row
            for row in (self.spec.get("parameters") or {}).get("fields", [])
        }
        if input_bindings is None:
            mapping = dict(parameter_map or {name: name for name in compiled.parameters})
            raw_bindings: Dict[str, Dict[str, Any]] = {
                argument: {"kind": "parameter", "field": field_id}
                for argument, field_id in mapping.items()
            }
        else:
            raw_bindings = dict(input_bindings)

        missing_args = [name for name in compiled.parameters if name not in raw_bindings]
        extra_args = [name for name in raw_bindings if name not in compiled.parameters]
        if missing_args or extra_args:
            raise SpecError(
                "portable task input bindings must match function arguments exactly; "
                f"missing={missing_args}, extra={extra_args}"
            )

        bindings: Dict[str, Dict[str, Any]] = {}
        for argument in compiled.parameters:
            binding = _expect_object(raw_bindings[argument], f"input_bindings[{argument}]")
            kind = str(binding.get("kind", "parameter"))
            if kind == "parameter":
                extra = sorted(set(binding) - {"kind", "field"})
                if extra:
                    raise SpecError(f"unsupported parameter binding fields for {argument}: {', '.join(extra)}")
                field_id = _ident(binding.get("field"), f"input_bindings[{argument}].field")
                if field_id not in fields:
                    raise SpecError(f"portable task parameter {argument} references unknown field {field_id}")
                bindings[argument] = {"kind": "parameter", "field": field_id}
                continue
            if kind not in {"artifact-column", "artifact-table"}:
                raise SpecError(f"input_bindings[{argument}].kind must be parameter, artifact-column or artifact-table")

            allowed_binding_fields = {"kind", "source", "maxRows", "sourceField", "sourceHint"}
            if kind == "artifact-column":
                allowed_binding_fields.add("column")
            else:
                allowed_binding_fields.add("maxColumns")
            extra = sorted(set(binding) - allowed_binding_fields)
            if extra:
                raise SpecError(f"unsupported artifact binding fields for {argument}: {', '.join(extra)}")
            source = _expect_object(binding.get("source", {}), f"input_bindings[{argument}].source")
            extra = sorted(set(source) - {"semanticType", "kind", "index", "includeExcluded"})
            if extra:
                raise SpecError(f"unsupported source selector fields for {argument}: {', '.join(extra)}")
            source_index = int(source.get("index", 0))
            if source_index < 0:
                raise SpecError(f"input_bindings[{argument}].source.index must be >= 0")
            normalized_source = {
                "semanticType": str(source.get("semanticType", "")),
                "kind": str(source.get("kind", "data.table")),
                "index": source_index,
                "includeExcluded": bool(source.get("includeExcluded", False)),
            }
            max_rows = int(binding.get("maxRows", 65536))
            if max_rows < 1 or max_rows > 65536:
                raise SpecError(f"input_bindings[{argument}].maxRows must be in 1..65536")
            source_field = str(binding.get("sourceField", "")).strip()
            source_hint = str(binding.get("sourceHint", "")).strip()
            if source_field:
                source_field = _ident(source_field, f"input_bindings[{argument}].sourceField")
                source_field_spec = fields.get(source_field)
                if source_field_spec is None:
                    raise SpecError(f"input_bindings[{argument}].sourceField references unknown field {source_field}")
                if source_field_spec.get("type") != "select":
                    raise SpecError(f"input_bindings[{argument}].sourceField must reference a select field")
            if kind == "artifact-table":
                max_columns = int(binding.get("maxColumns", 256))
                if max_columns < 1 or max_columns > 1024:
                    raise SpecError(f"input_bindings[{argument}].maxColumns must be in 1..1024")
                bindings[argument] = {
                    "kind": "artifact-table",
                    "source": normalized_source,
                    "maxRows": max_rows,
                    "maxColumns": max_columns,
                    "sourceField": source_field,
                    "sourceHint": source_hint,
                }
                continue
            column = _expect_object(binding.get("column"), f"input_bindings[{argument}].column")
            allowed_selectors = {"id", "key", "name", "role", "quantity", "dimension"}
            extra = sorted(set(column) - allowed_selectors)
            if extra:
                raise SpecError(f"unsupported column selector fields for {argument}: {', '.join(extra)}")
            normalized_column = {
                str(key): _nonempty(value, f"input_bindings[{argument}].column.{key}")
                for key, value in column.items()
            }
            if not normalized_column:
                raise SpecError(f"input_bindings[{argument}].column must select at least one metadata field")
            bindings[argument] = {
                "kind": "artifact-column",
                "source": normalized_source,
                "column": normalized_column,
                "maxRows": max_rows,
                "sourceField": source_field,
                "sourceHint": source_hint,
            }

        plot_lookup: Dict[str, Dict[str, Any]] = {}
        table_lookup: Dict[str, Dict[str, Any]] = {}
        metric_lookup: Dict[str, Dict[str, Any]] = {}
        for content_row in self.spec["content"]:
            if content_row["kind"] in {"plot", "plot-view"}:
                plot_lookup[content_row["id"]] = content_row
            elif content_row["kind"] == "plot-group":
                for plot in content_row["plots"]:
                    plot_lookup[plot["id"]] = plot
            elif content_row["kind"] == "result-split":
                plot_lookup[content_row["plot"]["id"]] = content_row["plot"]
                table_lookup[content_row["table"]["id"]] = content_row["table"]
            elif content_row["kind"] == "table":
                table_lookup[content_row["id"]] = content_row
            elif content_row["kind"] == "metrics":
                for metric in content_row["items"]:
                    metric_lookup[metric["id"]] = metric

        raw_dynamic_table_plots = list(dynamic_table_plots or [])
        raw_host_effects = list(host_effects or [])

        simple_plot_ids = {row["id"] for row in self.spec["content"] if row["kind"] == "plot"}
        normalized_dynamic_table_plots: List[Dict[str, Any]] = []
        for index, projection in enumerate(raw_dynamic_table_plots):
            projection = _expect_object(projection, f"dynamic_table_plots[{index}]")
            extra = sorted(set(projection) - {"id", "resultPath", "x", "y"})
            if extra:
                raise SpecError(f"unsupported dynamic_table_plots[{index}] fields: {', '.join(extra)}")
            plot_id = _ident(projection.get("id"), f"dynamic_table_plots[{index}].id")
            if plot_id not in simple_plot_ids:
                raise SpecError(f"dynamic_table_plots[{index}].id must target a top-level Unit plot")
            result_path = _nonempty(projection.get("resultPath"), f"dynamic_table_plots[{index}].resultPath")
            if not all(IDENT.fullmatch(part) for part in result_path.split(".")):
                raise SpecError(f"dynamic_table_plots[{index}].resultPath must be a dotted identifier path")
            def normalize_column_selector(value: Any, name: str) -> Any:
                if value is None or isinstance(value, (str, int)):
                    return value
                if isinstance(value, list) and all(isinstance(item, (str, int)) for item in value):
                    return list(value)
                raise SpecError(f"{name} must be a column name/index or a list of column names/indices")
            normalized_dynamic_table_plots.append({
                "id": plot_id,
                "resultPath": result_path,
                "x": normalize_column_selector(projection.get("x"), f"dynamic_table_plots[{index}].x"),
                "y": normalize_column_selector(projection.get("y"), f"dynamic_table_plots[{index}].y"),
            })
        if len({row["id"] for row in normalized_dynamic_table_plots}) != len(normalized_dynamic_table_plots):
            raise SpecError("dynamic_table_plots must target unique plot ids")

        normalized_host_effects: List[Dict[str, Any]] = []
        for index, effect in enumerate(raw_host_effects):
            effect = _expect_object(effect, f"host_effects[{index}]")
            kind = str(effect.get("kind", ""))
            if kind != "clipboard-table":
                raise SpecError(f"host_effects[{index}].kind currently supports only clipboard-table")
            extra = sorted(set(effect) - {"kind", "resultPath", "index", "header", "sep"})
            if extra:
                raise SpecError(f"unsupported host_effects[{index}] fields: {', '.join(extra)}")
            result_path = _nonempty(effect.get("resultPath"), f"host_effects[{index}].resultPath")
            if not all(IDENT.fullmatch(part) for part in result_path.split(".")):
                raise SpecError(f"host_effects[{index}].resultPath must be a dotted identifier path")
            sep = str(effect.get("sep", "\t"))
            if not sep:
                raise SpecError(f"host_effects[{index}].sep must not be empty")
            normalized_host_effects.append({
                "kind": kind,
                "resultPath": result_path,
                "index": bool(effect.get("index", True)),
                "header": bool(effect.get("header", True)),
                "sep": sep,
            })

        normalized_result_plots: List[Dict[str, str]] = []
        if result_plot is not None:
            normalized_result_plots.append({"id": result_plot, "key": str(result_key)})
        for index, projection in enumerate(result_plots or []):
            projection = _expect_object(projection, f"result_plots[{index}]")
            extra = sorted(set(projection) - {"id", "key"})
            if extra:
                raise SpecError(f"unsupported result_plots fields at {index}: {', '.join(extra)}")
            normalized_result_plots.append({
                "id": _ident(projection.get("id"), f"result_plots[{index}].id"),
                "key": _ident(projection.get("key"), f"result_plots[{index}].key"),
            })
        for projection in normalized_result_plots:
            if projection["id"] not in plot_lookup:
                raise SpecError(f"portable task result plot not found: {projection['id']}")
            if plot_lookup[projection["id"]].get("renderOwner", "unit") != "unit":
                raise SpecError(f"portable task result plot {projection['id']} is runtime-owned and cannot receive generated curve projection")
            if not IDENT.fullmatch(str(projection["key"]).replace("-", "_")):
                raise SpecError(f"invalid portable task result plot key: {projection['key']}")
        if len({row["id"] for row in normalized_result_plots}) != len(normalized_result_plots):
            raise SpecError("portable task result plots must target unique plot ids")

        normalized_result_tables: List[Dict[str, str]] = []
        if result_table is not None:
            normalized_result_tables.append({"id": result_table, "key": str(result_rows_key)})
        for index, projection in enumerate(result_tables or []):
            projection = _expect_object(projection, f"result_tables[{index}]")
            extra = sorted(set(projection) - {"id", "key"})
            if extra:
                raise SpecError(f"unsupported result_tables fields at {index}: {', '.join(extra)}")
            normalized_result_tables.append({
                "id": _ident(projection.get("id"), f"result_tables[{index}].id"),
                "key": _ident(projection.get("key"), f"result_tables[{index}].key"),
            })
        for projection in normalized_result_tables:
            if projection["id"] not in table_lookup:
                raise SpecError(f"portable task result table not found: {projection['id']}")
            if not IDENT.fullmatch(str(projection["key"]).replace("-", "_")):
                raise SpecError(f"invalid portable task result table key: {projection['key']}")
        if len({row["id"] for row in normalized_result_tables}) != len(normalized_result_tables):
            raise SpecError("portable task result tables must target unique table ids")

        normalized_result_metrics: List[Dict[str, str]] = []
        for index, projection in enumerate(result_metrics or []):
            projection = _expect_object(projection, f"result_metrics[{index}]")
            extra = sorted(set(projection) - {"id", "key"})
            if extra:
                raise SpecError(f"unsupported result_metrics fields at {index}: {', '.join(extra)}")
            normalized_result_metrics.append({
                "id": _ident(projection.get("id"), f"result_metrics[{index}].id"),
                "key": _ident(projection.get("key"), f"result_metrics[{index}].key"),
            })
        for projection in normalized_result_metrics:
            if projection["id"] not in metric_lookup:
                raise SpecError(f"portable task result metric not found: {projection['id']}")
        if len({row["id"] for row in normalized_result_metrics}) != len(normalized_result_metrics):
            raise SpecError("portable task result metrics must target unique metric ids")

        def normalize_publish(row: Dict[str, Any], name: str) -> Dict[str, Any]:
            row = _expect_object(row, name)
            extra = sorted(set(row) - {"id", "name", "semanticType", "columns"})
            if extra:
                raise SpecError(f"unsupported {name} fields: {', '.join(extra)}")
            semantic_type = _nonempty(row.get("semanticType"), f"{name}.semanticType")
            if semantic_type not in self.spec["data"].get("produces", []):
                raise SpecError(f"{name}.semanticType must be declared in data.produces")
            columns = []
            for index, column in enumerate(_expect_list(row.get("columns"), f"{name}.columns")):
                column = _expect_object(column, f"{name}.columns[{index}]")
                extra = sorted(set(column) - {"key", "name", "unit", "role", "resultKey"})
                if extra:
                    raise SpecError(f"unsupported {name} column fields at {index}: {', '.join(extra)}")
                columns.append({
                    "key": _ident(column.get("key"), f"{name}.columns[{index}].key"),
                    "name": _nonempty(column.get("name", column.get("key")), f"{name}.columns[{index}].name"),
                    "unit": str(column.get("unit", "")),
                    "role": str(column.get("role", "")),
                    "resultKey": _ident(column.get("resultKey", column.get("key")), f"{name}.columns[{index}].resultKey"),
                })
            if not columns:
                raise SpecError(f"{name}.columns must not be empty")
            return {
                "id": _ident(row.get("id"), f"{name}.id"),
                "name": _nonempty(row.get("name"), f"{name}.name"),
                "semanticType": semantic_type,
                "columns": columns,
            }

        normalized_publish_tables: List[Dict[str, Any]] = []
        if publish_table is not None:
            normalized_publish_tables.append(normalize_publish(publish_table, "publish_table"))
        for index, row in enumerate(publish_tables or []):
            normalized_publish_tables.append(normalize_publish(row, f"publish_tables[{index}]"))
        if len({row["id"] for row in normalized_publish_tables}) != len(normalized_publish_tables):
            raise SpecError("portable task published Artifact ids must be unique")

        normalized_dynamic_publish_tables: List[Dict[str, Any]] = []
        for index, row in enumerate(dynamic_publish_tables or []):
            row = _expect_object(row, f"dynamic_publish_tables[{index}]")
            extra = sorted(set(row) - {"id", "name", "semanticType", "resultPath", "maxRows", "maxColumns"})
            if extra:
                raise SpecError(f"unsupported dynamic_publish_tables[{index}] fields: {', '.join(extra)}")
            semantic_type = _nonempty(row.get("semanticType"), f"dynamic_publish_tables[{index}].semanticType")
            if semantic_type not in self.spec["data"].get("produces", []):
                raise SpecError(f"dynamic_publish_tables[{index}].semanticType must be declared in data.produces")
            result_path = _nonempty(row.get("resultPath"), f"dynamic_publish_tables[{index}].resultPath")
            if not all(IDENT.fullmatch(part) for part in result_path.split(".")):
                raise SpecError(f"dynamic_publish_tables[{index}].resultPath must be a dotted identifier path")
            max_rows = int(row.get("maxRows", 65536))
            max_columns = int(row.get("maxColumns", 1024))
            if max_rows < 1 or max_rows > 65536:
                raise SpecError(f"dynamic_publish_tables[{index}].maxRows must be in 1..65536")
            if max_columns < 1 or max_columns > 1024:
                raise SpecError(f"dynamic_publish_tables[{index}].maxColumns must be in 1..1024")
            normalized_dynamic_publish_tables.append({
                "id": _ident(row.get("id"), f"dynamic_publish_tables[{index}].id"),
                "name": _nonempty(row.get("name"), f"dynamic_publish_tables[{index}].name"),
                "semanticType": semantic_type,
                "resultPath": result_path,
                "maxRows": max_rows,
                "maxColumns": max_columns,
            })
        if len({row["id"] for row in normalized_dynamic_publish_tables}) != len(normalized_dynamic_publish_tables):
            raise SpecError("dynamic published Artifact ids must be unique")

        normalized_domain_command = None
        if domain_command is not None:
            raw_command = _expect_object(domain_command, "domain_command")
            extra = sorted(set(raw_command) - {"id", "domain", "version", "title", "description", "replayable", "destructive", "algorithm"})
            if extra:
                raise SpecError(f"unsupported domain_command fields: {', '.join(extra)}")
            command_version = _nonempty(raw_command.get("version", "1.0.0"), "domain_command.version")
            if not SEMVER.fullmatch(command_version):
                raise SpecError("domain_command.version must be semver")
            algorithm = _expect_object(raw_command.get("algorithm", {}), "domain_command.algorithm")
            extra = sorted(set(algorithm) - {"category", "id", "version", "provider"})
            if extra:
                raise SpecError(f"unsupported domain_command.algorithm fields: {', '.join(extra)}")
            algorithm_version = _nonempty(algorithm.get("version"), "domain_command.algorithm.version")
            if algorithm_version.lower() in {"latest", "*", "current"}:
                raise SpecError("domain_command.algorithm.version must be exact")
            normalized_domain_command = {
                "id": _ident(raw_command.get("id", compiled.task_id), "domain_command.id"),
                "domain": _nonempty(raw_command.get("domain"), "domain_command.domain"),
                "version": command_version,
                "title": _nonempty(raw_command.get("title", action_lookup.get(action_id, {}).get("label", compiled.task_id)), "domain_command.title"),
                "description": str(raw_command.get("description", "")),
                "replayable": bool(raw_command.get("replayable", True)),
                "destructive": bool(raw_command.get("destructive", False)),
                "algorithm": {
                    "category": str(algorithm.get("category", "generated.task")),
                    "id": _nonempty(algorithm.get("id", compiled.task_id), "domain_command.algorithm.id"),
                    "version": algorithm_version,
                    "provider": str(algorithm.get("provider", "")),
                },
            }
            if not normalized_publish_tables and normalized_domain_command["replayable"]:
                # Replay is still valid for read-only/view-only Tasks, but an analysis
                # command that declares produced semantic types should expose its
                # concrete Artifact outputs to Core history.
                if self.spec["data"].get("produces"):
                    raise SpecError("replayable domain_command with data.produces requires publish_table(s)")

        for projection in normalized_result_plots:
            plot = plot_lookup[projection["id"]]
            identity = plot.get("identity")
            if identity is None:
                continue
            input_name = identity["input"]
            binding = bindings.get(input_name)
            if binding is None:
                raise SpecError(f"plot {projection['id']} identity.input must reference a task input")
            if binding["kind"] != "artifact-column":
                raise SpecError(f"plot {projection['id']} identity.input must reference an artifact-column input")

        if any(row["compiled"].task_id == compiled.task_id for row in self._portable_tasks):
            raise SpecError(f"duplicate portable task id: {compiled.task_id}")
        if any(row["action_id"] == action_id for row in self._portable_tasks):
            raise SpecError(f"action already bound to a portable task: {action_id}")

        if normalized_domain_command is not None and any(
            row.get("domain_command", {}).get("id") == normalized_domain_command["id"]
            for row in self._portable_tasks
            if row.get("domain_command")
        ):
            raise SpecError(f"duplicate generated domain command id: {normalized_domain_command['id']}")

        self._portable_tasks.append({
            "compiled": compiled,
            "action_id": action_id,
            "input_bindings": bindings,
            "result_plots": normalized_result_plots,
            "result_tables": normalized_result_tables,
            "result_metrics": normalized_result_metrics,
            "publish_tables": normalized_publish_tables,
            "dynamic_publish_tables": normalized_dynamic_publish_tables,
            "dynamic_table_plots": normalized_dynamic_table_plots,
            "host_effects": normalized_host_effects,
            "domain_command": normalized_domain_command,
            "success_status": str(success_status),
        })
        return self

    def _task_for_action(self, action_id: str) -> dict[str, Any] | None:
        return next((row for row in self._portable_tasks if row["action_id"] == action_id), None)

    def _field_read_expr(self, field_id: str) -> str:
        parameters = self.spec.get("parameters") or {}
        field = next(row for row in parameters.get("fields", []) if row["id"] == field_id)
        name = _var(field_id)
        if field["type"] == "checkbox":
            return f"Boolean({name}.input?.checked)"
        raw = f"{name}.control?.value"
        if field["type"] == "number":
            return f"Number({raw}??0)"
        return f"String({raw}??'')"

    def _task_handler_name(self, task_id: str) -> str:
        return "run_task_" + re.sub(r"[^A-Za-z0-9_]", "_", task_id)

    def _source_picker_source(self) -> List[str]:
        pickers: Dict[str, Dict[str, Any]] = {}
        for task in self._portable_tasks:
            for binding in task["input_bindings"].values():
                field_id = str(binding.get("sourceField", ""))
                if not field_id:
                    continue
                source = binding["source"]
                row = {
                    "field": field_id,
                    "hint": str(binding.get("sourceHint", "")),
                    "source": source,
                }
                previous = pickers.get(field_id)
                if previous is not None and previous != row:
                    raise SpecError(f"sourceField {field_id} cannot own conflicting source selectors")
                pickers[field_id] = row
        lines: List[str] = []
        for field_id, row in pickers.items():
            base = _var(field_id)
            token = re.sub(r"[^A-Za-z0-9_]", "_", field_id)
            source = row["source"]
            hint = row["hint"]
            lines += [
                f"    const refresh_source_picker_{token}=()=>{{",
                "      const rows=ctx.data.sources.list().filter(row=>"
                + ("true" if source["includeExcluded"] else "!row?.excluded")
                + f"&&(!{_js(source['semanticType'])}||String(row?.semanticType||'')==={_js(source['semanticType'])})"
                + f"&&(!{_js(source['kind'])}||String(row?.kind||'')==={_js(source['kind'])}));",
                f"      const options=[{{value:'',label:'请选择数据源'}},...rows.map(row=>({{value:String(row.artifactId||''),label:String(row.name||row.sourceName||row.path||row.sourcePath||row.artifactId||'数据源')}}))];",
                f"      let preferred=String({base}.control?.value||'');",
                f"      if(preferred&&!rows.some(row=>String(row.artifactId||'')===preferred))preferred='';",
            ]
            if hint:
                lines += [
                    f"      if(!preferred){{const hint={_js(hint)}.replaceAll('\\\\','/').toLowerCase(),baseName=hint.split('/').pop();const matches=rows.filter(row=>[row.name,row.sourceName,row.path,row.sourcePath].some(value=>{{const text=String(value||'').replaceAll('\\\\','/').toLowerCase(),name=text.split('/').pop();return text===hint||name===baseName;}}));if(matches.length===1)preferred=String(matches[0].artifactId||'');}}",
                ]
            lines += [
                "      if(!preferred&&rows.length===1)preferred=String(rows[0].artifactId||'');",
                f"      {base}.setOptions(options,{{value:preferred,preserve:true}});",
                "      return rows;",
                "    };",
                f"    refresh_source_picker_{token}();",
            ]
        return lines

    def _task_handlers_source(self) -> List[str]:
        lines: List[str] = []
        action_lookup = {row["id"]: row for row in self.spec["actions"]}
        table_lookup: Dict[str, Dict[str, Any]] = {}
        plot_lookup: Dict[str, Dict[str, Any]] = {}
        for content_row in self.spec["content"]:
            if content_row["kind"] in {"plot", "plot-view"}:
                plot_lookup[content_row["id"]] = content_row
            elif content_row["kind"] == "plot-group":
                for plot in content_row["plots"]:
                    plot_lookup[plot["id"]] = plot
            elif content_row["kind"] == "result-split":
                plot_lookup[content_row["plot"]["id"]] = content_row["plot"]
                table_lookup[content_row["table"]["id"]] = content_row["table"]
            elif content_row["kind"] == "table":
                table_lookup[content_row["id"]] = content_row

        for row in self._portable_tasks:
            compiled: CompiledPortableTask = row["compiled"]
            handler = self._task_handler_name(compiled.task_id)
            action = action_lookup[row["action_id"]]
            lines += [
                f"    async function {handler}(__dkdsCommandArgs=null){{",
                f"      ctx.status.set({_js(action['statusMessage'])});",
                "      try{",
                "        const __dkdsCanonical=(__dkdsCommandArgs&&typeof __dkdsCommandArgs==='object')?__dkdsCommandArgs:null;",
                "        const __dkdsPayload={};",
                "        const __dkdsParameters={};",
                "        const __dkdsSourceIds=[];",
                "        const __dkdsPublishedIds=[];",
            ]
            for argument, binding in row["input_bindings"].items():
                if binding["kind"] == "parameter":
                    field_id = binding["field"]
                    expression = self._field_read_expr(field_id)
                    lines += [
                        f"        __dkdsPayload[{_js(argument)}]=(__dkdsCanonical?.parameters&&Object.prototype.hasOwnProperty.call(__dkdsCanonical.parameters,{_js(field_id)}))?__dkdsCanonical.parameters[{_js(field_id)}]:{expression};",
                        f"        __dkdsParameters[{_js(field_id)}]=__dkdsPayload[{_js(argument)}];",
                    ]
                    continue
                source = binding["source"]
                max_rows = binding["maxRows"]
                token = re.sub(r"[^A-Za-z0-9_]", "_", argument)
                if binding.get("sourceField"):
                    picker_token = re.sub(r"[^A-Za-z0-9_]", "_", binding["sourceField"])
                    lines.append(f"        refresh_source_picker_{picker_token}();")
                lines += [
                    f"        const __dkdsSources_{token}=ctx.data.sources.list().filter(row=>"
                    + ("true" if source["includeExcluded"] else "!row?.excluded")
                    + f"&&(!{_js(source['semanticType'])}||String(row?.semanticType||'')==={_js(source['semanticType'])})"
                    + f"&&(!{_js(source['kind'])}||String(row?.kind||'')==={_js(source['kind'])}));",
                    f"        const __dkdsFieldSource_{token}=" + (f"String({_var(binding['sourceField'])}.control?.value||'');" if binding.get("sourceField") else "'';"),
                    f"        const __dkdsExplicitSource_{token}=String(__dkdsCanonical?.sources?.[{_js(argument)}]||__dkdsFieldSource_{token}||'');",
                    f"        const __dkdsSource_{token}=__dkdsExplicitSource_{token}?__dkdsSources_{token}.find(row=>String(row?.artifactId||'')===__dkdsExplicitSource_{token}):" + ("null;" if binding.get("sourceField") else f"__dkdsSources_{token}[{source['index']}];"),
                    f"        if(!__dkdsSource_{token}?.artifactId)throw new Error({_js('No scoped source matches artifact binding for '+argument)});",
                    f"        const __dkdsColumns_{token}=ctx.data.artifacts.columnMetadata(__dkdsSource_{token}.artifactId)||[];",
                ]
                if binding["kind"] == "artifact-table":
                    max_columns = binding["maxColumns"]
                    lines += [
                        f"        if(__dkdsColumns_{token}.length>{max_columns})throw new Error({_js('Artifact table '+argument+' exceeds declared maxColumns '+str(max_columns))});",
                        f"        const __dkdsTableColumns_{token}=[];",
                        f"        let __dkdsRowCount_{token}=0;",
                        f"        for(const __dkdsColumnMeta_{token} of __dkdsColumns_{token}){{",
                        f"          const __dkdsLength_{token}=Number(__dkdsColumnMeta_{token}.length||0);",
                        f"          if(__dkdsLength_{token}>{max_rows})throw new Error({_js('Artifact table '+argument+' column exceeds declared maxRows '+str(max_rows))});",
                        f"          const __dkdsRange_{token}=__dkdsLength_{token}>0?ctx.data.artifacts.readColumnRange(__dkdsSource_{token}.artifactId,__dkdsColumnMeta_{token}.id,{{start:0,limit:__dkdsLength_{token}}}):null;",
                        f"          if(__dkdsLength_{token}>0&&!__dkdsRange_{token})throw new Error({_js('Unable to read bounded Artifact table column for '+argument)});",
                        f"          const __dkdsValues_{token}=__dkdsRange_{token}?Array.from(__dkdsRange_{token}.values||[]):[];",
                        f"          __dkdsRowCount_{token}=Math.max(__dkdsRowCount_{token},__dkdsValues_{token}.length);",
                        f"          __dkdsTableColumns_{token}.push({{id:String(__dkdsColumnMeta_{token}.id||''),key:String(__dkdsColumnMeta_{token}.key||''),name:String(__dkdsColumnMeta_{token}.name||''),unit:String(__dkdsColumnMeta_{token}.unit||''),role:String(__dkdsColumnMeta_{token}.role||''),quantity:String(__dkdsColumnMeta_{token}.quantity||''),dimension:String(__dkdsColumnMeta_{token}.dimension||''),dtype:String(__dkdsColumnMeta_{token}.dtype||''),values:__dkdsValues_{token}}});",
                        f"        }}",
                        f"        __dkdsPayload[{_js(argument)}]={{kind:'data.table',artifactId:String(__dkdsSource_{token}.artifactId),columns:__dkdsTableColumns_{token},rowCount:__dkdsRowCount_{token}}};",
                        f"        if(!__dkdsSourceIds.includes(String(__dkdsSource_{token}.artifactId)))__dkdsSourceIds.push(String(__dkdsSource_{token}.artifactId));",
                    ]
                    continue
                column = binding["column"]
                lines += [
                    f"        const __dkdsMatches_{token}=__dkdsColumns_{token}.filter(column=>Object.entries({_js(column)}).every(([key,value])=>String(column?.[key]??'')===String(value)));",
                    f"        if(__dkdsMatches_{token}.length!==1)throw new Error({_js('Artifact column binding for '+argument+' must resolve exactly one column')});",
                    f"        const __dkdsColumn_{token}=__dkdsMatches_{token}[0];",
                    f"        if(Number(__dkdsColumn_{token}.length||0)>{max_rows})throw new Error({_js('Artifact column '+argument+' exceeds declared maxRows '+str(max_rows))});",
                    f"        const __dkdsRange_{token}=Number(__dkdsColumn_{token}.length||0)>0?ctx.data.artifacts.readColumnRange(__dkdsSource_{token}.artifactId,__dkdsColumn_{token}.id,{{start:0,limit:Number(__dkdsColumn_{token}.length)}}):null;",
                    f"        if(Number(__dkdsColumn_{token}.length||0)>0&&!__dkdsRange_{token})throw new Error({_js('Unable to read bounded Artifact column for '+argument)});",
                    f"        __dkdsPayload[{_js(argument)}]=__dkdsRange_{token}?Array.from(__dkdsRange_{token}.values||[]):[];",
                    f"        if(!__dkdsSourceIds.includes(String(__dkdsSource_{token}.artifactId)))__dkdsSourceIds.push(String(__dkdsSource_{token}.artifactId));",
                ]
                for projection in row["result_plots"]:
                    plot = plot_lookup[projection["id"]]
                    identity = plot.get("identity")
                    if not identity or identity["input"] != argument:
                        continue
                    base = _var(projection["id"])
                    lines += [
                        f"        {base}_artifact_id=String(__dkdsSource_{token}.artifactId);",
                        f"        {base}_series_id=String(__dkdsColumn_{token}.id||__dkdsColumn_{token}.key||'');",
                        f"        {base}_artifact_revision=Number(__dkdsColumn_{token}.artifactRevision??__dkdsSource_{token}.artifactRevision??0)||0;",
                    ]
            lines += [
                f"        const handle=ctx.tasks.submit({_js(compiled.task_id)},__dkdsPayload,{{key:{_js('generated-'+compiled.task_id)},latest:true}});",
                "        const result=await handle.promise;",
            ]
            for projection_index, projection in enumerate(row.get("dynamic_table_plots", [])):
                base = _var(projection["id"])
                token = f"__dkdsPlotTable_{projection_index}"
                columns = f"__dkdsPlotColumns_{projection_index}"
                resolver = f"__dkdsResolvePlotColumn_{projection_index}"
                x_column = f"__dkdsPlotXColumn_{projection_index}"
                x_values = f"__dkdsPlotXValues_{projection_index}"
                y_selectors = f"__dkdsPlotYSelectors_{projection_index}"
                y_columns = f"__dkdsPlotYColumns_{projection_index}"
                path_expr = _js(projection["resultPath"].split("."))
                x_selector = _js(projection.get("x"))
                y_selector = _js(projection.get("y"))
                lines += [
                    f"        const {token}={path_expr}.reduce((value,key)=>value?.[key],result);",
                    f"        if(!{token}||{token}.kind!=='data.table'||!Array.isArray({token}.columns))throw new Error({_js('Generated plot source '+projection['resultPath']+' must be a data.table snapshot')});",
                    f"        const {columns}={token}.columns;",
                    f"        const {resolver}=selector=>{{if(selector===null||selector===undefined||selector==='')return null;if(Number.isInteger(selector))return {columns}[selector]||null;const key=String(selector);return {columns}.find(column=>String(column?.key||'')===key||String(column?.name||'')===key)||null;}};",
                    f"        const {x_column}={resolver}({x_selector});",
                    f"        const {x_values}={x_column}?Array.from({x_column}.values||[]):Array.from({token}.index||Array.from({{length:Number({token}.rowCount)||0}},(_,index)=>index));",
                    f"        const {y_selectors}=Array.isArray({y_selector})?{y_selector}:({y_selector}===null||{y_selector}===undefined?null:[{y_selector}]);",
                    f"        const {y_columns}={y_selectors}===null?{columns}.filter(column=>column!=={x_column}):{y_selectors}.map({resolver}).filter(Boolean);",
                    f"        {base}_task_curves={y_columns}.map((column,index)=>{{const values=Array.from(column?.values||[]),points=[];for(let rowIndex=0;rowIndex<Math.min(values.length,{x_values}.length);rowIndex++){{const x=Number({x_values}[rowIndex]),y=Number(values[rowIndex]);if(Number.isFinite(x)&&Number.isFinite(y))points.push({{x,y}});}}const id=String(column?.key||column?.id||('series-'+index));return {{id,entityId:id,label:String(column?.name||column?.key||id),points,source:column}};}}).filter(curve=>curve.points.length);",
                    f"        {base}_surface.requestRender?.('task-table');",
                ]
            for effect_index, effect in enumerate(row.get("host_effects", [])):
                if effect["kind"] != "clipboard-table":
                    continue
                token = f"__dkdsClipboardTable_{effect_index}"
                path_expr = _js(effect["resultPath"].split("."))
                sep = _js(effect["sep"])
                include_index = str(effect["index"]).lower()
                include_header = str(effect["header"]).lower()
                lines += [
                    f"        const {token}={path_expr}.reduce((value,key)=>value?.[key],result);",
                    f"        if(!{token}||{token}.kind!=='data.table'||!Array.isArray({token}.columns))throw new Error({_js('Clipboard source '+effect['resultPath']+' must be a data.table snapshot')});",
                    f"        {{const separator={sep},includeIndex={include_index},includeHeader={include_header},columns={token}.columns,rowCount=Number({token}.rowCount)||0,indexValues=Array.from({token}.index||Array.from({{length:rowCount}},(_,index)=>index));",
                    "          const cell=value=>{const text=value===null||value===undefined?'':String(value);return (text.includes(separator)||text.includes('"')||text.includes('\n')||text.includes('\r'))?'"'+text.replaceAll('"','""')+'"':text;};",
                    "          const rows=[];",
                    "          if(includeHeader)rows.push([...(includeIndex?['']:[]),...columns.map(column=>column?.name||column?.key||'')].map(cell).join(separator));",
                    "          for(let rowIndex=0;rowIndex<rowCount;rowIndex++)rows.push([...(includeIndex?[indexValues[rowIndex]??rowIndex]:[]),...columns.map(column=>Array.from(column?.values||[])[rowIndex])].map(cell).join(separator));",
                    "          const copied=await ctx.io.clipboard.writeText(rows.join('\n'));if(copied===false)throw new Error('Clipboard write failed');}",
                ]
            for projection in row["result_plots"]:
                base = _var(projection["id"])
                key = projection["key"]
                lines += [
                    f"        if(!Array.isArray(result?.[{_js(key)}]))throw new Error({_js('Generated task result.'+key+' must be an array')});",
                    f"        {base}_points=result[{_js(key)}];",
                    f"        {base}_surface.requestRender?.();",
                ]
            for projection in row["result_tables"]:
                table = table_lookup[projection["id"]]
                base = _var(projection["id"])
                key = projection["key"]
                lines += [
                    f"        if(!Array.isArray(result?.[{_js(key)}]))throw new Error({_js('Generated task result.'+key+' must be an array')});",
                    f"        {base}_surface.setData({_js(table['columns'])},result[{_js(key)}]);",
                ]
            for projection in row["result_metrics"]:
                base = _var(projection["id"])
                key = projection["key"]
                lines += [
                    f"        if(result?.[{_js(key)}]===undefined)throw new Error({_js('Generated task result.'+key+' is required for metric projection')});",
                    f"        {base}_metric_value.textContent=String(result[{_js(key)}]);",
                ]
            for publish_index, publish in enumerate(row["publish_tables"]):
                column_rows = []
                for column in publish["columns"]:
                    result_key = column["resultKey"]
                    column_rows.append(
                        "{key:%s,name:%s,unit:%s,role:%s,values:result[%s]}"
                        % (_js(column["key"]), _js(column["name"]), _js(column["unit"]), _js(column["role"]), _js(result_key))
                    )
                    lines.append(
                        f"        if(!Array.isArray(result?.[{_js(result_key)}]))throw new Error({_js('Generated task result.'+result_key+' must be an array for Artifact publication')});"
                    )
                token = f"__dkdsArtifact_{publish_index}"
                lengths = f"__dkdsLengths_{publish_index}"
                lines += [
                    f"        const {lengths}=[" + ",".join(f"result[{_js(column['resultKey'])}].length" for column in publish["columns"]) + "];",
                    f"        if(new Set({lengths}).size>1)throw new Error('Published DataTable result columns must have equal lengths.');",
                    f"        const {token}=ctx.data.model.createTable({{"
                    + f"id:{_js(publish['id'])},name:{_js(publish['name'])},semanticType:{_js(publish['semanticType'])},"
                    + "columns:[" + ",".join(column_rows) + "],"
                    + f"lineage:{{parents:__dkdsSourceIds,role:'analysis',producer:manifest.id,operation:{_js(compiled.task_id)},parameters:__dkdsParameters}}"
                    + "});",
                    f"        ctx.data.artifacts.publish({token});",
                    f"        __dkdsPublishedIds.push(String({token}.id));",
                ]
            for dynamic_index, publish in enumerate(row.get("dynamic_publish_tables", [])):
                token = f"__dkdsDynamic_{dynamic_index}"
                artifact = f"__dkdsDynamicArtifact_{dynamic_index}"
                path_expr = _js(publish["resultPath"].split("."))
                lines += [
                    f"        const {token}={path_expr}.reduce((value,key)=>value?.[key],result);",
                    f"        if(!{token}||{token}.kind!=='data.table'||!Array.isArray({token}.columns))throw new Error({_js('Generated dynamic table result '+publish['resultPath']+' must be a data.table snapshot')});",
                    f"        if({token}.columns.length>{publish['maxColumns']})throw new Error({_js('Generated dynamic table exceeds maxColumns '+str(publish['maxColumns']))});",
                    f"        const __dkdsDynamicColumns_{dynamic_index}={token}.columns.map((column,index)=>{{",
                    f"          const values=Array.from(column?.values||[]);",
                    f"          if(values.length>{publish['maxRows']})throw new Error({_js('Generated dynamic table exceeds maxRows '+str(publish['maxRows']))});",
                    "          return {key:String(column?.key||('column_'+(index+1))),name:String(column?.name||column?.key||('Column '+(index+1))),unit:String(column?.unit||''),role:String(column?.role||''),values};",
                    "        });",
                    f"        const __dkdsDynamicLengths_{dynamic_index}=__dkdsDynamicColumns_{dynamic_index}.map(column=>column.values.length);",
                    f"        if(new Set(__dkdsDynamicLengths_{dynamic_index}).size>1)throw new Error('Generated dynamic DataTable columns must have equal lengths.');",
                    f"        const {artifact}=ctx.data.model.createTable({{id:{_js(publish['id'])},name:{_js(publish['name'])},semanticType:{_js(publish['semanticType'])},columns:__dkdsDynamicColumns_{dynamic_index},lineage:{{parents:__dkdsSourceIds,role:'analysis',producer:manifest.id,operation:{_js(compiled.task_id)},parameters:__dkdsParameters}}}});",
                    f"        ctx.data.artifacts.publish({artifact});",
                    f"        __dkdsPublishedIds.push(String({artifact}.id));",
                ]
            lines += [
                f"        ctx.status.set({_js(row['success_status'])});",
                "        " + ("return {taskResult:result,artifactIds:__dkdsPublishedIds.slice(),sourceIds:__dkdsSourceIds.slice()};" if row.get("domain_command") else "return true;"),
                "      }catch(error){",
                "        ctx.status.set(String(error?.message||error||'任务失败'));",
                "        throw error;",
                "      }",
                "    }",
            ]
        return lines

    def _command_registration_source(self) -> List[str]:
        lines: List[str] = []
        for row in self._portable_tasks:
            command = row.get("domain_command")
            if not command:
                continue
            compiled: CompiledPortableTask = row["compiled"]
            handler = self._task_handler_name(compiled.task_id)
            capture = "capture_" + re.sub(r"[^A-Za-z0-9_]", "_", command["id"])
            lines += [
                f"    function {capture}(payload={{}}){{",
                "      const explicit=(payload&&typeof payload==='object')?payload:{};",
                "      const sources={...(explicit.sources&&typeof explicit.sources==='object'?explicit.sources:{})};",
                "      const parameters={...(explicit.parameters&&typeof explicit.parameters==='object'?explicit.parameters:{})};",
            ]
            for argument, binding in row["input_bindings"].items():
                if binding["kind"] == "parameter":
                    field_id = binding["field"]
                    expression = self._field_read_expr(field_id)
                    lines.append(
                        f"      if(!Object.prototype.hasOwnProperty.call(parameters,{_js(field_id)}))parameters[{_js(field_id)}]={expression};"
                    )
                    continue
                source = binding["source"]
                token = re.sub(r"[^A-Za-z0-9_]", "_", argument)
                lines += [
                    f"      if(!String(sources[{_js(argument)}]||'')){{",
                    f"        const __dkdsCaptureField_{token}=" + (f"String({_var(binding['sourceField'])}.control?.value||'');" if binding.get("sourceField") else "'';"),
                    f"        if(__dkdsCaptureField_{token})sources[{_js(argument)}]=__dkdsCaptureField_{token};",
                    f"        const __dkdsCaptureSources_{token}=ctx.data.sources.list().filter(row=>"
                    + ("true" if source["includeExcluded"] else "!row?.excluded")
                    + f"&&(!{_js(source['semanticType'])}||String(row?.semanticType||'')==={_js(source['semanticType'])})"
                    + f"&&(!{_js(source['kind'])}||String(row?.kind||'')==={_js(source['kind'])}));",
                    f"        const __dkdsCaptureSource_{token}=String(sources[{_js(argument)}]||'')?__dkdsCaptureSources_{token}.find(row=>String(row?.artifactId||'')===String(sources[{_js(argument)}])):" + ("null;" if binding.get("sourceField") else f"__dkdsCaptureSources_{token}[{source['index']}];"),
                    f"        if(!__dkdsCaptureSource_{token}?.artifactId)throw new Error({_js('No scoped source matches domain-command binding for '+argument)});",
                    f"        sources[{_js(argument)}]=String(__dkdsCaptureSource_{token}.artifactId);",
                    "      }",
                ]
            algorithm = command["algorithm"]
            provider_expr = _js(algorithm["provider"]) if algorithm["provider"] else "manifest.id+'@'+manifest.version"
            lines += [
                "      return {sources,parameters};",
                "    }",
                f"    ctx.commands.register({_js(command['id'])},payload=>{handler}(payload),{{domainCommand:{{",
                f"      domain:{_js(command['domain'])},version:{_js(command['version'])},title:{_js(command['title'])},description:{_js(command['description'])},replayable:{str(command['replayable']).lower()},destructive:{str(command['destructive']).lower()},",
                "      inputSchema:{type:'object',properties:{sources:{type:'object'},parameters:{type:'object'}},additionalProperties:false},",
                f"      captureArgs:payload=>{capture}(payload),",
                "      inputs:args=>[...new Set(Object.values(args?.sources||{}).map(String).filter(Boolean))].map(artifactId=>({artifactId,role:'input'})),",
                f"      algorithm:()=>({{category:{_js(algorithm['category'])},id:{_js(algorithm['id'])},version:{_js(algorithm['version'])},provider:{provider_expr}}}),",
                "      parameters:args=>args?.parameters||{},",
                "      outputs:result=>(result?.artifactIds||[]).map(artifactId=>({artifactId,role:'result'}))",
                "    }});",
            ]
        return lines

    def manifest(self) -> Dict[str, Any]:
        def surface_nodes():
            stack = [
                node
                for surface in self.spec.get("surfaces", [])
                for node in surface.get("children", [])
            ]
            while stack:
                node = stack.pop()
                yield node
                stack.extend(node.get("children", []))

        normalized_surface_nodes = list(surface_nodes())
        has_plot = any(row["kind"] in {"plot", "plot-view", "plot-group", "result-split"} for row in self.spec["content"]) or any(node["kind"] == "scientific-plot" for node in normalized_surface_nodes)
        has_plot_group = any(row["kind"] == "plot-group" for row in self.spec["content"])
        has_plot_view = any(row["kind"] == "plot-view" for row in self.spec["content"])
        parameter_groups = (self.spec.get("parameters") or {}).get("groups", [])
        has_table = (
            any(row["kind"] in {"table", "result-split"} for row in self.spec["content"])
            or any(node["kind"] == "table" for node in normalized_surface_nodes)
            or any(group.get("table") is not None for group in parameter_groups)
        )
        has_parameter_form = (
            any(row["kind"] == "parameter-form" for row in self.spec["content"])
            or any(node["kind"] == "parameter-form" for node in normalized_surface_nodes)
            or any(group.get("parameterForm") is not None for group in parameter_groups)
        )
        has_menu = any(row["kind"] == "menu" for row in self.spec["content"])
        has_artifact_input = any(
            binding["kind"] in {"artifact-column", "artifact-table"}
            for task in self._portable_tasks
            for binding in task["input_bindings"].values()
        )
        has_artifact_output = any(
            bool(task["publish_tables"]) or bool(task.get("dynamic_publish_tables"))
            for task in self._portable_tasks
        )
        has_interaction = self.spec.get("interaction") is not None
        has_domain_commands = any(task.get("domain_command") is not None for task in self._portable_tasks)
        has_host_io = any(bool(task.get("host_effects")) for task in self._portable_tasks)
        has_surface_lifecycle_commands = any(bool(surface.get("lifecycle")) for surface in self.spec.get("surfaces", []))
        has_surface_action_commands = any(action.get("commandId") for surface in self.spec.get("surfaces", []) for action in surface.get("actions", []))
        has_domain_adapter = self.spec.get("domainAdapter") is not None
        has_stable_plot_identity = any(
            plot.get("identity") is not None
            for row in self.spec["content"]
            for plot in ([row] if row["kind"] in {"plot", "plot-view"} else row.get("plots", []) if row["kind"] == "plot-group" else [row["plot"]] if row["kind"] == "result-split" else [])
        )
        host = self.spec["host"]
        hosted = host["kind"] in {"top", "tool"}
        requires = ["status", "ui.workspace", "ui.unit-templates", "ui.pages"]
        capabilities = ["ui.page", "ui.plugin-workspace"]
        if hosted:
            requires.extend(["workspace", "ui.activities", "ui.top-workspace"])
            capabilities.append("ui.top-workspace")
        if has_plot:
            requires.append("ui.scientific-plot")
            capabilities.append("ui.scientific-plot")
        if has_plot_group:
            requires.extend(["ui.group-area", "ui.plot-views"])
            capabilities.append("ui.group-area")
        if has_plot_view:
            if "ui.plot-views" not in requires:
                requires.append("ui.plot-views")
            requires.append("ui.portable")
            capabilities.append("ui.portable")
        if has_table:
            requires.append("ui.table")
            capabilities.append("ui.table")
        if has_parameter_form:
            requires.append("parameters")
        if has_menu:
            requires.append("ui.menus")
        if self._portable_tasks:
            requires.append("execution.tasks")
        if has_host_io:
            requires.append("io")
        if has_interaction:
            requires.extend(["ui.selection", "ui.interaction"])
            capabilities.append("ui.interaction")
        if has_domain_commands or has_surface_lifecycle_commands or has_surface_action_commands:
            requires.append("execution.commands")
        if has_domain_adapter:
            requires.append("services")
        if has_artifact_input:
            requires.extend(["data.sources", "data.artifacts"])
            capabilities.append("data.scoped-sources")
        if has_artifact_output:
            if "data.artifacts" not in requires:
                requires.append("data.artifacts")
            requires.append("data.model")
        elif has_stable_plot_identity:
            requires.append("data.model")
        requires = list(dict.fromkeys(requires))
        capabilities = list(dict.fromkeys(capabilities))
        plugin = self.spec["plugin"]
        manifest = {
            "id": plugin["id"],
            "name": plugin["name"],
            "version": plugin["version"],
            "apiVersion": PLUGIN_API,
            "entry": "plugin.js",
            "scripts": ["plugin.js"],
            "platformPresentation": {"desktop": {"mode": "shared"}, "mobile": {"mode": "adaptive"}},
            "enabled": plugin["enabled"],
            "order": plugin["order"],
            "description": plugin["description"],
            "requiresCore": requires,
            "capabilities": capabilities,
            "pluginType": "tool" if host["kind"] == "tool" else "workbench",
            "data": self.spec["data"],
        }
        if has_domain_adapter:
            manifest["pluginDependencies"] = [{"id": self.spec["domainAdapter"]["dependency"]}]
        if hosted:
            workspace = self.spec["workspace"]
            manifest["workspace"] = {
                "role": "top",
                "activity": workspace["activity"],
                "icon": host["icon"],
                "title": host["contextLabel"],
            }
            if host["defaultSuper"]:
                manifest["workspace"]["defaultSuper"] = True
            window = dict(host["window"])
            window["activity"] = workspace["activity"]
            if has_plot:
                window["dependencies"] = ["scientific-renderer"]
            manifest["window"] = window
        if self._portable_tasks:
            manifest["tasks"] = [
                {"id": row["compiled"].task_id, "entry": row["compiled"].entry}
                for row in self._portable_tasks
            ]
        return manifest

    def _action_invoke_source(self, action_id: str) -> str:
        action = next((row for row in self.spec["actions"] if row["id"] == action_id), None)
        if action is None:
            raise SpecError(f"unknown action id: {action_id}")
        task = self._task_for_action(action_id)
        if task is not None:
            if task.get("domain_command") is not None:
                return f"()=>ctx.commands.run({_js(task['domain_command']['id'])},{{}})"
            return f"()=>{self._task_handler_name(task['compiled'].task_id)}()"
        return f"()=>{{ctx.status.set({_js(action['statusMessage'])});return true;}}"

    def _action_source(self, action_ids: List[str] | None = None) -> str:
        selected = set(action_ids) if action_ids is not None else None
        rows = []
        for action in self.spec["actions"]:
            if selected is not None and action["id"] not in selected:
                continue
            variant = f",variant:{_js(action['variant'])}" if action.get("variant") else ""
            icon = f",icon:{_js(action['icon'])}" if action.get("icon") else ""
            order = f",order:{int(action.get('order', 0))}"
            task = self._task_for_action(action["id"])
            if task is not None:
                if task.get("domain_command") is not None:
                    invoke = f"()=>ctx.commands.run({_js(task['domain_command']['id'])},{{}})"
                else:
                    invoke = f"()=>{self._task_handler_name(task['compiled'].task_id)}()"
            else:
                invoke = f"()=>{{ctx.status.set({_js(action['statusMessage'])});return true;}}"
            rows.append(
                "{id:%s,label:%s%s%s%s,onInvoke:%s}"
                % (_js(action["id"]), _js(action["label"]), variant, icon, order, invoke)
            )
        return "[" + ",".join(rows) + "]"

    def _interaction_source(self) -> List[str]:
        interaction = self.spec.get("interaction")
        if not interaction:
            return ["    const interaction=null;"]
        selection = interaction["selection"]
        lines = [
            f"    const interaction=ctx.ui.interaction.create({_js(interaction['id'])},{{selection:{{multiple:{str(selection['multiple']).lower()},defaultType:{_js(selection['defaultType'])}}}}});",
            "    disposables.push(interaction);",
        ]
        link = interaction.get("selectionLink")
        if link and link["enabled"]:
            options = {"acceptTypes": link["acceptTypes"]} if link["acceptTypes"] else {}
            lines += [
                f"    const unlinkSelection=interaction.link({_js(link['group'])},{_js(options)});",
                "    disposables.push({dispose(){try{unlinkSelection?.();}catch{}}});",
            ]
        return lines

    def _parameter_field_source(self, field: Dict[str, Any], host: str) -> List[str]:
        name = _var(field["id"])
        binding = field.get("binding")
        on_change = ""
        if binding:
            static_args = _js(binding["staticArgs"])
            argument_key = _js(binding["argumentKey"])
            action_id = _js(binding["domainAction"])
            if field["type"] == "checkbox":
                value_expr = "!!event?.target?.checked"
            elif field["type"] == "number":
                value_expr = "(()=>{const raw=String(event?.target?.value??'');if(raw==='')return null;const value=Number(raw);return Number.isFinite(value)?value:null;})()"
            else:
                value_expr = "String(event?.target?.value??'')"
            on_change = (
                ",onChange:event=>{const value=" + value_expr + ";"
                + "void liveDomain.invoke(" + action_id + ",{..." + static_args + ",[" + argument_key + "]:value})"
                + ".catch(error=>ctx.status.set(String(error?.message||error||'领域更新失败')));}"
            )

        if field["type"] == "checkbox":
            checked = bool(field.get("value", False))
            lines = [
                f"    const {name}=units.check.create({host},{{variant:'checkbox',label:{_js(field['label'])},checked:{str(checked).lower()}{on_change}}});"
            ]
            if binding:
                raw = self._live_binding_read_source(binding)
                lines.append(f"    liveBindings.push(state=>{{const raw={raw};{name}.input.checked=Boolean(raw);}});")
            return lines

        if field["type"] == "select":
            value = field.get("value", field["options"][0]["value"])
            lines = [
                f"    const {name}=units.field.create({host},{{variant:'select',kind:'select',label:{_js(field['label'])},value:{_js(value)},options:{_js(field['options'])}{on_change}}});"
            ]
            if binding:
                raw = self._live_binding_read_source(binding)
                fallback = _js(value)
                lines.append(f"    liveBindings.push(state=>{{const raw={raw};{name}.control.value=String(raw??{fallback});}});")
            return lines

        input_type = "number" if field["type"] == "number" else "text"
        parts = ["variant:'input'", f"label:{_js(field['label'])}", f"inputType:{_js(input_type)}"]
        if "value" in field:
            parts.append(f"value:{_js(field['value'])}")
        if field["type"] == "number":
            parts.append(f"step:{_js(field.get('step', 'any'))}")
        if on_change:
            parts.append(on_change[1:])
        lines = [f"    const {name}=units.field.create({host},{{{','.join(parts)}}});"]
        if binding:
            raw = self._live_binding_read_source(binding)
            fallback = _js(field.get("value", ""))
            lines.append(f"    liveBindings.push(state=>{{const raw={raw};{name}.control.value=String(raw??{fallback});}});")
        return lines

    def _parameter_source(self) -> List[str]:
        parameters = self.spec.get("parameters")
        if not parameters:
            return ["    const primes=[];"]
        lines = [
            "    const controlsHost=units.layout.create(null,{variant:'stack-comfortable'});",
        ]
        if parameters.get("groups"):
            for group in parameters["groups"]:
                base = _var(group["id"])
                if group["variant"] == "headed":
                    lines.append(
                        f"    const {base}_panel=units.panel.create(controlsHost,{{variant:'headed',title:{_js(group['title'])},sizing:'content'}});"
                    )
                    action_host = f"{base}_panel.header.actions"
                else:
                    lines += [
                        f"    const {base}_panel=units.panel.create(controlsHost,{{variant:'plain',header:false,sizing:'content'}});",
                        f"    const {base}_header=units.header.create({base}_panel.body,{{kind:'content',variant:'content',title:{_js(group['title'])},actions:false}});",
                    ]
                    action_host = f"{base}_header.actions"
                lines.append(f"    units.layout.apply({base}_panel.body,{{variant:{_js(group['layout'])}}});")
                if group.get("badge") is not None:
                    badge = group["badge"]
                    lines.append(
                        f"    const {base}_badge=units.chip.create({action_host},{{variant:{_js(badge['variant'])},text:{_js(badge['text'])}}});"
                    )
                if group.get("tabs") is not None:
                    tabs = group["tabs"]
                    lines.append(
                        f"    const {base}_tabs=units.tabs.create({action_host},{{variant:{_js(tabs['variant'])},items:{_js(tabs['items'])}}});"
                    )
                field_host = f"{base}_panel.body"
                if group.get("fieldLayout") is not None:
                    field_host = f"{base}_fields"
                    lines.append(
                        f"    const {base}_fields=units.layout.create({base}_panel.body,{{variant:{_js(group['fieldLayout'])}}});"
                    )
                for field in group["fields"]:
                    lines += self._parameter_field_source(field, field_host)
                if group.get("note") is not None:
                    note = group["note"]
                    lines.append(
                        f"    units.note.create({base}_panel.body,{{variant:{_js(note['variant'])},text:{_js(note['text'])}}});"
                    )
                if group.get("actionGrid") is not None:
                    action_grid = group["actionGrid"]
                    lines.append(
                        f"    const {base}_action_grid=units.layout.create({base}_panel.body,{{variant:{_js(action_grid['layout'])}}});"
                    )
                    for action_id in action_grid["actionIds"]:
                        action = next(row for row in self.spec["actions"] if row["id"] == action_id)
                        variant = f",variant:{_js(action['variant'])}" if action.get("variant") else ""
                        lines.append(
                            f"    units.action.create({base}_action_grid,{{id:{_js(action_id)},label:{_js(action['label'])}{variant},direct:true,onInvoke:{self._action_invoke_source(action_id)}}});"
                        )
                if group.get("toolbar") is not None:
                    toolbar = group["toolbar"]
                    lines.append(
                        f"    const {base}_toolbar=units.toolbar.create({base}_panel.body,{{variant:{_js(toolbar['variant'])},actions:{self._action_source(toolbar['actionIds'])}}});"
                    )
                    if toolbar.get("layout") is not None:
                        lines.append(f"    units.layout.apply({base}_toolbar.element,{{variant:{_js(toolbar['layout'])}}});")
                    if toolbar.get("label"):
                        lines.append(
                            f"    units.note.create({base}_toolbar.element,{{variant:'ordinary',text:{_js(toolbar['label'])}}});"
                        )
                if group["actionIds"]:
                    lines.append(
                        f"    const {base}_legacy_toolbar=units.toolbar.create({base}_panel.body,{{variant:'ordinary',actions:{self._action_source(group['actionIds'])}}});"
                    )
                if group.get("parameterForm") is not None:
                    parameter_form = group["parameterForm"]
                    parameter_form_base = _var(parameter_form["id"])
                    lines += [
                        f"    const {parameter_form_base}_host=units.layout.create({base}_panel.body,{{variant:'identity'}});",
                        f"    const {parameter_form_base}_form=units.parameterForm.mount({parameter_form_base}_host,{{fields:{_js(parameter_form['fields'])}}},{{compact:{str(parameter_form['compact']).lower()},autoFit:{str(parameter_form['autoFit']).lower()},layoutOwner:{_js(parameter_form['layoutOwner'])}}});",
                        f"    disposables.push({{dispose(){{try{{{parameter_form_base}_form?.destroy?.();}}catch{{}};try{{{parameter_form_base}_form?.dispose?.();}}catch{{}};}}}});",
                    ]
                if group.get("table") is not None:
                    table = group["table"]
                    lines += [
                        f"    const {base}_table_host=units.layout.create({base}_panel.body,{{variant:{_js(table['layout'])}}});",
                        f"    const {_var(table['id'])}_surface=units.table.mount({_js(table['id'])},{base}_table_host,{{variant:'standard',columns:{_js(table['columns'])},rows:{_js(table['rows'])},persistKey:{_js(table['id']+'-declarative-v1')}}});",
                        f"    disposables.push({_var(table['id'])}_surface);",
                    ]
        else:
            lines += [
                f"    const parameterPanel=units.panel.create(controlsHost,{{variant:'headed',title:{_js(parameters['label'])},sizing:'content'}});",
                "    const parameterGrid=units.layout.create(parameterPanel.body,{variant:'form-grid-2'});",
            ]
            for field in parameters["fields"]:
                lines += self._parameter_field_source(field, "parameterGrid")
        lines += [
            "    const parameterPrime=units.prime.build({"
            + f"id:{_js(parameters['id'])},label:{_js(parameters['label'])},"
            + "variant:'fixed-titleless',presentationRole:'data-control',presentationPurpose:'parameters',"
            + f"semanticKind:'panel',priority:{parameters['priority']},collapsible:true,fixed:true,header:false,embedded:{str(parameters['embedded']).lower()},"
            + f"existingNode:controlsHost,sizing:'fill',autoOpen:{str(parameters['autoOpen']).lower()},defaultPlacement:'left',placements:['left'],"
            + f"stateVersion:{_js(parameters['stateVersion'])}}});",
            "    const primes=[parameterPrime];",
        ]
        return lines

    def _live_binding_read_source(self, binding: Dict[str, Any], state_var: str = "state") -> str:
        return f"{_js(binding['statePath'].split('.'))}.reduce((value,key)=>value?.[key],{state_var})"

    def _live_binding_text_source(self, binding: Dict[str, Any], raw_expr: str) -> str:
        return (
            f"(()=>{{const raw={raw_expr};const value=(raw===undefined||raw===null||String(raw)==='')?{_js(binding['fallback'])}:String(raw);"
            + f"return {_js(binding['prefix'])}+value+{_js(binding['suffix'])};}})()"
        )

    def _surface_field_source(self, field: Dict[str, Any], host: str, base: str) -> List[str]:
        binding = field.get("binding")
        lines: List[str] = []
        if field["type"] == "checkbox":
            checked = bool(field.get("value", False))
            lines.append(
                f"    const {base}=units.check.create({host},{{variant:'checkbox',label:{_js(field['label'])},checked:{str(checked).lower()},disabled:{str(bool(binding)).lower()}}});"
            )
            if binding:
                raw = self._live_binding_read_source(binding)
                lines.append(f"    liveBindings.push(state=>{{const raw={raw};{base}.input.checked=Boolean(raw);}});")
            return lines
        if field["type"] == "select":
            value = field.get("value", field["options"][0]["value"])
            lines.append(
                f"    const {base}=units.field.create({host},{{variant:'select',kind:'select',label:{_js(field['label'])},value:{_js(value)},options:{_js(field['options'])},disabled:{str(bool(binding)).lower()}}});"
            )
            if binding:
                raw = self._live_binding_read_source(binding)
                lines.append(f"    liveBindings.push(state=>{{const raw={raw};if(raw!==undefined&&raw!==null){base}.control.value=String(raw);}});")
            return lines
        input_type = "number" if field["type"] == "number" else "text"
        parts = ["variant:'input'", f"label:{_js(field['label'])}", f"inputType:{_js(input_type)}"]
        if "value" in field:
            parts.append(f"value:{_js(field['value'])}")
        if field["type"] == "number":
            parts.append(f"step:{_js(field.get('step', 'any'))}")
        if binding:
            parts.append("readOnly:true")
        lines.append(f"    const {base}=units.field.create({host},{{{','.join(parts)}}});")
        if binding:
            raw = self._live_binding_read_source(binding)
            lines.append(f"    liveBindings.push(state=>{{const raw={raw};{base}.control.value=raw===undefined||raw===null?'':String(raw);}});")
        return lines

    def _surface_node_source(self, node: Dict[str, Any], host: str, prefix: str) -> List[str]:
        base = _var(prefix + "-" + node["id"])
        kind = node["kind"]
        lines: List[str] = []

        if kind == "layout":
            lines.append(f"    const {base}=units.layout.create({host},{{variant:{_js(node['variant'])}}});")
            for child in node["children"]:
                lines += self._surface_node_source(child, base, prefix)
            return lines

        if kind == "panel":
            options = [
                f"variant:{_js(node['variant'])}",
                f"header:{str(node['header']).lower()}",
                f"sizing:{_js(node['sizing'])}",
            ]
            if node["title"]:
                options.append(f"title:{_js(node['title'])}")
            lines.append(f"    const {base}=units.panel.create({host},{{{','.join(options)}}});")
            if node["layout"]:
                lines.append(f"    units.layout.apply({base}.body,{{variant:{_js(node['layout'])}}});")
            for child in node["children"]:
                lines += self._surface_node_source(child, f"{base}.body", prefix)
            return lines

        if kind == "header":
            lines.append(
                f"    const {base}=units.header.create({host},{{kind:{_js(node['headerKind'])},variant:{_js(node['variant'])},title:{_js(node['title'])},actions:{self._action_source(node['actionIds']) if node['actionIds'] else 'false'}}});"
            )
            return lines

        if kind == "note":
            lines.append(f"    const {base}=units.note.create({host},{{variant:{_js(node['variant'])},text:{_js(node['text'])}}});")
            return lines

        if kind == "field":
            lines += self._surface_field_source(node, host, base)
            return lines

        if kind == "toolbar":
            lines.append(
                f"    const {base}=units.toolbar.create({host},{{variant:{_js(node['variant'])},actions:{self._action_source(node['actionIds'])}}});"
            )
            if node["layout"]:
                lines.append(f"    units.layout.apply({base}.element,{{variant:{_js(node['layout'])}}});")
            if node["label"]:
                lines.append(f"    units.note.create({base}.element,{{variant:'ordinary',text:{_js(node['label'])}}});")
            return lines

        if kind == "parameter-form":
            lines += [
                f"    const {base}_host=units.layout.create({host},{{variant:'identity'}});",
                f"    const {base}=units.parameterForm.mount({base}_host,{{fields:{_js(node['fields'])}}},{{compact:{str(node['compact']).lower()},autoFit:{str(node['autoFit']).lower()},layoutOwner:{_js(node['layoutOwner'])}}});",
                f"    disposables.push({{dispose(){{try{{{base}?.destroy?.();}}catch{{}};try{{{base}?.dispose?.();}}catch{{}};}}}});",
            ]
            return lines

        if kind == "summary":
            lines.append(f"    const {base}=units.summary.create({host},{{variant:{_js(node['variant'])},items:{_js(node['items'])}}});")
            return lines

        if kind == "empty-state":
            lines.append(f"    const {base}=units.emptyState.create({host},{{variant:'standard',text:{_js(node['text'])}}});")
            return lines

        if kind == "list":
            lines.append(f"    const {base}=units.list.create({host},{{variant:'plain',items:{_js(node['items'])}}});")
            if node["emptyText"]:
                lines.append(f"    if(!{base}.items().length)units.emptyState.create({base}.element,{{variant:'standard',text:{_js(node['emptyText'])}}});")
            return lines

        if kind == "legend":
            lines.append(f"    const {base}=units.legend.create({host},{{variant:{_js(node['variant'])}}});")
            for index, item in enumerate(node["items"]):
                lines.append(
                    f"    units.chip.create({base},{{variant:{_js(item['variant'])},label:{_js(item['label'])}}});"
                )
            return lines

        if kind == "table":
            lines += [
                f"    const {base}_host=units.layout.create({host},{{variant:{_js(node['layout'])}}});",
                f"    const {base}=units.table.mount({_js(node['id'])},{base}_host,{{variant:'standard',columns:{_js(node['columns'])},rows:{_js(node['rows'])},persistKey:{_js(node['id']+'-declarative-surface-v1')}}});",
                f"    disposables.push({base});",
            ]
            if node.get("binding"):
                raw = self._live_binding_read_source(node["binding"])
                lines.append(f"    liveBindings.push(state=>{{const rows={raw};{base}?.setData?.({_js(node['columns'])},Array.isArray(rows)?rows:[]);}});")
            return lines

        if kind == "status":
            parts = [f"variant:{_js(node['variant'])}", f"text:{_js(node['text'])}"]
            if node["state"]:
                parts.append(f"state:{_js(node['state'])}")
            lines.append(f"    const {base}=units.status.create({host},{{{','.join(parts)}}});")
            if node.get("binding"):
                raw = self._live_binding_read_source(node["binding"])
                text = self._live_binding_text_source(node["binding"], raw)
                lines.append(f"    liveBindings.push(state=>{{{base}.textContent={text};}});")
            return lines

        if kind == "metric":
            lines.append(f"    const {base}=units.metric.create({host},{{variant:{_js(node['variant'])},label:{_js(node['label'])},value:{_js(node['value'])}}});")
            if node.get("binding"):
                raw = self._live_binding_read_source(node["binding"])
                text = self._live_binding_text_source(node["binding"], raw)
                lines.append(f"    liveBindings.push(state=>{{{base}.value.textContent={text};}});")
            return lines

        if kind == "action":
            if node.get("domainAction"):
                enabled = "()=>!!liveDomain?.available?.()"
                if node.get("enabledPath"):
                    path = node["enabledPath"].split(".")
                    enabled = f"()=>{{try{{if(!liveDomain?.available?.())return false;return !!{_js(path)}.reduce((value,key)=>value?.[key],liveDomain.snapshot()?.state||{{}});}}catch{{return false;}}}}"
                lines.append(
                    f"    const {base}=units.action.create({host},{{id:{_js(node['id'])},label:{_js(node['label'])},variant:{_js(node['variant'])},direct:true,enabled:{enabled},onInvoke:()=>{{if(!liveDomain?.available?.()){{ctx.status.set({_js(node['label']+'领域服务不可用')});return false;}}void liveDomain.invoke({_js(node['domainAction'])},{_js(node['staticArgs'])}).catch(error=>ctx.status.set(String(error?.message||error||{_js(node['label']+'失败')})));return true;}}}});"
                )
                if node.get("enabledPath"):
                    raw = f"{_js(node['enabledPath'].split('.'))}.reduce((value,key)=>value?.[key],state)"
                    lines.append(f"    liveBindings.push(state=>{{const raw={raw};const button={base}.button||{base}.element;if(button)button.disabled=!(Boolean(raw)&&!!liveDomain?.available?.());}});")
                return lines
            action = next(row for row in self.spec["actions"] if row["id"] == node["actionId"])
            variant = f",variant:{_js(action['variant'])}" if action.get("variant") else ""
            lines.append(
                f"    const {base}=units.action.create({host},{{id:{_js(node['actionId'])},label:{_js(action['label'])}{variant},direct:true,onInvoke:{self._action_invoke_source(node['actionId'])}}});"
            )
            return lines

        if kind == "floating-chrome":
            lines.append(
                f"    const {base}=units.floatingChrome.create({host},{{variant:{_js(node['variant'])},actions:{self._action_source(node['actionIds'])}}});"
            )
            return lines

        if kind == "scientific-plot":
            lines += [
                f"    const {base}=units.scientificPlot.create({host},{{variant:{_js(node['plotVariant'])},source:{_js(node['source'])},renderOwner:'runtime',xTitle:{_js(node['xTitle'])},yTitle:{_js(node['yTitle'])}}});",
                f"    disposables.push({base});",
            ]
            return lines

        raise SpecError(f"unsupported normalized surface node kind: {kind}")

    def _surface_actions_source(self, surface: Dict[str, Any], header_var: str, base: str) -> tuple[List[str], str]:
        actions = surface.get("actions", [])
        if not actions:
            return [], ""
        lines: List[str] = []
        action_rows: List[str] = []
        for action in actions:
            action_base = _var(surface["id"] + "-" + action["id"])
            item_values = [str(item["value"]) for item in action["items"]]
            labels = {str(item["value"]): item["label"] for item in action["items"]}
            lines += [
                f"    const {action_base}_allowed={_js(item_values)};",
                f"    const {action_base}_labels={_js(labels)};",
            ]
            if action.get("domainAction"):
                path = action["statePath"].split(".")
                lines.append(
                    f"    const {action_base}_current=()=>{{try{{if(!liveDomain?.available?.())return {_js(str(action['defaultValue']))};const raw={_js(path)}.reduce((value,key)=>value?.[key],liveDomain.snapshot()?.state||{{}});const selected=String(raw??{_js(str(action['defaultValue']))});return {action_base}_allowed.includes(selected)?selected:{_js(str(action['defaultValue']))};}}catch{{return {_js(str(action['defaultValue']))};}}}};"
                )
                item_expr = (
                    f"{action_base}_allowed.map(value=>({{id:{_js(action['id']+'-')}+value,"
                    + f"icon:{action_base}_current()===value?'✓':'',label:{action_base}_labels[value]||value,"
                    + f"onInvoke:()=>{{if(!liveDomain?.available?.()){{ctx.status.set({_js(action['title']+'领域服务不可用')});return false;}}"
                    + f"void liveDomain.invoke({_js(action['domainAction'])},{{[{_js(action['argumentKey'])}]:value}}).then(()=>workbench.primes?.get?.({_js(surface['id'])})?.actionGroup?.render?.()).catch(error=>ctx.status.set(String(error?.message||error||{_js(action['title']+'失败')})));return true;}}}}))"
                )
                enabled = "()=>!!liveDomain?.available?.()"
            else:
                lines.append(
                    f"    const {action_base}_current=()=>{{const row=ctx.commands.history({{commandId:{_js(action['commandId'])},status:'completed',limit:1}})[0];const raw=row?.arguments?.[{_js(action['argumentKey'])}];const value=String(raw??{_js(str(action['defaultValue']))});return {action_base}_allowed.includes(value)?value:{_js(str(action['defaultValue']))};}};"
                )
                item_expr = (
                    f"{action_base}_allowed.map(value=>({{id:{_js(action['id']+'-')}+value,"
                    + f"icon:{action_base}_current()===value?'✓':'',label:{action_base}_labels[value]||value,"
                    + f"onInvoke:()=>{{if(!ctx.commands.get({_js(action['commandId'])})){{ctx.status.set({_js(action['title']+'命令不可用')});return false;}}"
                    + f"void ctx.commands.run({_js(action['commandId'])},{{[{_js(action['argumentKey'])}]:value}}).then(()=>workbench.primes?.get?.({_js(surface['id'])})?.actionGroup?.render?.()).catch(error=>ctx.status.set(String(error?.message||error||{_js(action['title']+'失败')})));return true;}}}}))"
                )
                enabled = f"()=>!!ctx.commands.get({_js(action['commandId'])})"
            action_rows.append(
                "{"
                + f"id:{_js(action['id'])},menu:true,order:{action['order']},"
                + f"label:()=>{_js(action['labelPrefix'])}+{action_base}_current(),title:{_js(action['title'])},"
                + f"enabled:{enabled},items:()=>{item_expr}"
                + "}"
            )
        return lines, "[" + ",".join(action_rows) + "]"

    def _surface_source(self) -> List[str]:
        lines = ["    const subs=[];"]
        for surface in self.spec.get("surfaces", []):
            base = _var("surface-" + surface["id"])
            root = f"{base}_root"
            lines.append(f"    const {root}=units.layout.create(null,{{variant:{_js(surface['layout'])}}});")
            for child in surface["children"]:
                lines += self._surface_node_source(child, root, surface["id"])

            if surface["role"] == "prime":
                prime = f"{base}_prime"
                header_var = _var(surface["id"] + "-" + surface["chromeHeaderId"]) if surface.get("chromeHeaderId") else ""
                action_lines, action_source = self._surface_actions_source(surface, header_var, base)
                lines += action_lines
                lines.append(
                    f"    const {prime}=units.prime.build({{"
                    + f"id:{_js(surface['id'])},label:{_js(surface['label'])},variant:'canonical-header',"
                    + f"presentationRole:{_js(surface['presentationRole'])},presentationPurpose:{_js(surface['presentationPurpose'])},"
                    + f"semanticKind:{_js(surface['semanticKind'])},priority:{surface['priority']},order:{surface['order']},"
                    + f"collapsible:{str(surface['collapsible']).lower()},fixed:{str(surface['fixed']).lower()},embedded:{str(surface['embedded']).lower()},"
                    + f"existingNode:{root},sizing:{_js(surface['sizing'])},autoOpen:{str(surface['autoOpen']).lower()},"
                    + f"defaultPlacement:{_js(surface['defaultPlacement'])},placements:{_js(surface['placements'])},stateVersion:{_js(surface['stateVersion'])}"
                    + (f",detailGeometry:{_js(surface['detailGeometry'])}" if surface.get("detailGeometry") else "")
                    + (
                        (
                            f",handle:{_var(surface['id']+'-'+surface['chromeHeaderId'])}.element,controlsHost:{_var(surface['id']+'-'+surface['chromeHeaderId'])}.actions"
                            if surface.get("chromeHeaderId")
                            else ""
                        )
                    )
                    + (f",actionHost:{header_var}.actions,actions:{action_source}" if action_source else "")
                    + (
                        (f",mount:()=>{{if(ctx.commands.get({_js(surface['lifecycle']['onOpenCommand'])}))void ctx.commands.run({_js(surface['lifecycle']['onOpenCommand'])},{{surfaceId:{_js(surface['id'])},event:'open'}});}}" if (surface.get("lifecycle") or {}).get("onOpenCommand") else "")
                        + (f",onClose:()=>{{if(ctx.commands.get({_js(surface['lifecycle']['onCloseCommand'])}))void ctx.commands.run({_js(surface['lifecycle']['onCloseCommand'])},{{surfaceId:{_js(surface['id'])},event:'close'}});}}" if (surface.get("lifecycle") or {}).get("onCloseCommand") else "")
                        + (f",onPlacementChanged:placement=>{{if(ctx.commands.get({_js(surface['lifecycle']['onPlacementChangedCommand'])}))void ctx.commands.run({_js(surface['lifecycle']['onPlacementChangedCommand'])},{{surfaceId:{_js(surface['id'])},event:'placement',placement:String(placement?.placement||placement||'')}});}}" if (surface.get("lifecycle") or {}).get("onPlacementChangedCommand") else "")
                    )
                    + "});"
                )
                lines.append(f"    primes.push({prime});")
            else:
                lines.append(
                    "    subs.push({"
                    + f"id:{_js(surface['id'])},label:{_js(surface['label'])},presentationRole:{_js(surface['presentationRole'])},"
                    + f"semanticKind:{_js(surface['semanticKind'])},priority:{surface['priority']},order:{surface['order']},collapsible:{str(surface['collapsible']).lower()},keepLeft:{str(surface['keepLeft']).lower()},"
                    + f"persistent:{str(surface['persistent']).lower()},existingNode:{root}"
                    + (f",onShow:()=>{{if(ctx.commands.get({_js(surface['lifecycle']['onShowCommand'])}))void ctx.commands.run({_js(surface['lifecycle']['onShowCommand'])},{{surfaceId:{_js(surface['id'])},event:'show'}});}}" if (surface.get("lifecycle") or {}).get("onShowCommand") else "")
                    + "});"
                )
        return lines

    def _scientific_plot_spec_source(self, row: Dict[str, Any], base: str) -> str:
        variant = row.get("plotVariant", "curve")
        render_owner = row.get("renderOwner", "unit")
        if render_owner == "runtime":
            return (
                "{"
                + f"variant:{_js(variant)},source:{_js(row['source'])},renderOwner:'runtime',"
                + f"xTitle:{_js(row.get('xTitle',''))},yTitle:{_js(row.get('yTitle',''))}"
                + "}"
            )

        task_dynamic = any(
            projection["id"] == row["id"]
            for task in self._portable_tasks
            for projection in task.get("dynamic_table_plots", [])
        )
        if task_dynamic:
            return "{" + ",".join([
                f"variant:{_js(variant)}",
                f"source:{_js(row['source'])}",
                f"xTitle:{_js(row['xTitle'])}",
                f"yTitle:{_js(row['yTitle'])}",
                "interaction:interaction",
                f"selectionTarget:{_js(row['selectionTarget'])}",
                f"getCurves:()=>{base}_task_curves",
                "getMarkers:()=>[]",
            ]) + "}"

        if row.get("binding") is not None:
            parts = [
                f"variant:{_js(variant)}",
                f"source:{_js(row['source'])}",
                f"xTitle:{_js(row['xTitle'])}",
                f"yTitle:{_js(row['yTitle'])}",
                "interaction:interaction",
                f"selectionTarget:{_js(row['selectionTarget'])}",
                f"getCurves:()=>{base}_curves",
                "getMarkers:()=>[]",
            ]
            binding = row["binding"]
            if binding.get("selectedIdPath"):
                parts.append(f"getSelectedCurveId:()=>{base}_selected_id")
            markers = binding.get("markers")
            if markers is not None:
                parts.append(f"getMarkers:()=>{base}_markers")
                if markers.get("selectedIdPath"):
                    parts.append(f"getSelectedMarkerIds:()=>{base}_selected_marker_id?[{base}_selected_marker_id]:[]")
                if markers.get("selectAction"):
                    static_args = _js(markers.get("staticArgs", {}))
                    parts.append(
                        "onMarkerSelect:({marker,additive})=>{const id=String(marker?.id||'');"
                        + f"if(id&&liveDomain?.available?.())void liveDomain.invoke({_js(markers['selectAction'])},{{...{static_args},id,additive:!!additive}}).catch(error=>ctx.status.set(String(error?.message||error||'标记选择失败')));"
                        + "}"
                    )
            if binding.get("selectAction"):
                parts.append(
                    "onCurveSelect:({curve})=>{const id=String(curve?.id||'');"
                    + f"if(id&&liveDomain?.available?.())void liveDomain.invoke({_js(binding['selectAction'])},{{id}}).catch(error=>ctx.status.set(String(error?.message||error||'曲线选择失败')));"
                    + "}"
                )
            return "{" + ",".join(parts) + "}"

        curve_parts = [
            f"id:{_js(row['id'])}",
            f"points:{base}_points",
        ]
        identity = row.get("identity")
        if identity is not None:
            curve_parts += [
                f"artifactId:{base}_artifact_id",
                f"artifactRevision:{base}_artifact_revision",
                f"seriesId:{base}_series_id",
                f"entityType:{_js(identity['entityType'])}",
            ]
        parts = [
            f"variant:{_js(variant)}",
            f"source:{_js(row['source'])}",
            f"xTitle:{_js(row['xTitle'])}",
            f"yTitle:{_js(row['yTitle'])}",
            "interaction:interaction",
            f"selectionTarget:{_js(row['selectionTarget'])}",
            "getCurves:()=>[{" + ",".join(curve_parts) + "}]",
            "getMarkers:()=>[]",
        ]
        if row.get("axisSemantics") is not None:
            parts.append(f"axisSemantics:{_js(row['axisSemantics'])}")
        if row.get("viewport") is not None:
            viewport = row["viewport"]
            parts.append(
                "viewportPolicy:{"
                + f"link:{str(viewport['link']).lower()},linkGroup:{_js(viewport['linkGroup'])},linkedAxes:{_js(viewport['linkedAxes'])}"
                + "}"
            )
        if row.get("legend") is not None:
            legend = row["legend"]
            parts.append(
                "legendPolicy:{"
                + f"link:{str(legend['link']).lower()},linkGroup:{_js(legend['linkGroup'])},maxLinkedTargets:{legend['maxLinkedTargets']}"
                + "}"
            )
        return "{" + ",".join(parts) + "}"

    def _content_source(self) -> List[str]:
        lines = [f"    const main=units.layout.create(null,{{variant:{_js(self.spec['workspace']['mainLayout'])}}});"]
        for row in self.spec["content"]:
            if row["kind"] == "note":
                lines.append(f"    units.note.create(main,{{variant:{_js(row['variant'])},text:{_js(row['text'])}}});")
                continue
            if row["kind"] == "parameter-form":
                base = _var(row["id"])
                lines += [
                    f"    const {base}_host=units.layout.create(main,{{variant:'identity'}});",
                    f"    const {base}_form=units.parameterForm.mount({base}_host,{{fields:{_js(row['fields'])}}},{{compact:{str(row['compact']).lower()},autoFit:{str(row['autoFit']).lower()},layoutOwner:{_js(row['layoutOwner'])}}});",
                    f"    disposables.push({{dispose(){{try{{{base}_form?.destroy?.();}}catch{{}};try{{{base}_form?.dispose?.();}}catch{{}};}}}});",
                ]
                continue
            if row["kind"] == "legend":
                base = _var(row["id"])
                lines.append(f"    const {base}_legend=units.legend.create(main,{{variant:{_js(row['variant'])}}});")
                for item_index, item in enumerate(row["items"]):
                    lines.append(
                        f"    const {base}_legend_item_{item_index}=units.chip.create({base}_legend,{{variant:{_js(item['variant'])},label:{_js(item['label'])}}});"
                    )
                continue
            if row["kind"] == "menu":
                base = _var(row["id"])
                invoke = self._action_invoke_source(row["actionId"])
                lines.append(
                    f"    const {base}_menu=units.menu.contribute({{id:{_js(row['id'])},menu:{_js(row['menu'])},label:{_js(row['label'])},activity:{_js(self.spec['workspace']['activity'])},order:{row['order']},onClick:{invoke}}});"
                )
                continue
            if row["kind"] == "summary":
                base = _var(row["id"])
                lines.append(f"    const {base}_summary=units.summary.create(main,{{variant:{_js(row['variant'])},items:{_js(row['items'])}}});")
                continue
            if row["kind"] == "empty-state":
                base = _var(row["id"])
                lines.append(f"    const {base}_empty=units.emptyState.create(main,{{variant:'standard',text:{_js(row['text'])}}});")
                continue
            if row["kind"] == "list":
                base = _var(row["id"])
                lines.append(f"    const {base}_list=units.list.create(main,{{variant:'plain',items:{_js(row['items'])}}});")
                if row["emptyText"]:
                    lines.append(f"    if(!{base}_list.items().length)units.emptyState.create({base}_list.element,{{variant:'standard',text:{_js(row['emptyText'])}}});")
                continue
            if row["kind"] == "plot-view":
                base = _var(row["id"])
                points = [{"x": pair[0], "y": pair[1]} for pair in row["points"]]
                lines += [
                    f"    const {base}_panel=units.panel.create(main,{{variant:'plot-card',header:false,sizing:'content'}});",
                    f"    units.layout.apply({base}_panel.element,{{variant:'plot-card-fill'}});",
                    f"    const {base}_header=units.header.create({base}_panel.element,{{kind:'plot',variant:'plot-minimal',title:{_js(row['title'])},actions:false}});",
                    f"    const {base}_host=units.layout.create({base}_panel.element,{{variant:'plot-card-fill'}});",
                    f"    let {base}_points={_js(points)};",
                    f"    let {base}_artifact_id='',{base}_series_id='',{base}_artifact_revision=0;",
                    f"    const {base}_surface=units.scientificPlot.create({base}_host,{self._scientific_plot_spec_source(row, base)});",
                    f"    const {base}_view=units.plotView.adopt({_js('generated:'+row['id'])},{base}_panel.element,{{variant:'complete',title:{_js(row['title'])},plot:{base}_host,header:{base}_header.element,placements:{_js(row['placements'])},defaultPlacement:{_js(row['defaultPlacement'])},detailGeometry:{{contentMinHeightPx:{row['contentMinHeight']},contentMaxHeightPx:{row['contentMaxHeight']}}},stateVersion:'declarative-plot-view-v1',portableFactory:(id,node,pSpec)=>workbench?.portable?workbench.portable(id,node,pSpec):ctx.ui.portable.create(id,node,pSpec)}});",
                    f"    disposables.push({base}_view,{base}_surface);",
                ]
                continue
            if row["kind"] == "metrics":
                base = _var(row["id"])
                lines.append(f"    const {base}_host=units.layout.create(main,{{variant:'metric-grid'}});")
                for metric in row["items"]:
                    metric_base = _var(metric["id"])
                    lines.append(
                        f"    const {metric_base}_metric=units.metric.create({base}_host,{{variant:'standard',label:{_js(metric['label'])},value:{_js(metric['value'])}}});"
                    )
                    lines.append(f"    const {metric_base}_metric_value={metric_base}_metric.value;")
                continue
            if row["kind"] == "result-split":
                base = _var(row["id"])
                plot = row["plot"]
                table = row["table"]
                plot_base = _var(plot["id"])
                table_base = _var(table["id"])
                points = [{"x": pair[0], "y": pair[1]} for pair in plot["points"]]
                lines += [
                    f"    const {base}_plot_panel=units.panel.detached({{variant:'plot-card',header:false,sizing:'fill'}});",
                    f"    units.layout.apply({base}_plot_panel.body,{{variant:'plot-card-fill'}});",
                    f"    const {base}_plot_header=units.header.create({base}_plot_panel.body,{{kind:'plot',variant:'plot',title:{_js(plot['title'])},actions:false}});",
                    f"    const {plot_base}_host=units.layout.create({base}_plot_panel.body,{{variant:'plot-card-fill'}});",
                    f"    let {plot_base}_points={_js(points)};",
                    f"    let {plot_base}_artifact_id='',{plot_base}_series_id='',{plot_base}_artifact_revision=0;",
                    f"    const {plot_base}_surface=units.scientificPlot.create({plot_base}_host,{self._scientific_plot_spec_source(plot, plot_base)});",
                    f"    disposables.push({plot_base}_surface);",
                    f"    const {base}_table_host=units.layout.create(null,{{variant:'scroll-pane'}});",
                    f"    const {table_base}_surface=units.table.mount({_js(table['id'])},{base}_table_host,{{variant:'standard',columns:{_js(table['columns'])},rows:{_js(table['rows'])},persistKey:{_js(table['id']+'-declarative-v1')}}});",
                    f"    disposables.push({table_base}_surface);",
                    f"    const {base}_split=units.splitPane.create(main,{{id:{_js(row['id']+'-split-v1')},variant:'resizable',axis:{_js(row['axis'])},resizeTarget:{_js(row['resizeTarget'])},defaultSize:{row['defaultSize']},min:{row['min']},reserve:{row['reserve']},reflowBelow:{row['reflowBelow']},first:{base}_plot_panel.element,second:{base}_table_host}});",
                    f"    disposables.push({base}_split);",
                ]
                continue
            if row["kind"] == "table":
                base = _var(row["id"])
                lines += [
                    f"    const {base}_section=units.section.create(main,{{role:'controls',title:{_js(row['title'])}}});",
                    f"    const {base}_surface=units.table.mount({_js(row['id'])},{base}_section.body,{{variant:'standard',columns:{_js(row['columns'])},rows:{_js(row['rows'])},persistKey:{_js(row['id']+'-declarative-v1')}}});",
                    f"    disposables.push({base}_surface);",
                ]
                continue
            if row["kind"] == "plot-group":
                base = _var(row["id"])
                lines += [
                    f"    const {base}_section=units.section.create(main,{{variant:'plot-group',title:{_js(row['title'])}}});",
                    f"    const {base}_host=units.layout.create({base}_section.body,{{variant:'identity'}});",
                    f"    const {base}_group=units.plotGroup.create({base}_host,{{columns:{row['columns']},preferredColumns:{row['columns']},maxColumns:{row['maxColumns']},minItemWidth:{row['minItemWidth']},responsive:{str(row['responsive']).lower()},density:{_js(row['density'])}}});",
                    f"    disposables.push({base}_group);",
                ]
                for plot in row["plots"]:
                    plot_base = _var(plot["id"])
                    points = [{"x": pair[0], "y": pair[1]} for pair in plot["points"]]
                    lines += [
                        f"    let {plot_base}_points={_js(points)};",
                        f"    let {plot_base}_artifact_id='',{plot_base}_series_id='',{plot_base}_artifact_revision=0;",
                        f"    let {plot_base}_surface=null;",
                        f"    const {plot_base}_view={base}_group.addPlot({{id:{_js(plot['id'])},title:{_js(plot['title'])},placements:{_js(plot['placements'])},defaultPlacement:{_js(plot['defaultPlacement'])}" + (f",detailGeometry:{_js(plot['detailGeometry'])}" if plot.get("detailGeometry") else "") + f",render:host=>{{{plot_base}_surface=units.scientificPlot.create(host,{self._scientific_plot_spec_source(plot, plot_base)});return()=>{{try{{{plot_base}_surface?.dispose?.();}}catch{{}};{plot_base}_surface=null;}};}}}});",
                    ]
                continue
            points = [{"x": pair[0], "y": pair[1]} for pair in row["points"]]
            base = _var(row["id"])
            task_dynamic = any(
                projection["id"] == row["id"]
                for task in self._portable_tasks
                for projection in task.get("dynamic_table_plots", [])
            )
            lines += [
                f"    const {base}_panel=units.panel.create(main,{{variant:'plot-card',title:{_js(row['title'])},sizing:'content'}});",
                f"    const {base}_host=units.layout.create({base}_panel.body,{{variant:'plot-card-fill'}});",
            ]
            if task_dynamic:
                lines.append(f"    let {base}_task_curves=[];")
            if row.get("binding") is not None:
                binding = row["binding"]
                state_read = f"{_js(binding['statePath'].split('.'))}.reduce((value,key)=>value?.[key],state)"
                points_read = f"{_js(binding['pointsPath'].split('.'))}.reduce((value,key)=>value?.[key],row)"
                label_expr = f"String(row?.[{_js(binding['labelKey'])}]??id)" if binding.get("labelKey") else "id"
                color_expr = f"Number(row?.[{_js(binding['colorValueKey'])}])" if binding.get("colorValueKey") else "NaN"
                direction_expr = f"Number(row?.[{_js(binding['directionKey'])}])" if binding.get("directionKey") else "NaN"
                selected_id_read = (
                    f"{_js(binding['selectedIdPath'].split('.'))}.reduce((value,key)=>value?.[key],state)"
                    if binding.get("selectedIdPath") else "''"
                )
                markers = binding.get("markers")
                marker_state_read = (
                    f"{_js(markers['statePath'].split('.'))}.reduce((value,key)=>value?.[key],state)"
                    if markers is not None else "[]"
                )
                marker_selected_read = (
                    f"{_js(markers['selectedIdPath'].split('.'))}.reduce((value,key)=>value?.[key],state)"
                    if markers is not None and markers.get("selectedIdPath") else "''"
                )
                marker_map = "[]"
                if markers is not None:
                    marker_parts = [
                        f"id:String(marker?.[{_js(markers['idKey'])}]??('marker-'+index))",
                        f"entityId:String(marker?.[{_js(markers['idKey'])}]??('marker-'+index))",
                        f"curveId:String(marker?.[{_js(markers['curveIdKey'])}]??'')",
                        f"x:Number(marker?.[{_js(markers['xKey'])}])",
                        f"y:Number(marker?.[{_js(markers['yKey'])}])",
                        "source:marker",
                    ]
                    if markers.get("colorKey"):
                        marker_parts.append(f"color:String(marker?.[{_js(markers['colorKey'])}]??'')")
                    if markers.get("shapeKey"):
                        marker_parts.append(f"shape:String(marker?.[{_js(markers['shapeKey'])}]??'circle')")
                    if markers.get("lockedKey"):
                        marker_parts.append(f"locked:Boolean(marker?.[{_js(markers['lockedKey'])}])")
                    if markers.get("acceptedKey"):
                        marker_parts.append(f"accepted:marker?.[{_js(markers['acceptedKey'])}]!==false")
                    marker_map = (
                        f"Array.isArray(markerRows)?markerRows.map((marker,index)=>({{{','.join(marker_parts)}}}))"
                        + ".filter(marker=>marker.id&&marker.curveId&&Number.isFinite(marker.x)&&Number.isFinite(marker.y)):[]"
                    )
                lines += [
                    f"    let {base}_curves=[];",
                    f"    let {base}_selected_id='';",
                    f"    let {base}_markers=[];",
                    f"    let {base}_selected_marker_id='';",
                    f"    let {base}_artifact_id='',{base}_series_id='',{base}_artifact_revision=0;",
                    f"    const {base}_surface=units.scientificPlot.create({base}_host,{self._scientific_plot_spec_source(row, base)});",
                    f"    liveBindings.push(state=>{{const rows={state_read};{base}_curves=Array.isArray(rows)?rows.map((row,index)=>{{const id=String(row?.[{_js(binding['idKey'])}]??('curve-'+index));const rawPoints={points_read};const points=Array.isArray(rawPoints)?rawPoints.map(point=>({{x:Number(point?.[{_js(binding['xKey'])}]),y:Number(point?.[{_js(binding['yKey'])}])}})).filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)):[];const curve={{id,entityId:id,label:{label_expr},points,source:row}};const colorValue={color_expr};if(Number.isFinite(colorValue))curve.colorValue=colorValue;const direction={direction_expr};if(Number.isFinite(direction))curve.direction=direction;return curve;}}):[];{base}_selected_id=String({selected_id_read}??'');const markerRows={marker_state_read};{base}_markers={marker_map};{base}_selected_marker_id=String({marker_selected_read}??'');{base}_surface.requestRender?.('domain-adapter');}});",
                    f"    disposables.push({base}_surface);",
                ]
            else:
                lines += [
                    f"    let {base}_points={_js(points)};",
                    f"    let {base}_artifact_id='',{base}_series_id='',{base}_artifact_revision=0;",
                    f"    const {base}_surface=units.scientificPlot.create({base}_host,{self._scientific_plot_spec_source(row, base)});",
                    f"    disposables.push({base}_surface);",
                ]
        return lines

    def render_plugin_js(self) -> str:
        manifest = self.manifest()
        page = self.spec["page"]
        workspace = self.spec["workspace"]
        host = self.spec["host"]
        hosted = host["kind"] in {"top", "tool"}
        page_options = {
            "id": page["id"],
            "label": page["label"],
            "title": page["title"],
            "order": manifest["order"],
            "html": "",
        }
        if hosted:
            page_options["pageId"] = host["pageId"]
            page_options["activity"] = workspace["activity"]
            page_options["toolbar"] = False
        close_target = host["pageId"] if hosted else page["id"]
        page_header_close = (
            f",close:true,onClose:()=>ctx.workspace.closePage({_js(close_target)})"
            if hosted and page["close"]
            else ""
        )

        lines = [
            "(() => {",
            f"  const manifest={_js(manifest)};",
            "  DKDSPlugins.define(manifest, async ctx => {",
            "    const units=ctx.ui.unitTemplates;",
            "    if(!units)throw new Error('Declarative plugin requires ui.unit-templates.');",
        ]
        if hosted:
            lines += [
                "    ctx.ui.activities.add({"
                + f"id:{_js(workspace['activity'])},label:{_js(host['label'])},contextLabel:{_js(host['contextLabel'])},"
                + f"icon:{_js(host['icon'])},order:{manifest['order']},primary:true,openMode:'window',"
                + f"artifactHydration:{_js(host['window']['artifactHydration'])},description:{_js(manifest['description'])},"
                + f"onActivate:()=>ctx.workspace.openPage({_js(host['pageId'])})"
                + "});",
            ]
        lines += [
            f"    const page=ctx.ui.pages.add({_js(page_options)});",
            "    const pageHeader=units.pageHeader.create(page,{"
            + f"variant:'page-owned',activity:{_js(workspace['activity'])},title:{_js(page['title'])},subtitle:{_js(page['subtitle'])},"
            + f"actions:{self._action_source(page['actionIds'])}"
            + page_header_close
            + "});",
            "    units.layout.create(pageHeader.actions,{tagName:'span',variant:'identity',dataset:{dkdsSlot:'workbench-import'}});",
            f"    const body=units.page.create(page,{{variant:{_js(page['variant'])}}}).element;",
            "    const workspaceHost=units.layout.create(body,{variant:'identity'});",
            "    const workbench=units.workspace.create(workspaceHost,{"
            + f"variant:'standard',header:false,activity:{_js(workspace['activity'])},primaryScroll:{_js(workspace['primaryScroll'])}"
            + (f",leftWidth:{workspace['leftWidth']}" if workspace.get("leftWidth") is not None else "")
            + (f",leftMin:{workspace['leftMin']}" if workspace.get("leftMin") is not None else "")
            + (f",leftReserve:{workspace['leftReserve']}" if workspace.get("leftReserve") is not None else "")
            + (",primaryEndInset:{mode:'content'}" if workspace.get("primaryEndInset") == "content" else "")
            + f",layoutStateVersion:{_js(workspace['layoutStateVersion'])}"
            + "});",
            "    const disposables=[];",
        ]
        if self.spec.get("domainAdapter") is not None:
            domain_adapter = self.spec["domainAdapter"]
            domain_surfaces = [
                surface["id"]
                for surface in self.spec.get("surfaces", [])
                if any(action.get("domainAction") for action in surface.get("actions", []))
            ]
            lines += [
                f"    const liveDomain=ctx.services.domain.connect({_js(domain_adapter['ref'])});",
                "    const liveBindings=[];",
                "    const refreshLiveBindings=()=>{let state={};try{if(liveDomain.available())state=liveDomain.snapshot()?.state||{};}catch{}for(const bind of liveBindings){try{bind(state);}catch(error){console.warn('[DKDS declarative live binding]',error);}}};",
            ]
        lines += self._parameter_source()
        lines += self._source_picker_source()
        lines += self._interaction_source()
        lines += self._content_source()
        lines += self._surface_source()
        lines += self._task_handlers_source()
        lines += self._command_registration_source()
        lines += [
            "    workbench.compose({primary:{"
            + f"id:'main',label:{_js(workspace['primaryLabel'])},presentationRole:{_js(workspace['primaryRole'])},"
            + f"scroll:{_js(workspace['primaryScroll'])},titlePolicy:'host-only',mainNode:main"
            + "},primes,subs});",
        ]
        if self.spec.get("domainAdapter") is not None:
            lines += [
                "    refreshLiveBindings();",
                f"    const offLiveDomain=liveDomain.subscribe(()=>{{refreshLiveBindings();for(const id of {_js(domain_surfaces)})workbench.primes?.get?.(id)?.actionGroup?.render?.();}},{{immediate:false}});",
                "    disposables.push({dispose:offLiveDomain});",
            ]
        if hosted:
            top_primes = []
            parameters = self.spec.get("parameters")
            if parameters is not None:
                top_primes.append({
                    "id": parameters["id"],
                    "label": parameters["label"],
                    "semanticKind": "panel",
                    "presentationPurpose": "parameters",
                    "presentationRole": "data-control",
                    "priority": parameters["priority"],
                    "collapsible": True,
                })
            for surface in self.spec.get("surfaces", []):
                surface_meta = {
                    "id": surface["id"],
                    "label": surface["label"],
                    "semanticKind": surface["semanticKind"],
                    "presentationPurpose": surface["presentationPurpose"],
                    "presentationRole": surface["presentationRole"],
                    "priority": surface["priority"],
                    "collapsible": surface["collapsible"],
                }
                if surface["role"] == "prime":
                    top_primes.append(surface_meta)
            top_subs = [
                {
                    "id": surface["id"],
                    "label": surface["label"],
                    "semanticKind": surface["semanticKind"],
                    "presentationRole": surface["presentationRole"],
                    "priority": surface["priority"],
                    "collapsible": surface["collapsible"],
                }
                for surface in self.spec.get("surfaces", [])
                if surface["role"] == "sub"
            ]
            layout = {
                "mode": "native",
                "root": {"selector": f"#{host['pageId']} .dkds-plugin-workspace"},
                "primary": {
                    "id": "main",
                    "role": "analysis-primary",
                    "presentationRole": workspace["primaryRole"],
                    "priority": 100,
                    "collapsible": False,
                },
                "prime": top_primes,
                "sub": top_subs,
            }
            lines += [
                "    ctx.ui.topWorkspace.register({"
                + f"id:{_js(workspace['activity'])},activity:{_js(workspace['activity'])},label:{_js(host['label'])},icon:{_js(host['icon'])},layout:{_js(layout)}"
                + "});",
            ]
        lines += [
            "    return {deactivate(){for(const item of disposables.reverse())try{item?.dispose?.();}catch{};workbench?.dispose?.();}};",
            "  });",
            "})();",
            "",
        ]
        return "\n".join(lines)

    def render_readme(self) -> str:
        plugin = self.spec["plugin"]
        return (
            f"# {plugin['name']}\n\n"
            "Generated by sdk/python/dkds_plugin_gen.py from the Phase F declarative schema.\n"
            "The generated runtime uses only Plugin API 1.19, Core Task Runner and public Unit Templates; it ships no private CSS.\n"
            "Python is authoring-time input only; generated packages contain JavaScript tasks and require no Python backend.\n"
        )

    def package(self) -> Dict[str, Any]:
        files: Dict[str, str] = {"plugin.js": self.render_plugin_js(), "README.md": self.render_readme()}
        for row in self._portable_tasks:
            compiled: CompiledPortableTask = row["compiled"]
            files[compiled.entry] = compiled.source
        return {"schema": 1, "manifest": self.manifest(), "files": files}

    def write(self, output: str | Path) -> Path:
        target = Path(output)
        target.mkdir(parents=True, exist_ok=True)
        package = self.package()
        (target / "plugin.json").write_text(json.dumps(package["manifest"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        for name, source in package["files"].items():
            (target / name).write_text(source, encoding="utf-8")
        return target


def _load_spec(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate a DK Data Studio Unit-first plugin")
    sub = parser.add_subparsers(dest="command", required=True)
    build = sub.add_parser("build", help="build from a declarative JSON spec")
    build.add_argument("spec", type=Path)
    build.add_argument("output", type=Path)
    check = sub.add_parser("check", help="validate a declarative JSON spec")
    check.add_argument("spec", type=Path)
    args = parser.parse_args(list(argv) if argv is not None else None)
    try:
        builder = PluginBuilder(_load_spec(args.spec))
        if args.command == "check":
            print(f"DKDS declarative spec OK: {builder.spec['plugin']['id']}@{builder.spec['plugin']['version']}")
            return 0
        builder.write(args.output)
        print(f"Generated DKDS plugin: {builder.spec['plugin']['id']}@{builder.spec['plugin']['version']} -> {args.output}")
        return 0
    except (OSError, json.JSONDecodeError, SpecError, PortableTaskError) as exc:
        print(f"DKDS generator error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
