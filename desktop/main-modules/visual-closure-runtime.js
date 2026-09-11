'use strict';

const fs=require('fs');
const path=require('path');

function createVisualClosureRuntime({app,appRoot,diagnosticsDirectory,argv=process.argv,env=process.env}){
  const enabled=argv.includes('--visual-closure')||env.DKDS_VISUAL_CLOSURE==='1';
  const diagnosticsRoot=()=>path.resolve(diagnosticsDirectory());
  const loadFileOptions=()=>enabled?{query:{dkdsAutomation:'visual-closure'}}:undefined;
  const scheduleExit=(code)=>setTimeout(()=>app.exit(code),40);

  async function complete(payload={}){
    if(!enabled)return {accepted:false,reason:'not-visual-closure-mode'};
    const reportPath=String(payload?.reportPath||'').trim();
    if(!reportPath){
      const message=String(payload?.error||'Visual Closure automation did not produce a report.');
      console.error(`[DKDS Visual Closure] FAIL: ${message}`);
      scheduleExit(1);
      return {accepted:true,verdict:{ok:false,errors:[message],notes:[]}};
    }
    const absolute=path.resolve(reportPath),root=diagnosticsRoot();
    if(absolute!==root&&!absolute.startsWith(root+path.sep)){
      const message=`Visual Closure report escaped diagnostics directory: ${absolute}`;
      console.error(`[DKDS Visual Closure] FAIL: ${message}`);
      scheduleExit(1);
      return {accepted:true,verdict:{ok:false,errors:[message],notes:[]}};
    }
    try{
      const report=JSON.parse(fs.readFileSync(absolute,'utf8'));
      const verifierPath=path.join(appRoot,'tools','quality','verify-visual-closure-report.js');
      const {verifyVisualClosureReport}=require(verifierPath);
      const verdict=verifyVisualClosureReport(report);
      console.log(`[DKDS Visual Closure] ${verdict.ok?'PASS':'FAIL'} report=${absolute}`);
      for(const note of verdict.notes||[])console.log(`[DKDS Visual Closure] NOTE: ${note}`);
      for(const error of verdict.errors||[])console.error(`[DKDS Visual Closure] ERROR: ${error}`);
      scheduleExit(verdict.ok?0:1);
      return {accepted:true,reportPath:absolute,verdict};
    }catch(err){
      const message=err?.message||String(err);
      console.error(`[DKDS Visual Closure] FAIL: ${message}`);
      scheduleExit(1);
      return {accepted:true,reportPath:absolute,verdict:{ok:false,errors:[message],notes:[]}};
    }
  }

  return Object.freeze({enabled,loadFileOptions,complete});
}

module.exports={createVisualClosureRuntime};
