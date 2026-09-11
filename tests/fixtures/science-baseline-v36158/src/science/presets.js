(function(root,factory){
  const core=(root.DKDSScience=root.DKDSScience||{});
  const api=factory(core);
  Object.assign(core,api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(core){
  function preset(name){
    // User-facing presets deliberately share one simple "sensitivity" concept.
    // Thresholds are robust-evidence scores, not raw physical units.
    const sets={
      strict:{raw:5.8,snr:5.8,diff:5.2,detrend:5.0,curvature:5.2,dlog:5.0,dvdi:6.0,resistance:6.0},
      balanced:{raw:4.5,snr:4.5,diff:4.0,detrend:3.9,curvature:4.0,dlog:4.0,dvdi:5.0,resistance:5.0},
      sensitive:{raw:3.2,snr:3.2,diff:3.0,detrend:2.8,curvature:3.0,dlog:3.0,dvdi:4.0,resistance:4.2}
    };
    const key=sets[name]?name:'balanced';
    const s=sets[key],out={_preset:key};
    for(const k of Object.keys(s))out[k]={enabled:true,threshold:s[k]};
    // R and dV/dI are corroborating channels by default. They remain enabled
    // in the smart pipeline but cannot by themselves create an accepted peak.
    return out;
  }
  return {preset};
});
