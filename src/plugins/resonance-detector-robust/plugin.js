(() => {
  DKDSPlugins.define({
    id:'builtin.resonance-detector-robust',
    name:'Robust Resonance Detector',
    version:'1.0.0',
    apiVersion:'1.2.0',
    description:'Multichannel + multiscale resonance detector with raw-I/V projection.',
    source:'builtin',
    order:80,
    capabilities:['analysis.peak-detector']
  }, async ctx => {
    const S=window.DKDSScience;
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
    ctx.analysis.detectors.register('robust-ricker-v1',{
      name:'稳健多通道 / 多尺度',
      shortName:'稳健',
      description:'融合原始 I–V、去背景、导数、dln|I|/dV、dV/dI 与 R；多尺度 Ricker 匹配滤波只负责候选发现，最终 Vd 回投影到原始采样点。',
      default:true,
      presets:['strict','balanced','sensitive'],
      channels,
      evidence,
      getPreset:name=>S.preset(name),
      defaultSettings:()=>S.preset('balanced'),
      renderSettings({container,settings,onChange}){
        container.innerHTML='';
        const current={...S.preset(settings?._preset||'balanced'),...(settings||{})};
        for(const meta of channels){
          const cfg=current[meta.key]||{enabled:true,threshold:1};
          const row=document.createElement('div');
          row.className='algorithm-row';
          row.innerHTML=`<input type="checkbox" ${cfg.enabled?'checked':''} data-enabled="${meta.key}">
            <div class="algorithm-label"><span class="algorithm-shape">${meta.glyph}</span>${meta.label}</div>
            <input type="number" step="0.1" min="0" value="${Number(cfg.threshold||0).toFixed(1)}" data-threshold="${meta.key}">`;
          container.appendChild(row);
        }
        const emit=()=>{
          const next=JSON.parse(JSON.stringify(current));
          next._preset='custom';
          onChange?.(next);
        };
        container.querySelectorAll('[data-enabled]').forEach(el=>el.onchange=e=>{
          const key=e.target.dataset.enabled;
          current[key]={...(current[key]||{}),enabled:!!e.target.checked};
          emit();
        });
        container.querySelectorAll('[data-threshold]').forEach(el=>el.onchange=e=>{
          const key=e.target.dataset.threshold;
          current[key]={...(current[key]||{}),threshold:Number(e.target.value)};
          emit();
        });
        return {destroy(){container.innerHTML='';}};
      },
      detect:(sweep,settings,options)=>S.detectPeaks(sweep,settings,options)
    });
    return {};
  });
})();
