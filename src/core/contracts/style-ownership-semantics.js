(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DKDSStyleOwnershipSemantics=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.3.0';
  const ANY_CONTEXT='*';
  const CONTEXT_AXES=Object.freeze(['component','material','role','recipe','variant','layout']);
  const clean=value=>String(value??'').trim();
  function normalizeContext(value=ANY_CONTEXT){
    if(value===undefined||value===null||value===''||value===ANY_CONTEXT)return ANY_CONTEXT;
    let row={};
    if(typeof value==='string'){
      const text=value.trim();if(!text||text===ANY_CONTEXT)return ANY_CONTEXT;
      for(const token of text.split(/[;|]/)){const index=token.indexOf('=');if(index<=0)continue;const key=token.slice(0,index).trim(),item=token.slice(index+1).trim();if(CONTEXT_AXES.includes(key)&&item)row[key]=item;}
    }else if(typeof value==='object')row=value;
    const parts=[];for(const key of CONTEXT_AXES){const item=clean(row?.[key]);if(item)parts.push(`${key}=${item}`);}return parts.length?parts.join(';'):ANY_CONTEXT;
  }
  function contextObject(value=ANY_CONTEXT){const text=normalizeContext(value);if(text===ANY_CONTEXT)return Object.freeze({});const out={};for(const token of text.split(';')){const index=token.indexOf('=');if(index>0)out[token.slice(0,index)]=token.slice(index+1);}return Object.freeze(out);}
  function matchesContext(actual,expected=ANY_CONTEXT){
    const expectedText=normalizeContext(expected);if(expectedText===ANY_CONTEXT)return true;
    const actualText=normalizeContext(actual);if(actualText===ANY_CONTEXT)return false;
    const a=contextObject(actualText),e=contextObject(expectedText);for(const [key,value] of Object.entries(e))if(a[key]!==value)return false;return true;
  }
  const ROWS=Object.freeze([
    ['toolbarAction','base',['background','color','border-top','border-right','border-bottom','border-left','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow']],
    ['toolbarAction','hover',['background','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow']],
    ['toolbarAction','selected',['background','color','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow']],
    ['tab','base',['background','color','border-top','border-right','border-bottom','border-left','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow']],
    ['tab','hover',['background','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow']],
    ['tab','selected',['background','color','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow']],
    ['menuItem','base',['background','color','border-top','border-right','border-bottom','border-left','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow']],
    ['menuItem','hover',['background','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow']],
    ['menuItem','selected',['background','color','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow']],
    ['field','base',['background','color','border-top','border-right','border-bottom','border-left','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow']],
    ['field','hover',['background','border-top-color','border-right-color','border-bottom-color','border-left-color']],
    ['field','focus-visible',['background','color','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow','outline']],
    ['panelHeader','base',['background-color','border-bottom','color','box-shadow']],
    ['inspectorHeader','base',['background-color','border-bottom','color','box-shadow']],
    ['toolbarAction','pressed',['background','color','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow']],
    ['toolbarAction','disabled',['background','color','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow','opacity']],
    ['toolbarAction','focus-visible',['outline','outline-offset']],
    ['tab','pressed',['background','color','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow']],
    ['menuItem','pressed',['background','color','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow']],
    ['chip','base',['background','color','border-top','border-right','border-bottom','border-left','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius']],
    ['chip','hover',['background','border-top-color','border-right-color','border-bottom-color','border-left-color']],
    ['chip','pressed',['background','color','border-top-color','border-right-color','border-bottom-color','border-left-color']],
    ['chip','selected',['background','color','border-top-color','border-right-color','border-bottom-color','border-left-color']],
    ['toolbarGroup','base',['background','color','border-top','border-right','border-bottom','border-left','box-shadow']],
    ['statusBar','base',['color']],
    ['floatingChrome','base',['color','box-shadow']]
  ]);
  const CONTEXT_ROWS=Object.freeze([
    ['toolbarAction','base','component=grouped',['border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow']],
    ['toolbarAction','focus-visible','component=grouped',['outline','box-shadow']],

    // Integrated fields are a real layout context: the field remains the same
    // semantic component while its final surface/border/radius ownership is
    // intentionally flattened into the surrounding command chrome.
    ['field','base','layout=integrated',['background','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius','box-shadow']],
    ['field','hover','layout=integrated',['background','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow']],
    ['field','focus-visible','layout=integrated',['background','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow']],

    // Chip variants directly own final properties (unlike ToolbarAction
    // variants, which only specialize configuration tokens consumed by the
    // generic final-property rule). These are therefore safe canonical
    // context expectations.
    ['chip','base','variant=success',['background','color']],
    ['chip','base','variant=warning',['background','color']],
    ['chip','base','variant=danger',['background','color']],
    ['chip','base','variant=info',['background','color']],
    ['chip','base','variant=quiet',['background','color','border-top-color','border-right-color','border-bottom-color','border-left-color','box-shadow']],

    // Glass recipes directly repaint Field final properties. The static Gate
    // expands :where(recipe A, B, C) into three semantic contexts so each live
    // recipe can fail independently as UNOWNED.
    ['field','base','recipe=thin-glass',['background-color','border-top-color','border-right-color','border-bottom-color','border-left-color']],
    ['field','base','recipe=soft-glass',['background-color','border-top-color','border-right-color','border-bottom-color','border-left-color']],
    ['field','base','recipe=liquid-glass',['background-color','border-top-color','border-right-color','border-bottom-color','border-left-color']],
    ['field','hover','recipe=thin-glass',['border-top-color','border-right-color','border-bottom-color','border-left-color']],
    ['field','hover','recipe=soft-glass',['border-top-color','border-right-color','border-bottom-color','border-left-color']],
    ['field','hover','recipe=liquid-glass',['border-top-color','border-right-color','border-bottom-color','border-left-color']],

    // Nested semantic headers inside a glass Material deliberately disable a
    // second backdrop layer. That final optical property is owned by Material
    // Renderer, not Component Appearance, so the expectation records the real
    // cross-module owner instead of pretending every component slot belongs to
    // one stylesheet.
    ['panelHeader','base','recipe=thin-glass',['backdrop-filter'],'src/styles/theme/material-renderer.css'],
    ['panelHeader','base','recipe=soft-glass',['backdrop-filter'],'src/styles/theme/material-renderer.css'],
    ['panelHeader','base','recipe=liquid-glass',['backdrop-filter'],'src/styles/theme/material-renderer.css'],
    ['inspectorHeader','base','recipe=thin-glass',['backdrop-filter'],'src/styles/theme/material-renderer.css'],
    ['inspectorHeader','base','recipe=soft-glass',['backdrop-filter'],'src/styles/theme/material-renderer.css'],
    ['inspectorHeader','base','recipe=liquid-glass',['backdrop-filter'],'src/styles/theme/material-renderer.css']
  ]);
  const EXPECTATIONS=Object.freeze([
    ...ROWS.flatMap(([identity,state,slots])=>slots.map(slot=>Object.freeze({identity,state,slot,context:ANY_CONTEXT,owner:'src/styles/theme/component-appearance.css'}))),
    ...CONTEXT_ROWS.flatMap(([identity,state,context,slots,owner='src/styles/theme/component-appearance.css'])=>slots.map(slot=>Object.freeze({identity,state,slot,context:normalizeContext(context),owner})))
  ]);
  function statesForElement(el){
    const states=['base'];if(!el?.matches)return Object.freeze(states);
    const matches=selector=>{try{return !!el.matches(selector);}catch{return false;}};
    if(matches(':disabled,[aria-disabled="true"],.disabled'))states.push('disabled');
    if(matches('.selected,[aria-selected="true"],[aria-checked="true"]'))states.push('selected');
    if(matches('.active,[aria-pressed="true"],[data-state="active"],[data-selected="true"]'))states.push('pressed');
    if(matches(':focus-visible'))states.push('focus-visible');
    if(matches(':hover'))states.push('hover');
    return Object.freeze([...new Set(states)]);
  }
  function contextForElement(el){
    if(!el)return ANY_CONTEXT;
    const Semantic=globalThis.DKDSSemanticUI,Appearance=globalThis.DKDSThemeComponentAppearance;
    const component=clean(Semantic?.componentContextOf?.(el)||el.dataset?.dkdsComponentContext);
    const material=clean(Semantic?.nearestMaterialContext?.(el)||el.dataset?.dkdsComponentMaterialContext||el.dataset?.dkdsMaterialContext);
    const role=clean(Semantic?.nearestMaterialRole?.(el)||el.dataset?.dkdsComponentMaterialRole||el.dataset?.dkdsMaterialRole);
    const resolved=Semantic?.resolveComponent?.(el),variant=clean(Appearance?.variantOf?.(resolved?.target||el,resolved?.id||'')||el.dataset?.dkdsComponentVariant);
    const recipeTarget=el.closest?.('[data-dkds-material-recipe]'),recipe=clean(recipeTarget?.dataset?.dkdsMaterialRecipe);
    const layout=clean(el.dataset?.dkdsFieldLayout||el.dataset?.dkdsActionLayout);
    return normalizeContext({component,material,role,recipe,variant,layout});
  }
  function expectedFor(identity,states=['base'],context=ANY_CONTEXT){const stateSet=new Set((Array.isArray(states)?states:[states]).map(clean).filter(Boolean));return Object.freeze(EXPECTATIONS.filter(row=>row.identity===clean(identity)&&stateSet.has(row.state)&&matchesContext(context,row.context)));}
  return Object.freeze({VERSION,ANY_CONTEXT,CONTEXT_AXES,EXPECTATIONS,CONTEXT_ROWS,normalizeContext,contextObject,matchesContext,statesForElement,contextForElement,expectedFor});
});
