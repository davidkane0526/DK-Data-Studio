# SDK Tool Workspace Example

Reference `pluginType: "tool"` workspace for Plugin API 1.15.

It intentionally uses the same machine contract as a TOP workspace (`workspace.role: "top"`, matching dedicated `window`, `openMode: "window"`, `ctx.ui.topWorkspace.register`). Core distinguishes it only by presentation: the opener is grouped under the global **工具** button instead of the TOP activity strip.

No additional Tool-only semantics are required in the current SDK. See `sdk/TOOL_PLUGINS.md`.
