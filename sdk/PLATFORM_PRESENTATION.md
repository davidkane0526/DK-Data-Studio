# Platform Presentation Authoring Contract — SDK 1.25

SDK 1.25 makes Desktop/Mobile presentation ownership explicit while preserving a single Plugin API 1.19.0 and a single shared plugin runtime.

## Principle

A plugin owns one domain/runtime implementation. Core state, project data, algorithms, commands, semantic surfaces and capability declarations are shared. Platform differences belong to presentation only.

Do not create parallel business APIs such as `ctx.ui.desktop` or `ctx.ui.mobile`. If Desktop and Mobile need different composition, declare the presentation policy in the manifest and keep platform-only view code in platform assets.

## Manifest contract

UI-owning plugins must declare both platforms:

```json
{
  "entry": "plugin.js",
  "scripts": ["plugin.js"],
  "styles": ["plugin.css"],
  "platformPresentation": {
    "desktop": { "mode": "shared" },
    "mobile": {
      "mode": "custom",
      "styles": ["mobile.css"],
      "scripts": ["mobile-presentation.js"]
    }
  }
}
```

Supported modes:

| Mode | Meaning | Platform files |
| --- | --- | --- |
| `shared` | Shared presentation is intentionally correct on this platform. | Forbidden |
| `adaptive` | Core Presenter adapts the plugin's semantic surfaces for this platform. | Forbidden |
| `custom` | Plugin supplies platform-specific presentation assets. | At least one CSS or JS file required |

A file used by both platforms belongs in `styles`/`scripts`, not in both platform declarations. The plugin entry must remain shared and must not be repeated as a platform script.

## CSS ownership and cascade

Shared plugin CSS is injected into:

```css
@layer dkds.plugin
```

Selected platform CSS is injected into:

```css
@layer dkds.plugin-platform
```

The Core cascade order is:

```text
dkds.foundation
→ dkds.plugin
→ dkds.plugin-platform
→ dkds.structure
→ dkds.presentation
→ dkds.theme
→ dkds.platform
→ dkds.window
→ dkds.utility
```

`dkds.plugin-platform` is later than shared plugin CSS so platform composition can replace shared plugin geometry without selector escalation, but it is still earlier than Core-owned structure/presentation/theme authority. `ctx.ui.styles.add(...)` remains a shared plugin-style API and does not expose arbitrary layer selection.

## Host selection

- Main Desktop/Web renderer selects `desktop` presentation.
- Native Mobile host selects `mobile` presentation.
- Dedicated Electron plugin windows select `desktop` presentation.
- Only assets for the selected platform are loaded.

The generated built-in plugin index stores shared and platform assets separately. External `.dkplugin` packages preserve the same separation.

## Current-contract-only behavior

Every UI-owning package must explicitly declare both `platformPresentation.desktop` and `platformPresentation.mobile`. Authoring validation, Desktop package normalization, Mobile package normalization, Core runtime validation, and host asset selection all enforce the same rule. The host does not infer `shared/shared`, negotiate an older policy, or load a UI package that omits this contract. Migrate the package before loading it.

Non-UI plugins may omit `platformPresentation` because they do not own presentation assets. Theme plugins must not declare `platformPresentation`; Theme Contract 3.10 is the only theme appearance extension surface.

## Choosing a mode

Use `shared` when the exact shared composition is deliberately valid on that platform.

Use `adaptive` when the plugin is already expressed through semantic PRIMARY/PRIME/SUB surfaces and Core can choose placement, drawer/companion behavior and platform interaction without plugin-specific presentation files.

Use `custom` when the plugin has domain-specific responsive composition or interaction that Core cannot infer generically. Keep the custom asset focused on presentation. Do not duplicate data/state/algorithm logic into it.

## Validation

Run:

```text
node sdk/tools/dkds-plugin.js validate <plugin-folder>
```

Validation rejects missing policies for UI-owning SDK 1.25 plugins, invalid modes, platform assets on non-custom modes, duplicate shared/platform files, the same platform asset assigned to both platforms, and platform-only host selectors left in shared CSS.
