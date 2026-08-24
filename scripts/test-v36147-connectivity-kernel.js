'use strict';
const fs=require('fs');const path=require('path');const assert=require('assert');const vm=require('vm');
const root=path.resolve(__dirname,'..');const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.version,'3.61.49','Connectivity/kernel release must be 3.61.49.');
const html=read('src/index.html'),sdkReference=read('src/core/sdk-authoring-reference.generated.js'),kernel=read('src/core/studio-kernel-runtime.js'),mcp=read('src/core/mcp-runtime.js'),agent=read('src/core/connectivity-runtime.js'),app=read('src/app.js'),main=read('main.js'),preload=read('preload.js'),web=read('src/web-bridge.js'),native=read('mobile/plugins/withDkdsAndroidNativeHost.js'),plugin=read('src/plugins/connectivity-center/plugin.js'),css=read('src/ui-modern.css'),shell=read('mobile/src/Shell.tsx');
assert(html.includes('core/sdk-authoring-reference.generated.js')&&html.indexOf('core/sdk-authoring-reference.generated.js')<html.indexOf('core/studio-kernel-runtime.js'),'Renderer must load the packaged SDK authoring reference before the shared kernel.');
assert(html.includes('core/studio-kernel-runtime.js')&&html.includes('core/connectivity-runtime.js')&&html.includes('core/mcp-runtime.js'),'Main renderer must load shared kernel, Agent and MCP runtimes.');
for(const token of ["id:'sdk.authoring.describe'","id:'sdk.authoring.read'","id:'sdk.authoring.search'","id:'core.capabilities.invoke'","id:'data.artifacts.preview'","id:'data.clean.table'","id:'data.formula.derive'","id:'transform.run.curve'","id:'workflow.run'","id:'plot.inspect'","id:'plot.render'","id:'plugin.package.install'","id:'filesystem.provider.read'","id:'smb.read'","id:'diagnostics.performance'"])assert(kernel.includes(token),`Kernel missing deep tool ${token}`);
assert(kernel.includes('AI Agent and MCP share this registry'),'Kernel registry must explicitly be shared by Agent and MCP.');
assert(app.includes('window.DKDSKernel?.configure?.')&&app.includes('artifactUpsert:kernelArtifactUpsert')&&app.includes('plotRender:kernelPlotRender'),'Owner renderer must bind real project/artifact/plot host adapters to the kernel.');
assert(mcp.includes("name:'kernel_call'")&&mcp.includes("req.method==='resources/list'")&&mcp.includes("req.method==='resources/templates/list'")&&mcp.includes("dkds://artifacts")&&mcp.includes("dkds://sdk/files")&&mcp.includes('K.call(row.kernelId'),'MCP must dynamically expose the shared kernel, SDK authoring resources and resource templates.');
assert(agent.includes("accessMode:'full'")&&agent.includes('sdk.authoring.search / sdk.authoring.read')&&agent.includes("tool_choice:'auto'")&&agent.includes("type==='tool_use'")&&agent.includes('kernel().call(row.id')&&agent.includes('plugin.package.install'),'Agent must support full-kernel iterative tool use for OpenAI-compatible and Anthropic providers.');
assert(plugin.includes('完整内核（推荐）')&&plugin.includes('运行 Agent')&&!plugin.includes('确认执行'),'Connectivity Center must expose direct full-kernel Agent operation, not legacy confirm-only UI planning.');
assert(main.includes("plugins:validateGeneratedPackage")&&main.includes("plugins:installGeneratedPackage")&&preload.includes('pluginInstallGeneratedPackage')&&web.includes('pluginInstallGeneratedPackage'),'Generated plugin packages must have direct validated desktop/mobile installation contracts.');
assert(pkg.build.files.includes('services/smb-service.js')&&pkg.build.files.includes('services/mcp-server.js'),'Packaged desktop app must include SMB and MCP host services.');
assert(native.includes('eu.agno3.jcifs:jcifs-ng:2.1.10')&&native.includes('ACTION_OPEN_DOCUMENT_TREE')&&native.includes('mcpRequest'),'Android host must include SMB3-capable client, SAF provider trees and MCP request forwarding.');
assert(css.includes('--dkui-border:rgba(166,181,202,.075)')&&shell.includes("border: 'rgba(166,181,202,0.09)'"),'Desktop/WebView and native mobile shells must use low-contrast dark structural borders.');
assert(main.includes('120000')&&native.includes('await(120,TimeUnit.SECONDS)'),'Deep MCP operations must not retain the old 15 second transport timeout.');

const sdkContext={window:{},structuredClone,console};vm.createContext(sdkContext);vm.runInContext(sdkReference,sdkContext,{filename:'sdk-authoring-reference.generated.js'});vm.runInContext(kernel,sdkContext,{filename:'studio-kernel-runtime.js'});vm.runInContext(mcp,sdkContext,{filename:'mcp-runtime.js'});
const ref=sdkContext.window.DKDSSdkAuthoringReference, K=sdkContext.window.DKDSKernel, M=sdkContext.window.DKDSMcpRuntime;
assert(ref&&ref.describe().sdkVersion==='1.17.6'&&ref.describe().pluginApiVersion==='1.17.0'&&ref.describe().fileCount>=30,'Generated SDK authoring corpus must contain the current complete SDK reference set.');
assert(ref.read('sdk/plugin-api.d.ts',{startLine:1,maxChars:4000}).content.includes('DKDS'),'SDK authoring reader must return exact packaged API type definitions.');
assert(ref.search('ScientificPlot',{limit:8}).some(row=>/plugin-api|PLUGIN_UI|PLUGIN_API|README/.test(row.path)),'SDK authoring search must find scientific plot contracts.');
assert(pkg.scripts['sdk:authoring']?.includes('generate-sdk-authoring-reference.js')&&read('mobile/scripts/sync-web-assets.js').includes('generate-sdk-authoring-reference.js'),'Desktop checks and Android web bundling must regenerate the machine-readable SDK authoring corpus.');

(async()=>{
  const desc=await K.call('sdk.authoring.describe',{});assert.equal(desc.sdkVersion,'1.17.6');
  const templates=await M.handle(JSON.stringify({jsonrpc:'2.0',id:1,method:'resources/templates/list'}),'2025-06-18');
  assert(templates.result.resourceTemplates.some(row=>row.uriTemplate==='dkds://sdk/file/{path}'),'MCP must publish SDK file resource template.');
  const sdkRead=await M.handle(JSON.stringify({jsonrpc:'2.0',id:2,method:'resources/read',params:{uri:'dkds://sdk/file/'+encodeURIComponent('sdk/contract.json')}}),'2025-06-18');
  assert(sdkRead.result.contents[0].text.includes('1.17.6'),'MCP SDK file resource must resolve into the same packaged authoring corpus.');
  console.log('v3.61.49 full-kernel AI/MCP, SMB/SAF and low-line UI contracts passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
