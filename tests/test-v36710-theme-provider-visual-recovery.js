'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const thin=read('src/plugins/thin-glass-theme/plugin.js'),aurora=read('src/plugins/aurora-pop-theme/plugin.js');
assert.equal(json('src/plugins/thin-glass-theme/plugin.json').version,'1.12.3');
assert.equal(json('src/plugins/aurora-pop-theme/plugin.json').version,'2.3.2');
for(const source of [thin,aurora]){
  assert(!/theme\.supports\s*\(|\.supports\s*\(\s*['\"]contract[.:]/.test(source),'Current Theme providers must target Theme Contract 3.10 directly instead of probing historical/current capability IDs.');
  assert(source.includes('contexts:{grouped:'));
  assert(source.includes("'workspace-modal':{materialBlur:"));
}
assert(thin.includes("roles:{floating:{contexts:{grouped:"),'Thin Glass must distinguish grouped floating controls through Theme 3.10.');
assert(aurora.includes('toolbarGroup:{')&&aurora.includes('roles:{floating:'),'Aurora must keep expressive ToolbarGroup role-specific depth through Theme 3.10.');
const shell=read('src/core/ui/modules/presentation/desktop-shell.js');
assert(shell.includes("button.dataset.dkdsComponentVariant=item.active?'active':'quiet'"));
const index=read('src/index.html');
assert(index.includes('class="import-workbench dkds-material-role-elevated" data-dkds-material-context="workspace-modal"'));
const automation=read('src/diagnostics/automation-visual-cases.js');
assert(automation.includes("componentContext==='grouped'")&&automation.includes("context==='workspace-modal'"));
assert(!automation.includes('Integrated topbar action must not stack a second shadow/halo'));
assert(!automation.includes('Standalone emphasized topbar action must use an exact 2px spread halo'));
console.log('v3.67.10 Theme Provider recovery PASS: R3 visual conflict is replaced by Theme 3.10 Core contextual composition without weakening built-in Theme expression.');
