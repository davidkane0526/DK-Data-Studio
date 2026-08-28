# DK Data Studio Theme Contract 3.8

Theme Contract 3.8 is a constrained Design System contract. Theme plugins provide semantic values; Core owns DOM, selectors, layout, component identity, interaction state detection and Material rendering.

```js
ctx.ui.theme.contractVersion; // "3.8.0"
```

A Theme plugin declares:

```json
{
  "pluginType": "theme",
  "requiresCore": ["ui.theme"],
  "compatibility": {
    "app": ">=3.64.0 <4.0.0",
    "pluginApi": "^1.18.0",
    "themeContract": "^3.8.0"
  }
}
```

Theme plugins may not ship arbitrary CSS, choose DOM selectors, modify layout, inject pseudo-elements/keyframes, or own component structure.

## Ownership model

Theme supplies semantic values. Core assigns DOM/component/material roles and owns rendering. Theme cannot select or mutate application DOM.

## 1. Base appearance tokens

Light and dark modes can provide the existing bounded appearance tokens (`canvas`, `surface*`, `control*`, `text*`, `accent*`, semantic state colors, selection/active/disabled colors, shadows and radii). These remain the fallback layer.

## 2. Role-specific appearance

Theme 3.7 introduced role appearance; 3.8 keeps it intentionally small:

```js
appearance: {
  roles: {
    chrome:   { surface:'#F3F1FC', border:'#DED9F4', text:'#1C2740' },
    sidebar:  { surface:'#EEF7F5' },
    elevated: { surface:'#FFF5F8' },
    popover:  { surface:'#F4F1FF' },
    floating: { surface:'#EEF8FA' }
  }
}
```

Roles are spatial semantics only. Allowed fields are `surface / border / text`.

## 3. Component Appearance Contract

Theme 3.8 adds bounded Design System component slots. Core decides which DOM belongs to each component; Theme only supplies colors.

Supported components:

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

Supported fields:

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

Example:

```js
appearance: {
  components: {
    tab: {
      surface:'transparent',
      surfaceHover:'#F3F1FC',
      surfaceActive:'#EEE9FF',
      text:'#59677F',
      textActive:'#352A79',
      indicator:'#705CE8'
    },
    toolbarAction: {
      surfaceHover:'#F3F1FC',
      surfaceActive:'#E9F8F6',
      textActive:'#0D615D'
    },
    panelHeader: { surface:'#F7F5FD' },
    inspectorHeader: { surface:'#EFF8F7', indicator:'#17A7A0' },
    field: { surface:'#FFFFFF', border:'#D8DEEA', borderActive:'#705CE8' }
  }
}
```

Unknown component names or fields are validator errors. No CSS property passthrough exists.

## 4. Theme Consumption Contract

`ctx.ui.theme.consumption()` exposes Core's semantic mapping rather than forcing Theme authors to infer it from screenshots:

```js
const map = ctx.ui.theme.consumption();
map.components.tab.slots.surfaceActive;
// { path: 'appearance.components.tab.surfaceActive', fallback: 'activeSurface' }
```

`ctx.ui.theme.appearanceComponents()` returns the active authored component overrides. Theme Debug reports the hovered element's component, state, resolved slot, contract path, CSS variable, value and source (`theme` or `core-fallback`).

The mapping is read-only. Theme plugins cannot change Core component identity or consumption rules.

## 5. Theme Coverage

`ctx.ui.theme.coverage()` includes:

- Material Role coverage
- Component Appearance coverage
- interaction-state contract coverage
- semantic color consumption
- `AUTHORED_BUT_UNUSED` diagnostics
- contrast and plugin visual ownership checks

A component slot authored by a Theme but not wired to any Core consumption path is a contract failure instead of silently doing nothing.

## 6. Component Gallery

Software Management → Theme Test renders both light and dark previews for:

- Material surfaces
- tabs and toolbar actions/groups
- panel/inspector headers
- fields
- menu/context-menu items
- chips and semantic info/success/warning/danger states
- status bar and floating chrome
- Tooltip/Popover
- ScientificPlot, legend and table

Each demo shows its component appearance path and resolved variable so Theme development does not depend on hunting through application pages.

## 7. Scientific series palette precedence

Theme 3.8 formalizes scientific palette behavior:

```js
scientific: {
  mode: 'fallback-only',
  seriesPalette: ['#705CE8','#17A7A0','#D96A91']
}
```

`mode` only accepts `fallback-only`.

Machine-readable precedence is:

```text
user explicit color
> plugin/domain explicit color
> project-saved color
> Theme scientific fallback
> Core default palette
```

`ctx.ui.theme.scientific()` returns the active palette, mode, and precedence list. A Theme never replaces an explicit scientific color.

## 8. Material and settings

The existing bounded Material parameters, Core-owned recipes, and declarative single-target Theme settings remain available. Material roles and Component Appearance are independent: Material controls optical composition; Component Appearance controls semantic color slots.

Core-owned Material recipes remain explicit and finite:

```text
clear
thin-glass
soft-glass
liquid-glass
```

Role-specific appearance never replaces these recipes: role appearance chooses semantic surface/border/text values, while Core-owned recipes determine optical composition. Theme plugins cannot add arbitrary Material recipe CSS.

`materialTintOpacity` controls the semantic **base-material fill**, not an accent-color tint amount. The resolved role/base appearance remains the color source; the recipe controls how much of that semantic base participates in the optical material. Core enforces readability floors for translucent recipes, including `chrome` 58%, `sidebar` 62%, and `popover` 78%. Theme authoring may request a stronger fill, but values below the Core floor are clamped by the renderer rather than becoming a second appearance owner.

Multi-token presets (`Soft / Balanced / Vivid`) remain deferred. They require a separate, explicit precedence model and are not implemented by arbitrary Theme JavaScript.

## Compatibility

Theme Contract 3.8 is additive. A Theme using only 3.6/3.7 fields remains structurally valid when its declared semver range includes 3.8. Runtime capability checks preserve `contract:3.6.0` and `contract:3.7.0` alongside `contract:3.8.0`; this is semantic contract compatibility, not a CSS/DOM compatibility bridge. Future or different-major contract IDs are not advertised.

## Validation

Use SDK 1.20:

```bash
node sdk/tools/dkds-plugin.js validate path/to/theme
node sdk/tools/dkds-plugin.js package path/to/theme theme.dkplugin
```

The same Theme profile/source contract is used by SDK validation and the application package installer.
