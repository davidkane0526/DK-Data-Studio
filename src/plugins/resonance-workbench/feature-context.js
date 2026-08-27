(() => {
  // Explicit live context for Resonance feature sub-runtimes.
  // Mutable values remain owned by their responsibility runtime; extracted modules
  // observe current cross-cutting state through live getters instead of shared lexical scope.
  function create({live={},services={},actions={},utils={}}={}){
    const liveView={};
    for(const name of [
      'workspace','project','datasets','sweeps','selectedPeakId','selectedSweepId','selectedRange','interactionRuntime','interactionSelection','workspaceNavigator',
      'sharedController','algorithmRuntime','pipelineRuntime','reactiveRuntime',
      'uiRuntime','workspaceRuntime','peakMetricRevision'
    ]){
      const getter=typeof live[name]==='function'?live[name]:()=>live[name];
      Object.defineProperty(liveView,name,{enumerable:true,get:getter});
    }
    return Object.freeze({
      live:Object.freeze(liveView),
      services:Object.freeze({...services}),
      actions:Object.freeze({...actions}),
      utils:Object.freeze({...utils})
    });
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-context',Object.freeze({create}));
})();
