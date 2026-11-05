'use strict';
const assert=require('node:assert/strict');
const {HOT_UPDATE_FILES,requiresFullAppVersionBump,compareVersions,validateUpdateScope}=require('../tools/updates/validate-update-scope.cjs');
const css=[...HOT_UPDATE_FILES];
assert.equal(requiresFullAppVersionBump(css),false,'allowlisted CSS can ship as hot update without changing the app version');
assert.equal(requiresFullAppVersionBump([...css,'README_CN.md','tests/example.test.js','.github/workflows/ui-hot-update.yml']),false,
  'documentation, tests and workflow changes do not force a native app version bump');
assert.equal(requiresFullAppVersionBump(['src/app/modules/floating-docks.js']),true);
assert.equal(requiresFullAppVersionBump(['mobile/src/components/UpdateDialog.tsx']),true);
assert.equal(requiresFullAppVersionBump(['src/styles/other-panel.css']),true,
  'CSS outside the signed hot-update allowlist requires a full app version bump');
assert.equal(compareVersions('3.72.0','3.71.145'),1);
assert.equal(compareVersions('3.72.0','3.72.0'),0);
assert.equal(validateUpdateScope({changedPaths:css,baseVersion:'3.72.0',currentVersion:'3.72.0'}).channel,'hot-update-only');
assert.equal(validateUpdateScope({changedPaths:['src/app/main.js'],baseVersion:'3.71.145',currentVersion:'3.72.0'}).channel,'full-app');
assert.throws(()=>validateUpdateScope({changedPaths:['desktop/native-update.js'],baseVersion:'3.72.0',currentVersion:'3.72.0'}),
  error=>error.code==='FULL_APP_VERSION_BUMP_REQUIRED');
console.log('DKDS hot-only/full-app version gate PASS');
