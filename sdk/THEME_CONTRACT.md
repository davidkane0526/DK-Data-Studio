# DK Data Studio Theme Contract 3.6

Theme Contract 3.6 is the current Studio 3.62 theme contract. It retains validated executable theme profiles and makes 3.6 the sole current authoring target alongside Plugin API 1.18.0.

## Capability discovery

Theme plugins target Plugin API 1.18.0 and negotiate Theme Contract 3.6 independently:

```js
ctx.ui.theme.contractVersion;              // "3.6.0"
ctx.ui.theme.supports('contract.materialBlur');      // true
ctx.ui.theme.supports('contract.material.roles.chrome'); // true
```

A Theme plugin should declare:

```json
"compatibility": {
  "app": ">=3.62.0 <4.0.0",
  "pluginApi": "^1.18.0",
  "themeContract": "^3.6.0"
}
```

## Canonical profile structure and precedence

New themes should use structured mode branches:

```js
ctx.ui.theme.register('default', {
  material: { materialBlur: 12 },
  motion: { motionFast: 90 },
  modes: {
    light: {
      tokens: { surface: '#fbfcfe' },
      material: { roles: { chrome: { materialBlur: 16 } } }
    },
    dark: {
      tokens: { surface: '#1d232e' },
      material: { materialBlur: 14 }
    }
  }
});
```

Merge order, from lowest to highest priority:

1. Core built-in theme defaults.
2. Shared `profile.material` and `profile.motion`.
3. Legacy Theme 3.1 flat mode values (`modes.dark.materialBlur`, `light`, `dark`).
4. Canonical `modes.<mode>.tokens`, `modes.<mode>.motion`, and `modes.<mode>.material`.
5. `modes.<mode>.material.roles.<role>` for the material role currently used by Core.

Theme 3.1 flat mode syntax remains readable for compatibility, but 3.2 templates and documentation use the structured form.

## Validated material values

Canonical 3.2 values are platform-neutral where possible. Legacy CSS-form strings are accepted only where listed.

| Token | Canonical value | Accepted compatibility form | Range |
|---|---|---|---|
| `materialBlur` | number logical units | `12px`, `12dp` | 0–64 |
| `materialBlurStrong` | number logical units | `18px`, `18dp` | 0–64 |
| `materialSaturation` | number multiplier | `112%` | 0–3 / 0–300% |
| `materialTintOpacity` | number | `66%` | 0–1 / 0–100% |
| `materialNoiseOpacity` | number | `1.5%` | 0–1 / 0–100% |
| `specularHighlight` | color | hex/rgb(a)/hsl(a) | parsed color |
| `innerHighlight` | color | hex/rgb(a)/hsl(a) | parsed color |
| `glassEdge` | color | hex/rgb(a)/hsl(a) | parsed color |

Motion values are also validated: durations are 0–5000 ms, `pressScale` is 0.8–1.2, `hoverLift` is -16–16 logical units, and easing must be a standard CSS easing keyword or valid `cubic-bezier()`.

Unknown tokens are errors. For example, `materialBlurr`, `materialBlur: "banana"`, or `materialTintOpacity: "900%"` are rejected by both the SDK validator and the runtime Theme Contract.

## Platform mapping

A numeric Theme 3.3 length is a **logical material unit**:

- Web/Electron: 1 logical unit -> 1 CSS px.
- Android native shell: 1 logical unit -> 1 dp before the native blur/material adapter applies the platform renderer's blur-radius convention.
- Duration numbers are milliseconds.
- Opacity numbers are 0..1.
- Saturation numbers are unitless multipliers.
- Scale numbers are unitless.

Theme authors should prefer numeric values for cross-platform themes. `px`, `dp`, `%`, and duration strings remain accepted for 3.1 source compatibility.

## Material roles

Theme Contract 3.5 defines seven semantic material roles:

- `chrome`: top application/navigation chrome.
- `sidebar`: navigation and parameter sidebars.
- `surface`: standard content cards and material surfaces.
- `elevated`: floating/high-elevation surfaces.
- `popover`: dialogs, menus and transient floating surfaces.
- `control`: compact interactive material such as buttons, inputs and selects.
- `floating`: floating toolbars, ScientificPlot chrome, pinned inspectors and other movable material.

