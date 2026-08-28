# DK Data Studio Theme Contract 3.6

Theme Contract 3.6 is the only current authoring contract for Studio 3.62.0 and Plugin API 1.18.0. Theme packages declare semantic tokens and Material Recipes; Core owns selector assignment, DOM structure, readability floors and rendering.

## Capability discovery

```js
ctx.ui.theme.contractVersion; // "3.6.0"
ctx.ui.theme.supports('contract.materialBlur');
ctx.ui.theme.supports('contract.material.roles.chrome');
```

A Theme plugin declares:

```json
"compatibility": {
  "app": ">=3.62.0 <4.0.0",
  "pluginApi": "^1.18.0",
  "themeContract": "^3.6.0"
}
```

`compatibility` is package-version negotiation. It is not a runtime fallback to older Theme syntax.

## Canonical profile structure

Both mode branches are required and use structured `tokens`, `motion`, and `material` blocks:

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

Resolution order is deterministic:

1. Core built-in defaults.
2. Shared `profile.material` and `profile.motion`.
3. `modes.<mode>.tokens`, `modes.<mode>.motion`, and `modes.<mode>.material`.
4. `modes.<mode>.material.roles.<role>` for the semantic Material Role selected by Core.

Top-level `light` / `dark` aliases, flat token values inside a mode, and bare capability names are rejected.

## Validated values

Theme 3.6 source values are platform-neutral:

| Token family | Source form | Range |
|---|---|---|
| `materialBlur`, `materialBlurStrong`, radii, `hoverLift` | number logical units | token-specific validated range |
| `motionFast`, `motionNormal`, `motionSlow` | number milliseconds | 0–5000 |
| `materialSaturation` | number multiplier | 0–3 |
| `materialTintOpacity`, `materialNoiseOpacity` | number | 0–1 |
| `pressScale` | number | 0.8–1.2 |
| colors | hex / rgb(a) / hsl(a) / `transparent` | parsed color |
| easing | CSS keyword or `cubic-bezier(...)` | validated |
| shadows | non-empty shadow string | length-limited |

Unit-bearing source strings such as `12px`, `12dp`, `90ms`, or `66%` are rejected. Core performs platform projection after validation. Unknown tokens are validation errors.

## Platform mapping

- Web/Electron: one logical material unit maps to one CSS px.
- Android native shell: one logical material unit maps to one dp before native material projection.
- Duration numbers are milliseconds.
- Opacity is `0..1`.
- Saturation is a unitless multiplier.
- Scale is unitless.

## Material roles

Theme Contract 3.6 defines seven semantic material roles:

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
2. Translucent semantic **base-material fill** using `materialTintOpacity` as semantic base-material fill opacity, not accent-color tint.
3. Backdrop blur (`materialBlur` / `materialBlurStrong`) and saturation.
4. Fine material noise using `materialNoiseOpacity`.
5. `glassEdge` border.
6. `innerHighlight` inset highlight.
7. `specularHighlight` secondary inset/specular highlight.
8. Core-owned elevation shadow.

This order is fixed by Core so identical theme values produce predictable results across components. Themes control parameters, not DOM/CSS recipe order.


## Theme Coverage Contract

Theme Contract 3.6 exposes a runtime coverage report:

```js
const report = ctx.ui.theme.coverage();
```

The report distinguishes Core material coverage from plugin-owned unmanaged visuals. Core areas include app chrome, sidebars, workspaces/surfaces, elevated/dialog surfaces, popovers/tooltips, controls, ScientificPlot chrome and floating surfaces. Each present area is reported as `managed`, `partial` or `unmanaged`; absent areas are `not-present`.

Plugin style audit inspects plugin-injected CSS and inline styles for visual declarations that bypass semantic Theme tokens/material roles. The SDK validator emits `DKDS SDK THEME COVERAGE WARNING` for ordinary plugins that hard-code `background`, `color`, border colors, shadows, fills/strokes or private backdrop filters. Theme plugins remain stricter: arbitrary CSS is rejected.

The coverage audit is intentionally a contract/audit layer, not a license for themes to target arbitrary DOM. Core still owns selectors and recipes.

## Theme Test Gallery

Software Management -> Theme -> **主题测试** opens the Core Theme Test Gallery. It renders light and dark previews side by side and includes application chrome, sidebar, standard/elevated surfaces, buttons, input/select controls, a table, a ScientificPlot preview, chips and popover material.

The gallery is a visual coverage harness, not a replacement for SDK validation. A theme must pass validation before it can be packaged.

## Renderer truth

Contract support and renderer support are separate. `ctx.ui.theme.supports('contract.materialBlur')` means the profile schema accepts the token. `ctx.ui.theme.supports('renderer.backdropBlur')` means the active engine and Core renderer provide a computed backdrop-material path. Bare token names are not renderer capability checks.

