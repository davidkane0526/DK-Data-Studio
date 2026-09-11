(() => {
  if (window.DKDSViewportLink) return;
  const VERSION='1.0.0';
  const SCHEMA='dkds.viewport-state.v1';
  const CHANNEL='viewport';
  const AXES=Object.freeze(['x','y']);
  const text=value=>String(value??'').trim();
  const finite=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value));
  function normalizeRange(value){if(value===null)return null;if(!Array.isArray(value)||value.length!==2||!value.every(finite))return undefined;return Object.freeze([Number(value[0]),Number(value[1])]);}
  function normalizeAxisSpec(value={},role=''){
    const source=value&&typeof value==='object'?value:{};
    const raw={name:text(source.name),role:text(source.role||role),quantity:text(source.quantity),unit:text(source.unit),dimension:source.dimension||''};
    const units=window.DKDSScientificUnits,descriptor=units?.axis?.(raw);
    if(descriptor?.known)return Object.freeze({name:descriptor.name||raw.name,role:descriptor.role||raw.role,quantity:descriptor.quantity||raw.quantity,unit:descriptor.unit||raw.unit,dimension:descriptor.dimension||raw.dimension});
    return Object.freeze(raw);
  }
  function policyFor(view){
    const raw=view?.controllerSpec?.viewport||{},axes=raw.axes&&typeof raw.axes==='object'?raw.axes:(view?.spec?.axisSemantics||{}),linked=Array.isArray(raw.linkedAxes)?raw.linkedAxes:AXES;
    return Object.freeze({enabled:raw.enabled!==false,link:raw.link===true,linkGroup:text(raw.linkGroup||view?.interaction?.linkGroup),linkedAxes:Object.freeze([...new Set(linked.map(row=>text(row).toLowerCase()).filter(row=>AXES.includes(row)))]),axes:Object.freeze({x:normalizeAxisSpec(axes?.x||{},'x'),y:normalizeAxisSpec(axes?.y||{},'y')})});
  }
  function viewId(view){return text(view?.viewportLinkId||`${view?.owner||'core'}:${view?.target?.dataset?.dkdsScientificPlotId||view?.target?.id||'plot'}`);}
  function sourceSnapshot(view){
    const policy=policyFor(view),viewport=view?.getViewport?.()||{},axes={};
    for(const axis of policy.linkedAxes){const range=normalizeRange(viewport?.[`${axis}Range`]);if(range===undefined)continue;axes[axis]={range,axis:policy.axes[axis]};}
    return Object.freeze({schema:SCHEMA,sourceViewId:viewId(view),revision:Math.max(0,Number(viewport?.revision)||0),axes:Object.freeze(axes)});
  }
  function quantitiesCompatible(source,target){const a=text(source?.quantity),b=text(target?.quantity);return !(a&&b&&a!==b);}
  async function apply(view,snapshot={},meta={}){
    if(!view||snapshot?.schema!==SCHEMA)return Object.freeze({applied:false,reason:'schema'});
    const runtime=view.interaction,policy=policyFor(view),tx=meta?.transaction||null;if(!runtime||!policy.link)return Object.freeze({applied:false,reason:'disabled'});
    const sameRuntime=tx&&tx.sourceScopeId===runtime.scopeId&&tx.sourceRuntimeId===runtime.id;if(sameRuntime&&text(snapshot.sourceViewId)===viewId(view))return Object.freeze({applied:false,reason:'origin'});
    const next={},decisions={};
    for(const axis of policy.linkedAxes){const incoming=snapshot?.axes?.[axis];if(!incoming||!Object.prototype.hasOwnProperty.call(incoming,'range'))continue;const sourceAxis=normalizeAxisSpec(incoming.axis||{},axis),targetAxis=policy.axes[axis];if(!quantitiesCompatible(sourceAxis,targetAxis)){decisions[axis]='quantity-mismatch';continue;}const decision=runtime.axisCompatibility?.(sourceAxis,targetAxis);decisions[axis]=decision?.reason||'unknown';if(decision?.compatible!==true)continue;const range=normalizeRange(incoming.range);if(range===undefined)continue;if(range===null)next[`${axis}Range`]=null;else try{next[`${axis}Range`]=[...runtime.convertAxisRange(range,sourceAxis,targetAxis)];}catch{decisions[axis]='conversion-failed';}}
    if(!Object.keys(next).length)return Object.freeze({applied:false,reason:'no-compatible-axis',decisions:Object.freeze(decisions)});
    await Promise.resolve(view.setViewport?.(next,{source:'linked-viewport',remote:true,rebroadcast:false,publish:false,transaction:tx,linkGroup:meta?.linkGroup||tx?.linkGroup||policy.linkGroup}));
    return Object.freeze({applied:true,axes:Object.freeze(Object.keys(next).map(key=>key[0])),decisions:Object.freeze(decisions)});
  }
  function publish(view,meta={}){
    const runtime=view?.interaction,policy=policyFor(view);if(!runtime||!policy.link||!policy.linkGroup||typeof runtime.publishState!=='function')return null;
    return runtime.publishState(CHANNEL,sourceSnapshot(view),{source:meta.source||'scientific-viewport',reason:meta.reason||'viewport-changed',linkGroup:policy.linkGroup});
  }
  function connect(view){
    const runtime=view?.interaction,policy=policyFor(view);if(!runtime||!policy.link||!policy.linkGroup||typeof runtime.subscribeState!=='function'||typeof runtime.linkState!=='function')return null;
    const offLocal=runtime.subscribeState(CHANNEL,(state,meta)=>{void apply(view,state,meta);}),offLink=runtime.linkState(CHANNEL,policy.linkGroup,{source:'linked-viewport'});
    return Object.freeze({policy,dispose(){try{offLocal?.();}catch{}try{offLink?.();}catch{}}});
  }
  window.DKDSViewportLink=Object.freeze({VERSION,SCHEMA,CHANNEL,AXES,normalizeAxisSpec,policyFor,sourceSnapshot,apply,publish,connect});
})();
