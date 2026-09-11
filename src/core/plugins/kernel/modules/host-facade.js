'use strict';
const {state}=require('./context');

// Plugin callbacks receive only stable runtime facts and platform-neutral host services.
// A native-client boolean is an environment fact; presentation identity, zones and
// Desktop/Mobile placement managers remain private Core implementation details.
const SAFE_VALUE_KEYS=Object.freeze(['appVersion','isAuxiliaryWindow','isWebClient']);
const SAFE_FUNCTION_KEYS=Object.freeze([
  'setStatus','getRuntimeStatus','getLanWebStatus','openLanWebPanel','hideLanWebPanel',
  'openImportWorkbench','makeProject','getActiveProjectTab','captureActiveProjectTab',
  'copyTextToClipboard','saveChartImage'
]);
let cachedSource=null,cachedView=null;
function pluginHostView(){
  const source=state.host||{};
  if(source===cachedSource&&cachedView)return cachedView;
  const view={};
  for(const key of SAFE_VALUE_KEYS){
    if(key==='appVersion')view[key]=String(source[key]||'');
    else view[key]=!!source[key];
  }
  for(const key of SAFE_FUNCTION_KEYS){
    if(typeof source[key]==='function')view[key]=(...args)=>source[key](...args);
  }
  cachedSource=source;cachedView=Object.freeze(view);return cachedView;
}
function resetPluginHostView(){cachedSource=null;cachedView=null;}
module.exports=Object.freeze({pluginHostView,resetPluginHostView});
