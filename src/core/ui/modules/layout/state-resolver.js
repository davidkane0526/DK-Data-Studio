'use strict';

const SCROLL_POLICIES=Object.freeze(['none','chain','contain','viewport']);
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const positive=(value,fallback=0)=>{const number=finite(value,fallback);return number>0?number:fallback;};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function normalizeScrollPolicy(value,fallback='chain'){
  const policy=String(value||'').toLowerCase();
  return SCROLL_POLICIES.includes(policy)?policy:(SCROLL_POLICIES.includes(fallback)?fallback:'chain');
}

function createLayoutState(spec={},saved={}){
  const axis=spec.axis==='y'?'y':'x';
  const defaultSize=positive(spec.defaultSize,320);
  const preferredSize=positive(saved.size,positive(spec.preferredSize,defaultSize));
  const ratio=finite(saved.ratio,finite(spec.preferredRatio,0));
  return Object.freeze({
    id:String(spec.id||'default'),
    axis,
    placement:String(saved.placement||spec.placement||(axis==='x'?'start':'bottom')),
    collapsed:saved.collapsed===true||spec.collapsed===true,
    preferredSize,
    preferredRatio:ratio>0&&ratio<1?ratio:null,
    defaultSize,
    min:Math.max(0,finite(spec.min,0)),
    max:positive(spec.max,0)||null,
    reserve:Math.max(0,finite(spec.reserve,220)),
    mobileOverlay:spec.mobileOverlay===true,
    mobileMaxRatio:clamp(positive(spec.mobileMaxRatio,axis==='x'?.92:.68),.35,.96),
    mobileReserve:Math.max(0,finite(spec.mobileReserve,0)),
    mobileDefaultRatio:Number.isFinite(Number(spec.mobileDefaultRatio))&&Number(spec.mobileDefaultRatio)>0?clamp(Number(spec.mobileDefaultRatio),.1,.9):null,
    mobileMin:spec.mobileMin===undefined?null:Math.max(0,finite(spec.mobileMin,0)),
    explicitPreference:(positive(saved.size,0)>0)||(finite(saved.ratio,0)>0&&finite(saved.ratio,0)<1)||(spec.preferredSize!==undefined)||(spec.preferredRatio!==undefined)
  });
}

function axisExtent(viewport={},axis='x'){
  const direct=finite(viewport.extent,NaN);
  if(Number.isFinite(direct))return Math.max(0,direct);
  return Math.max(0,finite(axis==='y'?viewport.height:viewport.width,0));
}

function withLayoutPreference(state,value,viewport={}){
  const preferredSize=positive(value,state.defaultSize);
  const total=axisExtent(viewport,state.axis);
  return Object.freeze({...state,preferredSize,preferredRatio:total>2?clamp(preferredSize/total,.01,.99):state.preferredRatio,explicitPreference:true});
}

function withLayoutIntent(state,intent={}){
  return Object.freeze({...state,
    placement:intent.placement===undefined?state.placement:String(intent.placement||state.placement),
    collapsed:intent.collapsed===undefined?state.collapsed:intent.collapsed===true
  });
}

function resolveLayout(state,viewport={},platformProfile={}){
  const total=axisExtent(viewport,state.axis);
  const nativeMobile=platformProfile.nativeMobile===true;
  const visible=!state.collapsed&&total>2;
  const authoredMin=Math.max(0,state.min);
  let min=authoredMin,max;
  if(nativeMobile&&state.mobileOverlay){
    const ratioMax=total*state.mobileMaxRatio;
    const reservedMax=state.mobileReserve>0?Math.max(0,total-state.mobileReserve):ratioMax;
    max=Math.max(0,Math.min(ratioMax,reservedMax));
    min=Math.min(max,state.mobileMin===null?authoredMin:state.mobileMin);
  }else{
    max=state.max||Math.max(min,total-Math.max(120,state.reserve));
  }
  const mobileDefault=nativeMobile&&state.mobileOverlay&&state.mobileDefaultRatio&&!state.explicitPreference?total*state.mobileDefaultRatio:0;
  // A user-resized split records both pixels and ratio. The ratio is the durable
  // intent across viewport/orientation changes; replaying the old pixel size is
  // only correct when no proportional preference exists.
  const proportionalPreference=state.explicitPreference&&state.preferredRatio?state.preferredRatio*total:0;
  const requested=mobileDefault||positive(proportionalPreference,positive(state.preferredSize,state.defaultSize));
  const effectiveSize=visible?Math.round(clamp(requested,min,Math.max(min,max))):0;
  return Object.freeze({
    id:state.id,axis:state.axis,placement:state.placement,collapsed:state.collapsed,
    preferredSize:state.preferredSize,preferredRatio:state.preferredRatio,
    effectiveSize,total,min,max:Math.max(min,max),visible,handleVisible:visible,
    track:`${effectiveSize}px`,platform:nativeMobile?'mobile':'desktop'
  });
}

function serializeLayoutState(state){
  return Object.freeze({size:state.preferredSize,ratio:state.preferredRatio,placement:state.placement,collapsed:state.collapsed});
}

function applyScrollPolicy(element,policy='chain'){
  if(!element?.dataset)return null;
  const normalized=normalizeScrollPolicy(policy);
  element.dataset.dkdsScrollPolicy=normalized;
  return normalized;
}

module.exports=Object.freeze({SCROLL_POLICIES,normalizeScrollPolicy,createLayoutState,withLayoutPreference,withLayoutIntent,resolveLayout,serializeLayoutState,applyScrollPolicy});
