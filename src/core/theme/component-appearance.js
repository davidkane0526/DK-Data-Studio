(() => {
  'use strict';
  const VERSION='3.0.0';
  const ThemeContract=globalThis.DKDSThemeContract;
  const Semantic=globalThis.DKDSSemanticUI;
  if(!ThemeContract||!Semantic)throw new Error('Theme Component Appearance requires Theme Contract and DKDSSemanticUI.');
  const SLOT_KEYS=Object.freeze(ThemeContract.componentAppearanceKeys?.()||[]);
  const VARIANTS=Object.freeze(ThemeContract.componentVariants?.()||[]);
  const COMPONENT_CONTEXTS=Object.freeze(ThemeContract.componentContexts?.()||['standalone','grouped']);
  const MATERIAL_ROLES=Object.freeze(ThemeContract.materialRoles?.()||[]);
  const COMPONENTS=Object.freeze(Object.fromEntries(Semantic.components().map(row=>[row.id,Object.freeze(row)])));
  const DEPTH_FALLBACK=Object.freeze({shadow:'none',shadowHover:'none',shadowActive:'none',shadowSelected:'none',radius:'var(--dkui-radius)'});
  const FALLBACKS=Object.freeze({
    tab:{surface:'transparent',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'textSoft',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'transparent',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent',...DEPTH_FALLBACK},
    toolbarAction:{surface:'transparent',surfaceHover:'controlHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'text',textSoft:'textSoft',textActive:'activeText',textSelected:'selectionText',border:'transparent',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent',...DEPTH_FALLBACK},
    toolbarGroup:{surface:'surfaceSoft',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'text',textSoft:'textSoft',textActive:'activeText',textSelected:'selectionText',border:'divider',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent',shadow:'var(--dkui-shadow-1)',shadowHover:'var(--dkui-shadow-1)',shadowActive:'var(--dkui-shadow-1)',shadowSelected:'var(--dkui-shadow-1)',radius:'var(--dkui-radius)'},
    panelHeader:{surface:'role.chrome.surface',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'role.chrome.text',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'role.chrome.border',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent',...DEPTH_FALLBACK},
    inspectorHeader:{surface:'role.chrome.surface',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'role.chrome.text',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'role.chrome.border',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accentAlt',...DEPTH_FALLBACK},
    menuItem:{surface:'transparent',surfaceHover:'controlHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'text',textSoft:'textSoft',textActive:'activeText',textSelected:'selectionText',border:'transparent',borderHover:'transparent',borderActive:'selectionBorder',indicator:'accent',...DEPTH_FALLBACK},
    chip:{surface:'surfaceSoft',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'textSoft',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'transparent',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accentAlt',...DEPTH_FALLBACK},
    statusBar:{surface:'role.chrome.surface',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'role.chrome.text',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'role.chrome.border',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accent',...DEPTH_FALLBACK},
    floatingChrome:{surface:'role.floating.surface',surfaceHover:'surfaceHover',surfaceActive:'activeSurface',surfaceSelected:'selectionSurface',text:'role.floating.text',textSoft:'muted',textActive:'activeText',textSelected:'selectionText',border:'role.floating.border',borderHover:'controlBorder',borderActive:'selectionBorder',indicator:'accentAlt',shadow:'var(--dkui-shadow-1)',shadowHover:'var(--dkui-shadow-1)',shadowActive:'var(--dkui-shadow-1)',shadowSelected:'var(--dkui-shadow-1)',radius:'var(--dkui-radius)'},
    field:{surface:'controlBg',surfaceHover:'controlHover',surfaceActive:'controlBg',surfaceSelected:'controlBg',text:'text',textSoft:'muted',textActive:'text',textSelected:'text',border:'controlBorder',borderHover:'controlBorderHover',borderActive:'accent',indicator:'focus',...DEPTH_FALLBACK}
  });
  const kebab=value=>String(value||'').replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`);
  const cssVar=(component,slot)=>`--dkui-component-${kebab(component)}-${kebab(slot)}`;
  const variantCssVar=(component,variant,slot)=>`--dkui-component-${kebab(component)}-variant-${kebab(variant)}-${kebab(slot)}`;
  const fallbackValue=(component,slot)=>{
    const value=FALLBACKS[component]?.[slot]||'';
    if(!value)return '';
    if(value==='transparent'||value==='none'||value.startsWith('var('))return value;
    if(value.startsWith('role.')){const [,role,key]=value.split('.');return `var(--dkui-role-${role}-${key})`;}
    return `var(--dkui-${kebab(value)})`;
  };
  function stateSlots(state){
    if(state==='selected')return {surface:'surfaceSelected',text:'textSelected',border:'borderActive',shadow:'shadowSelected',radius:'radius'};
    if(state==='active')return {surface:'surfaceActive',text:'textActive',border:'borderActive',shadow:'shadowActive',radius:'radius'};
    if(state==='hover')return {surface:'surfaceHover',text:'text',border:'borderHover',shadow:'shadowHover',radius:'radius'};
    if(state==='disabled')return {surface:'surface',text:'textSoft',border:'border',shadow:'shadow',radius:'radius'};
    return {surface:'surface',text:'text',border:'border',shadow:'shadow',radius:'radius'};
  }
  function contextFor(target){return Semantic.componentContextOf?.(target)||'standalone';}
  function roleFor(target){return Semantic.nearestMaterialRole?.(target)||'';}
  function materialContextFor(target){return Semantic.nearestMaterialContext?.(target)||'';}
  function variantDelta(baseRow={},resolvedRow={},variant=''){
    if(!variant)return {};
    const out={};
    for(const key of SLOT_KEYS){
      const value=resolvedRow?.[key];
      if(value!==undefined&&value!==baseRow?.[key])out[key]=value;
    }
    return out;
  }
  function themeResolved(target,id,variant){
    const profile=globalThis.DKDSTheme?.preview?.()||{},context=contextFor(target),role=roleFor(target),materialContext=materialContextFor(target),appearance=profile.appearance||{};
    const baseRow=ThemeContract.resolveComponentAppearance?.(appearance,id,{context,role,variant:'',materialContext})||{};
    const row=ThemeContract.resolveComponentAppearance?.(appearance,id,{context,role,variant,materialContext})||baseRow;
    const variantRow=variantDelta(baseRow,row,variant);
    return {profile,baseRow,row,variantRow,context,role,materialContext};
  }
  function clearElementVars(target,id){
    if(!target?.style)return;
    for(const slot of SLOT_KEYS){target.style.removeProperty(cssVar(id,slot));for(const variant of VARIANTS)target.style.removeProperty(variantCssVar(id,variant,slot));}
  }
  const setData=(target,key,value)=>{const next=String(value??'');if(String(target?.dataset?.[key]??'')===next)return false;target.dataset[key]=next;return true;};
  const clearData=(target,key)=>{if(!target?.dataset||target.dataset[key]===undefined)return false;delete target.dataset[key];return true;};
  function applyElement(target){
    const match=Semantic.resolveComponent(target);if(!match||match.target!==target)return false;
    const id=match.id,variant=Semantic.variantOf(target,id),resolved=themeResolved(target,id,variant);clearElementVars(target,id);
    for(const slot of SLOT_KEYS){const value=resolved.baseRow?.[slot];if(value!==undefined&&value!=='')target.style.setProperty(cssVar(id,slot),String(value));}
    if(variant)for(const slot of SLOT_KEYS){const value=resolved.variantRow?.[slot];if(value!==undefined&&value!=='')target.style.setProperty(variantCssVar(id,variant,slot),String(value));}
    setData(target,'dkdsComponentContext',resolved.context||'standalone');setData(target,'dkdsComponentContextOwner','core-runtime');
    if(resolved.role)setData(target,'dkdsComponentMaterialRole',resolved.role);else clearData(target,'dkdsComponentMaterialRole');
    if(resolved.materialContext)setData(target,'dkdsComponentMaterialContext',resolved.materialContext);else clearData(target,'dkdsComponentMaterialContext');
    return true;
  }
  function consumption(){
    const components={};
    for(const [id,row] of Object.entries(COMPONENTS)){
      const slots={};for(const key of SLOT_KEYS)slots[key]=Object.freeze({path:`appearance.components.${id}.${key}`,fallback:FALLBACKS[id]?.[key]||''});
      const variants={};for(const variant of ThemeContract.componentVariantMap?.()?.[id]||[])variants[variant]=Object.freeze(Object.fromEntries(SLOT_KEYS.map(key=>[key,Object.freeze({path:`appearance.components.${id}.variants.${variant}.${key}`,fallback:`appearance.components.${id}.${key}`})])));
      components[id]=Object.freeze({label:row.label,selector:row.selector,expectedRole:row.expectedRole||'',slots:Object.freeze(slots),variants:Object.freeze(variants),contexts:COMPONENT_CONTEXTS,materialRoles:MATERIAL_ROLES});
    }
    return Object.freeze({version:VERSION,contractVersion:globalThis.DKDSTheme?.contractVersion||ThemeContract.version,components:Object.freeze(components),componentContexts:COMPONENT_CONTEXTS,materialRoles:MATERIAL_ROLES,semantic:Object.freeze({primary:'accent',secondary:'accentAlt',info:'info',success:'success',warning:'warning',danger:'danger'}),scientific:Object.freeze({mode:'fallback-only',precedence:Object.freeze(['user-explicit','plugin-domain-explicit','project-saved','theme-fallback','core-default'])})});
  }
  function inspect(el){
    const match=Semantic.resolveComponent(el);if(!match)return Object.freeze({component:'',componentIdentity:'',state:'',variant:'',managed:false,status:'UNMANAGED_COMPONENT_APPEARANCE'});
    const {id,target,definition}=match,state=Semantic.stateOf(target),variant=Semantic.variantOf(target,id),slots=stateSlots(state),style=getComputedStyle(target),composed=themeResolved(target,id,variant);
    const assigned=String(target.dataset.dkdsComponentIdentity||''),selectorMatch=Semantic.components().find(row=>{try{return target.matches(row.selector);}catch{return false;}})?.id||id;
    const identityStatus=assigned&&assigned!==selectorMatch?'WRONG_COMPONENT_IDENTITY':'MANAGED',resolved={};
    for(const [kind,slot] of Object.entries(slots)){
      const variantVar=variant?variantCssVar(id,variant,slot):'',baseVar=cssVar(id,slot),variantValue=variantVar?style.getPropertyValue(variantVar).trim():'',baseValue=style.getPropertyValue(baseVar).trim(),value=variantValue||baseValue||fallbackValue(id,slot);
      resolved[kind]=Object.freeze({slot,path:`appearance.components.${id} · role:${composed.role||'-'} · context:${composed.context||'standalone'}${variant?` · variant:${variant}`:''}`,cssVar:variantValue?variantVar:baseVar,value,source:Object.prototype.hasOwnProperty.call(composed.row||{},slot)?'theme-composed':'core-fallback',fallback:FALLBACKS[id]?.[slot]||''});
    }
    const indicatorVar=variant&&style.getPropertyValue(variantCssVar(id,variant,'indicator')).trim()?variantCssVar(id,variant,'indicator'):cssVar(id,'indicator');
    return Object.freeze({component:id,componentIdentity:id,label:definition.label,element:target,state,variant,componentContext:composed.context,materialRole:composed.role,materialContext:composed.materialContext,expectedRole:definition.expectedRole||'',managed:identityStatus==='MANAGED',status:identityStatus,resolved:Object.freeze(resolved),indicator:Object.freeze({slot:'indicator',path:`appearance.components.${id}.indicator`,cssVar:indicatorVar,value:style.getPropertyValue(indicatorVar).trim()||fallbackValue(id,'indicator'),source:Object.prototype.hasOwnProperty.call(composed.row||{},'indicator')?'theme-composed':'core-fallback',fallback:FALLBACKS[id]?.indicator||''})});
  }
  const PERF={assignCalls:0,flushes:0,scheduleCalls:0,mutationRecords:0,ignoredNonHtml:0};
  function applyAssigned(root=document){
    PERF.assignCalls++;
    const scope=root?.querySelectorAll?root:document,nodes=[];if(root?.matches?.('[data-dkds-component-identity]'))nodes.push(root);for(const el of scope.querySelectorAll?.('[data-dkds-component-identity]')||[])nodes.push(el);let applied=0;for(const el of new Set(nodes))if(applyElement(el))applied++;return Object.freeze({assigned:applied});
  }
  function assign(root=document,{syncSemantic=true}={}){if(syncSemantic)Semantic.assign(root);return applyAssigned(root);}
  function authoredUsage(){
    const authored=globalThis.DKDSTheme?.preview?.()?.appearance?.components||{},rows=[];
    const walk=(component,node,path,meta={})=>{for(const [slot,value] of Object.entries(node||{})){if(slot==='variants'||slot==='contexts'||slot==='roles')continue;rows.push(Object.freeze({component,...meta,slot,path:`${path}.${slot}`,status:SLOT_KEYS.includes(slot)?'CONSUMED':'AUTHORED_BUT_UNUSED'}));}for(const [variant,row] of Object.entries(node?.variants||{}))walk(component,row,`${path}.variants.${variant}`,{...meta,variant});for(const [context,row] of Object.entries(node?.contexts||{}))walk(component,row,`${path}.contexts.${context}`,{...meta,context});for(const [role,row] of Object.entries(node?.roles||{}))walk(component,row,`${path}.roles.${role}`,{...meta,role});};
    for(const [component,row] of Object.entries(authored))walk(component,row,`appearance.components.${component}`);return Object.freeze(rows);
  }
  function scan(){
    assign(document);const rows=[];
    for(const [id,row] of Object.entries(COMPONENTS)){const nodes=[...(document.querySelectorAll?.(`[data-dkds-component-identity="${id}"]`)||[])],wrong=[];for(const el of nodes){const inspection=inspect(el);if(inspection.status!=='MANAGED')wrong.push(inspection.status);}rows.push(Object.freeze({component:id,label:row.label,count:nodes.length,expectedRole:row.expectedRole||'',status:!nodes.length?'NOT_PRESENT':wrong.length?'WRONG_COMPONENT_IDENTITY':'MANAGED',issues:Object.freeze(wrong)}));}
    const authored=authoredUsage(),authoredUnused=authored.filter(row=>row.status==='AUTHORED_BUT_UNUSED').length,present=rows.filter(row=>row.status!=='NOT_PRESENT'),managed=present.filter(row=>row.status==='MANAGED').length,identityErrors=present.filter(row=>row.status==='WRONG_COMPONENT_IDENTITY').length;
    return Object.freeze({version:VERSION,rows:Object.freeze(rows),authored,summary:Object.freeze({components:rows.length,present:present.length,managed,identityErrors,authoredUnused,ok:identityErrors===0&&authoredUnused===0})});
  }
  let observer=null,appearanceFrame=0;const pendingAppearanceRoots=new Set();
  const requestFrame=fn=>(globalThis.requestAnimationFrame||((cb)=>setTimeout(cb,0)))(fn);
  const htmlElement=el=>typeof HTMLElement==='undefined'||el instanceof HTMLElement;
  function scheduleAppearance(root){
    PERF.scheduleCalls++;
    if(!root?.querySelectorAll||!htmlElement(root)){if(root?.nodeType===1)PERF.ignoredNonHtml++;return;}
    let candidate=root,covered=false;
    for(const existing of [...pendingAppearanceRoots]){
      if(existing===candidate||existing?.contains?.(candidate)){covered=true;break;}
      if(candidate?.contains?.(existing)){pendingAppearanceRoots.delete(existing);continue;}
      if(existing?.parentElement&&existing.parentElement===candidate?.parentElement){pendingAppearanceRoots.delete(existing);candidate=candidate.parentElement;}
    }
    if(!covered)pendingAppearanceRoots.add(candidate);
    if(appearanceFrame)return;appearanceFrame=requestFrame(()=>{appearanceFrame=0;PERF.flushes++;const roots=[...pendingAppearanceRoots];pendingAppearanceRoots.clear();for(const item of roots)applyAssigned(item);});
  }
  function start(){
    const semanticState=Semantic.performance?.();if(!semanticState||semanticState.documentAssignments===0)Semantic.assign(document);applyAssigned(document);
    const recomposeAll=()=>scheduleAppearance(document);globalThis.addEventListener?.('dkds:theme-changed',recomposeAll);globalThis.addEventListener?.('dkds:theme-profile-changed',recomposeAll);
    if(observer||typeof MutationObserver!=='function')return;
    const subtreeAttributes=new Set(['class','data-dkds-material-role','data-dkds-material-context']);
    observer=new MutationObserver(records=>{PERF.mutationRecords+=records.length;for(const record of records){if(record.type==='attributes'){if(!htmlElement(record.target)){PERF.ignoredNonHtml++;continue;}if(subtreeAttributes.has(record.attributeName))scheduleAppearance(record.target);else applyElement(record.target);continue;}for(const node of record.addedNodes||[])if(node?.nodeType===1)scheduleAppearance(node);}});
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-selected','aria-pressed','aria-checked','data-state','data-selected','data-dkds-component-variant','data-dkds-material-role','data-dkds-material-context']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  const performanceSnapshot=()=>Object.freeze({...PERF,pendingRoots:pendingAppearanceRoots.size,framePending:!!appearanceFrame});
  window.DKDSThemeComponentAppearance=Object.freeze({version:VERSION,performance:performanceSnapshot,components:()=>Object.fromEntries(Object.entries(COMPONENTS).map(([k,v])=>[k,{...v}])),componentOf:Semantic.resolveComponent,stateOf:Semantic.stateOf,variantOf:Semantic.variantOf,contextOf:Semantic.componentContextOf,materialRoleOf:Semantic.nearestMaterialRole,materialContextOf:Semantic.nearestMaterialContext,inspect,assign,scan,consumption,authoredUsage,cssVar,variantCssVar});
})();
