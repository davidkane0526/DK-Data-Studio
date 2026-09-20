'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const spec=require(path.join(ROOT,'src/core/ui/modules/composition/unit-template-spec'));
const {LAYOUT_RECIPES}=spec;
const policy=spec.UNIT_RESPONSIVE_DENSITY_PRINCIPLE;
const audit=spec.UNIT_RESPONSIVE_DENSITY_AUDIT;
const ids=Object.keys(spec.UNIT_CATALOG);

assert.strictEqual(ids.length,41,'Unit density audit must cover the frozen 41-Unit catalog.');
assert.deepStrictEqual(Object.keys(audit).sort(),ids.sort(),'Every Unit must have one responsive/density audit classification.');
assert.strictEqual(policy.id,'compact-first-single-last-v1');
assert.strictEqual(policy.unknownWidth,'preserve-base');
assert(policy.singleColumnMaxWidthPx<=760,'Single-column fallback ceiling must stay compact.');
assert(policy.maxColumnDropPerBreakpoint<=2,'Density layouts must reduce columns progressively, not collapse greedily.');

const ALLOWED_MODES=new Set(['presenter-projected','host-fill','overflow-aware','parent-sized','normal-flow','responsive-density-owner','inline-preserving','fixed-hit','wrap-declared','inline-control','intrinsic','flow','bounded-flow','wrap-or-scroll','centered-flow','parent-grid','scroll-owner','schema-owned','auto-fit-density','horizontal-overflow','presenter-and-fill','parent-resize','adaptive-columns','parent-canvas','bounded-overlay','intrinsic-hit','bounded-reflow','viewport-bounded','overflow-priority','dock-or-float','nonvisual']);
for(const id of ids){
  const mode=audit[id];
  assert(ALLOWED_MODES.has(mode),`Unit ${id} has an unknown density audit mode: ${mode}`);
  const contract=spec.UNIT_CONTRACTS[id];
  assert(contract,`Unit ${id} has no public Unit contract.`);
  if(id!=='provider')assert(String(contract.responsive||'').trim(),`Visual Unit ${id} must document its responsive/density behavior.`);
}

const DENSITY_RECIPES=new Set([
  'form-grid','form-grid-2','form-grid-4','action-grid-2','action-grid-4','metric-grid','two-card-grid',
  'tool-sidebar-main','connection-grid','active-file-head','formula-grid','palette-grid','responsive-two-column',
  'sidebar-main-standard','sidebar-main-compact','sidebar-main-wide','analysis-control-grid','result-control-grid'
]);

