(() => {
  function markerShape(peak){
    return ({raw:'circle',snr:'diamond',diff:'triangle',detrend:'square',curvature:'cross',matched:'circle',manual:'star'})[peak?.primaryAlgorithm]||'circle';
  }
  function project({workspace={},visibleSweepIds=[],colorForPeak=null}={}){
    const display=workspace?.peakDisplay||{};
    if(display.showPoints===false)return [];
    const visible=new Set((Array.isArray(visibleSweepIds)?visibleSweepIds:[]).map(String));
    return (Array.isArray(workspace?.peaks)?workspace.peaks:[])
      .filter(peak=>visible.has(String(peak?.sweepId||''))&&(peak?.accepted!==false||display.showRejected===true))
      .map(peak=>({
        id:String(peak?.id||''),
        entityId:String(peak?.id||''),
        curveId:String(peak?.sweepId||''),
        x:Number(peak?.v),
        y:Number(peak?.i),
        color:typeof colorForPeak==='function'?String(colorForPeak(peak)||''):String(peak?.customColor||''),
        locked:!!peak?.locked,
        accepted:peak?.accepted!==false,
        shape:markerShape(peak),
        source:peak
      }))
      .filter(marker=>marker.id&&marker.curveId&&Number.isFinite(marker.x)&&Number.isFinite(marker.y));
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','main-marker-projection',Object.freeze({project,markerShape}));
})();
