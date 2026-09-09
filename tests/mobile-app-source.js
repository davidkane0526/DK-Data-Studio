'use strict';
const fs=require('fs');
const path=require('path');

const MOBILE_APP_FILES=[
  'mobile/App.tsx',
  'mobile/src/components/RendererWorkspace.tsx',
  'mobile/src/host/protocol.ts',
  'mobile/src/host/useHostBridge.ts',
  'mobile/src/host/useMobileSystemLifecycle.ts',
  'mobile/src/host/useNativeFileService.ts',
  'mobile/src/host/useNativeRequestRouter.ts',
  'mobile/src/host/useShellActions.ts',
  'mobile/src/services/useWebServiceController.ts',
];

function readMobileApp(root){
  return MOBILE_APP_FILES.map(rel=>fs.readFileSync(path.join(root,rel),'utf8')).join('\n');
}

module.exports={MOBILE_APP_FILES,readMobileApp};