function topLevelTokens(value){
  const text=String(value||'').trim();if(!text||text==='none')return [];
  const out=[];let depth=0,start=0;
  for(let i=0;i<text.length;i+=1){const ch=text[i];if(ch==='(')depth+=1;else if(ch===')')depth=Math.max(0,depth-1);else if(/\s/.test(ch)&&depth===0){if(i>start)out.push(text.slice(start,i));start=i+1;while(start<text.length&&/\s/.test(text[start]))start+=1;i=start-1;}}
  if(start<text.length)out.push(text.slice(start));return out;
}
function columnCount(value){
  const tokens=topLevelTokens(value);if(!tokens.length)return 0;let count=0;
  for(const token of tokens){const repeat=token.match(/^repeat\((\d+)\s*,/);count+=repeat?Number(repeat[1]):1;}
  return count;
}
function effective(recipe,width){
  const patches=Array.isArray(recipe?.responsive)?recipe.responsive:[];
  if(!(Number(width)>0)){const base={...recipe};delete base.responsive;return base;}
  const max=patches.filter(row=>row.maxWidth!==undefined&&width<=Number(row.maxWidth)).sort((a,b)=>Number(b.maxWidth)-Number(a.maxWidth));
  const min=patches.filter(row=>row.minWidth!==undefined&&width>=Number(row.minWidth)).sort((a,b)=>Number(a.minWidth)-Number(b.minWidth));
  const active={...recipe};delete active.responsive;
  for(const patch of [...max,...min]){const next={...patch};delete next.maxWidth;delete next.minWidth;Object.assign(active,next);}return active;
}

for(const [name,recipe] of Object.entries(LAYOUT_RECIPES)){
  if(!DENSITY_RECIPES.has(name))continue;
  const points=new Set([1800,1400,1250,1180,1120,1000,920,840,760,680,620,520,460,420,380,360,310,280]);
  for(const row of recipe.responsive||[]){for(const key of ['maxWidth','minWidth'])if(row[key]!==undefined){const n=Number(row[key]);points.add(n);points.add(n+1);if(n>1)points.add(n-1);}}
  const samples=[...points].filter(n=>n>0).sort((a,b)=>b-a).map(width=>({width,count:columnCount(effective(recipe,width).gridTemplateColumns)})).filter(row=>row.count>0);
  let previous=null;
  for(const sample of samples){
    if(previous&&sample.count<previous.count)assert(previous.count-sample.count<=policy.maxColumnDropPerBreakpoint,`${name} greedily drops ${previous.count}→${sample.count} columns around ${previous.width}→${sample.width}px.`);
    if(sample.count===1)assert(sample.width<=policy.singleColumnMaxWidthPx,`${name} collapses to one column too early at ${sample.width}px.`);
    previous=sample;
  }
}

const expect=(name,checks)=>{const recipe=LAYOUT_RECIPES[name];assert(recipe,`${name} recipe missing`);for(const [width,columns] of checks){const row=(recipe.responsive||[]).find(r=>Number(r.maxWidth)===width);assert(row,`${name} missing ${width}px density stage`);assert.strictEqual(row.gridTemplateColumns,columns,`${name} ${width}px density stage drifted`);}};
expect('connection-grid',[[620,'repeat(4,minmax(0,1fr))'],[460,'repeat(3,minmax(0,1fr))'],[310,'repeat(2,minmax(0,1fr))']]);
expect('metric-grid',[[620,'repeat(2,minmax(0,1fr))'],[310,'minmax(0,1fr)']]);
expect('two-card-grid',[[680,'minmax(0,1fr)']]);
expect('responsive-two-column',[[680,'minmax(0,1fr)']]);
expect('tool-sidebar-main',[[760,'minmax(0,1fr)']]);
expect('action-grid-4',[[280,'repeat(2,minmax(0,1fr))']]);
expect('analysis-control-grid',[[1120,'repeat(4,minmax(0,1fr))'],[840,'repeat(3,minmax(0,1fr))'],[620,'repeat(2,minmax(0,1fr))']]);


const schemaCss=fs.readFileSync(path.join(ROOT,'src/styles/structure/schema-and-plugin-ui.css'),'utf8');
assert(schemaCss.includes('.dkds-size-compact .schema-parameter-panel:not(.auto-fit):not(.layout-host-owned),'),'ParameterForm compact-host density contract must remain explicit.');
assert(schemaCss.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'Compact host buckets must retain two ordinary ParameterForm columns.');
assert(!schemaCss.includes('.schema-parameter-panel.compact:not(.auto-fit):not(.layout-host-owned){grid-template-columns:1fr;}'),'ParameterForm must not collapse to one column merely because the host entered a compact size bucket.');
assert(schemaCss.includes('@media(max-width:310px)'),'ParameterForm single-column fallback must be restricted to a genuinely tiny viewport.');

const runtime=fs.readFileSync(path.join(ROOT,'src/core/ui/modules/composition/unit-template-layout.js'),'utf8');
assert(runtime.includes('if(!(Number(width)>0))return [];'),'Unknown width must not activate responsive geometry.');
assert(runtime.includes("if(!(Number(width)>0)){const base={...recipe};delete base.responsive;return base;}"),'Unknown width must preserve the base recipe.');
console.log(`Unit responsive/density audit PASS: ${ids.length} Units / ${Object.keys(LAYOUT_RECIPES).length} recipes / compact-first-single-last-v1`);
