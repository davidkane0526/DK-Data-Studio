(() => {
  'use strict';
  const VERSION='2.0.0';
  const ThemeContract=globalThis.DKDSThemeContract;
  const Semantic=globalThis.DKDSSemanticUI;
  if(!ThemeContract||!Semantic)throw new Error('Theme Component Appearance requires Theme Contract and DKDSSemanticUI.');
  const SLOT_KEYS=Object.freeze(ThemeContract.componentAppearanceKeys?.()||[]);
  const VARIANTS=Object.freeze(ThemeContract.componentVariants?.()||[]);
  const COMPONENTS=Object.freeze(Object.fromEntries(Semantic.components().map(row=>[row.id,Object.freeze(row)])));
  const FALLBACKS=Object.freeze({
    tab:{surface:'transparent',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'textSoft',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'transparent',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent'},
    toolbarAction:{surface:'transparent',surfaceHover:'controlHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'text',textSoft:'textSoft',textActive:'activeText',textSelected:'selectionText',border:'transparent',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent'},
    toolbarGroup:{surface:'surfaceSoft',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'text',textSoft:'textSoft',textActive:'activeText',textSelected:'selectionText',border:'divider',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent'},
    panelHeader:{surface:'role.chrome.surface',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'role.chrome.text',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'role.chrome.border',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent'},
    inspectorHeader:{surface:'role.chrome.surface',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'role.chrome.text',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'role.chrome.border',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accentAlt'},
    menuItem:{surface:'transparent',surfaceHover:'controlHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'text',textSoft:'textSoft',textActive:'activeText',textSelected:'selectionText',border:'transparent',borderHover:'transparent',borderActive:'selectionBorder',indicator:'accent'},
    chip:{surface:'surfaceSoft',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'textSoft',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'transparent',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accentAlt'},
    statusBar:{surface:'role.chrome.surface',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'role.chrome.text',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'role.chrome.border',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent'},
    floatingChrome:{surface:'role.floating.surface',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'role.floating.text',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'role.floating.border',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accentAlt'},
    field:{surface:'controlBg',surfaceHover:'controlHover',surfaceActive:'controlBg',surfaceSelected:'controlBg',text:'text',textSoft:'muted',textActive:'text',textSelected:'text',border:'controlBorder',borderHover:'controlBorderHover',borderActive:'accent',indicator:'focus'}
  });
  const kebab=value=>String(value||'').replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`);
  const cssVar=(component,slot)=>`--dkui-component-${kebab(component)}-${kebab(slot)}`;
  const variantCssVar=(component,variant,slot)=>`--dkui-component-${kebab(component)}-variant-${kebab(variant)}-${kebab(slot)}`;
  function stateSlots(state){
    if(state==='selected')return {surface:'surfaceSelected',text:'textSelected',border:'borderActive'};
    if(state==='active')return {surface:'surfaceActive',text:'textActive',border:'borderActive'};
    if(state==='hover')return {surface:'surfaceHover',text:'text',border:'borderHover'};
    if(state==='disabled')return {surface:'surface',text:'textSoft',border:'border'};
    return {surface:'surface',text:'text',border:'border'};
  }
  function consumption(){
    const components={};
    for(const [id,row] of Object.entries(COMPONENTS)){
      const slots={};for(const key of SLOT_KEYS)slots[key]=Object.freeze({path:`appearance.components.${id}.${key}`,fallback:FALLBACKS[id]?.[key]||''});
      const variants={};for(const variant of ThemeContract.componentVariantMap?.()?.[id]||[])variants[variant]=Object.freeze(Object.fromEntries(SLOT_KEYS.map(key=>[key,Object.freeze({path:`appearance.components.${id}.variants.${variant}.${key}`,fallback:`appearance.components.${id}.${key}`})])));
      components[id]=Object.freeze({label:row.label,selector:row.selector,expectedRole:row.expectedRole||'',slots:Object.freeze(slots),variants:Object.freeze(variants)});
    }
    return Object.freeze({version:VERSION,contractVersion:globalThis.DKDSTheme?.contractVersion||ThemeContract.version,components:Object.freeze(components),semantic:Object.freeze({primary:'accent',secondary:'accentAlt',info:'info',success:'success',warning:'warning',danger:'danger'}),scientific:Object.freeze({mode:'fallback-only',precedence:Object.freeze(['user-explicit','plugin-domain-explicit','project-saved','theme-fallback','core-default'])})});
  }
  function inspect(el){
    const match=Semantic.resolveComponent(el);if(!match)return Object.freeze({component:'',componentIdentity:'',state:'',variant:'',managed:false,status:'UNMANAGED_COMPONENT_APPEARANCE'});
    const {id,target,definition}=match,state=Semantic.stateOf(target),variant=Semantic.variantOf(target,id),slots=stateSlots(state),style=getComputedStyle(target),profile=globalThis.DKDSTheme?.preview?.()||{},authored=profile.appearance?.components?.[id]||{},authoredVariant=authored.variants?.[variant]||{};
    const assigned=String(target.dataset.dkdsComponentIdentity||''),selectorMatch=Semantic.components().find(row=>{try{return target.matches(row.selector);}catch{return false;}})?.id||id;
    const identityStatus=assigned&&assigned!==selectorMatch?'WRONG_COMPONENT_IDENTITY':'MANAGED';
    const resolved={};
    for(const [kind,slot] of Object.entries(slots)){
      const variantVar=variant?variantCssVar(id,variant,slot):'',baseVar=cssVar(id,slot),variantValue=variantVar?style.getPropertyValue(variantVar).trim():'',baseValue=style.getPropertyValue(baseVar).trim(),value=variantValue||baseValue;
      const source=variantValue&&Object.prototype.hasOwnProperty.call(authoredVariant,slot)?'theme-variant':Object.prototype.hasOwnProperty.call(authored,slot)?'theme':'core-fallback';
      const path=source==='theme-variant'?`appearance.components.${id}.variants.${variant}.${slot}`:`appearance.components.${id}.${slot}`;
      resolved[kind]=Object.freeze({slot,path,cssVar:variantValue?variantVar:baseVar,value,source,fallback:FALLBACKS[id]?.[slot]||''});
    }
    const indicatorVar=variant&&style.getPropertyValue(variantCssVar(id,variant,'indicator')).trim()?variantCssVar(id,variant,'indicator'):cssVar(id,'indicator');
    return Object.freeze({component:id,componentIdentity:id,label:definition.label,element:target,state,variant,expectedRole:definition.expectedRole||'',managed:identityStatus==='MANAGED',status:identityStatus,resolved:Object.freeze(resolved),indicator:Object.freeze({slot:'indicator',path:`appearance.components.${id}.indicator`,cssVar:indicatorVar,value:style.getPropertyValue(indicatorVar).trim(),source:Object.prototype.hasOwnProperty.call(authored,'indicator')?'theme':'core-fallback',fallback:FALLBACKS[id]?.indicator||''})});
  }
  function assign(root=document){return Semantic.assign(root);}
  function authoredUsage(){
    const authored=globalThis.DKDSTheme?.preview?.()?.appearance?.components||{},contract=consumption(),rows=[];
    for(const [component,values] of Object.entries(authored))for(const [slot,value] of Object.entries(values||{})){
      if(slot==='variants'){for(const [variant,variantRow] of Object.entries(value||{}))for(const variantSlot of Object.keys(variantRow||{})){const consumer=contract.components?.[component]?.variants?.[variant]?.[variantSlot];rows.push(Object.freeze({component,variant,slot:variantSlot,path:`appearance.components.${component}.variants.${variant}.${variantSlot}`,status:consumer?'CONSUMED':'AUTHORED_BUT_UNUSED'}));}continue;}
      const consumer=contract.components?.[component]?.slots?.[slot];rows.push(Object.freeze({component,slot,path:`appearance.components.${component}.${slot}`,status:consumer?'CONSUMED':'AUTHORED_BUT_UNUSED'}));
    }
    return Object.freeze(rows);
  }
  function scan(){
    assign(document);const rows=[];
    for(const [id,row] of Object.entries(COMPONENTS)){
      const nodes=[...(document.querySelectorAll?.(`[data-dkds-component-identity="${id}"]`)||[])],wrong=[];
      for(const el of nodes){const inspection=inspect(el);if(inspection.status!=='MANAGED')wrong.push(inspection.status);}
      rows.push(Object.freeze({component:id,label:row.label,count:nodes.length,expectedRole:row.expectedRole||'',status:!nodes.length?'NOT_PRESENT':wrong.length?'WRONG_COMPONENT_IDENTITY':'MANAGED',issues:Object.freeze(wrong)}));
    }
    const authored=authoredUsage(),authoredUnused=authored.filter(row=>row.status==='AUTHORED_BUT_UNUSED').length,present=rows.filter(row=>row.status!=='NOT_PRESENT'),managed=present.filter(row=>row.status==='MANAGED').length,identityErrors=present.filter(row=>row.status==='WRONG_COMPONENT_IDENTITY').length;
    return Object.freeze({version:VERSION,rows:Object.freeze(rows),authored,summary:Object.freeze({components:rows.length,present:present.length,managed,identityErrors,authoredUnused,ok:identityErrors===0&&authoredUnused===0})});
  }
  window.DKDSThemeComponentAppearance=Object.freeze({version:VERSION,components:()=>Object.fromEntries(Object.entries(COMPONENTS).map(([k,v])=>[k,{...v}])),componentOf:Semantic.resolveComponent,stateOf:Semantic.stateOf,variantOf:Semantic.variantOf,inspect,assign,scan,consumption,authoredUsage,cssVar,variantCssVar});
})();
