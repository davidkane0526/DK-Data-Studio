const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const shell=read('src/core/recipes/shell-navigation.js');
const safeguards=read('src/core/recipes/workspace-safeguards.js');
const shellCss=read('src/styles/structure/shell-navigation.css');
const safeguardCss=read('src/styles/structure/workspace-safeguards.css');
const schemaCss=read('src/styles/structure/schema-and-plugin-ui.css');

for(const token of ['#activityBar','#activityMoreMenu','#activityMoreBtn','.activity-switcher','activityOrder','getBoundingClientRect','ctx.ui.activities.active']){
  assert(shell.includes(token),`Shell navigation must own secondary activity overflow behavior: missing ${token}`);
  assert(!safeguards.includes(token),`Workspace safeguards must not own shell navigation behavior: found ${token}`);
}
for(const selector of ['.workspace-commandbar{','.primary-activity-cluster{','.primary-activity-bar{','.activity-switcher{','.context-commandbar{']){
  assert(shellCss.includes(selector),`Shell navigation CSS must own ${selector}`);
  assert(!safeguardCss.includes(selector),`Workspace safeguards CSS must not own ${selector}`);
  assert(!schemaCss.includes(selector),`Schema/plugin UI CSS must not own ${selector}`);
}
assert(!shellCss.includes('.plugin-manager-')&&!shellCss.includes('.plugin-card-'),'Shell navigation CSS must not own plugin manager typography or cards.');
assert(schemaCss.includes('.plugin-manager-stat span')&&schemaCss.includes('.plugin-card-title-line h3'),'Plugin manager typography must stay with schema/plugin UI ownership.');
assert(safeguards.includes('findDuplicateImports')&&safeguards.includes('import-duplicate-warning'),'Workspace safeguards must retain import duplicate protection.');

console.log('v3.61.102 shell navigation ownership checks passed.');
