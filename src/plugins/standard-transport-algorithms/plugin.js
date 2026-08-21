(() => {
  const manifest={
    id:'builtin.standard-transport-algorithms',name:'Standard Transport Algorithms',version:'1.1.0',apiVersion:'1.8.0',
    requiresCore:['analysis.algorithms','modules'],entry:'plugin.js',enabled:true,order:70,
    description:'Versioned local transport transform, scalar-field and TER numerical Algorithm Providers.',
    capabilities:['analysis.algorithm','analysis.transport-transform','analysis.transport-scalar-field','analysis.ter'],
    algorithmProvider:true,algorithmCategories:['transport-transform','transport-scalar-field','ter-analysis'],
    algorithmProvides:[{category:'transport-transform',id:'transport.raw',version:'1.0.0',title:'原始 I–V'},{category:'transport-transform',id:'transport.detrend',version:'1.0.0',title:'去背景 I−Ibg'},{category:'transport-transform',id:'transport.didv',version:'1.0.0',title:'dI/dV（微分电导）'},{category:'transport-transform',id:'transport.d2idv2',version:'1.0.0',title:'d²I/dV²'},{category:'transport-transform',id:'transport.dlog',version:'1.0.0',title:'d ln|I|/dV'},{category:'transport-transform',id:'transport.dvdi',version:'1.0.0',title:'dV/dI（微分电阻）'},{category:'transport-transform',id:'transport.resistance',version:'1.0.0',title:'R = |V/I|'},{category:'transport-scalar-field',id:'transport.scalar-field',version:'1.0.0',title:'标准 Vg–Vd 标量场投影'},{category:'ter-analysis',id:'ter.high-low-ratio',version:'1.0.0',title:'TER 高低电阻比'}],
    compatibility:{app:'>=3.55.0 <4.0.0',pluginApi:'^1.8.0'}
  };
  window.DKDSPlugins.define(manifest,ctx=>{
    const A=ctx.modules.require('algorithm');if(!A)throw new Error('Standard Transport Algorithms implementation unavailable.');
    const transforms=[
      ['raw','原始 I–V','science.iv.raw'],['detrend','去背景 I−Ibg','science.iv.background-removed'],['didv','dI/dV（微分电导）','science.transport.didv'],['d2idv2','d²I/dV²','science.transport.d2idv2'],['dlog','d ln|I|/dV','science.transport.dlnabsidv'],['dvdi','dV/dI（微分电阻）','science.transport.dvdi'],['resistance','R = |V/I|','science.transport.resistance']
    ];
    for(const [id,title,outputType] of transforms){ctx.analysis.algorithms.register(`transport.${id}`,{version:'1.0.0',category:'transport-transform',title,default:true,inputTypes:['science.iv.raw','data.sweep'],outputTypes:[outputType],tags:['transport','transform'],metadata:{transformId:id,local:true},run:(sweep,{parameters={}}={})=>A.computeTransformSweep(sweep,id,parameters)});}
    ctx.analysis.algorithms.register('transport.scalar-field',{version:'1.0.0',category:'transport-scalar-field',title:'标准 Vg–Vd 标量场投影',default:true,inputTypes:['data.sweep','data.table'],outputTypes:['science.scalar-field'],tags:['transport','scalar-field'],metadata:{local:true},run:(sweeps,{parameters={},transform={}}={})=>{
      const transformId=String(parameters.transformId||parameters.type||transform.id||'didv');
      const transformRef=parameters.transformAlgorithmRef||transform.algorithmRef||{category:'transport-transform',id:`transport.${transformId}`,version:'1.0.0'};
      const runner=(sweep,_type,transformOptions)=>ctx.analysis.algorithms.run(transformRef,sweep,{category:'transport-transform',parameters:transformOptions||{}});
      return A.computeSweepScalarField(sweeps,parameters.targets||[],parameters.vgs||[],parameters,runner);
    }});
    ctx.analysis.algorithms.register('ter.high-low-ratio',{version:'1.0.0',category:'ter-analysis',title:'TER 高低电阻比',description:'TER=(Rhigh−Rlow)/Rlow×100%，在相同 Vd 配对正扫/反扫。',default:true,inputTypes:['data.table','data.dataset'],outputTypes:['science.ter.matrix'],tags:['ter','transport'],metadata:{local:true,formula:'(Rhigh-Rlow)/Rlow*100'},run:(datasets,{parameters={}}={})=>A.computeTerMatrix(datasets,parameters.settings||parameters)});
    return {deactivate(){}};
  });
})();
