(function(root,factory){
  const core=(root.GRSScience=root.GRSScience||{});
  const api=factory(core);
  Object.assign(core,api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(core){
  const {median}=core;
  function parseVg(name, text){
    const hay = `${name || ''}\n${text.slice(0,1600)}`;
    const patterns=[
      /\bVg\s*[=:]\s*([+-]?\d+(?:\.\d+)?)/i,
      /\bvg\s*([+-]?\d+(?:\.\d+)?)\s*v?/i,
      /vg\s*=\s*([+-]?\d+(?:\.\d+)?)/i
    ];
    for(const p of patterns){ const m=hay.match(p); if(m) return Number(m[1]); }
    return NaN;
  }


  // ------------------------------------------------------------------
  // v3.9 flexible text/multi-column importer
  // ------------------------------------------------------------------
  const IMPORT_ENCODING_LABELS = [
    'auto','utf-8','gb18030','big5','shift_jis','utf-16le','utf-16be','windows-1252'
  ];

  function defaultImportOptions(){
    return {
      encoding:'auto',
      skipRows:0,
      endRow:0,
      delimiter:'auto',
      headerMode:'auto',
      decimalSeparator:'auto',
      commentPrefix:'auto',
      layout:'auto',
      xCol:0,
      yCol:1,
      yCols:[],
      pairStart:0,
      voltageUnit:'auto',
      currentUnit:'auto',
      vgMode:'auto',
      manualVg:null,
      vgOverrides:{}
    };
  }

  function normalizeImportOptions(options={}){
    const d=defaultImportOptions();
    const out={...d,...options};
    out.skipRows=Math.max(0,Math.floor(Number(out.skipRows)||0));
    out.endRow=Math.max(0,Math.floor(Number(out.endRow)||0));
    out.xCol=Math.max(0,Math.floor(Number(out.xCol)||0));
    out.yCol=Math.max(0,Math.floor(Number(out.yCol)||1));
    out.pairStart=Math.max(0,Math.floor(Number(out.pairStart)||0));
    out.yCols=Array.isArray(out.yCols)?out.yCols.map(Number).filter(Number.isFinite).map(v=>Math.max(0,Math.floor(v))):[];
    out.manualVg=Number.isFinite(Number(out.manualVg))?Number(out.manualVg):null;
    out.vgOverrides=(out.vgOverrides&&typeof out.vgOverrides==='object'&&!Array.isArray(out.vgOverrides))
      ? {...out.vgOverrides}
      : {};
    return out;
  }

  function parseDelimitedLine(line,delimiter){
    if(delimiter==='whitespace'){
      return String(line).trim().split(/\s+/);
    }
    const sep=delimiter==='tab'?'\t':
      delimiter==='comma'?',':
      delimiter==='semicolon'?';':
      delimiter==='pipe'?'|':
      String(delimiter||',');

    const cells=[];
    let cell='',quoted=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){
        if(quoted&&line[i+1]==='"'){cell+='"';i++;continue;}
        quoted=!quoted;continue;
      }
      if(ch===sep&&!quoted){cells.push(cell.trim());cell='';continue;}
      cell+=ch;
    }
    cells.push(cell.trim());
    return cells;
  }

  function numericCell(value,decimalSeparator='auto'){
    let s=String(value??'').trim();
    if(!s)return NaN;
    s=s.replace(/\u2212/g,'-').replace(/\s+/g,'');
    s=s.replace(/^[="'\s]+|[="'\s]+$/g,'');
    // Remove common thousands separators only when their role is unambiguous.
    if(decimalSeparator==='comma'){
      s=s.replace(/\./g,'').replace(',','.');
    }else if(decimalSeparator==='dot'){
      s=s.replace(/,/g,'');
    }else{
      if(/^[-+]?\d+,\d+(?:[eE][-+]?\d+)?$/.test(s)&&!s.includes('.'))s=s.replace(',','.');
      else if(/^[-+]?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:[eE][-+]?\d+)?$/.test(s))s=s.replace(/,/g,'');
    }
    const n=Number(s);
    return Number.isFinite(n)?n:NaN;
  }

  function lineIsComment(line,prefix){
    const s=String(line||'').trim();
    if(!s)return true;
    if(prefix&&prefix!=='auto')return s.startsWith(prefix);
    return /^(#|\/\/|%|!)/.test(s);
  }

  function detectDelimiter(lines,decimalSeparator='auto'){
    const candidates=['tab','comma','semicolon','pipe','whitespace'];
    let best={type:'comma',score:-Infinity};
    for(const type of candidates){
      const counts=[];
      for(const line of lines.slice(0,40)){
        if(!line.trim()||lineIsComment(line,'auto'))continue;
        const cells=parseDelimitedLine(line,type);
        if(cells.length<2)continue;
        counts.push(cells.length);
      }
      if(counts.length<2)continue;
      const med=Math.round(median(counts)||0);
      const stable=counts.filter(c=>c===med).length/counts.length;
      let bonus=0;
      if(type==='tab'&&lines.some(l=>l.includes('\t')))bonus=.35;
      if(type==='comma'&&lines.some(l=>l.includes(',')))bonus=.18;
      if(type==='semicolon'&&lines.some(l=>l.includes(';')))bonus=.18;
      if(type==='pipe'&&lines.some(l=>l.includes('|')))bonus=.18;
      if(type==='whitespace'&&lines.some(l=>/\S\s{2,}\S/.test(l)))bonus=.12;
      // Decimal comma data often use semicolon/tab delimiters.
      if(type==='comma'&&decimalSeparator==='comma')bonus-=.5;
      const score=(med>=2?1:0)+stable+Math.min(med,12)*.025+bonus;
      if(score>best.score)best={type,score};
    }
    return best.type;
  }

  function unitFactorFromHeader(header,kind){
    const h=String(header||'').toLowerCase().replace(/μ/g,'µ');
    if(kind==='voltage'){
      if(/\bmv\b/.test(h))return 1e-3;
      if(/\buv\b|\bµv\b/.test(h))return 1e-6;
      if(/\bkv\b/.test(h))return 1e3;
      return 1;
    }
    if(/\bpa\b/.test(h))return 1e-12;
    if(/\bna\b/.test(h))return 1e-9;
    if(/\bua\b|\bµa\b/.test(h))return 1e-6;
    if(/\bma\b/.test(h))return 1e-3;
    return 1;
  }

  function selectedUnitFactor(unit,header,kind){
    if(unit==='auto')return unitFactorFromHeader(header,kind);
    const map=kind==='voltage'
      ? {V:1,mV:1e-3,uV:1e-6,kV:1e3}
      : {A:1,mA:1e-3,uA:1e-6,nA:1e-9,pA:1e-12};
    return map[unit]??1;
  }

  function headerLooksX(header){
    const h=String(header||'').toLowerCase();
    return /(^|[^a-z])(v|vd|vds|bias|voltage|volt)([^a-z]|$)/.test(h)&&!/vg|gate/.test(h);
  }

  function headerLooksY(header){
    const h=String(header||'').toLowerCase();
    return /(^|[^a-z])(i|id|ids|current|amp|amps)([^a-z]|$)/.test(h);
  }

  function monotonicScore(values){
    const a=values.filter(Number.isFinite);
    if(a.length<4)return 0;
    let pos=0,neg=0,total=0;
    for(let i=1;i<a.length;i++){
      const d=a[i]-a[i-1];
      if(Math.abs(d)<1e-15)continue;
      total++;
      if(d>0)pos++;else neg++;
    }
    return total?Math.max(pos,neg)/total:0;
  }

  function inspectDataText(file,options={}){
    const opt=normalizeImportOptions(options);
    const allLines=String(file?.text||'').replace(/\r/g,'').split('\n');
    const start=Math.min(opt.skipRows,allLines.length);
    const end=opt.endRow>0?Math.min(opt.endRow,allLines.length):allLines.length;
    const slice=allLines.slice(start,end);
    const nonComment=slice.filter(l=>!lineIsComment(l,opt.commentPrefix));
    const delimiter=opt.delimiter==='auto'?detectDelimiter(nonComment,opt.decimalSeparator):opt.delimiter;

    const tokenRows=[];
    const sourceLineNos=[];
    for(let k=0;k<slice.length;k++){
      const line=slice[k];
      if(lineIsComment(line,opt.commentPrefix))continue;
      const cells=parseDelimitedLine(line,delimiter);
      if(cells.length<2)continue;
      tokenRows.push(cells);
      sourceLineNos.push(start+k+1);
    }

    const maxCols=Math.max(0,...tokenRows.map(r=>r.length));
    let headerIndex=-1,dataStart=0;
    if(opt.headerMode==='first'&&tokenRows.length){
      headerIndex=0;dataStart=1;
    }else if(opt.headerMode==='none'){
      headerIndex=-1;dataStart=0;
    }else{
      // First row with >=2 numeric cells is treated as data. Immediately
      // preceding similarly-shaped text row becomes the header.
      let firstNumeric=-1;
      for(let r=0;r<tokenRows.length;r++){
        const nums=tokenRows[r].map(v=>numericCell(v,opt.decimalSeparator)).filter(Number.isFinite).length;
        if(nums>=Math.min(2,Math.max(2,tokenRows[r].length-1))||nums>=2){firstNumeric=r;break;}
      }
      if(firstNumeric<0)firstNumeric=0;
      dataStart=firstNumeric;
      if(firstNumeric>0){
        const prev=tokenRows[firstNumeric-1];
        const prevNums=prev.map(v=>numericCell(v,opt.decimalSeparator)).filter(Number.isFinite).length;
        if(prevNums<Math.max(1,prev.length/2))headerIndex=firstNumeric-1;
      }
    }

    const headers=Array.from({length:maxCols},(_,c)=>{
      const raw=headerIndex>=0?(tokenRows[headerIndex]?.[c]??''):'';
      return String(raw||'').trim()||`Col ${c+1}`;
    });

    const numericRows=[];
    for(let r=dataStart;r<tokenRows.length;r++){
      if(r===headerIndex)continue;
      const cells=tokenRows[r];
      const vals=Array.from({length:maxCols},(_,c)=>numericCell(cells[c],opt.decimalSeparator));
      if(vals.filter(Number.isFinite).length>=2){
        numericRows.push({values:vals,sourceLine:sourceLineNos[r],raw:cells});
      }
    }

    const columns=Array.from({length:maxCols},(_,c)=>{
      const vals=numericRows.map(r=>r.values[c]);
      const finite=vals.filter(Number.isFinite);
      return {
        index:c,
        header:headers[c],
        finiteCount:finite.length,
        numericFraction:numericRows.length?finite.length/numericRows.length:0,
        monotonicScore:monotonicScore(vals),
        min:finite.length?Math.min(...finite):NaN,
        max:finite.length?Math.max(...finite):NaN
      };
    });

    let suggestedLayout='single';
    let suggestedX=0;
    let suggestedYCols=maxCols>1?[1]:[];

    if(maxCols>2){
      const evenHeaderPairs=maxCols%2===0&&Array.from({length:maxCols/2},(_,k)=>
        headerLooksX(headers[2*k])&&headerLooksY(headers[2*k+1])
      ).filter(Boolean).length>=Math.max(1,Math.floor(maxCols/4));

      const vgHeaders=headers.slice(1).filter(h=>Number.isFinite(parseVg(h,''))).length;
      const evenMonotonic=maxCols%2===0&&Array.from({length:maxCols/2},(_,k)=>
        columns[2*k]?.monotonicScore>=.75&&columns[2*k]?.numericFraction>=.75
      ).filter(Boolean).length===maxCols/2;

      if(evenHeaderPairs||(evenMonotonic&&vgHeaders===0)){
        suggestedLayout='paired';
        suggestedX=0;
        suggestedYCols=Array.from({length:maxCols/2},(_,k)=>2*k+1);
      }else{
        suggestedLayout='sharedX';
        const xByHeader=headers.findIndex(headerLooksX);
        suggestedX=xByHeader>=0?xByHeader:0;
        suggestedYCols=columns
          .filter(c=>c.index!==suggestedX&&c.numericFraction>=.55)
          .map(c=>c.index);
      }
    }else{
      suggestedLayout='single';
      suggestedX=headers.findIndex(headerLooksX);
      if(suggestedX<0)suggestedX=0;
      const y=headers.findIndex((h,i)=>i!==suggestedX&&headerLooksY(h));
      suggestedYCols=[y>=0?y:(suggestedX===0?1:0)];
    }

    return {
      options:opt,
      delimiter,
      headers,
      columns,
      numericRows,
      rowCount:numericRows.length,
      sourceLineCount:allLines.length,
      dataStartSourceLine:numericRows[0]?.sourceLine||null,
      suggestedLayout,
      suggestedX,
      suggestedYCols,
      previewRows:numericRows.slice(0,60)
    };
  }

  function parseVgFromImportHeader(header){
    const strict=parseVg(header,'');
    if(Number.isFinite(strict))return strict;
    const s=String(header||'');
    // Multi-column exports frequently use headers such as "-10 V", "0V",
    // "+20V" without explicitly writing "Vg".
    const m=s.match(/(?:^|[^\d.])([+-]?\d+(?:\.\d+)?)\s*V(?:\b|$)/i);
    return m?Number(m[1]):NaN;
  }

  function vgForImportedSeries(file,header,opt,yCol=null){
    const key=yCol===null?'':String(yCol);
    if(key&&Object.prototype.hasOwnProperty.call(opt.vgOverrides||{},key)){
      const override=Number(opt.vgOverrides[key]);
      if(Number.isFinite(override))return override;
    }
    if(opt.vgMode==='manual')return Number.isFinite(Number(opt.manualVg))?Number(opt.manualVg):NaN;
    if(opt.vgMode==='header')return parseVgFromImportHeader(header);
    if(opt.vgMode==='filename')return parseVg(file.name,file.text);
    // auto: column header is more specific for multi-series files.
    const h=parseVgFromImportHeader(header);
    return Number.isFinite(h)?h:parseVg(file.name,file.text);
  }

  function parseFlexibleData(file,options={}){
    const opt=normalizeImportOptions(options);
    const ins=inspectDataText(file,opt);
    const layout=opt.layout==='auto'?ins.suggestedLayout:opt.layout;
    const xCol=Number.isFinite(opt.xCol)?opt.xCol:ins.suggestedX;
    let yCols=opt.yCols.length?opt.yCols.slice():ins.suggestedYCols.slice();

    const datasets=[];
    const baseName=String(file.name||'data').replace(/\.[^.]+$/,'');

    function buildSeries(xc,yc,seriesIndex,labelOverride=''){
      if(xc<0||yc<0||xc>=ins.headers.length||yc>=ins.headers.length||xc===yc)return;
      const xHeader=ins.headers[xc]||`Col ${xc+1}`;
      const yHeader=ins.headers[yc]||`Col ${yc+1}`;
      const xf=selectedUnitFactor(opt.voltageUnit,xHeader,'voltage');
      const yf=selectedUnitFactor(opt.currentUnit,yHeader,'current');
      const points=[];
      for(const row of ins.numericRows){
        const xv=row.values[xc],yv=row.values[yc];
        if(!Number.isFinite(xv)||!Number.isFinite(yv))continue;
        points.push({
          v:xv*xf,
          i:yv*yf,
          index:points.length,
          sourceLine:row.sourceLine,
          sourceColumns:[xc+1,yc+1]
        });
      }
      if(points.length<3)return;
      const seriesLabel=labelOverride||yHeader||`Series ${seriesIndex+1}`;
      const vg=vgForImportedSeries(file,seriesLabel,opt,yc);
      const suffix=layout==='single'?'':` · ${seriesLabel}`;
      datasets.push({
        name:`${baseName}${suffix}`,
        path:`${file.path}::series::${seriesIndex}::x${xc+1}y${yc+1}`,
        sourcePath:file.path,
        sourceName:file.name,
        text:file.text,
        encoding:file.encoding||opt.encoding||'auto',
        vg,
        points,
        importSpec:{
          ...opt,
          resolvedDelimiter:ins.delimiter,
          resolvedLayout:layout,
          xCol:xc,
          yCol:yc,
          seriesLabel,
          xHeader,
          yHeader,
          vgOverride:Object.prototype.hasOwnProperty.call(opt.vgOverrides||{},String(yc))
            ? Number(opt.vgOverrides[String(yc)])
            : null
        }
      });
    }

    if(layout==='paired'){
      const start=Math.max(0,opt.pairStart||0);
      let n=0;
      for(let c=start;c+1<ins.headers.length;c+=2){
        buildSeries(c,c+1,n++,`${ins.headers[c+1]||`I${n}`}`);
      }
    }else if(layout==='sharedX'){
      yCols=[...new Set(yCols)].filter(c=>c!==xCol);
      yCols.forEach((yc,k)=>buildSeries(xCol,yc,k,ins.headers[yc]));
    }else{
      const yc=Number.isFinite(opt.yCol)?opt.yCol:(yCols[0]??ins.suggestedYCols[0]??1);
      buildSeries(xCol,yc,0,ins.headers[yc]);
    }

    return {datasets,inspection:ins};
  }

  function parseCsv(file){
    const lines=file.text.replace(/\r/g,'').split('\n');
    const points=[];
    let headerFound=false;
    for(let li=0; li<lines.length; li++){
      const raw=lines[li].trim(); if(!raw) continue;
      const parts=raw.split(/[\t,;]/).map(s=>s.trim());
      if(parts.length<2) continue;
      const v=Number(parts[0]); const i=Number(parts[1]);
      if(Number.isFinite(v)&&Number.isFinite(i)){
        points.push({v,i,index:points.length,sourceLine:li+1});
        headerFound=true;
      } else if(headerFound) {
        // ignore occasional text rows after numeric section
      }
    }
    const vg=parseVg(file.name,file.text);
    return {name:file.name,path:file.path,text:file.text,vg,points};
  }
  return {IMPORT_ENCODING_LABELS,defaultImportOptions,normalizeImportOptions,inspectDataText,parseFlexibleData,parseVgFromImportHeader,parseCsv,parseVg};
});
