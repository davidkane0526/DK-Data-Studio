# DK Data Studio — Mobile Presentation Architecture

Current implementation baseline: **v3.71.99 WIP**  
Plugin API: **1.19.0**  
Current SDK: **1.51.42**  
Unit Templates: **2.5.37 / 41 Units / 73 Layout recipes**  
Phase E interoperability contract: **formally frozen at v3.69.0**

## 1. Principle

Mobile is not a wrapped Desktop webpage and must not be implemented as Desktop DOM/CSS plus a growing override sheet. The same semantic Surface model is projected by a platform Presenter, but **outer geometry has one owner per boundary**.

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

Business/runtime APIs stay shared. Plugins must not create parallel platform APIs or plugin-specific Mobile geometry paths.

## 2. Semantic Surface mapping

| Semantic role | Compact Mobile | Wide / expanded Mobile |
| --- | --- | --- |
| `scientific-primary` / `data-primary` / `utility-primary` | main workspace | main workspace |
| `data-control` / `presentationPurpose=parameters` | left temporary drawer | left temporary drawer |
| `inspector` | semantic companion | right companion |
| PRIME `scientific-secondary` | semantic companion / route according to Presenter mapping | bottom companion |
| SUB `scientific-secondary` | route | route |

The primary scientific Surface remains the workspace anchor. Opening a secondary Surface must not replace or resize it through content feedback.

## 3. Universal companion outer-geometry contract

Every semantic `companion-right` and `companion-bottom` uses the **same framework path**. There is no accepted-scientific/Resonance/TER profile allocator.

```text
Workspace SplitController
(default + user preference)
        ↓
shared Mobile viewport bound
(right: 46vw, bottom: 58vh, plus common caps/floors)
        ↓
CSS grid track
        ↓
projected Surface
        ↓
Unit adapts / scrolls internally
```

Rules:

- Workspace SplitController is the sole owner of right/bottom default and user-preference size.
- Shared Mobile CSS bounds that preference against the current live viewport.
- Mobile Presenter only projects a semantic Surface into the allocated track; it does **not** read Unit minima, `scrollHeight`, descendant overflow, recipe names, plugin identity or content observers to renegotiate the parent track.
- Unit `detailGeometry`, responsive density and PlotGroup constraints remain internal to the allocated Surface. If space is less comfortable than a Unit preference, the Unit reflows or its canonical internal body scrolls. It does not enlarge its parent companion track.
- Parameter Drawer width is a separate overlay contract and never reserves/shrinks scientific tracks.
- Mobile split persistence uses one Core-owned schema (`workspace-owned-v1`) for all workspaces. Plugins/profiles cannot create private Mobile split generations.

This restores the simple outer ownership that existed before the content-driven companion negotiation series while retaining the current Unit/SDK composition architecture.

## 4. Current Mobile shell

- Top command order is `导入 / 数据 / 工作区 / 分析 / 插件`, followed by plugin-owned commands.
- Plugin command overflow is solved from measured pixel width. Only plugin commands enter the top overflow menu.
- Parameter surfaces are generated from semantic Core surfaces. The Drawer has a 25% live-page hard floor, grows only for real Unit intrinsic inline constraints, is manually resizable, remains vertically gesture-scrollable through one hidden-scrollbar viewport, preserves the canonical final clipping-boundary breathing room, and keeps accepted parameter Header anatomy.
- Bottom status items retain priority `AI > SMB > 网页服务 > 主题 > 内存 > DevTool`; shrinking therefore collects DevTool first and AI last.
- Theme, status, history, SMB/AI/Web service state stay Core/Shell responsibilities rather than plugin-owned Mobile pages.

### Historical correction

The 3.71.84–3.71.98 experiments that let Unit content/minima, internal scroll extent, profile allocators, Drawer occupancy, style guards or per-profile split generations influence scientific companion outer tracks are superseded by the universal Workspace-owned contract above. Their changelog records remain history only and are not current architecture.

## 5. Drawer composition ownership

The Mobile Presenter owns the drawer frame, single vertical scroll axis, width persistence, resize gesture and outside-dismiss behavior. The Drawer clipping boundary materializes the canonical 6 px parameter safe inset: top/inline spacing belongs to the Drawer content wrapper and a real terminal safe extent owns block-end scroll space after descendant overflow. Presenter must not replay the projected PRIME root Unit Layout while fitting width. Core Mobile platform CSS owns the edge-to-edge semantic header geometry and resize affordance; the overall Drawer scrollbar is hidden. Plugins own only domain-local composition inside the drawer and should use container-driven tracks rather than Desktop-width assumptions. Tabs, Header actions and other atomic Unit anatomy publish live intrinsic constraints through the shared Unit registry; plugins do not write Drawer width.

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
## Native Mobile plugin identity and parameter-drawer width (v3.71.61+)

Native Mobile owns plugin/activity identity in the host top bar. A plugin-local page/activity header such as a Unit `pageHeader` must not consume content height on Mobile, even when composition nests that header inside a Unit page body. The native shell therefore suppresses `.analysis-page-header` at any depth for plugin pages. System-owned pages that explicitly need their own header may opt in through Core-owned exceptions. Plugins must not add private Mobile CSS to hide their own title bars.

The `data-control` / parameters surface remains a left transient Drawer. First-open automatic sizing is **content- and Unit-composition-derived above one product readability floor of 25% of the live viewport**; that fraction is a hard minimum only, never a target/default width or an arbitrary tablet cap. The Presenter searches from narrow to wide for the first usable responsive composition because Unit layouts are non-monotonic: reducing width may legitimately drop a column and become valid again. Ordinary input/select/control geometry is shrinkable and must not own the Drawer width merely because a Desktop rule uses `1fr` or `width:100%`. By contrast, canonical Unit/control spacing and Surface padding are non-compressible, and required labels/structure plus complete primary/fill action text must remain readable. The fitter never rewrites `gap`, `row-gap`, `column-gap` or padding to win a smaller width. User resize remains bounded only by the real available workspace; persistence is versioned so failed historical width generations cannot return.

The Curve Inspector is **not** part of this Drawer sizing contract. `inspector` remains a `companion-right` semantic surface whose geometry belongs to the existing Mobile companion lane, `SplitController`, and explicit user PortableView placement. Parameter-Drawer measurement must never set an Inspector runtime minimum/default or change its placement ownership.
## v3.71.88 parameter-surface width / legend contract

For `presentationPurpose: parameters`, Mobile Presenter owns the outer Drawer allocation and applies a 25% viewport hard floor. Unit geometry constraints can only raise that minimum. Parameter legends, Desktop rail widths, and persisted widths are not Drawer-width owners. Ordinary Unit content can still raise the minimum through the shared live intrinsic-overflow/constraint path—for example an intentionally unwrapped action row whose real labels no longer fit—without the Presenter knowing those labels or the plugin identity. Composite Header actions publish their real inline start plus full action width, so nested Tabs cannot be clipped merely because the wrapper itself still fits. Parameter legends follow the assigned Drawer width, render horizontally in at most three rows, then use horizontal scrolling without a visible scrollbar. Right/bottom companion lanes are geometrically independent of the parameter Drawer; no Drawer occupancy token is published or consumed.

