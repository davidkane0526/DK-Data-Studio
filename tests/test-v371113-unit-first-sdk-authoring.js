'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const cp=require('child_process');
const assert=require('assert');
const pkg=require('../package.json');
const audit=require('../tools/quality/unit-sdk-authoring-audit');
const root=path.resolve(__dirname,'..');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.71.113'),'v3.71.113+ source required.');
const report=audit.audit();
assert.strictEqual(report.ok,true,audit.format(report));
assert.strictEqual(report.targets,4);
assert.strictEqual(report.unitCount,41,'3.71.113 must not add a 42nd Unit.');
assert.strictEqual(report.unitTemplateVersion,'2.5.38','Unit Templates remain frozen while authoring defaults move to Units.');
assert(atLeast(report.sdkVersion,'1.51.44'),'SDK authoring contract must remain at or above 1.51.44.');
const cli=path.join(root,'sdk','tools','dkds-plugin.js');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-unit-first-sdk-'));
try{
  for(const name of ['workspace-plugin','top-workspace-plugin','tool-plugin']){
    const dir=path.join(root,'sdk','templates',name);
    cp.execFileSync(process.execPath,[cli,'validate',dir],{cwd:root,stdio:'pipe'});
    cp.execFileSync(process.execPath,[cli,'package',dir,path.join(tmp,`${name}.dkplugin`)],{cwd:root,stdio:'pipe'});
  }
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
console.log('v3.71.113 Unit-first SDK authoring closure PASS: 4 official entry points / 41 Units / no private template CSS or raw workspace composition.');