Each role may override any material token through `material.roles.<role>` or `modes.<mode>.material.roles.<role>`. Core decides which UI owns each role; plugins cannot attach roles to arbitrary host DOM.

## Material composition order

Core uses one deterministic material recipe. Theme values are composed in this order:

1. Semantic base surface (`surface`, `surfaceSidebar`, `surfaceElevated`, or `controlBg`).
2. Translucent semantic **base-material fill** using `materialTintOpacity` (historical token name; it is not an accent-color tint amount).
3. Backdrop blur (`materialBlur` / `materialBlurStrong`) and saturation.
4. Fine material noise using `materialNoiseOpacity`.
5. `glassEdge` border.
6. `innerHighlight` inset highlight.
7. `specularHighlight` secondary inset/specular highlight.
8. Core-owned elevation shadow.

This order is fixed by Core so identical theme values produce predictable results across components. Themes control parameters, not DOM/CSS recipe order.


## Theme Coverage Contract

Theme Contract 3.5 also exposes a runtime coverage report:

```js
const report = ctx.ui.theme.coverage();
```

The report distinguishes Core material coverage from plugin-owned unmanaged visuals. Core areas include app chrome, sidebars, workspaces/surfaces, elevated/dialog surfaces, popovers/tooltips, controls, ScientificPlot chrome and floating surfaces. Each present area is reported as `managed`, `partial` or `unmanaged`; absent areas are `not-present`.

Plugin style audit inspects plugin-injected CSS and inline styles for visual declarations that bypass semantic Theme tokens/material roles. The SDK validator emits `DKDS SDK THEME COVERAGE WARNING` for ordinary plugins that hard-code `background`, `color`, border colors, shadows, fills/strokes or private backdrop filters. Theme plugins remain stricter: arbitrary CSS is rejected.

The coverage audit is intentionally a contract/audit layer, not a license for themes to target arbitrary DOM. Core still owns selectors and recipes.

## Theme Test Gallery

Software Management -> Theme -> **主题测试** opens the Core Theme Test Gallery. It renders light and dark previews side by side and includes application chrome, sidebar, standard/elevated surfaces, buttons, input/select controls, a table, a ScientificPlot preview, chips and popover material.

The gallery is a visual coverage harness, not a replacement for SDK validation. A theme must pass validation before it can be packaged.

## Theme Contract 3.5: renderer truth

Contract support and renderer support are intentionally separate. `ctx.ui.theme.supports('contract.materialBlur')` means the profile schema accepts the token. `ctx.ui.theme.supports('renderer.backdropBlur')` means the current Core/browser combination has the 3.3 material recipe installed and a real computed `backdrop-filter` path for every semantic material role. Bare `supports('materialBlur')` is false and must not be used as a renderer capability check.

Use `ctx.ui.theme.rendererCapabilities()` for engine, renderer and per-role capability details. `ctx.ui.theme.coverage()` now inspects computed styles and reports `REAL_MATERIAL`, `BROKEN_MATERIAL_RENDERER`, `MISSING_MATERIAL_ROLE`, `ENGINE_UNSUPPORTED`, and `MATERIAL_OCCLUDED_BY_OPAQUE_SURFACE`. Opaque material surfaces are optical warnings rather than renderer failures.

Theme Test Gallery includes an optical high-frequency/color test pattern behind a real popover material. A working blur must visibly defocus that pattern and its diagnostic row must show the computed `blur(...) saturate(...)` value.

## Core Material Role Coverage (Studio 3.61.72 / SDK 1.17.11)

Theme Contract 3.5 does not add more material parameters in this release. Instead, Core guarantees semantic role assignment for its own pages and primitives. The Material Renderer automatically classifies Core-owned application chrome, page/workspace headers, PluginWorkspace canvas/sidebars, settings bodies/dialogs, docked/floating Portable Views, menus/tooltips, scientific floating chrome and common surfaces into the existing `chrome / sidebar / surface / elevated / popover / control / floating` roles.

