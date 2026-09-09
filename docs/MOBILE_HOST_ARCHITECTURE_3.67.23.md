# DK Data Studio v3.67.23 — Mobile Host Architecture / Phase 2

## Purpose

Phase 1 removed the monolithic native shell implementation from `mobile/src/Shell.tsx`. Phase 2 removes the second monolith: `mobile/App.tsx`.

The goal is not to create new Mobile business logic. The goal is to make platform ownership explicit so later Mobile UI and gesture work cannot accidentally pull Core, scientific logic or plugin contracts into the React Native composition root.

## Composition root

`mobile/App.tsx` owns only application composition:

- shell state
- active sheet state
- responsive portrait/landscape selection
- Theme palette projection
- wiring host/service hooks
- wiring native shell components

It must not directly own `NativeModules`, SAF/DocumentPicker, Host protocol queues, MCP/Agent routing, LAN service implementation or WebView recovery internals.

## Host modules

### `mobile/src/host/protocol.ts`

Owns the versioned protocol identity and native facade:

- `HOST_CHANNEL = dkds.mobile-host.v1`
- `DkdsNativeHostApi`
- shell-state normalization
- native file/MIME utility normalization

### `mobile/src/host/useHostBridge.ts`

Owns React Native <-> embedded Core host transport:

- renderer-ready handshake
- acknowledged request/response transport
- pending request map
- inactive-state timeout suspension
- interactive file-command timeout policy
- lifecycle event publication
- Android native event forwarding

### `mobile/src/host/useNativeRequestRouter.ts`

Owns renderer native-call dispatch. It translates existing native request types to Android services without teaching plugins about Android.

### `mobile/src/host/useNativeFileService.ts`

Owns provider-backed file selection and lazy session handles. Multiple selected files are not eagerly serialized to Base64. Fallback persistence/share is isolated here.

### `mobile/src/host/useShellActions.ts`

Owns native shell semantic actions. It emits acknowledged Core Host requests for navigation, project/history operations, surfaces, registered plugin actions and status items.

It must stay domain-neutral.

### `mobile/src/host/useMobileSystemLifecycle.ts`

Owns Android hardware back, AppState and navigation-bar lifecycle behavior.

## Service modules

### `mobile/src/services/useWebServiceController.ts`

Owns LAN web-service state, start/stop/open/copy/settings/key-regeneration actions and user-visible native errors.

## Renderer module

### `mobile/src/components/RendererWorkspace.tsx`

Owns the embedded WebView and renderer lifecycle:

- local asset URL
- boot request
- renderer loading state
- renderer-process failure handling
- retry/reload
- external URL handoff

It does not own Core navigation or plugin semantics.

## Invariants

1. Core data/scientific/state logic remains outside React Native.
2. Mobile consumes the Core Presentation Model through MobilePresenter.
3. Touch/native input maps to existing Interaction Intent / Host requests.
4. No Desktop DOM reverse-reading.
5. No `ctx.ui.mobile` / `ctx.ui.desktop` API split.
6. No mobile-specific copy of a first-party plugin.
7. `mobile/App.tsx` stays below 8 KiB.
8. Each authored Mobile host module stays below the project 48 KiB hygiene ceiling.
9. Platform I/O belongs in host/service adapters, not shell presentation components.

## Phase 3 boundary

Phase 3 may change Mobile-owned presentation and ergonomics after Android runtime acceptance, but must not reopen shared Desktop/Core ownership for local visual preferences.
