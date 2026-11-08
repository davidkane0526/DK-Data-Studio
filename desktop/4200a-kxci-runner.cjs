'use strict';
/* KXCI SMU DC execution state machine.
 * PREVIEW GATE: mock adapters only. This implementation cannot drive real hardware.
 * Real outputs require a separately reviewed native host / exclusive session lease.
 */
const {assemble}=require('./4200a-kxci-acquisition.cjs');
const VALID_PHASES=Object.freeze(['idle','configuring','measuring','collecting','completed','stopping','aborted','fault']);
function createRunner({transport,onState=()=>{},pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
 maxPoll=300,pollIntervalMs=50}={}){
 if(!transport||transport.kind!=='offline-mock'||typeof transport.write!=='function'||typeof transport.query!=='function')
  throw new TypeError('4200A runner is currently offline-mock only');
 if(!Number.isSafeInteger(maxPoll)||maxPoll<1||maxPoll>30000)throw new RangeError('Invalid poll ceiling');
 if(!Number.isSafeInteger(pollIntervalMs)||pollIntervalMs<0||pollIntervalMs>30000)throw new RangeError('Invalid poll interval');
 let phase='idle',active=false,abortRequested=false,abortedBy='',task=null,stopPromise=null,shutdown='not-started',lastError='';
 const notices=[];
 const signal=(stage,detail='')=>{phase=stage;const msg={phase:stage,detail:String(detail),at:new Date().toISOString()};notices.push(msg);
  try{onState(msg);}catch{};};
 const state=()=>Object.freeze({phase,active,abortRequested,shutdown,error:lastError,events:notices.slice()});
 const ensureNotStopped=()=>{if(abortRequested){const e=new Error('Measurement aborted by '+(abortedBy||'user'));e.code='ABORTED';throw e;}};
 async function cleanup(compiled,abort){
  const commands=abort?compiled.stop:compiled.stop.filter(x=>x.phase==='disable');
  const failures=[];
  for(const row of commands){
   try{await transport.write(row.command);}catch(err){failures.push(row.command+': '+String(err.message||err));}
  }
  shutdown=failures.length?'unconfirmed':'commands-sent';
  if(failures.length){lastError+=' Shutdown unconfirmed: '+failures.join(' | ');}
  return failures;
 }
 function parseStatus(reply,expected){
  const text=String(reply?.text??reply??'').trim();
  if(!/^\d{1,3}$/.test(text))throw new Error('Invalid KXCI SP status byte: '+text.slice(0,64));
  const bits=Number(text);if(bits>255)throw new Error('KXCI SP status out of range');
  if(bits & expected.errorMask)throw new Error('KXCI syntax error status');
  return (bits & expected.readyMask)!==0&&(bits & expected.busyMask)===0;
 }
 async function execute(compiled,{instrumentId,captureId,startedAt}={}){
  if(active)throw new Error('A 4200A test is already active');
  if(!compiled||compiled.schema!=='dkts.4200a.kxci.dc-compiled.v1'||compiled.executionAuthorized!==false)
   throw new TypeError('Only audited offline KXCI compilation accepted');
  if(!Array.isArray(compiled.prepare)||!Array.isArray(compiled.start)||!Array.isArray(compiled.stop))
   throw new TypeError('Malformed KXCI execution plan');
  if(!/^KEITHLEY INSTRUMENTS\s*,\s*KI4200A/i.test(instrumentId||''))
   throw new Error('Matching 4200A identification required');
  active=true;abortRequested=false;abortedBy='';lastError='';shutdown='pending';notices.length=0;
  signal('configuring');
  try{
   for(const step of compiled.prepare){ensureNotStopped();await transport.write(step.command);}
   ensureNotStopped();
   signal('measuring');
   for(const step of compiled.start){ensureNotStopped();await transport.write(step.command);}
   let ready=false;
   for(let polls=0;polls<maxPoll;polls++){
    ensureNotStopped();
    const response=await transport.query(compiled.poll.command);
    if(parseStatus(response,compiled.poll)){ready=true;break;}
    await pause(pollIntervalMs);
   }
   if(!ready)throw new Error('KXCI measurement did not complete within poll limit');
   ensureNotStopped();signal('collecting');
   const replies=[];
   for(const req of compiled.read){
    ensureNotStopped();
    const result=await transport.query(req.command);
    const bytes=Buffer.isBuffer(result?.bytes)?result.bytes:Buffer.from(String(result?.text??result),'utf8');
    replies.push({command:req.command,bytes});
   }
   const metaReplies=[];
   for(const req of compiled.metaReads||[]){
    ensureNotStopped();
    const result=await transport.query(req.command);
    const bytes=Buffer.isBuffer(result?.bytes)?result.bytes:Buffer.from(String(result?.text??result),'utf8');
    metaReplies.push({command:req.command,bytes});
   }
   ensureNotStopped();
   // Not an instrument capture. The mock fixture must never be emitted to the native-data viewer.
   const record=assemble({compiled,replies,metaReplies,instrumentId,captureId:captureId||'OFFLINE-MOCK-ONLY',
     startedAt:startedAt||new Date().toISOString()});
   record.executionContext='offline-mock';
   await cleanup(compiled,false);
   if(shutdown!=='commands-sent')throw new Error('OUTPUT_SHUTDOWN_UNCONFIRMED');
   if(record.samples.some(row=>row.status===1)){
    record.status='fault';
    lastError='KXCI compliance status C detected in native DO response';
    signal('fault',lastError);
    return Object.freeze({status:'fault',capture:Object.freeze(record),state:state()});
   }
   signal('completed');
   return Object.freeze({status:'completed',capture:Object.freeze(record),state:state()});
  }catch(err){
   const requested=err?.code==='ABORTED'||abortRequested;
   lastError=String(err.message||err);
   signal('stopping',lastError);
   await cleanup(compiled,true);
   signal(requested?'aborted':'fault',lastError);
   return Object.freeze({status:requested?'aborted':'fault',capture:null,state:state()});
  }finally{active=false;}
 }
 function run(compiled,opts){
  if(active)throw new Error('Another measurement is active');
  task=execute(compiled,opts);
  return task;
 }
 function stop(reason='user'){
  if(!active)return state();
  abortRequested=true;abortedBy=String(reason||'user');
  // The runner's next awaited step performs ME4 + channel disable. There is no
  // claim that mock-side cleanup establishes physical zero volts at the DUT.
  return state();
 }
 async function dispose(){stop('dispose');if(task)await task;}
 return Object.freeze({run,stop,state,dispose,VALID_PHASES});
}
module.exports={createRunner};
