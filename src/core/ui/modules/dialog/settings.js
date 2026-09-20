'use strict';
const {hostState, esc, resolveElement, isTypingTarget, cleanupCall}=require('../foundation/shortcuts');

  class DialogService {
    constructor(){this.overlays=new Set();}
    toneIcon(tone){return ({error:'!',warning:'!',success:'✓',info:'i'})[String(tone||'info')]||'i';}
    closeAll(){for(const overlay of [...this.overlays])overlay.__dkdsClose?.('dismiss');}
    show(spec={}){
      if(typeof document==='undefined'||!document.body)return Promise.resolve(spec.defaultAction||'dismiss');
      const options={tone:'info',title:'提示',message:'',detail:'',meta:[],actions:[{id:'ok',label:'知道了',kind:'primary'}],dismissible:true,...spec};
      const actions=Array.isArray(options.actions)&&options.actions.length?options.actions:[{id:'ok',label:'知道了',kind:'primary'}];
      return new Promise(resolve=>{
        const previous=document.activeElement;
        const overlay=document.createElement('div');overlay.className='dkds-dialog-overlay';overlay.dataset.tone=String(options.tone||'info');
        const dialog=document.createElement('section');dialog.className=`dkds-dialog dkds-dialog-${String(options.tone||'info')}`;dialog.setAttribute('role',options.tone==='error'?'alertdialog':'dialog');dialog.setAttribute('aria-modal','true');
        const header=document.createElement('header');header.className='dkds-dialog-header';
        const icon=document.createElement('span');icon.className='dkds-dialog-icon';icon.setAttribute('aria-hidden','true');icon.textContent=this.toneIcon(options.tone);
        const titleWrap=document.createElement('div');titleWrap.className='dkds-dialog-title-wrap';
        const title=document.createElement('strong');title.className='dkds-dialog-title';title.textContent=String(options.title||'提示');titleWrap.appendChild(title);
        if(options.subtitle){const subtitle=document.createElement('span');subtitle.className='dkds-dialog-subtitle';subtitle.textContent=String(options.subtitle);titleWrap.appendChild(subtitle);}
        header.append(icon,titleWrap);
        if(options.dismissible!==false){const x=document.createElement('button');x.type='button';x.className='dkds-dialog-close dkds-panel-close-button';x.dataset.dkdsComponentIdentity='toolbarAction';x.dataset.dkdsComponentIdentityOwner='core-dialog';x.dataset.dkdsComponentVariant='quiet';x.dataset.dkdsComponentVariantOwner='core-dialog';x.setAttribute('aria-label','关闭');x.textContent='×';header.appendChild(x);}
        const body=document.createElement('div');body.className='dkds-dialog-body';
        if(options.message){const message=document.createElement('p');message.className='dkds-dialog-message';message.textContent=String(options.message);body.appendChild(message);}
        const meta=Array.isArray(options.meta)?options.meta.filter(row=>row&&row.value!==undefined&&row.value!==null&&String(row.value)!==''):[];
        if(meta.length){const grid=document.createElement('dl');grid.className='dkds-dialog-meta';for(const row of meta){const dt=document.createElement('dt');dt.textContent=String(row.label||'');const dd=document.createElement('dd');dd.textContent=String(row.value);grid.append(dt,dd);}body.appendChild(grid);}
        if(options.detail){const details=document.createElement('details');details.className='dkds-dialog-details';if(options.detailOpen)details.open=true;const summary=document.createElement('summary');summary.textContent=String(options.detailLabel||'详细信息');const pre=document.createElement('pre');pre.textContent=String(options.detail);details.append(summary,pre);body.appendChild(details);}
        let inputNode=null;
        if(options.input&&typeof options.input==='object'){
          const field=document.createElement('label');field.className='dkds-dialog-field';const label=document.createElement('span');label.textContent=String(options.input.label||'');field.appendChild(label);
          if(String(options.input.type||'text')==='select'){inputNode=document.createElement('select');for(const row of options.input.options||[]){const option=document.createElement('option');option.value=String(row?.value??row?.id??row??'');option.textContent=String(row?.label??row?.title??row?.value??row?.id??row??'');inputNode.appendChild(option);}inputNode.value=String(options.input.value??'');}
          else{inputNode=document.createElement('input');inputNode.type=String(options.input.type||'text');inputNode.value=String(options.input.value??'');inputNode.placeholder=String(options.input.placeholder||'');}
          field.appendChild(inputNode);body.appendChild(field);
        }
        const footer=document.createElement('footer');footer.className='dkds-dialog-footer';
        const cleanup=[];let settled=false;
        const close=value=>{if(settled)return;settled=true;for(const fn of cleanup.splice(0))cleanupCall(fn);this.overlays.delete(overlay);overlay.remove();try{if(previous?.isConnected&&typeof previous.focus==='function')previous.focus();}catch{}resolve(options.input?{action:value,value:String(inputNode?.value??'')}:value);};
        overlay.__dkdsClose=close;this.overlays.add(overlay);
        for(const action of actions){const kind=String(action.kind||'secondary');const variant=kind==='danger'?'destructive':(kind==='primary'?'primary':'secondary');const button=document.createElement('button');button.type='button';button.className=`dkds-dialog-action ${kind}`;button.dataset.dkdsComponentIdentity='toolbarAction';button.dataset.dkdsComponentIdentityOwner='core-dialog';button.dataset.dkdsComponentVariant=variant;button.dataset.dkdsComponentVariantOwner='core-dialog';button.dataset.dialogAction=String(action.id||'ok');button.textContent=String(action.label||action.id||'确定');if(action.autofocus)button.autofocus=true;button.addEventListener('click',()=>close(action.id||'ok'));footer.appendChild(button);}
        dialog.append(header,body,footer);globalThis.DKDSMaterialSurface?.apply?.(dialog,'elevated');overlay.appendChild(dialog);document.body.appendChild(overlay);
        const closeButton=header.querySelector('.dkds-dialog-close');if(closeButton)closeButton.addEventListener('click',()=>close(options.cancelAction||'dismiss'));
        const onPointer=event=>{if(options.dismissOnBackdrop===true&&event.target===overlay)close(options.cancelAction||'dismiss');};overlay.addEventListener('pointerdown',onPointer);cleanup.push(()=>overlay.removeEventListener('pointerdown',onPointer));
        const onKey=event=>{if(event.key==='Escape'&&options.dismissible!==false){event.preventDefault();close(options.cancelAction||'dismiss');return;}if(event.key==='Enter'&&!isTypingTarget(event.target)){const target=footer.querySelector(`[data-dialog-action="${String(options.defaultAction||'')}"]`)||footer.querySelector('.primary');if(target){event.preventDefault();target.click();}}};document.addEventListener('keydown',onKey,true);cleanup.push(()=>document.removeEventListener('keydown',onKey,true));
        const focusTarget=footer.querySelector('[autofocus]')||footer.querySelector('.primary')||footer.querySelector('button')||closeButton;try{focusTarget?.focus?.();}catch{}
      });
    }
    alert(spec={}){return this.show({...spec,actions:spec.actions||[{id:'ok',label:spec.okLabel||'知道了',kind:'primary',autofocus:true}],defaultAction:'ok',cancelAction:'ok'});}
    async confirm(spec={}){const value=await this.show({...spec,actions:spec.actions||[{id:'cancel',label:spec.cancelLabel||'取消',kind:'secondary'},{id:'confirm',label:spec.confirmLabel||'确定',kind:spec.destructive?'danger':'primary',autofocus:true}],defaultAction:'confirm',cancelAction:'cancel'});return value==='confirm';}
    async prompt(spec={}){const result=await this.show({...spec,input:spec.input||{type:'text',label:spec.inputLabel||'',value:spec.value||''},actions:spec.actions||[{id:'cancel',label:spec.cancelLabel||'取消',kind:'secondary'},{id:'confirm',label:spec.confirmLabel||'确定',kind:'primary',autofocus:true}],defaultAction:'confirm',cancelAction:'cancel'});return result?.action==='confirm'?result.value:null;}
  }
  const dialogService=new DialogService();


  class SettingsSurface {
    constructor(scope,id,spec={}){
      this.scope=scope||null;this.owner=String(scope?.owner||spec.owner||'core');this.id=String(id||spec.id||'defaults');this.spec={title:'插件设置',fields:[],defaults:{},...spec};this.listeners=new Set();this.dialog=null;this.value=this.read();
    }
    storageKey(){return `${hostState.storagePrefix}.settings.v1.${this.owner}.${this.id}`;}
    normalize(value={}){return {...(this.spec.defaults||{}),...(value&&typeof value==='object'?value:{})};}
    read(){try{return this.normalize(JSON.parse(localStorage.getItem(this.storageKey())||'null')||{});}catch{return this.normalize({});}}
    get(key){const value=this.normalize(this.value);return key===undefined?{...value}:value?.[key];}
    set(patch={},meta={}){const next=this.normalize({...this.value,...(patch&&typeof patch==='object'?patch:{})});this.value=next;try{localStorage.setItem(this.storageKey(),JSON.stringify(next));}catch{}for(const fn of this.listeners)try{fn({...next},meta);}catch(err){console.warn('[DKDS settings change]',err);}return {...next};}
    reset(meta={}){this.value=this.normalize({});try{localStorage.removeItem(this.storageKey());}catch{}for(const fn of this.listeners)try{fn({...this.value},{...meta,reset:true});}catch{}return {...this.value};}
    subscribe(fn,{immediate=false}={}){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);if(immediate)fn(this.get(),{initial:true});return()=>this.listeners.delete(fn);}
    fieldOptions(field){const rows=Array.isArray(field?.options)?field.options:[];return rows.map(row=>typeof row==='object'?{value:String(row.value??row.id??''),label:String(row.label??row.title??row.value??row.id??'')}:{value:String(row),label:String(row)});}
    createControl(field,value){
      const type=String(field?.type||'text');let input;if(type==='select'){input=document.createElement('select');for(const row of this.fieldOptions(field)){const option=document.createElement('option');option.value=row.value;option.textContent=row.label;input.appendChild(option);}input.value=String(value??'');}
      else if(type==='boolean'||type==='checkbox'){input=document.createElement('input');input.type='checkbox';input.checked=!!value;}
      else{input=document.createElement('input');input.type=type==='number'?'number':'text';if(type==='number'&&field.step!==undefined)input.step=String(field.step);if(type==='number'&&field.min!==undefined)input.min=String(field.min);if(type==='number'&&field.max!==undefined)input.max=String(field.max);input.value=value??'';}
      input.dataset.settingId=String(field.id||'');return input;
    }
    controlValue(field,input){const type=String(field?.type||'text');if(type==='boolean'||type==='checkbox')return !!input.checked;if(type==='number'){const n=Number(input.value);return Number.isFinite(n)?n:(field.default??this.spec.defaults?.[field.id]??null);}return String(input.value??'');}
    close(){this.dialog?.remove?.();this.dialog=null;}
    open(options={}){
      this.close();const overlay=document.createElement('div');overlay.className='dkds-settings-overlay dkds-overlay';overlay.dataset.dkdsOverlayStack='foreground';overlay.innerHTML=`<section class="dkds-settings-dialog dkds-dialog-shell" role="dialog" aria-modal="true"><header><div><strong>${esc(options.title||this.spec.title||'插件设置')}</strong>${this.spec.description?`<span>${esc(this.spec.description)}</span>`:''}</div><button type="button" class="dkds-panel-close-button" data-action="close" aria-label="关闭">×</button></header><div class="dkds-settings-body"></div><footer><button type="button" data-action="reset">恢复默认</button><span></span><button type="button" data-action="cancel">取消</button><button type="button" class="primary" data-action="apply">应用</button></footer></section>`;globalThis.DKDSMaterialSurface?.apply?.(overlay.querySelector('.dkds-settings-dialog'),'elevated');
      document.body.appendChild(overlay);this.dialog=overlay;const body=overlay.querySelector('.dkds-settings-body'),controls=new Map(),current=this.get();
      for(const field of this.spec.fields||[]){if(!field?.id)continue;const row=document.createElement('label');row.className=`dkds-settings-field ${String(field.type||'text')==='boolean'||String(field.type||'text')==='checkbox'?'is-check':''}`;const text=document.createElement('span');text.className='dkds-settings-label';text.textContent=String(field.label||field.id);const input=this.createControl(field,current[field.id]);controls.set(String(field.id),{field,input});if(String(field.type||'')==='boolean'||String(field.type||'')==='checkbox'){row.append(input,text);}else{row.append(text,input);}if(field.description){const help=document.createElement('small');help.textContent=String(field.description);row.appendChild(help);}body.appendChild(row);}
      const finish=action=>{if(action==='apply'){const patch={};for(const [id,row] of controls)patch[id]=this.controlValue(row.field,row.input);const next=this.set(patch,{source:'settings-dialog'});try{this.spec.onApply?.(next,{surface:this});}catch(err){console.warn('[DKDS settings apply]',err);}try{options.onApply?.(next,{surface:this});}catch{}this.close();return;}if(action==='reset'){const next=this.reset({source:'settings-dialog'});for(const [id,row] of controls){const value=next[id],type=String(row.field.type||'text');if(type==='boolean'||type==='checkbox')row.input.checked=!!value;else row.input.value=value??'';}try{this.spec.onApply?.(next,{surface:this,reset:true});}catch{}try{options.onApply?.(next,{surface:this,reset:true});}catch{}return;}this.close();};
      overlay.addEventListener('click',event=>{const action=event.target?.closest?.('[data-action]')?.dataset?.action;if(action)finish(action);else if(event.target===overlay)finish('cancel');});overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();finish('cancel');}});Promise.resolve().then(()=>overlay.querySelector('select,input,button')?.focus?.());return overlay;
    }
    button(container,options={}){const host=resolveElement(container);if(!host)return null;const button=document.createElement('button');button.type='button';button.className=String(options.className||'');button.textContent=String(options.label||'设置');button.setAttribute('aria-label',String(options.label||options.title||'设置'));button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();this.open(options);});host.appendChild(button);return button;}
    dispose(){this.close();this.listeners.clear();}
  }

  class SettingsRegistry {
    constructor(scope){this.scope=scope;this.rows=new Map();}
    define(id,spec={}){const key=String(id||spec.id||'defaults');let row=this.rows.get(key);if(row){row.spec={...row.spec,...spec};row.value=row.read();return row;}row=new SettingsSurface(this.scope,key,spec);this.rows.set(key,row);return row;}
    get(id='defaults'){return this.rows.get(String(id))||null;}
    dispose(){for(const row of this.rows.values())row.dispose?.();this.rows.clear();}
  }

module.exports=Object.freeze({DialogService, dialogService, SettingsSurface, SettingsRegistry});
