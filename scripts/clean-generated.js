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
let removed=0;
for(const rel of generated){
  const file=path.join(root,rel);
  try{if(fs.existsSync(file)){fs.rmSync(file,{force:true});removed++;}}
  catch(err){throw new Error(`Failed to remove generated artifact ${rel}: ${err.message}`);}
}
console.log(`Removed ${removed} generated artifacts. Authored sources and assets were preserved.`);
