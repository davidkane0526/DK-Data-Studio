#!/usr/bin/env node
'use strict';
// Stable application version + deterministic per-commit hot-update identity.
// Every platform workflow derives the same aNNNN ID from the checked-out commit.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const appVersion=String(require(path.join(root,'package.json')).version||'');
if(!/^\d+\.\d+\.\d+$/.test(appVersion))throw Error('Invalid DKDS application version: '+appVersion);
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const expected=String(process.env.GITHUB_SHA||'').trim();
if(expected&&head!==expected)throw Error('Checked-out commit does not match GITHUB_SHA: '+head+' != '+expected);
const countText=execFileSync('git',['rev-list','--count',head],{cwd:root,encoding:'utf8'}).trim();
const count=Number(countText);
if(!Number.isSafeInteger(count)||count<1)throw Error('Unable to resolve a positive commit sequence for the hot-update identity.');
const buildId='a'+String(count).padStart(4,'0');
const identity={appVersion,buildId,commit:head,label:'v'+appVersion+' '+buildId};
if(process.argv.includes('--print')){process.stdout.write(JSON.stringify(identity));process.exit(0);}
if(process.env.GITHUB_ENV){
  fs.appendFileSync(process.env.GITHUB_ENV,
    'DKDS_RELEASE_VERSION='+appVersion+'\n'+
    'DKDS_HOT_BUILD_ID='+buildId+'\n'+
    'DKDS_BUILD_LABEL='+identity.label+'\n');
}
if(process.env.GITHUB_STEP_SUMMARY){
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '## DK Data Studio '+identity.label+'\n\n'+
    '- Application version: `V'+appVersion+'`\n'+
    '- Hot-update build: `'+buildId+'`\n'+
    '- Commit: `'+head+'`\n');
}
console.log('DKDS release identity: '+identity.label+' ('+head+')');
module.exports=identity;
