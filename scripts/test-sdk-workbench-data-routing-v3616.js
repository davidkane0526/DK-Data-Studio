'use strict';
const fs=require('fs');
const path=require('path');
const assert=(value,message)=>{if(!value)throw new Error(message);};
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const kernel=read('src/core/plugin-kernel.js');
const contract=read('src/core/plugin-contract-runtime.js');
const ui=read('src/core/ui-infrastructure.js');
const app=read('src/app.js');
const dataModel=read('src/core/data-model.js');
const dataCenter=read('src/plugins/data-center/feature-runtime.js');
const resonance=read('src/plugins/resonance-workbench/feature-runtime.js');
const resonanceManifest=JSON.parse(read('src/plugins/resonance-workbench/plugin.json'));
const pulseManifest=JSON.parse(read('src/plugins/pulse-analysis/plugin.json'));
const pulsePlugin=read('src/plugins/pulse-analysis/plugin.js');
const pulseService=read('src/plugins/pulse-analysis/analysis-service.js');
const pulseImporter=read('src/plugins/pulse-import/plugin.js');
const flexibleImporter=read('src/plugins/flexible-import/plugin.js');
const schema=JSON.parse(read('sdk/plugin-manifest.schema.json'));
const sdk=read('sdk/plugin-api.d.ts');

assert(pkg.version==='3.61.22','Application version must be v3.61.18.');
assert(kernel.includes("const API_VERSION = '1.15.0'"),'Plugin Kernel must publish Plugin API 1.14.');
assert(kernel.includes('const DEFAULT_PLUGIN_ICONS=Object.freeze')&&kernel.includes("workbench:'◇'"),'Core must guarantee category default icons when a plugin omits icon metadata.');
assert(kernel.includes("const standaloneWorkbench=pluginTypeForManifest(manifest)==='workbench'")&&kernel.includes("spec.presentation!=='toolbar'"),'A standalone workbench page must default to a primary activity rather than a contextual toolbar contribution.');
assert(kernel.includes('if (standaloneWorkbench)')&&kernel.includes('primary:true'),'Standalone workbench page registration must create a primary activity.');

assert(ui.includes("document.createElementNS('http://www.w3.org/2000/svg','svg')")&&ui.includes('this.ownsTarget=true'),'ScientificCurveSurface must accept a normal container and let Core own its internal SVG.');
assert(!ui.includes("requestRender('await-layout')"),'A hidden/unlaid-out scientific surface must not spin a private frame retry loop.');
assert(ui.includes('bind(target,spec={})')&&ui.includes("context:'contextmenu'"),'Interaction Behavior must provide generic DOM delegation including context gestures.');
assert(ui.includes("'science.transport.iv'")&&ui.includes("'science.pulse.trace'"),'Core Data Type Registry must know the shared imported transport and pulse semantic types.');

assert(contract.includes("'data.importers':api=>!!api?.data?.importers")&&contract.includes("'data.import-workbench':api=>!!api?.data?.importWorkbench"),'Plugin Contract must validate shared importer and Import Workbench requirements.');
assert(kernel.includes('consumer:pluginId'),'Workbench data-source reads must be automatically scoped by plugin ID.');
assert(kernel.includes("if(prop==='setAssignments')return undefined"),'A workbench scoped source capability must not mutate global source assignments.');
assert(kernel.includes("if(prop==='detach')return ref=>"),'A workbench may detach a source from itself without deleting the global source.');
assert(kernel.includes('const raw=artifact?.metadata?.dataAssignments')&&kernel.includes("rows.includes('*')||rows.includes(pluginId)"),'Workbench artifact reads must obey the same assignment scope as source descriptors.');
assert(kernel.includes('sources:Object.freeze')&&kernel.includes('sourceCapability()?.list'),'Plugin API must expose scoped ctx.data.sources.');
assert(kernel.includes('importWorkbench:Object.freeze')&&kernel.includes('host?.openImportWorkbench'),'Plugin API must expose the centralized Import Workbench instead of requiring plugin-owned file dialogs.');

assert(app.includes('function dataConsumerTargets()')&&app.includes('function activeDataConsumerId()'),'Import Workbench must discover workbench usage targets and default to the active workbench.');
assert(app.includes('function chooseImportProvider(')&&app.includes('preferredConsumers')&&app.includes('outputTypes'),'Import Workbench must route files through registered importer providers using consumer/type compatibility.');
assert(app.includes('provider.parseArtifacts?.(file,item.settings)')&&app.includes('importedSource:true'),'Import Workbench must support typed artifact-producing importer providers.');
assert(app.includes("const assignmentsFor=value=>")&&app.includes("return rows.includes('*')||rows.includes(id)"),'Host data sources must implement wildcard-compatible assignment filtering.');
assert(app.includes('assignmentUnion=(previous=[])')&&app.includes('priorArtifactAssignments(item.path,provider.id)'),'Re-import must merge prior assignments per source/importer instead of revoking another workbench or merging unrelated files.');
assert(app.includes('if(row?.artifactId)return null'),'Generic artifact source references must not accidentally resolve to a legacy dataset with the same source path.');
const html=read('src/index.html');
assert(html.includes('id="importTargetOptions"')&&html.includes('数据用途'),'Global Import Workbench must expose centralized multi-workbench data assignment.');
assert(html.includes('id="importProvider"'),'Global Import Workbench must expose the selected importer without letting workbenches own parser UI.');
assert(dataModel.includes("['*']")&&dataModel.includes('dataAssignments'),'Legacy project datasets must retain wildcard visibility when assignment metadata is absent.');
assert(dataModel.includes("semanticType:'science.transport.iv'"),'Legacy flexible I–V datasets must project into the typed shared artifact catalog.');

