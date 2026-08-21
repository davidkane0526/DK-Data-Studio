(() => {
  DKDSPlugins.define({
    id:'builtin.resonance-detector-robust',pluginType:'algorithm',
    name:'Standard Resonance Algorithms',
    version:'2.2.0',
    apiVersion:'1.9.0',requiresCore:["science","analysis.algorithms","modules"],
    description:'Versioned resonance peak detection and baseline-aware peak metrics algorithms.',
    source:'builtin',
    order:80,
    algorithmProvider:true,algorithmCategories:['peak-detector','peak-metrics'],
    algorithmProvides:[{category:'peak-detector',id:'robust-ricker-v1',version:'1.0.0',title:'稳健多通道 / 多尺度'},{category:'peak-metrics',id:'baseline-fwhm-v1',version:'1.0.0',title:'局部基线 FWHM'}],
    compatibility:{app:'>=3.55.0 <4.0.0',pluginApi:'^1.8.0'},
    capabilities:['analysis.algorithm','analysis.peak-detector','analysis.peak-metrics']
  }, async ctx => {
    const S=ctx.science;
    const A=ctx.modules.require('algorithm');
    if(!A?.detectPeaks||!A?.peakMetrics)throw new Error('Standard resonance algorithm implementation is unavailable.');
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
    ctx.analysis.algorithms.register('robust-ricker-v1',{
      category:'peak-detector',version:'1.0.0',title:'稳健多通道 / 多尺度',description:'融合原始 I–V、去背景、导数、dln|I|/dV、dV/dI 与 R；多尺度 Ricker 匹配滤波发现候选，最终 Vd 回投影到原始采样点。',default:true,priority:100,
      inputTypes:['science.iv.raw'],outputTypes:['science.resonance.peak-set'],parameterSchema:{fields:parameterFields},
      tags:['resonance','peak','multiscale'],metadata:{shortName:'稳健',presets:['strict','balanced','sensitive'],channels,evidence,definition:'robust-multichannel-ricker-v1'},
      getPreset:name=>S.preset(name),defaultSettings:()=>S.preset('balanced'),
      run:(sweep,{parameters={},range=null}={})=>A.detectPeaks(sweep,parameters,{range})
    });
    ctx.analysis.algorithms.register('baseline-fwhm-v1',{
      category:'peak-metrics',version:'1.0.0',title:'局部基线 FWHM',description:'在峰附近分析窗口内鲁棒拟合常数或线性局部基线，并由残差半高交点计算 FWHM、峰高与面积。',default:true,priority:100,
      inputTypes:['science.resonance.peak','science.iv.raw'],outputTypes:['science.resonance.peak-metrics'],parameterSchema:{fields:[]},tags:['resonance','fwhm','baseline'],metadata:{shortName:'局部基线',baselineModes:['constant','linear'],definition:'local-robust-baseline-half-height-v1'},
      run:(input)=>A.peakMetrics(input?.peak,input?.sweep)
    });
    return {};
  });
})();
