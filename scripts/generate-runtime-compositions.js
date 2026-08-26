'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const MAX_MODULE_BYTES=48*1024;

function loadComposition(dirRel){
  const dir=path.join(root,dirRel);
  const manifestPath=path.join(dir,'composition.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const modules=Array.isArray(manifest.modules)?manifest.modules.map(String):[];
  const output=String(manifest.output||'').trim();
  if(!output||!modules.length)throw new Error(`${dirRel}/composition.json must declare output and modules.`);
  if(new Set(modules).size!==modules.length)throw new Error(`${dirRel}/composition.json contains duplicate modules.`);
  const discovered=fs.readdirSync(dir).filter(name=>name.endsWith('.inc')).sort();
  const declared=[...modules].sort();
  if(JSON.stringify(discovered)!==JSON.stringify(declared))throw new Error(`${dirRel}/composition.json must list every .inc module exactly once.`);
  const chunks=modules.map(name=>{const file=path.join(dir,name),bytes=fs.statSync(file).size;if(bytes>MAX_MODULE_BYTES)throw new Error(`${dirRel}/${name} is ${bytes} bytes; split composition modules above ${MAX_MODULE_BYTES} bytes.`);return fs.readFileSync(file,'utf8');});
  const source=chunks.join('');
  const out=path.join(root,output);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,source,'utf8');
  console.log(`Generated ${output} from ${modules.length} composition modules (${Buffer.byteLength(source)} bytes).`);
}

for(const dir of ['src/core/ui/composition','src/core/plugins/kernel','src/app'])loadComposition(dir);
