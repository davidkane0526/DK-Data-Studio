'use strict';
const fs=require('fs');
const path=require('path');

const MOBILE_SHELL_FILES=[
  'mobile/src/Shell.tsx',
  'mobile/src/model/shell-types.ts',
  'mobile/src/model/shell-model.ts',
  'mobile/src/theme/palette.ts',
  'mobile/src/components/NativeHeader.tsx',
  'mobile/src/components/NativeStatusBar.tsx',
  'mobile/src/sheets/ShellActionSheet.tsx',
  'mobile/src/styles/shell-styles.ts',
];

function readMobileShell(root){
  return MOBILE_SHELL_FILES.map(rel=>fs.readFileSync(path.join(root,rel),'utf8')).join('\n');
}

module.exports={MOBILE_SHELL_FILES,readMobileShell};
