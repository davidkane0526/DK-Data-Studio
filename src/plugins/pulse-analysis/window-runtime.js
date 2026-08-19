(() => {
  const service=window.DKDSPulseAnalysisService;
  if(!service?.create)throw new Error('pulse-analysis dedicated service is unavailable.');
  window.DKDSPluginWindowRuntime={create:args=>service.create(args)};
})();
