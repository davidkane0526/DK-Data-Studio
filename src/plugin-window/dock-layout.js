(() => {
  'use strict';
  const owner='host.plugin-window-dock-layout',source='src/plugin-window/dock-layout.js';
  function install({activityId='activity'}={}){
    const body=document.body;if(!body?.classList?.contains('plugin-window-host'))return false;
    const gate=window.DKDSStyleGate;if(!gate?.setToken)return false;
    const rows=[
      {side:'left',handle:'#pluginWindowLeftDockResizer',token:'--dkds-plugin-window-left-dock-width',axis:'x',reverse:false,min:260,defaultSize:420,reserve:520},
      {side:'right',handle:'#pluginWindowRightDockResizer',token:'--dkds-plugin-window-right-dock-width',axis:'x',reverse:true,min:260,defaultSize:420,reserve:520},
      {side:'bottom',handle:'#pluginWindowBottomDockResizer',token:'--dkds-plugin-window-bottom-dock-height',axis:'y',reverse:true,min:190,defaultSize:320,reserve:220}
    ];
    const key=`dkds.plugin-window.dock.${String(activityId||'activity')}`;
    const setToken=(token,size)=>gate.setToken(body,token,`${Math.round(size)}px`,{owner,scope:'plugin-window-dock',source});
    let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
    for(const row of rows){const n=Number(saved[row.side]);if(Number.isFinite(n)&&n>0)setToken(row.token,n);}
    const persist=(side,size)=>{let state={};try{state=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}state[side]=Math.round(size);try{localStorage.setItem(key,JSON.stringify(state));}catch{}};
    for(const row of rows){
      const handle=document.querySelector(row.handle);if(!handle)continue;let drag=null;
      const current=()=>{const v=parseFloat(getComputedStyle(body).getPropertyValue(row.token));return Number.isFinite(v)&&v>0?v:row.defaultSize;};
      const clamp=value=>{const rect=body.getBoundingClientRect();const extent=row.axis==='x'?rect.width:rect.height;return Math.max(row.min,Math.min(Math.max(row.min,extent-row.reserve),value));};
      const finish=e=>{if(!drag||(e?.pointerId!==undefined&&e.pointerId!==drag.id))return;const size=current();drag=null;document.documentElement?.classList?.remove('dkds-split-drag-active');persist(row.side,size);window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'plugin-window-dock-resize-end',side:row.side,size});};
      handle.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;drag={id:e.pointerId,start:row.axis==='x'?e.clientX:e.clientY,size:current()};handle.setPointerCapture?.(e.pointerId);document.documentElement?.classList?.add('dkds-split-drag-active');e.preventDefault();});
      window.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const point=row.axis==='x'?e.clientX:e.clientY,delta=(point-drag.start)*(row.reverse?-1:1),next=clamp(drag.size+delta);setToken(row.token,next);window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'plugin-window-dock-resize',side:row.side,size:next});if(e.cancelable)e.preventDefault();},{passive:false});
      window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
      handle.addEventListener('dblclick',e=>{e.preventDefault();setToken(row.token,row.defaultSize);persist(row.side,row.defaultSize);window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'plugin-window-dock-reset',side:row.side,size:row.defaultSize});});
    }
    return true;
  }
  window.DKDSPluginWindowDockLayout=Object.freeze({install});
})();
