'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');
const {PRESENTATION_ROLE_POLICIES}=require('../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS,NATIVE_PLUGIN_BLUEPRINTS}=require('../tools/sdk/native-blueprints');
const dirs=fs.readdirSync('src/plugins').filter(name=>fs.statSync(path.join('src/plugins',name)).isDirectory()).sort();
assert.deepStrictEqual(Object.keys(NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS).sort(),dirs,'Every native plugin needs a Presentation Blueprint, even if empty.');
const readPlugin=id=>fs.readdirSync(path.join('src/plugins',id),{recursive:true}).filter(x=>String(x).endsWith('.js')).map(x=>fs.readFileSync(path.join('src/plugins',id,x),'utf8')).join('\n');
let surfaces=0,contributions=0;
for(const id of dirs){const source=readPlugin(id),bp=NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS[id];
  for(const row of bp.surfaces||[]){surfaces++;assert(PRESENTATION_ROLE_POLICIES[row.role],`${id}:${row.id} unknown presentation role ${row.role}`);assert(source.includes(row.id),`${id}:${row.id} surface id missing from frozen source`);assert(source.includes(`presentationRole:'${row.role}'`)||source.includes(`presentationRole:\"${row.role}\"`)||source.includes(`presentationRole:"${row.role}"`),`${id}:${row.id} role ${row.role} missing from frozen source`);assert(source.includes(`priority:${row.priority}`),`${id}:${row.id} priority ${row.priority} missing from frozen source`);
    const unitBp=NATIVE_PLUGIN_BLUEPRINTS[id];if(row.kind==='prime'){const matching=(unitBp?.regions||[]).find(region=>region.id===row.id);if(matching)assert.strictEqual(matching.role,row.role,`${id}:${row.id} Unit/Preset role drift`);}
  }
  for(const row of bp.contributions||[]){contributions++;assert(source.includes(`id:'${row.id}'`)||source.includes(`id:\"${row.id}\"`)||source.includes(`id:"${row.id}"`),`${id}:${row.id} contribution id missing`);assert(source.includes(`order:${row.order}`),`${id}:${row.id} contribution order drift`);}
}
const presenter=fs.readFileSync('src/core/ui/modules/presentation/presenters.js','utf8');
for(const [role,row] of Object.entries(PRESENTATION_ROLE_POLICIES)){
  if(role==='scientific-primary'||role==='data-primary'||role==='utility-primary')assert(presenter.includes("return Object.freeze({region:'main',navigation:'primary'})"));
  if(role==='data-control')assert(presenter.includes("return Object.freeze({region:'drawer',navigation:'context'})"));
  if(role==='inspector')assert(presenter.includes("return Object.freeze({region:'companion-right',navigation:'context'})"));
  if(role==='scientific-secondary'){assert(presenter.includes("return Object.freeze({region:'companion-bottom',navigation:'context'})"));assert(presenter.includes("return Object.freeze({region:'workspace-inline',navigation:'context'})"));}
  assert(row.mobileRegion,`${role}: mobile region policy missing`);
}
const statusOrder=[];for(const id of ['status-monitor','connectivity-center'])for(const row of NATIVE_PLUGIN_PRESENTATION_BLUEPRINTS[id].contributions.filter(x=>x.kind==='status'&&x.side==='right'))statusOrder.push([row.id,row.order]);
assert.deepStrictEqual(statusOrder.sort((a,b)=>a[1]-b[1]),[['theme',10],['memory',20],['devtools',25],['lan-web',30],['smb-browser',31],['ai-agent',32]],'Accepted right status contribution order drift');
console.log(`SDK 1.51 native presentation blueprints PASS (${surfaces} surfaces / ${contributions} host contributions)`);
