#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const modules=new Map();
const sandbox={window:{DKDSPluginModules:{define:(id,key,value)=>{
  assert.equal(id,'com.dkds.keithley-4200');modules.set(key,value);
}}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/plugins/keithley-4200/kxci-protocol.js'),'utf8'),sandbox);
const protocol=modules.get('kxci-protocol');
assert(protocol);
assert.deepEqual([...Buffer.from(protocol.IDN_REQUEST,'utf8')],[42,73,68,78,63,0]);
const identity=protocol.parseIdentity('KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14\\0','1498377');
assert.equal(identity.serial,'1498377');
assert.equal(identity.model,'KI4200A');
assert.throws(()=>protocol.parseIdentity('ACME,OTHER,1,V1'),/仪器身份不匹配/);
assert.throws(()=>protocol.parseIdentity('KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14','999'),/序列号不匹配/);
assert(Object.isFrozen(identity));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/plugins/keithley-4200/plugin.json'),'utf8'));
assert.deepEqual(manifest.scripts,['measurement-model.js','kxci-protocol.js','unit-presentation.js','plugin.js']);
console.log('4200 extracted KXCI protocol, exact NUL terminator and manifest contract PASS');
