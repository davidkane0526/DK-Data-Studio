# DK Data Studio v3.67.22 — Mobile Shell Architecture / Phase 1

## Scope

This checkpoint begins the Mobile development phase from the frozen v3.67.21 pre-Mobile baseline. Desktop/Core semantics are not reopened. The change is intentionally behavior-preserving: the former monolithic React Native `mobile/src/Shell.tsx` is split into explicit owners before additional mobile UI or gesture work is added.

## Ownership

```text
mobile/src/
├─ Shell.tsx                         public compatibility barrel only
├─ model/
│  ├─ shell-types.ts                 Mobile Presenter state types
│  └─ shell-model.ts                 surface/navigation projection helpers
├─ theme/
│  └─ palette.ts                     semantic Theme token -> native palette mapping
├─ components/
│  ├─ NativeHeader.tsx               project/history/top action chrome
│  ├─ SurfaceNavigation.tsx          portrait bottom nav + landscape rail
│  └─ NativeStatusBar.tsx            status/plugin/native service status chrome
├─ sheets/
│  └─ ShellActionSheet.tsx           projects/activities/actions/history/import/more sheets
├─ services/
│  └─ WebServicePopover.tsx          native LAN web-service controls
└─ styles/
   └─ shell-styles.ts                one React Native shell geometry/style owner
```

## Rules

- `Shell.tsx` is a public import facade, not an implementation owner.
- Mobile Presenter/Core Registry state remains the only source for activity, surface and action navigation.
- No `ctx.ui.desktop` / `ctx.ui.mobile` Plugin API split is introduced.
- Mobile model/theme projection modules do not import React Native UI primitives.
- One semantic concern has one owner; visual/geometry definitions are not duplicated across extracted components.
- Domain plugin ids are not hard-coded in the native shell.
- Desktop/Core Presentation Contract remains frozen; mobile work consumes it downstream.

## Behavior intentionally preserved

- project tab + project drawer behavior;
- undo / redo placement in native header;
- plugin activity and `ctx.ui.actions` projection;
- PRIMARY/PRIME/SUB semantic surface navigation;
- portrait bottom navigation and landscape rail;
- status item projection and native web-service status;
- file/folder/SMB import sheet;
- plugin management / theme / web service More sheet;
- Theme token consumption (`divider`, `controlBorder`, surface/text/accent channels).

## Cleanup included

Three unreferenced style keys were removed during extraction:

- `headerPanelButton`
- `headerPanelButtonText`
- `projectDrawerChevron`

No active dependency was added or removed.

## Next phase

Phase 2 should modularize the remaining `mobile/App.tsx` host responsibilities before major new UI is layered on top. The intended split is:

- Mobile Host request/response transport;
- Android file/document service adapter;
- native web-service adapter;
- lifecycle/back-navigation coordinator;
- WebView runtime host;
- top-level responsive composition.

After that boundary is stable, visual/gesture iteration can proceed without rebuilding another monolithic platform shell.
