'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(cond,msg)=>{if(!cond)throw new Error(msg);};

const pkg=JSON.parse(read('package.json'));
const versionAtLeast=(actual,required)=>{const a=String(actual).split('.').map(Number),b=String(required).split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d>0;}return true;};
assert(versionAtLeast(pkg.version,'3.68.65'),'App version must remain at or above 3.68.65.');
const html=read('src/index.html');
const structure=read('src/styles/structure/super-top-contract.css');
const shell=read('src/styles/presentation/shell.css');
const persistence=read('src/app/modules/project-persistence.js');

for(const token of [
  'project-save-choice-backdrop dkds-dialog-overlay',
  'project-save-choice-card dkds-dialog dkds-material-role-elevated',
  'dkds-dialog-header project-save-choice-header',
  'dkds-dialog-body project-save-choice-body',
  'project-save-choice-actions dkds-dialog-footer',
  'projectSaveChoiceProjectName',
  'projectSaveCloseBtn'
]) assert(html.includes(token),`Project save dialog missing canonical structure: ${token}`);

const footer=html.slice(html.indexOf('project-save-choice-actions dkds-dialog-footer'),html.indexOf('</footer>',html.indexOf('project-save-choice-actions dkds-dialog-footer')));
for(const [id,variant] of [['projectSaveCurrentBtn','primary'],['projectSaveAsBtn','secondary'],['projectSaveCancelBtn','destructive']]){
  assert(footer.includes(`id="${id}"`),`Missing ${id}.`);
  const from=footer.indexOf(`id="${id}"`),to=footer.indexOf('</button>',from);
  const button=footer.slice(from,to);
  assert(button.includes('dkds-action-button')&&button.includes('data-dkds-action-layout="standalone"'),`${id} must use canonical standalone Action geometry.`);
  assert(button.includes('data-dkds-component-identity="toolbarAction"')&&button.includes('data-dkds-component-identity-owner="core-component"'),`${id} must preserve canonical toolbarAction identity.`);
  assert(button.includes(`data-dkds-component-variant="${variant}"`)&&button.includes('data-dkds-component-variant-owner="core-component"'),`${id} must preserve Theme-owned ${variant} fill semantics.`);
}

assert(structure.includes('.project-save-choice-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;justify-content:stretch;}'),'Save dialog must keep a balanced filled action row.');
assert(structure.includes('@media(max-width:560px)')&&structure.includes('.project-save-choice-actions{grid-template-columns:1fr;}'),'Save dialog actions must stack on narrow screens.');
assert(!shell.includes('.project-save-choice-backdrop{')&&!shell.includes('.project-save-choice-icon{')&&!shell.includes('.project-save-choice-copy strong'), 'Legacy project-save optical paint must stay removed from shell presentation.');
assert(persistence.includes("const closeBtn=$('#projectSaveCloseBtn')")&&persistence.includes("projectName.textContent=currentName||'未命名项目'")&&persistence.includes("closeBtn.onclick=()=>finish('cancel')"),'Project-save runtime must populate current-project identity and wire the canonical close action.');

assert(footer.includes('class="dkds-dialog-action dkds-action-button danger-soft"'),'Save cancel must use the same danger-soft affordance family as range-selection destructive actions.');
console.log('v3.68.65+ canonical project-save dialog and Theme-filled actions PASS.');
