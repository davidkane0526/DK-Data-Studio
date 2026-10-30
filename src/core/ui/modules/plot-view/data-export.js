'use strict';

const sequence=value=>{
  if(Array.isArray(value))return value;
  if(typeof ArrayBuffer!=='undefined'&&ArrayBuffer.isView?.(value))return Array.from(value);
  return [];
};
const missing=value=>value===null||value===undefined||(typeof value==='number'&&!Number.isFinite(value));
const cell=value=>{
  const text=String(value??'');
  return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;
};
const traceName=(trace,fallback)=>String(trace?.name||fallback||'series');

function heatmapCsv(traces,fallbackSeries){
  const lines=['series,x,y,z'];
  for(const trace of traces){
    const matrix=sequence(trace?.z);
    if(!matrix.length)continue;
    const xs=sequence(trace?.x),ys=sequence(trace?.y);
    for(let rowIndex=0;rowIndex<matrix.length;rowIndex++){
      const row=sequence(matrix[rowIndex]);
      if(!row.length)continue;
      const y=ys.length?ys[rowIndex]:rowIndex;
      if(missing(y))continue;
      for(let columnIndex=0;columnIndex<row.length;columnIndex++){
        const z=row[columnIndex],x=xs.length?xs[columnIndex]:columnIndex;
        if(missing(x)||missing(z))continue;
        lines.push([traceName(trace,fallbackSeries),x,y,z].map(cell).join(','));
      }
    }
  }
  return lines.length>1?lines.join('\n'):'';
}

function curveCsv(traces,fallbackSeries){
  const lines=['series,x,y'];
  for(const trace of traces){
    const ys=sequence(trace?.y);
    if(!ys.length)continue;
    const xs=sequence(trace?.x);
    const count=xs.length?Math.min(xs.length,ys.length):ys.length;
    for(let index=0;index<count;index++){
      const y=ys[index],x=xs.length?xs[index]:index;
      if(missing(x)||missing(y))continue;
      lines.push([traceName(trace,fallbackSeries),x,y].map(cell).join(','));
    }
  }
  return lines.length>1?lines.join('\n'):'';
}

function traceCsv(traces,{fallbackSeries='series'}={}){
  const rows=Array.isArray(traces)?traces:[];
  const hasHeatmap=rows.some(trace=>sequence(trace?.z).some(row=>sequence(row).length));
  return hasHeatmap?heatmapCsv(rows,fallbackSeries):curveCsv(rows,fallbackSeries);
}

module.exports=Object.freeze({traceCsv,curveCsv,heatmapCsv});