Use `ctx.ui.theme.rendererCapabilities()` for engine, renderer, recipe and role readiness. `ctx.ui.theme.coverage()` inspects computed styles and reports renderer states such as `REAL_MATERIAL`, `BROKEN_MATERIAL_RENDERER`, `ROLE_MISSING`, `RECIPE_MISSING`, `BACKDROP_FILTER_NONE`, `OPAQUE_PARENT_OCCLUSION`, `LOW_CONTRAST_MATERIAL`, and `ENGINE_UNSUPPORTED`.

Core automatically assigns the seven Material Roles to Core-owned chrome, PluginWorkspace surfaces, dialogs, Portable Views, menus/tooltips, scientific floating chrome and standard controls. Plugins must use Core primitives; plugin-local paint that bypasses those primitives remains visible to the coverage audit.

Integrated command clusters are one material object. Their child buttons remain independent hit targets but do not receive independent material cards. Tooltip/popover foreground is Core-derived from the resolved material background and Core enforces a readability floor.

## Material recipes

Theme 3.6 exposes four recipe enums:

```ts
type DKDSMaterialRecipe =
  | 'clear'
  | 'thin-glass'
  | 'soft-glass'
  | 'liquid-glass';
```

- `clear`: stable opaque/semantic content surface.
- `thin-glass`: low-radius backdrop blur, mild saturation, translucent semantic fill, one edge and one elevation shadow.
- `soft-glass`: denser backdrop material without liquid refraction.
- `liquid-glass`: masked strong-blur edge plus Core-owned lens/specular response.

Themes choose recipes per semantic role; Core owns selectors and rendering. A profile must opt into glass explicitly through `recipes`. Core never infers a recipe from profile id or plugin identity.

```js
ctx.ui.theme.register('glass',{
  modes:{
    light:{tokens:{surface:'#fbfcfe'}},
    dark:{tokens:{surface:'#1d232e'}}
  },
  recipes:{popover:'liquid-glass',floating:'liquid-glass',sidebar:'soft-glass'},
  settings:[
    {id:'popoverBlur',label:'Popover blur',target:{scope:'material',role:'popover',key:'materialBlurStrong'},type:'range',min:16,max:64,step:1},
    {id:'popoverRecipe',label:'Popover material',target:{scope:'recipe',role:'popover'},type:'select',options:['soft-glass','liquid-glass']}
  ]
});
```

Theme settings are declarative. Core renders the settings UI, validates values through the same Theme Contract parser, persists overrides per profile and reapplies them on mode changes.

## Thin Glass and legibility

`thin-glass` is a separate renderer, not a reduced Liquid Glass mode. It contains no noise, masked strong-blur edge, refraction, chromatic aberration, dynamic specular or inner optical highlight. `filter: blur(...)` is never used for material rendering because it blurs the UI itself rather than the backdrop.

The built-in Thin Glass policy keeps scientific/content surfaces and controls `clear`, while chrome/sidebar/elevated/floating/popover roles use `thin-glass`. Core applies minimum semantic-fill floors to translucent roles so text and controls remain readable; a theme may author a denser fill but cannot lower Core's readability invariant.

Core readability floors for translucent recipes are: `chrome` 58%, `sidebar` 62%, `elevated` 62%, `popover` 78%, and `floating` 58%. `surface` and `control` use a 100% floor when the role is rendered through a translucent recipe. The SDK validator warns when authored `materialTintOpacity` is below these values; Core computes the effective fill with the same role floors.

`materialTintOpacity` is semantic base-material fill opacity. For example, `.66` means roughly 66% semantic surface fill and 34% backdrop visibility; it is not an accent tint percentage.

## MaterialSurface and diagnostics

Core primitives use the internal MaterialSurface layer to assign a Material Role and resolve the active recipe. Plugin APIs do not expose host-DOM role assignment.

Render Coverage distinguishes renderer failure from opaque-parent occlusion. Development builds expose `DKDSThemeDebug` and the `Ctrl+Alt+T` inspector, which report component, role, recipe, blur/saturation, material background, computed backdrop filter, renderer status and any opaque ancestor.

Renderer capability discovery includes:

```js
ctx.ui.theme.supports('renderer.recipes.thin-glass');
ctx.ui.theme.supports('renderer.recipes.soft-glass');
ctx.ui.theme.supports('renderer.recipes.liquid-glass');
ctx.ui.theme.supports('renderer.thinGlass');
ctx.ui.theme.supports('renderer.liquidGlass');
```

## Studio 3.62.0 / SDK 1.18.0 invariants

- Recipe behavior is profile-independent: profiles choosing the same recipe receive the same Core composition.
- A Core material surface owns integrated command hit regions; child actions are not independent cards.
- Saved theme preference is separate from temporary profile availability.
- Renderer-persisted light/dark appearance is authoritative during desktop startup synchronization.
- Theme packages cannot attach selectors, mutate Core DOM, ship arbitrary host CSS or register custom recipe names.
