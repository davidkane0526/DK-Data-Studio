const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const Theme=require('../sdk/theme-contract');

const sdk=json('sdk/contract.json');
assert.equal(sdk.sdkVersion,'1.24.0');
assert.equal(sdk.pluginApiVersion,'1.19.0');
assert.equal(sdk.themeContractVersion,'3.10.0');
assert.equal(sdk.minimumAppVersion,'3.67.10');
assert.equal(Theme.version,'3.10.0');
assert(Theme.supports('contract.appearance.roles'));
assert(Theme.supports('contract.scientific.seriesPalette'));
const SourceContract=require('../sdk/source-contract');
assert(SourceContract.usesThemeRegister("ctx.ui.theme.register('x',{});"));
assert(SourceContract.usesThemeRegister("const theme=ctx.ui.theme; theme.register('x',{});"));
assert(SourceContract.usesThemeRegister("const {register:addTheme}=ctx.ui.theme; addTheme('x',{});"));
assert(!SourceContract.usesThemeRegister("const theme=ctx.ui.theme; theme.activate('x');"));


const aurora=Theme.validateProfile({
  label:'Aurora semantic sample',
  appearance:{roles:{chrome:{surface:'#F3F1FC'},sidebar:{surface:'#EEF7F5'},elevated:{surface:'#FFF5F8'},popover:{surface:'#EEF0FF'},floating:{surface:'#ECF8FA'}}},
  scientific:{seriesPalette:['#705CE8','#17A7A0','#D96A91']},
  modes:{
    light:{tokens:{canvas:'#F5F7FC',surface:'#FFFFFF',accent:'#705CE8',accentAlt:'#17A7A0',success:'#15803D',warning:'#B45309',danger:'#C2414B',info:'#2563EB',selectionSurface:'rgba(112,92,232,.14)',selectionText:'#352A79',selectionBorder:'rgba(112,92,232,.45)',activeSurface:'rgba(23,167,160,.13)',activeText:'#0D615D',disabledSurface:'#EEF1F5',disabledText:'#98A2B3'}},
    dark:{appearance:{roles:{sidebar:{surface:'#14262B'}}},tokens:{canvas:'#101420',surface:'#171C28',accent:'#9887FF',accentAlt:'#39C5BC'}}
  }
},'aurora');
const light=Theme.resolveProfile(aurora,'light');
const dark=Theme.resolveProfile(aurora,'dark');
assert.equal(light.appearance.roles.chrome.surface,'#F3F1FC');
assert.equal(light.appearance.roles.sidebar.surface,'#EEF7F5');
assert.equal(dark.appearance.roles.sidebar.surface,'#14262B');
assert.deepEqual(light.scientific.seriesPalette,['#705CE8','#17A7A0','#D96A91']);
assert.equal(light.tokens.accentAlt,'#17A7A0');
assert.equal(light.tokens.danger,'#C2414B');
assert.throws(()=>Theme.validateProfile({appearance:{roles:{sidebar:{gradient:'no'}}}},'bad'),/gradient|unsupported/i);
assert.throws(()=>Theme.validateProfile({appearance:{roles:{unknown:{surface:'#fff'}}}},'bad'),/unknown|role/i);
assert.throws(()=>Theme.validateProfile({scientific:{seriesPalette:['#fff']}},'bad'),/2|seriesPalette/i);
assert.throws(()=>Theme.validateProfile({scientific:{seriesPalette:['#fff','not-a-color']}},'bad'),/hex|rgb|hsl|transparent/i);

