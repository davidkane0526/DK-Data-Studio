(() => {
  'use strict';
  const VERSION='2.3.0';
  let enabled=false,overlay=null,last=null,moveHandler=null,clickHandler=null,keyHandler=null,pinned=false;
  let dragState=null,dragMoveHandler=null,dragEndHandler=null;
  const POSITION_KEY='dkds.themeInspector.position';
  function readPosition(){try{const row=JSON.parse(sessionStorage.getItem(POSITION_KEY)||'null');return Number.isFinite(row?.x)&&Number.isFinite(row?.y)?row:null;}catch{return null;}}
  function writePosition(x,y){try{sessionStorage.setItem(POSITION_KEY,JSON.stringify({x,y}));}catch{}}
  function placeOverlay(host=overlay,pos=readPosition()){if(!host||!pos)return;const maxX=Math.max(8,innerWidth-host.offsetWidth-8),maxY=Math.max(8,innerHeight-host.offsetHeight-8);const x=Math.min(maxX,Math.max(8,pos.x)),y=Math.min(maxY,Math.max(8,pos.y));host.style.left=`${x}px`;host.style.top=`${y}px`;host.style.right='auto';}
  const pauseOwners=new Set();
  const isPaused=()=>pauseOwners.size>0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const componentName=el=>{if(!el)return '(none)';const label=el.getAttribute?.('aria-label')||el.getAttribute?.('title')||'';if(label)return label;if(el.id)return `#${el.id}`;const cls=String(el.className||'').trim().split(/\s+/).filter(Boolean).slice(0,3).join('.');return `${String(el.tagName||'element').toLowerCase()}${cls?'.'+cls:''}`;};
  const materialTarget=el=>el?.closest?.('[data-dkds-material-role],[class*="dkds-material-role-"]')||el||null;
  const inlineAppearance=el=>{const style=String(el?.getAttribute?.('style')||'');return /(?:^|;)\s*(?:background(?:-color|-image)?|color|border(?:-color)?|box-shadow)\s*:/i.test(style);};

  const TRACE_DEFAULT_PROPERTIES=Object.freeze(['height','min-height','padding-top','padding-right','padding-bottom','padding-left','background-color','background-image','border-color','box-shadow','transform']);
  const TRACE_SHORTHANDS=Object.freeze({
    'padding-top':['padding','padding-block','padding-top'],'padding-right':['padding','padding-inline','padding-right'],
    'padding-bottom':['padding','padding-block','padding-bottom'],'padding-left':['padding','padding-inline','padding-left'],
    'background-color':['background','background-color'],'background-image':['background','background-image'],
    'border-color':['border','border-color','border-top','border-right','border-bottom','border-left'],
    'box-shadow':['box-shadow'],'transform':['transform'],'height':['height'],'min-height':['min-height']
  });
  const sheetLabel=sheet=>{const href=String(sheet?.href||'');if(!href)return 'inline-style';try{return new URL(href,location.href).pathname.split('/').slice(-3).join('/');}catch{return href;}};
  function traceRuleList(rules,target,properties,source,out,order){
    for(const rule of Array.from(rules||[])){
      if(rule?.cssRules){try{traceRuleList(rule.cssRules,target,properties,source,out,order);}catch{}continue;}
      const selector=String(rule?.selectorText||'');if(!selector||!rule?.style)continue;
      let matched=false;try{matched=target.matches(selector);}catch{}if(!matched)continue;
      for(const property of properties){
        const aliases=TRACE_SHORTHANDS[property]||[property];
        const declarations=[];
        for(const alias of aliases){const value=rule.style.getPropertyValue(alias);if(value)declarations.push(Object.freeze({property:alias,value:value.trim(),important:rule.style.getPropertyPriority(alias)==='important'}));}
        if(declarations.length)out.push(Object.freeze({property,selector,source,order:order.value++,declarations:Object.freeze(declarations)}));
      }
    }
  }
  function traceOwnership(el,properties=TRACE_DEFAULT_PROPERTIES){
    const target=el?.nodeType===1?el:null;if(!target)return Object.freeze({element:null,properties:Object.freeze([])});
    const props=[...new Set((Array.isArray(properties)?properties:TRACE_DEFAULT_PROPERTIES).map(x=>String(x||'').trim()).filter(Boolean))];
    const candidates=[],order={value:0};
    for(const sheet of Array.from(document.styleSheets||[])){try{traceRuleList(sheet.cssRules,target,props,sheetLabel(sheet),candidates,order);}catch{}}
    const inline=target.style||null,computed=getComputedStyle(target);
    const rows=props.map(property=>{
      const aliases=TRACE_SHORTHANDS[property]||[property],inlineDecl=[];
      for(const alias of aliases){const value=inline?.getPropertyValue?.(alias);if(value)inlineDecl.push({property:alias,value:value.trim(),important:inline.getPropertyPriority(alias)==='important'});}
      return Object.freeze({property,computed:String(computed.getPropertyValue(property)||'').trim(),inline:Object.freeze(inlineDecl),candidates:Object.freeze(candidates.filter(row=>row.property===property))});
    });
    const component=globalThis.DKDSThemeComponentAppearance?.inspect?.(target)||{};
    return Object.freeze({componentName:componentName(target),componentIdentity:component.componentIdentity||component.component||'',geometryOwner:'Core Structure',paintOwner:'Core Component Appearance / Material Renderer',properties:Object.freeze(rows)});
  }
  function inspect(el){
    const Renderer=globalThis.DKDSThemeMaterialRenderer,Semantic=globalThis.DKDSSemanticUI,Appearance=globalThis.DKDSThemeComponentAppearance,target=materialTarget(el),component=Appearance?.inspect?.(el)||{},semanticMatch=Semantic?.resolveComponent?.(el)||null;
    const row=target&&Renderer?.inspect?Renderer.inspect(target):{status:'ROLE_MISSING',role:'',recipe:''},style=getComputedStyle(semanticMatch?.target||el||target),profile=globalThis.DKDSTheme?.preview?.()||{},expectedRole=component.expectedRole||Semantic?.expectedRole?.(semanticMatch?.target||el)||'',actualRole=row.role||'',expectedRecipe=actualRole?String(globalThis.DKDSTheme?.recipePolicy?.()?.[actualRole]||''):'';
    const surface=component.resolved?.surface||null,text=component.resolved?.text||null,border=component.resolved?.border||null,statuses=[];
    if(!component.managed&&component.status==='UNMANAGED_COMPONENT_APPEARANCE')statuses.push('UNMANAGED_COMPONENT_APPEARANCE');
    if(component.status==='WRONG_COMPONENT_IDENTITY')statuses.push('WRONG_COMPONENT_IDENTITY');
    if(expectedRole&&actualRole&&expectedRole!==actualRole&&!['MATERIAL_PARENT_OWNED','MATERIAL_CHROME_OWNED','MATERIAL_SEMANTIC_OVERRIDE'].includes(row.status))statuses.push('ROLE_MISMATCH');
    if(actualRole&&expectedRecipe&&row.recipe&&expectedRecipe!==row.recipe)statuses.push('RECIPE_MISMATCH');
    if(component.managed&&surface&&!surface.value&&!surface.fallback)statuses.push('TOKEN_NOT_CONSUMED');
    const unused=Appearance?.authoredUsage?.()?.some?.(x=>x.status==='AUTHORED_BUT_UNUSED'&&x.component===component.component);if(unused)statuses.push('AUTHORED_BUT_UNUSED');
    if(row.status==='OPAQUE_PARENT_OCCLUSION')statuses.push('OPAQUE_PARENT_OCCLUSION');
    if(row.status==='ENGINE_UNSUPPORTED')statuses.push('ENGINE_UNSUPPORTED');
    if(inlineAppearance(semanticMatch?.target||el)&&!(semanticMatch?.target||el)?.closest?.('svg,.dkds-scientific-surface-host,[data-series-id],[data-trace-id]'))statuses.push('HARDCODED_APPEARANCE');
    if(!statuses.length)statuses.push('MANAGED');
    return Object.freeze({componentName:componentName(semanticMatch?.target||el),element:semanticMatch?.target||el,componentIdentity:component.componentIdentity||component.component||'',componentVariant:component.variant||'',componentState:component.state||'',materialRole:actualRole,expectedMaterialRole:expectedRole,materialRecipe:row.recipe||'',expectedMaterialRecipe:expectedRecipe,materialBaseToken:row.baseToken||'',occludingChild:row.occludingChild||'',occlusionSource:row.occlusionSource||'',opaqueAncestor:row.opaqueParent||null,appearanceSlot:surface?.path||'',resolvedTokenName:surface?.cssVar||'',resolvedTokenValue:surface?.value||surface?.fallback||'',resolvedTokenSource:surface?.source||'',sourceTheme:profile.id||globalThis.DKDSTheme?.profile?.()||'',computedBackground:style?.backgroundColor||'',computedTextColor:style?.color||'',computedBorder:style?.borderColor||'',computedBackdropFilter:style?.backdropFilter||style?.webkitBackdropFilter||'',rendererStatus:row.status||'',statuses:Object.freeze([...new Set(statuses)]),appearance:component,material:row});
  }
  function ensureOverlay(){
    if(overlay?.isConnected)return overlay;
    overlay=document.createElement('div');
    overlay.id='dkdsThemeDebugOverlay';
    overlay.className='dkds-theme-debug-overlay';
    overlay.setAttribute('role','status');
    overlay.hidden=isPaused();
    overlay.addEventListener('click',event=>{
      const act=event.target?.closest?.('[data-theme-debug-act]')?.dataset.themeDebugAct;
      if(act==='exit'){event.preventDefault();event.stopPropagation();disable();}
    });
    overlay.addEventListener('pointerdown',event=>{
      const header=event.target?.closest?.('.dkds-theme-debug-header');
      if(!header||event.target?.closest?.('button,input,select,textarea,a'))return;
      const rect=overlay.getBoundingClientRect();
      dragState={pointerId:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top};
      overlay.setPointerCapture?.(event.pointerId);
      overlay.classList.add('is-dragging');
      event.preventDefault();event.stopPropagation();
    });
    dragMoveHandler=event=>{if(!dragState||event.pointerId!==dragState.pointerId||!overlay)return;const x=event.clientX-dragState.dx,y=event.clientY-dragState.dy;placeOverlay(overlay,{x,y});event.preventDefault();};
    dragEndHandler=event=>{if(!dragState||event.pointerId!==dragState.pointerId)return;const rect=overlay?.getBoundingClientRect?.();if(rect)writePosition(rect.left,rect.top);overlay?.classList.remove('is-dragging');dragState=null;};
    overlay.addEventListener('pointermove',dragMoveHandler);overlay.addEventListener('pointerup',dragEndHandler);overlay.addEventListener('pointercancel',dragEndHandler);
    document.body.appendChild(overlay);
    requestAnimationFrame(()=>placeOverlay(overlay));
    globalThis.DKDSMaterialSurface?.apply?.(overlay,'popover');
    return overlay;
  }
  function render(row){const host=ensureOverlay();host.hidden=isPaused();if(isPaused())return;host.innerHTML=`<div class="dkds-theme-debug-header"><div><b>Theme Inspector</b> · ${esc(globalThis.DKDSTheme?.contractVersion||'')} ${pinned?'· PINNED':''}</div><button type="button" class="dkds-theme-debug-exit dkds-panel-close-button" data-dkds-component-variant="quiet" data-theme-debug-act="exit" aria-label="退出 Theme Inspector" title="退出 Theme Inspector"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div>`+
    `<div>Component: ${esc(row.componentName)}</div><div>Identity: ${esc(row.componentIdentity||'none')}</div><div>Variant / state: ${esc(row.componentVariant||'default')} / ${esc(row.componentState||'idle')}</div>`+
    `<div>Material role: ${esc(row.materialRole||'none')} ${row.expectedMaterialRole?`(expected ${esc(row.expectedMaterialRole)})`:''}</div><div>Material recipe: ${esc(row.materialRecipe||'none')} ${row.expectedMaterialRecipe?`(policy ${esc(row.expectedMaterialRecipe)})`:''}</div><div>Base token: ${esc(row.materialBaseToken||'none')}</div><div>Occlusion source: ${esc(row.occlusionSource||'none')}</div><div>Occluding child: ${esc(row.occludingChild||'none')}</div><div>Opaque ancestor (diagnostic only): ${esc(row.opaqueAncestor?`${row.opaqueAncestor.tag||''}${row.opaqueAncestor.id?`#${row.opaqueAncestor.id}`:''}.${row.opaqueAncestor.className||''}`:'none')}</div>`+
    `<div>Appearance slot: ${esc(row.appearanceSlot||'none')}</div><div>Resolved token: ${esc(row.resolvedTokenName||'none')} → ${esc(row.resolvedTokenValue||'')}</div><div>Token source: ${esc(row.resolvedTokenSource||'none')} · Theme: ${esc(row.sourceTheme||'')}</div>`+
    `<div>Computed background: ${esc(row.computedBackground||'')}</div><div>Computed text: ${esc(row.computedTextColor||'')}</div><div>Computed border: ${esc(row.computedBorder||'')}</div><div>Computed backdrop: ${esc(row.computedBackdropFilter||'none')}</div>`+
    `<div>Renderer: ${esc(row.rendererStatus||'')}</div><div>Status: <b>${esc(row.statuses.join(', '))}</b></div><div class="dkds-theme-debug-hint">click pin/unpin · Esc 退出 · DevTool → Theme 管理</div>`;}
  function enable(){
    if(enabled)return true;enabled=true;pinned=false;ensureOverlay();
    moveHandler=event=>{if(isPaused()||pinned)return;const row=inspect(event.target);if(row.element===last)return;last=row.element||event.target;render(row);};
    clickHandler=event=>{if(isPaused()||event.target===overlay||event.target?.closest?.('.dkds-theme-debug-overlay,.dkds-plugin-devtools,#statusBar .devtools-status-item'))return;pinned=!pinned;const row=inspect(event.target);last=row.element||event.target;render(row);event.preventDefault();event.stopPropagation();};
    keyHandler=event=>{if(event.key!=='Escape'||isPaused())return;disable();event.preventDefault();event.stopPropagation();};
    document.addEventListener('pointermove',moveHandler,{passive:true,capture:true});document.addEventListener('click',clickHandler,true);globalThis.addEventListener('keydown',keyHandler,true);render(inspect(document.body));return true;
  }
  function disable(){if(!enabled){pauseOwners.clear();dragState=null;overlay?.remove?.();overlay=null;return true;}enabled=false;pinned=false;dragState=null;pauseOwners.clear();if(moveHandler)document.removeEventListener('pointermove',moveHandler,{capture:true});if(clickHandler)document.removeEventListener('click',clickHandler,true);if(keyHandler)globalThis.removeEventListener('keydown',keyHandler,true);moveHandler=clickHandler=keyHandler=null;last=null;overlay?.remove?.();overlay=null;return true;}
  function pause(owner='external'){pauseOwners.add(String(owner||'external'));if(overlay)overlay.hidden=true;return true;}
  function resume(owner='external'){pauseOwners.delete(String(owner||'external'));if(enabled&&!isPaused()){ensureOverlay().hidden=false;render(last?inspect(last):inspect(document.body));}return true;}
  function toggle(){return enabled?disable():enable();}
  window.DKDSThemeDebug=Object.freeze({version:VERSION,enable,disable,pause,resume,toggle,inspect,traceOwnership,isEnabled:()=>enabled,isPaused,isPinned:()=>pinned});
})();
