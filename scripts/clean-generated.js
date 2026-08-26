'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const generated=[
  'src/app.js',
  'src/core/ui-infrastructure.js',
  'src/core/plugin-kernel.js',
  'src/style.css',
  'src/ui-modern.css',
  'src/generated/plugin-index.js',
  'src/generated/sdk-authoring-reference.js',
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
