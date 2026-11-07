/* KXCI SMU DC compiler — NO I/O, NEVER authorizes output.
 * Tektronix 4200A-KXCI-907-01 Rev E (Mar 2025) §§4,5.
 * Check Rev F (Oct 2026) before hardware enabling.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DK4200KXCIDCCompiler=api;
})(typeof globalThis!=='undefined'?globalThis:undefined,function(){
 'use strict';
 const VERSION='0.1.0';
 const MODELS=Object.freeze({
  '4200-SMU':Object.freeze({voltage:210,current:0.105}),
  '4201-SMU':Object.freeze({voltage:210,current:0.105}),
  '4210-SMU':Object.freeze({voltage:210,current:1.05}),
  '4211-SMU':Object.freeze({voltage:210,current:1.05})
 });
 const numberPattern=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
 const fail=(code,detail='')=>{const error=new Error(code+(detail?': '+detail:''));error.code=code;throw error;};
 const parseNumber=(v,path)=>{const s=String(v??'').trim();if(!numberPattern.test(s)||!Number.isFinite(Number(s)))fail('INVALID_NUMBER',path);return Number(s);};
 const numeric=(v,path)=>{
  const n=typeof v==='number'?v:parseNumber(v,path);
  if(!Number.isFinite(n))fail('INVALID_NUMBER',path);
  const direct=String(n);
  const fits=s=>s.length<=12&&/e[+-]?\d{1,2}$/i.test(s.replace(/.*e/i,'e'))||s.length<=12&&!/[eE]/.test(s);
  if(fits(direct))return direct;
  for(let digits=10;digits>=0;digits--){
   const s=n.toExponential(digits).replace(/e\+?/,'e');
   if(s.length<=12&&Number(s)===n&&/e[+-]?\d{1,2}$/i.test(s))return s;
  }
  fail('KXCI_NUMBER_PRECISION',path);
 };
 const positive=(v,path)=>{const n=parseNumber(v,path);if(n<=0)fail('NOT_POSITIVE',path);return n;};
 const checkAbs=(v,max,path)=>{if(Math.abs(v)>max+max*1e-12)fail('HARDWARE_LIMIT',path+' max ±'+max);return v;};
 const channelIndex=v=>{const m=/^SMU([1-9])$/.exec(String(v||''));return m?Number(m[1]):0;};
 const supports=(t)=>t?.resource&&channelIndex(t.resource)>0;
 const assertPlain=x=>x&&typeof x==='object'&&!Array.isArray(x);
 function sweep(t,role,refOffset,limit,hardwareMax){
  if(t.segments?.length||t.generator==='Generator')fail('SEGMENTS_UNSUPPORTED',t.logical);
  if(!['Linear Step','Linear Points'].includes(t.generator))fail('SWEEP_UNSUPPORTED',t.logical+' '+t.generator);
  const start=parseNumber(t.start,t.logical+'.start')+refOffset;
  const stop=parseNumber(t.stop,t.logical+'.stop')+refOffset;
  checkAbs(start,hardwareMax,t.logical+'.start');checkAbs(stop,hardwareMax,t.logical+'.stop');
  if(Math.abs(start)<0.001&&start!==0&&t.sourceMode==='voltage')fail('KXCI_VOLTAGE_QUANTIZATION',t.logical+'.start');
  let step,points;
  if(t.generator==='Linear Step'){
    step=parseNumber(t.step,t.logical+'.step');
    if(step===0)fail('INVALID_STEP',t.logical);
    const cycles=(stop-start)/step;
    if(!(cycles>0)||Math.abs(cycles-Math.round(cycles))>1e-8)fail('STEP_DIRECTION_OR_DIVISION',t.logical);
    points=Math.round(cycles)+1;
  }else{
    points=Number(t.points);
    if(!Number.isSafeInteger(points)||points<2)fail('INVALID_POINTS',t.logical);
    step=(stop-start)/(points-1);
    if(step===0)fail('INVALID_STEP',t.logical);
  }
  if(points>(role==='X'?1024:32))fail('KXCI_POINT_LIMIT',t.logical+' '+points);
  if(Math.abs(step)<0.001&&t.sourceMode==='voltage')fail('KXCI_VOLTAGE_QUANTIZATION',t.logical+'.step');
  const stepText=numeric(step,t.logical+'.step'),startText=numeric(start,t.logical+'.start');
  if(role==='X'){
   const stopText=numeric(stop,t.logical+'.stop');
   // Ensure serialization does not silently change the exact requested endpoint.
   if(Math.abs((start+Number(stepText)*(points-1))-stop)>Math.max(1e-9,Math.abs(stop)*1e-9))
    fail('SWEEP_SERIALIZATION_DRIFT',t.logical);
   return Object.freeze({role,points,start,stop,step,command:`${t.sourceMode==='voltage'?'VR':'IR'}1,${startText},${stopText},${stepText},${numeric(positive(t.compliance,t.logical+'.compliance'),t.logical+'.compliance')}`});
  }
  if(Math.abs((start+Number(stepText)*(points-1))-stop)>Math.max(1e-9,Math.abs(stop)*1e-9))
   fail('SWEEP_SERIALIZATION_DRIFT',t.logical);
  return Object.freeze({role,points,start,stop,step,command:`${t.sourceMode==='voltage'?'VP':'IP'} ${startText},${stepText},${points},${numeric(positive(t.compliance,t.logical+'.compliance'),t.logical+'.compliance')}`});
 }
 function selectMeasurementFunctions(page,assigned,x,p){
  const allowed=new Set(assigned.flatMap(t=>{const n=channelIndex(t.resource);return ['V'+n,'I'+n];}));
  const xch=channelIndex(x.resource);
  const mandatory=['V'+xch,'I'+xch];
  if(p){
    const pch=channelIndex(p.resource);
    mandatory.push('V'+pch,'I'+pch);
  }
  const byLogical=new Map(assigned.map(t=>[t.logical.toUpperCase(),t]));
  function resolveSignal(input){
    const token=String(input||'').trim();
    if(allowed.has(token.toUpperCase()))return [token.toUpperCase()];
    const simple=/^([VI])([A-Za-z])$/i.exec(token);
    if(simple){
     const t=byLogical.get(simple[2].toUpperCase());
     if(t)return [simple[1].toUpperCase()+channelIndex(t.resource)];
    }
    const voltagePair=/^V([A-Za-z])([A-Za-z])$/i.exec(token);
    if(voltagePair){
     const a=byLogical.get(voltagePair[1].toUpperCase()),b=byLogical.get(voltagePair[2].toUpperCase());
     if(a&&b)return ['V'+channelIndex(a.resource),'V'+channelIndex(b.resource)];
    }
    fail('OUTPUT_FUNCTION_UNSUPPORTED',token);
  }
  let requested=[];
  if(page.captureFunctions!==undefined){
    if(!Array.isArray(page.captureFunctions)||page.captureFunctions.length<1)
      fail('CAPTURE_FUNCTION_SELECTION');
    for(const name of page.captureFunctions)requested.push(...resolveSignal(name));
  }else if(String(page.outputs||'').trim()){
    for(const token of String(page.outputs).split(/[,;\s]+/).filter(Boolean))requested.push(...resolveSignal(token));
  }else if(assigned.length<=3){
    requested=assigned.flatMap(t=>{const n=channelIndex(t.resource);return ['V'+n,'I'+n];});
  }
  const oldAllReadOrder=page.captureFunctions===undefined&&!String(page.outputs||'').trim()&&assigned.length<=3;
  const names=[...new Set(oldAllReadOrder?requested:[...mandatory,...requested])];
  for(const name of names)if(!allowed.has(name))fail('MEASUREMENT_CHANNEL_UNAVAILABLE',name);
  if(names.length>6)fail('KXCI_LI_MAX_SIX_FUNCTIONS',names.join(','));
  return Object.freeze(names);
 }
 function compile(page,{capabilities}={}){
  if(!assertPlain(page)||page.schema!=='dkts.fspro.page.v1')fail('PAGE_SCHEMA');
  if(page.info?.testType!=='DC')fail('TEST_MODE_UNSUPPORTED',page.info?.testType);
  if(!assertPlain(capabilities)||capabilities.schema!=='dkts.4200a.module-capabilities.v1')fail('CAPABILITIES_REQUIRED');
  if(!Array.isArray(capabilities.smus)||!capabilities.smus.length)fail('NO_SMU_INVENTORY');
  if(capabilities.lineFrequencyHz!==50&&capabilities.lineFrequencyHz!==60)fail('LINE_FREQUENCY_REQUIRED');
  if(!Array.isArray(page.terminals)||page.terminals.length<2)fail('TERMINALS_REQUIRED');
  if(page.terminals.length>9)fail('KXCI_CHANNEL_COUNT','KXCI CH maximum 9 channels');
  const inv=new Map();
  for(const row of capabilities.smus){
   if(!assertPlain(row)||!channelIndex(row.resource)||!MODELS[row.model]||typeof row.preamplifier!=='boolean')
    fail('INVALID_SMU_INVENTORY',JSON.stringify(row));
   if(inv.has(row.resource))fail('DUPLICATE_SMU_INVENTORY',row.resource);
   inv.set(row.resource,row);
  }
  const terms=page.terminals,refs=new Map(),byLogical=new Map(),occupied=new Set();
  for(const t of terms){
   if(!assertPlain(t)||!/^[A-Za-z][A-Za-z0-9_]{0,12}$/.test(t.logical||''))fail('LOGICAL_TERMINAL',t?.logical);
   if(byLogical.has(t.logical))fail('DUPLICATE_TERMINAL',t.logical);
   if(!supports(t)||!inv.has(t.resource))fail('UNVERIFIED_RESOURCE',t.logical);
   if(occupied.has(t.resource))fail('DUPLICATE_RESOURCE',t.resource);
   occupied.add(t.resource);byLogical.set(t.logical,t);
   if(!['X','P','CONDITION'].includes(t.role)||!['voltage','current'].includes(t.sourceMode))fail('TERMINAL_MODE',t.logical);
   if(t.measureRange?.mode!=='auto')fail('FIXED_RANGE_NOT_COMPILED',t.logical);
   const mod=inv.get(t.resource),m=MODELS[mod.model],comp=positive(t.compliance,t.logical+'.compliance');
   if(t.sourceMode==='voltage'){
    const min=mod.preamplifier?1e-10:1e-7;
    if(comp<min)fail('KXCI_CLAMPED_COMPLIANCE',t.logical+' minimum '+min);
    checkAbs(comp,m.current,t.logical+'.compliance');
   }else checkAbs(comp,m.voltage,t.logical+'.compliance');
   const ref=String(t.relativeTo||'GND').trim();
   if(t.sourceMode==='current'&&!['GND','GROUND','0'].includes(ref.toUpperCase()))fail('CURRENT_REFERENCE_UNSUPPORTED',t.logical);
   refs.set(t.logical,ref);
  }
  const X=terms.filter(t=>t.role==='X'),P=terms.filter(t=>t.role==='P');
  if(X.length!==1||P.length>1)fail('SWEEP_ROLE_COUNT');
  if(!terms.some(t=>t.role==='CONDITION'))fail('CONDITION_REQUIRED');
  function offset(name,seen=new Set()){
   if(seen.has(name))fail('REFERENCE_CYCLE',name);seen.add(name);
   const ref=refs.get(name);
   if(!ref||['GND','GROUND','0'].includes(ref.toUpperCase()))return 0;
   const other=byLogical.get(ref);
   if(!other)fail('REFERENCE_UNDEFINED',name+' -> '+ref);
   if(other.role!=='CONDITION')fail('DYNAMIC_REFERENCE_UNSUPPORTED',name+' -> '+ref);
   if(other.sourceMode!=='voltage')fail('CURRENT_REFERENCE_UNSUPPORTED',name+' -> '+ref);
   if(other.generator!=='Constant')fail('REFERENCE_GENERATOR_UNSUPPORTED',name+' -> '+ref);
   return parseNumber(other.bias,ref+'.bias')+offset(ref,seen);
  }
  const commandRows=[];
  const add=(phase,command,kind='write',meta={})=>{
   if(!/^[\x20-\x7E]+$/.test(command)||/[\r\n\0]/.test(command))fail('UNSAFE_KXCI_TEXT',phase);
   commandRows.push(Object.freeze({phase,kind,command,...meta}));
  };
  // Commands are whitelisted by the compiler, no user-defined command injection.
  add('session','EM 1,0');
  add('prepare',':ERROR:LAST:CLEAR');
  add('prepare','BC');
  add('channel','DE');
  const assigned=terms.slice().sort((a,b)=>channelIndex(a.resource)-channelIndex(b.resource));
  for(const t of assigned){
   const i=channelIndex(t.resource);
   add('channel',`CH${i},'V${i}','I${i}',${t.sourceMode==='voltage'?1:2},${t.role==='X'?1:t.role==='P'?2:3}`);
  }
  add('source','SS');
  for(const t of assigned){
   const i=channelIndex(t.resource),model=MODELS[inv.get(t.resource).model],max=t.sourceMode==='voltage'?model.voltage:model.current;
   if(t.role==='CONDITION'){
    if(t.generator!=='Constant')fail('CONDITION_GENERATOR_UNSUPPORTED',t.logical);
    const value=parseNumber(t.bias,t.logical+'.bias')+offset(t.logical);
    checkAbs(value,max,t.logical+'.bias');
    if(t.sourceMode==='voltage'&&Math.abs(value)>0&&Math.abs(value)<0.001)fail('KXCI_VOLTAGE_QUANTIZATION',t.logical+'.bias');
    add('source',`${t.sourceMode==='voltage'?'VC':'IC'}${i},${numeric(value,t.logical+'.bias')},${numeric(positive(t.compliance,t.logical+'.compliance'),t.logical+'.compliance')}`);
   }
   add('source',`ST ${i},1`); // Auto standby at test completion
  }
  const x=X[0],p=P[0];
  const xModel=MODELS[inv.get(x.resource).model];
  const xs=sweep(x,'X',offset(x.logical),1024,x.sourceMode==='voltage'?xModel.voltage:xModel.current);
  add('source',xs.command);
  let ps=null;
  if(p){const m=MODELS[inv.get(p.resource).model];ps=sweep(p,'P',offset(p.logical),32,p.sourceMode==='voltage'?m.voltage:m.current);add('source',ps.command);}
  const total=xs.points*(ps?.points||1);
  if(total>4096)fail('KXCI_BUFFER_LIMIT',String(total)); // System-mode buffer capacity.
  const strategy=page.strategy;
  if(strategy?.scope!=='Local Setting'||strategy?.method!=='Custom')fail('STRATEGY_UNSUPPORTED');
  if(strategy.sourceRange!=='Auto'||strategy.measureRange!=='Auto')fail('GLOBAL_RANGE_NOT_COMPILED');
  const integration=positive(strategy.integrationTime,'strategy.integrationTime');
  const plc=integration*capabilities.lineFrequencyHz;
  if(plc<0.01||plc>10)fail('INTEGRATION_PLC_LIMIT',String(plc));
  const delay=parseNumber(strategy.delayTime,'strategy.delayTime');
  if(delay<0||delay>6.553)fail('KXCI_DELAY_LIMIT',String(delay));
  add('timing',`DT ${numeric(delay,'strategy.delayTime')}`);
  add('timing',`IT4,0,0,${numeric(plc,'strategy.integrationTime')}`);
  add('measurement','SM');
  add('measurement','DM2');
  const names=selectMeasurementFunctions(page,assigned,x,p);
  add('measurement','LI '+names.map(n=>`'${n}'`).join(','));
  add('start','MD');
  add('start','ME1');
  const poll=Object.freeze({phase:'status',kind:'query',command:'SP',readyMask:1,errorMask:2,busyMask:16});
  const reads=Object.freeze(names.map(name=>Object.freeze({phase:'read',kind:'query',command:`DO '${name}'`,name})));
  // ME4 is the documented test abort. CHn off is a separate best-effort safe state.
  const stop=Object.freeze([Object.freeze({phase:'abort',kind:'write',command:'MD'}),Object.freeze({phase:'abort',kind:'write',command:'ME4'}),
   Object.freeze({phase:'disable',kind:'write',command:'DE'}),...assigned.map(t=>Object.freeze({phase:'disable',kind:'write',command:`CH${channelIndex(t.resource)}`}))]);
  return Object.freeze({
   schema:'dkts.4200a.kxci.dc-compiled.v1',compilerVersion:VERSION,manual:'4200A-KXCI-907-01E',
   action:'offline-program-only',executionAuthorized:false,
   instrumentId:capabilities.instrumentId||null,channels:Object.freeze(assigned.map(t=>Object.freeze({logical:t.logical,resource:t.resource,role:t.role}))),
   xPoints:xs.points,pPoints:ps?.points||1,totalPoints:total,
   prepare:Object.freeze(commandRows.filter(x=>x.phase!=='start')),start:Object.freeze(commandRows.filter(x=>x.phase==='start')),
   poll,read:reads,stop,metadata:Object.freeze({lineFrequencyHz:capabilities.lineFrequencyHz,
    capturedFunctions:Object.freeze(names)})
  });
 }
 return Object.freeze({VERSION,MODELS,compile,formatNumber:numeric});
});
