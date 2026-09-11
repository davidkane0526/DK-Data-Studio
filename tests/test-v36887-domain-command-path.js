'use strict';
const assert=require('assert');
const Domain=require('../src/core/plugins/kernel/modules/commands/domain');
let rev=3;
const artifacts={artifactRevision:id=>id==='a1'?rev:0,fingerprint:id=>id==='a1'?'fp-a1':'',get:id=>id==='a1'?{id:'a1'}:id==='out1'?{id:'out1'}:null};
let row;
const runtime=Domain.createDomainCommandRuntime({artifacts:()=>artifacts,historyLimit:8,clock:(()=>{let n=100;return()=>++n;})(),resolveCommand:id=>id==='analysis.demo'?row:null});
let calls=0,captures=0;
row={id:'analysis.demo',pluginId:'builtin.demo',pluginVersion:'1.7.0',handler:async args=>{calls++;assert.strictEqual(args.threshold,2);return {artifactId:'out1'};},meta:{domainCommand:{domain:'analysis',version:'2.0.0',title:'Demo',replayable:true,captureArgs:args=>{captures++;return args;},inputSchema:{type:'object',required:['artifactId','threshold'],properties:{artifactId:{type:'string'},threshold:{type:'number'}},additionalProperties:false},inputs:args=>[args.artifactId],algorithm:()=>({category:'probe',id:'demo.fit',version:'4.2.1',provider:'builtin.algorithms@1.7.0'}),parameters:args=>({threshold:args.threshold}),outputs:result=>[result.artifactId]}}};
(async()=>{
  await assert.rejects(()=>runtime.execute(row,{artifactId:'a1',threshold:'bad'},{source:'ui'}),/threshold/);
  const result=await runtime.execute(row,{artifactId:'a1',threshold:2},{source:'ui'});assert.deepStrictEqual(result,{artifactId:'out1'});
  const record=runtime.history()[0];assert.strictEqual(record.status,'completed');assert.strictEqual(record.source,'ui');assert.strictEqual(record.command.id,'analysis.demo');assert.strictEqual(record.command.pluginVersion,'1.7.0');assert.strictEqual(record.command.version,'2.0.0');assert.strictEqual(record.inputs[0].artifactId,'a1');assert.strictEqual(record.inputs[0].artifactRevision,3);assert.strictEqual(record.inputs[0].fingerprint,'fp-a1');assert.strictEqual(record.algorithm.id,'demo.fit');assert.strictEqual(record.algorithm.version,'4.2.1');assert.strictEqual(record.algorithm.provider,'builtin.algorithms@1.7.0');assert.deepStrictEqual(record.parameters,{threshold:2});assert.strictEqual(record.outputs[0].artifactId,'out1');assert.strictEqual(record.replayable,true);
  const replay=await runtime.replay(record.executionId,{source:'recipe'});assert.deepStrictEqual(replay,{artifactId:'out1'});assert.strictEqual(calls,2);assert.strictEqual(captures,1,'replay must use recorded canonical args without re-reading mutable UI defaults');assert.strictEqual(runtime.history()[0].source,'recipe');
  rev=4;await assert.rejects(()=>runtime.replay(record.executionId,{source:'recipe'}),/revision/i);assert.strictEqual(calls,2);
  let blockedCalls=0;const blocked={id:'analysis.blocked',pluginId:'builtin.scoped',pluginVersion:'1.0.0',artifactAccess:{visible:()=>false,artifactRevision:()=>9,fingerprint:()=> 'secret'},handler:async()=>{blockedCalls++;},meta:{domainCommand:{domain:'analysis',version:'1.0.0',replayable:false,inputSchema:{type:'object',properties:{artifactId:{type:'string'}}},inputs:args=>[args.artifactId]}}};await assert.rejects(()=>runtime.execute(blocked,{artifactId:'a1'},{source:'ui'}),/not visible/i);assert.strictEqual(blockedCalls,0,'scoped command must not execute after resolving an invisible Artifact input');
  const opaque={event:{kind:'pointer'},callable(){return true;}};let rawSeen=null;const plain={id:'ui.legacy',pluginId:'builtin.demo',pluginVersion:'1.7.0',handler:payload=>{rawSeen=payload;return true;},meta:{}};const beforeHistory=runtime.history().length;await runtime.execute(plain,opaque,{source:'ui'});assert.strictEqual(rawSeen,opaque,'ordinary commands must receive their original non-serializable payload');assert.strictEqual(runtime.history().length,beforeHistory,'legacy UI commands must not retain arbitrary payloads in domain history');assert.strictEqual(runtime.describe(plain),null,'legacy UI commands must not be externally discoverable as validated domain commands');
  console.log('v3.68.87 domain command runtime PASS');
})().catch(err=>{console.error(err);process.exit(1);});

