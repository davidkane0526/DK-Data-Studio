'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const core=read('src/styles/structure/super-top-contract.css');
const generic=read('src/styles/structure/schema-and-plugin-ui.css');
const plugin=read('src/plugins/connectivity-center/plugin.js');
const css=read('src/plugins/connectivity-center/plugin.css');

assert(generic.includes('.dkds-action-button'),'Generic fallback must still explicitly exclude canonical dkds-action-button controls; otherwise the root-cause check is invalid.');
assert(core.includes('[data-dkds-action-density="regular"] .dkds-action-button'),'Core must own the regular action-density geometry.');
assert(core.includes('min-height:var(--dkds-action-regular-height,32px)'),'Regular Core action density must provide a visible 32px minimum height.');
assert(plugin.includes('class="dksvc-window dksmb-window dkds-dialog-shell dkds-material-role-elevated" data-dkds-action-density="regular"'),'SMB window must explicitly request the Core regular action density.');
for(const id of ['dksmbDiscover','dksmbUp','dksmbFavorite','dksmbRefresh','dksmbShares','dksmbCancel']){
  assert(plugin.includes(`id="${id}"`),`SMB action missing ${id}.`);
}
assert(plugin.includes('id="dksmbCommit"')&&plugin.includes('dksmb-primary primary dkds-action-button'),'SMB primary open/import action must remain a canonical Core action button.');
assert(!css.includes('--dkds-generic-button-min-height:32px'),'SMB plugin must not repeat the previous dead generic-button token workaround.');
assert(!/\.dksmb-btn\{[^}]*\b(?:height|min-height|padding(?:-block|-inline)?)\s*:/s.test(css),'SMB plugin may not directly own canonical action geometry.');
console.log('v3.68.17 SMB action density PASS: previous dead generic token is removed, SMB requests Core regular density, and Core owns the 32px button geometry.');
