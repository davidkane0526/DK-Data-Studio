(() => {
  const requiresCore=['analysis.algorithms'];
  const algorithmProvides=[{category:'example-transform',id:'example.scale-y',version:'1.0.0',title:'Scale Y'}];
  DKDSPlugins.define({
    id:'com.example.algorithm-provider',pluginType:'algorithm',name:'SDK Algorithm Provider Example',version:'1.0.0',apiVersion:'1.10.0',entry:'plugin.js',scripts:['plugin.js'],enabled:true,
    description:'Standalone SDK example for a versioned scientific algorithm provider.',requiresCore,
    algorithmProvider:true,algorithmCategories:['example-transform'],algorithmProvides,
    compatibility:{app:'>=3.60.0 <4.0.0',pluginApi:'^1.10.0'}
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
