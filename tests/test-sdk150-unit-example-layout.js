'use strict';
const assert=require('assert');
const {spawnSync}=require('child_process');
const example='examples/sdk150-unit-composition';
for(const command of ['test-runtime','test-layout']){
  const result=spawnSync(process.execPath,['sdk/tools/dkds-plugin.js',command,example],{encoding:'utf8',timeout:120000});
  assert.strictEqual(result.status,0,`${command} failed\n${result.stdout||''}\n${result.stderr||''}`);
}
console.log('SDK 1.50 unit-composition example runtime/layout PASS');
