(() => {
  'use strict';
  const VERSION='2.0.0';
  let enabled=false,overlay=null,last=null,moveHandler=null,clickHandler=null,keyHandler=null,pinned=false;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const componentName=el=>{if(!el)return '(none)';const label=el.getAttribute?.('aria-label')||el.getAttribute?.('title')||'';if(label)return label;if(el.id)return `#${el.id}`;const cls=String(el.className||'').trim().split(/\s+/).filter(Boolean).slice(0,3).join('.');return `${String(el.tagName||'element').toLowerCase()}${cls?'.'+cls:''}`;};
  const materialTarget=el=>el?.closest?.('[data-dkds-material-role],[class*="dkds-material-role-"]')||el||null;
  const inlineAppearance=el=>{const style=String(el?.getAttribute?.('style')||'');return /(?:^|;)\s*(?:background(?:-color|-image)?|color|border(?:-color)?|box-shadow)\s*:/i.test(style);};
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
    return Object.freeze({componentName:componentName(semanticMatch?.target||el),element:semanticMatch?.target||el,componentIdentity:component.componentIdentity||component.component||'',componentVariant:component.variant||'',componentState:component.state||'',materialRole:actualRole,expectedMaterialRole:expectedRole,materialRecipe:row.recipe||'',expectedMaterialRecipe:expectedRecipe,materialBaseToken:row.baseToken||'',occludingChild:row.occludingChild||'',appearanceSlot:surface?.path||'',resolvedTokenName:surface?.cssVar||'',resolvedTokenValue:surface?.value||surface?.fallback||'',resolvedTokenSource:surface?.source||'',sourceTheme:profile.id||globalThis.DKDSTheme?.profile?.()||'',computedBackground:style?.backgroundColor||'',computedTextColor:style?.color||'',computedBorder:style?.borderColor||'',computedBackdropFilter:style?.backdropFilter||style?.webkitBackdropFilter||'',rendererStatus:row.status||'',statuses:Object.freeze([...new Set(statuses)]),appearance:component,material:row});
  }
  function ensureOverlay(){
    if(overlay?.isConnected)return overlay;overlay=document.createElement('div');overlay.id='dkdsThemeDebugOverlay';overlay.setAttribute('role','status');overlay.style.cssText='position:fixed;z-index:2147483647;right:10px;top:10px;width:min(430px,calc(100vw - 20px));max-height:calc(100vh - 20px);overflow:auto;padding:10px 12px;border-radius:9px;color:var(--dkui-text);font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;pointer-events:none;white-space:normal;word-break:break-word';document.body.appendChild(overlay);globalThis.DKDSMaterialSurface?.apply?.(overlay,'popover');return overlay;
  }
  function render(row){const host=ensureOverlay();host.innerHTML=`<div><b>Theme Inspector</b> · ${esc(globalThis.DKDSTheme?.contractVersion||'')} ${pinned?'· PINNED':''}</div>`+
    `<div>Component: ${esc(row.componentName)}</div><div>Identity: ${esc(row.componentIdentity||'none')}</div><div>Variant / state: ${esc(row.componentVariant||'default')} / ${esc(row.componentState||'idle')}</div>`+
    `<div>Material role: ${esc(row.materialRole||'none')} ${row.expectedMaterialRole?`(expected ${esc(row.expectedMaterialRole)})`:''}</div><div>Material recipe: ${esc(row.materialRecipe||'none')} ${row.expectedMaterialRecipe?`(policy ${esc(row.expectedMaterialRecipe)})`:''}</div><div>Base token: ${esc(row.materialBaseToken||'none')}</div><div>Occluding child: ${esc(row.occludingChild||'none')}</div>`+
    `<div>Appearance slot: ${esc(row.appearanceSlot||'none')}</div><div>Resolved token: ${esc(row.resolvedTokenName||'none')} → ${esc(row.resolvedTokenValue||'')}</div><div>Token source: ${esc(row.resolvedTokenSource||'none')} · Theme: ${esc(row.sourceTheme||'')}</div>`+
    `<div>Computed background: ${esc(row.computedBackground||'')}</div><div>Computed text: ${esc(row.computedTextColor||'')}</div><div>Computed border: ${esc(row.computedBorder||'')}</div><div>Computed backdrop: ${esc(row.computedBackdropFilter||'none')}</div>`+
    `<div>Renderer: ${esc(row.rendererStatus||'')}</div><div>Status: <b>${esc(row.statuses.join(', '))}</b></div><div style="opacity:.72">Ctrl+Alt+T toggle · click pin/unpin · Esc unpin</div>`;}
  function enable(){
    if(enabled)return true;enabled=true;pinned=false;ensureOverlay();
    moveHandler=event=>{if(pinned)return;const row=inspect(event.target);if(row.element===last)return;last=row.element||event.target;render(row);};
    clickHandler=event=>{if(event.target===overlay)return;pinned=!pinned;const row=inspect(event.target);last=row.element||event.target;render(row);event.preventDefault();event.stopPropagation();};
    keyHandler=event=>{if(event.key==='Escape'&&pinned){pinned=false;last=null;render(inspect(document.body));event.preventDefault();}};
    document.addEventListener('pointermove',moveHandler,{passive:true,capture:true});document.addEventListener('click',clickHandler,true);globalThis.addEventListener('keydown',keyHandler,true);render(inspect(document.body));return true;
  }
  function disable(){if(!enabled)return true;enabled=false;pinned=false;if(moveHandler)document.removeEventListener('pointermove',moveHandler,{capture:true});if(clickHandler)document.removeEventListener('click',clickHandler,true);if(keyHandler)globalThis.removeEventListener('keydown',keyHandler,true);moveHandler=clickHandler=keyHandler=null;last=null;overlay?.remove?.();overlay=null;return true;}
  function toggle(){return enabled?disable():enable();}
  async function bindDevShortcut(){let dev=true;try{const env=await globalThis.electronAPI?.diagnosticsGetEnvironment?.();if(env&&env.isPackaged===true)dev=false;}catch{}if(!dev)return;globalThis.addEventListener?.('keydown',event=>{if(event.ctrlKey&&event.altKey&&!event.shiftKey&&String(event.key||'').toLowerCase()==='t'){event.preventDefault();toggle();}});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindDevShortcut,{once:true});else void bindDevShortcut();
  window.DKDSThemeDebug=Object.freeze({version:VERSION,enable,disable,toggle,inspect,isEnabled:()=>enabled,isPinned:()=>pinned});
})();
