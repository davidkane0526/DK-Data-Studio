#!/usr/bin/env node
'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const native=read('mobile/plugins/withDkdsAndroidNativeHost.js');
const lan=read('mobile/plugins/DkdsLanKxci.template');
const bridge=read('src/web-bridge.js');
const plugin=read('src/plugins/keithley-4200/plugin.js');
const moduleStub={exports:{}};
vm.runInNewContext(native,{
  require:id=>id==='expo/config-plugins'?{}:require(id),
  module:moduleStub,__dirname:path.join(root,'mobile/plugins')
},{filename:'withDkdsAndroidNativeHost.js'});
const kotlin=moduleStub.exports.__test.kotlinSource('com.test.dkds')
  .replace('private object DkdsLocalWebServer {',lan+'\nprivate object DkdsLocalWebServer {');
assert(kotlin.includes('private object DkdsLanKxci'));
assert(kotlin.includes("trimEnd('\\r')"),'Generated Kotlin must retain escaped CR character literal.');
assert(kotlin.includes("it=='\\\\'"),'Generated Kotlin must retain escaped backslash character literal.');
assert(kotlin.includes('if(raw=="/__dkds_kxci")'),'LAN server must handle the dedicated route.');
assert(kotlin.includes('origin!="http://"+host'),'Require same-origin HTTP requests.');
assert(kotlin.includes('"x-dkds-rpc"'),'Require an explicit JSON RPC header.');
assert(kotlin.includes('if(noKey||token.isEmpty()||!tokens.contains(token))'),
  'Unpaired or no-key browsers may not access the instrument.');
assert(kotlin.includes('HttpOnly; SameSite=Strict'),'Protect pair cookie against cross-origin access.');
assert(kotlin.includes('if(size !in 2..4096)'),'Bound untrusted request bodies.');
assert(kotlin.includes('fun closeAll()'),'Session must have a native emergency cleanup path.');
assert(kotlin.includes('DkdsLanKxci.closeAll();lastError=""'),'Stop the LAN service and disconnect instrument.');
assert(kotlin.includes('DkdsLanKxci.closeAll();return status(context)'),'Key rotation must revoke instrument control.');
assert(lan.includes('bytes.contentEquals(byteArrayOf(42,73,68,78,63,0))'),
  'Only KXCI *IDN? + NUL is allowed remotely.');
assert(lan.includes('row.owner!=owner'),'Instrument sessions must belong to the pairing owner.');
assert(lan.includes('if(mode!="auto"&&network==null)'),'Missing requested Android transport must fail closed.');
assert(lan.includes('if(current!=null && current?.owner!=owner)'),'Only one paired controller at a time.');
assert(lan.includes('if(output.size()==0)throw'),'Read timeout must fail closed before a first byte.');
assert(bridge.includes("fetch('/__dkds_kxci'"),'Plain browser bridge must forward via LAN gateway.');
assert(bridge.includes("lanKxciCall('open'")&&bridge.includes("lanKxciCall('exchange'")&&bridge.includes("lanKxciCall('close'"),
  'Open, exchange and close must route through native LAN gateway.');
assert(bridge.includes("credentials:'same-origin'")&&bridge.includes("redirect:'error'"),'Browser must not leak pairing sessions to other origins.');
assert(plugin.includes("encodeBase64('*IDN?\\0')"),'The 4200A plugin must send NUL-terminated *IDN? only.');
assert(!/forcev|forcei|measi|measv|output\s*on/i.test(plugin),'Instrument output commands remain unavailable.');
console.log('Keithley 4200 authenticated LAN gateway and identity-only safety contract PASS');
