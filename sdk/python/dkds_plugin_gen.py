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
        allowed = {"schema", "plugin", "page", "workspace", "data", "actions", "parameters", "interaction", "content"}
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

        page = _expect_object(spec.get("page"), "page")
        extra = sorted(set(page) - {"id", "label", "title", "subtitle", "variant"})
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
        }

        workspace = _expect_object(spec.get("workspace"), "workspace")
        extra = sorted(set(workspace) - {"activity", "primaryRole", "primaryLabel", "primaryScroll"})
        if extra:
            raise SpecError(f"unsupported workspace fields: {', '.join(extra)}")
        role = str(workspace.get("primaryRole", ""))
        if role not in PRIMARY_ROLES:
            raise SpecError(f"workspace.primaryRole must be one of {sorted(PRIMARY_ROLES)}")
        scroll = str(workspace.get("primaryScroll", "safe"))
        if scroll not in {"safe", "contained"}:
            raise SpecError("workspace.primaryScroll must be safe or contained")
        normalized_workspace = {
            "activity": _ident(workspace.get("activity"), "workspace.activity"),
            "primaryRole": role,
            "primaryLabel": str(workspace.get("primaryLabel", "主界面")),
            "primaryScroll": scroll,
        }

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
            extra = sorted(set(row) - {"id", "label", "variant", "statusMessage"})
            if extra:
                raise SpecError(f"unsupported action fields at {index}: {', '.join(extra)}")
            action = {
                "id": _ident(row.get("id"), f"actions[{index}].id"),
                "label": _nonempty(row.get("label"), f"actions[{index}].label"),
                "statusMessage": _nonempty(row.get("statusMessage"), f"actions[{index}].statusMessage"),
            }
            if "variant" in row:
                action_variant = str(row["variant"])
                if action_variant not in ACTION_VARIANTS:
                    raise SpecError(f"actions[{index}].variant is invalid")
                action["variant"] = action_variant
            actions.append(action)
        if len(actions) > 8:
            raise SpecError("actions supports at most 8 entries")

        parameters = None
        if spec.get("parameters") is not None:
            row = _expect_object(spec["parameters"], "parameters")
            extra = sorted(set(row) - {"id", "label", "fields"})
            if extra:
                raise SpecError(f"unsupported parameters fields: {', '.join(extra)}")
            fields = []
            for index, field in enumerate(_expect_list(row.get("fields"), "parameters.fields")):
                field = _expect_object(field, f"parameters.fields[{index}]")
                extra = sorted(set(field) - {"id", "type", "label", "value", "step", "options"})
                if extra:
                    raise SpecError(f"unsupported parameter field keys at {index}: {', '.join(extra)}")
                kind = str(field.get("type", ""))
                if kind not in FIELD_TYPES:
                    raise SpecError(f"parameters.fields[{index}].type is invalid")
                normalized = {
                    "id": _ident(field.get("id"), f"parameters.fields[{index}].id"),
                    "type": kind,
                    "label": _nonempty(field.get("label"), f"parameters.fields[{index}].label"),
                }
                if "value" in field:
                    normalized["value"] = field["value"]
                if "step" in field:
                    normalized["step"] = field["step"]
                if kind == "select":
                    options = _expect_list(field.get("options"), f"parameters.fields[{index}].options")
                    if not options:
                        raise SpecError("select fields require at least one option")
                    normalized["options"] = []
                    for option in options:
                        option = _expect_object(option, "select option")
                        if set(option) - {"value", "label"}:
                            raise SpecError("select option supports only value and label")
                        normalized["options"].append({
                            "value": option.get("value"),
                            "label": _nonempty(option.get("label"), "select option label"),
                        })
                elif "options" in field:
                    raise SpecError("options are only valid for select fields")
                fields.append(normalized)
            if not fields:
                raise SpecError("parameters.fields must not be empty")
            parameters = {
                "id": _ident(row.get("id"), "parameters.id"),
                "label": _nonempty(row.get("label"), "parameters.label"),
                "fields": fields,
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
                extra = sorted(set(row) - {"kind", "id", "title", "xTitle", "yTitle", "source", "points", "selectionTarget", "identity", "axisSemantics", "viewport", "legend"})
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
                content.append({
                    "kind": "plot",
                    "id": _ident(row.get("id"), f"content[{index}].id"),
                    "title": _nonempty(row.get("title"), f"content[{index}].title"),
                    "xTitle": str(row.get("xTitle", "")),
                    "yTitle": str(row.get("yTitle", "")),
                    "source": str(row.get("source") or row.get("id")),
                    "points": points,
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
                    extra = sorted(set(plot) - {"id", "title", "xTitle", "yTitle", "source", "points", "selectionTarget", "identity", "axisSemantics", "viewport", "legend"})
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
                    plots.append({
                        "id": _ident(plot.get("id"), f"content[{index}].plots[{p_index}].id"),
                        "title": _nonempty(plot.get("title"), f"content[{index}].plots[{p_index}].title"),
                        "xTitle": str(plot.get("xTitle", "")),
                        "yTitle": str(plot.get("yTitle", "")),
                        "source": str(plot.get("source") or plot.get("id")),
                        "points": points,
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
                raise SpecError(f"content[{index}].kind must be note, plot, plot-group or table")
        if not content:
            raise SpecError("content must not be empty")

        return {
            "schema": SCHEMA,
            "plugin": normalized_plugin,
            "page": normalized_page,
            "workspace": normalized_workspace,
            "data": normalized_data,
            "actions": actions,
            "parameters": parameters,
            "interaction": normalized_interaction,
            "content": content,
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
        publish_tables: List[Dict[str, Any]] | None = None,
        domain_command: Dict[str, Any] | None = None,
        success_status: str = "任务完成",
        function_name: str | None = None,
    ) -> "PluginBuilder":
        """Bind authoring-time Python to the existing Core Task Runner.

        Python is lowered immediately to JavaScript. Runtime inputs may come from
        parameter Units or bounded columns of plugin-scoped Artifact sources.
        One task may project multiple result arrays into Unit Plot/Table surfaces
        and publish multiple declared canonical DataTable Artifacts with lineage.
        """
        compiled = compile_portable_task(task_id, function, function_name=function_name)
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
            if kind != "artifact-column":
                raise SpecError(f"input_bindings[{argument}].kind must be parameter or artifact-column")

            extra = sorted(set(binding) - {"kind", "source", "column", "maxRows"})
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
            max_rows = int(binding.get("maxRows", 65536))
            if max_rows < 1 or max_rows > 65536:
                raise SpecError(f"input_bindings[{argument}].maxRows must be in 1..65536")
            bindings[argument] = {
                "kind": "artifact-column",
                "source": normalized_source,
                "column": normalized_column,
                "maxRows": max_rows,
            }

        plot_lookup: Dict[str, Dict[str, Any]] = {}
        table_lookup: Dict[str, Dict[str, Any]] = {}
        for content_row in self.spec["content"]:
            if content_row["kind"] == "plot":
                plot_lookup[content_row["id"]] = content_row
            elif content_row["kind"] == "plot-group":
                for plot in content_row["plots"]:
                    plot_lookup[plot["id"]] = plot
            elif content_row["kind"] == "table":
                table_lookup[content_row["id"]] = content_row

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
            "publish_tables": normalized_publish_tables,
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

    def _task_handlers_source(self) -> List[str]:
        lines: List[str] = []
        action_lookup = {row["id"]: row for row in self.spec["actions"]}
        table_lookup = {row["id"]: row for row in self.spec["content"] if row["kind"] == "table"}
        plot_lookup: Dict[str, Dict[str, Any]] = {}
        for content_row in self.spec["content"]:
            if content_row["kind"] == "plot":
                plot_lookup[content_row["id"]] = content_row
            elif content_row["kind"] == "plot-group":
                for plot in content_row["plots"]:
                    plot_lookup[plot["id"]] = plot

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
                column = binding["column"]
                max_rows = binding["maxRows"]
                token = re.sub(r"[^A-Za-z0-9_]", "_", argument)
                lines += [
                    f"        const __dkdsSources_{token}=ctx.data.sources.list().filter(row=>"
                    + ("true" if source["includeExcluded"] else "!row?.excluded")
                    + f"&&(!{_js(source['semanticType'])}||String(row?.semanticType||'')==={_js(source['semanticType'])})"
                    + f"&&(!{_js(source['kind'])}||String(row?.kind||'')==={_js(source['kind'])}));",
                    f"        const __dkdsExplicitSource_{token}=String(__dkdsCanonical?.sources?.[{_js(argument)}]||'');",
                    f"        const __dkdsSource_{token}=__dkdsExplicitSource_{token}?__dkdsSources_{token}.find(row=>String(row?.artifactId||'')===__dkdsExplicitSource_{token}):__dkdsSources_{token}[{source['index']}];",
                    f"        if(!__dkdsSource_{token}?.artifactId)throw new Error({_js('No scoped source matches artifact binding for '+argument)});",
                    f"        const __dkdsColumns_{token}=ctx.data.artifacts.columnMetadata(__dkdsSource_{token}.artifactId)||[];",
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
                    f"        const __dkdsCaptureSources_{token}=ctx.data.sources.list().filter(row=>"
                    + ("true" if source["includeExcluded"] else "!row?.excluded")
                    + f"&&(!{_js(source['semanticType'])}||String(row?.semanticType||'')==={_js(source['semanticType'])})"
                    + f"&&(!{_js(source['kind'])}||String(row?.kind||'')==={_js(source['kind'])}));",
                    f"        const __dkdsCaptureSource_{token}=__dkdsCaptureSources_{token}[{source['index']}];",
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
                "    }}});",
            ]
        return lines

    def manifest(self) -> Dict[str, Any]:
        has_plot = any(row["kind"] in {"plot", "plot-group"} for row in self.spec["content"])
        has_plot_group = any(row["kind"] == "plot-group" for row in self.spec["content"])
        has_table = any(row["kind"] == "table" for row in self.spec["content"])
        has_artifact_input = any(
            binding["kind"] == "artifact-column"
            for task in self._portable_tasks
            for binding in task["input_bindings"].values()
        )
        has_artifact_output = any(bool(task["publish_tables"]) for task in self._portable_tasks)
        has_interaction = self.spec.get("interaction") is not None
        has_domain_commands = any(task.get("domain_command") is not None for task in self._portable_tasks)
        has_stable_plot_identity = any(
            plot.get("identity") is not None
            for row in self.spec["content"]
            for plot in ([row] if row["kind"] == "plot" else row.get("plots", []) if row["kind"] == "plot-group" else [])
        )
        requires = ["status", "ui.workspace", "ui.unit-templates", "ui.pages"]
        capabilities = ["ui.page", "ui.plugin-workspace"]
        if has_plot:
            requires.append("ui.scientific-plot")
            capabilities.append("ui.scientific-plot")
        if has_plot_group:
            requires.extend(["ui.group-area", "ui.plot-views"])
            capabilities.append("ui.group-area")
        if has_table:
            requires.append("ui.table")
            capabilities.append("ui.table")
        if self._portable_tasks:
            requires.append("execution.tasks")
        if has_interaction:
            requires.extend(["ui.selection", "ui.interaction"])
            capabilities.append("ui.interaction")
        if has_domain_commands:
            requires.append("execution.commands")
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
            "pluginType": "workbench",
            "data": self.spec["data"],
        }
        if self._portable_tasks:
            manifest["tasks"] = [
                {"id": row["compiled"].task_id, "entry": row["compiled"].entry}
                for row in self._portable_tasks
            ]
        return manifest

    def _action_source(self) -> str:
        rows = []
        for action in self.spec["actions"]:
            variant = f",variant:{_js(action['variant'])}" if action.get("variant") else ""
            task = self._task_for_action(action["id"])
            if task is not None:
                if task.get("domain_command") is not None:
                    invoke = f"()=>ctx.commands.run({_js(task['domain_command']['id'])},{{}})"
                else:
                    invoke = f"()=>{self._task_handler_name(task['compiled'].task_id)}()"
            else:
                invoke = f"()=>{{ctx.status.set({_js(action['statusMessage'])});return true;}}"
            rows.append(
                "{id:%s,label:%s%s,onInvoke:%s}"
                % (_js(action["id"]), _js(action["label"]), variant, invoke)
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

    def _parameter_source(self) -> List[str]:
        parameters = self.spec.get("parameters")
        if not parameters:
            return ["    const primes=[];"]
        lines = [
            "    const controlsHost=units.layout.create(null,{variant:'stack-comfortable'});",
            f"    const parameterPanel=units.panel.create(controlsHost,{{variant:'headed',title:{_js(parameters['label'])},sizing:'content'}});",
            "    const parameterGrid=units.layout.create(parameterPanel.body,{variant:'form-grid-2'});",
        ]
        for field in parameters["fields"]:
            name = _var(field["id"])
            if field["type"] == "checkbox":
                checked = bool(field.get("value", False))
                lines.append(
                    f"    const {name}=units.check.create(parameterGrid,{{variant:'checkbox',label:{_js(field['label'])},checked:{str(checked).lower()}}});"
                )
            elif field["type"] == "select":
                value = field.get("value", field["options"][0]["value"])
                lines.append(
                    f"    const {name}=units.field.create(parameterGrid,{{variant:'select',kind:'select',label:{_js(field['label'])},value:{_js(value)},options:{_js(field['options'])}}});"
                )
            else:
                input_type = "number" if field["type"] == "number" else "text"
                parts = ["variant:'input'", f"label:{_js(field['label'])}", f"inputType:{_js(input_type)}"]
                if "value" in field:
                    parts.append(f"value:{_js(field['value'])}")
                if field["type"] == "number":
                    parts.append(f"step:{_js(field.get('step', 'any'))}")
                lines.append(f"    const {name}=units.field.create(parameterGrid,{{{','.join(parts)}}});")
        lines += [
            "    const parameterPrime=units.prime.build({"
            + f"id:{_js(parameters['id'])},label:{_js(parameters['label'])},"
            + "variant:'fixed-titleless',presentationRole:'data-control',presentationPurpose:'parameters',"
            + "semanticKind:'panel',priority:90,collapsible:true,fixed:true,header:false,"
            + "existingNode:controlsHost,sizing:'fill',autoOpen:true,defaultPlacement:'left',placements:['left'],"
            + "stateVersion:'declarative-v1'});",
            "    const primes=[parameterPrime];",
        ]
        return lines

    def _scientific_plot_spec_source(self, row: Dict[str, Any], base: str) -> str:
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
            "variant:'curve'",
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
        lines = ["    const main=units.layout.create(null,{variant:'stack-comfortable'});"]
        for row in self.spec["content"]:
            if row["kind"] == "note":
                lines.append(f"    units.note.create(main,{{variant:{_js(row['variant'])},text:{_js(row['text'])}}});")
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
                        f"    const {plot_base}_view={base}_group.addPlot({{id:{_js(plot['id'])},title:{_js(plot['title'])},placements:['home','left','right','bottom','float','global'],defaultPlacement:'home',render:host=>{{{plot_base}_surface=units.scientificPlot.create(host,{self._scientific_plot_spec_source(plot, plot_base)});return()=>{{try{{{plot_base}_surface?.dispose?.();}}catch{{}};{plot_base}_surface=null;}};}}}});",
                    ]
                continue
            points = [{"x": pair[0], "y": pair[1]} for pair in row["points"]]
            base = _var(row["id"])
            lines += [
                f"    const {base}_panel=units.panel.create(main,{{variant:'plot-card',title:{_js(row['title'])},sizing:'content'}});",
                f"    const {base}_host=units.layout.create({base}_panel.body,{{variant:'plot-card-fill'}});",
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
        lines = [
            "(() => {",
            f"  const manifest={_js(manifest)};",
            "  DKDSPlugins.define(manifest, async ctx => {",
            "    const units=ctx.ui.unitTemplates;",
            "    if(!units)throw new Error('Declarative plugin requires ui.unit-templates.');",
            f"    const page=ctx.ui.pages.add({{id:{_js(page['id'])},label:{_js(page['label'])},title:{_js(page['title'])},order:{manifest['order']},html:''}});",
            f"    const pageHeader=units.pageHeader.create(page,{{variant:'page-owned',title:{_js(page['title'])},subtitle:{_js(page['subtitle'])},actions:{self._action_source()}}});",
            "    units.layout.create(pageHeader.actions,{tagName:'span',variant:'identity',dataset:{dkdsSlot:'workbench-import'}});",
            f"    const body=units.page.create(page,{{variant:{_js(page['variant'])}}}).element;",
            "    const workspaceHost=units.layout.create(body,{variant:'identity'});",
            f"    const workbench=units.workspace.create(workspaceHost,{{variant:'standard',header:false,activity:{_js(workspace['activity'])},primaryScroll:{_js(workspace['primaryScroll'])}}});",
            "    const disposables=[];",
        ]
        lines += self._parameter_source()
        lines += self._interaction_source()
        lines += self._content_source()
        lines += self._task_handlers_source()
        lines += self._command_registration_source()
        lines += [
            "    workbench.compose({primary:{"
            + f"id:'main',label:{_js(workspace['primaryLabel'])},presentationRole:{_js(workspace['primaryRole'])},"
            + f"scroll:{_js(workspace['primaryScroll'])},titlePolicy:'host-only',mainNode:main"
            + "},primes,subs:[]});",
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

    def write(self, output: str | Path) -> Path:
        target = Path(output)
        target.mkdir(parents=True, exist_ok=True)
        (target / "plugin.json").write_text(json.dumps(self.manifest(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (target / "plugin.js").write_text(self.render_plugin_js(), encoding="utf-8")
        for row in self._portable_tasks:
            compiled: CompiledPortableTask = row["compiled"]
            (target / compiled.entry).write_text(compiled.source, encoding="utf-8")
        (target / "README.md").write_text(self.render_readme(), encoding="utf-8")
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
