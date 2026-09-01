# Thin Glass 1.12.2

Plugin API 1.19 / Theme Contract 3.10 built-in profile.

- Uses Core-owned Component Context (`standalone` / `grouped`) and Material Context (`compact` / `panel` / `dialog` / `workspace-modal`).
- Preserves a distinctly glass-oriented visual language without directly painting Core selectors.
- Small floating/popover surfaces can use stronger blur while large `workspace-modal` surfaces use lower blur and higher fill opacity for readability.
- ToolbarGroup/ToolbarAction depth is declared through Theme 3.10 slots and is composed once by Core.
- Scientific/data content remains fallback-only: explicit user/plugin/project colors always outrank the Theme palette.
