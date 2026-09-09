'use strict';

function isNativeMobileDocument(){
  const root=globalThis.document?.documentElement;
  return root?.dataset?.dkdsHost==='mobile'&&root?.classList?.contains?.('react-native-client');
}

function enhanceMobileSplitController(split){
  if(!split||split.__dkdsMobilePreviewEnhanced||!isNativeMobileDocument())return split;
  split.__dkdsMobilePreviewEnhanced=true;
  split.__dkdsMobilePreviewTotal=null;

  const baseLimits=split.limits.bind(split);
  const baseBegin=split.beginPreview.bind(split);
  const baseFinish=split.finishPreview.bind(split);
  const baseDispose=split.dispose.bind(split);

  split.limits=function mobilePreviewLimits(){
    const total=Number(this.__dkdsMobilePreviewTotal);
    if(!this.previewActive||!Number.isFinite(total)||total<=0)return baseLimits();
    const min=Math.max(0,Number(this.spec.min)||0);
    const configured=Number(this.spec.max);
    const mobileRatio=Math.max(.35,Math.min(.96,Number(this.spec.mobileMaxRatio)||(this.axis==='x'?.92:.68)));
    const mobileReserve=Math.max(0,Number(this.spec.mobileReserve)||0);
    const mobileRatioMax=total*mobileRatio;
    const mobileReservedMax=mobileReserve>0?Math.max(min,total-mobileReserve):mobileRatioMax;
    const mobileOverlay=!!this.spec.mobileOverlay;
    const max=mobileOverlay
      ?Math.max(min,Math.min(mobileRatioMax,mobileReservedMax))
      :(Number.isFinite(configured)&&configured>0?configured:Math.max(min,total-Math.max(120,Number(this.spec.reserve)||220)));
    return {min,max:Math.max(min,max)};
  };

  split.beginPreview=function mobileBeginPreview(){
    const rect=this.drag?.rect;
    const total=rect?(this.axis==='x'?Number(rect.width):Number(rect.height)):NaN;
    this.__dkdsMobilePreviewTotal=Number.isFinite(total)&&total>0?total:null;
    return baseBegin();
  };

  split.schedulePreview=function mobileSchedulePreview(value){
    const raw=Number(value);
    if(Number.isFinite(raw))this.previewSize=raw;
    if(this.previewFrame)return;
    const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));
    this.previewFrame=raf(()=>{this.previewFrame=0;this.paintPreview();});
  };

  split.finishPreview=function mobileFinishPreview(options){
    try{return baseFinish(options);}finally{this.__dkdsMobilePreviewTotal=null;}
  };

  split.dispose=function mobileDispose(){
    this.__dkdsMobilePreviewTotal=null;
    return baseDispose();
  };

  return split;
}

module.exports=Object.freeze({enhanceMobileSplitController,isNativeMobileDocument});
