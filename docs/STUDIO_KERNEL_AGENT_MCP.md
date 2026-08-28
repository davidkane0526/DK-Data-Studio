# Studio Kernel / AI Agent / MCP Architecture

Version: DK Data Studio 3.61.51

## 1. One kernel, two clients

The built-in AI Agent and external MCP clients are peers over the same `DKDSKernel` registry. Neither path owns a second data model, plotting stack, plugin API, or project mutation mechanism.

- **Kernel** owns stable callable operations and JSON schemas.
- **Core Capability Runtime** is the deep extension escape hatch. New plugin/Core capabilities become callable through `core.capabilities.*` without adding an Agent-specific bridge.
- **DataFlow / Workflow / Scientific Transform registries** expose typed scientific providers directly.
- **Desktop / Android Host adapters** only provide operating-system capabilities such as files, SMB, secrets and network transport.

This keeps Agent/MCP access broad without binding automation to private renderer variables.

## 2. Capability domains

The 3.61.51 kernel exposes these domains:

- `kernel`: discovery and generic kernel execution.
- `core`: live Core/plugin Capability Registry discovery and invocation.
- `project`: current project, project switching, create/open/save.
- `history`: undo/redo state and execution.
- `data`: Canonical Artifact catalog/read/preview/statistics/lineage/mutation, cleaning, formulas, and registered DataFlow providers.
- `transform`: canonical scientific transforms for curves and scalar fields.
- `workflow`: typed scientific workflow providers and recipe execution.
- `plot`: inspect currently rendered D3 figures and render new Core-owned plots.
- `selection`: typed data/selection contracts.
- `ui`: activities, actions and surfaces.
- `plugin`: plugin state plus `.dkplugin` validation/install/enable/uninstall and authoring contract.
- `sdk`: complete packaged SDK authoring corpus search/read APIs.
- `filesystem`: native/SAF Provider read and native result saving.
- `smb`: discovery, shares, directory listing and file reads.
- `runtime` / `diagnostics`: runtime, automation, plugin, UI and performance diagnostics.

`core.capabilities.invoke` is intentionally the deepest stable generic bridge. A provider that registers a new Core Capability automatically becomes available to AI/MCP.

## 3. Full access vs read-only

The built-in Agent supports:

- **Full kernel**: all registered operations, including project/data/plugin mutations.
- **Read-only**: only tools whose kernel descriptor explicitly declares `readOnly: true`.

MCP is an administrator-style interface: possession of the configured MCP token grants the exposed full kernel. Mutation still passes through normal Core Artifact, History, Plugin Kernel and Capability contracts rather than directly editing private renderer state.

## 4. Autonomous plugin authoring

Complex plugin generation follows this loop:

1. Call `plugin.authoring.contract` for current package/API/runtime information.
2. Search the packaged reference with `sdk.authoring.search`.
3. Read exact contracts/types/templates with `sdk.authoring.read`.
4. Inspect live `core.capabilities.list` and `data.flows.list` because installed plugins may extend the runtime beyond the static SDK.
5. Generate a complete `.dkplugin` object.
6. Call `plugin.package.validate`.
7. Call `plugin.package.install` only after validation succeeds.
8. Verify activation through `plugin.list`, `core.capabilities.list`, activities/surfaces, or plugin diagnostics.

The machine-readable authoring corpus includes SDK 1.20.0 / Plugin API 1.18.0 / Theme Contract 3.8.0 contract JSON, manifest schema, TypeScript API definitions, UI/workspace/data-model guides and official plugin templates.

## 5. MCP resources

The Streamable HTTP MCP server publishes dynamic tools plus stable resources including:

- `dkds://kernel`
- `dkds://project`
- `dkds://artifacts`
- `dkds://artifact/{id}`
- `dkds://capabilities`
- `dkds://plugins`
- `dkds://plots`
- `dkds://sdk`
- `dkds://sdk/files`
- `dkds://sdk/file/{path}`

The transport does not duplicate Studio semantics. Requests are forwarded into the renderer Kernel Registry.

## 6. Data and plotting rules

Agent/MCP code should operate on Canonical Artifacts and typed registries, not legacy plugin-local arrays.

- Inspect catalog/preview/statistics before requesting entire large artifacts.
- Mutations go through Artifact + History so undo/redo and lineage remain valid.
- Scientific transforms and workflows use registered providers.
- Current figures are inspected through `plot.inspect`; new figures are rendered by the Core D3 renderer through `plot.render`.
- Generated reports, CSV/JSON, source, and binary outputs use native filesystem save tools.

## 7. Host boundary

Plugins and Agent-generated plugins must not access Electron IPC, React Native modules, or raw host bridges directly. OS-specific operations remain Core/Host services so the same plugin and Kernel semantics work on desktop and Android.
