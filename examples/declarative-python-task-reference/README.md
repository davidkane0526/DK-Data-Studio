# Declarative Python -> JavaScript Task reference

This reference proves the Phase F runtime boundary.

Python is authoring/build-time input only. The Python function is statically lowered through a bounded AST subset. The generated package contains an ordinary Plugin API 1.19 workbench and a JavaScript DKDSTaskDefinition. Runtime execution uses only ctx.tasks / Core Task Runner.

No .py file, Python interpreter, Python provider, or alternate backend is packaged. Unsupported or unproven Python semantics fail generation instead of falling back to Python.
