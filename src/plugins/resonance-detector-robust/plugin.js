(() => {
  DKDSPlugins.define({
    id:'builtin.resonance-detector-robust',
    name:'Robust Resonance Detector',
    version:'1.0.0',
    apiVersion:'1.8.0',requiresCore:["science","analysis.detectors"],
    description:'Multichannel + multiscale resonance detector with raw-I/V projection.',
    source:'builtin',
    order:80,
    capabilities:['analysis.peak-detector']
  }, async ctx => {
    const S=ctx.science;
    const channels=[
      {key:'raw',label:'原始 I–V 峰',glyph:'●',symbol:'circle'},
      {key:'snr',label:'原始 I–V 局部 SNR',glyph:'◆',symbol:'diamond'},
      {key:'diff',label:'dI/dV 异常',glyph:'▲',symbol:'triangle'},
      {key:'detrend',label:'去背景 Shoulder',glyph:'■',symbol:'square'},
      {key:'curvature',label:'d²I/dV² 曲率',glyph:'✚',symbol:'cross'},
      {key:'dlog',label:'d ln|I|/dV',glyph:'⬢',symbol:'hexagon'},
      {key:'dvdi',label:'dV/dI',glyph:'◇',symbol:'kite'},
      {key:'resistance',label:'R=|V/I|',glyph:'▼',symbol:'triangle-down'}
    ];
    const evidence=Object.fromEntries(channels.map(row=>[row.key,row]));
    evidence.matched={key:'matched',label:'多尺度匹配滤波',glyph:'◎',symbol:'circle'};
    const parameterFields=[];
    for(const meta of channels){
      const preset=S.preset('balanced')?.[meta.key]||{};
      parameterFields.push(
        {id:`${meta.key}-enabled`,path:`${meta.key}.enabled`,type:'boolean',label:`${meta.glyph} ${meta.label}`,group:'检测通道',default:preset.enabled!==false},
        {id:`${meta.key}-threshold`,path:`${meta.key}.threshold`,type:'number',label:`${meta.label}阈值`,group:'检测通道阈值',default:Number(preset.threshold)||0,min:0,step:0.1}
      );
    }
    ctx.analysis.detectors.register('robust-ricker-v1',{
      name:'稳健多通道 / 多尺度',
      shortName:'稳健',
      description:'融合原始 I–V、去背景、导数、dln|I|/dV、dV/dI 与 R；多尺度 Ricker 匹配滤波只负责候选发现，最终 Vd 回投影到原始采样点。',
      default:true,
      presets:['strict','balanced','sensitive'],
      channels,
      evidence,
      parameterSchema:{fields:parameterFields},
      getPreset:name=>S.preset(name),
      defaultSettings:()=>S.preset('balanced'),
      detect:(sweep,settings,options)=>S.detectPeaks(sweep,settings,options)
    });
    return {};
  });
})();
