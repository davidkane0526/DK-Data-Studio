(() => {
  const styleId='dkds-verified-hot-ui';
  function apply(css){
    const value=String(css||'');if(!value)return false;
    let style=document.getElementById(styleId);
    if(!style){style=document.createElement('style');style.id=styleId;document.head.appendChild(style);}
    style.textContent=value;return true;
  }
  async function refresh(){const css=await window.electronAPI?.uiHotCss?.();return apply(css);}
  window.DKDSUIHot=Object.freeze({apply,refresh});
  if(window.electronAPI?.uiHotCss)void refresh().catch(()=>{});
})();
