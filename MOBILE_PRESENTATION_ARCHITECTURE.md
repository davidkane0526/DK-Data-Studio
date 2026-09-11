# DK Data Studio — Mobile Presentation Architecture

Current implementation baseline: **v3.69.4 Final Archive**  
Plugin API: **1.19.0**  
Current SDK: **1.47.0**  
Phase E interoperability contract: **formally frozen at v3.69.0**

## 1. Principle

Mobile is not a wrapped Desktop webpage and must not be implemented as Desktop DOM/CSS plus a growing override sheet.

The architecture remains:

```text
Core data / project / algorithms / state
                ↓
Core Presentation Model (semantic surfaces)
          ┌─────┴─────┐
          ↓           ↓
Desktop Presenter   Mobile Presenter
          ↓           ↓
mouse/keyboard      touch/gesture
```

Business/runtime APIs stay shared. Platform presentation may differ, but a plugin must not create parallel business APIs such as `ctx.ui.desktop` and `ctx.ui.mobile`.

## 2. Current semantic surface mapping

| Semantic role | Compact Mobile | Wide / expanded Mobile |
| --- | --- | --- |
| `scientific-primary` / `data-primary` / `utility-primary` | main workspace | main workspace |
| `data-control` / `presentationPurpose=parameters` | left temporary drawer | left temporary drawer |
| `inspector` | bottom/transient companion | right companion |
| PRIME `scientific-secondary` | route / companion | bottom companion |
| SUB `scientific-secondary` | route | route |

The host uses actual WebView width rather than orientation alone. The primary scientific surface remains the anchor and must not disappear when a secondary feature is opened.

## 3. Current Mobile shell

- Top command order is `导入 / 数据 / 工作区 / 分析 / 插件`, followed by plugin-owned commands.
- Plugin command overflow is solved from measured pixel width. Only plugin commands enter the top overflow menu.
- Parameter surfaces are generated from semantic Core surfaces. The drawer is content-fit by default, manually resizable from a visually transparent in-edge hit rail, vertically scrollable only, and dismissed by a consumed outside pointer press.
- Bottom status items retain priority `AI > SMB > 网页服务 > 主题 > 内存 > DevTool`; shrinking therefore collects DevTool first and AI last.
- Theme, status, history, SMB/AI/Web service state stay Core/Shell responsibilities rather than plugin-owned Mobile pages.

## 4. Scientific workspace behavior

- Primary plot, inspector and scientific-secondary surfaces can coexist on wide tablets/foldables.
- Right/bottom companions reuse Core split semantics but persist Mobile-scoped geometry.
- Bottom companions are bounded so drag cannot consume the primary scientific workspace; the current expanded Mobile ceiling is 58% (compact CSS ceiling about 54vh), with a 240 px primary-area reserve.
- Plot floating tools use the native touch-drag adapter and keep Desktop pointer/coalesced-event behavior separate.
- Plugin-specific multi-chart pages and parameter groups must size/reflow from their actual surface or drawer width, not device breakpoints such as `max-width:1050px`.
- Repeated scientific/result cards use responsive `auto-fit` grids; readable minimum width is a floor, not a fixed card width.

## 5. Drawer composition ownership

The Mobile Presenter owns the drawer frame, single vertical scroll axis, width persistence, resize gesture and outside-dismiss behavior. Core Mobile platform CSS owns the edge-to-edge semantic header geometry and scrollbar/resize affordance. Plugins own only domain-local composition inside the drawer and should use container-driven tracks rather than Desktop-width assumptions.

A plugin must not reserve a private scrollbar gutter or paint a resize rail. Horizontal drawer scrolling and browser `resize` UI are prohibited because they create the right-side blank strip and scrollbar-corner artifact seen on the real Android device.

## 6. Desktop isolation

`data-dkds-host` is the authoritative platform boundary. Touch-capable Windows hardware may report `(pointer: coarse)`, but that must not opt the Electron Desktop presenter into Mobile/touch geometry. Platform selectors therefore need both capability and host ownership where geometry differs.

Desktop Visual Closure remains the intended baseline. Mobile work must not change Desktop geometry unless a Desktop issue is explicitly reported and the corresponding owner is deliberately reopened.

## 7. SDK 1.25 platform-presentation contract

SDK 1.25 closes the main authoring weakness exposed by the v3.67.47 Resonance gate-grid regression. A UI-owning plugin now explicitly declares Desktop and Mobile presentation policy instead of placing every stylesheet in one unconditional list.

The additive manifest contract is:

