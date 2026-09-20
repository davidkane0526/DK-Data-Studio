'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const source=read('src/core/plugins/kernel/modules/shell/context-toolbar.js');
const index=read('src/index.html');

assert(index.includes('id="contextOverflowMenu"')&&/id="contextOverflowMenu"[^>]*class="[^"]*\bhidden\b[^"]*"/.test(index),'Context overflow DOM must start as hidden storage.');
assert(source.includes("document.querySelector('#contextOverflowMenu')?.classList.add('hidden')"),'Closing the overflow popup must collapse the storage container as well as the transient popup.');
assert(source.includes("overflow.classList.add('hidden');overflowBtn.classList.add('hidden');"),'Every toolbar reflow must begin with the overflow storage hidden.');
assert(source.includes("overflow.classList.add('hidden');overflowBtn.classList.toggle('hidden',!hasOverflow);"),'Overflow membership must control only the trigger; the storage node must never become the visible menu.');
assert(!source.includes("overflow.classList.toggle('hidden',!hasOverflow)"),'The overflow storage must never be unhidden merely because it contains buttons.');
assert(source.includes("const menu=state.contextOverflowPopup=new Menu('core.shell'"),'The visible desktop dropdown must have exactly one ContextMenu owner.');
assert(source.includes("const willOpen=container.classList.contains('hidden')")&&source.includes("container.classList.toggle('hidden',!willOpen)")&&source.includes("button.setAttribute('aria-expanded',willOpen?'true':'false')"),'The no-ContextMenu fallback must be explicitly toggleable and dismissible.');
assert(source.includes('if(state.contextOverflowPopup?.element){closeContextOverflowPopup();return;}'),'Clicking the trigger while the transient menu is open must close it instead of stacking another layer.');


// Execute the real popup owner as well as checking source shape.  This closes the
// exact regression where static ownership assertions passed while one DOM layer
// remained visible after the transient ContextMenu closed.
class Classes{
  constructor(...rows){this.set=new Set(rows);}
  add(...rows){for(const row of rows)this.set.add(row);}
  remove(...rows){for(const row of rows)this.set.delete(row);}
  contains(row){return this.set.has(row);}
  toggle(row,force){if(force===undefined){force=!this.set.has(row);}force?this.set.add(row):this.set.delete(row);return force;}
}
const storage={children:[],classList:new Classes('hidden')};
const trigger={attrs:{},classList:new Classes(),setAttribute(k,v){this.attrs[k]=String(v);},getBoundingClientRect(){return {right:300,bottom:42};}};
let invoked=0;
const command={id:'cmd-a',textContent:'检查',title:'',disabled:false,dataset:{pluginSection:'analysis'},classList:new Classes('plugin-toolbar-btn'),matches(sel){return sel.includes('.plugin-toolbar-btn');},click(){invoked++;}};
storage.children=[command];
const oldDocument=global.document,oldWindow=global.window;
global.document={
  querySelector(sel){if(sel==='#contextOverflowBtn')return trigger;if(sel==='#contextOverflowMenu')return storage;return null;},
  querySelectorAll(){return [];}
};
let opened=0,disposed=0;
class FakeContextMenu{
  constructor(owner,opts={}){this.owner=owner;this.opts=opts;this.element=null;}
  open({items}){opened++;this.items=items;this.element={};}
  dispose(){disposed++;this.element=null;this.opts.onClose?.();}
}
global.window={DKDSUI:{ContextMenu:FakeContextMenu}};
const context=require('../src/core/plugins/kernel/modules/context');
context.state.contextOverflowPopup=null;
const toolbar=require('../src/core/plugins/kernel/modules/shell/context-toolbar');
toolbar.openContextOverflowPopup(trigger,storage);
assert.strictEqual(opened,1,'Overflow trigger must create exactly one visible ContextMenu.');
assert(storage.classList.contains('hidden'),'Opening a ContextMenu must not reveal the membership storage layer.');
assert.strictEqual(trigger.attrs['aria-expanded'],'true');
toolbar.openContextOverflowPopup(trigger,storage);
assert.strictEqual(disposed,1,'Second trigger invocation must dispose the existing visible menu.');
assert.strictEqual(context.state.contextOverflowPopup,null,'Closing must release the transient menu owner.');
assert(storage.classList.contains('hidden'),'Closing must leave the membership storage collapsed.');
assert.strictEqual(trigger.attrs['aria-expanded'],'false');

// The no-ContextMenu fallback is also a single toggleable layer, not a stuck menu.
global.window={DKDSUI:{}};
toolbar.openContextOverflowPopup(trigger,storage);
assert(!storage.classList.contains('hidden'),'Fallback menu must open the storage layer only when no ContextMenu exists.');
assert.strictEqual(trigger.attrs['aria-expanded'],'true');
toolbar.openContextOverflowPopup(trigger,storage);
assert(storage.classList.contains('hidden'),'Fallback menu must collapse on a second trigger invocation.');
assert.strictEqual(trigger.attrs['aria-expanded'],'false');

global.document=oldDocument;global.window=oldWindow;context.state.contextOverflowPopup=null;
console.log('v3.71.16 context overflow single-owner / dismissible-menu runtime contract PASS');
