'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));



const coreCss=read('src/core.css');
const foundation=read('src/styles/foundation/foundation.css');
const utility=read('src/styles/utility/visibility.css');
const saveCss=read('src/styles/structure/super-top-contract.css');
const dialogStructure=read('src/styles/structure/workbench-components.css');
const importCss=read('src/styles/structure/analysis-shell.css');
const index=read('src/index.html');
const persistence=read('src/app/modules/project-persistence.js');
const startup=read('src/app/modules/startup.js');

assert(coreCss.startsWith('@layer dkds.foundation, dkds.plugin, dkds.plugin-platform, dkds.structure, dkds.presentation, dkds.theme, dkds.motion, dkds.platform, dkds.window, dkds.utility;'),
  'Renderer interactivity requires a paint-free final visibility utility above structural display rules.');
assert(!/(^|[},])\s*\.hidden\s*\{\s*display\s*:\s*none/m.test(foundation),'Foundation must not own global hidden state.');
assert(/:where\(\.hidden,\[hidden\]\)\{display:none;\}/.test(utility),'Final utility must own .hidden/[hidden].');

assert(dialogStructure.includes('.dkds-dialog-overlay{position:fixed')&&dialogStructure.includes('display:grid;place-items:center'),
  'Save-choice overlay must consume the canonical structural dialog grid when active.');
assert(!saveCss.includes('.project-save-choice-backdrop.hidden{display:none;}'),
  'Save-choice overlay must not re-own hidden state below the final utility layer.');
assert(importCss.includes('.import-generic-importer-note{display:flex;'),
  'Import helper note must retain its active flex layout.');
assert(!importCss.includes('.import-generic-importer-note.hidden{display:none;}'),
  'Import helper note must not re-own hidden state below the final utility layer.');
assert(/id="projectSaveChoiceDialog" class="[^"]*project-save-choice-backdrop[^"]*dkds-dialog-overlay[^"]*hidden[^"]*"/.test(index),
  'Save-choice overlay must consume the canonical dialog overlay and start hidden in authored HTML.');
assert(index.includes('id="importGenericImporterNote" class="import-section import-generic-importer-note hidden"'),
  'Import helper note must start hidden even though its structure owns display:flex.');

const dialogShowCount=(persistence.match(/dialog\.classList\.remove\('hidden'\)/g)||[]).length;
assert.equal(dialogShowCount,1,'Save overlay should only be revealed by chooseProjectSaveMode().');
assert(persistence.includes("dialog.classList.add('hidden')"),'Save overlay must be hidden again when the choice settles.');
const startupSaveCalls=(startup.match(/saveProject\(\)/g)||[]).length;
assert.equal(startupSaveCalls,1,'Startup may reference saveProject only inside the explicit owner-save request callback.');
assert(startup.includes("onOwnerProjectSaveRequest?.(payload=>{applyActivityProjectSnapshot(payload);saveProject();})"),
  'The only startup save path must remain event-driven.');

console.log('v3.61.92 renderer interactivity gate PASS: explicit startup-hidden overlays are protected by the final visibility utility.');
