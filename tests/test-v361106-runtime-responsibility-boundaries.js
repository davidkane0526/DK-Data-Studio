'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const shell=read('src/core/plugins/kernel/modules/activity/shell.js');
const uiContrib=read('src/core/plugins/kernel/modules/contributions/ui.js');
assert(!shell.includes("pluginTypeForManifest(definition?.manifest||{})"),'Core shell must not feed ownerless/Core contributions into strict plugin manifest validation.');
const guarded=(shell.match(/!!definition&&pluginTypeForManifest\(definition\.manifest\)==='tool'/g)||[]).length;
assert(guarded>=2,'Activity and Tools navigation must guard non-plugin owners before reading pluginType.');
assert(!uiContrib.includes("pluginTypeForManifest(definition?.manifest||{})"),'Core contribution routing must not feed missing plugin definitions into strict pluginType validation.');
assert(uiContrib.includes("definition&&pluginTypeForManifest(definition.manifest)==='tool'"),'Tool/export contribution routing must explicitly guard missing plugin definitions.');

const lifecycle=read('src/core/plugins/kernel/modules/lifecycle.js');
assert(lifecycle.includes("if(!declared)throw new Error(`Plugin ${manifest?.id||'(unknown)'} must declare pluginType.`)"),'Real plugin manifests must remain strict; the Core shell fix must not restore type inference.');
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
