'use strict';

const text=value=>String(value??'');

const PROJECTION_STYLE=Object.freeze([
  'display','flex','flex-direction','position','left','right','top','bottom','inset','width','height','min-width','min-height','max-width','max-height','transform','box-sizing','overflow','overflow-x','overflow-y','resize','padding','padding-top','padding-right','padding-bottom','padding-left'
]);

function styleValues(node,region,purpose=''){
  const drawer=region==='drawer',overlay=drawer||region==='sheet',companion=region==='companion-right'||region==='companion-bottom';
  const plot=node?.classList?.contains?.('dkds-plot-view');
  const parameterDrawer=drawer&&(text(purpose)==='parameters'||text(node?.dataset?.dkdsPresentationPurpose)==='parameters');
  // Unit sizing is semantic input to the Presenter. A fill PRIME must keep the
  // same remaining-space intent after Mobile reparenting; forcing every Drawer
  // root to height:auto silently discarded that contract and collapsed nested
  // flex/list surfaces even though their data remained mounted.
  const fillDrawer=drawer&&(parameterDrawer||text(node?.dataset?.dkdsPortableSizing).trim().toLowerCase()==='fill');
  const values={
    ...(plot?{display:'flex','flex-direction':'column'}:{}),
    ...(companion?{flex:'1 1 0'}:{flex:''}),
    position:'relative',left:'auto',right:'auto',top:'auto',bottom:'auto',inset:'auto',width:'100%',
    height:drawer?(fillDrawer?'100%':'auto'):companion?'100%':'100%','min-width':'0','min-height':'0','max-width':'none','max-height':'none',transform:'none','box-sizing':'border-box',
    overflow:drawer?'visible':overlay?'auto':'visible','overflow-x':drawer?'visible':overlay?'auto':'visible','overflow-y':drawer?'visible':overlay?'auto':'visible',resize:overlay?'none':''
  };
  if(parameterDrawer)Object.assign(values,{height:'100%',padding:'0px','padding-top':'0px','padding-right':'0px','padding-bottom':'0px','padding-left':'0px'});
  return Object.freeze({values:Object.freeze(values),parameterDrawer,fillDrawer});
}

function releaseDetachObserver(frame){
  try{frame?.__dkdsMobileProjectionDetachCleanup?.();}catch{}
  if(frame){delete frame.__dkdsMobileProjectionDetachCleanup;delete frame.__dkdsMobileProjectionDetachNode;}
}

function installDetachObserver(frame,node,{isCurrent,onDetached}={}){
  if(!frame||!node||!globalThis.MutationObserver)return false;
  if(frame.__dkdsMobileProjectionDetachNode===node&&frame.__dkdsMobileProjectionDetachCleanup)return true;
  releaseDetachObserver(frame);
  let observer=null,parent=node.parentNode||null;
  const check=()=>{
    if(typeof isCurrent==='function'&&!isCurrent())return;
    if(!frame.contains?.(node))onDetached?.();
  };
  const observe=()=>{
    if(!observer)return;
    try{
      observer.disconnect();
      parent=node.parentNode||null;
      if(parent)observer.observe(parent,{childList:true});
    }catch{}
  };
  try{observer=new MutationObserver(()=>{check();if(frame.contains?.(node)&&node.parentNode!==parent)observe();});observe();}
  catch{try{observer?.disconnect?.();}catch{}observer=null;}
  if(!observer)return false;
  frame.__dkdsMobileProjectionDetachNode=node;
  frame.__dkdsMobileProjectionDetachCleanup=()=>{try{observer?.disconnect?.();}catch{}};
  return true;
}

module.exports=Object.freeze({PROJECTION_STYLE,styleValues,installDetachObserver,releaseDetachObserver});
