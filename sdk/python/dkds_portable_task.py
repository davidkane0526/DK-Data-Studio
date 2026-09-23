#!/usr/bin/env python3
"""Portable Python -> DK Data Studio JavaScript Task lowering.

This module is an AUTHORING-TIME compiler only. Python is never emitted into a
plugin package and is never required by the DK Data Studio runtime.

The lowering policy follows the conservative rule used by PyDroid-Node:
promote only semantics that can be proven from a bounded AST subset. DKDS is
stricter because there is no Python runtime fallback: unsupported constructs
fail the build instead of shipping a Python carrier.
"""
from __future__ import annotations

import ast
import inspect
import json
import re
import textwrap
from dataclasses import dataclass
from typing import Any, Callable

IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
TASK_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
MAX_ITERATIONS = 1_000_000

_ALLOWED_CALLS = {"abs", "min", "max", "len", "sum", "int", "float", "bool", "str"}
_MATH_CALLS = {
    "sqrt": "sqrt",
    "sin": "sin",
    "cos": "cos",
    "tan": "tan",
    "asin": "asin",
    "acos": "acos",
    "atan": "atan",
    "exp": "exp",
    "log": "log",
    "log10": "log10",
    "floor": "floor",
    "ceil": "ceil",
}
_SUPPORTED_ANNOTATION_ROOTS = {"int", "float", "bool", "str", "list", "dict", "Any", "object"}


class PortableTaskError(ValueError):
    """Raised when Python source cannot be proven portable to a JS Task."""


@dataclass(frozen=True)
class CompiledPortableTask:
    task_id: str
    entry: str
    source: str
    parameters: tuple[str, ...]


def _js(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _annotation_root(node: ast.AST | None) -> str:
    if node is None:
        return "object"
    text = ast.unparse(node)
    root = text.split("[", 1)[0].split(".")[-1]
    if root not in _SUPPORTED_ANNOTATION_ROOTS:
        raise PortableTaskError(
            f"Unsupported portable task annotation {text!r}; use int/float/bool/str/list/dict/Any/object."
        )
    return root


def _assigned_names(fn: ast.FunctionDef) -> set[str]:
    names = {arg.arg for arg in [*fn.args.posonlyargs, *fn.args.args, *fn.args.kwonlyargs]}
    for node in ast.walk(fn):
        if isinstance(node, ast.Name) and isinstance(node.ctx, (ast.Store, ast.Param)):
            names.add(node.id)
        elif isinstance(node, ast.For) and isinstance(node.target, ast.Name):
            names.add(node.target.id)
    return names


def _loaded_names(fn: ast.FunctionDef) -> set[str]:
    return {
        node.id
        for node in ast.walk(fn)
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load)
    }


