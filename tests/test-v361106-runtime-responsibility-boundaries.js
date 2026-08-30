'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const shell=read('src/core/plugins/kernel/modules/activity/shell.js');
const uiContrib=read('src/core/plugins/kernel/modules/contributions/ui.js');
const packageRuntime=read('src/core/plugins/kernel/modules/package-runtime.js');
const presenters=read('src/core/ui/modules/presentation/presenters.js');
assert(!shell.includes('pluginTypeForManifest(')&&!shell.includes('pluginTypeOf('),'Core Activity shell must not validate or classify plugin types during platform rendering.');
assert(packageRuntime.includes('pluginType:pluginTypeForManifest'),'Activity Registry must expose already-validated plugin type metadata at the registry boundary.');
assert(presenters.includes("workspace.pluginType==='tool'"),'Desktop Presenter must consume registry plugin type metadata without re-validating plugin manifests.');
assert(!uiContrib.includes('pluginTypeForManifest('),'Core contribution routing must not perform strict manifest validation during UI consumption.');
assert(uiContrib.includes("pluginTypeOf(definition.manifest)==='tool'"),'Tool/export contribution routing must consume the already-validated plugin type.');

const manifestRuntime=read('src/core/plugins/kernel/modules/manifest.js');
assert(manifestRuntime.includes('function requirePluginType')&&manifestRuntime.includes("Plugin ${manifest?.id||'(unknown)'} must declare pluginType."),'Real plugin manifests must remain strict at the manifest boundary.');
for(const id of ['resonance-workbench','ter-analysis','pulse-analysis','transfer-vth-lab']){
  const manifest=JSON.parse(read(`src/plugins/${id}/plugin.json`));
  assert.strictEqual(manifest.pluginType,'workbench',`${manifest.id||id} must explicitly own its workbench type.`);
}

const smoke=read('src/diagnostics/automation-smoke-cases.js');
const runner=read('src/diagnostics/automation-test-runtime.js');
assert(runner.includes("'plugin.resonance-contract','Resonance Workbench integration contract','Plugins / Resonance'"),'Resonance integration diagnostics must be plugin-scoped.');
assert(runner.includes("'plugin.ter-contract','TER Analysis integration contract','Plugins / TER'"),'TER integration diagnostics must be plugin-scoped.');
assert(runner.includes("'types.contract','Scientific Data Contracts foundation','Data Contract / Foundation'"),'Canonical scientific types must be attributed to the foundation contract plugin.');
assert(!smoke.includes('TER did not receive Core transform Pipeline stages.')&&!smoke.includes('Resonance did not receive Core transform Pipeline stages.'),'Diagnostics must not label plugin-owned Pipeline stages as Core-owned.');
assert(smoke.includes("owner:'builtin.standard-transport-algorithms'"),'Transport Registry diagnostics must identify the algorithm provider owner.');
assert(smoke.includes("owner:'core.scientific-plot'"),'Shared scalar-field rendering diagnostics must identify the Core renderer owner.');
assert(runner.includes("responsibility:'core.theme'"),'Theme coverage failures must carry an explicit Core Theme responsibility marker.');
assert(smoke.includes("responsibility:'activation-boundary'"),'Plugin activation failures must preserve activation-boundary details instead of collapsing unrelated plugin failures.');
assert(runner.includes('externalPluginPackageSmoke}=smokeCases')&&runner.includes("'plugins.external-packages','External plugin package conflicts','Plugins / External'")&&smoke.includes("responsibility:'external-plugin-package'"),'External package conflicts must be wired and reported separately from Core/plugin runtime activation failures.');

console.log('v3.61.106 responsibility boundaries PASS: Core host failures, foundation contracts, algorithm providers and workbench integrations are diagnosed separately.');
