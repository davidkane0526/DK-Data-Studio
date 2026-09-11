(function(root){
  if(typeof module!=='undefined'&&module.exports){
    root.DKDSScience=root.DKDSScience||{};
    Object.assign(root.DKDSScience,require('./science/common.js'));
    Object.assign(root.DKDSScience,require('./science/presets.js'));
    Object.assign(root.DKDSScience,require('./science/import.js'));
    Object.assign(root.DKDSScience,require('./science/peaks.js'));
    Object.assign(root.DKDSScience,require('./science/pulse.js'));
    Object.assign(root.DKDSScience,require('./science/ter.js'));
    Object.assign(root.DKDSScience,require('./science/identity.js'));
    Object.assign(root.DKDSScience,require('./science/physics.js'));
    Object.assign(root.DKDSScience,require('./science/gate.js'));
    module.exports=root.DKDSScience;
  }
  root.Analysis=root.DKDSScience;
})(typeof window!=='undefined'?window:globalThis);