class _Lowerer:
    def __init__(self, fn: ast.FunctionDef, task_id: str):
        self.fn = fn
        self.task_id = task_id
        self.parameters = [arg.arg for arg in [*fn.args.posonlyargs, *fn.args.args, *fn.args.kwonlyargs]]
        self._validate_function()

    def _fail(self, node: ast.AST, message: str) -> PortableTaskError:
        line = getattr(node, "lineno", "?")
        return PortableTaskError(f"{message} (line {line})")

    def _validate_function(self) -> None:
        fn = self.fn
        if fn.decorator_list:
            raise self._fail(fn, "Portable task functions may not use decorators")
        if isinstance(fn, ast.AsyncFunctionDef):
            raise self._fail(fn, "Portable task functions must be synchronous")
        if fn.args.vararg or fn.args.kwarg:
            raise self._fail(fn, "Portable task functions do not support *args/**kwargs")
        if fn.args.posonlyargs:
            raise self._fail(fn, "Portable task functions do not support positional-only arguments")
        if any(isinstance(node, (ast.Global, ast.Nonlocal, ast.Lambda, ast.Yield, ast.YieldFrom, ast.Await)) for node in ast.walk(fn)):
            raise self._fail(fn, "Portable task functions may not use global/nonlocal/lambda/yield/await")
        if not any(isinstance(node, ast.Return) for node in ast.walk(fn)):
            raise self._fail(fn, "Portable task functions must return a structured-cloneable result")

        for arg in [*fn.args.args, *fn.args.kwonlyargs]:
            if not IDENT.fullmatch(arg.arg):
                raise self._fail(arg, f"Invalid portable task argument {arg.arg!r}")
            _annotation_root(arg.annotation)
        if fn.returns is not None:
            _annotation_root(fn.returns)

        assigned = _assigned_names(fn)
        allowed_names = assigned | _ALLOWED_CALLS | {"math", "True", "False", "None"}
        free = sorted(_loaded_names(fn) - allowed_names)
        if free:
            raise self._fail(fn, "Portable task has free/global names: " + ", ".join(free))

        forbidden = (
            ast.Import, ast.ImportFrom, ast.With, ast.AsyncWith, ast.Try, ast.Raise,
            ast.ClassDef, ast.Delete, ast.Match, ast.While, ast.ListComp, ast.SetComp,
            ast.DictComp, ast.GeneratorExp, ast.NamedExpr,
        )
        for node in ast.walk(fn):
            if isinstance(node, forbidden):
                raise self._fail(node, f"Unsupported portable task construct: {type(node).__name__}")

    def _parameter_default(self, index: int) -> ast.AST | None:
        positional = self.fn.args.args
        defaults = self.fn.args.defaults
        first_default = len(positional) - len(defaults)
        if index >= first_default:
            return defaults[index - first_default]
        return None

    def _parameter_source(self) -> list[str]:
        lines = [
            "    const __dkdsInput=(input&&typeof input==='object')?input:{};",
            "    let __dkdsIterations=0;",
        ]
        for index, arg in enumerate(self.fn.args.args):
            root = _annotation_root(arg.annotation)
            default = self._parameter_default(index)
            raw = f"__dkdsInput[{_js(arg.arg)}]"
            if default is not None:
                if not isinstance(default, ast.Constant):
                    raise self._fail(default, f"Default for {arg.arg} must be a literal constant")
                raw = f"({raw}===undefined?{self.expr(default)}:{raw})"
            elif root not in {"Any", "object", "list", "dict"}:
                lines.append(
                    f"    if({raw}===undefined)throw new Error({_js('Missing task input: '+arg.arg)});"
                )
            if root == "int":
                value = f"Math.trunc(Number({raw}))"
            elif root == "float":
                value = f"Number({raw})"
            elif root == "bool":
                value = f"Boolean({raw})"
            elif root == "str":
                value = f"String({raw})"
            else:
                value = raw
            lines.append(f"    const {arg.arg}={value};")
        if self.fn.args.kwonlyargs:
            raise self._fail(self.fn, "Keyword-only arguments are not yet supported by portable task lowering")
        return lines

    def expr(self, node: ast.AST) -> str:
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (str, int, float, bool)) or node.value is None:
                return _js(node.value)
            raise self._fail(node, f"Unsupported constant type: {type(node.value).__name__}")
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, (ast.List, ast.Tuple)):
            return "[" + ",".join(self.expr(item) for item in node.elts) + "]"
        if isinstance(node, ast.Dict):
            pairs = []
            for key, value in zip(node.keys, node.values):
                if key is None:
                    raise self._fail(node, "Dictionary unpacking is not portable")
                if not isinstance(key, ast.Constant) or not isinstance(key.value, (str, int, float, bool)):
                    raise self._fail(key, "Portable dictionary keys must be scalar literals")
                pairs.append(f"{_js(str(key.value))}:{self.expr(value)}")
            return "{" + ",".join(pairs) + "}"
        if isinstance(node, ast.BinOp):
            left, right = self.expr(node.left), self.expr(node.right)
            if isinstance(node.op, ast.Pow):
                return f"Math.pow({left},{right})"
            if isinstance(node.op, ast.FloorDiv):
                return f"Math.floor(({left})/({right}))"
            ops = {
                ast.Add: "+", ast.Sub: "-", ast.Mult: "*", ast.Div: "/",
                ast.Mod: "%",
            }
            op = ops.get(type(node.op))
            if not op:
                raise self._fail(node, f"Unsupported binary operator: {type(node.op).__name__}")
            return f"(({left}){op}({right}))"
        if isinstance(node, ast.UnaryOp):
            operand = self.expr(node.operand)
            if isinstance(node.op, ast.Not):
                return f"(!({operand}))"
            if isinstance(node.op, ast.USub):
                return f"(-({operand}))"
            if isinstance(node.op, ast.UAdd):
                return f"(+({operand}))"
            raise self._fail(node, f"Unsupported unary operator: {type(node.op).__name__}")
        if isinstance(node, ast.BoolOp):
            op = "&&" if isinstance(node.op, ast.And) else "||" if isinstance(node.op, ast.Or) else None
            if not op:
                raise self._fail(node, f"Unsupported boolean operator: {type(node.op).__name__}")
            return "(" + op.join(f"({self.expr(value)})" for value in node.values) + ")"
        if isinstance(node, ast.Compare):
            operators = {
                ast.Eq: "===", ast.NotEq: "!==", ast.Lt: "<", ast.LtE: "<=",
                ast.Gt: ">", ast.GtE: ">=",
            }
            parts = []
            left = node.left
            for op_node, right in zip(node.ops, node.comparators):
                op = operators.get(type(op_node))
                if not op:
                    raise self._fail(node, f"Unsupported comparison operator: {type(op_node).__name__}")
                parts.append(f"(({self.expr(left)}){op}({self.expr(right)}))")
                left = right
            return "(" + "&&".join(parts) + ")"
        if isinstance(node, ast.IfExp):
            return f"(({self.expr(node.test)})?({self.expr(node.body)}):({self.expr(node.orelse)}))"
        if isinstance(node, ast.Subscript):
            if isinstance(node.slice, ast.Slice):
                raise self._fail(node, "Slice syntax is not portable in Phase F v1")
            return f"({self.expr(node.value)})[{self.expr(node.slice)}]"
        if isinstance(node, ast.Call):
            return self.call(node)
        raise self._fail(node, f"Unsupported portable expression: {type(node).__name__}")

    def call(self, node: ast.Call) -> str:
        if node.keywords:
            raise self._fail(node, "Keyword call arguments are not portable in Phase F v1")
        args = [self.expr(arg) for arg in node.args]
        if isinstance(node.func, ast.Name):
            name = node.func.id
            if name not in _ALLOWED_CALLS:
                raise self._fail(node, f"Unsupported portable function call: {name}")
            if name == "abs":
                self._arity(node, args, 1)
                return f"Math.abs({args[0]})"
            if name == "min":
                return f"Math.min({','.join(args)})"
            if name == "max":
                return f"Math.max({','.join(args)})"
            if name == "len":
                self._arity(node, args, 1)
                return f"({args[0]}).length"
            if name == "sum":
                self._arity(node, args, 1)
                return f"({args[0]}).reduce((__a,__b)=>__a+__b,0)"
            if name == "int":
                self._arity(node, args, 1)
                return f"Math.trunc(Number({args[0]}))"
            if name == "float":
                self._arity(node, args, 1)
                return f"Number({args[0]})"
            if name == "bool":
                self._arity(node, args, 1)
                return f"Boolean({args[0]})"
            if name == "str":
                self._arity(node, args, 1)
                return f"String({args[0]})"
        if isinstance(node.func, ast.Attribute):
            if isinstance(node.func.value, ast.Name) and node.func.value.id == "math":
                name = _MATH_CALLS.get(node.func.attr)
                if not name:
                    raise self._fail(node, f"Unsupported math function: math.{node.func.attr}")
                return f"Math.{name}({','.join(args)})"
        raise self._fail(node, "Only approved pure builtins and math.* calls are portable")

    def _arity(self, node: ast.AST, args: list[str], expected: int) -> None:
        if len(args) != expected:
            raise self._fail(node, f"Expected {expected} argument(s), got {len(args)}")

    def _target(self, node: ast.AST) -> str:
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Subscript) and not isinstance(node.slice, ast.Slice):
            return f"({self.expr(node.value)})[{self.expr(node.slice)}]"
        raise self._fail(node, "Assignment target must be a local name or direct item access")

    def statements(self, nodes: list[ast.stmt], indent: str = "    ") -> list[str]:
        lines: list[str] = []
        for node in nodes:
            lines.extend(self.statement(node, indent))
        return lines

    def statement(self, node: ast.stmt, indent: str) -> list[str]:
        if isinstance(node, ast.Assign):
            if len(node.targets) != 1:
                raise self._fail(node, "Chained assignment is not portable")
            target = self._target(node.targets[0])
            declaration = "let " if isinstance(node.targets[0], ast.Name) else ""
            return [f"{indent}{declaration}{target}={self.expr(node.value)};"]
        if isinstance(node, ast.AnnAssign):
            if node.value is None:
                raise self._fail(node, "Annotated assignment requires a value")
            target = self._target(node.target)
            declaration = "let " if isinstance(node.target, ast.Name) else ""
            return [f"{indent}{declaration}{target}={self.expr(node.value)};"]
        if isinstance(node, ast.AugAssign):
            target = self._target(node.target)
            ops = {ast.Add: "+=", ast.Sub: "-=", ast.Mult: "*=", ast.Div: "/=", ast.Mod: "%="}
            op = ops.get(type(node.op))
            if not op:
                raise self._fail(node, f"Unsupported augmented operator: {type(node.op).__name__}")
            return [f"{indent}{target}{op}{self.expr(node.value)};"]
        if isinstance(node, ast.Expr):
            call = node.value
            if (
                isinstance(call, ast.Call)
                and isinstance(call.func, ast.Attribute)
                and call.func.attr == "append"
                and not call.keywords
                and len(call.args) == 1
            ):
                return [f"{indent}{self.expr(call.func.value)}.push({self.expr(call.args[0])});"]
            raise self._fail(node, "Only list.append(...) is allowed as a standalone expression")
        if isinstance(node, ast.Return):
            return [f"{indent}return {self.expr(node.value) if node.value is not None else 'null'};"]
        if isinstance(node, ast.If):
            lines = [f"{indent}if({self.expr(node.test)}){{"]
            lines += self.statements(node.body, indent + "  ")
            if node.orelse:
                lines.append(f"{indent}}}else{{")
                lines += self.statements(node.orelse, indent + "  ")
            lines.append(f"{indent}}}")
            return lines
        if isinstance(node, ast.For):
            if not isinstance(node.target, ast.Name):
                raise self._fail(node, "Portable for-loop target must be a local name")
            target = node.target.id
            guard = (
                f"if(++__dkdsIterations>{MAX_ITERATIONS})"
                "throw new Error('Portable task iteration limit exceeded');"
            )
            if isinstance(node.iter, ast.Call) and isinstance(node.iter.func, ast.Name) and node.iter.func.id == "range":
                if node.iter.keywords or not 1 <= len(node.iter.args) <= 3:
                    raise self._fail(node, "range() requires one to three positional arguments")
                parts = [self.expr(arg) for arg in node.iter.args]
                if len(parts) == 1:
                    start, stop, step = "0", parts[0], "1"
                elif len(parts) == 2:
                    start, stop, step = parts[0], parts[1], "1"
                else:
                    start, stop, step = parts
                lines = [
                    f"{indent}for(let {target}=({start}),__dkdsStop=({stop}),__dkdsStep=({step});"
                    f"__dkdsStep>0?{target}<__dkdsStop:{target}>__dkdsStop;{target}+=__dkdsStep){{",
                    f"{indent}  if(__dkdsStep===0)throw new Error('Portable task range step cannot be zero');",
                    f"{indent}  {guard}",
                ]
            else:
                lines = [
                    f"{indent}for(const {target} of {self.expr(node.iter)}){{",
                    f"{indent}  {guard}",
                ]
            lines += self.statements(node.body, indent + "  ")
            lines.append(f"{indent}}}")
            if node.orelse:
                raise self._fail(node, "for ... else is not portable")
            return lines
        if isinstance(node, ast.Pass):
            return []
        raise self._fail(node, f"Unsupported portable statement: {type(node).__name__}")

    def render(self) -> str:
        lines = [
            "'use strict';",
            "self.DKDSTaskDefinition=Object.freeze({",
            "  async run(input,context){",
        ]
        lines += self._parameter_source()
        lines += self.statements(self.fn.body, "    ")
        lines += [
            "  }",
            "});",
            "",
        ]
        return "\n".join(lines)


