# DK Data Studio Theme Contract 3.7

Theme Contract 3.7 is a semantic appearance contract. A theme supplies validated values; Core owns DOM structure, selectors, Material Role assignment, component geometry, contrast enforcement, and rendering. Theme plugins must not ship arbitrary CSS or inspect/rewrite application DOM.

```js
ctx.ui.theme.contractVersion; // "3.7.0"
ctx.ui.theme.supports('contract.appearance.roles');
ctx.ui.theme.supports('contract.scientific.seriesPalette');
```

A theme manifest targets the contract independently of Plugin API:

```json
{
  "apiVersion": "1.18.0",
  "pluginType": "theme",
  "requiresCore": ["ui.theme"],
  "compatibility": {
    "app": ">=3.63.0 <4.0.0",
    "pluginApi": "^1.18.0",
    "themeContract": "^3.7.0"
  }
}
```

## Ownership model

The visual resolution order is intentionally one-way:

```text
base appearance tokens
        ↓
optional role appearance override
        ↓
Core component → Material Role assignment
        ↓
Core material recipe / renderer
```

A Theme chooses semantic appearance. Core decides which UI is `chrome`, `sidebar`, `surface`, `elevated`, `popover`, `control`, or `floating`. A plugin can declare/use Core semantic surfaces, but cannot make Theme-dependent selectors or repaint Core chrome.

## Base appearance

Each light/dark mode may provide validated `tokens`. Existing surface/text/control tokens remain the fallback layer. Theme 3.7 adds:

- alternate accent: `accentAlt`, `accentAltHover`, `accentAltSoft`;
- semantic status: `success`, `warning`, `danger`, `info` and `*Soft` variants;
- interaction state: `selectionSurface`, `selectionText`, `selectionBorder`, `activeSurface`, `activeText`, `disabledSurface`, `disabledText`.

`selected`, `active`, `focus`, and `hover` are intentionally distinct semantics. Themes should not collapse them into one color unless that is a deliberate design choice.

## Role-specific appearance

Theme 3.7 adds a constrained `appearance.roles` layer. Every field is optional:

```js
appearance: {
  roles: {
    chrome:   { surface:'#F3F1FC', border:'#DED9F4', text:'#1C2740' },
    sidebar:  { surface:'#EEF7F5' },
    elevated: { surface:'#FFF5F8' },
    popover:  { surface:'#F0F3FF' },
    floating: { surface:'#EEF8FA' }
  }
}
```

Allowed roles are the seven Core Material Roles. Allowed appearance keys are only:

```text
surface
border
text
```

Unknown roles or fields are validation errors. Omitting a value preserves the base-token fallback. This provides color separation without turning Theme into a component CSS API.

A mode may override the shared role appearance:

```js
modes: {
  light: { appearance:{ roles:{ sidebar:{surface:'#EEF7F5'} } } },
  dark:  { appearance:{ roles:{ sidebar:{surface:'#14262B'} } } }
}
```

## Material recipes

Recipes remain Core-owned: `clear`, `thin-glass`, `soft-glass`, `liquid-glass`. Themes choose a recipe for each semantic Material Role and provide validated material values. They do not implement blur/refraction/optical pseudo-elements themselves.

```js
recipes: {
  chrome:'thin-glass', sidebar:'thin-glass', surface:'clear',
  elevated:'thin-glass', popover:'thin-glass', control:'clear', floating:'thin-glass'
}
```

Role appearance and material are orthogonal: role appearance supplies semantic surface/border/text; the Core recipe decides how that surface is composited.

`materialTintOpacity` is the historical token name for semantic **base-material fill** opacity, not an accent tint. Core keeps readability floors for glass recipes; the current minimum semantic fill is `chrome` 58%, `sidebar` 62%, `elevated` 64%, `floating` 64%, and `popover` 78%. A profile may request a lower value, but the runtime will clamp the effective fill rather than render unreadable transparent chrome.

## Scientific series palette

A theme may optionally supply a default automatic scientific palette:

```js
scientific: {
  seriesPalette: ['#2563EB','#14B8A6','#8B5CF6','#EF4444','#F59E0B']
}
```

The palette contains 2–32 validated colors. It is a fallback only:

```text
explicit user/plugin series color
        ↓ wins
Theme scientific.seriesPalette
        ↓
Core default scientific palette
```

A Theme must never overwrite an explicit scientific-data color. `ctx.ui.theme.scientific()` exposes the active resolved fallback palette to Core/host projections.

## Runtime inspection

`ctx.ui.theme.appearanceRoles()` returns the active authored role overrides. `ctx.ui.theme.materials(...)` returns normalized material values. Theme Debug / Material inspection resolves the actual fallback and reports the semantic role, recipe, base token/base color, and occluding child when applicable.

## Theme settings

Theme 3.7 retains validated single-target settings for token/material/recipe values. Multi-token derived presets such as `Soft / Balanced / Vivid` are intentionally deferred; 3.7 first stabilizes appearance inheritance and role/state semantics.

## Compatibility

Theme 3.7 is additive to canonical Theme profiles. A 3.6-style profile that does not use the new fields still normalizes under 3.7 when its declared semver range permits it. No compatibility CSS or DOM bridge is introduced.

## Validation

Validate/package with SDK 1.19:

```bash
node sdk/tools/dkds-plugin.js validate path/to/theme
node sdk/tools/dkds-plugin.js package path/to/theme theme.dkplugin
```

The validator checks profile schema, value ranges, Theme Contract compatibility, package/source ownership, and forbidden UI infrastructure bypasses.
