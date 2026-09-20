'use strict';

const UNIT_STATE_SPEC_VERSION='1.0.0';

const STATE_CHANNELS=Object.freeze({
  visible:Object.freeze({type:'boolean',reflect:['hidden','aria-hidden'],rule:'visible=false sets hidden and aria-hidden=true; visible=true removes aria-hidden and hidden.'}),
  enabled:Object.freeze({type:'boolean',reflect:['disabled','aria-disabled'],rule:'enabled=false disables native controls and exposes aria-disabled=true.'}),
  selected:Object.freeze({type:'boolean',reflect:['aria-selected','class:selected'],rule:'Selection state uses aria-selected and canonical selected class.'}),
  pressed:Object.freeze({type:'boolean',reflect:['aria-pressed','class:active'],rule:'Toggle-action state uses aria-pressed and the accepted active class.'}),
  checked:Object.freeze({type:'boolean',reflect:['checked','aria-checked'],rule:'Checkable controls synchronize native checked and aria-checked when role requires it.'}),
  expanded:Object.freeze({type:'boolean',reflect:['aria-expanded'],rule:'Disclosure/menu state uses aria-expanded.'}),
  busy:Object.freeze({type:'boolean',reflect:['aria-busy','data-busy'],rule:'Busy state uses aria-busy and data-busy; it does not invent paint.'}),
  readonly:Object.freeze({type:'boolean',reflect:['readOnly','aria-readonly'],rule:'Readonly state synchronizes native property and aria-readonly.'}),
  required:Object.freeze({type:'boolean',reflect:['required','aria-required'],rule:'Required state synchronizes native property and aria-required.'}),
  current:Object.freeze({type:'boolean|string',reflect:['aria-current'],rule:'Current/focused navigation state uses aria-current; false removes it.'}),
  invalid:Object.freeze({type:'boolean|string',reflect:['aria-invalid'],rule:'Validation state uses aria-invalid; false removes it.'}),
  loading:Object.freeze({type:'boolean',reflect:['data-loading','aria-busy'],rule:'Loading is a semantic alias for busy plus data-loading.'})
});

const UNIT_STATE_POLICIES=Object.freeze({
  action:Object.freeze({allowed:['visible','enabled','selected','pressed','busy'],requiredA11y:['aria-label'],keyboard:'native-button'}),
  tabs:Object.freeze({allowed:['visible','enabled','selected'],requiredA11y:['role=tablist/tab','aria-selected'],keyboard:'native-button-current'}),
  field:Object.freeze({allowed:['visible','enabled','readonly','required','invalid','busy'],requiredA11y:['associated label or aria-label'],keyboard:'native-field'}),
  check:Object.freeze({allowed:['visible','enabled','checked','required','invalid'],requiredA11y:['native checkbox/radio or aria-checked'],keyboard:'native-check'}),
  menu:Object.freeze({allowed:['visible','enabled','selected','expanded'],requiredA11y:['role=menu/menuitem or listbox/option'],keyboard:'menu-roving'}),
  dialog:Object.freeze({allowed:['visible','busy'],requiredA11y:['dialog semantics','named title','focus lifecycle'],keyboard:'escape-dismiss'}),
  popover:Object.freeze({allowed:['visible','expanded','busy'],requiredA11y:['named trigger/control when interactive'],keyboard:'outside-dismiss-current'}),
  portable:Object.freeze({allowed:['visible','expanded','busy'],requiredA11y:['named placement/close controls'],keyboard:'core-portable'}),
  prime:Object.freeze({allowed:['visible','expanded','busy'],requiredA11y:['canonical header controls when movable'],keyboard:'core-portable'}),
  plotView:Object.freeze({allowed:['visible','busy','selected','current'],requiredA11y:['named title','named position/export actions'],keyboard:'core-plot-view'}),
  plotGroup:Object.freeze({allowed:['visible','busy','expanded'],requiredA11y:['complete canonical group chrome when headed'],keyboard:'core-plot-group'}),
  list:Object.freeze({allowed:['visible','selected','current','busy'],requiredA11y:['selection semantics when selectable'],keyboard:'selection-model'}),
  table:Object.freeze({allowed:['visible','selected','current','busy'],requiredA11y:['table semantics'],keyboard:'core-table'}),
  status:Object.freeze({allowed:['visible','busy','current'],requiredA11y:['textual state equivalent'],keyboard:'none'}),
  meter:Object.freeze({allowed:['visible','busy'],requiredA11y:['role=progressbar','aria-valuemin','aria-valuemax','aria-valuenow'],keyboard:'none'}),
  componentTree:Object.freeze({allowed:['visible','enabled','selected','expanded','busy','readonly','required','invalid'],requiredA11y:['component-defined canonical semantics'],keyboard:'component-runtime'}),
  parameterForm:Object.freeze({allowed:['visible','enabled','busy','readonly','required','invalid'],requiredA11y:['field labels/validation semantics'],keyboard:'native-field'})
});


const ACCESSIBILITY_ATTRIBUTES=Object.freeze({
  'aria-label':'Accessible name for icon-only or otherwise ambiguous interactive controls.',
  'aria-modal':'Modal dialog semantics owned by the Core dialog runtime.',
  'aria-orientation':'Orientation for canonical split/separator controls.',
  'aria-haspopup':'Popup relationship for menu/listbox triggers.',
  'aria-multiselectable':'Multiple-selection semantics for listbox/selection surfaces.'
});
const ACCESSIBILITY_ROLES=Object.freeze(['button','dialog','alertdialog','tablist','tab','separator','group','menu','menuitem','listbox','option','row','progressbar','status']);
const ACCESSIBILITY_TABINDEX=Object.freeze([-1,0]);
const KEYBOARD_KEYS=Object.freeze(['Enter','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','Home','End',' ']);

