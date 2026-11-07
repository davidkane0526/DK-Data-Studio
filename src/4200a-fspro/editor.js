(() => {
'use strict';
const host=document.getElementById('fs-modal-host');
const shell=document.getElementById('fs-shell');
const VALIDATE=window.DK4200PagePlanGuard?.validatePagePlan;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>JSON.parse(JSON.stringify(value));
const e=value=>esc(value);
const modes=['Constant','Linear Step','Linear Points','Log Points','List','Generator'];
const roles=[['CONDITION','Condition'],['X','Xsweep'],['P','Psweep']];
const inventory=new Set(); // Filled exclusively by a trusted native 4200A module enumeration.
const sample=()=>({
  schema:'dkts.fspro.page.v1', project:'Project',device:'Device 01',routine:'Routine 01',
  info:{type:'Mosfet',polarity:'PMOS',group:'MOS_IV',testType:'DC',name:'IV Sweep'},
  refNode:'S',refValue:'0',outputs:'Id',
  terminals:[
    {logical:'D',sourceMode:'voltage',signal:'Vds',resource:'None',relativeTo:'S',role:'CONDITION',generator:'Constant',bias:'0.05',compliance:'0.1',measureRange:{mode:'auto'},segments:[]},
    {logical:'G',sourceMode:'voltage',signal:'Vgs',resource:'None',relativeTo:'S',role:'X',generator:'Linear Step',start:'-0.3',stop:'0',step:'0.02',points:'21',compliance:'0.1',measureRange:{mode:'auto'},segments:[]},
    {logical:'S',sourceMode:'voltage',signal:'Vs',resource:'None',relativeTo:'GND',role:'CONDITION',generator:'Constant',bias:'0',compliance:'0.1',measureRange:{mode:'auto'},segments:[]},
    {logical:'B',sourceMode:'voltage',signal:'Vbs',resource:'None',relativeTo:'S',role:'P',generator:'Linear Points',start:'0',stop:'-1.1',step:'0.1',points:'5',compliance:'0.1',measureRange:{mode:'auto'},segments:[]}
  ],
  pageVars:[{name:'vgs',value:'1.1'},{name:'vstep',value:'0.02'},{name:'vbb',value:'-1.1'},{name:'vdthx',value:'0.05'}],
  associateSpecs:[],
  target:{expression:'Id = I(D)',plot:{X:'Vgs',Y:'Id',H:'',P:''},quoteVars:[]},
  strategy:{scope:'Local Setting',method:'Custom',integrationTime:'0.02',delayTime:'0.04',sourceRange:'Auto',measureRange:'Auto'}
});
let saved=sample(),draft=null,original=null,activeTab='Sweep',activeDialog='',unlocked=true;
const options=(items,selected)=>items.map(item=>{const [v,l,disabled]=Array.isArray(item)?item:[item,item];return `<option value="${e(v)}"${String(v)===String(selected)?' selected':''}${disabled?' disabled title="等待4200A测量编译器"':''}>${e(l)}</option>`}).join('');
const field=(label,key,value,kind='text',extra='')=>`<span class="fs-inline-field"><label for="field-${e(key)}">${e(label)}</label><input id="field-${e(key)}" data-bind="${e(key)}" type="${kind}" value="${e(value)}" ${extra}></span>`;
const select=(key,opts,value,attrs='')=>`<select data-bind="${e(key)}" aria-label="${e(key)}" ${attrs}>${options(opts,value)}</select>`;
const get=(obj,path)=>path.replace(/\[(\d+)\]/g,'.$1').split('.').reduce((x,k)=>x?.[k],obj);
const set=(obj,path,value)=>{const parts=path.replace(/\[(\d+)\]/g,'.$1').split('.');let at=obj;for(const k of parts.slice(0,-1)){if(!Object.prototype.hasOwnProperty.call(at,k))throw Error('Invalid field');at=at[k];}if(!Object.prototype.hasOwnProperty.call(at,parts[parts.length-1]))throw Error('Invalid field '+path);at[parts[parts.length-1]]=value;};
const note=message=>{document.getElementById('fs-messages').textContent=message;document.getElementById('fs-bottom-status').textContent=message;};
const emptyOption=(id)=>[['None','None'],...Array.from(inventory).sort().map(v=>[v,v])];
function buildSequence(t){
  const map={'Linear Step':'linear_step','Linear Points':'linear_points','Log Points':'log_points','List':'list','Generator':'multi_segment','Constant':'linear_points'};
  const mode=map[t.generator]||'linear_step';
  if(mode==='linear_step')return {mode,start:t.start??'0',stop:t.stop??'0',step:t.step??'1'};
  if(mode==='linear_points'||mode==='log_points')return {mode,start:t.start??'0',stop:t.stop??'0',points:t.points??'1'};
  if(mode==='list')return {mode,values:String(t.list??'').split(/[\s,]+/).filter(Boolean)};
  return {mode,segments:(t.segments?.length?t.segments:[{start:t.start??'0',stop:t.stop??'0'}])};
}
function createValidationPlan(){
  const x=draft.terminals.find(t=>t.role==='X'),p=draft.terminals.find(t=>t.role==='P');
  return {terminals:draft.terminals.map(t=>({
    logical:t.logical,resource:t.resource,role:t.role,sourceMode:t.sourceMode,compliance:t.compliance,
    relativeTo:t.relativeTo==='GND'?'GND':t.relativeTo,
    bias:t.bias??'0',measureRange:t.measureRange
  })),xSweep:x?buildSequence(x):undefined,...(p?{pSweep:buildSequence(p)}:{})};
}
function validateDraft(){
  if(!draft)return {valid:false,errors:[{reason:'No page'}]};
  const result=VALIDATE?VALIDATE(createValidationPlan()):{valid:false,errors:[{reason:'Validation module not loaded'}],warnings:[],executionAuthorized:false};
  const extra=[];
  for(const [i,t] of draft.terminals.entries()){
    if(!t.logical.trim())extra.push({code:'EMPTY_TERMINAL',path:`terminals[${i}].logical`,reason:'Terminal name is required'});
    if(t.role!=='CONDITION'&&!['Linear Step','Linear Points','Log Points','List','Generator'].includes(t.generator))extra.push({code:'SWEEP_GENERATOR',path:`terminals[${i}].generator`,reason:'Sweep must use a sweep generator'});
    if(t.role==='CONDITION'&&t.generator==='Constant'&&!String(t.bias||'').trim())extra.push({code:'EMPTY_BIAS',path:`terminals[${i}].bias`,reason:'Constant bias is required'});
  }
  return {...result,valid:result.valid&&extra.length===0,errors:[...result.errors,...extra],executionAuthorized:false};
}
function updateStatus(){
  if(activeDialog!=='page')return;
  const el=document.querySelector('.fs-validation');
  if(!el)return;
  const v=validateDraft();
  el.classList.toggle('fs-error',!v.valid);
  el.textContent=v.valid?'离线参数检查通过 · 未启用仪器输出':`检查：${v.errors[0]?.reason||'无效参数'}`;
  el.title=v.errors.map(x=>x.path+' '+x.reason).join('\n');
}
function infoMarkup(){
 const i=draft.info;
 const opts=[['Mosfet','Mosfet'],['Diode','Diode'],['2-terminal','2-terminal'],['Custom','Custom']];
 return `<fieldset class="fs-fieldset"><legend>Info</legend><div class="fs-info">
 <span class="fs-inline-field"><label>Type:</label>${select('info.type',opts,i.type)}</span>
 <span class="fs-inline-field"><label>Polarity:</label>${select('info.polarity',['PMOS','NMOS','N/A'],i.polarity)}</span>
 ${field('Group:','info.group',i.group)}
 <span class="fs-inline-field"><label>Test Type:</label>${select('info.testType',[['DC','DC'],['IVT','IVT',true],['Pulse','Pulse',true],['CV','CV',true]],i.testType)}</span>
 ${field('Name:','info.name',i.name)}
 </div></fieldset>`;
}
function generatorFields(t,i,j=null) {
 const prefix=j===null?`terminals[${i}]`:`terminals[${i}].segments[${j}]`;
 const kind=j===null?t.generator:(t.segments[j].generator||'Linear Step');
 const value=(key)=>j===null?(t[key]??''):(t.segments[j][key]??'');
 const inp=(key,cls='fs-small-input')=>`<input class="${cls}" data-bind="${e(prefix+'.'+key)}" aria-label="${e(key)}" value="${e(value(key))}"/>`;
 if(kind==='Constant'||kind==='Generator') return inp('bias','fs-expression');
 if(kind==='List')return inp('list','fs-expression');
 return `<label>Start:</label>${inp('start')}<label>Stop:</label>${inp('stop')}<label>${kind==='Linear Step'?'Step:':'Points:'}</label>${inp(kind==='Linear Step'?'step':'points')}`;
}
function segmentMarkup(t,i){
 const segmentRows=(t.segments||[]).map((s,j)=>`<div class="fs-segment-row" data-segment="${j}">
 <span class="fs-muted">Segment ${j+2}</span>
 ${select(`terminals[${i}].segments[${j}].generator`,modes.filter(m=>m!=='Generator'),s.generator)}
 <div class="fs-generator-values">${generatorFields(t,i,j)}</div>
 <button data-action="remove-segment" data-i="${i}" data-j="${j}" aria-label="删除分段">−</button></div>`).join('');
 return segmentRows;
}
function terminalMarkup(t,i){
 const logicalOpts=draft.terminals.filter((v,j)=>j!==i).map(v=>[v.logical,v.logical]);
 const segmentButton=`<button data-action="add-segment" data-i="${i}" title="在当前端子下方添加分段">+</button>`;
 return `<div class="fs-terminal" data-terminal="${i}"><div class="fs-terminal-top">
 <strong class="fs-terminal-label">${e(t.logical)}</strong>
 ${select(`terminals[${i}].sourceMode`,[['voltage','Voltage'],['current','Current']],t.sourceMode)}
 <span class="fs-signal-name">${e(t.signal)}${t.role==='X'?' (X)':t.role==='P'?' (P)':''}</span>
 <div class="fs-generator">
 <button data-action="remove-segment" data-i="${i}" data-j="-1" title="删除最后一个分段" ${t.segments?.length?'':'disabled'}>−</button>
 ${select(`terminals[${i}].generator`,modes,t.generator)}
 <div class="fs-generator-values">${generatorFields(t,i)}</div>
 ${segmentButton}
 </div></div>
 <div class="fs-terminal-bottom">
 <label>Ref to:</label>${select(`terminals[${i}].relativeTo`,[['GND','GND'],...logicalOpts],t.relativeTo)}
 ${select(`terminals[${i}].role`,roles,t.role)}
 <span class="fs-caption">Source: ${e(t.resource||'None')}</span>
 </div>${segmentMarkup(t,i)}</div>`;
}
function limitsPanel(){
 return `<div class="fs-triptych-panel"><h3>Limits</h3><div class="fs-table-wrap"><table class="fs-table">
 <thead><tr><th>Node</th><th>I (A)</th><th>V</th></tr></thead><tbody>
 ${draft.terminals.map((t,i)=>`<tr><td>${e(t.logical)}</td><td>${t.sourceMode==='voltage'?`<input data-bind="terminals[${i}].compliance" value="${e(t.compliance)}" aria-label="${e(t.logical)} current compliance"/>`:'—'}</td><td>${t.sourceMode==='current'?`<input data-bind="terminals[${i}].compliance" value="${e(t.compliance)}" aria-label="${e(t.logical)} voltage compliance"/>`:'—'}</td></tr>`).join('')}
 </tbody></table></div></div>`;
}
function varsPanel(){
 return `<div class="fs-triptych-panel"><h3>Page Var</h3><div class="fs-panel-row"><div class="fs-table-wrap"><table class="fs-table"><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>
 ${draft.pageVars.map((v,i)=>`<tr><td><input aria-label="变量名" data-bind="pageVars[${i}].name" value="${e(v.name)}"/></td><td><input aria-label="变量值" data-bind="pageVars[${i}].value" value="${e(v.value)}"/></td></tr>`).join('')}
 </tbody></table></div><div class="fs-rail"><button data-action="add-var" title="增加变量">+</button><button data-action="remove-var" title="删除最后一个变量" ${draft.pageVars.length?'':'disabled'}>−</button></div></div></div>`;
}
function specsPanel(){
 return `<div class="fs-triptych-panel"><h3>Associate Spec</h3><div class="fs-panel-row"><div class="fs-table-wrap"><table class="fs-table"><tbody>
 ${draft.associateSpecs.map((v,i)=>`<tr><td><input aria-label="关联规格" data-bind="associateSpecs[${i}]" value="${e(v)}"/></td></tr>`).join('')}
 </tbody></table></div><div class="fs-rail"><button data-action="add-spec" title="增加关联规格">+</button><button data-action="remove-spec" title="删除最后一个规格" ${draft.associateSpecs.length?'':'disabled'}>−</button></div></div></div>`;
}
function sweepMarkup(){
 return `<div class="fs-sweep-head">
 <span class="fs-inline-field"><label>RefNode:</label>${select('refNode',draft.terminals.map(t=>t.logical),draft.refNode)}</span>
 <span class="fs-inline-field"><input aria-label="Reference Value" data-bind="refValue" value="${e(draft.refValue)}"/><label>(V)</label></span>
 <label>Outputs:</label><input data-bind="outputs" aria-label="Outputs" value="${e(draft.outputs)}"/>
 </div><section class="fs-terminal-list" aria-label="Input Setting"><div class="fs-section-title">Input Setting</div>
 ${draft.terminals.map(terminalMarkup).join('')}</section>
 <section class="fs-triptych" aria-label="Limits Page Var Associate Spec">
 ${limitsPanel()}${varsPanel()}${specsPanel()}</section>`;
}
function targetMarkup(){
 const p=draft.target.plot;
 return `<div class="fs-target"><div class="fs-target-top">
 <textarea data-bind="target.expression" aria-label="Function editor" spellcheck="false">${e(draft.target.expression)}</textarea>
 <aside class="fs-function-info"><strong>Function Info</strong><p>V(node), I(node) · 输出量引用</p><p>公式仅保存为文本，尚未连接求值引擎。</p></aside>
 </div><div class="fs-triptych">
 <div class="fs-triptych-panel"><h3>Plot</h3><div class="fs-plot-options">
 ${['X','Y','H','P'].map(a=>`<span class="fs-inline-field"><label>${a}:</label><input aria-label="Plot ${a}" data-bind="target.plot.${a}" value="${e(p[a])}" style="width:66px"/></span>`).join('')}
 </div></div>
 ${varsPanel()}
 <div class="fs-triptych-panel"><h3>Quote Var</h3><div class="fs-table-wrap"><table class="fs-table"><tbody>
 ${draft.target.quoteVars.map((x,i)=>`<tr><td><input data-bind="target.quoteVars[${i}]" value="${e(x)}"/></td></tr>`).join('')}
 </tbody></table></div></div></div></div>`;
}
function strategyMarkup(){
 const s=draft.strategy;
 return `<div class="fs-strategy"><div class="fs-strategy-grid">
 <label>Strategy:</label>${select('strategy.scope',['Global Setting','Local Setting'],s.scope)}
 <label>Source / Measure:</label>${select('strategy.method',['Custom','Standard'],s.method)}
 <label>Integration Time (s):</label><input data-bind="strategy.integrationTime" value="${e(s.integrationTime)}"/>
 <label>Delay Time (s):</label><input data-bind="strategy.delayTime" value="${e(s.delayTime)}"/>
 <label>Source Range:</label>${select('strategy.sourceRange',['Auto','Fixed'],s.sourceRange)}
 <label>Measure Range:</label>${select('strategy.measureRange',['Auto','Fixed'],s.measureRange)}
 </div></div>`;
}
function pageHTML(){
 return `<div class="fs-editor" role="dialog" aria-modal="true" aria-label="Edit Page">
 <div class="fs-editor-title">Edit Page <button data-action="cancel" title="关闭" aria-label="关闭">×</button></div>
 <div class="fs-editor-main">
 ${infoMarkup()}
 <div class="fs-editor-controls">
 <button data-action="lock" class="fs-primary">${unlocked?'Lock':'Unlock'}</button>
 <button data-action="reset">Reset</button>
 <button data-action="connection">Set Connection</button>
 <button data-action="autoscale" disabled title="需要确认 4200A 测量范围配置后才能启用">AutoScale</button>
 <button data-action="unscale" disabled title="需要确认 4200A 测量范围配置后才能启用">UnScale</button>
 </div>
 <div class="fs-tabs" role="tablist">
 ${['Sweep','Target','Strategy'].map(t=>`<button data-action="tab" data-tab="${t}" role="tab" aria-selected="${t===activeTab}" id="fs-tab-${t}">${t}</button>`).join('')}
 </div>
 <div class="fs-tab-content" role="tabpanel" aria-labelledby="fs-tab-${activeTab}">
 ${activeTab==='Sweep'?sweepMarkup():activeTab==='Target'?targetMarkup():strategyMarkup()}
 </div>
 </div>
 <footer class="fs-editor-footer"><span class="fs-validation" role="status"></span>
 <button data-action="ok" class="fs-primary">OK</button><button data-action="cancel">Cancel</button></footer>
 </div>`;
}
function connectionHTML(){
 return `<div class="fs-editor" style="width:min(710px,100%);height:min(520px,calc(100dvh - 24px))" role="dialog" aria-modal="true" aria-label="Set Connection">
 <div class="fs-editor-title">Set Connection <button data-action="close-connection" aria-label="关闭">×</button></div>
 <div class="fs-connection-content">
 <fieldset class="fs-fieldset"><legend>Connection List</legend>
 <select aria-label="Connection preset" style="width:100%"><option>Local 4200A — 当前 Page</option></select>
 </fieldset>
 <fieldset class="fs-fieldset"><legend>Terminal to Resource</legend>
 <table class="fs-connection-table"><thead><tr><th>Terminal</th><th>Resource</th><th>Source</th></tr></thead><tbody>
 ${draft.terminals.map((t,i)=>`<tr><td>${e(t.logical)}</td><td>${select(`terminals[${i}].resource`,emptyOption(),t.resource)} </td><td>${e(t.sourceMode)}</td></tr>`).join('')}
 </tbody></table></fieldset>
 <div class="fs-connection-footer">仅显示经过 4200A 模块识别的资源。修改共享 Connection 预设可能影响其他 Page；本次仅保存当前 Page 的映射。</div>
 </div>
 <footer class="fs-editor-footer"><span class="fs-validation"></span><button data-action="connection-ok" class="fs-primary">OK</button>
 <button data-action="close-connection">Cancel</button></footer></div>`;
}
function render(){if(!draft)return;host.hidden=false;host.innerHTML=activeDialog==='connection'?connectionHTML():pageHTML();if(activeDialog==='page'){updateStatus();if(!unlocked)host.querySelectorAll?.('[data-bind],[data-action="add-segment"],[data-action="remove-segment"],[data-action="add-var"],[data-action="remove-var"],[data-action="add-spec"],[data-action="remove-spec"]').forEach(el=>el.disabled=true);}}
function startEdit(){original=clone(saved);draft=clone(saved);activeTab='Sweep';activeDialog='page';unlocked=true;render();}
function close(){activeDialog='';host.hidden=true;host.innerHTML='';draft=null;original=null;}
function setInventory(resourceIDs){
 if(!Array.isArray(resourceIDs)||resourceIDs.some(x=>typeof x!=='string'||!/^(?:SMU|PMU|CVU|VM|VS)\d+(?:\.\d+)?$/i.test(x))) throw Error('Invalid instrument resource inventory');
 inventory.clear();resourceIDs.forEach(x=>inventory.add(x));if(activeDialog==='connection')render();
}
function dispatch(action,target){
 if(action==='tab'){activeTab=target.dataset.tab;render();return;}
 if(action==='cancel'){close();return;}
 if(action==='ok'){
  const v=validateDraft();if(!v.valid){updateStatus();return;}
  saved=clone(draft);document.getElementById('fs-page-name').textContent=saved.info.name;note('Page 已保存（未执行测量）');close();return;
 }
 if(action==='reset'){draft=clone(original);render();return;}
 if(action==='lock'){unlocked=!unlocked;render();return;}
 if(action==='connection'){activeDialog='connection';render();return;}
 if(action==='close-connection'){activeDialog='page';render();return;}
 if(action==='connection-ok'){activeDialog='page';render();return;}
 if(action==='add-var'){draft.pageVars.push({name:'',value:''});render();return;}
 if(action==='remove-var'){draft.pageVars.pop();render();return;}
 if(action==='add-spec'){draft.associateSpecs.push('');render();return;}
 if(action==='remove-spec'){draft.associateSpecs.pop();render();return;}
 if(action==='add-segment'){const t=draft.terminals[Number(target.dataset.i)];t.segments.push({generator:'Linear Step',start:'0',stop:'0',step:'0.1',points:'5',bias:'0',list:''});render();return;}
 if(action==='remove-segment'){const t=draft.terminals[Number(target.dataset.i)],j=Number(target.dataset.j);if(j===-1)t.segments.pop();else t.segments.splice(j,1);render();return;}
}
host.addEventListener('click',event=>{
 const btn=event.target.closest('button[data-action]');if(!btn)return;
 if(!unlocked&&!['lock','cancel','tab','close-connection'].includes(btn.dataset.action))return;
 dispatch(btn.dataset.action,btn);
});
function bindControl(el){
 if(!el?.dataset?.bind||!draft||!unlocked)return;
 const path=el.dataset.bind,prev=get(draft,path);
 if(prev===undefined){note('未知参数：'+path);return;}
 set(draft,path,el.value);
 if(path.endsWith('.role')){
  if(el.value==='X'||el.value==='P'){
   const changed=path.match(/terminals\[(\d+)\]/);
   const current=changed?Number(changed[1]):-1;
   draft.terminals.forEach((t,i)=>{if(i!==current&&t.role===el.value)t.role='CONDITION';});
  }
  render();
 } else if(path.endsWith('.generator')||path.endsWith('.sourceMode')||path.endsWith('.logical')){render();}
 else updateStatus();
}
host.addEventListener('input',event=>{if(event.target.matches('input[data-bind],textarea[data-bind]'))bindControl(event.target);});
host.addEventListener('change',event=>{if(event.target.matches('select[data-bind]'))bindControl(event.target);});
host.addEventListener('keydown',event=>{if(event.key==='Escape'){if(activeDialog==='connection'){activeDialog='page';render();}else close();}});
document.addEventListener('click',event=>{
 const btn=event.target.closest('[data-command]');if(!btn||host.contains(btn))return;
 const command=btn.dataset.command;
 if(command==='edit'){startEdit();return;}
 if(command==='connection'){startEdit();activeDialog='connection';render();return;}
 if(command==='new'){saved=sample();note('新建工程 · 配置未保存');return;}
 if(command==='arrange'){note('Visual Area · 2 × 2 Frame');return;}
 if(command==='save'){
  const json=JSON.stringify(saved,null,2),blob=new Blob([json],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='4200A-page.json';a.click();URL.revokeObjectURL(url);
  note('已导出 Page 配置（未包含仪器数据）');return;
 }
 if(command==='open'){document.getElementById('fs-open-input').click();return;}
 if(command==='help'){note('Edit Page：Sweep / Target / Strategy；保存前执行离线校验。');return;}
});
document.getElementById('fs-open-input').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{
  if(file.size>1024*1024)throw Error('配置文件超出 1 MiB 限制');
  const parsed=JSON.parse(await file.text());
  if(parsed.schema!=='dkts.fspro.page.v1'||!Array.isArray(parsed.terminals)||parsed.terminals.length<2||parsed.terminals.length>16)throw Error('不是受支持的 4200A Page 文件');
  if(!parsed.info||!Array.isArray(parsed.pageVars)||!Array.isArray(parsed.associateSpecs)||!parsed.strategy||!parsed.target)throw Error('Page 文件结构不完整');
  original=clone(saved);draft=clone(parsed);
  const v=validateDraft();if(!v.valid)throw Error('参数校验失败：'+v.errors[0]?.reason);
  saved=clone(draft);draft=null;note('Page 文件已载入（离线）');document.getElementById('fs-page-name').textContent=saved.info.name;
 }catch(err){draft=null;note('导入失败：'+err.message);}finally{event.target.value='';}
});
window.DK4200FSPro=Object.freeze({
 openEdit:startEdit,
 setVerifiedInventory:setInventory,
 getDraft:()=>clone(draft||saved),
 validate:()=>{const tmp=draft;draft=clone(draft||saved);try{return validateDraft();}finally{draft=tmp;}}
});
if(new URLSearchParams(location.search).get('open')==='edit')startEdit();
})();
