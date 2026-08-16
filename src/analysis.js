(function(root){
  if(typeof module!=='undefined'&&module.exports){
    root.GRSScience=root.GRSScience||{};
    Object.assign(root.GRSScience,require('./science/common.js'));
    Object.assign(root.GRSScience,require('./science/presets.js'));
    Object.assign(root.GRSScience,require('./science/import.js'));
    Object.assign(root.GRSScience,require('./science/peaks.js'));
    Object.assign(root.GRSScience,require('./science/pulse.js'));
    Object.assign(root.GRSScience,require('./science/ter.js'));
    Object.assign(root.GRSScience,require('./science/identity.js'));
    Object.assign(root.GRSScience,require('./science/physics.js'));
    Object.assign(root.GRSScience,require('./science/gate.js'));
    module.exports=root.GRSScience;
  }
  root.Analysis=root.GRSScience;
})(typeof window!=='undefined'?window:globalThis);
