  function renderDatasetList(){
    window.DKDSPlugins?.events?.emit?.('sidebar:data-render',{context:pluginUiContext()});
  }

  function humanFileSize(bytes){
    const n=Number(bytes)||0;
    if(n<1024)return `${n} B`;
    if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;
    return `${(n/1024/1024).toFixed(1)} MB`;
  }

  function formatImportNumber(value,digits=6){
    const n=Number(value);
    if(!Number.isFinite(n))return '—';
    if(Math.abs(n)>=1e4||(Math.abs(n)>0&&Math.abs(n)<1e-3))return n.toExponential(3);
    return n.toFixed(digits);
  }

  function importResolvedLayout(item){
    const layout=item?.settings?.layout||'auto';
    if(layout!=='auto')return layout;
    return item?.inspection?.suggestedLayout||'single';
  }

  function importLayoutName(layout){
    return {
      single:'单组 V/I',
      sharedX:'共享 V + 多个 I',
      paired:'V/I 成对多列',
      auto:'自动'
    }[layout]||layout;
  }

  function importDelimiterName(d){
    return {
      comma:'逗号',
      tab:'Tab',
      semicolon:'分号',
      whitespace:'空白',
      pipe:'竖线',
      auto:'自动'
    }[d]||d;
  }

  async function readImportItemText(item,force=false){
    if(!item)return;
    const requested=item.settings?.encoding||'auto';
    if(!force&&item.text&&item.loadedEncodingRequest===requested)return;
    item.loading=true;
    item.error='';
    renderImportFileList();
    try{
      const result=await window.electronAPI.readDataText({path:item.path,encoding:requested});
      item.text=result.text;
      item.detectedEncoding=result.encoding;
      item.loadedEncodingRequest=requested;
      item.size=result.size;
      item.loading=false;
      recomputeImportItem(item,!item.mappingTouched);
    }catch(err){
      item.loading=false;
      item.error=err?.message||String(err);
    }
  }

  function recomputeImportItem(item,initializeMapping=false){
    if(!item?.text)return;
    try{
      const provider=providerForImportItem(item);
      if(!provider)throw new Error(importScope()?'当前工作台没有兼容的数据导入器。':'没有可用的数据导入器。');
      if(!provider?.inspect)throw new Error(`导入器 ${item?.importerId||'(unknown)'} 不支持预览。`);
      item.importerId=provider.id;
      item.inspection=provider.inspect({
        name:item.name,path:item.path,text:item.text,encoding:item.detectedEncoding
      },item.settings);
      item.error='';

      if(provider.id==='flexible-text'){
        if(initializeMapping||!item.mappingTouched){
          item.settings.xCol=item.inspection.suggestedX;
          item.settings.yCol=item.inspection.suggestedYCols[0]??Math.min(1,item.inspection.headers.length-1);
          item.settings.yCols=item.inspection.suggestedYCols.slice();
          item.settings.pairStart=0;
        }

        const max=Math.max(0,item.inspection.headers.length-1);
        item.settings.xCol=Math.min(Math.max(0,Number(item.settings.xCol)||0),max);
        item.settings.yCol=Math.min(Math.max(0,Number(item.settings.yCol)||0),max);
        item.settings.pairStart=Math.min(Math.max(0,Number(item.settings.pairStart)||0),max);
        item.settings.yCols=(item.settings.yCols||[]).filter(c=>c>=0&&c<=max&&c!==item.settings.xCol);
        if(importDraft.columnFieldFilter)applyImportColumnFieldFilter(item,{touch:false});
      }
    }catch(err){
      item.error=err?.message||String(err);
      item.inspection=null;
    }
  }

  async function stageImportMetas(metas=[]){
    metas=(Array.isArray(metas)?metas:[]).filter(meta=>meta?.path);
    if(!metas.length)return false;
    for(const meta of metas){
      let item=importDraft.files.find(f=>f.path===meta.path);
      if(!item){
        const provider=chooseImportProvider(meta,ensureImportTargets());
        item={
          ...meta,checked:true,text:'',detectedEncoding:'',loadedEncodingRequest:'',
          importerId:provider?.id||'',settings:provider?.defaultOptions?.()||{},inspection:null,
          mappingTouched:false,loading:false,error:''
        };
        importDraft.files.push(item);
      }
    }
    if(!importDraft.activePath)importDraft.activePath=metas[0].path;
    renderImportWorkbench();
    // Read sequentially to keep the UI responsive for many instrument files.
    for(const meta of metas){
      const item=importDraft.files.find(f=>f.path===meta.path);
      await readImportItemText(item);
    }
    renderImportWorkbench();
    return true;
  }

  async function addImportFiles(){
    if(importDraft.fileDialogOpen)return;
    importDraft.fileDialogOpen=true;
    let metas=[];
    try{metas=await window.electronAPI.openDataFiles();}
    finally{importDraft.fileDialogOpen=false;}
    return stageImportMetas(metas);
  }

  async function openFilesAuto(){
    if(importDraft.fileDialogOpen)return;
    importDraft.fileDialogOpen=true;
    let metas=[];
    try{metas=await window.electronAPI.openDataFiles();}
    finally{importDraft.fileDialogOpen=false;}
    if(!metas?.length)return false;
    const data=[];let openedProjects=0;
    for(const meta of metas){
      const name=String(meta?.name||'').toLowerCase();
      let handled=false;
      if(name.endsWith('.json')){
        try{
          const row=await window.electronAPI.readDataText({path:meta.path,encoding:'auto'});
          const raw=JSON.parse(String(row?.text||''));
          if(window.DKDSProjectFormat?.isProjectLike?.(raw)){
            const project=window.DKDSProjectFormat.parseProjectText(String(row.text||''));
            openProjectPayload({project,path:meta.path});openedProjects++;handled=true;
          }
        }catch(err){console.debug('[DKDS auto file classify]',meta?.name,err?.message||err);}
      }
      if(!handled)data.push(meta);
    }
    if(data.length){openImportWorkbench();await stageImportMetas(data);}
    if(openedProjects&&data.length)setStatus(`已自动识别并打开 ${openedProjects} 个工程，其余 ${data.length} 个文件进入数据导入工作台。`);
    return true;
  }

  async function openDirectoryAuto(){
    const tree=await window.electronAPI.openDataDirectory?.();
    if(!tree?.uri)return false;
    const listed=await window.electronAPI.listDataDirectory?.({uri:tree.uri,relativePath:''});
    const files=(Array.isArray(listed?.entries)?listed.entries:Array.isArray(listed)?listed:[]).filter(row=>row&&!row.directory);
    if(!files.length){setStatus('所选文件夹中没有可读取文件。');return false;}
    const dataSeeds=[];let openedProjects=0;
    for(const row of files){
      const name=String(row.name||'document');
      const payload=await window.electronAPI.readDataDocument?.({uri:row.uri});
      const base64=String(payload?.base64||payload||'');
      let handled=false;
      if(name.toLowerCase().endsWith('.json')&&base64){
        try{
          const decoded=decodeImportSeed({base64,encoding:'auto'});
          const raw=JSON.parse(decoded.text);
          if(window.DKDSProjectFormat?.isProjectLike?.(raw)){openProjectBase64({base64,path:`provider://${tree.name||'folder'}/${name}`,name});openedProjects++;handled=true;}
        }catch(err){console.debug('[DKDS folder auto classify]',name,err?.message||err);}
      }
      if(!handled&&base64)dataSeeds.push({name,path:`provider://${tree.name||'folder'}/${name}`,base64,size:Number(row.size)||0});
    }
    if(dataSeeds.length)openImportWorkbench({files:dataSeeds,source:'android-provider'});
    if(openedProjects&&dataSeeds.length)setStatus(`文件夹中自动打开 ${openedProjects} 个工程，其余 ${dataSeeds.length} 个文件进入数据导入工作台。`);
    return true;
  }

  function base64ImportBytes(base64){
    const bin=atob(String(base64||'')),bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return bytes;
  }

  function decodeImportSeed(seed){
    if(typeof seed?.text==='string')return {text:seed.text.replace(/^\uFEFF/,''),encoding:String(seed.encoding||'utf-8')};
    const bytes=base64ImportBytes(seed?.base64||'');
    if(!bytes.length)return {text:'',encoding:String(seed?.encoding||'utf-8')};
    const requested=String(seed?.encoding||'auto').toLowerCase();
    if(requested&&requested!=='auto'){
      const alias=({utf8:'utf-8',gbk:'gb18030',gb2312:'gb18030',sjis:'shift_jis','shift-jis':'shift_jis',latin1:'windows-1252'})[requested]||requested;
      try{return {text:new TextDecoder(alias,{fatal:false}).decode(bytes).replace(/^\uFEFF/,''),encoding:alias};}catch{}
    }
    if(bytes.length>=3&&bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf)return {text:new TextDecoder('utf-8').decode(bytes.subarray(3)),encoding:'utf-8'};
    if(bytes.length>=2&&bytes[0]===0xff&&bytes[1]===0xfe)return {text:new TextDecoder('utf-16le').decode(bytes.subarray(2)),encoding:'utf-16le'};
    try{return {text:new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,''),encoding:'utf-8'};}
    catch{try{return {text:new TextDecoder('gb18030',{fatal:false}).decode(bytes).replace(/^\uFEFF/,''),encoding:'gb18030'};}catch{return {text:new TextDecoder('utf-8',{fatal:false}).decode(bytes).replace(/^\uFEFF/,''),encoding:'utf-8'};}}
  }

  function ingestImportSeedFiles(files=[]){
    const rows=Array.isArray(files)?files:[];
    for(const seed of rows){
      const name=String(seed?.name||String(seed?.path||'').split(/[\\/]/).pop()||`remote-${importDraft.files.length+1}.txt`);
      const path=String(seed?.path||`remote://${name}`);
      if(importDraft.files.some(row=>row.path===path))continue;
      const decoded=decodeImportSeed(seed);
      const meta={name,path,size:Number(seed?.size)||base64ImportBytes(seed?.base64||'').length};
      const provider=chooseImportProvider(meta,ensureImportTargets());
      const item={...meta,checked:true,text:decoded.text,detectedEncoding:decoded.encoding,loadedEncodingRequest:'auto',importerId:provider?.id||'',settings:provider?.defaultOptions?.()||{},inspection:null,mappingTouched:false,importerTouched:false,loading:false,error:''};
      importDraft.files.push(item);
      if(item.text)recomputeImportItem(item,true);
      if(!importDraft.activePath)importDraft.activePath=path;
    }
  }

  function openImportWorkbench(options={}){
    const scoped=String(options?.mode||'')==='scoped'||!!options?.consumerId;
    if(scoped){
      const consumerId=String(options?.consumerId||options?.targets?.[0]||'').trim();
      const target=dataConsumerTargets().find(row=>row.id===consumerId)||null;
      const accepts=Array.isArray(options?.accepts)?options.accepts.map(String).filter(Boolean):(target?.accepts||[]);
      importDraft.scope={mode:'scoped',consumerId,label:String(options?.consumerLabel||target?.label||consumerId||'当前工作台'),icon:String(options?.consumerIcon||target?.icon||'◇'),accepts};
      importDraft.targets=consumerId?[consumerId]:[];
    }else{
      importDraft.scope=null;
      if(Array.isArray(options?.targets))importDraft.targets=[...new Set(options.targets.map(String).filter(Boolean))];
      else importDraft.targets=null;
      ensureImportTargets();
    }
    if(Array.isArray(options?.files)&&options.files.length)ingestImportSeedFiles(options.files);
    if(options?.importerId){
      const provider=importProvider(options.importerId);
      if(provider)for(const item of importDraft.files){
        item.importerId=provider.id;item.importerTouched=true;item.settings=provider.defaultOptions?.()||{};item.mappingTouched=false;if(item.text)recomputeImportItem(item,true);
      }
    }else autoRouteImportersForTargets();
    $('#importPanel').classList.remove('hidden');
    renderImportWorkbench();
  }

  function dataConsumerTargets(){
    const rows=window.DKDSPlugins?.manager?.list?.()||[];
    return rows.filter(row=>row?.enabled!==false&&row?.pluginType==='workbench').map(row=>({
      id:String(row.id),label:String(row.workspaceTitle||row.name||row.id),icon:String(row.workspaceIcon||row.icon||'◇'),order:Number(row.order)||100,accepts:Array.isArray(row?.data?.accepts)?row.data.accepts.map(String):[]
    })).sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label));
  }

  function activeDataConsumerId(){
    const activeId=window.DKDSPlugins?.activities?.active?.();
    const activity=(window.DKDSPlugins?.activities?.list?.()||[]).find(row=>String(row.id)===String(activeId));
    const pluginId=String(activity?.pluginId||'');
    return dataConsumerTargets().some(row=>row.id===pluginId)?pluginId:'';
  }

  function ensureImportTargets(){
    if(Array.isArray(importDraft.targets))return importDraft.targets;
    const active=activeDataConsumerId();importDraft.targets=active?[active]:[];return importDraft.targets;
  }

  function autoRouteImportersForTargets(){
    for(const item of importDraft.files){
      if(item.importerTouched)continue;
      const provider=chooseImportProvider(item,ensureImportTargets());
      if(!provider||provider.id===item.importerId)continue;
      item.importerId=provider.id;
      item.settings=provider.defaultOptions?.()||{};
      item.mappingTouched=false;
      if(item.text)recomputeImportItem(item,true);
    }
  }

  function renderImportTargets(){
    const bar=document.querySelector('.import-target-bar');
    const scope=importScope();
    if(bar)bar.classList.toggle('hidden',!!scope);
    const title=document.querySelector('.import-workbench-header h2');
    const subtitle=document.querySelector('.import-workbench-subtitle');
    if(title)title.textContent=scope?`导入到 ${scope.label}`:'数据导入工作台';
    if(subtitle)subtitle.textContent=scope?'仅显示与当前工作台兼容的导入器；导入完成后自动归入当前工作台。':'默认自动识别；特殊仪器格式可逐文件调整编码、跳行、分隔符和列映射。';
    const host=$('#importTargetOptions');if(!host)return;
    if(scope){host.innerHTML='';return;}
    const targets=dataConsumerTargets(),selected=new Set(ensureImportTargets());host.innerHTML='';
    for(const row of targets){const label=document.createElement('label');label.className='import-target-chip';label.innerHTML=`<input type="checkbox" value="${escapeHtml(row.id)}" ${selected.has(row.id)?'checked':''}><span class="import-target-icon">${escapeHtml(row.icon)}</span><span>${escapeHtml(row.label)}</span>`;label.querySelector('input').onchange=()=>{importDraft.targets=[...host.querySelectorAll('input:checked')].map(input=>String(input.value));autoRouteImportersForTargets();renderImportWorkbench();};host.appendChild(label);}
    renderImportTargetHint();
  }

  function renderImportTargetHint(){
    const hint=$('#importTargetHint');if(!hint)return;const selected=new Set(Array.isArray(importDraft.targets)?importDraft.targets:[]),targets=dataConsumerTargets(),labels=targets.filter(row=>selected.has(row.id)).map(row=>row.label);
    hint.textContent=labels.length?`将分配给：${labels.join('、')}。同一数据仅保存一份，可同时供多个工作台使用。`:'未选择分析用途：数据将只进入数据中心，之后可再分配。';
  }

  function closeImportWorkbench(){
    $('#importPanel').classList.add('hidden');
  }

  function importFileIndex(path){return importDraft.files.findIndex(item=>String(item.path)===String(path));}

  function setImportCheckedRange(fromPath,toPath,checked=true){
    const from=importFileIndex(fromPath),to=importFileIndex(toPath);if(from<0||to<0)return false;
    const lo=Math.min(from,to),hi=Math.max(from,to);for(let i=lo;i<=hi;i++)importDraft.files[i].checked=!!checked;return true;
  }

  function invertImportChecked(){for(const item of importDraft.files)item.checked=!item.checked;renderImportWorkbench();}

  function handleImportListShortcut(event){
    if($('#importPanel')?.classList.contains('hidden'))return;
    if(event.target?.closest?.('input,select,textarea,[contenteditable="true"]')&&event.target?.id!=='importFileList')return;
    const mod=event.ctrlKey||event.metaKey,key=String(event.key||'').toLowerCase();
    if(mod&&key==='a'){event.preventDefault();importDraft.files.forEach(f=>f.checked=true);renderImportWorkbench();}
    else if(mod&&key==='i'){event.preventDefault();invertImportChecked();}
  }

  function renderImportFileList(){
    const host=$('#importFileList');
    if(!host)return;
    host.innerHTML='';
    for(const item of importDraft.files){
      const el=document.createElement('div');
      el.className=`import-file-item ${item.path===importDraft.activePath?'active':''} ${item.error?'error':''}`;
      const ins=item.inspection;
      const provider=providerForImportItem(item);
      const layout=ins&&provider?.id==='flexible-text'?importResolvedLayout(item):'';
      el.innerHTML=`
        <div class="import-file-top">
          <input type="checkbox" ${item.checked?'checked':''}>
          <div class="import-file-name" title="${escapeHtml(item.path)}">${escapeHtml(item.name)}</div>
        </div>
        <div class="import-file-meta">
          ${item.loading?'读取中…':
            item.error?escapeHtml(item.error):
            `${humanFileSize(item.size)} · ${escapeHtml(item.detectedEncoding||item.settings.encoding)} · ${ins?.headers?.length||0} 列 · ${ins?.rowCount||0} 行 · ${escapeHtml(provider?.name||provider?.id||'导入器')}${layout?` · ${escapeHtml(importLayoutName(layout))}`:''}`}
        </div>`;
      el.querySelector('input').onclick=e=>{
        e.stopPropagation();
        const next=!!e.target.checked;
        if(e.shiftKey&&importDraft.selectionAnchorPath)setImportCheckedRange(importDraft.selectionAnchorPath,item.path,next);
        else item.checked=next;
        importDraft.selectionAnchorPath=item.path;
        importDraft.activePath=item.path;
        renderImportWorkbench();
      };
      el.onclick=e=>{
        const additive=!!(e.ctrlKey||e.metaKey),range=!!e.shiftKey;
        importDraft.activePath=item.path;
        if(range&&importDraft.selectionAnchorPath)setImportCheckedRange(importDraft.selectionAnchorPath,item.path,true);
        else if(additive)item.checked=!item.checked;
        if(!range)importDraft.selectionAnchorPath=item.path;
        renderImportWorkbench();
      };
      host.appendChild(el);
    }
  }

  function importColumnOptions(item,selected){
    const headers=item?.inspection?.headers||[];
    return headers.map((h,i)=>`<option value="${i}" ${i===Number(selected)?'selected':''}>${i+1}: ${escapeHtml(h)}</option>`).join('');
  }

  function normalizeImportFieldName(value){return String(value||'').trim().toLocaleLowerCase();}
  function importAvailableColumnFields(){
    const counts=new Map(),labels=new Map();
    for(const item of importDraft.files){
      if(!item?.inspection||providerForImportItem(item)?.id!=='flexible-text')continue;
      const xCol=Number(item.settings?.xCol);
      const seen=new Set();
      for(const column of item.inspection.columns||[]){
        if(column.index===xCol||Number(column.numericFraction)<.5)continue;
        const label=String(column.header||'').trim();const key=normalizeImportFieldName(label);
        if(!key||seen.has(key))continue;seen.add(key);labels.set(key,label);counts.set(key,(counts.get(key)||0)+1);
      }
    }
    return [...counts.entries()].map(([key,count])=>({key,label:labels.get(key)||key,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  }
  function applyImportColumnFieldFilter(item,{touch=true}={}){
    const ins=item?.inspection;if(!ins)return false;const wanted=normalizeImportFieldName(importDraft.columnFieldFilter);if(!wanted)return false;
    const layout=importResolvedLayout(item);if(layout!=='single'&&layout!=='sharedX')return false;
    const eligible=(ins.columns||[]).filter(column=>column.index!==Number(item.settings.xCol)&&Number(column.numericFraction)>=.5&&normalizeImportFieldName(column.header)===wanted);
    if(layout==='sharedX')item.settings.yCols=eligible.map(column=>column.index);
    else{item.settings.yCol=eligible.length?eligible[0].index:-1;item.settings.yCols=eligible.length?[eligible[0].index]:[];}
    if(touch)item.mappingTouched=true;return true;
  }
  function applyImportFieldFilterToAll(){for(const item of importDraft.files)if(item?.inspection&&providerForImportItem(item)?.id==='flexible-text')applyImportColumnFieldFilter(item);renderImportWorkbench();}
  function clearImportColumnFieldFilter({restoreAuto=false}={}){
    importDraft.columnFieldFilter='';
    if(restoreAuto)for(const row of importDraft.files){if(row?.inspection&&providerForImportItem(row)?.id==='flexible-text'){row.mappingTouched=false;recomputeImportItem(row,true);}}
  }
  function renderImportColumnFieldFilter(item){
    const wrap=$('#importColumnFieldFilter'),select=$('#importColumnFieldSelect');if(!wrap||!select)return;
    const layout=importResolvedLayout(item),rows=importAvailableColumnFields(),supported=layout==='single'||layout==='sharedX';
    wrap.classList.toggle('hidden',!rows.length||!supported);if(!rows.length||!supported){select.innerHTML='<option value="">全部 / 自动</option>';return;}
    const current=normalizeImportFieldName(importDraft.columnFieldFilter);
    select.innerHTML='<option value="">全部 / 自动</option>'+rows.map(row=>`<option value="${escapeHtml(row.key)}">${escapeHtml(row.label)}${row.count>1?` · ${row.count} 文件`:''}</option>`).join('');
    select.value=[...select.options].some(option=>normalizeImportFieldName(option.value)===current)?current:'';
    if(current&&!select.value)importDraft.columnFieldFilter='';
    select.onchange=()=>{
      importDraft.columnFieldFilter=select.value||'';
      if(importDraft.columnFieldFilter)applyImportFieldFilterToAll();
      else{clearImportColumnFieldFilter({restoreAuto:true});renderImportWorkbench();}
    };
  }

  function renderImportYColumns(item){
    const host=$('#importYColumns');
    if(!host)return;
    host.innerHTML='';
    const ins=item.inspection;
    if(!ins)return;
    const selected=new Set(item.settings.yCols||[]);
    for(const c of ins.columns){
      if(c.index===Number(item.settings.xCol))continue;
      const label=document.createElement('label');
      label.className='import-y-column';
      label.title=`数值率 ${(c.numericFraction*100).toFixed(0)}%`;
      label.innerHTML=`<input type="checkbox" value="${c.index}" ${selected.has(c.index)?'checked':''}><span>${c.index+1}: ${escapeHtml(c.header)}</span>`;
      label.querySelector('input').onchange=()=>{
        const values=[...host.querySelectorAll('input:checked')].map(x=>Number(x.value));
        importDraft.columnFieldFilter='';
        item.settings.yCols=values;
        item.mappingTouched=true;
        renderImportSeriesVgRows(item);
        renderImportPreview(item);
        renderImportGlobalSummary();
      };
      host.appendChild(label);
    }
  }

  function importSeriesColumns(item){
    const ins=item?.inspection;
    if(!ins)return [];
    const layout=importResolvedLayout(item);
    if(layout==='single'){
      const c=Number(item.settings.yCol);
      return Number.isFinite(c)&&c>=0&&c<ins.headers.length?[c]:[];
    }
    if(layout==='sharedX'){
      return [...new Set(item.settings.yCols||[])]
        .map(Number).filter(c=>Number.isFinite(c)&&c>=0&&c<ins.headers.length&&c!==Number(item.settings.xCol));
    }
    if(layout==='paired'){
      const out=[];
      const start=Math.max(0,Number(item.settings.pairStart)||0);
      for(let c=start;c+1<ins.headers.length;c+=2)out.push(c+1);
      return out;
    }
    return [];
  }

  function inferredImportVg(item,col){
    const s=item?.settings||{};
    const header=item?.inspection?.headers?.[col]||'';
    if(s.vgMode==='manual')return Number.isFinite(Number(s.manualVg))?Number(s.manualVg):NaN;
    const provider=flexibleImportProvider();
    if(s.vgMode==='filename')return provider.parseVg(item.name,item.text);
    if(s.vgMode==='header')return provider.parseVgFromHeader(header);
    const h=provider.parseVgFromHeader(header);
    return Number.isFinite(h)?h:provider.parseVg(item.name,item.text);
  }

  function renderImportSeriesVgRows(item){
    const host=$('#importSeriesVgRows');
    if(!host)return;
    host.innerHTML='';
    if(!item?.inspection)return;

    const cols=importSeriesColumns(item);
    const overrides=item.settings.vgOverrides||{};
    if(!cols.length){
      host.innerHTML='<div class="import-diagnosis">当前列映射没有可生成的数据组。</div>';
      return;
    }

    cols.forEach((col,index)=>{
      const header=item.inspection.headers[col]||`Col ${col+1}`;
      const inferred=inferredImportVg(item,col);
      const hasOverride=Object.prototype.hasOwnProperty.call(overrides,String(col))&&Number.isFinite(Number(overrides[String(col)]));
      const row=document.createElement('div');
      row.className='import-series-vg-row';
      row.innerHTML=`
        <div class="import-series-vg-label" title="${escapeHtml(header)}">
          ${index+1}. 列 ${col+1}: ${escapeHtml(header)}
          <span class="import-diagnosis">${Number.isFinite(inferred)?` · 自动 ${inferred} V`:' · 自动未知'}</span>
        </div>
        <label class="import-series-vg-input-wrap">
          <input class="import-series-vg-input" type="number" step="any"
            value="${hasOverride?Number(overrides[String(col)]):''}"
            placeholder="${Number.isFinite(inferred)?inferred:'?'}" data-col="${col}">
          <span>V</span>
        </label>`;
      const input=row.querySelector('input');
      input.onchange=()=>{
        const raw=input.value.trim();
        const next={...(item.settings.vgOverrides||{})};
        if(raw==='')delete next[String(col)];
        else{
          const n=Number(raw);
          if(!Number.isFinite(n)){
            input.value=hasOverride?String(overrides[String(col)]):'';
            setStatus('每列 Vg 必须是有效数字，或留空使用自动识别。');
            return;
          }
          next[String(col)]=n;
        }
        item.settings.vgOverrides=next;
        item.mappingTouched=true;
        renderImportSeriesVgRows(item);
        renderImportPreview(item);
        renderImportGlobalSummary();
      };
      host.appendChild(row);
    });
  }

  function renderImportPreview(item){
    const ins=item?.inspection;
    if(!ins){
      $('#importPreviewSummary').innerHTML='';
      $('#importPreviewTable').innerHTML='<tbody><tr><td>无法解析预览</td></tr></tbody>';
      return;
    }

    const provider=providerForImportItem(item);
    let estimate=1,layout='';
    if(provider?.id==='flexible-text'){
      layout=importResolvedLayout(item);
      if(layout==='sharedX')estimate=(item.settings.yCols||[]).length;
      if(layout==='paired')estimate=Math.max(0,Math.floor((ins.headers.length-(item.settings.pairStart||0))/2));
    }else{
      try{estimate=Math.max(1,Number(provider?.estimateArtifacts?.({name:item.name,path:item.path,text:item.text,encoding:item.detectedEncoding},item.settings,ins))||1);}catch{estimate=1;}
    }

    const chips=[
      `解析器 ${provider?.name||provider?.id||'—'}`,
      `检测编码 ${item.detectedEncoding||item.settings.encoding}`,
      `分隔符 ${importDelimiterName(ins.delimiter)}`,
      `${ins.headers.length} 列`,
      `${ins.rowCount} 个有效数值行`,
      `起始源文件行 ${ins.dataStartSourceLine??'—'}`,
      ...(layout?[`排列 ${importLayoutName(layout)}`]:[]),
      `预计生成 ${estimate} 个数据对象`
    ];
    $('#importPreviewSummary').innerHTML=chips.map(t=>`<span class="import-preview-chip">${escapeHtml(t)}</span>`).join('');

    const headers=ins.headers;
    const rows=ins.previewRows.slice(0,40);
    $('#importPreviewTable').innerHTML=`
      <thead><tr><th>源行</th>${headers.map((h,i)=>`<th>${i+1}: ${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${r.sourceLine}</td>${r.values.map(v=>
        Number.isFinite(v)?`<td>${formatImportNumber(v,6)}</td>`:'<td class="import-nan">—</td>'
      ).join('')}</tr>`).join('')}</tbody>`;

    $('#importAutoDiagnosis').textContent=provider?.id==='flexible-text'
      ? `自动建议：${importLayoutName(ins.suggestedLayout)}；X=${ins.suggestedX+1}；Y=${ins.suggestedYCols.map(v=>v+1).join(', ')||'—'}`
      : `该解析器保留完整数值表；具体分析列与协议由目标工作台解释。`;
  }

  function renderImportEditor(){
    const item=importActiveItem();
    $('#importNoFile').classList.toggle('hidden',!!item);
    $('#importEditor').classList.toggle('hidden',!item);
    if(!item)return;

    const provider=providerForImportItem(item);
    item.importerId=provider?.id||item.importerId;
    const providerSelect=$('#importProvider');
    if(providerSelect){
      const providerRows=availableImportProviders();
      providerSelect.innerHTML=providerRows.length?providerRows.map(row=>`<option value="${escapeHtml(row.id)}">${escapeHtml(row.name||row.id)}</option>`).join(''):'<option value="">无兼容导入器</option>';
      providerSelect.disabled=!providerRows.length;
      providerSelect.value=item.importerId||'';
    }
    const flexible=provider?.id==='flexible-text';
    $('#importLayoutWrap')?.classList.toggle('hidden',!flexible);
    $('#importFlexibleMappingSection')?.classList.toggle('hidden',!flexible);
    const genericNote=$('#importGenericImporterNote');
    if(genericNote){
      genericNote.classList.toggle('hidden',flexible);
      genericNote.innerHTML=flexible?'':`<strong>${escapeHtml(provider?.name||provider?.id||'通用解析器')}</strong><span>${escapeHtml(provider?.description||'导入器将生成标准数据对象，具体分析参数由目标工作台维护。')}</span>`;
    }

    const st=item.settings||{};
    $('#importEncoding').value=st.encoding||'auto';
    $('#importSkipRows').value=st.skipRows||0;
    $('#importEndRow').value=st.endRow||0;
    $('#importDelimiter').value=st.delimiter||'auto';
    $('#importHeaderMode').value=st.headerMode||'auto';
    $('#importDecimal').value=st.decimalSeparator||'auto';
    $('#importCommentPrefix').value=st.commentPrefix||'auto';

    if(flexible){
      $('#importLayout').value=st.layout||'auto';
      $('#importVoltageUnit').value=st.voltageUnit||'auto';
      $('#importCurrentUnit').value=st.currentUnit||'auto';
      $('#importVgMode').value=st.vgMode||'auto';
      $('#importManualVg').value=Number.isFinite(Number(st.manualVg))?st.manualVg:'';

      const options=importColumnOptions(item,st.xCol);
      $('#importXCol').innerHTML=options;
      $('#importYCol').innerHTML=importColumnOptions(item,st.yCol);
      $('#importPairStart').innerHTML=importColumnOptions(item,st.pairStart);

      const layout=importResolvedLayout(item);
      $('#importYSingleWrap').classList.toggle('hidden',layout!=='single');
      $('#importYMultiWrap').classList.toggle('hidden',layout!=='sharedX');
      $('#importPairStartWrap').classList.toggle('hidden',layout!=='paired');
      $('#importManualVgWrap').classList.toggle('hidden',st.vgMode!=='manual');

      renderImportColumnFieldFilter(item);
      renderImportYColumns(item);
      renderImportSeriesVgRows(item);
    }
    renderImportPreview(item);
  }

  function renderImportGlobalSummary(){
    const checked=importDraft.files.filter(f=>f.checked);
    let objects=0,errors=0;
    const providerNames=new Set();
    for(const item of checked){
      if(item.error||!item.inspection){errors++;continue;}
      const provider=providerForImportItem(item);providerNames.add(provider?.name||provider?.id||'导入器');
      if(provider?.id==='flexible-text'){
        const layout=importResolvedLayout(item);
        if(layout==='single')objects+=1;
        else if(layout==='sharedX')objects+=(item.settings.yCols||[]).length;
        else if(layout==='paired')objects+=Math.max(0,Math.floor((item.inspection.headers.length-(item.settings.pairStart||0))/2));
      }else{
        try{objects+=Math.max(1,Number(provider?.estimateArtifacts?.({name:item.name,path:item.path,text:item.text,encoding:item.detectedEncoding},item.settings,item.inspection))||1);}catch{objects+=1;}
      }
    }
    const parserText=providerNames.size?` · ${[...providerNames].join(' / ')}`:'';
    $('#importGlobalSummary').textContent=
      `${checked.length}/${importDraft.files.length} 个文件已勾选 · 预计生成 ${objects} 个数据对象${parserText}${errors?` · ${errors} 个文件需检查`:''}`;
    $('#importCommitBtn').disabled=!checked.length||checked.every(f=>f.error||!f.inspection);
  }

  function renderImportWorkbench(){
    renderImportTargets();
    renderImportFileList();
    renderImportGlobalSummary();
    renderImportEditor();
  }

  async function runImportWorkbenchAutomationSmoke(){
    const savedDraft=importDraft;
    const panel=$('#importPanel');
    const panelWasHidden=panel?.classList.contains('hidden')!==false;
    try{
      const text='vd(V),id(A)\n-1,-1e-9\n0,0\n1,1e-9\n';
      const item={
        name:'automation-import.csv',path:'automation://import-workbench.csv',size:text.length,checked:true,
        text,detectedEncoding:'utf-8',loadedEncodingRequest:'auto',
        settings:flexibleImportProvider().defaultOptions(),inspection:null,mappingTouched:false,loading:false,error:''
      };
      recomputeImportItem(item,true);
      if(item.error||!item.inspection)throw new Error(item.error||'Synthetic import inspection failed.');
      importDraft={files:[item],activePath:item.path,loading:false,fileDialogOpen:false,targets:[],scope:null,selectionAnchorPath:item.path,columnFieldFilter:''};
      renderImportWorkbench();

      const checkbox=$('#importFileList input[type="checkbox"]');
      const checkedSummary=$('#importGlobalSummary')?.textContent||'';
      const previewRows=$('#importPreviewTable')?.querySelectorAll('tbody tr')?.length||0;
      const commitEnabled=!$('#importCommitBtn')?.disabled;
      if(!checkbox?.checked)throw new Error('Synthetic import file is not checked.');
      if(!checkedSummary.includes('1/1 个文件已勾选'))throw new Error(`Unexpected selected-file summary: ${checkedSummary}`);
      if(!previewRows)throw new Error('Import preview table did not render any rows.');
      if(!commitEnabled)throw new Error('Import commit button stayed disabled for a valid selected file.');

      checkbox.click();
      const uncheckedSummary=$('#importGlobalSummary')?.textContent||'';
      const disabledAfterUncheck=$('#importCommitBtn')?.disabled===true;
      if(!uncheckedSummary.includes('0/1 个文件已勾选'))throw new Error(`Checkbox did not update summary: ${uncheckedSummary}`);
      if(!disabledAfterUncheck)throw new Error('Import commit button did not disable after unchecking the only file.');

      checkbox.click();
      const restoredSummary=$('#importGlobalSummary')?.textContent||'';
      if(!restoredSummary.includes('1/1 个文件已勾选'))throw new Error(`Checkbox did not restore selected summary: ${restoredSummary}`);
      return {selectedSummary:checkedSummary,uncheckedSummary,restoredSummary,previewRows,commitEnabled};
    }finally{
      importDraft=savedDraft;
      renderImportWorkbench();
      if(panel)panel.classList.toggle('hidden',panelWasHidden);
    }
  }

  function currentProjectWindowSmokePayload(){
    captureActiveProjectTab();
    const project=makeProject();
    const artifactSnapshot=snapshotArtifactRows();
    const tables=artifactSnapshot.filter(row=>row?.kind==='data.table');
    return {
      project,
      artifactSnapshot,
      capabilitySnapshot:capabilitySnapshotForWindows(),
      summary:{
        datasetCount:Array.isArray(project.datasets)?project.datasets.length:0,
        artifactCount:artifactSnapshot.length,
        dataTableCount:tables.length,
        transientArtifactCount:artifactSnapshot.filter(row=>row?.transient===true).length,
        totalTableRows:tables.reduce((sum,row)=>sum+(Number(row?.rowCount)||0),0)
      }
    };
  }

  window.DKDSAutomationHost={
    ...(window.DKDSAutomationHost||{}),
    runImportWorkbenchSmoke:runImportWorkbenchAutomationSmoke,
    currentProjectWindowSmokePayload
  };

  async function updateImportSetting(key,value,{reload=false,mapping=false}={}){
    const item=importActiveItem();
    if(!item)return;
    item.settings[key]=value;
    if(mapping)item.mappingTouched=true;

    if(reload){
      await readImportItemText(item,true);
    }else{
      recomputeImportItem(item,false);
    }
    renderImportWorkbench();
  }

  async function applyCurrentImportSettingsToAll(){
    const current=importActiveItem();
    if(!current)return;
    const template=JSON.parse(JSON.stringify(current.settings));
    for(const item of importDraft.files){
      if(item.path===current.path)continue;
      item.importerId=current.importerId;
      item.importerTouched=true;
      item.settings=JSON.parse(JSON.stringify(template));
      item.mappingTouched=current.mappingTouched;
      await readImportItemText(item,true);
      recomputeImportItem(item,false);
    }
    renderImportWorkbench();
    setStatus('已将当前解析器和导入设置应用到全部待导入文件；每个文件重新生成了预览。');
  }

  async function resetCurrentImportAuto(){
    const item=importActiveItem();
    if(!item)return;
    const provider=providerForImportItem(item);
    item.settings=provider?.defaultOptions?.()||{};
    item.mappingTouched=false;
    await readImportItemText(item,true);
    recomputeImportItem(item,true);
    renderImportWorkbench();
  }

  async function commitImportWorkbench(){
    const selected=importDraft.files.filter(f=>f.checked);
    if(!selected.length)return;

    $('#importCommitBtn').disabled=true;
    importDraft.loading=true;
    try{
      const beforeArtifactRows=snapshotArtifactRows();
      const legacyRows=[];
      const artifactRows=[];
      const reports=[];
      const requestedAssignments=Array.isArray(importDraft.targets)?importDraft.targets.map(String).filter(Boolean):[];
      const assignmentUnion=(previous=[])=>{
        const prior=(Array.isArray(previous)?previous:[]).map(String).filter(Boolean);
        return prior.includes('*')?['*']:[...new Set([...prior,...requestedAssignments])];
      };
      const priorLegacyBySource=new Map();
      for(const dataset of state.datasets){
        const sourcePath=String(dataset?.sourcePath||dataset?.path||'');if(!sourcePath)continue;
        const rows=Object.prototype.hasOwnProperty.call(dataset||{},'assignments')?(Array.isArray(dataset.assignments)?dataset.assignments:['*']):['*'];
        const set=priorLegacyBySource.get(sourcePath)||new Set();for(const id of rows)set.add(String(id));priorLegacyBySource.set(sourcePath,set);
      }
      const priorArtifacts=state.artifactStore?.list?.({includeTransient:true})||[];
      const priorArtifactAssignments=(sourcePath,importerId)=>{
        const rows=priorArtifacts.filter(a=>a?.metadata?.importedSource===true&&String(a?.source?.path||'')===String(sourcePath)&&String(a?.metadata?.importerId||'')===String(importerId));
        const out=new Set();for(const a of rows)for(const id of (Array.isArray(a?.metadata?.dataAssignments)?a.metadata.dataAssignments:[]))out.add(String(id));return [...out];
      };

      for(const item of selected){
        await readImportItemText(item);
        if(item.error)continue;
        const provider=providerForImportItem(item);
        if(!provider)continue;
        const file={name:item.name,path:item.path,text:item.text,encoding:item.detectedEncoding};
        if(provider.storage==='legacy-datasets'){
          const result=provider.parse?.(file,item.settings)||{datasets:[]};
          const rows=Array.isArray(result?.datasets)?result.datasets:[];
          for(const dataset of rows){
            const sourcePath=String(dataset?.sourcePath||item.path||dataset?.path||'');
            const previous=[...(priorLegacyBySource.get(sourcePath)||[])];
            dataset.importedAt=dataset.importedAt||new Date().toISOString();
            dataset.dataProvenance=Array.isArray(dataset.dataProvenance)?dataset.dataProvenance:[];
            dataset.assignments=assignmentUnion(previous);
            legacyRows.push({dataset,sourcePath,providerId:provider.id});
          }
          if(rows.length)reports.push(`${item.name}: ${rows.length} 个 ${provider.name||provider.id} 数据对象`);
          continue;
        }
        const result=provider.parseArtifacts?.(file,item.settings);
        const rows=Array.isArray(result?.artifacts)?result.artifacts:[];
        const previous=priorArtifactAssignments(item.path,provider.id);
        for(const raw of rows){
          if(!window.DKDSData?.isArtifact?.(raw))continue;
          const artifact=window.DKDSData.deepClone(raw);
          artifact.metadata={...(artifact.metadata||{}),importedSource:true,importerId:provider.id,dataAssignments:assignmentUnion(previous)};
          artifact.source={...(artifact.source||{}),path:String(artifact?.source?.path||item.path),name:String(artifact?.source?.name||item.name),encoding:String(artifact?.source?.encoding||item.detectedEncoding||'auto')};
          artifactRows.push({artifact,sourcePath:item.path,providerId:provider.id});
        }
        if(rows.length)reports.push(`${item.name}: ${rows.length} 个 ${provider.name||provider.id} 数据对象`);
      }

      if(!legacyRows.length&&!artifactRows.length){
        setStatus('没有生成可导入的数据。请检查解析器、跳行、编码或分隔符设置。');
        return;
      }

      const legacySourcePaths=new Set(legacyRows.map(row=>row.sourcePath));
      if(legacySourcePaths.size){
        state.datasets=state.datasets.filter(dataset=>!legacySourcePaths.has(String(dataset?.sourcePath||dataset?.path||'')));
        state.datasets.push(...legacyRows.map(row=>row.dataset));
      }
      syncDatasetArtifacts({emit:false});

      if(artifactRows.length){
        const nextKeys=new Set(artifactRows.map(row=>String(row.artifact.id)));
        const importedPairs=new Set(artifactRows.map(row=>`${row.providerId}
${row.sourcePath}`));
        const stale=(state.artifactStore?.list?.({includeTransient:true})||[]).filter(a=>a?.metadata?.importedSource===true&&importedPairs.has(`${String(a?.metadata?.importerId||'')}
${String(a?.source?.path||'')}`)&&!nextKeys.has(String(a.id)));
        const removeIds=new Set();
        for(const root of stale){
          for(const child of (state.artifactStore?.lineage?.(root.id)?.descendants||[]))if(child?.id)removeIds.add(String(child.id));
          if(root?.id)removeIds.add(String(root.id));
        }
        state.artifactStore?.batch?.(api=>{
          for(const id of [...removeIds].reverse())api.remove?.(id);
          for(const row of artifactRows)api.upsert?.(row.artifact);
        });
      }

      const importDelta=diffArtifactRows(beforeArtifactRows);
      window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type:'import',artifactDelta:importDelta,artifacts:state.artifactStore?.list?.({includeTransient:true})||[]});
      pushArtifactDeltaToActivityWindows(importDelta,'import');
      void publishCapabilitySnapshot();
      if(legacyRows.length)clearMainView(false);
      renderAll();
      refreshOpenAnalysisPage();
      captureActiveProjectTab();

      importDraft.files=[];
      importDraft.activePath=null;
      importDraft.targets=null;
      importDraft.scope=null;
      importDraft.selectionAnchorPath=null;
      importDraft.columnFieldFilter='';
      closeImportWorkbench();
      setStatus(`导入完成：${reports.join('；')}。`);
    }catch(err){
      console.error(err);
      setStatus(`导入失败：${err?.message||String(err)}`);
    }finally{
      importDraft.loading=false;
      $('#importCommitBtn').disabled=false;
    }
  }
