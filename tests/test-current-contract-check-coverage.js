'use strict';
const assert=require('assert');const manifest=require('./manifest');
const required=[
 'tests/test-sdk151-ter-unit-shadow-reconstruction.js',
 'tests/test-v3719-ter-unit-cutover-layout-lifecycle.js',
 'tests/test-sdk151-pulse-unit-shadow-reconstruction.js',
 'tests/test-sdk151-resonance-unit-shadow-reconstruction.js',
 'tests/test-sdk151-data-center-unit-shadow-reconstruction.js',
 'tests/test-sdk151-native-geometry-expressibility.js',
 'tests/test-sdk151-unit-geometry-value-source-parity.js',
 'tests/test-sdk150-existing-plugin-style-freeze.js',
 'tests/test-sdk150-unit-template-contract.js',
 'tests/test-sdk150-unit-example-layout.js',
 'tests/test-sdk-prime-spec-parity.js',
 'tests/test-composition-lint-completeness.js',
 'tests/test-sdk149-visual-template-parity.js',
 'tests/test-movable-prime-canonical-chrome.js',
 'tests/test-fixed-data-control-no-position-chooser.js',
 'tests/test-scientific-card-ownership.js',
 'tests/test-plotgroup-plotview-membership.js',
 'tests/test-responsive-plotgroup-no-fixed-height.js',
 'tests/test-layout-harness-desktop.js',
 'tests/test-layout-harness-mobile.js',
 'tests/test-theme-disabled-action-contrast.js',
 'tests/test-active-activity-contribution-scope.js',
 'tests/test-external-top-task-materialization-parity.js'
];
for(const suiteName of ['test','check']){const files=new Set((manifest[suiteName]||[]).map(row=>row.file));for(const file of required)assert(files.has(file),`${suiteName} must include current-contract gate ${file}`);}
console.log('Current-contract test/check coverage PASS');
