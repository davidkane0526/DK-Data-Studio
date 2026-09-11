# Core Task Runner

`ctx.tasks` is the only Plugin API execution surface for worker-backed CPU tasks. Plugins declare worker modules in `plugin.json` using `tasks:[{id,entry}]` and include `execution.tasks` in `requiresCore`.

Core owns queueing and Worker lifecycle. Mobile concurrency is fixed at 1. Desktop concurrency is bounded to 2–4 workers using `navigator.hardwareConcurrency` and `navigator.deviceMemory`; plugin count never controls the pool size.

Submissions are latest-wins by default per plugin + key. A newer generation terminates an older running Worker, removes queued work, and stale generations cannot call the Core-managed `publish` callback. `cancel()` and `cancelAll()` terminate running workers rather than waiting for synchronous CPU work to cooperate.

Task worker contract:

```js
self.DKDSTaskDefinition=Object.freeze({
  run(input,context){
    return compute(input);
  }
});
```

Keep task input/output structured-cloneable. Do not access DOM, Electron, project state, or UI from a task worker. Publication occurs in the plugin after `await handle.promise`, or through the guarded `publish` callback.
