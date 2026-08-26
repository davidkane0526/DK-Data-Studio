'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const readComposition=require('./helpers/read-composition');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
assert.equal(json('package.json').version,'3.61.93');

// builtin.default remains clear because composition is gated by recipe, not profile id.
const runtime=read('src/core/theme/runtime.js');
assert(runtime.includes("profiles.set('builtin.default'"));
assert(runtime.includes("recipes:{chrome:'clear',sidebar:'clear',surface:'clear',elevated:'clear',popover:'clear',control:'clear',floating:'clear'}"),'Default theme must remain all-clear.');
const rendererCss=read('src/styles/theme/material-renderer.css');
assert(!rendererCss.includes('data-dkds-theme-profile="builtin.thin-glass"'),'Theme-specific Core CSS is forbidden; composition must be recipe-owned.');
for(const recipe of ['thin-glass','soft-glass','liquid-glass'])assert(rendererCss.includes(`[data-dkds-material-recipe="${recipe}"]`),`Missing recipe-owned composition for ${recipe}.`);

const actions=readComposition(root,'src/core/ui/composition');
assert(actions.includes("'dkds-action-group','dkds-integrated-action-group','dkds-material-role-control'"),'ActionGroup semantic role contract must be preserved.');
const portable=readComposition(root,'src/core/ui/composition');
assert(portable.includes("'dkds-plot-view-actions','dkds-integrated-action-group'")&&!portable.includes("'dkds-plot-view-actions','dkds-integrated-action-group','dkds-material-role-control'"),'PlotView header actions must remain integrated but be owned by the chrome MaterialSurface.');
const resonance=read('src/plugins/resonance-workbench/view-components.js');
assert(resonance.includes('id="resparRangeMenu" class="respar-range-menu command-menu hidden"'),'Resonance box-selection menu contract must remain present.');

// Shell menu management must not close plugin-owned command menus such as resparRangeMenu.
const kernel=readComposition(root,'src/core/plugins/kernel');
assert(kernel.includes('function shellCommandMenus()'),'Shell command menus need an explicit ownership boundary.');
assert(kernel.includes("document.querySelectorAll('.menu-anchor .command-menu')"),'Only shell menu-anchor command menus should be collected.');
assert(kernel.includes("document.querySelectorAll('.command-menu.dkds-command-menu-portal')"),'Portaled shell menus must remain manageable.');
assert(kernel.includes('shellCommandMenus().forEach(menu=>{if(menu!==except)closeCommandMenu(menu);});'),'closeOtherCommandMenus must only close shell-owned menus.');
assert(!kernel.includes("function closeOtherCommandMenus(except=null){\n    document.querySelectorAll('.command-menu')"),'Plugin-owned command menus must never be globally closed by shell menu logic.');
assert(kernel.includes("globalThis.DKDSTheme?.recipePolicy?.()?.popover"),'Popover portal must be recipe-owned.');
assert(kernel.includes('else menu.classList.remove(\'hidden\');'),'Clear/default recipe must use the original in-place menu behavior.');

const material=read('src/core/theme/material-renderer.js');
assert(material.includes('if(nestedParentOwnsBackdrop(el))return \'\';'),'Nested chrome suppression must depend on a translucent parent recipe.');
assert(material.includes("if(role==='control'&&el.matches?.(INTEGRATED_CHILD_SELECTOR))return ''"),'Integrated child controls must not become nested material recipes.');

console.log('v3.61.81 default-theme isolation, recipe ownership and box-selection menu ownership checks passed.');