```json
{
  "styles": ["shared.css"],
  "platformPresentation": {
    "desktop": {
      "mode": "shared"
    },
    "mobile": {
      "mode": "custom",
      "scripts": ["mobile-presentation.js"],
      "styles": ["mobile.css"]
    }
  }
}
```

Supported modes are `shared`, `adaptive` and `custom`. `shared` and `adaptive` do not accept platform-only files. `custom` requires at least one platform-only style or script. UI-owning SDK 1.25 projects must declare both platforms during validation.

### Loading and cascade

- Shared plugin styles load in `dkds.plugin`.
- Platform-specific styles load only on the active host in `dkds.plugin-platform`.
- `dkds.plugin-platform` is later than shared plugin CSS but still earlier than Core structure/presentation/theme authority.
- Platform-specific scripts load only on the active host.
- Dedicated Electron plugin windows select Desktop presentation.
- Built-in generated indices and external `.dkplugin` packages preserve shared/platform assets separately.

This removes the need for Mobile CSS to beat Desktop/shared CSS through higher selector specificity or `!important`. A Mobile package no longer needs to load Desktop-only presentation assets and Desktop no longer consumes Mobile-only assets.

### Compatibility

Plugin API remains 1.19.0. Runtime normalization accepts older Plugin API 1.19 packages without `platformPresentation` and interprets them as shared/shared, so the SDK authoring upgrade does not itself break already-installed packages. Re-validating/repackaging a UI-owning plugin with SDK 1.25 requires an explicit policy. Theme plugins continue to use Theme Contract 3.10 and must not declare `platformPresentation`.

## 8. Why not create two Plugin APIs

Desktop and Mobile can have separate presentation modules without having separate data/science APIs. Keeping one runtime API preserves:

- one scientific algorithm implementation,
- one project/history/state model,
- one plugin package identity,
- one semantic surface contract,
- predictable migration and testing.

The correct split is **shared plugin logic + explicitly declared platform presentation**, not **Desktop plugin + Mobile plugin**.

## 9. First-party adoption from v3.67.49

The first-party plugins now declare an explicit policy. Domain-specific Mobile files for Resonance, Data Center, Pulse Analysis and Pulse Sampler were removed from unconditional `styles` and moved to `platformPresentation.mobile.styles`. Shell/status infrastructure uses `adaptive`, while intentionally identical surfaces use `shared`.

The SDK templates and standalone Vth example also declare a policy so new plugin development starts with Mobile responsibility visible rather than treating it as post-release cleanup.

## 10. v3.67.50 interaction/performance ownership

- Menu popovers use a paint-hidden first-paint transaction: connect DOM, synchronously compose Material/Component appearance, position, then reveal. Desktop and Mobile share the same menu lifecycle and therefore cannot expose a default-browser frame for one render.
- Mobile Presenter projection writes are idempotent and stable snapshots short-circuit reparenting/reflow work. First-time Drawer auto-fit is paint-hidden until the final width is known.
- Native Mobile plugin-canvas splitters use the canonical `SplitController`. It caches drag-session geometry and coalesces raw pointer movement, while a pure resolver applies platform limits without replacing instance methods. Desktop and Mobile therefore share one authored owner and retain separate effective constraints.
- Data Management uses Drawer container width for header/filter/action/list density rather than treating the Mobile host as a scaled Desktop panel.

## 11. Next architecture step

After SDK 1.25 host/package regression validation and real-device acceptance, continue with authoring quality rather than adding another parallel API:

1. add stronger container-driven layout lint for custom Mobile presentation,
2. add a dedicated SDK example that demonstrates a custom Mobile presenter script without duplicating business logic,
3. keep migrating plugin-specific viewport media queries toward container/available-width composition where they represent local panel geometry,
4. preserve Desktop Visual Closure while validating Mobile custom assets on the real Android host.


## 11. v3.67.51 first-paint parameter ownership and host-separated scientific chrome

- Scientific floating controls are a platform-presentation concern. The frozen shared semantic surface keeps its neutral geometry slots; Desktop and native Mobile feed independent host-specific sizes. Desktop uses a compact CSS-viewport-adaptive range rather than physical display resolution, while Mobile may retain a stable touch-oriented compact size without consuming Desktop tuning.
- A Mobile `data-control` / `parameters` PRIME must not visibly paint inside the main route before Presenter projection. A plugin that owns custom Mobile presentation may suppress its already-registered PRIME while it is outside the Presenter-owned Drawer region; business state and Plugin API remain shared.
- Native Plugin Manager controls are composed for the actual Mobile workspace: search has a canonical field shell, wide tablets use one ordered command row, and narrower viewports reflow through explicit platform geometry without changing Desktop layout.
