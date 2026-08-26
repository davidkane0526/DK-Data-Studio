'use strict';
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const outPath=path.join(root,'build-info.json');
const builtAtMs=Date.now();
const durationDays=30;
const info={
  schema:1,
  buildType:'packaged-trial',
  durationDays,
  builtAtMs,
  expiresAtMs:builtAtMs+durationDays*24*60*60*1000
};
info.builtAt=new Date(info.builtAtMs).toISOString();
info.expiresAt=new Date(info.expiresAtMs).toISOString();
fs.writeFileSync(outPath,JSON.stringify(info,null,2)+'\n','utf8');
console.log(`Build preparation complete: ${durationDays}-day packaged metadata ${info.builtAt} -> ${info.expiresAt}.`);