// Integration source ownership: UI/plugin registry is the one executor; Kernel/MCP only route into it.
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const sdk=JSON.parse(fs.readFileSync(path.join(root,'sdk/contract.json'),'utf8'));
assert.strictEqual(sdk.sdkVersion,'1.47.0');assert.strictEqual(sdk.minimumAppVersion,'3.68.103');
const sdkTypes=fs.readFileSync(path.join(root,'sdk/plugin-api.d.ts'),'utf8');
const sdkGuide=fs.readFileSync(path.join(root,'sdk/DOMAIN_COMMANDS.md'),'utf8');
assert(sdkTypes.includes('DKDSDomainCommandRecord')&&sdkTypes.includes('pluginVersion:string'),'SDK types must expose domain-command provenance and plugin package version.');
assert(sdkGuide.includes('commands.replay')&&sdkGuide.includes('artifactRevision'),'SDK must document revision-checked replay through the shared registry.');
for(const rel of ['src/plugins/data-center/plugin.json','src/plugins/transfer-vth-lab/plugin.json']){const manifest=JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));assert(manifest.requiresCore.includes('execution.commands'),`${manifest.id} must declare execution.commands`);}
const toolbarSource=fs.readFileSync(path.join(root,'src/core/plugins/kernel/modules/commands/toolbar.js'),'utf8');
const kernelSource=fs.readFileSync(path.join(root,'src/core/host/studio-kernel-runtime.js'),'utf8');
const mcpSource=fs.readFileSync(path.join(root,'src/core/services/mcp-runtime.js'),'utf8');
assert(toolbarSource.includes('domainCommands.execute(cmd,args'), 'Plugin/UI command execution must enter Domain Command Runtime.');
assert(kernelSource.includes("id:'commands.run'")&&kernelSource.includes('window.DKDSPlugins?.commands?.run?.'), 'Studio Kernel must route scripts/MCP to plugin command registry.');
assert(mcpSource.includes("{source:'mcp'"), 'MCP must preserve mcp source context when calling Studio Kernel.');
const dataCenter=fs.readFileSync(path.join(root,'src/plugins/data-center/command-runtime.js'),'utf8');
const vth=fs.readFileSync(path.join(root,'src/plugins/transfer-vth-lab/plugin.js'),'utf8');
assert(dataCenter.includes("domain:'data-processing'")&&dataCenter.includes("outputs:result=>result?.id"),'Data Center formula UI must use a replayable domain command with output Artifact refs.');
assert(vth.includes("domain:'analysis.threshold-voltage'")&&vth.includes("transfer.vth-constant-current")&&vth.includes("Ctrl+Enter"),'Vth must expose a real replayable analysis command through the UI interaction contract.');
const kernelCalls=[];
const context={window:{DKDSPlugins:{commands:{list:()=>[{id:'analysis.demo',domain:'analysis'}],get:id=>({id}),run:(id,payload,meta)=>{kernelCalls.push({id,payload,meta});return {ok:true};},history:()=>[{executionId:'x'}],replay:(id,meta)=>({id,meta})}},DKDSCapabilities:{}},structuredClone,console};context.window.window=context.window;vm.createContext(context.window);vm.runInContext(kernelSource,context.window,{filename:'studio-kernel-runtime.js'});
(async()=>{const out=await context.window.DKDSKernel.call('commands.run',{id:'analysis.demo',payload:{x:1}},{source:'mcp'});assert.deepStrictEqual(JSON.parse(JSON.stringify(out)),{ok:true});assert.strictEqual(kernelCalls[0].meta.source,'mcp');assert.strictEqual((await context.window.DKDSKernel.call('commands.history',{}))[0].executionId,'x');console.log('v3.68.87 unified UI/script/MCP command routing PASS');})().catch(err=>{console.error(err);process.exit(1);});
