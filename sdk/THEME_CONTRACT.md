# DK Data Studio Theme Contract 3.10

Theme Contract 3.10 is the constrained Design System contract used by DK Data Studio 3.67.10+. Theme plugins provide semantic values; Core owns DOM, selectors, component identity, interaction state, Material role assignment, layout and rendering.

```js
ctx.ui.theme.contractVersion; // "3.10.0"
```

A new Theme package should declare:

```json
{
  "pluginType": "theme",
  "requiresCore": ["ui.theme"],
  "compatibility": {
    "app": ">=3.67.10 <4.0.0",
    "pluginApi": "^1.19.0",
    "themeContract": "^3.10.0"
  }
}
```

Themes written for supported Theme 3.x subsets remain valid on a 3.10 host when they stay within that declared subset. Theme plugins still may not ship arbitrary Core-targeting CSS, choose application selectors, mutate Core DOM, own layout, or provide pseudo-elements/keyframes/filter strings. Theme 3.10 does allow bounded literal shadow/radius depth slots, which Core validates and paints.

## Ownership model

Core is the single source of truth for:

- Component Identity
- Component Variant and interaction state
- Material Role and Material Recipe
- Theme token resolution and CSS-variable projection
- Gallery and real-page semantic mapping
- Scientific data-color precedence

A Theme owns only declared semantic values.

## 1. Base appearance tokens

Light and dark modes can provide the bounded appearance tokens (`canvas`, `surface*`, `control*`, `text*`, `accent*`, semantic colors, selection/active/disabled colors, shadows and radii). They are the fallback layer.

## 2. Material Roles

Stable Core roles remain finite:

```text
chrome
sidebar
surface
elevated
popover
control
floating
```

`floating` means a temporary surface that is physically over content. Persistent inspectors, docks, workspaces and pages are not floating merely because they are visually separate.

**Role-specific appearance** stays bounded to `surface / border / text`. Core chooses the role and recipe.

## 3. Component Appearance

Canonical identities are:

```text
tab
toolbarAction
toolbarGroup
panelHeader
inspectorHeader
menuItem
chip
statusBar
floatingChrome
field
```

Supported base fields are:

```text
surface
surfaceHover
surfaceActive
surfaceSelected
text
textSoft
textActive
textSelected
border
borderHover
borderActive
indicator
```

Theme Gallery and real application UI use the same Core resolver. For example, the real Curve Inspector header and the Gallery Inspector Header both resolve to `appearance.components.inspectorHeader.*`.


## 4. Theme 3.10 contextual composition

Theme 3.10 adds two finite Core-owned context axes:

```text
Component Context: standalone | grouped
Material Context: compact | panel | dialog | workspace-modal
```

A Theme may declare Component Appearance per Material Role and per Component Context. Components may also declare bounded Core-rendered depth slots:

```text
shadow
shadowHover
shadowActive
shadowSelected
radius
```

Material profiles may declare `contexts` and per-role `contexts`, while recipe policy may declare `recipes.contexts`. Core resolves the final composition in this order and projects one final set of CSS variables. Themes never select DOM locations themselves. This allows, for example, an expressive Aurora `toolbarAction` to use different depth when grouped on chrome versus grouped on a floating Material, and allows Thin Glass to use different optics for a compact popover versus a near-fullscreen `workspace-modal`.

Literal shadow slots are validated and do not accept dynamic/executable CSS functions such as `url()`, `var()`, `calc()`, `env()`, `attr()` or `expression()`.

## 4.1 Integrated floating chrome hard rule

`floatingChrome` is the single Material/edge owner for scientific plot navigation. A Core scientific floating toolbar is one fused silhouette: child `toolbarAction` items may change semantic fill/text for hover, active, selected, or destructive states, but child border, radius, and shadow are suppressed by Core. Themes express the group through `appearance.components.floatingChrome` plus `toolbarAction` tokens; they do not create per-button cards. Plugin CSS may not redefine the integrated chrome geometry.

## 5. Controlled Component Variants

Theme 3.9 adds a fixed Core-owned variant vocabulary:

```text
primary
secondary
selected
active
quiet
destructive
info
success
warning
danger
```

Only variants registered for a component are accepted. A Theme cannot invent variant names.

Example:

```js
appearance: {
  components: {
    toolbarAction: {
      variants: {
        primary: { surface:'#705CE8', text:'#FFFFFF' },
        secondary: { surface:'#E8F8F6', text:'#0D615D' },
        destructive: { surface:'#FFE8EC', text:'#B4233C' }
      }
    },
    chip: {
      variants: {
        info: { surface:'#E8F3FF', text:'#1769AA' },
        success: { surface:'#EAF8EF', text:'#18743A' }
      }
    }
  }
}
```

