'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert.equal(json('package.json').version,'3.61.54','theme contract test tracks the current source version for the Theme Contract 2.0 release');
const theme=read('src/core/theme-runtime.js');
const css=read('src/ui-modern.css');
const ui=read('src/core/ui-infrastructure.js');
const kernel=read('src/core/plugin-kernel.js');
const contract=read('src/core/plugin-contract-runtime.js');
const sdkSchema=json('sdk/plugin-manifest.schema.json');
const mobileHost=read('src/core/mobile-host-runtime.js');
const mobileShell=read('mobile/src/Shell.tsx');
const mobileApp=read('mobile/App.tsx');
const apiTypes=read('sdk/plugin-api.d.ts');
const themeTemplate=read('sdk/templates/theme-profile/plugin.js');

for(const token of ["version:'2.0.0'",'pendingProfile','registerProfile','unregisterProfile','setProfile','listProfiles','PUBLIC_TOKEN_MAP','dividerHover','controlBorder','scrollbarHover']){
  assert(theme.includes(token),`Theme Runtime 2.0 contract missing ${token}`);
}
for(const token of ['--dkui-divider:','--dkui-control-border:','--dkui-scrollbar:','--surface-sidebar:','--control-border:']){
  assert(css.includes(token),`semantic visual token missing ${token}`);
}
assert(css.includes('background:transparent!important;box-shadow:none!important')&&css.includes('--dkui-divider-hover'),'Core splitters must have no idle structural line and only reveal a semantic active divider during interaction.');
assert(css.includes('background:var(--dkui-surface-sidebar,var(--surface-sidebar))!important')&&css.includes('.left-panel>section'),'parameter sidebars must be separated by surface contrast instead of bright rules.');
assert(css.includes('background:var(--dkui-control-bg,var(--surface-primary))!important')&&css.includes('border-color:var(--dkui-control-border,var(--control-border))!important'),'legacy inputs must be normalized through semantic dark/light control tokens.');
assert(css.includes('.lan-web-qr-image{background:#fff;border-color:#fff}')&&css.includes('.lan-web-qr-frame{background:var(--dkui-surface-soft)!important'),'only actual QR pixels may retain white paper while the LAN service chrome remains themeable.');
assert(css.includes('.pulse-card-heading{')&&css.includes('grid-template-columns:minmax(0,1fr) auto!important')&&css.includes('.dkds-surface-heading-stack'),'portable/chart headers must reserve independent text and control columns so title/description cannot overlap actions.');
assert(ui.includes("header.classList.add('dkds-surface-header')")&&ui.includes("headingStack.classList.add('dkds-surface-heading-stack')"),'PortableView must stamp Core-owned semantic header classes.');
assert(ui.includes("this.handle.classList.add('is-dragging')")&&ui.includes("this.handle.classList.remove('is-dragging')"),'splitters must expose interaction state to the semantic divider theme.');
assert(kernel.includes('theme: {')&&kernel.includes('window.DKDSTheme?.registerProfile?.'),'plugins must be able to register theme profiles through Core rather than painting host DOM directly.');
assert(contract.includes("'ui.theme':api=>!!api?.ui?.theme"),'Plugin Capability contract must expose ui.theme.');
assert((sdkSchema.properties?.requiresCore?.items?.enum||[]).includes('ui.theme'),'SDK manifest schema must declare ui.theme capability.');
assert(mobileHost.includes('themeTokens:window.DKDSTheme?.tokens?.()||{}')&&mobileApp.includes('themeTokens: row.themeTokens')&&mobileApp.includes('paletteFor(shell.theme, shell.themeTokens || {})'),'Theme profile tokens must cross the WebView/native shell bridge.');
assert(mobileShell.includes('divider: string')&&mobileShell.includes('controlBorder: string')&&mobileShell.includes('nativeThemeColor(tokens.divider')&&mobileShell.includes('nativeThemeColor(tokens.controlBorder'),'Native mobile chrome must consume the same semantic divider/control-border channels as desktop themes.');
assert(apiTypes.includes('DKDSThemeCapability')&&apiTypes.includes('theme:DKDSThemeCapability'),'Standalone SDK types must expose the additive ui.theme authoring contract.');
assert(themeTemplate.includes("ctx.ui.theme.register('default'")&&themeTemplate.includes("ctx.ui.theme.activate('default')"),'SDK must ship a first-class semantic theme-plugin template.');
const pluginFiles=[];const walk=dir=>{for(const ent of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const rel=path.join(dir,ent.name);if(ent.isDirectory())walk(rel);else if(/\.(?:js|css)$/.test(ent.name))pluginFiles.push(rel);}};walk('src/plugins');
for(const rel of pluginFiles){const source=read(rel);assert(!/background(?:-color)?\s*:\s*(?:#fff(?:fff)?\b|rgba\(255\s*,\s*255\s*,\s*255)/i.test(source),`first-party plugin theme surface must be semantic, found light-only background in ${rel}`);}
console.log('v3.61.54 semantic Theme Contract 2.0 checks passed.');