def _source_and_name(function: Callable[..., Any] | str, function_name: str | None) -> tuple[str, str | None]:
    if callable(function):
        try:
            source = textwrap.dedent(inspect.getsource(function))
        except (OSError, TypeError) as exc:
            raise PortableTaskError("Unable to read portable task function source") from exc
        return source, function.__name__
    return textwrap.dedent(str(function)), function_name


def compile_portable_task(
    task_id: str,
    function: Callable[..., Any] | str,
    *,
    function_name: str | None = None,
    entry: str | None = None,
) -> CompiledPortableTask:
    """Compile one pure Python function into a standard DKDS JS Task module."""
    task_id = str(task_id or "").strip()
    if not TASK_ID.fullmatch(task_id):
        raise PortableTaskError(f"Invalid portable task id: {task_id!r}")
    source, inferred_name = _source_and_name(function, function_name)
    try:
        tree = ast.parse(source, mode="exec")
    except SyntaxError as exc:
        raise PortableTaskError(f"Portable task syntax error: {exc.msg} (line {exc.lineno})") from exc

    functions = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
    other = [
        node for node in tree.body
        if not isinstance(node, ast.FunctionDef)
        and not (isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str))
    ]
    if other:
        node = other[0]
        raise PortableTaskError(
            f"Portable task source may contain only a function definition (line {getattr(node, 'lineno', '?')})"
        )
    wanted = function_name or inferred_name
    if wanted:
        functions = [node for node in functions if node.name == wanted]
    if len(functions) != 1:
        raise PortableTaskError("Portable task source must contain exactly one selected synchronous function")
    fn = functions[0]
    lowerer = _Lowerer(fn, task_id)
    task_entry = entry or ("generated-task-" + re.sub(r"[^A-Za-z0-9._-]", "-", task_id) + ".js")
    if "/" in task_entry or "\\" in task_entry or not task_entry.endswith(".js"):
        raise PortableTaskError("Portable task entry must be a flat .js filename")
    return CompiledPortableTask(
        task_id=task_id,
        entry=task_entry,
        source=lowerer.render(),
        parameters=tuple(lowerer.parameters),
    )