const ACCESSIBILITY_POLICIES=Object.freeze({
  action:Object.freeze({roles:['button'],requirements:['Every icon-only action has aria-label.','Toggle actions reflect aria-pressed.','Disabled uses native disabled and aria-disabled where needed.']}),
  tabs:Object.freeze({roles:['tablist','tab'],requirements:['Selected tab reflects aria-selected.','Keyboard navigation remains Core-owned.']}),
  menu:Object.freeze({roles:['menu','menuitem','listbox','option'],requirements:['Trigger exposes aria-haspopup and aria-expanded.','Escape/outside dismissal is Core-owned.','Listbox options expose aria-selected.']}),
  dialog:Object.freeze({roles:['dialog','alertdialog'],requirements:['Dialog is named.','Focus lifecycle and Escape dismissal are Core-owned.']}),
  meter:Object.freeze({roles:['progressbar'],requirements:['Current/min/max values are exposed.']}),
  splitPane:Object.freeze({roles:['separator'],requirements:['Separator exposes orientation and remains the sole resize gesture owner.']}),
  status:Object.freeze({roles:[],requirements:['Visual state has textual equivalent; no live-region role is implied unless the owning runtime already provides one.']}),
  selection:Object.freeze({roles:['option','row','tab','application-owned selectable'],requirements:['Selected/current state is exposed with aria-selected/aria-current where applicable.']})
});

function bool(value){return value===true||value==='true';}
function elementOf(value){if(value?.nodeType===1)return value;if(value?.element?.nodeType===1)return value.element;return null;}
function targetOf(value,unit='',state=''){
  const id=String(unit||'');
  if(id==='field'&&state!=='visible'&&state!=='busy'&&value?.control?.nodeType===1)return value.control;
  if(id==='check'&&state!=='visible'&&value?.input?.nodeType===1)return value.input;
  if(id==='action'){const root=elementOf(value);const button=root?.matches?.('button')?root:root?.querySelector?.('button');if(button)return button;}
  const el=elementOf(value);if(el)return el;throw new Error('UNIT_STATE_TARGET_REQUIRED');
}
function setAria(el,name,value){if(value===false||value===null||value===undefined||value==='false')el.removeAttribute(name);else el.setAttribute(name,String(value===true?'true':value));}
function setState(target,name,value,options={}){
  const channel=STATE_CHANNELS[name];if(!channel)throw new Error(`UNIT_STATE_UNKNOWN: ${name}`);const el=targetOf(target,options.unit,name);
  if(options.unit){const policy=UNIT_STATE_POLICIES[String(options.unit)];if(policy&&!policy.allowed.includes(name))throw new Error(`UNIT_STATE_NOT_ALLOWED: ${options.unit}:${name}`);}
  switch(name){
    case 'visible':{const on=bool(value);el.hidden=!on;setAria(el,'aria-hidden',on?false:true);break;}
    case 'enabled':{const on=bool(value);if('disabled'in el)el.disabled=!on;setAria(el,'aria-disabled',on?false:true);break;}
    case 'selected':{const on=bool(value);el.classList?.toggle('selected',on);setAria(el,'aria-selected',on);break;}
    case 'pressed':{const on=bool(value);el.classList?.toggle('active',on);setAria(el,'aria-pressed',on);break;}
    case 'checked':{const on=bool(value);if('checked'in el)el.checked=on;setAria(el,'aria-checked',on);break;}
    case 'expanded':setAria(el,'aria-expanded',bool(value));break;
    case 'busy':{const on=bool(value);el.dataset.busy=String(on);setAria(el,'aria-busy',on);break;}
    case 'readonly':{const on=bool(value);if('readOnly'in el)el.readOnly=on;setAria(el,'aria-readonly',on);break;}
    case 'required':{const on=bool(value);if('required'in el)el.required=on;setAria(el,'aria-required',on);break;}
    case 'current':setAria(el,'aria-current',value);break;
    case 'invalid':setAria(el,'aria-invalid',value);break;
    case 'loading':{const on=bool(value);el.dataset.loading=String(on);setAria(el,'aria-busy',on);break;}
    default:throw new Error(`UNIT_STATE_UNKNOWN: ${name}`);
  }
  return el;
}
function applyStates(target,states={},options={}){let last=null;for(const [name,value] of Object.entries(states||{}))last=setState(target,name,value,options);return last||targetOf(target,options.unit,'visible');}

class UnitStateController{
  constructor(unit=''){this.unit=String(unit||'');}
  set(target,name,value){return setState(target,name,value,{unit:this.unit});}
  apply(target,states){return applyStates(target,states,{unit:this.unit});}
  policy(){return UNIT_STATE_POLICIES[this.unit]||null;}
}

module.exports=Object.freeze({UNIT_STATE_SPEC_VERSION,STATE_CHANNELS,UNIT_STATE_POLICIES,ACCESSIBILITY_POLICIES,ACCESSIBILITY_ATTRIBUTES,ACCESSIBILITY_ROLES,ACCESSIBILITY_TABINDEX,KEYBOARD_KEYS,setState,applyStates,UnitStateController});
