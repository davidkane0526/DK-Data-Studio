'use strict';

const Gate=globalThis.DKDSStyleGate;
if(!Gate)throw new Error('DKDSStyleGate must initialize before App runtime.');

const normalize=property=>String(property||'').trim().replace(/[A-Z]/g,ch=>`-${ch.toLowerCase()}`);
const identity=element=>String(element?.dataset?.dkdsComponentIdentity||element?.dataset?.dkdsSemanticComponent||element?.id||'app-runtime').trim()||'app-runtime';

function createOwner(owner,scope='app-runtime'){
  const id=String(owner||'').trim();
  if(!id)throw new Error('App Style Gate owner is required.');
  const meta=(element,extra={})=>({owner:id,component:String(extra.component||identity(element)),scope:String(extra.scope||scope),kind:extra.kind||Gate.KINDS.RUNTIME_INLINE,state:extra.state||'runtime'});
  const api={
    set(element,property,value,extra={}){
      if(!element)return value;
      const slot=normalize(property);
      if(value===null||value===undefined||value==='')Gate.remove(element,slot,meta(element,extra));
      else Gate.set(element,slot,String(value),meta(element,extra));
      return value;
    },
    remove(element,property,extra={}){
      if(!element)return false;
      return Gate.remove(element,normalize(property),meta(element,extra));
    },
    token(element,token,value,extra={}){
      if(!element)return value;
      const slot=normalize(token);
      if(value===null||value===undefined||value==='')Gate.remove(element,slot,meta(element,{...extra,kind:Gate.KINDS.CONFIG_TOKEN,scope:extra.scope||`${scope}-token`}));
      else Gate.setToken(element,slot,String(value),meta(element,{...extra,kind:Gate.KINDS.CONFIG_TOKEN,scope:extra.scope||`${scope}-token`}));
      return value;
    },
    patch(element,patch,extra={}){
      if(!element||!patch)return element;
      for(const [property,value] of Object.entries(patch))api.set(element,property,value,extra);
      return element;
    }
  };
  return Object.freeze(api);
}

module.exports=Object.freeze({Gate,createOwner});
