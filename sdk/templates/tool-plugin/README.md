# SDK Tool Workspace Example

Reference `pluginType: "tool"` workspace for Plugin API 1.17.0.

It intentionally uses the same machine contract as a TOP workspace (`workspace.role: "top"`, matching dedicated `window`, `openMode: "window"`, `ctx.ui.topWorkspace.register`). Core distinguishes it only by presentation: the opener is grouped under the global **工具** button instead of the TOP activity strip.

No additional Tool-only semantics are required in the current SDK. The template uses `primaryScroll:"safe"`: Core owns the bounded Primary viewport and scrollbar, so plugin roots stay flexible with `min-height:0`. For compact form/card grids made from `auto` rows, declare `align-content:start` when spare height must not be distributed between rows. See `sdk/TOOL_PLUGINS.md`.