## 6. Controlled Advanced Effects

Theme 3.9 adds a small Core-rendered effect contract:

```js
effects: {
  headerGradientStart:'#705CE8',
  headerGradientEnd:'#17A7A0',
  accentGlow:'#705CE8',
  edgeGlow:'#17A7A0',
  ambientTint:'transparent',
  glowIntensity:0.12,
  glowRadius:14,
  gradientDirection:'horizontal'
}
```

Allowed fields are exactly:

```text
headerGradientStart
headerGradientEnd
accentGlow
edgeGlow
ambientTint
glowIntensity
glowRadius
gradientDirection
```

`gradientDirection` is one of `horizontal / vertical / diagonal-down / diagonal-up`.

Core restricts these effects to chrome-like semantic components such as Panel Header, Inspector Header and Floating Chrome. ScientificPlot bodies, table bodies and scientific data are never decorated by this effect contract.

## 7. Theme Consumption and Real Theme Inspector

`ctx.ui.theme.consumption()` exposes the canonical Core mapping. Theme authors do not infer identity from screenshots.

Development mode provides a real-page Theme Inspector (`Ctrl+Alt+T`). It reports the selected element's:

- component name / identity / variant / state
- material role / expected role / recipe
- appearance slot and resolved token/value/source Theme
- computed background/text/border/backdrop-filter
- explicit semantic/render error state

Representative error states include `UNMANAGED_COMPONENT_APPEARANCE`, `WRONG_COMPONENT_IDENTITY`, `ROLE_MISMATCH`, `RECIPE_MISMATCH`, `TOKEN_NOT_CONSUMED`, `AUTHORED_BUT_UNUSED`, `OPAQUE_PARENT_OCCLUSION`, `HARDCODED_APPEARANCE`, and `ENGINE_UNSUPPORTED`. For Plugin API 1.19 compatibility, `OPAQUE_PARENT_OCCLUSION` retains its historical public identifier; current diagnostics only raise it when a translucent Material is itself repainted opaque (`occlusionSource: "self"`) or a large unmanaged opaque descendant covers it (`occlusionSource: "child"`). An opaque ancestor is reported only as diagnostic context and does not by itself mean that `backdrop-filter` is ineffective.

## 8. Theme Coverage

`ctx.ui.theme.coverage()` reports independent coverage for:

- Material
- Component / Appearance
- State
- Semantic Color

Material areas use explicit states such as `NOT_PRESENT`, `MANAGED`, `PARTIAL`, `UNMANAGED`, and `ROLE_MISMATCH`. A role that is genuinely absent from the current page does not count as a failure. Existing UI that is present but unmanaged does.

Component coverage additionally reports `AUTHORED_BUT_UNUSED` and identity mismatches.

## 9. Theme Component Gallery parity

Software Management → Theme Test is the canonical Design System reference, not an isolated demo. Gallery component demos and real UI resolve through the same Component Identity / Appearance resolver. The parity report fails with `WRONG_COMPONENT_IDENTITY` when a real component maps to a different appearance slot.

## 10. Scientific series palette precedence

Scientific appearance remains fallback-only:

```text
user explicit color
> plugin/domain explicit color
> project-saved color
> Theme scientific fallback
> Core default palette
```

A Theme never changes the meaning of scientific data or overrides explicit series colors.

## 11. Material recipes

Core-owned recipes remain:

```text
clear
thin-glass
soft-glass
liquid-glass
```

Material controls optical composition; Component Appearance controls semantic color slots. `materialTintOpacity` is the semantic **base-material fill** opacity, not accent tint percentage. Core keeps readability floors for translucent recipes.

For translucent recipes Core applies minimum readable fill floors before rendering: `chrome` 58%, `sidebar` 62%, `elevated` 72%, `popover` 78%, and `floating` 58%. `surface` and `control` remain fully opaque at this layer. These are renderer invariants, not Theme-authored colors.

## 11. GroupPlot density

SDK 1.21 adds a Core-owned GroupPlot density policy:

```js
const group = ctx.ui.groupPlots.create(host, { density:'compact' });
group.setDensity('comfortable');
```

Supported values are `comfortable` and `compact`. Plugins can select a density but do not redefine the Core policy names.

## Compatibility

Theme Contract 3.9 is additive within major version 3. Capability discovery continues to advertise supported contract versions from 3.6 through 3.9. This is semantic contract compatibility, not a legacy CSS/DOM bridge.

## Validation

Use SDK 1.21:

```bash
node sdk/tools/dkds-plugin.js validate path/to/theme
node sdk/tools/dkds-plugin.js package path/to/theme theme.dkplugin
```
