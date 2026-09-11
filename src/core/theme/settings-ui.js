(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const numeric=value=>{const n=parseFloat(String(value??''));return Number.isFinite(n)?n:0;};
  function control(row){
    const id=esc(row.id),label=esc(row.label||row.id),desc=row.description?`<small>${esc(row.description)}</small>`:'';
    if(row.type==='select')return `<label class="dkds-theme-setting-row"><span><strong>${label}</strong>${desc}</span><select data-theme-setting="${id}">${(row.options||[]).map(opt=>`<option value="${esc(opt.value)}" ${String(row.value)===String(opt.value)?'selected':''}>${esc(opt.label||opt.value)}</option>`).join('')}</select></label>`;
    const min=row.min!==undefined?` min="${row.min}"`:'',max=row.max!==undefined?` max="${row.max}"`:'',step=row.step!==undefined?` step="${row.step}"`:'',value=numeric(row.value);
    if(row.type==='range')return `<label class="dkds-theme-setting-row dkds-theme-setting-range"><span><strong>${label}</strong>${desc}</span><div><input data-theme-setting="${id}" type="range"${min}${max}${step} value="${value}"><input data-theme-setting-number="${id}" type="number"${min}${max}${step} value="${value}"></div></label>`;
    return `<label class="dkds-theme-setting-row"><span><strong>${label}</strong>${desc}</span><input data-theme-setting="${id}" type="number"${min}${max}${step} value="${value}"></label>`;
  }
  function open(profileId=window.DKDSTheme?.profile?.()||'builtin.default'){
    const pid=String(profileId||'builtin.default'),rows=window.DKDSTheme?.settings?.(pid)||[],profile=(window.DKDSTheme?.listProfiles?.()||[]).find(row=>row.id===pid);
    document.getElementById('dkdsThemeSettingsOverlay')?.remove();
    const overlay=document.createElement('div');overlay.id='dkdsThemeSettingsOverlay';overlay.className='dkds-theme-settings-overlay';
    overlay.innerHTML=`<section class="dkds-theme-settings-dialog dkds-dialog-shell dkds-material-role-elevated" role="dialog" aria-modal="true" aria-label="主题参数"><header class="dkds-theme-settings-head dkds-surface-header"><div><strong>${esc(profile?.label||pid)}</strong><span>主题参数</span></div><button type="button" class="dkds-icon-button dkds-panel-close-button" data-close aria-label="关闭">×</button></header><div class="dkds-theme-settings-body">${rows.length?rows.map(control).join(''):'<div class="dkds-theme-settings-empty">此主题没有可调参数</div>'}</div><footer class="dkds-theme-settings-actions"><button type="button" data-reset ${rows.length?'':'disabled'}>恢复默认</button><button type="button" class="primary" data-close>完成</button></footer></section>`;
    const close=()=>overlay.remove();overlay.addEventListener('pointerdown',event=>{if(event.target===overlay)close();});overlay.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',close));
    overlay.querySelector('[data-reset]')?.addEventListener('click',()=>{window.DKDSTheme?.resetSettings?.(pid);close();open(pid);});
    const apply=(id,value)=>{try{window.DKDSTheme?.setSetting?.(pid,id,value);}catch(err){console.warn('[ThemeSettings]',err);}};
    overlay.querySelectorAll('[data-theme-setting]').forEach(el=>{const id=el.dataset.themeSetting;const eventName=el.type==='range'?'input':'change';el.addEventListener(eventName,()=>{const value=el.type==='checkbox'?el.checked:el.value;apply(id,value);const mirror=overlay.querySelector(`[data-theme-setting-number="${CSS.escape(id)}"]`);if(mirror&&el.type==='range')mirror.value=el.value;});});
    overlay.querySelectorAll('[data-theme-setting-number]').forEach(el=>el.addEventListener('change',()=>{const id=el.dataset.themeSettingNumber;apply(id,el.value);const mirror=overlay.querySelector(`[data-theme-setting="${CSS.escape(id)}"]`);if(mirror)mirror.value=el.value;}));
    document.body.appendChild(overlay);return Object.freeze({profileId:pid,close});
  }
  window.DKDSThemeSettingsUI=Object.freeze({open});
})();