Plugins must still use Core workspace/surface primitives. A plugin-local visual surface that bypasses those primitives remains visible in `ctx.ui.theme.coverage()` as unmanaged material.

Integrated command clusters are one material object. Buttons inside `.dkds-integrated-action-group`, PlotView action groups and ScientificPlot navigation remain independent hit targets but never receive their own control material paint.

Tooltip/popover foreground is Core-derived from the resolved material background. Core targets a minimum text/background contrast ratio of 4.5 and Render Coverage reports `LOW_CONTRAST_MATERIAL` when a popover still fails that requirement. Theme authors do not receive a new public foreground token for this behavior; it is a safety invariant of the renderer.


## Optical Material Renderer 3.4 (Studio 3.61.73 / SDK 1.17.13)

Theme Contract stays at **3.3.0**. No new material tokens are introduced. Studio 3.61.73 separates semantic **Material Role** from the Core-owned **Material Recipe** used to render it:

| Material role | Default Core recipe |
|---|---|
| `chrome` | `soft-glass` |
| `sidebar` | `soft-glass` |
| `surface` | `clear` |
| `elevated` | `soft-glass` |
| `popover` | `liquid-glass` |
| `control` | `clear` |
| `floating` | `liquid-glass` |

`clear` keeps scientific/content surfaces optically stable. `soft-glass` uses one mild backdrop blur/saturation layer. `liquid-glass` uses a clearer center plus a masked strong-blur edge band, a tiny Core-owned lens transform and directional specular response. The pointer response is bounded to liquid surfaces, frame-coalesced and disabled by `prefers-reduced-motion`.

Themes **do not choose selectors and do not supply displacement CSS**. Existing Theme 3.3 values (`materialBlur`, `materialBlurStrong`, saturation, tint, edge and highlights) drive all three recipes. This preserves the Theme security/ownership boundary while letting Liquid Glass profiles produce a materially different optical result.

Renderer capability discovery now includes:

```js
ctx.ui.theme.supports('renderer.liquidGlass');
ctx.ui.theme.supports('renderer.edgeRefraction');
ctx.ui.theme.supports('renderer.nonUniformBlur');
ctx.ui.theme.supports('renderer.dynamicSpecular');
ctx.ui.theme.supports('renderer.recipes.soft-glass');
ctx.ui.theme.supports('renderer.recipes.liquid-glass');
```

`ctx.ui.theme.rendererCapabilities()` exposes the role-to-recipe policy and recipe readiness. Render Coverage reports `BROKEN_OPTICAL_RENDERER` when a liquid role has the semantic role and base blur but its masked edge/refraction/specular layer is not actually computed.


## Theme Contract 3.5: profile-owned recipes and settings

Studio 3.61.75 removes the global optical-policy mistake from Optical Renderer 3.4. `builtin.default` maps all seven roles to `clear`; a theme must explicitly opt roles into `soft-glass` or `liquid-glass` through `recipes`. There is no glass-family fallback. A profile that wants glass must declare its recipe policy explicitly; Core never infers a glass recipe from metadata or plugin identity.

```js
ctx.ui.theme.register('glass',{
  recipes:{popover:'liquid-glass',floating:'liquid-glass',sidebar:'soft-glass'},
  settings:[
    {id:'popoverBlur',label:'Popover blur',target:{scope:'material',role:'popover',key:'materialBlurStrong'},type:'range',min:16,max:64,step:1},
    {id:'popoverRecipe',label:'Popover material',target:{scope:'recipe',role:'popover'},type:'select',options:['soft-glass','liquid-glass']}
  ]
});
```

Settings are declarative. Core owns the settings dialog in Software Management and the bottom Theme picker, validates values through the same Theme token parsers, persists overrides per Profile, and reapplies them on light/dark changes. Theme plugins still may not ship arbitrary settings CSS or mutate host DOM.


## Theme Contract 3.5: Thin Glass and explicit MaterialSurface coverage

Theme Contract 3.5 adds the independent `thin-glass` recipe:

```ts
type DKDSMaterialRecipe =
  | 'clear'
  | 'thin-glass'
  | 'soft-glass'
  | 'liquid-glass';
```

`thin-glass` is **not** Liquid Glass with optical flags disabled. It is a separate Core renderer that contains only:

