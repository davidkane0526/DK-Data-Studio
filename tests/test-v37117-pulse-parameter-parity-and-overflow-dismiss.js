'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const layoutSpec=read('src/core/ui/modules/composition/unit-template-layout-spec.js');
const pulse=read('src/plugins/pulse-analysis/unit-presentation.js');
const pulseCss=read('src/plugins/pulse-analysis/plugin.css');
const shell=read('src/core/plugins/kernel/modules/shell/context-toolbar.js');
const menuRuntime=read('src/core/ui/modules/interaction/context-actions.js');
const transientRegistry=read('src/core/ui/modules/interaction/transient-registry.js');

// Pulse source parity: the generic file toolbar stays horizontal and its real
// intrinsic overflow may raise the parameter Drawer. Pulse no longer owns a
// 310/260 px collapse target; its form uses accepted fluid two-column geometry.
assert(/'file-toolbar':Object\.freeze\(\{display:'flex',gapPx:7,marginTopPx:9,padding:'8px 10px',minWidth:0\}\)/.test(layoutSpec),
  'Generic file-toolbar Unit must remain a horizontal common-denominator recipe with no Pulse-derived responsive threshold.');
assert(!/'file-toolbar'[^\n]+maxWidth:520/.test(layoutSpec),
  'Generic file-toolbar Unit must not force the historical <=520 px column regression.');
assert(pulse.includes("variant:'file-toolbar',className:'pulse-file-toolbar dkds-toolbar'")&&!pulse.includes("maxWidth:310,geometry:{flexDirection:'column',alignItems:'stretch'}"),
  'Pulse file toolbar must stay horizontal and let live intrinsic width, not a private breakpoint, raise the Drawer.');
assert(pulse.includes("variant:'form-grid-2',className:'pulse-control-grid'")&&!pulse.includes("gridTemplateColumns:'repeat(2,minmax(0,1fr))'"),
  'Pulse parameter form must use the canonical form-grid-2 Unit recipe; plugin source must not own the two-column geometry.');
assert(!pulseCss.includes('.pulse-file-toolbar{flex-direction:column;align-items:stretch}'),
  'Pulse stylesheet must not remain a second file-toolbar responsive owner after the Unit contract adopts the accepted breakpoint.');

// Context overflow: the trigger is part of the interaction boundary so the
// window capture-phase outside handler cannot close/reopen it on the same click.
assert(menuRuntime.includes("anchor=resolveElement(this.spec?.anchor)||this.spec?.anchor||null"),
  'ContextMenu must resolve an optional anchor as part of its interaction boundary.');
assert(menuRuntime.includes("anchor?.contains?.(target)||anchor===target"),
  'Pointerdown on a declared menu anchor must not be treated as an outside dismissal.');
assert(shell.includes("new Menu('core.shell',{anchor:button"),
  'Context overflow must declare its trigger as the ContextMenu anchor.');
assert(transientRegistry.includes('const OPEN_CONTEXT_MENUS=new Set()')&&transientRegistry.includes('function dismissAllContextMenus()')&&menuRuntime.includes('registerContextMenu(this)')&&menuRuntime.includes('unregisterContextMenu(this)'),
  'Core transient menus must have one lightweight registry so Presenter lifecycle changes can dismiss every open popup without importing menu/shortcut geometry.');
assert(menuRuntime.includes("this.menuActionId===String(action.id||'')")&&menuRuntime.includes('this.menu.dispose();this.menu=null'),
  'ActionGroup menu trigger must toggle the same menu closed instead of closing then reopening it.');


// Runtime lifecycle evidence: Presentation can close every transient menu through
// the lightweight registry without importing/recreating the menu implementation.
const transient=require('../src/core/ui/modules/interaction/transient-registry');
let closeCalls=0;
const transientMenu={close(){closeCalls++;transient.unregisterContextMenu(this);}};
transient.registerContextMenu(transientMenu);
assert.strictEqual(transient.openContextMenuCount(),1,'Transient registry must own one live menu membership.');
assert.strictEqual(transient.dismissAllContextMenus(),0,'Global dismiss must synchronously release the live menu membership.');
assert.strictEqual(closeCalls,1,'Global dismiss must invoke the real transient owner exactly once.');

// Electron drag regions do not dispatch ordinary DOM clicks. While this menu is
// open, Core temporarily makes topbar blank space no-drag so one blank-area
// click can dismiss the menu; the class is always removed on close.
assert(shell.includes("StyleGate.set(topbar,'-webkit-app-region','no-drag'"),
  'Opening context overflow must temporarily make draggable topbar blank space clickable through the runtime StyleGate.');
assert(shell.includes("StyleGate.remove(topbar,'-webkit-app-region'"),
  'Closing context overflow must restore the frozen topbar drag geometry through the same runtime owner.');
assert((shell.match(/setTopbarBlankDismissible\(false\)/g)||[]).length>=2&&shell.includes('setTopbarBlankDismissible(true)'),
  'Both explicit close and ContextMenu onClose must restore drag behavior, and successful open must enable blank-area dismissal.');

console.log('v3.71.17 Pulse parameter source parity + context overflow dismissal contract PASS');
