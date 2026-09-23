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
from typing import Any, Dict, Iterable, List

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

    def manifest(self) -> Dict[str, Any]:
        has_plot = any(row["kind"] == "plot" for row in self.spec["content"])
        requires = ["status", "ui.workspace", "ui.unit-templates", "ui.pages"]
        capabilities = ["ui.page", "ui.plugin-workspace"]
        if has_plot:
            requires.append("ui.scientific-plot")
            capabilities.append("ui.scientific-plot")
        plugin = self.spec["plugin"]
        return {
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

    def _action_source(self) -> str:
        rows = []
        for action in self.spec["actions"]:
            variant = f",variant:{_js(action['variant'])}" if action.get("variant") else ""
            rows.append(
                "{id:%s,label:%s%s,onInvoke:()=>{ctx.status.set(%s);return true;}}"
                % (_js(action["id"]), _js(action["label"]), variant, _js(action["statusMessage"]))
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
                f"    const {base}_points={_js(points)};",
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
            "The generated runtime uses only Plugin API 1.19 and public Unit Templates; it ships no private CSS.\n"
        )

    def write(self, output: str | Path) -> Path:
        target = Path(output)
        target.mkdir(parents=True, exist_ok=True)
        (target / "plugin.json").write_text(json.dumps(self.manifest(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (target / "plugin.js").write_text(self.render_plugin_js(), encoding="utf-8")
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
    except (OSError, json.JSONDecodeError, SpecError) as exc:
        print(f"DKDS generator error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
