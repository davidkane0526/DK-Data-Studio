'use strict';
const assert=require('node:assert/strict');
const {compile}=require('../src/4200a-fspro/domain/kxci-dc-compiler');
const {createRunner}=require('../desktop/4200a-kxci-runner.cjs');
const caps={schema:'dkts.4200a.module-capabilities.v1',
 instrumentId:'KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14',lineFrequencyHz:50,
 readyForCompiler:true,smus:[1,2].map(n=>({resource:'SMU'+n,model:'4200-SMU',modelVerified:true,preamplifier:false}))};
const page={schema:'dkts.fspro.page.v1',info:{testType:'DC'},
 strategy:{scope:'Local Setting',method:'Custom',integrationTime:'0.02',delayTime:'0.04',sourceRange:'Auto',measureRange:'Auto'},
 terminals:[{logical:'S',resource:'SMU1',role:'CONDITION',sourceMode:'voltage',
 relativeTo:'GND',generator:'Constant',bias:'0',compliance:'0.001',measureRange:{mode:'auto'}},
 {logical:'D',resource:'SMU2',role:'X',sourceMode:'voltage',
 relativeTo:'S',generator:'Linear Step',start:'0',stop:'0.2',step:'0.1',compliance:'0.001',measureRange:{mode:'auto'}}]};
const plan=compile(page,{capabilities:caps});
const id='KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14';
(async()=>{
 const commands=[];
 const successAdapter={
  kind:'offline-mock',
  async write(command){commands.push(command);},
  async query(command){commands.push(command);if(command==='SP')return '1';return {bytes:Buffer.from('N+1.234E-8,N+1.235E-8,N+1.236E-8\0')};}
 };
 const runner=createRunner({transport:successAdapter,pollIntervalMs:0});
 const result=await runner.run(plan,{instrumentId:id,captureId:'OFFLINE-MOCK-ONLY'});
 assert.equal(result.status,'completed',result.state.error);
 assert.equal(result.capture.executionContext,'offline-mock');
 assert.equal(result.capture.samples.length,3);
 assert.equal(result.capture.rawFrames.length,4);
 assert.deepEqual(commands.slice(-3),['DE','CH1','CH2'],'finished measurement disables assigned channels');
 assert.equal(result.state.shutdown,'commands-sent');
 assert.ok(commands.includes('MD')&&commands.includes('ME1'),'real KXCI commands emitted to mock only');
 const blocked=()=>createRunner({transport:{kind:'socket',write:async()=>{},query:async()=>{}}});
 assert.throws(blocked,/offline-mock/);
 await assert.rejects(()=>runner.run({schema:'untrusted'},{}),/audited offline/);
 let cancelCount=0;const stopped=[];
 const abortAdapter={
  kind:'offline-mock',async write(s){stopped.push(s);},
  async query(s){stopped.push(s);return s==='SP'?'0':{bytes:Buffer.from('1,2,3')};}
 };
 const stopping=createRunner({transport:abortAdapter,maxPoll:100,pollIntervalMs:0,
  pause:async()=>{if(++cancelCount===1)stopping.stop();}});
 const aborted=await stopping.run(plan,{instrumentId:id});
 assert.equal(aborted.status,'aborted');
 assert.equal(aborted.capture,null);
 assert.deepEqual(stopped.slice(-4),['ME4','DE','CH1','CH2']);
 assert.ok(stopped.includes('ME4')&&stopped.indexOf('ME4')>stopped.indexOf('ME1'));
 assert.ok(stopped.includes('CH1')&&stopped.includes('CH2'));
 const faultLog=[];
 const faultAdapter={kind:'offline-mock',
   async write(s){faultLog.push(s);},
   async query(s){faultLog.push(s);return s==='SP'?'2':{bytes:Buffer.from('1,2,3')};}};
 const failing=createRunner({transport:faultAdapter,maxPoll:1,pollIntervalMs:0});
 const fault=await failing.run(plan,{instrumentId:id});
 assert.equal(fault.status,'fault');
 assert.ok(fault.state.error.includes('syntax error'));
 assert.ok(faultLog.includes('ME4'));
 const comp={kind:'offline-mock',async write(s){},async query(s){
  return s==='SP'?'1':{bytes:Buffer.from('N+1.234E-8,C+1.235E-8,N+1.236E-8\0')};
 }};
 const compliance=createRunner({transport:comp,pollIntervalMs:0});
 const reached=await compliance.run(plan,{instrumentId:id,captureId:'OFFLINE-MOCK-COMPLIANCE'});
 assert.equal(reached.status,'fault','compliance must not be reported as successful completion');
 assert.equal(reached.capture?.status,'fault','compliance data retained with explicit fault state');
 assert.equal(reached.capture?.samples[1].status,1);
 const badShutdown={kind:'offline-mock',
  async write(s){if(s==='CH1')throw new Error('cannot disable channel');},
  async query(s){return s==='SP'?'1':{bytes:Buffer.from('N+1.234E-8,N+1.235E-8,N+1.236E-8\0')};}};
 const shutdown=createRunner({transport:badShutdown,pollIntervalMs:0});
 const failedShutdown=await shutdown.run(plan,{instrumentId:id,captureId:'OFFLINE-MOCK-SHUTDOWN-FAIL'});
 assert.equal(failedShutdown.status,'fault','uncertain source state must never be success');
 assert.equal(failedShutdown.state.shutdown,'unconfirmed');
 let rejectBlocked=null,enteredPoll=false;
 const preemptionEvents=[];
 const stalledAdapter={
  kind:'offline-mock',
  async write(command){preemptionEvents.push(command);},
  query(command){
   if(command==='SP'){
    enteredPoll=true;
    return new Promise((resolve,reject)=>{rejectBlocked=reject;});
   }
   return Promise.resolve({bytes:Buffer.from('N+1,N+2,N+3')});
  },
  cancelPendingRead(){if(rejectBlocked){rejectBlocked(new Error('pending SP read canceled'));rejectBlocked=null;}}
 };
 const pendingRunner=createRunner({transport:stalledAdapter,maxPoll:100,pollIntervalMs:0});
 const interrupted=pendingRunner.run(plan,{instrumentId:id,captureId:'OFFLINE-STOP-PREEMPTION'});
 for(let i=0;i<20&&!enteredPoll;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(enteredPoll,true,'mock source must reach blocking SP query');
 assert.equal(pendingRunner.stop('user').stopPreemption,'supported');
 const interruptedResult=await Promise.race([interrupted,new Promise((_,reject)=>setTimeout(()=>reject(new Error('STOP_TIMEOUT')),1000))]);
 assert.equal(interruptedResult.status,'aborted');
 assert.deepEqual(preemptionEvents.slice(-4),['ME4','DE','CH1','CH2']);
 assert.equal(interruptedResult.state.sourceSafeVerified,false,'mock cleanup does not prove DUT safe state');
 console.log('4200A offline execution state machine: complete, user abort, syntax fault and hardware-command gate verified');
})().catch(err=>{console.error(err);process.exitCode=1;});
