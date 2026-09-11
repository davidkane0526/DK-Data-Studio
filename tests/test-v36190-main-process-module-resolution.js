'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const entry=path.join(root,'desktop','main.js');
const seen=new Set();
const unresolved=[];
const requirePattern=/\brequire\(\s*(['"])([^'"\n]+)\1\s*\)/g;

function inspect(file){
  const real=fs.realpathSync(file);
  if(seen.has(real))return;
  seen.add(real);
  if(path.extname(real)!=='.js')return;
  const source=fs.readFileSync(real,'utf8');
  requirePattern.lastIndex=0;
  let match;
  while((match=requirePattern.exec(source))){
    const spec=match[2];
    if(!spec.startsWith('.'))continue;
    let resolved='';
    try{
      resolved=require.resolve(path.resolve(path.dirname(real),spec));
    }catch(error){
      unresolved.push({from:path.relative(root,real),spec,message:error?.message||String(error)});
      continue;
    }
    if(resolved.startsWith(root+path.sep))inspect(resolved);
  }
}

inspect(entry);
assert.deepEqual(
  unresolved,
  [],
  `Electron main-process local module graph contains unresolved require(s):\n${unresolved.map(row=>`- ${row.from}: ${row.spec}`).join('\n')}`
);

const main=fs.readFileSync(entry,'utf8');
assert(
  main.includes("require('../src/core/project/format')"),
  'desktop/main.js must load the canonical project format module from src/core/project/format.js'
);
assert(!main.includes("src/core/project-format"),'desktop/main.js must not reference the removed pre-refactor project-format path');

const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const readme=fs.readFileSync(path.join(root,'README_CN.md'),'utf8');
assert(
  readme.includes(`当前版本：**v${pkg.version}**`),
  'README current-version marker must match package.json'
);
const versionScript=fs.readFileSync(path.join(root,'scripts','set-version.js'),'utf8');
assert(versionScript.includes('当前版本：\\*\\*v'),'set-version.js must update the current README version marker');

console.log(`v3.61.90 main-process module resolution PASS (${seen.size} local modules checked)`);
