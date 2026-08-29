'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const readComposition=require('./helpers/read-composition');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));


const runtime=read('src/core/theme/runtime.js');
const thinTheme=read('src/plugins/thin-glass-theme/plugin.js');
assert(thinTheme.includes("elevated:'thin-glass'"),'Large elevated windows such as LAN Web and AI/MCP must use Thin Glass when the Thin Glass Theme is active.');
for(const token of ["id:'com.dkds.theme.liquid-glass'","canvas:","surface:","surfaceElevated:","surfaceSidebar:","controlBorder:","popover:{materialBlur:10","floating:{materialBlur:8"])
  assert(thinTheme.includes(token),`Thin Glass Theme 3.8 profile missing ${token}`);
assert(!runtime.includes("profiles.set('builtin.thin-glass'"),'Core Theme Runtime must not own the Thin Glass product profile.');

const material=read('src/core/theme/material-renderer.js');const semantic=read('src/core/theme/semantic-registry.js');
assert(semantic.includes(".dkds-dialog,.dkds-dialog-shell,.dkds-settings-dialog,.update-panel,.lan-web-panel")&&semantic.includes("return 'elevated'"),'LAN Web / dialog surfaces must remain elevated Material roles while persistent pages stay surface-owned.');
assert(material.includes("const TRANSLUCENT_RECIPES=new Set(['thin-glass','soft-glass','liquid-glass'])"),'Nested composition must be recipe-owned.');
assert(material.includes('nestedParentOwnsBackdrop')&&!material.includes('thinGlassActive'),'Nested header suppression must be recipe-owned rather than built-in-profile-owned.');

const rendererCss=read('src/styles/theme/material-renderer.css');
assert(!rendererCss.includes('data-dkds-theme-profile="builtin.thin-glass"'),'Renderer composition must never depend on the built-in Thin Glass profile id.');
assert(rendererCss.includes('.command-menu.dkds-command-menu-portal'),'Command menus must support body-level popover portal rendering.');
assert(rendererCss.includes('[data-dkds-material-content="true"]'),'Large glass windows must expose transparent content layers behind the owner surface.');
const integratedChrome=read('src/styles/theme/integrated-command-chrome.css');
assert(integratedChrome.includes('.statusbar-command-cluster')&&integratedChrome.includes('[data-dkds-material-role="chrome"]'),'Integrated Command Chrome must fuse the statusbar command group with its parent material without taking over button state paint.');

const kernel=readComposition(root,'src/core/plugins/kernel');
for(const fn of ['portalCommandMenu','restoreCommandMenu','closeCommandMenu','positionCommandMenuPortal','repositionPortaledCommandMenus'])
  assert(kernel.includes(`function ${fn}`),`Command-menu Backdrop Root escape missing ${fn}.`);
assert(kernel.includes("const TRANSLUCENT_COMMAND_MENU_RECIPES=new Set(['thin-glass','soft-glass','liquid-glass'])"),'Command-menu portal must follow the resolved popover recipe.');
assert(kernel.includes("globalThis.DKDSTheme?.recipePolicy?.()?.popover"),'Command-menu portal must consume Theme recipe policy.');
assert(!kernel.includes("profile?.()==='builtin.thin-glass'"),'Command-menu portal must not special-case the built-in profile.');

const index=read('src/index.html');
assert(index.includes('class="floating-body lan-web-body" data-dkds-material-content="true"'),'LAN Web body must expose the glass content-layer marker.');
const ai=read('src/plugins/connectivity-center/plugin.js');
assert(ai.includes('class="dkai-settings-body" data-dkds-material-content="true"'),'AI Agent/MCP body must expose the glass content-layer marker.');

console.log('v3.61.81 glass large-window and recipe-owned portal invariants passed.');
