'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const {audit}=require('../tools/quality/semantic-style-ownership');

(function run(){
  const report=audit();
  assert.strictEqual(report.ok,true,report.violations.map(v=>`${v.file}:${v.selector}:${v.property}`).join('\n'));
  assert.ok(report.contracts>=1,'Semantic owner registry must be active.');
  const chrome=read('src/styles/structure/desktop-chrome-geometry.css');
  const top=read('src/styles/structure/super-top-contract.css');
  const semantic=read('src/styles/structure/sdk-semantic-surfaces.css');
  const schema=read('src/styles/structure/schema-and-plugin-ui.css');
  assert.ok(chrome.includes('height:var(--dkds-header-action-height,26px)'),'Desktop Chrome must remain the final header-action height owner.');
  assert.ok(!/\.dkds-action-button\{[^}]*?(?:^|[;{])\s*height\s*:/sm.test(top),'Generic dkds-action-button must not re-own final header height; semantic min-height density is allowed.');
  for(const leaf of ['dkds-portable-icon-action','dkds-panel-close-button','dkds-portable-placement-trigger','dkds-plot-view-action']){
    const re=new RegExp(`\\.${leaf}\\{[^}]*--dkds-header-action-height\\s*:`,`s`);
    assert.ok(!re.test(chrome),`${leaf} must inherit the context height token instead of shadowing it.`);
  }
  assert.ok(!/\.dkds-portable-history-action\{[^}]*--dkds-header-action-height\s*:/s.test(semantic),'Portable history action must not shadow the context height token.');
  assert.ok(schema.includes(':where(button):not(:where('),'Generic button geometry must stay zero-specificity.');
  for(const context of ['.dkds-integrated-action-group>button','.dkds-separated-action-group>button','.dkds-portable-controls>button','.panel-header-actions>button','.dkds-plot-view-actions>button'])assert.ok(schema.includes(context),`Generic button fallback must exclude ${context}.`);
  console.log('v3.68.0 semantic style owner contract PASS');
})();
