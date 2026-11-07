/* KXCI *OPT? hardware-slot decoder (Rev E §4-4).
 * Never infer an addressable SMU channel from a physical slot index.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DK4200OptionInventory=api;
})(typeof globalThis!=='undefined'?globalThis:undefined,function(){
 'use strict';
 const VERSION='0.1.0';
 const prefix=['HPSMUPA','HPSMU','SMUPA','SMU','CVU','PMURPM','PMU','VPU','VS','VM'];
 const classify=token=>{
  const clean=String(token??'').replace(/^[\s"']+|[\s"']+$/g,'').toUpperCase();
  if(!clean)return {kind:'empty',model:null,resource:null,raw:clean};
  const pmu=/^PMU([1-8])?RPM(1-2|1|2)?$/.exec(clean);
  if(pmu)return {kind:'PMU',model:clean,resource:pmu[1]?'PMU'+pmu[1]:null,raw:clean};
  for(const pre of prefix){
   if(!clean.startsWith(pre))continue;
   const tail=clean.slice(pre.length);
   if(tail&&!/^[1-9]$/.test(tail))break;
   const ch=tail?Number(tail):null;
   return {kind:pre.startsWith('HPSMU')||pre.startsWith('SMU')?'SMU':
     pre==='CVU'?'CVU':pre==='VPU'?'PGU':pre==='VS'?'VS':pre==='VM'?'VM':'PMU',
    model:pre,resource:ch?(pre.startsWith('HPSMU')||pre.startsWith('SMU')?'SMU':pre)+ch:null,raw:clean};
  }
  return {kind:'unknown',model:null,resource:null,raw:clean};
 };
 function parseOptReply(response){
  if(typeof response!=='string'||response.length>3000)throw new TypeError('Invalid *OPT? reply');
  const raw=response.trim().replace(/\0+$/,'');
  const tokens=raw.split(',').map(s=>s.trim()).filter((x,i,arr)=>x||i<arr.length-1);
  if(tokens.length<1||tokens.length>8)throw new RangeError('KXCI *OPT? lists up to eight slots');
  const slots=tokens.map((token,i)=>Object.freeze({slot:i+1,...classify(token)}));
  const channels=slots.filter(s=>s.kind==='SMU'&&s.resource);
  const unresolved=slots.filter(s=>s.kind!=='empty'&&(!s.resource||s.kind==='unknown'));
  return Object.freeze({
   schema:'dkts.4200a.opt-inventory.v1',slots:Object.freeze(slots),
   addressableSMUs:Object.freeze(channels),
   unresolvedSlots:Object.freeze(unresolved),
   complete:unresolved.length===0
  });
 }
 function toModuleCapabilities(reply,{instrumentId,lineFrequencyHz,verifiedSlotMapping}={}){
  if(typeof instrumentId!=='string'||!/(KI4200A|4200A)/i.test(instrumentId))throw new Error('4200A IDN required');
  if(lineFrequencyHz!==50&&lineFrequencyHz!==60)throw new Error('Line frequency must be verified');
  const parsed=parseOptReply(reply);
  const mapping=verifiedSlotMapping&&typeof verifiedSlotMapping==='object'?verifiedSlotMapping:{};
  const smus=[],used=new Set(),unresolved=[];
  for(const slot of parsed.slots){
   if(slot.kind!=='SMU'){if(slot.kind==='unknown')unresolved.push({slot:slot.slot,reason:'UNKNOWN_SLOT'});continue;}
   const proposed=slot.resource||mapping[slot.slot];
   if(!/^SMU[1-9]$/.test(proposed||'')){unresolved.push({slot:slot.slot,reason:'KCON_CHANNEL_NOT_VERIFIED'});continue;}
   if(used.has(proposed))throw new Error('Duplicate KCon SMU channel mapping: '+proposed);
   used.add(proposed);
   const high=slot.model.startsWith('HPSMU'),pa=slot.model.endsWith('PA');
   smus.push(Object.freeze({
    resource:proposed,model:high?'4210-SMU':'4200-SMU',preamplifier:pa,
    modelFamily:high?'4210/4211':'4200/4201',slot:slot.slot,
    source:'kxci-opt-plus-verified-kcon-mapping'
   }));
  }
  return Object.freeze({
   schema:'dkts.4200a.module-capabilities.v1',instrumentId,lineFrequencyHz,
   smus:Object.freeze(smus),unresolved:Object.freeze(unresolved),
   executionAuthorized:false,
   readyForCompiler:smus.length>0&&unresolved.length===0
  });
 }
 return Object.freeze({VERSION,parseOptReply,toModuleCapabilities});
});
