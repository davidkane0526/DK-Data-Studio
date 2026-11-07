/* Adapter for DKDS ScientificPlot. Never generates readings or sends 4200A commands.
 * Supports only imported, structurally validated instrument-origin captures.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DK4200FrameView=api;
})(typeof globalThis!=='undefined'?globalThis:undefined,function(){
 'use strict';
 const VERSION='1.0.0';
 function create({plotRuntime,rawData,root,download}={}){
  if(!rawData?.validate||!rawData?.traces)throw new TypeError('DK4200RawData module required');
  const host=root&&typeof root.querySelectorAll==='function'?root:null;
  if(!host)throw new TypeError('Frame host element required');
  const area=host.querySelector('.fs-frames');
  if(!area)throw new TypeError('Frame grid absent');
  const plot=plotRuntime?.createScope?.('dkts.4200a.fspro');
  if(!plot?.react)throw new Error('DKDS ScientificPlot Core is not loaded');
  const renderers=[...area.querySelectorAll('.fs-frame')].map(card=>{
   const content=card.querySelector('.fs-empty-plot');
   if(!content)throw new TypeError('FS-Pro Frame missing plot host');
   content.classList.add('fs-plot-slot');
   const hint=document.createElement('span');hint.className='fs-empty-hint';hint.textContent='暂无原始测量数据';content.replaceChildren(hint);
   return {card,content,hint};
  });
  if(renderers.length!==4)throw new TypeError('FS-Pro requires four visual Frames');
  let capture=null,disposed=false,revision=0;
  const ensure=()=>{if(disposed)throw new Error('Frame viewer disposed')};
  const axes=raw=>({x:raw.columns.find(c=>c.id==='voltage')||raw.columns[0],y:raw.columns.find(c=>c.id==='current')||raw.columns[1]});
  const plotLayout=(x,y,title)=>({
   autosize:true,margin:{t:14,r:18,b:52,l:62},
   xaxis:{title:`${x.label}${x.unit?` (${x.unit})`:''}`,automargin:true},
   yaxis:{title:`${y.label}${y.unit?` (${y.unit})`:''}`,automargin:true},
   showlegend:true,legend:{orientation:'h',y:-0.22},
   dragmode:'pan'
  });
  async function setCapture(raw,{provenance='imported-file'}={}){
   ensure();
   if(provenance!=='imported-file'&&provenance!=='native-verified')throw new Error('Unapproved raw-data provenance');
   const check=rawData.validate(raw);
   if(!check.valid)throw new TypeError('Invalid 4200A capture: '+check.errors.map(x=>x.code).join(','));
   const ticket=++revision;
   const original=JSON.parse(JSON.stringify(raw));
   const validPlotAxes=axes(original);
   const specs=[
    [validPlotAxes.x,validPlotAxes.y],
    [validPlotAxes.x,validPlotAxes.y],
    [original.columns.find(c=>c.id==='time')||validPlotAxes.x,validPlotAxes.y],
    null
   ];
   for(let i=0;i<renderers.length;i++){
    if(ticket!==revision||disposed)return false;
    const {content,hint}=renderers[i],pair=specs[i];
    if(!pair){hint.textContent='原始数据表';hint.hidden=false;continue;}
    const [x,y]=pair,traces=rawData.traces(original,{x:x.id,y:y.id});
    if(!traces.some(t=>t.x.length)){hint.textContent='原始数据没有有效采样点';hint.hidden=false;continue;}
    hint.hidden=true;
    await plot.react(content,traces,plotLayout(x,y),{responsive:true,scrollZoom:true,displayModeBar:false},{
     source:'dkts.4200a.native',renderKey:`${original.captureId}:${i}`,
     renderPriority:'immediate'
    });
   }
   if(ticket!==revision||disposed)return false;
   capture=Object.freeze({raw:original,provenance,table:rawData.toTable(original)});
   const msg=host.querySelector('#fs-messages');
   if(msg)msg.textContent=`原始数据：${original.captureId} · ${original.samples.length} 点 · 来源：${provenance==='native-verified'?'仪器采集':'导入文件'}`;
   return true;
  }
  function exportCSV(){
   ensure();
   if(!capture)throw new Error('No raw instrument data to export');
   const csv=rawData.toCSV(capture.raw);
   if(typeof download==='function')return download(`${capture.raw.captureId}.csv`,csv,'text/csv');
   return csv;
  }
  function table(){
   ensure();return capture?capture.table:null;
  }
  function hasCapture(){return !disposed&&capture!==null}
  function provenance(){return capture?.provenance||null}
  function dispose(){
   if(disposed)return false;
   disposed=true;revision++;capture=null;
   try{plot.dispose?.()}catch{}
   return true;
  }
  return Object.freeze({VERSION,setCapture,exportCSV,table,hasCapture,provenance,dispose});
 }
 return Object.freeze({VERSION,create});
});
