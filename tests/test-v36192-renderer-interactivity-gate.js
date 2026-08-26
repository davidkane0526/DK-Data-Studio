'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert.equal(json('package.json').version,'3.61.92','Renderer interactivity gate must track v3.61.92.');

const coreCss=read('src/core.css');
const visibility=read('src/styles/state/visibility.css');
const foundation=read('src/styles/foundation/foundation.css');
const saveCss=read('src/styles/structure/super-top-contract.css');
const importCss=read('src/styles/structure/analysis-shell.css');
const index=read('src/index.html');
const persistence=read('src/app/modules/project-persistence.js');
const startup=read('src/app/modules/startup.js');

assert(coreCss.startsWith('@layer dkds.foundation, dkds.plugin, dkds.structure, dkds.presentation, dkds.theme, dkds.platform, dkds.window, dkds.state;'),
  'Visibility state must be the highest canonical cascade layer.');
assert(coreCss.trimEnd().endsWith('@import url("./styles/state/visibility.css") layer(dkds.state);'),
  'Visibility state stylesheet must load after all structural/presentation layers.');
assert(/\.hidden\s*\{\s*display\s*:\s*none\s*;?\s*\}/.test(visibility),'.hidden must be owned by the state layer.');
assert(!/\.hidden\s*\{[^}]*display\s*:\s*none/i.test(foundation),'Low-priority foundation must not own global hidden state.');

assert(saveCss.includes('.project-save-choice-backdrop{')&&saveCss.includes('display:grid;'),
  'Save-choice overlay must remain a structural grid when active.');
assert(importCss.includes('.import-generic-importer-note{display:flex;'),
  'Import helper note must retain its active flex layout.');
assert(index.includes('id="projectSaveChoiceDialog" class="project-save-choice-backdrop hidden"'),
  'Save-choice overlay must start hidden in authored HTML.');
assert(index.includes('id="importGenericImporterNote" class="import-section import-generic-importer-note hidden"'),
  'Import helper note must start hidden even though its structure owns display:flex.');

const dialogShowCount=(persistence.match(/dialog\.classList\.remove\('hidden'\)/g)||[]).length;
assert.equal(dialogShowCount,1,'Save overlay should only be revealed by chooseProjectSaveMode().');
assert(persistence.includes("dialog.classList.add('hidden')"),'Save overlay must be hidden again when the choice settles.');
const startupSaveCalls=(startup.match(/saveProject\(\)/g)||[]).length;
assert.equal(startupSaveCalls,1,'Startup may reference saveProject only inside the explicit owner-save request callback.');
assert(startup.includes("onOwnerProjectSaveRequest?.(payload=>{applyActivityProjectSnapshot(payload);saveProject();})"),
  'The only startup save path must remain event-driven.');

console.log('v3.61.92 renderer interactivity gate PASS: hidden overlays cannot override global visibility state.');
