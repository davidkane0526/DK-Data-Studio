'use strict';
const assert=require('assert');
const {STATE_CHANNELS,UNIT_STATE_POLICIES,ACCESSIBILITY_POLICIES,ACCESSIBILITY_ATTRIBUTES,ACCESSIBILITY_ROLES,ACCESSIBILITY_TABINDEX,KEYBOARD_KEYS,UnitStateController,setState}=require('../src/core/ui/modules/composition/unit-template-state');
const {UNIT_CATALOG}=require('../src/core/ui/modules/composition/unit-template-spec');

for(const id of ['visible','enabled','selected','pressed','checked','expanded','busy','readonly','required','current','invalid','loading'])assert(STATE_CHANNELS[id],`missing state channel ${id}`);
for(const [unit,row] of Object.entries(UNIT_STATE_POLICIES)){
  assert(UNIT_CATALOG[unit],`state policy references unknown Unit ${unit}`);
  for(const state of row.allowed||[])assert(STATE_CHANNELS[state],`${unit} references unknown state ${state}`);
  assert(row.keyboard,`${unit} state policy needs keyboard owner`);
}
for(const [id,row] of Object.entries(ACCESSIBILITY_POLICIES)){assert(row.roles&&row.requirements,`a11y policy ${id} incomplete`);for(const role of row.roles)assert(ACCESSIBILITY_ROLES.includes(role)||role==='application-owned selectable',`a11y policy ${id} uses unregistered role ${role}`);}
for(const attr of ['aria-label','aria-modal','aria-orientation','aria-haspopup','aria-multiselectable'])assert(ACCESSIBILITY_ATTRIBUTES[attr],`missing accepted accessibility attribute ${attr}`);
assert.deepStrictEqual(ACCESSIBILITY_TABINDEX,[-1,0]);for(const key of ['Enter','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])assert(KEYBOARD_KEYS.includes(key),`missing keyboard key ${key}`);

function fake(){const attrs=new Map(),classes=new Set();return {nodeType:1,dataset:{},hidden:false,disabled:false,checked:false,readOnly:false,required:false,classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},has:name=>classes.has(name)},setAttribute(name,value){attrs.set(name,String(value));},removeAttribute(name){attrs.delete(name);},getAttribute:name=>attrs.get(name),_attrs:attrs,_classes:classes};}
const el=fake();const action=new UnitStateController('action');action.apply(el,{visible:true,enabled:false,pressed:true,busy:true});assert.strictEqual(el.disabled,true);assert.strictEqual(el.getAttribute('aria-disabled'),'true');assert.strictEqual(el.getAttribute('aria-pressed'),'true');assert(el._classes.has('active'));assert.strictEqual(el.getAttribute('aria-busy'),'true');assert.strictEqual(el.dataset.busy,'true');
action.set(el,'pressed',false);assert(!el._classes.has('active'));assert.strictEqual(el.getAttribute('aria-pressed'),undefined);
assert.throws(()=>action.set(el,'checked',true),/UNIT_STATE_NOT_ALLOWED/);
const button=fake(),actionRoot=fake();actionRoot.matches=()=>false;actionRoot.querySelector=sel=>sel==='button'?button:null;action.set({element:actionRoot},'selected',true);assert.strictEqual(button.getAttribute('aria-selected'),'true');assert(button._classes.has('selected'));assert.strictEqual(actionRoot.getAttribute('aria-selected'),undefined);
const control=fake(),fieldRoot=fake(),fieldHandle={element:fieldRoot,control};const fieldState=new UnitStateController('field');fieldState.set(fieldHandle,'readonly',true);fieldState.set(fieldHandle,'visible',false);assert.strictEqual(control.readOnly,true);assert.strictEqual(fieldRoot.hidden,true);
const input=fake(),checkRoot=fake(),checkHandle={element:checkRoot,input};const checkState=new UnitStateController('check');checkState.set(checkHandle,'checked',true);assert.strictEqual(input.checked,true);
const field=fake();setState(field,'readonly',true,{unit:'field'});setState(field,'required',true,{unit:'field'});setState(field,'invalid',true,{unit:'field'});assert.strictEqual(field.readOnly,true);assert.strictEqual(field.required,true);assert.strictEqual(field.getAttribute('aria-invalid'),'true');
console.log(`SDK 1.51 Unit state/accessibility contract PASS (${Object.keys(STATE_CHANNELS).length} channels / ${Object.keys(UNIT_STATE_POLICIES).length} unit policies)`);
