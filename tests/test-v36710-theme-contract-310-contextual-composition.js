'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const Theme=require('../sdk/theme-contract');

assert.equal(Theme.version,'3.10.0');
assert.deepEqual(Theme.componentContexts(),['standalone','grouped']);
assert.deepEqual(Theme.materialContexts(),['compact','panel','dialog','workspace-modal']);
assert(Theme.supports('contract.appearance.component-contexts'));
assert(Theme.supports('contract.appearance.material-role-composition'));
assert(Theme.supports('contract.material.contexts'));
assert(Theme.supports('contract.material.context-recipes'));
assert(Theme.componentVariantMap().chip.includes('quiet'),'Theme 3.10 must support quiet metadata Chips.');

const profile=Theme.validateProfile({
  modes:{light:{},dark:{}},
  material:{materialBlur:1,contexts:{compact:{materialBlur:3}},roles:{floating:{materialBlur:2,contexts:{compact:{materialBlur:4}}}}},
  appearance:{components:{toolbarAction:{shadow:'0 1px 2px rgba(0,0,0,.1)',variants:{primary:{shadow:'0 2px 4px rgba(0,0,0,.2)'}},contexts:{grouped:{shadow:'none',variants:{primary:{shadow:'0 3px 6px rgba(0,0,0,.3)'}}}},roles:{floating:{shadow:'0 4px 8px rgba(0,0,0,.4)',contexts:{grouped:{shadow:'0 5px 10px rgba(0,0,0,.5)',variants:{primary:{shadow:'0 6px 12px rgba(0,0,0,.6)'}}}}}}}}}
});
const resolved=Theme.resolveProfile(profile,'light');
assert.equal(Theme.resolveMaterialContext(resolved.material,'floating','compact').materialBlur,'4px','role + Material Context must have highest material specificity.');
assert.equal(Theme.resolveComponentAppearance(resolved.appearance,'toolbarAction',{role:'floating',context:'grouped',variant:'primary'}).shadow,'0 6px 12px rgba(0,0,0,.6)','role + context + variant must have highest component specificity.');
assert.throws(()=>Theme.validateProfile({modes:{light:{appearance:{components:{toolbarAction:{shadow:'0 1px 2px var(--bad)'}}}},dark:{}}}),/shadow may only contain literal lengths/);
assert.throws(()=>Theme.validateProfile({modes:{light:{appearance:{components:{toolbarAction:{shadow:'0 1px 2px url(x)'}}}},dark:{}}}),/shadow may only contain literal lengths/);
assert.doesNotThrow(()=>Theme.validateProfile({modes:{light:{appearance:{components:{toolbarAction:{shadow:'0 1px 4px rgba(0,0,0,.1)'}}}},dark:{}}}),'CSS-standard zero length must be accepted in bounded literal shadow slots.');

const sdk=json('sdk/contract.json');
assert.equal(sdk.sdkVersion,'1.47.0');
assert.equal(sdk.themeContractVersion,'3.10.0');
assert.equal(sdk.pluginApiVersion,'1.19.0');
const dts=read('sdk/plugin-api.d.ts');
for(const token of ["contractVersion:'3.10.0'",'DKDSThemeComponentContext','DKDSThemeMaterialContext','shadowSelected','materialContexts()','componentContexts()','recipeFor('])assert(dts.includes(token),`SDK 1.28 Theme 3.10 type missing ${token}`);

const thin=json('src/plugins/thin-glass-theme/plugin.json'),aurora=json('src/plugins/aurora-pop-theme/plugin.json');
assert.equal(thin.version,'1.12.3');assert.equal(thin.apiVersion,'1.19.0');assert(!Object.prototype.hasOwnProperty.call(thin,'compatibility'));
assert.equal(aurora.version,'2.3.2');assert.equal(aurora.apiVersion,'1.19.0');assert(!Object.prototype.hasOwnProperty.call(aurora,'compatibility'));
for(const rel of ['src/plugins/thin-glass-theme/plugin.js','src/plugins/aurora-pop-theme/plugin.js']){
  const source=read(rel);for(const token of ['contexts:{grouped:',"'workspace-modal':{materialBlur:",'appearance:{','material:{'])assert(source.includes(token),`${rel} missing direct current-contract declaration ${token}`);
  assert(!source.includes('theme.supports')&&!source.includes('contract.appearance.component-contexts')&&!source.includes('contract.material.contexts')&&!source.includes('renderer.materialContexts'),'Current Theme plugins must declare Theme 3.10 data directly without runtime capability negotiation.');
  assert(!/querySelector|querySelectorAll|\.style\.|insertRule|styleSheets|adoptedStyleSheets/.test(source),`${rel} must remain declarative and selector-free.`);
}

const index=read('src/index.html');
assert(index.includes('class="import-workbench dkds-material-role-elevated" data-dkds-material-context="workspace-modal"'));
const renderer=read('src/core/theme/material-renderer.js');
assert(renderer.includes("const VERSION='3.11.0'")&&renderer.includes('materialContexts:true'));
const component=read('src/core/theme/component-appearance.js');
assert(component.includes("const VERSION='3.1.0'")&&component.includes('ThemeContract.resolveComponentAppearance'));
const css=read('src/styles/theme/component-appearance.css');
assert(!/\.topbar-primary[^}]*box-shadow:[^}]*0 0 0 2px/s.test(css),'Core must not hardcode a theme-specific standalone halo.');
assert(!/\.topbar-primary[^}]*toolbar-group[^}]*box-shadow:none/s.test(css),'Core must not hardcode grouped depth for every Theme.');

const automation=read('src/diagnostics/automation-test-runtime.js');
assert(automation.includes("const VERSION='1.33.0'")&&automation.includes("contractVersion==='3.10.0'"));
console.log('v3.67.10 Theme Contract 3.10 contextual composition PASS: Core composes bounded Component/Material contexts and depth for Default, Thin Glass and Aurora without selector-owned Theme paint.');
