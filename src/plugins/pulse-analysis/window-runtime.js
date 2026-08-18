(() => {
  const service=window.DKDSPulseDedicatedService;
  if(!service?.create)throw new Error('pulse-analysis dedicated service is unavailable.');
  window.DKDSPluginWindowRuntime={create:args=>service.create(args)};
})();
