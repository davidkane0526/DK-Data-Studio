'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json');
const dts=read('sdk/plugin-api.d.ts');
const contract=read('src/core/contracts/presentation.js');
const model=read('src/core/ui/modules/presentation/model.js');
const top=read('src/core/plugins/kernel/modules/workspace/top.js');
const host=read('src/core/ui/modules/host/api.js');
const workspace=read('src/core/ui/modules/workbench/plugin.js');
const docs=read('docs/PLATFORM_PRESENTATION_FINAL_FREEZE_AUDIT_3.67.6.md');

{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=6))),'Platform Presentation Final Freeze Audit requires v3.67.6+.');}
for(const role of ['scientific-primary','data-primary','utility-primary','data-control','inspector','scientific-secondary'])assert(contract.includes(role),`shared Presentation contract must define ${role}.`);
assert(model.includes("require('../../../contracts/presentation')"),'Presentation Model must consume the shared role contract.');
assert(top.includes("require('../../../../contracts/presentation')"),'TOP validator must consume the same shared role contract.');
assert(!/new Set\(\['scientific-primary'/.test(top)&&!model.includes('const ROLES=Object.freeze({'),'Presentation role allow-lists must not be duplicated across Core modules.');

// Platform-neutral surfaces must not carry Desktop docking geometry.
for(const source of [model,host,workspace]){
  assert(!/\bplacement\s*:String\(|\bplacements\s*:Array|fallback\?\.placement|row\.defaultPlacement\|\|row\.placement/.test(source),'Core semantic workspace projection must not publish Desktop placement metadata.');
}
const topSurfaceType=dts.match(/export interface DKDSTopWorkspaceSurfaceSpec \{[^}]+\}/)?.[0]||'';
assert(topSurfaceType&&!/\bplacements\??:|\bdefaultPlacement\??:|\bplacement\??:/.test(topSurfaceType),'TopWorkspace SDK type must be semantic-only.');
assert(top.includes('must not declare Desktop placement in the platform-neutral Presentation contract'),'TOP Runtime must reject Desktop geometry inside the semantic contract.');

// First-party composition uses WorkspaceSurface, not the legacy low-level PRIME/SUB contribution capability path.
for(const dir of fs.readdirSync(path.join(root,'src/plugins'))){
  const manifestPath=path.join(root,'src/plugins',dir,'plugin.json');
  if(!fs.existsSync(manifestPath))continue;
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  assert(!(manifest.capabilities||[]).includes('ui.prime'),`${dir}: first-party capabilities must not advertise legacy ui.prime composition.`);
  assert(!(manifest.capabilities||[]).includes('ui.sub'),`${dir}: first-party capabilities must not advertise legacy ui.sub composition.`);
}
const template=json('src/plugins/_template/plugin.json');
assert(!(template.capabilities||[]).some(x=>x==='ui.prime'||x==='ui.sub'),'Built-in plugin template must not teach the legacy PRIME/SUB contribution path.');

for(const forbidden of ['ctx.ui.desktop','ctx.ui.mobile','native-legacy-workspace.css','workspace.panel.toggle'])assert(!read('src/core/plugins/kernel/modules/plugin-api.js').includes(forbidden),`Frozen Plugin API must not regain ${forbidden}.`);
assert(docs.includes('adds no Presentation feature')&&docs.includes('Desktop placement metadata in the Core Presentation Model'),'Final freeze policy must document the non-expansion and geometry ownership rules.');

console.log('v3.67.6 Platform Presentation Final Freeze Audit PASS: one semantic role contract, zero Desktop geometry in the Core Presentation Model, semantic-only TopWorkspace declarations, and no first-party duplicate PRIME/SUB composition path.');
