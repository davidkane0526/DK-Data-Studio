'use strict';
const assert=require('node:assert/strict');
const {HOT_UPDATE_FILES,isIsolated4200APreviewPath,requiresFullAppVersionBump,compareVersions,validateUpdateScope}=require('../tools/updates/validate-update-scope.cjs');
const css=[...HOT_UPDATE_FILES];
assert.equal(requiresFullAppVersionBump(css),false,'allowlisted CSS can ship as hot update without changing the app version');
assert.equal(requiresFullAppVersionBump([...css,'README_CN.md','tests/example.test.js','.github/workflows/ui-hot-update.yml']),false,
  'documentation, tests and workflow changes do not force a native app version bump');
const isolated=[
  'src/4200a-fspro/editor.css','src/4200a-fspro/editor.js',
  'desktop/4200a-fspro-main.cjs','desktop/4200a-kxci-runner.cjs',
  'android4200a/app/build.gradle','scripts/4200a/stage-windows-preview.cjs',
  'tools/4200a-generate-brand-icons.cjs'
];
assert.ok(isolated.every(isIsolated4200APreviewPath),'all standalone preview paths are isolated');
assert.equal(requiresFullAppVersionBump(isolated),false,'standalone preview must not force a DKDS host upgrade');
assert.equal(validateUpdateScope({
  changedPaths:[...isolated,'tests/test-4200a-ui-visual.cjs'],
  baseVersion:'3.72.3',currentVersion:'3.72.3'
}).channel,'isolated-preview');
assert.equal(isIsolated4200APreviewPath('src/core/scientific/plot-runtime.js'),false,
  'shared DKDS ScientificPlot Core must never be exempted');
assert.equal(requiresFullAppVersionBump([...isolated,'src/core/scientific/plot-runtime.js']),true,
  'shared host runtime changes still require DKDS version bump');
assert.throws(()=>validateUpdateScope({
  changedPaths:[...isolated,'src/app/main.js'],
  baseVersion:'3.72.3',currentVersion:'3.72.3'
}),error=>error.code==='FULL_APP_VERSION_BUMP_REQUIRED');
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
