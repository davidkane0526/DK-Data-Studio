# Core Task Runner — SDK 1.48.0

`ctx.tasks` is the only Plugin API execution surface for worker-backed CPU tasks. Plugins declare worker modules in `plugin.json` using `tasks:[{id,entry}]` and include `execution.tasks` in `requiresCore`.

Core owns queueing and Worker lifecycle. Mobile concurrency is fixed at 1. Desktop concurrency is bounded to 2–4 workers using `navigator.hardwareConcurrency` and `navigator.deviceMemory`; plugin count never controls the pool size.

Submissions are latest-wins by default per plugin + key. A newer generation terminates an older running Worker, removes queued work, and stale generations cannot call either the Core-managed `publish` callback or progress listeners. `cancel()` and `cancelAll()` terminate running workers rather than waiting for synchronous CPU work to cooperate.

## Real bounded progress

SDK 1.48 adds worker progress reporting without giving worker code access to UI state. A task publishes structured progress only through `context.reportProgress(...)`:

```js
self.DKDSTaskDefinition=Object.freeze({
  async run(input,context){
    for(let i=0;i<input.scans.length;i++){
      context.reportProgress({
        stage:'gate-fit',
        label:'Fitting finite-q gates',
        completed:i,
        total:input.scans.length
      });
      await fitOne(input.scans[i]);
    }
    return buildResult();
  }
});
```

The public payload is:

```ts
interface DKDSTaskProgress {
  fraction?: number;      // normalized to 0..1
  stage?: string;         // stable machine-readable stage id
  label?: string;         // short user-facing label
  completed?: number;
  total?: number;
}
```

The owner renderer subscribes on the returned task handle:

```js
const handle=ctx.tasks.submit('exact-fit',input,{key:'finite-q'});
const off=handle.onProgress(progress=>{
  progressBar.set(progress.fraction ?? null);
  stageLabel.textContent=progress.label||progress.stage||'';
});
try{
  const result=await handle.promise;
} finally {
  off();
}
```

Core normalizes the payload, clamps `fraction` to `0..1`, coalesces/throttles delivery to at most roughly 20 Hz per running task, and flushes the final pending update before a successful result. A stale latest-wins generation is never allowed to publish progress. Cancellation immediately clears queued progress and listeners before the worker is terminated.

`handle.progress` exposes the most recently delivered progress snapshot or `null`.

Keep task input/output/progress structured-cloneable. Do not access DOM, Electron, project state, or UI from a task worker. Publication occurs in the plugin after `await handle.promise`, or through the guarded `publish` callback.
