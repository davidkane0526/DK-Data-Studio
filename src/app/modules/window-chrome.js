'use strict';
const {$}=require('./context');

function renderMaximizedState(maximized){
  const button=$('#windowMaximizeBtn');
  if(!button)return;
  const active=!!maximized;
  button.textContent=active?'❐':'□';
  button.setAttribute('aria-label',active?'还原窗口':'最大化窗口');
  button.title=active?'还原':'最大化';
}

async function initializeWindowChrome(){
  const api=window.electronAPI;
  const bar=$('#windowCommandbar');
  if(!bar||!api?.minimizeCurrentWindow||!api?.toggleMaximizeCurrentWindow||!api?.closeCurrentWindow)return false;
  bar.classList.remove('hidden');
  $('#windowMinimizeBtn').onclick=()=>void api.minimizeCurrentWindow();
  $('#windowMaximizeBtn').onclick=async()=>{
    const state=await api.toggleMaximizeCurrentWindow();
    renderMaximizedState(state?.maximized);
  };
  $('#windowCloseBtn').onclick=()=>void api.closeCurrentWindow();
  try{renderMaximizedState((await api.getCurrentWindowState?.())?.maximized);}catch{renderMaximizedState(false);}
  api.onCurrentWindowMaximizedChanged?.(renderMaximizedState);
  return true;
}

module.exports=Object.freeze({initializeWindowChrome,renderMaximizedState});
