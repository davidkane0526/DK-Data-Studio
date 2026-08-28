(() => {
  'use strict';
  const VERSION='1.1.0';
  let enabled=false,overlay=null,last=null,moveHandler=null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const componentName=el=>{
    if(!el)return '(none)';
    const label=el.getAttribute?.('aria-label')||el.getAttribute?.('title')||'';
    if(label)return label;
    if(el.id)return `#${el.id}`;
    const cls=String(el.className||'').trim().split(/\s+/).filter(Boolean).slice(0,3).join('.');
    return `${String(el.tagName||'element').toLowerCase()}${cls?'.'+cls:''}`;
  };
  const materialTarget=el=>el?.closest?.('[data-dkds-material-role],[class*="dkds-material-role-"]')||el||null;
  function inspect(el){
    const Renderer=globalThis.DKDSThemeMaterialRenderer,target=materialTarget(el);
    if(!target||!Renderer?.inspect)return Object.freeze({component:componentName(el),role:'',recipe:'',status:'ROLE_MISSING'});
    const row=Renderer.inspect(target),appearance=globalThis.DKDSThemeComponentAppearance?.inspect?.(el)||{};
    return Object.freeze({component:componentName(target),element:target,role:row.role||'',recipe:row.recipe||'',baseToken:row.baseToken||'',baseColor:row.baseColor||'',blur:row.expectedBlur||'',saturation:row.expectedSaturation||'',background:row.backgroundColor||'',backdropFilter:row.backdropFilter||'',renderer:row.status||'',opaqueParent:row.opaqueParent||null,occludingChild:row.occludingChild||null,appearanceComponent:appearance.component||'',appearanceState:appearance.state||'',appearanceResolved:appearance.resolved||null,appearanceIndicator:appearance.indicator||null,appearanceStatus:appearance.status||''});
  }
  function ensureOverlay(){
    if(overlay?.isConnected)return overlay;
    overlay=document.createElement('div');overlay.id='dkdsThemeDebugOverlay';overlay.setAttribute('aria-hidden','true');
    overlay.style.cssText='position:fixed;z-index:2147483647;right:10px;top:10px;width:min(360px,calc(100vw - 20px));padding:10px 12px;border-radius:9px;color:var(--dkui-text);font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;pointer-events:none;white-space:normal;word-break:break-word';
    document.body.appendChild(overlay);globalThis.DKDSMaterialSurface?.apply?.(overlay,'popover');return overlay;
  }
  function render(row){
    const host=ensureOverlay(),opaque=row.opaqueParent,occluding=row.occludingChild;
    host.innerHTML=`<div><b>Theme Debug</b> · ${esc(globalThis.DKDSTheme?.contractVersion||'')}</div>`+
      `<div>component: ${esc(row.component)}</div>`+
      `<div>role: ${esc(row.role||'none')}</div>`+
      `<div>recipe: ${esc(row.recipe||'none')}</div>`+
      `<div>base token: ${esc(row.baseToken||'none')}</div>`+
      `<div>base color: ${esc(row.baseColor||'')}</div>`+
      `<div>blur: ${esc(row.blur||'')}</div>`+
      `<div>saturation: ${esc(row.saturation||'')}</div>`+
      `<div>background: ${esc(row.background||'')}</div>`+
      `<div>computed backdrop-filter: ${esc(row.backdropFilter||'none')}</div>`+
      `<div>renderer: ${esc(row.renderer||'')}</div>`+
      `<div>appearance component: ${esc(row.appearanceComponent||'none')}</div>`+
      `<div>appearance state: ${esc(row.appearanceState||'none')}</div>`+
      (row.appearanceResolved?.surface?`<div>appearance slot: ${esc(row.appearanceResolved.surface.path)} → ${esc(row.appearanceResolved.surface.value||row.appearanceResolved.surface.fallback||'')} · ${esc(row.appearanceResolved.surface.source||'')}</div>`:'')+
      (row.appearanceResolved?.text?`<div>text slot: ${esc(row.appearanceResolved.text.path)} → ${esc(row.appearanceResolved.text.value||row.appearanceResolved.text.fallback||'')} · ${esc(row.appearanceResolved.text.source||'')}</div>`:'')+
      (row.appearanceResolved?.border?`<div>border slot: ${esc(row.appearanceResolved.border.path)} → ${esc(row.appearanceResolved.border.value||row.appearanceResolved.border.fallback||'')} · ${esc(row.appearanceResolved.border.source||'')}</div>`:'')+
      (opaque?`<div>opaque parent: ${esc(opaque.id?`#${opaque.id}`:opaque.className||opaque.tag)} · ${esc(opaque.backgroundColor)}</div>`:'')+
      (occluding?`<div>occluding child: ${esc(occluding.id?`#${occluding.id}`:occluding.className||occluding.tag)} · ${esc(occluding.backgroundColor)} · ${(Number(occluding.coverage||0)*100).toFixed(0)}%</div>`:'');
  }
  function enable(){
    if(enabled)return true;enabled=true;ensureOverlay();
    moveHandler=event=>{const row=inspect(event.target);if(row.element===last)return;last=row.element||event.target;render(row);};
    document.addEventListener('pointermove',moveHandler,{passive:true,capture:true});render(inspect(document.body));return true;
  }
  function disable(){
    if(!enabled)return true;enabled=false;if(moveHandler)document.removeEventListener('pointermove',moveHandler,{capture:true});moveHandler=null;last=null;overlay?.remove?.();overlay=null;return true;
  }
  function toggle(){return enabled?disable():enable();}
  async function bindDevShortcut(){
    let dev=true;
    try{const env=await globalThis.electronAPI?.diagnosticsGetEnvironment?.();if(env&&env.isPackaged===true)dev=false;}catch{}
    if(!dev)return;
    globalThis.addEventListener?.('keydown',event=>{if(event.ctrlKey&&event.altKey&&!event.shiftKey&&String(event.key||'').toLowerCase()==='t'){event.preventDefault();toggle();}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindDevShortcut,{once:true});else void bindDevShortcut();
  window.DKDSThemeDebug=Object.freeze({version:VERSION,enable,disable,toggle,inspect,isEnabled:()=>enabled});
})();
