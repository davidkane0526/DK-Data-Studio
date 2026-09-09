'use strict';

const HOSTS=Object.freeze({DESKTOP:'desktop',WEB:'web',MOBILE:'mobile'});
const text=value=>String(value??'').trim().toLowerCase();

function rootOf(doc=globalThis.document){return doc?.documentElement||null;}
function detectHost(doc=globalThis.document,win=globalThis.window){
  const root=rootOf(doc),frozen=text(win?.__DKDS_HOST_KIND__);
  if(Object.values(HOSTS).includes(frozen))return frozen;
  const declared=text(root?.dataset?.dkdsHost||root?.getAttribute?.('data-dkds-host'));
  if(Object.values(HOSTS).includes(declared))return declared;
  const query=(()=>{try{return new URLSearchParams(win?.location?.search||'');}catch{return null;}})();
  if(win?.ReactNativeWebView?.postMessage||query?.has?.('reactNative'))return HOSTS.MOBILE;
  if(win?.electronAPI)return HOSTS.DESKTOP;
  return HOSTS.WEB;
}
function isMobileDocument(doc=globalThis.document,win=globalThis.window){
  const root=rootOf(doc);
  return detectHost(doc,win)===HOSTS.MOBILE&&root?.classList?.contains?.('react-native-client')===true;
}
function isDesktopLikeDocument(doc=globalThis.document,win=globalThis.window){return detectHost(doc,win)!==HOSTS.MOBILE;}
function platformState(doc=globalThis.document,win=globalThis.window){
  const host=detectHost(doc,win),root=rootOf(doc);
  return Object.freeze({host,mobile:host===HOSTS.MOBILE&&root?.classList?.contains?.('react-native-client')===true,desktopLike:host!==HOSTS.MOBILE});
}

const api=Object.freeze({version:'1.0.0',HOSTS,detectHost,isMobileDocument,isDesktopLikeDocument,platformState});
if(typeof window!=='undefined')window.DKDSPlatformBoundary=api;
module.exports=api;
