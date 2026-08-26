'use strict';
const fs=require('fs');
const path=require('path');
module.exports=function readComposition(root,rel){
  const dir=path.join(root,rel);
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'composition.json'),'utf8'));
  if(!Array.isArray(manifest.modules)||!manifest.modules.length)throw new Error(`${rel}/composition.json has no modules.`);
  return manifest.modules.map(name=>fs.readFileSync(path.join(dir,name),'utf8')).join('');
};
