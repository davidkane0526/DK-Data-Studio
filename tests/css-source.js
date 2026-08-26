'use strict';
const fs=require('fs');
const path=require('path');
const DEFAULT_LAYERS=['foundation','structure','presentation','theme','platform'];
function readCoreCss(root,layers=DEFAULT_LAYERS){
  const chunks=[];
  for(const layer of layers){
    const dir=path.join(root,'src','styles',layer);
    if(!fs.existsSync(dir))continue;
    for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.css')).sort())chunks.push(fs.readFileSync(path.join(dir,name),'utf8'));
  }
  return chunks.join('\n');
}
module.exports={readCoreCss};
