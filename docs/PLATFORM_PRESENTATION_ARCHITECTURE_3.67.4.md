# Platform Presentation Architecture — v3.67.4 Legacy Consumer Audit

## 1. Goal

This release closes the false-complete gap left after Phase 4. A TOP can have explicit `presentationRole` metadata and still hide an additional control rail inside `mountPrimary({leftNode})`. That rail is real UI semantics, but it is absent from the Presentation Model, so treating such a workspace as complete would make MobilePresenter project only part of the workspace.

## 2. Runtime audit

`DKDSPresentation.audit()` reports every active TOP contract as complete or incomplete and includes stable issue codes. `PluginWorkspace.navigationActions()` marks a PRIMARY that still owns `leftNode` / `leftHtml` as:

`legacy-composition:primary:<surfaceId>:primary-left-composition`

The Presentation Model therefore cannot silently classify an old left-rail workspace as semantic-complete. This is runtime contract metadata from the owning Workspace abstraction; it is not DOM or CSS reverse inference.

## 3. First-party migration

TER and Transfer Vth Lab were the remaining first-party TOPs that still embedded a parameter rail in PRIMARY. Their rails are now explicit PRIME surfaces with `presentationRole: data-control`, auto-opened on Desktop with their existing left-side default. Their shared TopWorkspace declarations expose the same semantic surface.

After this migration, authored first-party TOP plugins contain no `mountPrimary({leftNode: ...})` path. Data Center, Pulse Analysis, Pulse Sampler, Resonance, TER and Transfer Vth Lab all expose complete semantic Presentation Contracts.

## 4. Why the legacy stylesheet remains

`native-legacy-workspace.css` is not deleted in v3.67.4. Plugin API 1.18 historically allowed third-party TOP workspaces to use `leftNode`; installed external `.dkplugin` packages are not enumerable at source-build time. Removing the fallback now would turn an explicit compatibility condition into a silent layout break.

The boundary is therefore stricter, not broader:

- first-party legacy consumers: zero;
- new/revised TOP guidance: semantic `data-control` surface;
- old external `leftNode`: explicitly audited as legacy;
- no Desktop DOM/CSS state is read by MobilePresenter or Mobile Web Surface Presenter;
- deletion of the 44-line fallback requires a future public Plugin API compatibility decision, not a page-level CSS cleanup.

## 5. Ownership

No second Plugin API is introduced. Core owns audit/completeness; plugins own their semantic surface declarations; Presenters own platform mapping; platform CSS owns geometry only.
