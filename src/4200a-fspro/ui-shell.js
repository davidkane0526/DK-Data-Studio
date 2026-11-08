(() => {
 'use strict';
 // Compact frameless DK Test Studio shell, shared unchanged by desktop and Android.
 const byId=id=>document.getElementById(id);
 const info=window.DKTSPreviewBuild||{};
 // The packaged PNG comes from the *original* DKTS icon generator. Direct
 // source checkouts retain the matching readable DK fallback until generated.
 const brand=byId('fs-brand-mark');
 const brandedImage=new Image();
 brandedImage.onload=()=>{
  if(brandedImage.naturalWidth<64)return;
  brand.textContent='';
  brand.dataset.brand='legacy-native-icon';
  brand.style.backgroundImage='url("brand-icon.png")';
 };
 brandedImage.src='brand-icon.png';
 const nativeVersion=/^\d+\.\d+\.\d+$/.test(info.nativeVersion||'')?info.nativeVersion:'0.3.13';
 const uiVersion=/^a\d{1,10}$/.test(info.uiRevision||'')?info.uiRevision:'a0';
 const version=byId('fs-version-badge'),panel=byId('fs-version-popover');
 version.textContent='V'+nativeVersion;
 byId('fs-version-ui').textContent=uiVersion;
 version.title='V'+nativeVersion+' · '+uiVersion;
 const setVersionOpen=open=>{
  panel.hidden=!open;
  version.setAttribute('aria-expanded',String(open));
 };
 version.addEventListener('click',()=>setVersionOpen(panel.hidden));
 const menu=byId('fs-main-menu'),mobileToggle=byId('fs-mobile-menu-toggle');
 function mobileMenu(open){
  menu.classList.toggle('fs-mobile-menu-open',!!open);
  mobileToggle.setAttribute('aria-expanded',String(!!open));
 }
 mobileToggle.addEventListener('click',()=>mobileMenu(!menu.classList.contains('fs-mobile-menu-open')));
 document.addEventListener('click',event=>{
  const target=event.target;
  if(!panel.contains(target)&&!version.contains(target))setVersionOpen(false);
  if(target.closest?.('.fs-menu [data-command],.fs-menu [data-native-action]'))mobileMenu(false);
  if(!menu.contains(target)&&!mobileToggle.contains(target))mobileMenu(false);
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){setVersionOpen(false);mobileMenu(false);}
 });
 const actions=byId('fs-window-actions'),native=window.DKTSWindow;
 const maximize=byId('fs-window-maximize');
 function setMaximized(value){
  maximize.dataset.maximized=String(!!value);
  const en=document.documentElement.lang==='en';
  const label=value?(en?'Restore':'还原'):(en?'Maximize':'最大化');
  maximize.setAttribute('aria-label',label);maximize.title=label;
 }
 if(native&&typeof native.control==='function'){
  actions.hidden=false;
  byId('fs-window-minimize').addEventListener('click',()=>native.control('minimize'));
  maximize.addEventListener('click',()=>native.control('toggleMaximize').then(setMaximized).catch(()=>{}));
  byId('fs-window-close').addEventListener('click',()=>native.control('close'));
  native.control('isMaximized').then(setMaximized).catch(()=>{});
  native.onMaximize?.(setMaximized);
 }
 window.DKTSPreviewShell=Object.freeze({
  VERSION:'1.0.0',nativeVersion,uiVersion,
  isFrameless:Boolean(native?.control),getMobileMenuOpen:()=>menu.classList.contains('fs-mobile-menu-open'),
  closeMobileMenu:()=>mobileMenu(false)
 });
})();
