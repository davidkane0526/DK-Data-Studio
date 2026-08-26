'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function bundle(dirRel,outRel){
  const dir=path.join(root,dirRel);
  const files=fs.readdirSync(dir).filter(name=>name.endsWith('.inc')).sort();
  const source=files.map(name=>fs.readFileSync(path.join(dir,name),'utf8')).join('');
  fs.writeFileSync(path.join(root,outRel),source,'utf8');
  console.log(`Generated ${outRel} from ${files.length} composition modules (${Buffer.byteLength(source)} bytes).`);
}
bundle('src/core/ui-infrastructure','src/core/ui-infrastructure.js');
bundle('src/core/plugin-kernel','src/core/plugin-kernel.js');
bundle('src/app','src/app.js');
