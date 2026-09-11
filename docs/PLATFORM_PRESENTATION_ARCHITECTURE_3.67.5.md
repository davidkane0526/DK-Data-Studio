# v3.67.5 — Plugin API 1.19 Presentation Cutover

## Purpose

v3.67.5 closes the compatibility boundary left intentionally open by v3.67.4. Plugin API 1.19 is a deliberate breaking cutover: a TOP workspace must describe every platform-relevant region as an explicit semantic Surface. Desktop and Mobile still consume one Plugin API and one Core Presentation Model; plugins do not receive platform-specific facades.

## Contract change

The host accepts **Plugin API `1.19.0` exactly**. Plugin API 1.18 packages are rejected before activation and must be migrated/repackaged with SDK 1.23.0.

PRIMARY is exactly one semantic main surface. `mountPrimary()` no longer accepts `leftNode` or `leftHtml`, and its mount callback no longer receives `left` or `slots`. Controls, inspectors, diagnostics and secondary scientific views must be registered as PRIME/SUB surfaces.

Every TOP `layout.primary`, `layout.prime[]` and `layout.sub[]` surface must declare one of the Core presentation roles:

- `scientific-primary`
- `data-primary`
- `utility-primary`
- `data-control`
- `inspector`
- `scientific-secondary`

The role describes UI meaning, not Desktop geometry. Desktop placement remains a Presenter/Workbench concern.

## Migration example

Plugin API 1.18 form:

```js
wb.mountPrimary({
  id:'main',
  mainNode:plot,
  leftNode:controls
});
```

Plugin API 1.19 form:

```js
wb.mountPrimary({id:'main',mainNode:plot});
wb.registerPrime({
  id:'data-control',
  presentationRole:'data-control',
  semanticKind:'panel',
  autoOpen:true,
  defaultPlacement:'left',
  existingNode:controls
});
```

The matching `ctx.ui.topWorkspace.register(...)` contract declares the same `data-control` surface. `defaultPlacement:'left'` is Desktop runtime configuration; it is not a cross-platform presentation role.

## Mobile cutover

The old PRIMARY-left Mobile compatibility path is removed:

- `native-legacy-workspace.css` is deleted;
- `workspace.panel.toggle` is removed from Interaction Intent;
- the Mobile Host no longer accepts a `panel` request;
- React Native no longer renders a fallback “数据 / 参数” drawer button;
- Mobile Web projection uses only Presenter `main / sheet / rail / route` regions.

A malformed/incomplete Presentation Contract is now reported as invalid by `DKDSPresentation.audit()` rather than receiving a Desktop-geometry fallback.

## API ownership

There is still exactly one Plugin API. `ctx.ui.desktop` and `ctx.ui.mobile` do not exist. Mouse/keyboard and touch/gesture inputs map to the same Interaction Intent layer, while DesktopPresenter and MobilePresenter project the same Core semantic state into different platform presentation.

## Release gates

The v3.67.5 regression gate protects all of the following:

- exact Plugin API `1.19.0` compatibility in Runtime, package validator, Mobile package bridge and diagnostics;
- no public `leftNode` / `leftHtml` PRIMARY API;
- no PRIMARY `left` / `slots` mount context;
- explicit TOP `presentationRole` validation;
- no Mobile legacy stylesheet/import, drawer Intent or panel host request;
- no first-party PRIMARY-left composition;
- no `ctx.ui.desktop` / `ctx.ui.mobile` platform fork.
