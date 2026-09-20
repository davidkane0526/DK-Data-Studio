# Domain Adapters — single-owner live migration seam

Domain Adapters extend the existing `services` Core contract. They are for migration and multi-shell scenarios where two UI compositions must share **one stateful domain owner** without copying a controller, analysis service or calculation pipeline.

## Provider

A production plugin that already owns a stateful service may publish a narrow adapter:

```js
ctx.services.domain.provide('live', {
  version: '1.0.0',
  title: 'Example live domain owner',
  snapshot: () => service.getState(),
  actions: {
    calculate: payload => service.calculate(payload),
    reset: () => service.reset()
  },
  subscribe: listener => stateRuntime.subscribe(event => listener(event))
});
```

The provider remains the only state/compute owner. `snapshot()` and action payload/results must be serializable. The adapter never exposes the raw `service` object.

## Consumer

Cross-plugin access is dependency-scoped. The consumer must explicitly declare the provider in `pluginDependencies` and the ordinary `services` Core requirement:

```json
{
  "requiresCore": ["services"],
  "pluginDependencies": [{"id":"builtin.example"}]
}
```

Then connect through the provider-qualified reference:

```js
const live = ctx.services.domain.connect('builtin.example/live');
const snap = live.snapshot();
await live.invoke('calculate', { mode:'full' });
const off = live.subscribe(event => refresh(live.snapshot()), { immediate:true });
```

## Ownership and lifecycle rules

- The provider plugin owns the domain state, numerical implementation and adapter registration.
- A consumer receives only a connection facade: descriptor, detached snapshot, whitelisted action invocation and state notification.
- `ctx.services.get(...)` / `require(...)` cannot retrieve Domain Adapter internals.
- Dependency-scoped adapters reject consumers that did not declare the provider plugin.
- Consumer deactivation automatically releases subscriptions.
- Provider deactivation removes the adapter; existing handles become unavailable instead of retaining a stale controller reference.
- Domain Adapters do not create a second state store, worker, algorithm provider, event bus or UI owner.
- Use `access:'public'` only for intentionally public stateless/read-only integration contracts. Migration seams should normally keep the default `dependency` access.

## Migration use

For Unit-only migration, bind the parallel Unit shell to the same production adapter. This changes the parity question from “did two independent implementations produce similar numbers?” to “does the new shell present and invoke the same authoritative state/number owner correctly?”. A production cutover should occur only after state, action and numerical presentation parity pass on this shared owner.
