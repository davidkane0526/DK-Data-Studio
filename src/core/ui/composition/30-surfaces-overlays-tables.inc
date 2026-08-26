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
        if(options.dismissible!==false){const x=document.createElement('button');x.type='button';x.className='dkds-dialog-close';x.setAttribute('aria-label','关闭');x.textContent='×';header.appendChild(x);}
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
        for(const action of actions){const button=document.createElement('button');button.type='button';button.className=`dkds-dialog-action ${String(action.kind||'secondary')}`;button.dataset.dialogAction=String(action.id||'ok');button.textContent=String(action.label||action.id||'确定');if(action.autofocus)button.autofocus=true;button.addEventListener('click',()=>close(action.id||'ok'));footer.appendChild(button);}
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
      this.close();const overlay=document.createElement('div');overlay.className='dkds-settings-overlay';overlay.innerHTML=`<section class="dkds-settings-dialog" role="dialog" aria-modal="true"><header><div><strong>${esc(options.title||this.spec.title||'插件设置')}</strong>${this.spec.description?`<span>${esc(this.spec.description)}</span>`:''}</div><button type="button" data-action="close" title="关闭">×</button></header><div class="dkds-settings-body"></div><footer><button type="button" data-action="reset">恢复默认</button><span></span><button type="button" data-action="cancel">取消</button><button type="button" class="primary" data-action="apply">应用</button></footer></section>`;globalThis.DKDSMaterialSurface?.apply?.(overlay.querySelector('.dkds-settings-dialog'),'elevated');
      document.body.appendChild(overlay);this.dialog=overlay;const body=overlay.querySelector('.dkds-settings-body'),controls=new Map(),current=this.get();
      for(const field of this.spec.fields||[]){if(!field?.id)continue;const row=document.createElement('label');row.className=`dkds-settings-field ${String(field.type||'text')==='boolean'||String(field.type||'text')==='checkbox'?'is-check':''}`;const text=document.createElement('span');text.className='dkds-settings-label';text.textContent=String(field.label||field.id);const input=this.createControl(field,current[field.id]);controls.set(String(field.id),{field,input});if(String(field.type||'')==='boolean'||String(field.type||'')==='checkbox'){row.append(input,text);}else{row.append(text,input);}if(field.description){const help=document.createElement('small');help.textContent=String(field.description);row.appendChild(help);}body.appendChild(row);}
      const finish=action=>{if(action==='apply'){const patch={};for(const [id,row] of controls)patch[id]=this.controlValue(row.field,row.input);const next=this.set(patch,{source:'settings-dialog'});try{this.spec.onApply?.(next,{surface:this});}catch(err){console.warn('[DKDS settings apply]',err);}try{options.onApply?.(next,{surface:this});}catch{}this.close();return;}if(action==='reset'){const next=this.reset({source:'settings-dialog'});for(const [id,row] of controls){const value=next[id],type=String(row.field.type||'text');if(type==='boolean'||type==='checkbox')row.input.checked=!!value;else row.input.value=value??'';}try{this.spec.onApply?.(next,{surface:this,reset:true});}catch{}try{options.onApply?.(next,{surface:this,reset:true});}catch{}return;}this.close();};
      overlay.addEventListener('click',event=>{const action=event.target?.closest?.('[data-action]')?.dataset?.action;if(action)finish(action);else if(event.target===overlay)finish('cancel');});overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();finish('cancel');}});Promise.resolve().then(()=>overlay.querySelector('select,input,button')?.focus?.());return overlay;
    }
    button(container,options={}){const host=resolveElement(container);if(!host)return null;const button=document.createElement('button');button.type='button';button.className=String(options.className||'');button.textContent=String(options.label||'设置');button.title=String(options.title||'插件默认设置');button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();this.open(options);});host.appendChild(button);return button;}
    dispose(){this.close();this.listeners.clear();}
  }

  class SettingsRegistry {
    constructor(scope){this.scope=scope;this.rows=new Map();}
    define(id,spec={}){const key=String(id||spec.id||'defaults');let row=this.rows.get(key);if(row){row.spec={...row.spec,...spec};row.value=row.read();return row;}row=new SettingsSurface(this.scope,key,spec);this.rows.set(key,row);return row;}
    get(id='defaults'){return this.rows.get(String(id))||null;}
    dispose(){for(const row of this.rows.values())row.dispose?.();this.rows.clear();}
  }


  class TableSurface {
    constructor(scope,table,spec={}){
      this.scope=scope||null;this.owner=String(spec.owner||scope?.owner||'core.table');this.table=resolveElement(table);this.spec={minColumnWidth:56,maxColumnWidth:640,sortable:true,headerMenu:true,cellMenu:true,copyTable:true,persist:true,...spec};this.disposed=false;this.refreshing=false;this.rowOrder=new WeakMap();this.rowOrderSeq=0;this.cleanups=[];this.menu=new ContextMenu(this.owner);this.state={widths:{},hidden:{},sort:null};
      if(!this.table)throw new Error('TableSurface target not found.');
      this.table.classList.add('dkds-managed-table');this.table.dataset.dkdsTableManaged='1';this.table.dataset.dkdsCoreSurface='table';
      this.stableId=String(this.spec.id||this.table.dataset.tableId||this.table.id||'').trim();
      this.applyAppearance();this.restorePersistedState();this.bindEvents();this.observe();this.refresh();
    }
    applyAppearance(){
      const appearance=this.spec?.appearance&&typeof this.spec.appearance==='object'?this.spec.appearance:{};
      const density=['compact','comfortable','spacious'].includes(String(appearance.density||''))?String(appearance.density):'comfortable';
      this.table.dataset.dkdsTableDensity=density;
      const stripe=appearance.stripe===false?'none':String(appearance.stripe||'subtle');this.table.dataset.dkdsTableStripe=stripe;
      const tone=['neutral','analysis','data','success','warning','danger'].includes(String(appearance.tone||''))?String(appearance.tone):'neutral';this.table.dataset.dkdsTableTone=tone;
      const emphasis=['quiet','normal','strong'].includes(String(appearance.emphasis||''))?String(appearance.emphasis):'normal';this.table.dataset.dkdsTableEmphasis=emphasis;
      for(const name of ['--dkds-table-row-odd-bg','--dkds-table-row-even-bg','--dkds-table-row-hover-bg','--dkds-table-row-selected-bg'])this.table.style.removeProperty(name);
      const colors=appearance.colors&&typeof appearance.colors==='object'?appearance.colors:{};
      if(colors.odd)this.table.style.setProperty('--dkds-table-row-odd-bg',String(colors.odd));
      if(colors.even)this.table.style.setProperty('--dkds-table-row-even-bg',String(colors.even));
      if(colors.hover)this.table.style.setProperty('--dkds-table-row-hover-bg',String(colors.hover));
      if(colors.selected)this.table.style.setProperty('--dkds-table-row-selected-bg',String(colors.selected));
      return Object.freeze({density,stripe,tone,emphasis,colors:{...colors}});
    }
    key(){
      if(this.stableId)return this.stableId;
      const labels=[...this.table.querySelectorAll('thead th')].map(th=>String(th.textContent||'').trim()).join('|');
      return `${this.owner}:${labels||'table'}`;
    }
    storageKey(){return this.stableId&&this.spec.persist!==false?`${hostState.storagePrefix}.table.v1.${this.owner}.${this.stableId}`:'';}
    restorePersistedState(){
      const key=this.storageKey();if(!key)return;
      try{const row=JSON.parse(localStorage.getItem(key)||'null');if(row&&typeof row==='object')this.state={widths:{...(row.widths||{})},hidden:{...(row.hidden||{})},sort:row.sort&&typeof row.sort==='object'?{key:String(row.sort.key||''),direction:String(row.sort.direction||'')} : null};}catch{}
    }
    persistState(){const key=this.storageKey();if(!key)return false;try{localStorage.setItem(key,JSON.stringify(this.state));return true;}catch{return false;}}
    columnHeaders(){return [...this.table.querySelectorAll('thead tr:first-child > th')];}
    columnKey(index,th=this.columnHeaders()[index]){return String(th?.dataset?.columnKey||th?.getAttribute?.('data-key')||th?.textContent||`column-${index}`).replace(/[▲▼↕]/g,'').trim()||`column-${index}`;}
    indexForKey(key){const value=String(key||'');return this.columnHeaders().findIndex((th,index)=>this.columnKey(index,th)===value);}
    columnIndex(value){if(Number.isInteger(value))return value;const n=Number(value);if(typeof value==='number'&&Number.isFinite(n))return Math.trunc(n);return this.indexForKey(value);}
    visibleColumnKeys(){return this.columnHeaders().map((th,index)=>({key:this.columnKey(index,th),index})).filter(row=>!this.isColumnHidden(row.index)).map(row=>row.key);}
    columnCells(index){const rows=[...this.table.querySelectorAll('tr')];return rows.map(row=>row.children?.[index]).filter(Boolean);}
    bodyRows(){return [...this.table.querySelectorAll('tbody > tr')];}
    registerRows(){for(const row of this.bodyRows())if(!this.rowOrder.has(row))this.rowOrder.set(row,this.rowOrderSeq++);}
    bindEvents(){
      const click=event=>{
        if(this.disposed||this.spec.sortable===false)return;
        if(event.target?.closest?.('.dkds-table-column-resizer,button,input,select,textarea,a,[data-dkds-no-sort]'))return;
        const th=event.target?.closest?.('thead th');if(!th||!this.table.contains(th)||th.dataset.dkdsSortable==='false')return;
        const index=this.columnHeaders().indexOf(th);if(index<0)return;this.sort(index,'toggle');
      };
      const context=event=>{
        if(this.disposed||event.defaultPrevented)return;
        const th=event.target?.closest?.('thead th');if(th&&this.table.contains(th)&&this.spec.headerMenu!==false){event.preventDefault();event.stopPropagation();this.openHeaderMenu(event,th);return;}
        const td=event.target?.closest?.('tbody td, tbody th');if(td&&this.table.contains(td)&&this.spec.cellMenu!==false){event.preventDefault();event.stopPropagation();this.openCellMenu(event,td);}
      };
      const rowActivate=event=>{
        if(typeof this.spec.onRowActivate!=='function'||event.target?.closest?.('button,input,select,textarea,a'))return;
        const row=event.target?.closest?.('tbody tr');if(!row||!this.table.contains(row))return;const cell=event.target?.closest?.('td,th');
        try{this.spec.onRowActivate({event,row,rowIndex:this.bodyRows().indexOf(row),cell,columnIndex:cell?[...row.children].indexOf(cell):-1,surface:this});}catch(err){console.warn('[DKDS table row activate]',err);}
      };
      this.table.addEventListener('click',click);this.table.addEventListener('contextmenu',context);this.table.addEventListener('dblclick',rowActivate);
      this.cleanups.push(()=>this.table.removeEventListener('click',click),()=>this.table.removeEventListener('contextmenu',context),()=>this.table.removeEventListener('dblclick',rowActivate));
    }
    observe(){if(!window.MutationObserver)return;this.observer=new MutationObserver(records=>{if(this.refreshing)return;if(records.some(row=>row.type==='childList'))this.refresh();});this.observer.observe(this.table,{childList:true,subtree:true});this.cleanups.push(()=>this.observer?.disconnect?.());}
    refresh(){
      if(this.disposed||this.refreshing)return false;this.refreshing=true;
      try{
        const heads=this.columnHeaders();this.registerRows();heads.forEach((th,index)=>this.installHeader(th,index));this.applyState();return !!heads.length;
      }finally{this.refreshing=false;}
    }
    installHeader(th,index){
      if(!th)return;th.classList.add('dkds-table-column');if(this.spec.sortable!==false&&th.dataset.dkdsSortable!=='false'){th.classList.add('dkds-table-sortable');th.title=th.title||'单击排序；右键打开列操作';}
      let handle=[...th.children].find(node=>node.classList?.contains('dkds-table-column-resizer'));
      if(handle)return;
      handle=document.createElement('span');handle.className='dkds-table-column-resizer';handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.title='拖动调整列宽；双击自动列宽';th.appendChild(handle);
      let drag=null;
      const move=event=>{if(!drag)return;const width=this.clampWidth(drag.width+(event.clientX-drag.x));this.setColumnWidth(index,width,{persist:false});event.preventDefault();};
      const end=()=>{if(!drag)return;drag=null;document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',end,true);document.body.classList.remove('dkds-table-resizing');this.persistState();};
      const down=event=>{if(event.button!==0)return;drag={x:event.clientX,width:th.getBoundingClientRect().width};document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',end,true);document.body.classList.add('dkds-table-resizing');event.preventDefault();event.stopPropagation();};
      const auto=event=>{event.preventDefault();event.stopPropagation();this.autoSizeColumn(index);};
      handle.addEventListener('pointerdown',down);handle.addEventListener('dblclick',auto);
    }
    clampWidth(value){const min=Math.max(36,Number(this.spec.minColumnWidth)||56),max=Math.max(min,Number(this.spec.maxColumnWidth)||640);return Math.max(min,Math.min(max,Math.round(Number(value)||min)));}
    setColumnWidth(index,width,{persist=true}={}){
      index=this.columnIndex(index);const heads=this.columnHeaders(),th=heads[index];if(!th)return false;const key=this.columnKey(index,th),px=this.clampWidth(width);this.state.widths[key]=px;
      for(const cell of this.columnCells(index)){cell.style.width=`${px}px`;cell.style.minWidth=`${px}px`;cell.style.maxWidth=`${px}px`;}
      this.table.dataset.dkdsTableUserSized='1';if(persist)this.persistState();return px;
    }
    resetColumn(index,{persist=true}={}){
      index=this.columnIndex(index);const heads=this.columnHeaders(),th=heads[index];if(!th)return false;const key=this.columnKey(index,th);delete this.state.widths[key];for(const cell of this.columnCells(index)){cell.style.removeProperty('width');cell.style.removeProperty('min-width');cell.style.removeProperty('max-width');}if(persist)this.persistState();return true;
    }
    autoSizeColumn(index,{persist=true}={}){
      index=this.columnIndex(index);const heads=this.columnHeaders(),th=heads[index];if(!th)return false;this.resetColumn(index,{persist:false});const cells=this.columnCells(index).filter(cell=>!cell.hidden&&!cell.classList?.contains('dkds-table-column-hidden')).slice(0,220);let width=0;
      for(const cell of cells){const measured=Math.max(Number(cell.scrollWidth)||0,Number(cell.getBoundingClientRect?.().width)||0);const fallback=Math.min(520,String(cell.textContent||'').trim().length*7.4+28);width=Math.max(width,measured||fallback);}
      width=this.setColumnWidth(index,this.clampWidth(width+10),{persist:false});if(persist)this.persistState();return width;
    }
    autoSizeAll(){const heads=this.columnHeaders();heads.forEach((_th,index)=>{if(!this.isColumnHidden(index))this.autoSizeColumn(index,{persist:false});});this.persistState();return this.columnState();}
    resetColumns(){for(let index=0;index<this.columnHeaders().length;index++)this.resetColumn(index,{persist:false});delete this.table.dataset.dkdsTableUserSized;this.persistState();return true;}
    isColumnHidden(index){index=this.columnIndex(index);const th=this.columnHeaders()[index];return !!th&&this.state.hidden[this.columnKey(index,th)]===true;}
    setColumnVisible(index,visible=true,{persist=true}={}){
      index=this.columnIndex(index);const heads=this.columnHeaders(),th=heads[index];if(!th)return false;const key=this.columnKey(index,th),show=visible!==false;if(show)delete this.state.hidden[key];else{const visibleCount=heads.filter((_row,i)=>!this.isColumnHidden(i)).length;if(visibleCount<=1)return false;this.state.hidden[key]=true;}
      for(const cell of this.columnCells(index)){cell.classList.toggle('dkds-table-column-hidden',!show);cell.setAttribute('aria-hidden',show?'false':'true');}
      if(persist)this.persistState();return true;
    }
    showAllColumns(){this.state.hidden={};for(let index=0;index<this.columnHeaders().length;index++)this.setColumnVisible(index,true,{persist:false});this.persistState();return true;}
    compareText(a,b){
      const clean=value=>String(value??'').trim().replace(/,/g,'');const av=clean(a),bv=clean(b),numeric=/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
      if(numeric.test(av)&&numeric.test(bv)){const an=Number(av),bn=Number(bv);if(Number.isFinite(an)&&Number.isFinite(bn))return an-bn;}
      return av.localeCompare(bv,undefined,{numeric:true,sensitivity:'base'});
    }
    sort(index,direction='toggle',{persist=true}={}){
      index=this.columnIndex(index);const heads=this.columnHeaders(),th=heads[index],body=this.table.tBodies?.[0];if(!th||!body||this.spec.sortable===false||th.dataset.dkdsSortable==='false')return false;const key=this.columnKey(index,th),current=this.state.sort?.key===key?this.state.sort.direction:'';
      let next=String(direction||'toggle');if(next==='toggle')next=current==='asc'?'desc':current==='desc'?'none':'asc';if(!['asc','desc','none'].includes(next))next='none';this.registerRows();const rows=this.bodyRows();
      const currentRows=rows.slice();rows.sort((ra,rb)=>{if(next==='none')return (this.rowOrder.get(ra)||0)-(this.rowOrder.get(rb)||0);const ca=ra.children?.[index],cb=rb.children?.[index],column=this.spec.columns?.[index];const value=(row,cell)=>{if(typeof column?.sortValue==='function')return column.sortValue(row?.__dkdsRowData??row,cell);const explicit=cell?.dataset?.sortValue;return explicit!==undefined?explicit:(cell?.textContent||'');};const av=value(ra,ca),bv=value(rb,cb),cmp=this.compareText(av,bv);return next==='desc'?-cmp:cmp;});
      const changed=rows.some((row,rowIndex)=>row!==currentRows[rowIndex]);if(changed){this.refreshing=true;try{for(const row of rows)body.appendChild(row);}finally{this.refreshing=false;}}
      this.state.sort=next==='none'?null:{key,direction:next};this.applySortIndicators();if(persist)this.persistState();
      try{this.table.dispatchEvent(new CustomEvent('dkds:table-sort',{bubbles:true,detail:{owner:this.owner,tableId:this.key(),columnKey:key,index,direction:next,surface:this}}));}catch{}
      return next;
    }
    clearSort(){const sort=this.state.sort;if(!sort)return true;const index=this.indexForKey(sort.key);return index>=0?this.sort(index,'none'):false;}
    applySortIndicators(){for(const [index,th] of this.columnHeaders().entries()){const key=this.columnKey(index,th),direction=this.state.sort?.key===key?this.state.sort.direction:'';if(direction){th.dataset.dkdsSort=direction;th.setAttribute('aria-sort',direction==='asc'?'ascending':'descending');}else{delete th.dataset.dkdsSort;th.setAttribute('aria-sort','none');}}}
    applyState(){
      const heads=this.columnHeaders();heads.forEach((th,index)=>{const key=this.columnKey(index,th),width=Number(this.state.widths[key]);if(Number.isFinite(width)&&width>0)this.setColumnWidth(index,width,{persist:false});else this.resetColumn(index,{persist:false});this.setColumnVisible(index,this.state.hidden[key]!==true,{persist:false});});this.applySortIndicators();
      if(this.state.sort?.key){const index=this.indexForKey(this.state.sort.key);if(index>=0)this.sort(index,this.state.sort.direction,{persist:false});}
    }
    copyText(text){
      const value=String(text??'');try{if(navigator.clipboard?.writeText){navigator.clipboard.writeText(value);hostState.status?.('已复制表格内容。');return true;}}catch{}
      try{const area=document.createElement('textarea');area.value=value;area.style.cssText='position:fixed;left:-10000px;top:-10000px';document.body.appendChild(area);area.select();const ok=document.execCommand?.('copy')!==false;area.remove();if(ok)hostState.status?.('已复制表格内容。');return ok;}catch{return false;}
    }
    visibleTableText({includeHeader=true}={}){
      const indices=this.columnHeaders().map((_th,index)=>index).filter(index=>!this.isColumnHidden(index)),lines=[];
      if(includeHeader)lines.push(indices.map(index=>String(this.columnHeaders()[index]?.textContent||'').replace(/[▲▼↕]/g,'').trim()).join('\t'));
      for(const row of this.bodyRows())lines.push(indices.map(index=>String(row.children?.[index]?.textContent||'').trim()).join('\t'));
      return lines.join('\n');
    }
    copyVisibleTable(options={}){return this.copyText(this.visibleTableText(options));}
    resetState({persist=true}={}){this.state={widths:{},hidden:{},sort:null};this.applyState();if(persist)this.persistState();return this.columnState();}
    menuItems(value,context){try{const rows=typeof value==='function'?value(context):value;return Array.isArray(rows)?rows.filter(Boolean):[];}catch(err){console.warn('[DKDS table menu]',err);return [];}}
    openHeaderMenu(event,th){
      const index=this.columnHeaders().indexOf(th),key=this.columnKey(index,th),hidden=Object.keys(this.state.hidden).length>0;
      const context={surface:this,index,key,header:th};const custom=this.menuItems(this.spec.headerMenuItems,context);const items=[
        {id:'sort-asc',label:'升序排列',icon:'↑',enabled:this.spec.sortable!==false&&th.dataset.dkdsSortable!=='false',onInvoke:()=>this.sort(index,'asc')},
        {id:'sort-desc',label:'降序排列',icon:'↓',enabled:this.spec.sortable!==false&&th.dataset.dkdsSortable!=='false',onInvoke:()=>this.sort(index,'desc')},
        {id:'sort-clear',label:'恢复原顺序',icon:'↕',enabled:!!this.state.sort,onInvoke:()=>this.clearSort()},
        {type:'separator'},
        {id:'autosize-column',label:'自动适配此列',onInvoke:()=>this.autoSizeColumn(index)},
        {id:'autosize-all',label:'自动适配全部列',onInvoke:()=>this.autoSizeAll()},
        {id:'reset-widths',label:'重置全部列宽',onInvoke:()=>this.resetColumns()},
        {type:'separator'},
        {id:'hide-column',label:`隐藏“${key}”`,enabled:this.columnHeaders().filter((_row,i)=>!this.isColumnHidden(i)).length>1,onInvoke:()=>this.setColumnVisible(index,false)},
        {id:'show-columns',label:'恢复全部列',visible:hidden,onInvoke:()=>this.showAllColumns()},
        ...(this.spec.copyTable!==false?[{type:'separator'},{id:'copy-table',label:'复制可见表格',icon:'⧉',onInvoke:()=>this.copyVisibleTable()}]:[]),
        ...(custom.length?[{type:'separator'},...custom]:[])
      ];return this.menu.open({x:event.clientX,y:event.clientY,context,items});
    }
    openCellMenu(event,cell){
      const row=cell.closest('tr'),cells=[...(row?.children||[])],index=cells.indexOf(cell),text=String(cell.textContent||'').trim(),rowText=cells.filter((_node,i)=>!this.isColumnHidden(i)).map(node=>String(node.textContent||'').trim()).join('\t');
      const context={surface:this,row,cell,index,rowIndex:this.bodyRows().indexOf(row),columnKey:this.columnKey(index)};const custom=this.menuItems(this.spec.cellMenuItems||this.spec.rowMenuItems,context);return this.menu.open({x:event.clientX,y:event.clientY,context,items:[
        {id:'copy-cell',label:'复制单元格',icon:'⧉',onInvoke:()=>this.copyText(text)},
        {id:'copy-row',label:'复制本行',icon:'≡',onInvoke:()=>this.copyText(rowText)},
        ...(custom.length?[{type:'separator'},...custom]:[])
      ]});
    }
    columnState(){return {widths:{...this.state.widths},hidden:{...this.state.hidden},sort:this.state.sort?{...this.state.sort}:null};}
    restoreColumnState(value={},options={}){this.state={widths:{...(value?.widths||{})},hidden:{...(value?.hidden||{})},sort:value?.sort?{...value.sort}:null};this.applyState();if(options.persist!==false)this.persistState();return this.columnState();}
    setData(columns=[],rows=[]){this.spec.columns=Array.isArray(columns)?columns.slice():[];this.spec.rows=Array.isArray(rows)?rows.slice():[];return this.renderData();}
    renderData(){
      const columns=Array.isArray(this.spec.columns)?this.spec.columns:[],rows=Array.isArray(this.spec.rows)?this.spec.rows:[];if(!columns.length)return false;const thead=document.createElement('thead'),hr=document.createElement('tr');
      for(const [index,column] of columns.entries()){const th=document.createElement('th');const key=String(column?.key??index);th.dataset.columnKey=key;th.dataset.dkdsSortable=column?.sortable===false?'false':'true';th.textContent=`${column?.label??key}${column?.unit?` (${column.unit})`:''}`;hr.appendChild(th);}thead.appendChild(hr);const tbody=document.createElement('tbody');
      rows.forEach((row,rowIndex)=>{const tr=document.createElement('tr');tr.__dkdsRowData=row;if(row?.id!=null)tr.dataset.rowId=String(row.id);for(const [index,column] of columns.entries()){const td=document.createElement('td');const key=column?.key??index;const raw=typeof column?.value==='function'?column.value(row,rowIndex):row?.[key];let value=raw;if(typeof column?.format==='function')value=column.format(value,row,rowIndex);if(typeof column?.sortValue==='function'){const sortValue=column.sortValue(row,rowIndex,raw);if(sortValue!=null)td.dataset.sortValue=String(sortValue);}else if(raw!=null&&typeof raw!=='object')td.dataset.sortValue=String(raw);td.textContent=value==null?'':String(value);tr.appendChild(td);}tbody.appendChild(tr);});
      this.refreshing=true;try{this.table.replaceChildren(thead,tbody);}finally{this.refreshing=false;}this.rowOrder=new WeakMap();this.rowOrderSeq=0;this.refresh();return true;
    }
    updateSpec(spec={}){this.spec={...this.spec,...spec};if(spec.owner)this.owner=String(spec.owner);this.applyAppearance();if(spec.columns||spec.rows)this.renderData();else this.refresh();return this;}
    dispose(){if(this.disposed)return;this.disposed=true;this.menu?.dispose?.();this.cleanups.splice(0).reverse().forEach(cleanupCall);for(const cell of this.table.querySelectorAll('.dkds-table-column')){cell.classList.remove('dkds-table-column','dkds-table-sortable');delete cell.dataset.dkdsSort;cell.removeAttribute('aria-sort');cell.querySelector('.dkds-table-column-resizer')?.remove?.();}for(const cell of this.table.querySelectorAll('.dkds-table-column-hidden')){cell.classList.remove('dkds-table-column-hidden');cell.removeAttribute('aria-hidden');}this.table.classList.remove('dkds-managed-table');delete this.table.dataset.dkdsTableManaged;delete this.table.dataset.dkdsCoreSurface;delete this.table.dataset.dkdsTableDensity;delete this.table.dataset.dkdsTableStripe;delete this.table.dataset.dkdsTableTone;delete this.table.dataset.dkdsTableEmphasis;}
  }

  class TableSurfaceRegistry {
    constructor(scope=null){this.scope=scope;this.rows=new Map();this.byElement=new WeakMap();this.anonymousIds=new WeakMap();this.anonymousSeq=0;this.observers=new Set();}
    bind(id,table,spec={}){
      const node=resolveElement(table);if(!node)return null;const key=String(id||spec.id||node.dataset.tableId||node.id||'table');let surface=this.byElement.get(node);
      if(surface&&!surface.disposed){surface.stableId=surface.stableId||key;surface.updateSpec({...spec,id:key,owner:spec.owner||this.scope?.owner||surface.owner});this.rows.set(key,surface);return surface;}
      surface=new TableSurface(this.scope,node,{...spec,id:key,owner:spec.owner||this.scope?.owner||'core.table'});this.byElement.set(node,surface);this.rows.set(key,surface);return surface;
    }
    mount(id,container,spec={}){const host=resolveElement(container);if(!host)return null;host.classList.add('dkds-table-surface-host');host.dataset.dkdsCoreSurfaceHost='table';globalThis.DKDSMaterialSurface?.apply?.(host,'surface');let table=spec.table?resolveElement(spec.table,host):host.querySelector?.('table[data-dkds-mounted-table]');if(!table){table=document.createElement('table');table.dataset.dkdsMountedTable='1';if(spec.className)table.className=String(spec.className);host.replaceChildren(table);}const surface=this.bind(id,table,spec);if(spec.columns)surface.setData(spec.columns,spec.rows||[]);return surface;}
    anonymousId(table){let id=this.anonymousIds.get(table);if(id)return id;id=`anonymous-${++this.anonymousSeq}`;this.anonymousIds.set(table,id);return id;}
    hydrationId(table){const explicit=String(table?.dataset?.tableId||table?.id||'').trim();return {explicit,id:explicit||this.anonymousId(table)};}
    hydrate(root=document,spec={}){const base=resolveElement(root)||root;if(!base?.querySelectorAll)return [];const selector=spec.selector||'table:not([data-dkds-table="off"])';const tables=[];if(base.matches?.(selector))tables.push(base);tables.push(...base.querySelectorAll(selector));return tables.map(table=>{const {explicit,id}=this.hydrationId(table);return this.bind(id,table,{...spec,persist:explicit?spec.persist:(spec.persistAnonymous===true)});}).filter(Boolean);}
    hydrateAddedNode(node,spec={}){if(!node||node.nodeType!==1)return [];const selector=spec.selector||'table:not([data-dkds-table="off"])';const tables=[];if(node.matches?.(selector))tables.push(node);tables.push(...(node.querySelectorAll?.(selector)||[]));return tables.map(table=>{const {explicit,id}=this.hydrationId(table);return this.bind(id,table,{...spec,persist:explicit?spec.persist:(spec.persistAnonymous===true)});}).filter(Boolean);}
    prune(){for(const [key,surface] of [...this.rows])if(!surface?.table?.isConnected){surface?.dispose?.();this.rows.delete(key);}return this.rows.size;}
    observe(root=document,spec={}){const base=resolveElement(root)||root;this.hydrate(base,spec);if(!window.MutationObserver||!base)return()=>{};const observer=new MutationObserver(records=>{let removed=false;for(const record of records){if(record.type!=='childList')continue;for(const node of record.addedNodes||[])this.hydrateAddedNode(node,spec);if(record.removedNodes?.length)removed=true;}if(removed)this.prune();});observer.observe(base,{childList:true,subtree:true});this.observers.add(observer);return()=>{observer.disconnect();this.observers.delete(observer);};}
    get(value){const node=resolveElement(value);if(node)return this.byElement.get(node)||null;return this.rows.get(String(value||''))||null;}
    dispose(){for(const observer of this.observers)observer.disconnect();this.observers.clear();for(const surface of new Set(this.rows.values()))surface.dispose?.();this.rows.clear();this.byElement=new WeakMap();this.anonymousIds=new WeakMap();this.anonymousSeq=0;}
  }

  const TableView=TableSurface;
  const TableViewRegistry=TableSurfaceRegistry;
  const globalTableSurfaceRegistry=new TableSurfaceRegistry(null);
  let globalTableObserverCleanup=null;
  function ensureGlobalTableSurfaceObserver(){if(globalTableObserverCleanup||typeof document==='undefined')return;const start=()=>{if(globalTableObserverCleanup)return;globalTableObserverCleanup=globalTableSurfaceRegistry.observe(document,{selector:'table:not([data-dkds-table="off"])',owner:'core.table'});};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else Promise.resolve().then(start);}
  ensureGlobalTableSurfaceObserver();


  class TooltipService {
    constructor(scope=null){this.scope=scope;this.node=null;this.owner=scope?.owner||'core';}
    ensure(){if(this.node?.isConnected)return this.node;const node=document.createElement('div');node.className='dkds-tooltip dkds-core-tooltip hidden';node.dataset.dkdsCoreSurface='tooltip';node.setAttribute('role','tooltip');(hostState.zones.get('overlay')||document.body).appendChild(node);this.node=node;return node;}
    show(spec={}){const node=this.ensure(),anchor=resolveElement(spec.anchor),point=spec.point||null;node.replaceChildren();if(spec.title){const strong=document.createElement('strong');strong.textContent=String(spec.title);node.appendChild(strong);}const rows=Array.isArray(spec.rows)?spec.rows:[];for(const row of rows){const line=document.createElement('div');line.className='dkds-tooltip-row';const key=document.createElement('span');key.className='dkds-tooltip-key';key.textContent=String(row?.label??row?.key??'');const value=document.createElement('span');value.className='dkds-tooltip-value';value.textContent=String(row?.value??'');line.append(key,value);node.appendChild(line);}if(spec.text&&!rows.length){const line=document.createElement('div');line.textContent=String(spec.text);node.appendChild(line);}node.classList.remove('hidden');const rect=anchor?.getBoundingClientRect?.(),x=Number(point?.x??point?.clientX??(rect?rect.right+8:12)),y=Number(point?.y??point?.clientY??(rect?rect.top:12));node.style.left=`${Math.max(8,x+10)}px`;node.style.top=`${Math.max(8,y+10)}px`;return node;}
    hide(){this.node?.classList.add('hidden');}
    bind(target,spec={}){const el=resolveElement(target);if(!el)return()=>{};const enter=event=>this.show(typeof spec==='function'?spec(event):{...spec,point:event});const move=event=>{if(this.node&&!this.node.classList.contains('hidden')){this.node.style.left=`${event.clientX+10}px`;this.node.style.top=`${event.clientY+10}px`;}};const leave=()=>this.hide();el.addEventListener('mouseenter',enter);el.addEventListener('mousemove',move);el.addEventListener('mouseleave',leave);return()=>{el.removeEventListener('mouseenter',enter);el.removeEventListener('mousemove',move);el.removeEventListener('mouseleave',leave);};}
    dispose(){this.node?.remove?.();this.node=null;}
  }

  class GroupPlot {
    constructor(scope,container,spec={}){this.scope=scope;this.owner=scope?.owner||'core';this.container=resolveElement(container);this.spec={minItemWidth:300,minItemHeight:220,gap:12,columns:'auto',...spec};this.cards=new Map();this.solver=scope?.layoutSolver||new ActiveLayoutSolver(scope);if(!this.container)throw new Error('GroupPlot container not found.');this.container.classList.add('dkds-group-plot');this.resizeObserver=window.ResizeObserver?new ResizeObserver(()=>this.layout()):null;this.resizeObserver?.observe(this.container);}
    setItems(items=[]){const rows=Array.isArray(items)?items:[],active=new Set();for(const [index,item] of rows.entries()){const id=String(item?.id||`item-${index+1}`);active.add(id);let row=this.cards.get(id);if(!row){const card=document.createElement('section');card.className='dkds-group-plot-card';card.dataset.groupPlotId=id;const head=document.createElement('header');head.className='dkds-group-plot-head';const title=document.createElement('span');title.className='dkds-group-plot-title';head.appendChild(title);const body=document.createElement('div');body.className='dkds-group-plot-body';card.append(head,body);this.container.appendChild(card);row={id,card,head,title,body,surface:null};this.cards.set(id,row);}row.title.textContent=String(item?.title||id);row.item=item;if(typeof this.spec.renderItem==='function')row.surface=this.spec.renderItem({id,index,item,card:row.card,header:row.head,container:row.body,previous:row.surface,scope:this.scope,group:this})??row.surface;}for(const [id,row] of [...this.cards])if(!active.has(id)){try{row.surface?.dispose?.();}catch{}row.card.remove();this.cards.delete(id);}this.layout();return this;}
    layout(){const solved=this.solver.solve({container:this.container,count:this.cards.size,columns:this.spec.columns,minItemWidth:this.spec.minItemWidth,minItemHeight:this.spec.minItemHeight,maxColumns:this.spec.maxColumns||6,gap:this.spec.gap,aspectRatio:this.spec.aspectRatio||1.62,maxItemHeight:this.spec.maxItemHeight||420});this.container.style.setProperty('--dkds-group-cols',String(solved.columns));this.container.style.setProperty('--dkds-group-gap',`${solved.gap}px`);this.container.style.setProperty('--dkds-group-item-height',`${solved.itemHeight}px`);this.container.classList.toggle('is-overflowing',solved.overflowY);this.lastLayout=solved;for(const row of this.cards.values())try{row.surface?.resize?.();}catch{}return solved;}
    setColumns(value='auto'){this.spec.columns=value;return this.layout();}
    diagnostics(){return Object.freeze({owner:this.owner,count:this.cards.size,layout:this.lastLayout||this.layout()});}
    dispose(){this.resizeObserver?.disconnect?.();for(const row of this.cards.values())try{row.surface?.dispose?.();}catch{}this.cards.clear();this.container?.classList?.remove('dkds-group-plot');}
  }


  const DEFAULT_SCIENTIFIC_INTERACTION_BINDINGS=Object.freeze([
    Object.freeze({id:'core.manipulate',gesture:'drag',target:'manipulator',intent:'manipulate',priority:100}),
    Object.freeze({id:'core.marker.select-additive',gesture:'click',target:'marker',modifiers:['ctrl'],intent:'select',selectionMode:'additive',priority:10}),
    Object.freeze({id:'core.marker.select',gesture:'click',target:'marker',intent:'select'}),
    Object.freeze({id:'core.marker.activate',gesture:'double-click',target:'marker',intent:'activate'}),
    Object.freeze({id:'core.marker.context',gesture:'context',target:'marker',intent:'context-menu'}),
    Object.freeze({id:'core.curve.select-additive',gesture:'click',target:'curve',modifiers:['ctrl'],intent:'select',selectionMode:'additive',priority:10}),
    Object.freeze({id:'core.curve.select',gesture:'click',target:'curve',intent:'select'}),
    Object.freeze({id:'core.curve.activate',gesture:'double-click',target:'curve',intent:'activate'}),
    Object.freeze({id:'core.background.clear',gesture:'click',target:'background',intent:'clear-selection'}),
    Object.freeze({id:'core.background.reset',gesture:'double-click',target:'background',intent:'reset-view'}),
    Object.freeze({id:'core.background.zoom-box',gesture:'box',target:'background',modifiers:['ctrl'],intent:'zoom-box',priority:20}),
    Object.freeze({id:'core.background.select-region',gesture:'box',target:'background',intent:'select-region'}),
    Object.freeze({id:'core.plot.wheel-zoom',gesture:'wheel',target:'plot',intent:'zoom-wheel'})
  ]);
