(() => {
  const service=window.DKDSTERAnalysisService;
  if(!service?.create)throw new Error('ter-analysis dedicated service is unavailable.');
  window.DKDSPluginWindowRuntime={create:args=>service.create(args)};
})();
