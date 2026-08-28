#!/usr/bin/env node
'use strict';
const {spawnSync}=require('child_process');
const path=require('path');
const manifest=require('./manifest');
const {validate:validateHardVisualInvariants}=require('../tools/quality/visual-invariants');

try{validateHardVisualInvariants();console.log('[DKDS tests] hard visual invariants PASS');}catch(err){console.error(err.message||err);process.exit(1);}

const suiteName=String(process.argv[2]||'test');
const filter=String(process.argv[3]||'').trim().toLowerCase();
const suite=manifest[suiteName];
if(!Array.isArray(suite)){
  console.error(`Unknown test suite: ${suiteName}`);
  process.exit(2);
}
const rows=filter?suite.filter(row=>String(row.file).toLowerCase().includes(filter)):suite;
console.log(`[DKDS tests] suite=${suiteName} cases=${rows.length}${filter?` filter=${filter}`:''}`);
for(let i=0;i<rows.length;i+=1){
  const row=rows[i];
  const rel=String(row.file||'');
  const file=path.resolve(__dirname,'..',rel);
  console.log(`[DKDS tests] ${i+1}/${rows.length} ${rel}`);
  const result=spawnSync(process.execPath,[file,...(row.args||[])],{cwd:path.resolve(__dirname,'..'),stdio:'inherit',env:process.env});
  if(result.error){
    console.error(result.error);
    process.exit(1);
  }
  if(result.status!==0)process.exit(result.status||1);
}
console.log(`[DKDS tests] ${suiteName} PASS (${rows.length})`);
