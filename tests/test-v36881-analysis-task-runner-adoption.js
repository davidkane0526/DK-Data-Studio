'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const expected=[
  'pulse-analysis','pulse-sampler-tool','resonance-detector-robust','resonance-workbench',
  'standard-transport-algorithms','ter-analysis','transfer-vth-lab'
];
for(const name of expected){
  const dir=path.join(root,'src','plugins',name),manifest=JSON.parse(fs.readFileSync(path.join(dir,'plugin.json'),'utf8'));
  assert((manifest.requiresCore||[]).includes('execution.tasks'),`${name} must require execution.tasks`);
  assert(Array.isArray(manifest.tasks)&&manifest.tasks.length>0,`${name} must declare at least one Core-managed task`);
  for(const task of manifest.tasks){
    assert(task.id&&task.entry,`${name} task must declare id/entry`);
    assert(fs.existsSync(path.join(dir,task.entry)),`${name} task entry missing: ${task.entry}`);
    for(const imp of task.imports||[])assert(fs.existsSync(path.join(dir,imp)),`${name} task import missing: ${imp}`);
  }
  const source=fs.readdirSync(dir).filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
  assert(!/new\s+(?:Shared)?Worker\s*\(/.test(source),`${name} must not create a private Worker`);
}
const resonance=fs.readFileSync(path.join(root,'src','plugins','resonance-detector-robust','plugin.js'),'utf8');
assert(resonance.includes("ctx.tasks.submit('resonance-compute'"),'Resonance detector must use Core tasks.');
assert(!/run:\s*\([^)]*\)=>\s*A\.detectPeaks/.test(resonance),'Resonance provider must not retain direct detectPeaks fallback.');
const transport=fs.readFileSync(path.join(root,'src','plugins','standard-transport-algorithms','plugin.js'),'utf8');
assert(transport.includes("runTask('ter'"),'TER transport analysis must use Core tasks.');
const pulse=fs.readFileSync(path.join(root,'src','plugins','pulse-analysis','plugin.js'),'utf8')+fs.readFileSync(path.join(root,'src','plugins','pulse-analysis','analysis-service.js'),'utf8');
assert(pulse.includes("ctx.tasks")||pulse.includes('taskScope'),'Pulse analysis must be task-backed.');
console.log('v3.68.81 analysis Task Runner adoption OK: all first-party heavy analysis surfaces declare Core-managed workers and no plugin owns a private Worker pool.');
