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
        allowed = {"schema", "plugin", "page", "workspace", "data", "actions", "parameters", "content"}
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
                extra = sorted(set(row) - {"kind", "id", "title", "xTitle", "yTitle", "source", "points"})
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
                raise SpecError(f"content[{index}].kind must be note, plot or table")
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
        success_status: str = "任务完成",
        function_name: str | None = None,
    ) -> "PluginBuilder":
        """Bind authoring-time Python to the existing Core Task Runner.

        Python is lowered immediately to JavaScript. Runtime inputs may come from
        parameter Units or bounded columns of the plugin-scoped Artifact source
        catalog. Result projection may update Unit Plot/Table surfaces and/or
        publish one canonical DataTable Artifact with lineage.
        """
        compiled = compile_portable_task(task_id, function, function_name=function_name)
        action_ids = {row["id"] for row in self.spec["actions"]}
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

        plot_ids = {row["id"] for row in self.spec["content"] if row["kind"] == "plot"}
        table_ids = {row["id"] for row in self.spec["content"] if row["kind"] == "table"}
        if result_plot is not None and result_plot not in plot_ids:
            raise SpecError(f"portable task result_plot not found: {result_plot}")
        if result_table is not None and result_table not in table_ids:
            raise SpecError(f"portable task result_table not found: {result_table}")
        for key_name, key_value in (("result_key", result_key), ("result_rows_key", result_rows_key)):
            if not IDENT.fullmatch(str(key_value or "").replace("-", "_")):
                raise SpecError(f"invalid portable task {key_name}: {key_value}")

        normalized_publish = None
        if publish_table is not None:
            row = _expect_object(publish_table, "publish_table")
            extra = sorted(set(row) - {"id", "name", "semanticType", "columns"})
            if extra:
                raise SpecError(f"unsupported publish_table fields: {', '.join(extra)}")
            semantic_type = _nonempty(row.get("semanticType"), "publish_table.semanticType")
            if semantic_type not in self.spec["data"].get("produces", []):
                raise SpecError("publish_table.semanticType must be declared in data.produces")
            columns = []
            for index, column in enumerate(_expect_list(row.get("columns"), "publish_table.columns")):
                column = _expect_object(column, f"publish_table.columns[{index}]")
                extra = sorted(set(column) - {"key", "name", "unit", "role", "resultKey"})
                if extra:
                    raise SpecError(f"unsupported publish_table column fields at {index}: {', '.join(extra)}")
                columns.append({
                    "key": _ident(column.get("key"), f"publish_table.columns[{index}].key"),
                    "name": _nonempty(column.get("name", column.get("key")), f"publish_table.columns[{index}].name"),
                    "unit": str(column.get("unit", "")),
                    "role": str(column.get("role", "")),
                    "resultKey": _ident(column.get("resultKey", column.get("key")), f"publish_table.columns[{index}].resultKey"),
                })
            if not columns:
                raise SpecError("publish_table.columns must not be empty")
            normalized_publish = {
                "id": _ident(row.get("id"), "publish_table.id"),
                "name": _nonempty(row.get("name"), "publish_table.name"),
                "semanticType": semantic_type,
                "columns": columns,
            }

        if any(row["compiled"].task_id == compiled.task_id for row in self._portable_tasks):
            raise SpecError(f"duplicate portable task id: {compiled.task_id}")
        if any(row["action_id"] == action_id for row in self._portable_tasks):
            raise SpecError(f"action already bound to a portable task: {action_id}")

        self._portable_tasks.append({
            "compiled": compiled,
            "action_id": action_id,
            "input_bindings": bindings,
            "result_plot": result_plot,
            "result_key": str(result_key),
            "result_table": result_table,
            "result_rows_key": str(result_rows_key),
            "publish_table": normalized_publish,
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
        for row in self._portable_tasks:
            compiled: CompiledPortableTask = row["compiled"]
            handler = self._task_handler_name(compiled.task_id)
            action = action_lookup[row["action_id"]]
            lines += [
                f"    async function {handler}(){{",
                f"      ctx.status.set({_js(action['statusMessage'])});",
                "      try{",
                "        const __dkdsPayload={};",
                "        const __dkdsParameters={};",
                "        const __dkdsSourceIds=[];",
            ]
            for argument, binding in row["input_bindings"].items():
                if binding["kind"] == "parameter":
                    expression = self._field_read_expr(binding["field"])
                    lines += [
                        f"        __dkdsPayload[{_js(argument)}]={expression};",
                        f"        __dkdsParameters[{_js(argument)}]=__dkdsPayload[{_js(argument)}];",
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
                    f"        const __dkdsSource_{token}=__dkdsSources_{token}[{source['index']}];",
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
            lines += [
                f"        const handle=ctx.tasks.submit({_js(compiled.task_id)},__dkdsPayload,{{key:{_js('generated-'+compiled.task_id)},latest:true}});",
                "        const result=await handle.promise;",
            ]
            if row["result_plot"] is not None:
                base = _var(row["result_plot"])
                key = row["result_key"]
                lines += [
                    f"        if(!Array.isArray(result?.[{_js(key)}]))throw new Error({_js('Generated task result.'+key+' must be an array')});",
                    f"        {base}_points=result[{_js(key)}];",
                    f"        {base}_surface.requestRender?.();",
                ]
            if row["result_table"] is not None:
                table = table_lookup[row["result_table"]]
                base = _var(row["result_table"])
                key = row["result_rows_key"]
                lines += [
                    f"        if(!Array.isArray(result?.[{_js(key)}]))throw new Error({_js('Generated task result.'+key+' must be an array')});",
                    f"        {base}_surface.setData({_js(table['columns'])},result[{_js(key)}]);",
                ]
            publish = row["publish_table"]
            if publish is not None:
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
                lines += [
                    "        const __dkdsLengths=["
                    + ",".join(f"result[{_js(column['resultKey'])}].length" for column in publish["columns"])
                    + "];",
                    "        if(new Set(__dkdsLengths).size>1)throw new Error('Published DataTable result columns must have equal lengths.');",
                    "        const __dkdsArtifact=ctx.data.model.createTable({"
                    + f"id:{_js(publish['id'])},name:{_js(publish['name'])},semanticType:{_js(publish['semanticType'])},"
                    + "columns:[" + ",".join(column_rows) + "],"
                    + f"lineage:{{parents:__dkdsSourceIds,role:'analysis',producer:manifest.id,operation:{_js(compiled.task_id)},parameters:__dkdsParameters}}"
                    + "});",
                    "        ctx.data.artifacts.publish(__dkdsArtifact);",
                ]
            lines += [
                f"        ctx.status.set({_js(row['success_status'])});",
                "        return true;",
                "      }catch(error){",
                "        ctx.status.set(String(error?.message||error||'任务失败'));",
                "        throw error;",
                "      }",
                "    }",
            ]
        return lines

    def manifest(self) -> Dict[str, Any]:
        has_plot = any(row["kind"] == "plot" for row in self.spec["content"])
        has_table = any(row["kind"] == "table" for row in self.spec["content"])
        has_artifact_input = any(
            binding["kind"] == "artifact-column"
            for task in self._portable_tasks
            for binding in task["input_bindings"].values()
        )
        has_artifact_output = any(task["publish_table"] is not None for task in self._portable_tasks)
        requires = ["status", "ui.workspace", "ui.unit-templates", "ui.pages"]
        capabilities = ["ui.page", "ui.plugin-workspace"]
        if has_plot:
            requires.append("ui.scientific-plot")
            capabilities.append("ui.scientific-plot")
        if has_table:
            requires.append("ui.table")
            capabilities.append("ui.table")
        if self._portable_tasks:
            requires.append("execution.tasks")
        if has_artifact_input:
            requires.extend(["data.sources", "data.artifacts"])
            capabilities.append("data.scoped-sources")
        if has_artifact_output:
            if "data.artifacts" not in requires:
                requires.append("data.artifacts")
            requires.append("data.model")
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
                invoke = f"()=>{self._task_handler_name(task['compiled'].task_id)}()"
            else:
                invoke = f"()=>{{ctx.status.set({_js(action['statusMessage'])});return true;}}"
            rows.append(
                "{id:%s,label:%s%s,onInvoke:%s}"
                % (_js(action["id"]), _js(action["label"]), variant, invoke)
            )
        return "[" + ",".join(rows) + "]"

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

    def _content_source(self) -> List[str]:
        lines = ["    const main=units.layout.create(null,{variant:'stack-comfortable'});", "    const disposables=[];"]
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
            points = [{"x": pair[0], "y": pair[1]} for pair in row["points"]]
            base = _var(row["id"])
            lines += [
                f"    const {base}_panel=units.panel.create(main,{{variant:'plot-card',title:{_js(row['title'])},sizing:'content'}});",
                f"    const {base}_host=units.layout.create({base}_panel.body,{{variant:'plot-card-fill'}});",
                f"    let {base}_points={_js(points)};",
                f"    const {base}_surface=units.scientificPlot.create({base}_host,{{variant:'curve',source:{_js(row['source'])},xTitle:{_js(row['xTitle'])},yTitle:{_js(row['yTitle'])},getCurves:()=>[{{id:{_js(row['id'])},points:{base}_points}}],getMarkers:()=>[]}});",
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
        ]
        lines += self._parameter_source()
        lines += self._content_source()
        lines += self._task_handlers_source()
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
