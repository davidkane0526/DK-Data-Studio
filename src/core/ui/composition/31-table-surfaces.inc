

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
