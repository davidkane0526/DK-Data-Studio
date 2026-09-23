'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const generated=[
  'src/generated/runtime/app.js',
  'src/generated/runtime/ui-infrastructure.js',
  'src/generated/runtime/plugin-kernel.js',
  'src/generated/plugin-index.js',
  'src/generated/sdk-authoring-reference.js',
  'src/generated/dkds-sdk-export.zip',
  'assets/dkds-icon.png',
  'mobile/assets/icon.png',
  'mobile/assets/adaptive-icon.png'
];
const generatedDirectories=[
  'sdk/python/__pycache__',
  'examples/declarative-python-reference/__pycache__'
];
let removed=0;
for(const rel of generatedDirectories){
  const dir=path.join(root,rel);
  try{if(fs.existsSync(dir)){fs.rmSync(dir,{recursive:true,force:true});removed++;}}
  catch(err){throw new Error(`Failed to remove generated directory ${rel}: ${err.message}`);}
}
for(const rel of generated){
  const file=path.join(root,rel);
  try{if(fs.existsSync(file)){fs.rmSync(file,{force:true});removed++;}}
  catch(err){throw new Error(`Failed to remove generated artifact ${rel}: ${err.message}`);}
}
console.log(`Removed ${removed} generated artifacts. Authored sources and assets were preserved.`);