assert(dataCenter.includes('const sourceCapability=ctx.data.sources'),'Data Center must consume the public data.sources API rather than a private capability name.');
assert(dataCenter.includes('dcAssignmentFilter')&&dataCenter.includes('assignmentActionItems'),'Data Center must provide one canonical source catalog with usage filtering/reassignment.');
assert(dataCenter.includes('importedSource===true'),'Data Center must treat generic importer-produced source artifacts as first-class source entries.');
assert(dataCenter.includes("artifactContextBehavior?.bind?.($('#dcArtifactList')"),'Data Center right-click must use Interaction Behavior DOM delegation.');
assert(!dataCenter.includes("addEventListener('contextmenu'")&&!dataCenter.includes('.oncontextmenu'),'Data Center must not own raw contextmenu listeners.');
assert(!resonance.includes("addEventListener('contextmenu'")&&!resonance.includes('.oncontextmenu'),'Resonance dataset list must not own raw contextmenu listeners.');
assert(resonance.includes('assignedToResonance')&&resonance.includes(".filter(assignedToResonance)"),'Any legacy Resonance fallback must remain assignment-scoped so Vth/Pulse-only datasets cannot leak into the Resonance list.');

assert(Array.isArray(resonanceManifest.data?.accepts)&&resonanceManifest.data.accepts.includes('science.transport.iv'),'Resonance workbench must declare the imported data type it consumes.');
assert(Array.isArray(pulseManifest.data?.accepts)&&pulseManifest.data.accepts.includes('science.pulse.trace'),'Pulse workbench must declare the imported data type it consumes.');
assert(pulseManifest.requiresCore.includes('data.sources')&&!pulseManifest.requiresCore.includes('data.import-workbench'),'Pulse workbench must depend on scoped sources while its visible import action is Core-owned.');
assert(pulseImporter.includes("ctx.data.importers.register('pulse-text'")&&pulseImporter.includes("outputTypes:['science.pulse.trace']"),'Pulse text parsing must be a standalone typed Importer Provider.');
assert(pulseImporter.includes('parseArtifacts(file,options={})')&&pulseImporter.includes("semanticType:'science.pulse.trace'"),'Pulse Importer Provider must produce a shared typed DataTable artifact.');
assert(flexibleImporter.includes("storage:'legacy-datasets'")&&flexibleImporter.includes("outputTypes:['science.transport.iv']"),'Flexible I–V importer must advertise its shared transport type while keeping legacy storage compatibility.');
assert(!pulsePlugin.includes('openDataFiles')&&!pulseService.includes('openDataFiles'),'Pulse workbench/service must not own a private file picker.');
assert(!pulsePlugin.includes('ctx.data.importWorkbench')&&!pulseService.includes('openImportWorkbench'),'Pulse workbench must not own a duplicate import action; Core routes import from manifest data.accepts.');
assert(pulseService.includes('function refreshSources')&&pulseService.includes("science.pulse.trace"),'Pulse workbench must refresh from its scoped typed artifacts.');
assert(pulseService.includes('artifactId:String(artifact.id)')&&pulseService.includes('artifactId:item.artifactId'),'Pulse project slice must reference central source artifacts instead of serializing a second private copy.');
assert(pulsePlugin.includes('ctx.data.sources?.detach?.(ref)'),'Removing data from Pulse must detach its assignment rather than delete the shared source.');

assert(schema.properties.apiVersion.enum.includes('1.15.0'),'SDK manifest schema must accept Plugin API 1.14.');
assert(schema.properties.icon?.type==='string','SDK manifest must document the optional plugin icon override.');
assert(schema.properties.requiresCore.items.enum.includes('data.sources')&&schema.properties.requiresCore.items.enum.includes('data.importers')&&schema.properties.requiresCore.items.enum.includes('data.import-workbench'),'SDK manifest must expose shared source/importer/import-workbench requirements.');
assert(schema.properties.data?.properties?.accepts,'SDK manifest must let workbenches declare accepted semantic data types.');
assert(sdk.includes("readonly apiVersion:'1.15.0'")&&sdk.includes('DKDSDataSourcesCapability'),'Editor SDK declarations must expose Plugin API 1.14 scoped source contracts.');
assert(sdk.includes('importWorkbench:DKDSDataImportWorkbench')&&sdk.includes('DKDSDataImporterSpec'),'SDK declarations must expose centralized importing and importer provider contracts.');
assert(sdk.includes("presentation?:'activity'|'toolbar'"),'SDK page contract must expose explicit activity-vs-toolbar placement override.');
assert(sdk.includes('bind(target:any,spec?:DKDSInteractionBehaviorBindSpec)'),'SDK Interaction Behavior must expose generic DOM delegation.');

console.log('v3.61.12 workbench placement, default icon, Core-owned plot surface, typed importer routing, scoped source catalog and shared Pulse import checks passed.');
