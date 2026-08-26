'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function bundle(dirRel,outRel){
  const dir=path.join(root,dirRel);
  const files=fs.readdirSync(dir).filter(name=>name.endsWith('.css')).sort();
  const source=files.map(name=>fs.readFileSync(path.join(dir,name),'utf8')).join('');
  fs.writeFileSync(path.join(root,outRel),source,'utf8');
  console.log(`Generated ${outRel} from ${files.length} modules (${Buffer.byteLength(source)} bytes).`);
}
bundle('src/styles/base','src/style.css');
bundle('src/styles/modern','src/ui-modern.css');
