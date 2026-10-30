#!/usr/bin/env node
'use strict';
const {spawnSync}=require('child_process');
const path=require('path');
const manifest=require('./manifest');
const suiteName=String(process.argv[2]||'test');
const filter=String(process.argv[3]||'').trim().toLowerCase();
const suite=manifest[suiteName];
if(!Array.isArray(suite)){
  console.error(`Unknown test suite: ${suiteName}`);
  process.exit(2);
}
const rows=filter?suite.filter(row=>String(row.file).toLowerCase().includes(filter)):suite;
const collectFailures=process.env.DKDS_TESTS_COLLECT_FAILURES==='1';
const failures=[];
console.log(`[DKDS tests] suite=${suiteName} cases=${rows.length}${filter?` filter=${filter}`:''}`);
for(let i=0;i<rows.length;i+=1){
  const row=rows[i];
  const rel=String(row.file||'');
  const file=path.resolve(__dirname,'..',rel);
  console.log(`[DKDS tests] ${i+1}/${rows.length} ${rel}`);
  const result=spawnSync(process.execPath,[file,...(row.args||[])],{cwd:path.resolve(__dirname,'..'),stdio:'inherit',env:process.env});
  if(result.error){
    console.error(result.error);
    if(!collectFailures)process.exit(1);
    failures.push({file:rel,error:result.error.message});
    continue;
  }
  if(result.status!==0){
    if(!collectFailures)process.exit(result.status||1);
    failures.push({file:rel,exitCode:result.status||1});
  }
}
if(failures.length){
  console.error(`[DKDS tests] ${suiteName} FAILED (${failures.length}/${rows.length})`);
  for(const row of failures)console.error(`[DKDS tests] FAIL ${row.file}: ${row.error||'exit '+row.exitCode}`);
  process.exitCode=1;
}else console.log(`[DKDS tests] ${suiteName} PASS (${rows.length})`);
