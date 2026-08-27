'use strict';

const fs=require('fs');
const path=require('path');
const PACKAGED_TRIAL_DAYS=30;
const PACKAGED_EXPIRY_MAX_TIMER_MS=12*60*60*1000;

function createPackagedExpiryRuntime({app,appRoot,exit=()=>process.exit(0)}){
  function readPackagedBuildInfo(){
    const infoPath=path.join(appRoot,'build-info.json');
    try{
      const info=JSON.parse(fs.readFileSync(infoPath,'utf8'));
      if(info?.buildType!=='packaged-trial'||Number(info?.durationDays)!==PACKAGED_TRIAL_DAYS||!Number.isFinite(Number(info?.builtAtMs))||!Number.isFinite(Number(info?.expiresAtMs))||Number(info.expiresAtMs)<=Number(info.builtAtMs))return null;
      return info;
    }catch{return null;}
  }
  function packagedBuildIsExpired(info,nowMs=Date.now()){return !info||nowMs>=Number(info.expiresAtMs);}
  function enforcePackagedExpiry(){
    if(!app.isPackaged)return;
    const info=readPackagedBuildInfo();
    if(packagedBuildIsExpired(info)){exit();return;}
    const scheduleNextExpiryCheck=()=>{
      const remainingMs=Number(info.expiresAtMs)-Date.now();
      if(remainingMs<=0){exit();return;}
      const delayMs=Math.min(remainingMs,PACKAGED_EXPIRY_MAX_TIMER_MS);
      const timer=setTimeout(scheduleNextExpiryCheck,delayMs);
      if(typeof timer.unref==='function')timer.unref();
    };
    scheduleNextExpiryCheck();
  }
  return Object.freeze({readPackagedBuildInfo,packagedBuildIsExpired,enforcePackagedExpiry});
}

module.exports={PACKAGED_TRIAL_DAYS,PACKAGED_EXPIRY_MAX_TIMER_MS,createPackagedExpiryRuntime};
