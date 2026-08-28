# Theme Profile template

Theme plugins target Core `ui.theme`; they do **not** restyle Studio or other plugin DOM directly.
Register semantic light/dark tokens with `ctx.ui.theme.register()` and let Plugin Manager activate the profile. `ctx.ui.theme.activate()` remains available for an explicit theme-owned user action. Structural hierarchy should normally come from `canvas`, `surface`,
`surfaceSoft`, and `surfaceSidebar`. Use `divider` only for genuinely necessary separators and
`controlBorder` for interactive controls. This separation prevents dark themes from turning every
workspace boundary into a bright line.

For cross-platform themes, prefer concrete hex/rgb/rgba/hsl color values for color tokens so the
same profile can be projected into the Android native shell. Web-only CSS expressions may be
ignored by native chrome and fall back to the built-in palette.


## Theme Contract 3.8

Theme plugins use `pluginType: "theme"` and declare `requiresCore: ["ui.theme"]`. They register semantic profiles through `ctx.ui.theme.register(...)`; they do not repaint Core DOM directly.

A profile may provide light/dark appearance tokens, a shared `material` block, and a shared `motion` block. Motion is deliberately bounded to Core-owned animation recipes: durations, easing, hover lift and press scale. `prefers-reduced-motion: reduce` always wins. Theme plugins should not use `ctx.ui.styles` to take over layout or invent host-specific controls.

The Plugin Manager lists Theme plugins in their own category and lets users activate any registered profile owned by that plugin.



### Theme 3.8 semantic appearance

Use `appearance.roles` when a semantic Material Role needs a distinct palette without changing Core DOM ownership:

```js
appearance: {
  roles: {
    chrome: { surface:'#F3F1FC', border:'#DED9F4', text:'#1C2740' },
    sidebar: { surface:'#EEF7F5' },
    elevated: { surface:'#FFF5F8' }
  }
},
scientific: {
  seriesPalette: ['#705CE8','#17A7A0','#D96A91']
}
```

The role fields remain limited to `surface / border / text`. Theme 3.8 also provides bounded `appearance.components` slots for `tab`, `toolbarAction`, `toolbarGroup`, `panelHeader`, `inspectorHeader`, `menuItem`, `chip`, `statusBar`, `floatingChrome`, and `field`. Use `ctx.ui.theme.consumption()` and Theme Test Gallery to inspect which Core component consumes each slot. `scientific.mode` must be `fallback-only`; explicit user/plugin/project scientific colors always precede the Theme palette.

### Material contract

Theme Contract 3.8 keeps bounded material parameters and adds constrained role-specific appearance. Core still owns the selectors and recipes; a Theme plugin only supplies values:

- `materialBlur`, `materialBlurStrong`: CSS blur lengths such as `12px` / `18px`.
- `materialSaturation`: CSS `saturate()` factor or percentage, e.g. `1.08` or `108%`.
- `materialTintOpacity`: historical token name for the semantic base-material fill fraction used by translucent recipes, e.g. `.66` / `66%`. It is **not** an accent-color tint amount; `3%` would be almost fully transparent.
- `specularHighlight`, `innerHighlight`, `glassEdge`: CSS colors used by Core for glass edge/highlight recipes.
- `materialNoiseOpacity`: percentage controlling Core-owned micro-noise texture; use `0%` for none.

These values do not grant arbitrary CSS access. A Theme plugin cannot choose DOM targets, pseudo-elements, layout, or animation keyframes. Light/dark mode maps may override any material token when a mode-specific material response is required.


Theme Contract 3.8 retains profile-owned `recipes` and declarative `settings`, and adds semantic state colors, `accentAlt`, role appearance, and an optional scientific series palette. Use `settings` to expose bounded Core-rendered controls; do not build a custom theme settings DOM.


### Readable glass defaults

When a role uses `thin-glass`, `soft-glass`, or `liquid-glass`, Core owns the visual composition. The official template uses moderate semantic base-fill values rather than the old 3–7% example. Studio also enforces readability floors for translucent roles (`chrome` 58%, `sidebar` 62%, `elevated` 62%, `popover` 78%, `floating` 58%). A Theme plugin should tune semantic tokens and material parameters only; it should not add CSS patches for menus, dialogs, fields, or titlebar controls.

The same recipe has the same Core behavior for built-in and external Theme profiles. In particular, translucent shell popovers are automatically portalled to a body-level backdrop root where needed, and form controls inside glass owners are rendered as one flat semantic control family rather than inheriting unrelated inset paint.