const roleCss=read('src/styles/theme/material-roles.css');
for(const role of ['chrome','sidebar','surface','elevated','popover','control','floating']){
  assert(roleCss.includes(`--dkui-role-${role}-surface`),`${role} must consume role-specific surface with a base fallback`);
  assert(roleCss.includes(`--dkui-role-${role}-border`),`${role} must consume role-specific border`);
  assert(roleCss.includes(`--dkui-role-${role}-text`),`${role} must consume role-specific text`);
}
const runtime=read('src/core/theme/runtime.js');
for(const token of ['--dkui-accent-alt','--dkui-success','--dkui-selection-surface','--dkui-active-surface','--dkui-disabled-surface','appearanceRoles','scientificSnapshot']) assert(runtime.includes(token),`Theme runtime missing ${token}`);
const rendererCss=read('src/styles/theme/material-renderer.css');
const componentCss=read('src/styles/theme/component-appearance.css');
assert(roleCss.includes('--dkds-material-base:var(--dkui-role-control-surface,var(--dkui-control-bg))')&&componentCss.includes('[data-dkds-component-identity="field"]{box-sizing:border-box')&&componentCss.includes('background:var(--dkui-component-field-surface,var(--dkui-control-bg))'),'Control role context must reach actual field paint through canonical Component Appearance.');
assert(rendererCss.includes('--dkui-role-popover-text'),'Popover role text override must reach Core renderer.');
const shellCss=read('src/styles/presentation/shell.css');
assert(!shellCss.includes('#637188'),'Dark disabled controls must not bypass Theme 3.8 disabledText with a hard-coded presentation color.');
assert(!shellCss.includes('color-mix(in srgb,var(--dkui-accent) 18%,var(--dkui-surface-soft))'),'Dark active controls must not reconstruct active paint from accent after semantic active tokens are resolved.');
for(const token of ['--dkui-selection-surface','--dkui-selection-text','--dkui-selection-border','--dkui-active-surface','--dkui-active-text','--dkui-disabled-surface','--dkui-disabled-text']) assert(shellCss.includes(token),`Shell must consume semantic interaction token ${token}`);
assert(componentCss.includes('var(--dkui-component-tab-surface-active,var(--dkui-active-surface))')&&componentCss.includes('var(--dkui-component-tab-text-active,var(--dkui-active-text))'),'Active project tabs must consume semantic active appearance through the canonical tab Component Appearance renderer.');
assert(/\.dataset-item\.selected\{[^}]*var\(--dkui-selection-surface\)[^}]*var\(--dkui-selection-text\)/s.test(shellCss),'Selected dataset rows must consume Theme 3.8 selection semantics.');

global.window={addEventListener(){},removeEventListener(){}};
const {SeriesRegistry}=require('../src/core/ui/modules/series/layout');
globalThis.DKDSTheme={scientific:()=>({seriesPalette:['#111111','#222222','#333333']})};
const reg=new SeriesRegistry('theme-test');
assert.equal(reg.register({id:'auto'}).color,'#111111');
assert.equal(reg.register({id:'explicit',color:'#ABCDEF'}).color,'#ABCDEF');
globalThis.DKDSTheme={scientific:()=>({seriesPalette:['#999999','#888888']})};
assert.equal(reg.get('auto').color,'#999999','implicit series colors must follow active Theme palette');
assert.equal(reg.get('explicit').color,'#ABCDEF','explicit scientific colors must never be overwritten by Theme');
delete globalThis.DKDSTheme;
delete global.window;

const presentationModel=read('src/core/ui/modules/presentation/model.js');
const mobile=read('src/core/ui/modules/presentation/presenters.js');
assert(presentationModel.includes('appearance:window.DKDSTheme?.appearanceRoles?.()')&&mobile.includes('themeAppearance:core.theme.appearance'));
assert(presentationModel.includes('scientific:window.DKDSTheme?.scientific?.()')&&mobile.includes('themeScientific:core.theme.scientific'));

const template=json('sdk/templates/theme-profile/plugin.json');
assert.equal(template.compatibility.themeContract,'^3.10.0');
const thin=json('src/plugins/thin-glass-theme/plugin.json');
assert.equal(thin.version,'1.12.2');
assert.equal(thin.compatibility.themeContract,'^3.10.0');

const sdkTool=read('sdk/tools/dkds-plugin.js'),packageRuntime=read('desktop/plugin-package.js');
assert(sdkTool.includes('usesThemeRegister(rawSource)'),'Standalone SDK must share Theme registration-source recognition.');
assert(packageRuntime.includes('usesThemeRegister(themeSource)'),'Application package ingestion must share Theme registration-source recognition.');
const thinJs=read('src/plugins/thin-glass-theme/plugin.js');
assert(thinJs.includes("'contract.appearance.roles'")&&thinJs.includes("'contract.scientific.seriesPalette'"));

const coreFiles=['src/core/theme/runtime.js','src/core/theme/material-renderer.js','src/styles/theme/material-roles.css','src/styles/theme/material-renderer.css'];
for(const file of coreFiles){const text=read(file).toLowerCase();assert(!text.includes('aurora-pop')&&!text.includes('aurora pop'),'Core must not contain Aurora theme identity special cases.');}
console.log('v3.64.0 historical semantic appearance/scientific palette compatibility retained under current Theme Contract 3.10 / SDK 1.24 PASS');
