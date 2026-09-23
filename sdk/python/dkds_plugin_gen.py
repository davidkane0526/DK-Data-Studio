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
            else:
                raise SpecError(f"content[{index}].kind must be note or plot")
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
        result_plot: str | None = None,
        result_key: str = "points",
        success_status: str = "任务完成",
        function_name: str | None = None,
    ) -> "PluginBuilder":
        """Bind an authoring-time Python function to a Core Task Runner action.

        Python is compiled immediately into a JavaScript DKDSTaskDefinition.
        The generated plugin package never contains Python source or requires a
        Python runtime.
        """
        compiled = compile_portable_task(task_id, function, function_name=function_name)
        action_ids = {row["id"] for row in self.spec["actions"]}
        if action_id not in action_ids:
            raise SpecError(f"portable task action_id not found: {action_id}")

        fields = {
            row["id"]: row
            for row in (self.spec.get("parameters") or {}).get("fields", [])
        }
        mapping = dict(parameter_map or {name: name for name in compiled.parameters})
        missing_args = [name for name in compiled.parameters if name not in mapping]
        extra_args = [name for name in mapping if name not in compiled.parameters]
        if missing_args or extra_args:
            raise SpecError(
                "portable task parameter_map must match function arguments exactly; "
                f"missing={missing_args}, extra={extra_args}"
            )
        for argument, field_id in mapping.items():
            if field_id not in fields:
                raise SpecError(f"portable task parameter {argument} references unknown field {field_id}")

        plot_ids = {
            row["id"]
            for row in self.spec["content"]
            if row["kind"] == "plot"
        }
        if result_plot is not None and result_plot not in plot_ids:
            raise SpecError(f"portable task result_plot not found: {result_plot}")
        if not IDENT.fullmatch(str(result_key or "").replace("-", "_")):
            raise SpecError(f"invalid portable task result_key: {result_key}")

        if any(row["compiled"].task_id == compiled.task_id for row in self._portable_tasks):
            raise SpecError(f"duplicate portable task id: {compiled.task_id}")
        if any(row["action_id"] == action_id for row in self._portable_tasks):
            raise SpecError(f"action already bound to a portable task: {action_id}")

        self._portable_tasks.append({
            "compiled": compiled,
            "action_id": action_id,
            "parameter_map": mapping,
            "result_plot": result_plot,
            "result_key": str(result_key),
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
        for row in self._portable_tasks:
            compiled: CompiledPortableTask = row["compiled"]
            handler = self._task_handler_name(compiled.task_id)
            payload = ",".join(
                f"{_js(argument)}:{self._field_read_expr(field_id)}"
                for argument, field_id in row["parameter_map"].items()
            )
            action = action_lookup[row["action_id"]]
            lines += [
                f"    async function {handler}(){{",
                f"      ctx.status.set({_js(action['statusMessage'])});",
                "      try{",
                f"        const handle=ctx.tasks.submit({_js(compiled.task_id)},{{{payload}}},{{key:{_js('generated-'+compiled.task_id)},latest:true}});",
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
        requires = ["status", "ui.workspace", "ui.unit-templates", "ui.pages"]
        capabilities = ["ui.page", "ui.plugin-workspace"]
        if has_plot:
            requires.append("ui.scientific-plot")
            capabilities.append("ui.scientific-plot")
        if self._portable_tasks:
            requires.append("execution.tasks")
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
