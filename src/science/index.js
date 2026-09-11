(function(root){
  if(typeof module!=='undefined'&&module.exports){
    root.DKDSScience=root.DKDSScience||{};
    for(const file of ['./common.js','./presets.js','./import.js','./peaks.js','./pulse.js','./ter.js','./identity.js','./physics.js','./gate.js'])Object.assign(root.DKDSScience,require(file));
    module.exports=root.DKDSScience;
  }
})(typeof window!=='undefined'?window:globalThis);