1. low-radius `backdrop-filter: blur(...)`;
2. mild `saturate(...)`;
3. translucent semantic base-material fill;
4. one thin semantic edge;
5. one Core elevation shadow.

It contains no noise, masked strong-blur edge, refraction, lens/displacement, chromatic aberration, dynamic specular, or inner optical highlight. `filter: blur(...)` is never used for material rendering because it would blur the UI itself rather than its backdrop.

The built-in Thin Glass profile uses the following role policy:

| Role | Recipe | Typical blur |
|---|---|---:|
| `surface` | `clear` | 0 |
| `control` | `clear` | 0 |
| `chrome` | `thin-glass` | 10 px |
| `sidebar` | `thin-glass` | 12 px |
| `elevated` | `thin-glass` | 16 px |
| `floating` | `thin-glass` | 14 px |
| `popover` | `thin-glass` | 18 px |

Large scientific/data surfaces remain clear by design.


### Glass fill opacity and Core legibility floors

`materialTintOpacity` keeps its historical API name, but in Theme Contract 3.5 renderers it means the fraction of the role's semantic base surface that Core mixes into a translucent glass recipe. For example, `.66` means roughly 66% semantic surface fill and 34% backdrop visibility. It does **not** mean “add 66% of the accent color.” Very small values such as `.03` therefore produce an almost transparent panel and should not be used as a normal frosted-glass default.

Studio 3.61.81 applies recipe-level legibility floors when a role selects `thin-glass`, `soft-glass`, or `liquid-glass`: `chrome` 58%, `sidebar` 62%, `elevated` 62%, `popover` 78%, and `floating` 58%. `surface` and `control` are normally `clear`. These are Core readability invariants, not built-in-theme exceptions: a built-in profile and an SDK theme plugin selecting the same recipe receive the same composition, nested-surface handling, popover portal behavior, and form-control treatment. Themes may author a higher opacity when they want a denser material.

Core owns Material Roles. Themes only select one of the registered recipe enums for each role. Theme plugins still cannot attach selectors, mutate Core DOM, ship arbitrary CSS, or register custom recipe names.

### MaterialSurface

Core primitives use the internal `DKDSMaterialSurface` helper or an equivalent Core-owned semantic surface. It assigns a registered Material Role and resolves the active Theme recipe. Plugin APIs do not expose host-DOM role assignment because role ownership belongs to Core.

### Opaque-parent diagnostics

Render Coverage distinguishes an optical renderer failure from an occluded backdrop. A glass surface whose ancestor places an opaque background between it and useful backdrop content is reported as `OPAQUE_PARENT_OCCLUSION`. Layout-only Core descendants use transparent backgrounds so the owning MaterialSurface is the only material paint layer.

### Development Theme Debug

Development builds expose `DKDSThemeDebug` and the `Ctrl+Alt+T` inspector. Hovering a Core UI reports:

- component;
- material role;
- resolved recipe;
- blur and saturation;
- material background;
- computed `backdrop-filter`;
- renderer status;
- opaque ancestor when present.

Diagnostics distinguish at least `REAL_MATERIAL`, `ROLE_MISSING`, `RECIPE_MISSING`, `BACKDROP_FILTER_NONE`, `OPAQUE_PARENT_OCCLUSION`, and `ENGINE_UNSUPPORTED`.

Renderer capability discovery includes:

```js
ctx.ui.theme.supports('renderer.recipes.thin-glass');
ctx.ui.theme.supports('renderer.thinGlass');
```


### Studio 3.62.0 / SDK 1.18.0 Legacy-Free baseline

- Material recipe selection remains profile-independent: profiles choosing the same recipe receive the same Core rendering/composition behavior.
- A Core surface with material role `chrome` owns its integrated header/status command hit regions. Theme plugins should not paint those child actions as independent cards.
- Theme profile availability is separate from user preference. If a Theme plugin is temporarily unloaded, Core may use a temporary effective fallback without replacing the saved preferred profile; registration restores the preferred profile.
- Existing renderer-persisted light/dark appearance is authoritative during desktop startup synchronization, preventing stale host state from silently changing the user's appearance.
