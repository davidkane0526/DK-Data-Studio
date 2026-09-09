(() => {
  const requiresCore=['analysis.algorithms'];
  const algorithmProvides=[{category:'example-transform',id:'example.scale-y',version:'1.0.0',title:'Scale Y'}];
  DKDSPlugins.define({
  "id": "com.example.algorithm-provider",
  "name": "SDK Algorithm Provider Example",
  "version": "1.0.0",
  "apiVersion": "1.19.0",
  "entry": "plugin.js",
  "scripts": [
    "plugin.js"
  ],
  "enabled": true,
  "description": "Standalone SDK example for a versioned scientific algorithm provider.",
  "requiresCore": [
    "analysis.algorithms"
  ],
  "algorithmProvider": true,
  "algorithmCategories": [
    "example-transform"
  ],
  "algorithmProvides": [
    {
      "category": "example-transform",
      "id": "example.scale-y",
      "version": "1.0.0",
      "title": "Scale Y"
    }
  ],
  "pluginType": "algorithm"
}, async ctx => {
    ctx.analysis.algorithms.register('example.scale-y',{
      version:'1.0.0',category:'example-transform',title:'Scale Y',default:true,
      parameterSchema:{fields:[{id:'factor',type:'number',label:'Factor',default:1}]},
      run(input,{parameters={}}={}){
        const factor=Number(parameters.factor ?? 1);
        return {...input,y:(input?.y||[]).map(v=>Number(v)*factor)};
      }
    });
    return {};
  });
})();
