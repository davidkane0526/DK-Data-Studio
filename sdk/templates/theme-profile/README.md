# Theme Profile template

Theme plugins target Core `ui.theme`; they do **not** restyle Studio or other plugin DOM directly.
Register semantic light/dark tokens with `ctx.ui.theme.register()` and activate the profile with
`ctx.ui.theme.activate()`. Structural hierarchy should normally come from `canvas`, `surface`,
`surfaceSoft`, and `surfaceSidebar`. Use `divider` only for genuinely necessary separators and
`controlBorder` for interactive controls. This separation prevents dark themes from turning every
workspace boundary into a bright line.

For cross-platform themes, prefer concrete hex/rgb/rgba/hsl color values for color tokens so the
same profile can be projected into the Android native shell. Web-only CSS expressions may be
ignored by native chrome and fall back to the built-in palette.
