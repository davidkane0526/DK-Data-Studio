'use strict';
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const {readMobileShell}=require('./mobile-shell-source');
const {readMobileApp}=require('./mobile-app-source');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));


const theme=read('src/core/theme/runtime.js');
const materialRenderer=read('src/core/theme/material-renderer.js');
const css=readCoreCss(root);
const ui=read('src/generated/runtime/ui-infrastructure.js');
const kernel=read('src/generated/runtime/plugin-kernel.js');
const contract=read('src/core/plugins/contract-runtime.js');
const sdkSchema=json('sdk/plugin-manifest.schema.json');
const mobileHost=read('src/core/host/mobile-host-runtime.js');
const presentationModel=read('src/core/ui/modules/presentation/model.js');
const presenters=read('src/core/ui/modules/presentation/presenters.js');
const mobileShell=readMobileShell(root);
const mobileApp=readMobileApp(root);
const apiTypes=read('sdk/plugin-api.d.ts');
const themeTemplate=read('sdk/templates/theme-profile/plugin.js');
const themeTemplateManifest=json('sdk/templates/theme-profile/plugin.json');

for(const token of ["version:'3.10.0'",'pendingProfile','registerProfile','unregisterProfile','setProfile','listProfiles','PUBLIC_TOKEN_MAP','dividerHover','controlBorder','scrollbarHover']){
  assert(theme.includes(token),`Theme Runtime 3.6 contract missing ${token}`);
}
assert(materialRenderer.includes("const VERSION='3.11.0'")&&materialRenderer.includes("'thin-glass'"),'current Gate-aware Material Renderer must own material recipes rather than Theme Runtime.');
for(const token of ['--dkui-divider:','--dkui-control-border:','--dkui-scrollbar:','--surface-sidebar:','--control-border:']){
  assert(css.includes(token),`semantic visual token missing ${token}`);
}
assert(css.includes('background:transparent;box-shadow:none')&&css.includes('--dkui-divider-hover'),'Core splitters must have no idle structural line and only reveal a semantic active divider during interaction.');
assert(materialRenderer.includes("fallbackToken:'surfaceSidebar'")&&materialRenderer.includes("cssVar:'--dkui-role-sidebar-surface'")&&css.includes('.dkds-material-role-sidebar')&&css.includes('--dkds-material-base:var(--dkui-role-sidebar-surface,var(--dkui-surface-sidebar))'),'parameter sidebars must consume role-specific sidebar appearance with surfaceSidebar as the Core fallback.');
assert(!/\.dkds-analysis-left\s*\{[^}]*background\s*:/i.test(css)&&!/\.left-panel\s*>\s*section\s*\{[^}]*background\s*:/i.test(css),'Presentation CSS must not repaint Sidebar base surfaces behind the Material role owner.');
const componentAppearance=read('src/styles/theme/component-appearance.css');
assert(componentAppearance.includes('[data-dkds-component-identity="field"]')&&componentAppearance.includes('background:var(--dkui-component-field-surface,var(--dkui-control-bg))')&&componentAppearance.includes('border:1px solid var(--dkui-component-field-border,var(--dkui-control-border))'),'Core form controls must resolve once through canonical Field Component Appearance and semantic dark/light tokens.');
const connectivityCss=read('src/styles/presentation/connectivity.css');
assert(/\.lan-web-qr-image\s*\{[^}]*background:#fff[^}]*(?:border-color:#fff|border:[^;}]*#fff)/i.test(connectivityCss),'QR image content must retain a white paper border/background for scan reliability.');
const nonQrConnectivity=connectivityCss.replace(/[^{}]*\.lan-web-qr-image[^{}]*\{[^{}]*\}/g,'');
assert(!/#[0-9a-f]{3,8}\b/i.test(nonQrConnectivity)&&/lan-web-qr-frame[^}]*background:var\(--dkui-surface-soft\)/i.test(connectivityCss),'only actual QR pixels may retain literal white while the LAN service chrome remains semantic/themeable.');
const pulseCss=read('src/plugins/pulse-analysis/plugin.css');
assert(!/\.pulse-card-heading[^{}]*\{[^}]*grid-template-columns/.test(pulseCss)&&css.includes('.dkds-surface-heading-stack'),'standard SurfaceHeader geometry must be Core-owned; plugins may only supply domain layout around the shared heading/action contract.');
assert(ui.includes("header.classList.add('dkds-surface-header')")&&ui.includes("headingStack.classList.add('dkds-surface-heading-stack')"),'PortableView must stamp Core-owned semantic header classes.');
assert(ui.includes("this.handle.classList.add('is-dragging')")&&ui.includes("this.handle.classList.remove('is-dragging')"),'splitters must expose interaction state to the semantic divider theme.');
assert(kernel.includes('theme: Object.freeze({')&&kernel.includes('window.DKDSTheme?.registerProfile?.'),'plugins must be able to register theme profiles through Core rather than painting host DOM directly.');
assert(contract.includes("'ui.theme':api=>!!api?.ui?.theme"),'Plugin Capability contract must expose ui.theme.');
assert((sdkSchema.properties?.requiresCore?.items?.enum||[]).includes('ui.theme'),'SDK manifest schema must declare ui.theme capability.');
assert(presentationModel.includes('tokens:window.DKDSTheme?.tokens?.()||{}')&&presenters.includes('themeTokens:core.theme.tokens')&&mobileApp.includes('themeTokens: row.themeTokens')&&mobileApp.includes('paletteFor(shell.theme, shell.themeTokens || {})'),'Theme profile tokens must cross the Core Presentation Model / Mobile Presenter bridge.');
assert(mobileShell.includes('divider: string')&&mobileShell.includes('controlBorder: string')&&mobileShell.includes('nativeThemeColor(tokens.divider')&&mobileShell.includes('nativeThemeColor(tokens.controlBorder'),'Native mobile chrome must consume the same semantic divider/control-border channels as desktop themes.');
assert(apiTypes.includes('DKDSThemeCapability')&&apiTypes.includes('theme:DKDSThemeCapability'),'Standalone SDK types must expose the additive ui.theme authoring contract.');
assert(themeTemplate.includes("ctx.ui.theme.register('default'")&&themeTemplateManifest.pluginType==='theme'&&themeTemplateManifest.entry==='plugin.js','SDK must ship a first-class semantic theme-plugin template.');
const pluginFiles=[];const walk=dir=>{for(const ent of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const rel=path.join(dir,ent.name);if(ent.isDirectory())walk(rel);else if(/\.(?:js|css)$/.test(ent.name))pluginFiles.push(rel);}};walk('src/plugins');
for(const rel of pluginFiles){const source=read(rel);assert(!/background(?:-color)?\s*:\s*(?:#fff(?:fff)?\b|rgba\(255\s*,\s*255\s*,\s*255)/i.test(source),`first-party plugin theme surface must be semantic, found light-only background in ${rel}`);}
console.log('Theme Contract 3.8 semantic ownership checks passed.');
