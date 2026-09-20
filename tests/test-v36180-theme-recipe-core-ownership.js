'use strict';
const sdkAtLeast=(value,floor)=>{const a=String(value||'0.0.0').split('.').map(Number),b=String(floor||'0.0.0').split('.').map(Number);for(let i=0;i<3;i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const readComposition=require('./helpers/read-composition');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));


assert(sdkAtLeast(json('sdk/contract.json').sdkVersion,'1.49.0'));
assert.equal(json('sdk/contract.json').pluginApiVersion,'1.19.0');
assert.equal(json('sdk/contract.json').themeContractVersion,'3.10.0');

const material=read('src/core/theme/material-renderer.js');
const renderer=read('src/styles/theme/material-renderer.css');
for(const recipe of ['thin-glass','soft-glass','liquid-glass'])assert(renderer.includes(`[data-dkds-material-recipe="${recipe}"]`),`Material composition must remain recipe-owned for ${recipe}.`);
assert(renderer.includes('[data-dkds-material-content="true"]')&&renderer.includes('background-color:transparent'),'Translucent recipes must flatten declared nested content through the Material Renderer.');
assert(material.includes('nestedParentOwnsChrome'),'Nested material ownership helper missing.');
assert(!material.includes('thinGlassActive'),'Core renderer must not special-case the built-in profile.');
assert(!material.includes("profile?.()==='builtin.thin-glass'"),'Core renderer must not branch on built-in Thin Glass identity.');

const kernel=readComposition(root,'src/core/plugins/kernel');
assert(kernel.includes("const TRANSLUCENT_COMMAND_MENU_RECIPES=new Set(['thin-glass','soft-glass','liquid-glass'])"),'Popover Backdrop Root policy must be recipe-owned.');
assert(kernel.includes("globalThis.DKDSTheme?.recipePolicy?.()?.popover"),'Popover portal must read the resolved popover recipe.');
assert(!kernel.includes("profile?.()==='builtin.thin-glass'"),'Popover portal must not special-case built-in Thin Glass.');
assert(kernel.includes("document.querySelectorAll('.menu-anchor .command-menu')"),'Shell menu ownership boundary must remain explicit.');

const roles=read('src/styles/theme/material-roles.css');
for(const marker of ['--dkds-material-fill-floor:58%','--dkds-material-fill-floor:62%','--dkds-material-fill-floor:78%','--dkds-material-fill-opacity:max('])
  assert(roles.includes(marker),`Core glass legibility invariant missing ${marker}`);
const controlBlock=roles.match(/\[data-dkds-material-role="control"\][\s\S]*?\n\}/)?.[0]||'';
assert(controlBlock.includes('--dkds-material-shadow:none'),'Core control Material Role must not impose recessed/elevated shadow paint.');

assert(!renderer.includes('data-dkds-theme-profile="builtin.thin-glass"'),'Renderer CSS must not contain profile-id patches.');
for(const recipe of ['thin-glass','soft-glass','liquid-glass']){
  const block=renderer.match(new RegExp(`\\[data-dkds-material-recipe="${recipe}"\\]\\{[\\s\\S]*?\\n\\}`))?.[0]||'';
  assert(block.includes('--dkds-material-fill-opacity'),`${recipe} must consume the same semantic fill-opacity pipeline.`);
}
const componentAppearance=read('src/styles/theme/component-appearance.css');
assert(renderer.includes('Popover surfaces own the optical material')&&componentAppearance.includes('[data-dkds-component-identity="menuItem"]'),'Popover Material Renderer must leave menu-row paint to canonical Component Appearance instead of class-based opaque-action exceptions.');
assert(componentAppearance.includes(':where([data-dkds-material-recipe="thin-glass"],[data-dkds-material-recipe="soft-glass"],[data-dkds-material-recipe="liquid-glass"]) [data-dkds-component-identity="field"]'),'Glass field appearance must remain recipe-aware while Component Appearance is the sole field-paint owner.');
assert(componentAppearance.includes('[data-dkds-component-identity="field"]{box-sizing:border-box')&&componentAppearance.includes('box-shadow:none'),'Canonical field appearance must suppress legacy recessed paint.');

const integrated=read('src/styles/theme/integrated-command-chrome.css');
assert(renderer.includes('.dkds-integrated-action-group.dkds-material-role-control')&&renderer.includes('border-radius:9px'),'Material Renderer must own the standalone integrated command shell.');
assert(componentAppearance.includes('[data-dkds-component-identity="toolbarAction"]'),'Component Appearance must remain the sole integrated action-paint owner.');
assert(!integrated.includes('background:var(--dkds-material-base,var(--dkui-control-bg));')&&!integrated.includes('var(--dkui-accent) var(--dkds-material-tint'),'Integrated-command Theme CSS must not re-own semantic Material fill or misuse fill opacity as accent tint.');

const runtime=read('src/core/theme/runtime.js');
const thinTheme=read('src/plugins/thin-glass-theme/plugin.js');
assert(!runtime.includes("profiles.set('builtin.thin-glass'"),'Core Theme Runtime must not own the Thin Glass profile.');
assert(thinTheme.includes('canvas:'),'Thin Glass light canvas hierarchy token missing.');
assert(thinTheme.includes('surface:')&&thinTheme.includes('surfaceSidebar:')&&thinTheme.includes('surfaceElevated:'),'Thin Glass light surfaces must retain distinct semantic hierarchy instead of collapsing toward one paint value.');
assert(thinTheme.includes("elevated:'thin-glass'")&&thinTheme.includes("popover:'thin-glass'"),'Large windows and popovers must retain Thin Glass.');

const template=read('sdk/templates/theme-profile/plugin.js');
for(const bad of ['materialTintOpacity:.03','materialTintOpacity:.045','materialTintOpacity:.055','materialTintOpacity:.02','materialTintOpacity:.05','materialTintOpacity:.015','materialTintOpacity:.07'])
  assert(!template.includes(bad),`SDK Theme template still teaches unreadably transparent glass: ${bad}`);
assert(template.includes('materialTintOpacity:.66')&&template.includes('materialTintOpacity:.84'),'SDK Theme template must demonstrate readable glass fill values.');
assert(template.includes('semantic base-material')&&template.includes('not an accent-color tint amount'),'SDK template must explain materialTintOpacity semantics.');

const themeDoc=read('sdk/THEME_CONTRACT.md');
assert(themeDoc.includes('semantic **base-material fill**'),'Theme Contract must document base-fill semantics.');
assert(themeDoc.includes('`popover` 78%'),'Theme Contract must document Core readability floors.');
assert(!themeDoc.includes('Accent tint using `materialTintOpacity`'),'Theme Contract must not describe the token as accent tint.');
const sdkReadme=read('sdk/README.md');
assert(sdkReadme.includes(`SDK ${json('sdk/contract.json').sdkVersion}`),'SDK README must describe the current Theme authoring baseline.');

const validator=read('sdk/tools/dkds-plugin.js');
assert(validator.includes('GLASS_FILL_FLOORS'),'SDK validator must expose low-opacity glass authoring warnings.');
assert(validator.includes('runtime will clamp the effective glass fill'),'SDK validator warning must explain Core clamping.');

console.log('v3.61.81 recipe-owned Core/SDK glass architecture checks passed.');
