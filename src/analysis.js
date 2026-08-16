(function(root, factory){
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.Analysis = api;
})(typeof window !== 'undefined' ? window : globalThis, function(){
  const ALG_COLORS = {
    raw: '#64748b',
    snr: '#64748b',
    diff: '#64748b',
    detrend: '#64748b',
    curvature: '#64748b',
    matched: '#64748b',
    manual: '#64748b'
  };

  // Algorithm identity is represented by SHAPE in the UI.
  // Peak order / user label is represented by COLOR.
  const ALG_SYMBOLS = {
    raw: 'circle',
    snr: 'diamond',
    diff: 'triangle',
    detrend: 'square',
    curvature: 'cross',
    matched: 'circle',
    dlog: 'hexagon',
    dvdi: 'kite',
    resistance: 'triangle-down',
    manual: 'star'
  };

  function median(arr){
    const a = arr.filter(Number.isFinite).slice().sort((x,y)=>x-y);
    if(!a.length) return NaN;
    const m=Math.floor(a.length/2);
    return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }
  function mad(arr){
    const m=median(arr); if(!Number.isFinite(m)) return NaN;
    return 1.4826*median(arr.map(v=>Math.abs(v-m)));
  }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function nearestIndex(xs, x){
    let lo=0, hi=xs.length-1;
    if(!xs.length) return -1;
    while(hi-lo>1){ const mid=(lo+hi)>>1; if(xs[mid]<x) lo=mid; else hi=mid; }
    return Math.abs(xs[lo]-x)<=Math.abs(xs[hi]-x)?lo:hi;
  }

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

  // The key scan fix for acquisition such as 0 -> +Vmax -> -Vmax -> 0.
  // Same-direction fragments that only meet at an endpoint are merged into one sweep.
  function buildSweeps(dataset){
    const pts=dataset.points;
    if(pts.length<2) return [];
    const dvs=[]; for(let k=1;k<pts.length;k++) if(Math.abs(pts[k].v-pts[k-1].v)>1e-12) dvs.push(Math.abs(pts[k].v-pts[k-1].v));
    const step=median(dvs)||0.01;

    const runs=[];
    let start=0, dir=0;
    function edgeDir(a,b){ const d=b.v-a.v; return d>step*0.05?1:d<-step*0.05?-1:0; }
    for(let k=1;k<pts.length;k++){
      const ed=edgeDir(pts[k-1],pts[k]);
      if(ed===0) continue;
      if(dir===0){dir=ed;start=Math.max(0,k-1);continue;}
      if(ed!==dir){
        runs.push({dir,points:pts.slice(start,k),startIndex:start,endIndex:k-1});
        start=Math.max(0,k-1); dir=ed;
      }
    }
    if(dir!==0) runs.push({dir,points:pts.slice(start),startIndex:start,endIndex:pts.length-1});

    function range(r){const xs=r.points.map(p=>p.v);return [Math.min(...xs),Math.max(...xs)];}
    const groups=[];
    for(const r of runs){
      const [r0,r1]=range(r);
      let target=null;
      for(const g of groups){
        if(g.dir!==r.dir) continue;
        const [g0,g1]=g.range;
        const overlap=Math.max(0,Math.min(g1,r1)-Math.max(g0,r0));
        const minSpan=Math.max(step,Math.min(g1-g0,r1-r0));
        const gap=Math.max(0,Math.max(g0,r0)-Math.min(g1,r1));
        const onlyEndpointOrGap = overlap <= 3*step || gap <= 3*step;
        const largeOverlap = overlap/minSpan > 0.20;
        // Merge split pieces of one same-direction sweep, but not a repeated full cycle.
        if(onlyEndpointOrGap && !largeOverlap){ target=g; break; }
      }
      if(!target){target={dir:r.dir,runs:[],range:[r0,r1]};groups.push(target);}
      target.runs.push(r);
      target.range=[Math.min(target.range[0],r0),Math.max(target.range[1],r1)];
    }

    const sweeps=[];
    let upCount=0,downCount=0;
    for(const g of groups){
      const bucket=new Map();
      for(const r of g.runs){
        for(const p of r.points){
          const key=(Math.round(p.v/step)*step).toFixed(12);
          if(!bucket.has(key)) bucket.set(key,[]);
          bucket.get(key).push(p);
        }
      }
      const merged=[];
      for(const arr of bucket.values()){
        const v=arr.reduce((s,p)=>s+p.v,0)/arr.length;
        const i=arr.reduce((s,p)=>s+p.i,0)/arr.length;
        merged.push({v,i,rawIndices:arr.map(p=>p.index)});
      }
      merged.sort((a,b)=>a.v-b.v);
      const cycleIndex=g.dir>0?++upCount:++downCount;
      const name=g.dir>0?(upCount===1?'正扫':`正扫 ${cycleIndex}`):(downCount===1?'反扫':`反扫 ${cycleIndex}`);
      sweeps.push({
        id:`${dataset.path}::${g.dir>0?'up':'down'}::${cycleIndex}`,
        datasetPath:dataset.path,datasetName:dataset.name,vg:dataset.vg,
        direction:g.dir,scanLabel:name,points:merged,step,
        sourceRuns:g.runs.map(r=>({start:r.startIndex,end:r.endIndex}))
      });
    }
    return sweeps.sort((a,b)=>b.direction-a.direction);
  }

  function movingAverage(y, radius){
    const out=new Array(y.length); const r=Math.max(1,Math.round(radius));
    let sum=0;
    for(let i=0;i<y.length;i++){
      sum+=y[i]; if(i-r-1>=0) sum-=y[i-r-1];
      const lo=Math.max(0,i-r), hi=i; out[i]=sum/(hi-lo+1);
    }
    // symmetric pass
    const out2=new Array(y.length); sum=0;
    for(let i=y.length-1;i>=0;i--){
      sum+=out[i]; if(i+r+1<y.length) sum-=out[i+r+1];
      const hi=Math.min(y.length-1,i+r), lo=i; out2[i]=sum/(hi-lo+1);
    }
    return out2;
  }

  function localProminence(y,j,window=12){
    const lo=Math.max(0,j-window), hi=Math.min(y.length-1,j+window);
    let lmin=Infinity,rmin=Infinity;
    for(let k=lo;k<=j;k++) lmin=Math.min(lmin,y[k]);
    for(let k=j;k<=hi;k++) rmin=Math.min(rmin,y[k]);
    return y[j]-Math.max(lmin,rmin);
  }

  function estimateWidth(points,j){
    const y=points.map(p=>Math.abs(p.i)); const peak=y[j];
    const prom=Math.max(0,localProminence(y,j,16));
    const baseline=peak-prom; const half=baseline+prom/2;
    let l=j,r=j;
    while(l>0 && y[l]>half) l--;
    while(r<y.length-1 && y[r]>half) r++;
    const left=points[l].v,right=points[r].v;
    return {left,right,fwhm:Math.max(points[1]?.v-points[0]?.v||0, right-left)};
  }


  function robustFiniteScale(values, fallback=1e-30){
    const finite=values.filter(Number.isFinite);
    if(!finite.length)return fallback;
    const m=mad(finite);
    if(Number.isFinite(m)&&m>0)return m;
    const med=median(finite.map(v=>Math.abs(v)));
    return Number.isFinite(med)&&med>0?med*0.05:fallback;
  }

  function derivativeArray(y,x){
    const out=new Array(y.length).fill(NaN);
    if(y.length<2)return out;
    for(let j=1;j<y.length-1;j++){
      const dx=x[j+1]-x[j-1];
      if(Number.isFinite(y[j-1])&&Number.isFinite(y[j+1])&&Math.abs(dx)>1e-15){
        out[j]=(y[j+1]-y[j-1])/dx;
      }
    }
    if(y.length>=2){
      const dx0=x[1]-x[0],dx1=x.at(-1)-x.at(-2);
      if(Number.isFinite(y[0])&&Number.isFinite(y[1])&&Math.abs(dx0)>1e-15)out[0]=(y[1]-y[0])/dx0;
      if(Number.isFinite(y.at(-1))&&Number.isFinite(y.at(-2))&&Math.abs(dx1)>1e-15)out[out.length-1]=(y.at(-1)-y.at(-2))/dx1;
    }
    return out;
  }

  function transformSweep(sweep,type='raw',options={}){
    const pts=sweep?.points||[];
    if(!pts.length)return {type,points:[],unit:'',label:type};
    const x=pts.map(p=>p.v);
    const rawI=pts.map(p=>p.i);
    const absI=rawI.map(Math.abs);
    const step=Math.abs(sweep.step||median(x.slice(1).map((v,i)=>v-x[i]))||0.01);
    const radius=Math.max(1,Math.round(options.radius??2));
    const smI=movingAverage(rawI,radius);
    const smAbs=movingAverage(absI,radius);
    const bgRadius=Math.max(radius+3,Math.round(0.14/Math.max(step,1e-12)));
    const bg=movingAverage(absI,bgRadius);
    const residual=absI.map((v,i)=>v-bg[i]);

    const didv=derivativeArray(smI,x);
    const d2idv2=derivativeArray(didv,x);
    const dAbsDidv=derivativeArray(smAbs,x);
    const d2abs=derivativeArray(dAbsDidv,x);

    const currentScale=Math.max(median(absI.filter(v=>v>0))||0,1e-30);
    const currentFloor=Math.max(options.currentFloor||0,currentScale*1e-7,1e-18);
    const logI=absI.map(v=>Math.log(Math.max(v,currentFloor)));
    const dlog=derivativeArray(movingAverage(logI,radius),x);

    const gScale=Math.max(median(didv.filter(Number.isFinite).map(Math.abs))||0,1e-30);
    const gFloor=Math.max(gScale*1e-3,1e-30);
    const dvdi=didv.map(g=>Number.isFinite(g)&&Math.abs(g)>gFloor?1/g:NaN);
    const resistance=pts.map(p=>Math.abs(p.i)>currentFloor?Math.abs(p.v/p.i):NaN);

    const defs={
      raw:{y:rawI,label:'原始 I–V',unit:'A'},
      detrend:{y:residual,label:'去背景 I−I_bg',unit:'A'},
      didv:{y:didv,label:'dI/dV',unit:'A/V'},
      d2idv2:{y:d2idv2,label:'d²I/dV²',unit:'A/V²'},
      dlog:{y:dlog,label:'d ln|I|/dV',unit:'1/V'},
      dvdi:{y:dvdi,label:'dV/dI',unit:'V/A'},
      resistance:{y:resistance,label:'R=|V/I|',unit:'Ω'}
    };
    const def=defs[type]||defs.raw;
    return {
      type,
      label:def.label,
      unit:def.unit,
      points:pts.map((p,i)=>({v:p.v,y:def.y[i],rawIndex:i,rawI:p.i})),
      background:bg,
      residual,
      didv,
      d2idv2,
      d2abs,
      dlog,
      dvdi,
      resistance
    };
  }

  function localExtremaScore(y,j,kind='max',window=5){
    const lo=Math.max(0,j-window),hi=Math.min(y.length-1,j+window);
    const center=y[j];
    if(!Number.isFinite(center))return NaN;
    const sides=[];
    for(let k=lo;k<=hi;k++){
      if(Math.abs(k-j)>=Math.max(2,Math.floor(window/2))&&Number.isFinite(y[k]))sides.push(y[k]);
    }
    if(!sides.length)return NaN;
    const sideRef=median(sides);
    const noise=robustFiniteScale(sides.map(v=>v-sideRef));
    const effect=kind==='min'?sideRef-center:center-sideRef;
    return effect/Math.max(noise,1e-30);
  }

  function transformedCandidates(sweep,algorithm,threshold){
    const radii=(algorithm==='raw'||algorithm==='snr')?[1]:[1,2,3];
    const out=[];
    for(const radius of radii){
      const t=transformSweep(sweep,
        algorithm==='diff'?'didv':
        algorithm==='curvature'?'d2idv2':
        algorithm==='dlog'?'dlog':
        algorithm==='dvdi'?'dvdi':
        algorithm==='resistance'?'resistance':
        algorithm==='detrend'?'detrend':'raw',
        {radius}
      );
      const y=t.points.map(p=>p.y);
      const absRaw=sweep.points.map(p=>Math.abs(p.i));
      const step=Math.abs(sweep.step||0.01);

      if(algorithm==='raw'||algorithm==='snr'){
        for(let j=2;j<absRaw.length-2;j++){
          if(!(absRaw[j]>absRaw[j-1]&&absRaw[j]>=absRaw[j+1]))continue;
          const prom=localProminence(absRaw,j,Math.max(8,Math.round(0.12/Math.max(step,1e-12))));
          const local=[];
          for(let k=Math.max(1,j-10);k<=Math.min(absRaw.length-2,j+10);k++){
            if(Math.abs(k-j)>2)local.push(absRaw[k+1]-2*absRaw[k]+absRaw[k-1]);
          }
          const noise=Math.max((mad(local)||0)/Math.sqrt(6),Math.abs(absRaw[j])*1e-5,1e-30);
          const score=prom/noise;
          if(score>=threshold){
            out.push({index:j,score,algorithm,channel:algorithm,scale:radius,prominence:prom,snr:score});
          }
        }
        continue;
      }

      if(algorithm==='detrend'){
        const noise=robustFiniteScale(y);
        for(let j=2;j<y.length-2;j++){
          if(Number.isFinite(y[j])&&y[j]>0&&y[j]>y[j-1]&&y[j]>=y[j+1]){
            const score=y[j]/Math.max(noise,1e-30);
            if(score>=threshold)out.push({index:j,score,algorithm,channel:algorithm,scale:radius,residual:y[j]});
          }
        }
        continue;
      }

      if(algorithm==='diff'||algorithm==='dlog'){
        for(let j=3;j<y.length-3;j++){
          if(!Number.isFinite(y[j]))continue;
          if(y[j]<=y[j-1]&&y[j]<y[j+1]){
            const score=localExtremaScore(y,j,'min',6);
            if(Number.isFinite(score)&&score>=threshold)out.push({index:j,score,algorithm,channel:algorithm,scale:radius});
          }
        }
        continue;
      }

      if(algorithm==='curvature'){
        // Detection uses curvature of |I| so positive- and negative-current
        // resonances have the same sign convention. Preview still shows d²I/dV².
        const curvature=t.d2abs.map(v=>Number.isFinite(v)?-v:NaN);
        for(let j=3;j<curvature.length-3;j++){
          if(!Number.isFinite(curvature[j]))continue;
          if(curvature[j]>=curvature[j-1]&&curvature[j]>curvature[j+1]){
            const score=localExtremaScore(curvature,j,'max',6);
            if(Number.isFinite(score)&&score>=threshold)out.push({index:j,score,algorithm,channel:algorithm,scale:radius});
          }
        }
        continue;
      }

      if(algorithm==='dvdi'){
        const ay=y.map(v=>Number.isFinite(v)?Math.abs(v):NaN);
        const finite=ay.filter(Number.isFinite);
        const med=median(finite)||0;
        const cap=(med||1)*1000;
        for(let j=3;j<ay.length-3;j++){
          if(!Number.isFinite(ay[j])||ay[j]>cap)continue;
          if(ay[j]>=ay[j-1]&&ay[j]>ay[j+1]){
            const score=localExtremaScore(ay,j,'max',5);
            if(Number.isFinite(score)&&score>=threshold)out.push({index:j,score,algorithm,channel:algorithm,scale:radius});
          }
        }
        continue;
      }

      if(algorithm==='resistance'){
        for(let j=3;j<y.length-3;j++){
          if(Math.abs(sweep.points[j].v)<Math.max(0.03,2*step))continue;
          if(!Number.isFinite(y[j]))continue;
          if(y[j]<=y[j-1]&&y[j]<y[j+1]){
            const score=localExtremaScore(y,j,'min',6);
            if(Number.isFinite(score)&&score>=threshold)out.push({index:j,score,algorithm,channel:algorithm,scale:radius});
          }
        }
      }
    }
    return out;
  }

  function projectCandidateToRaw(sweep,centerIndex,items){
    const pts=sweep.points,absI=pts.map(p=>Math.abs(p.i));
    const step=Math.abs(sweep.step||0.01);
    const spread=Math.max(0,...items.map(z=>Math.abs(z.index-centerIndex)));
    const radius=Math.max(3,spread+2,Math.round(0.055/Math.max(step,1e-12)));
    const lo=Math.max(1,centerIndex-radius),hi=Math.min(pts.length-2,centerIndex+radius);

    const bgRadius=Math.max(radius+3,Math.round(0.14/Math.max(step,1e-12)));
    const bg=movingAverage(absI,bgRadius);
    const residual=absI.map((v,i)=>v-bg[i]);
    const noise=robustFiniteScale(residual.slice(Math.max(0,lo-radius),Math.min(residual.length,hi+radius+1)));

    const rawMaxima=[];
    for(let j=lo;j<=hi;j++){
      if(absI[j]>absI[j-1]&&absI[j]>=absI[j+1]){
        const prom=localProminence(absI,j,Math.max(8,radius));
        const score=(Math.max(0,residual[j])/Math.max(noise,1e-30))*1.4 +
          prom/Math.max(Math.abs(absI[j])*0.01,noise,1e-30) -
          0.12*Math.abs(j-centerIndex);
        rawMaxima.push({j,score});
      }
    }
    if(rawMaxima.length){
      rawMaxima.sort((a,b)=>b.score-a.score);
      return {index:rawMaxima[0].j,method:'raw-local-maximum'};
    }

    // Monotonic shoulder: choose the strongest ORIGINAL-I residual sample.
    // This is still an actual measured I-V point; derivative/R transforms never
    // become the reported Vpk coordinate.
    let best={j:clamp(centerIndex,lo,hi),score:-Infinity};
    for(let j=lo;j<=hi;j++){
      const score=(Number.isFinite(residual[j])?residual[j]:-Infinity)-0.05*noise*Math.abs(j-centerIndex);
      if(score>best.score)best={j,score};
    }
    return {index:best.j,method:'raw-residual-projection'};
  }

  function rawProminence(sweep, threshold){
    const pts=sweep.points, y=pts.map(p=>Math.abs(p.i)); const out=[];
    for(let j=1;j<pts.length-1;j++){
      if(y[j]>y[j-1] && y[j]>=y[j+1]){
        const prom=localProminence(y,j,14);
        const scale=Math.max(Math.abs(y[j]),1e-30);
        if(prom/scale>=threshold){out.push({index:j,score:prom/scale,prominence:prom});}
      }
    }
    return out;
  }

  function localSnr(sweep, threshold){
    const pts=sweep.points,y=pts.map(p=>Math.abs(p.i)); const out=[];
    for(let j=2;j<pts.length-2;j++){
      if(!(y[j]>y[j-1]&&y[j]>=y[j+1])) continue;
      const prom=localProminence(y,j,12);
      const lo=Math.max(1,j-10),hi=Math.min(y.length-2,j+10),d2=[];
      for(let k=lo;k<=hi;k++) if(Math.abs(k-j)>2) d2.push(y[k+1]-2*y[k]+y[k-1]);
      const noise=(mad(d2)||1e-30)/Math.sqrt(6); const snr=prom/Math.max(noise,1e-30);
      if(snr>=threshold) out.push({index:j,score:snr,prominence:prom,snr});
    }
    return out;
  }

  function differentialDip(sweep, threshold){
    const pts=sweep.points; if(pts.length<9) return [];
    const dx=sweep.step||median(pts.slice(1).map((p,i)=>p.v-pts[i].v))||0.01;
    const y=pts.map(p=>p.i); const sm=movingAverage(y,2); const g=new Array(y.length).fill(NaN);
    for(let j=1;j<y.length-1;j++) g[j]=(sm[j+1]-sm[j-1])/(2*dx);
    const out=[];
    for(let j=2;j<g.length-2;j++){
      if(!Number.isFinite(g[j])) continue;
      if(g[j]<g[j-1]&&g[j]<=g[j+1]){
        const left=Math.max(g[j-2],g[j-1]), right=Math.max(g[j+1],g[j+2]);
        const depth=Math.min(left-g[j],right-g[j]);
        const scale=Math.max(Math.abs(g[j]),0.5*(Math.abs(left)+Math.abs(right)),1e-30);
        const rel=depth/scale;
        if(rel>=threshold) out.push({index:j,score:rel,diffDepth:rel,gmin:g[j]});
      }
    }
    return out;
  }

  function detrendedShoulder(sweep, threshold){
    const pts=sweep.points,y=pts.map(p=>Math.abs(p.i)); const r=Math.max(4,Math.round(0.16/(sweep.step||0.01)));
    const bg=movingAverage(y,r); const res=y.map((v,i)=>v-bg[i]); const noise=mad(res)||1e-30; const out=[];
    for(let j=1;j<res.length-1;j++){
      if(res[j]>res[j-1]&&res[j]>=res[j+1]&&res[j]/noise>=threshold) out.push({index:j,score:res[j]/noise,residual:res[j]});
    }
    return out;
  }

  function curvatureCandidates(sweep, threshold){
    const pts=sweep.points,y=movingAverage(pts.map(p=>Math.abs(p.i)),2); const dx=sweep.step||0.01; const c=new Array(y.length).fill(0);
    for(let j=1;j<y.length-1;j++) c[j]=-(y[j+1]-2*y[j]+y[j-1])/(dx*dx);
    const noise=mad(c)||1e-30; const out=[];
    for(let j=2;j<c.length-2;j++) if(c[j]>c[j-1]&&c[j]>=c[j+1]&&c[j]/noise>=threshold) out.push({index:j,score:c[j]/noise,curvature:c[j]});
    return out;
  }


  // ------------------------------------------------------------------
  // v3.7 robust multiscale matched-filter core
  // ------------------------------------------------------------------
  function rollingMedian(y,radius){
    const r=Math.max(1,Math.round(radius));
    const out=new Array(y.length).fill(NaN);
    for(let j=0;j<y.length;j++){
      const lo=Math.max(0,j-r),hi=Math.min(y.length-1,j+r);
      out[j]=median(y.slice(lo,hi+1));
    }
    return out;
  }

  function matchedFilterCandidates(sweep,mode='balanced',range=null){
    const pts=sweep.points||[];
    if(pts.length<11)return [];
    const x=pts.map(p=>p.v);
    const y=pts.map(p=>Math.abs(p.i));
    const step=Math.max(Math.abs(sweep.step||median(x.slice(1).map((v,i)=>v-x[i]))||0.01),1e-12);

    // A rolling median is deliberately used instead of a polynomial global
    // background: it tolerates strong asymmetric tunnelling background and
    // isolated resonances without pulling the baseline through the peak.
    const bgRadius=Math.max(5,Math.round(0.20/step));
    const bg=rollingMedian(y,bgRadius);
    const residual=y.map((v,i)=>v-bg[i]);

    // Noise is estimated from first differences of the detrended residual,
    // which is much less sensitive to the slowly varying tunnelling current.
    const diffs=[];
    for(let j=1;j<residual.length;j++){
      if(Number.isFinite(residual[j])&&Number.isFinite(residual[j-1]))diffs.push((residual[j]-residual[j-1])/Math.sqrt(2));
    }
    const globalNoise=Math.max(mad(diffs)||mad(residual)||0,median(y)*1e-5||0,1e-30);

    const scaleV=[0.018,0.028,0.042,0.062,0.090,0.130];
    const threshold=mode==='strict'?4.7:mode==='sensitive'?2.9:3.65;
    const out=[];

    for(const sigmaV of scaleV){
      const sigma=Math.max(1.15,sigmaV/step);
      const kr=Math.max(3,Math.ceil(3.2*sigma));
      if(2*kr+3>=pts.length)continue;

      // Zero-mean Mexican-hat/Ricker kernel. Zero mean suppresses a local
      // linear/constant background and makes shoulders visible without
      // reporting the transform coordinate as the final Vpk.
      const kernel=[];
      for(let q=-kr;q<=kr;q++){
        const t=q/sigma;
        kernel.push((1-t*t)*Math.exp(-0.5*t*t));
      }
      const km=kernel.reduce((s,v)=>s+v,0)/kernel.length;
      for(let k=0;k<kernel.length;k++)kernel[k]-=km;
      const norm=Math.sqrt(kernel.reduce((s,v)=>s+v*v,0))||1;

      const resp=new Array(pts.length).fill(NaN);
      for(let j=kr;j<pts.length-kr;j++){
        let sum=0;
        for(let q=-kr;q<=kr;q++)sum+=kernel[q+kr]*residual[j+q];
        resp[j]=sum/norm;
      }

      const respNoise=Math.max(mad(resp.filter(Number.isFinite))||0,globalNoise,1e-30);
      for(let j=kr+1;j<pts.length-kr-1;j++){
        if(!Number.isFinite(resp[j]))continue;
        if(!(resp[j]>resp[j-1]&&resp[j]>=resp[j+1]))continue;
        const score=resp[j]/respNoise;
        if(score<threshold)continue;

        const v=pts[j].v;
        if(range){
          if(Number.isFinite(range.vMin)&&v<range.vMin)continue;
          if(Number.isFinite(range.vMax)&&v>range.vMax)continue;
        }
        out.push({
          index:j,
          score,
          algorithm:'matched',
          channel:'matched',
          scale:sigmaV,
          matchedResponse:resp[j]
        });
      }
    }
    return out;
  }

  function pointInsideDetectionRange(point,range){
    if(!range)return true;
    if(Number.isFinite(range.vMin)&&point.v<range.vMin)return false;
    if(Number.isFinite(range.vMax)&&point.v>range.vMax)return false;
    if(Number.isFinite(range.iMin)&&point.i<range.iMin)return false;
    if(Number.isFinite(range.iMax)&&point.i>range.iMax)return false;
    return true;
  }

  function detectPeaks(sweep, settings, options={}){
    const defaults=preset(settings?._preset||'balanced');
    const cfg={...defaults,...(settings||{})};
    const keys=['raw','snr','diff','detrend','curvature','dlog','dvdi','resistance'];
    const detections=[];
    const mode=['strict','balanced','sensitive'].includes(cfg._preset)?cfg._preset:'balanced';
    const range=options?.range||null;

    // Candidate collection is intentionally permissive. Acceptance is decided
    // later by independent evidence, persistence across scales, and the new
    // matched-filter core.
    const collectFactor=mode==='strict'?0.84:mode==='sensitive'?0.78:0.68;

    for(const key of keys){
      const c=cfg[key]||defaults[key];
      if(!c?.enabled)continue;
      const arr=transformedCandidates(sweep,key,Number(c.threshold)*collectFactor);
      for(const d of arr){
        const pt=sweep.points[d.index];
        if(!pt)continue;
        if(range){
          const pad=Math.max(0.02,2*Math.abs(sweep.step||0.01));
          if(Number.isFinite(range.vMin)&&pt.v<range.vMin-pad)continue;
          if(Number.isFinite(range.vMax)&&pt.v>range.vMax+pad)continue;
        }
        detections.push(d);
      }
    }

    // Always-on core: robust, multiscale, zero-mean matched filtering.
    // It is not exposed as another user threshold because the user-facing
    // workflow should remain only Reliable / Balanced / Sensitive.
    detections.push(...matchedFilterCandidates(sweep,mode,range));
    if(!detections.length)return [];

    detections.sort((a,b)=>a.index-b.index);
    const tol=Math.max(1,Math.round(0.045/Math.max(Math.abs(sweep.step||0.01),1e-12)));
    const clusters=[];
    for(const d of detections){
      let g=null,bestDist=Infinity;
      for(const c of clusters){
        const dist=Math.abs(c.centerIndex-d.index);
        if(dist<=tol&&dist<bestDist){g=c;bestDist=dist;}
      }
      if(!g){g={items:[],centerIndex:d.index};clusters.push(g);}
      g.items.push(d);
      const weights=g.items.map(z=>Math.max(1,Math.min(14,Number(z.score)||1)));
      const denom=weights.reduce((s,v)=>s+v,0);
      g.centerIndex=Math.round(g.items.reduce((s,z,i)=>s+z.index*weights[i],0)/Math.max(denom,1e-30));
    }

    const candidates=[];
    for(const c of clusters){
      const channels=[...new Set(c.items.map(z=>z.channel))];
      const scales=[...new Set(c.items.map(z=>`${z.channel}:${z.scale}`))];
      const matchedItems=c.items.filter(z=>z.channel==='matched');
      const matchedScales=[...new Set(matchedItems.map(z=>z.scale))];
      const maxScore=Math.max(...c.items.map(z=>Number(z.score)||0));
      const matchedScore=matchedItems.length?Math.max(...matchedItems.map(z=>Number(z.score)||0)):0;
      const hasRaw=channels.includes('raw')||channels.includes('snr');
      const hasResidual=channels.includes('detrend');
      const hasSlope=channels.includes('diff')||channels.includes('dlog')||channels.includes('curvature');
      const physicalEvidenceCount=channels.filter(k=>!['resistance','dvdi'].includes(k)).length;
      const evidenceCount=c.items.length;
      const persistentMatched=matchedScales.length>=2;

      // Acceptance now prioritizes stable matched-filter persistence and
      // agreement with an independent raw/residual/slope channel. R and dV/dI
      // remain corroborating evidence and cannot create a peak on their own.
      let accept=false;
      if(mode==='strict'){
        accept=
          (persistentMatched&&(hasRaw||hasResidual||hasSlope)&&matchedScore>=4.4) ||
          (hasRaw&&hasResidual&&hasSlope&&maxScore>=5.0);
      }else if(mode==='sensitive'){
        accept=
          (matchedItems.length>=1&&matchedScore>=3.0&&(hasRaw||hasResidual||hasSlope)) ||
          (persistentMatched&&matchedScore>=4.2&&(hasResidual||hasSlope)) ||
          (hasRaw&&hasResidual&&maxScore>=3.2) ||
          (hasResidual&&hasSlope&&maxScore>=3.6);
      }else{
        accept=
          (persistentMatched&&(hasRaw||hasResidual||hasSlope)&&matchedScore>=3.45) ||
          (matchedItems.length>=1&&matchedScore>=4.15&&(hasRaw||hasResidual||hasSlope)) ||
          (hasRaw&&hasResidual&&maxScore>=3.8);
      }
      if(!accept)continue;

      const projected=projectCandidateToRaw(sweep,c.centerIndex,c.items);
      const j=clamp(projected.index,0,sweep.points.length-1);
      const edgeGuard=Math.max(3,Math.round(0.05/Math.max(Math.abs(sweep.step||0.01),1e-12)));
      if(j<edgeGuard||j>sweep.points.length-1-edgeGuard)continue;
      const p=sweep.points[j];

      // A local-search rectangle constrains the FINAL raw-I point, not merely
      // a derivative/matched-filter candidate.
      if(!pointInsideDetectionRange(p,range))continue;

      const width=estimateWidth(sweep.points,j);
      const primary=c.items.slice().sort((x,y)=>(Number(y.score)||0)-(Number(x.score)||0))[0];

      let confidence=
        0.12*Math.min(4,physicalEvidenceCount) +
        0.10*Math.min(4,matchedScales.length) +
        0.30*Math.min(1,maxScore/7) +
        0.18*Math.min(1,matchedScore/6) +
        (hasRaw?0.10:0) +
        (hasResidual?0.08:0);
      if(!matchedItems.length)confidence-=0.08;
      confidence=clamp(confidence,0,1);

      candidates.push({
        id:`${sweep.id}::auto::${Date.now()}::${candidates.length}::${Math.random().toString(36).slice(2,7)}`,
        sweepId:sweep.id,datasetPath:sweep.datasetPath,vg:sweep.vg,direction:sweep.direction,
        index:j,v:p.v,i:p.i,accepted:true,manual:false,locked:false,
        algorithms:channels,
        primaryAlgorithm:primary.algorithm,
        score:maxScore,
        confidence,
        supportCount:evidenceCount,
        supportChannels:channels,
        supportScales:scales,
        matchedScaleCount:matchedScales.length,
        matchedScore,
        candidateCenterIndex:c.centerIndex,
        candidateCenterV:sweep.points[clamp(c.centerIndex,0,sweep.points.length-1)]?.v,
        projectionMethod:projected.method,
        prominence:localProminence(sweep.points.map(q=>Math.abs(q.i)),j,14),
        snr:primary.snr??NaN,
        diffDepth:primary.diffDepth??NaN,
        widthLeft:width.left,widthRight:width.right,fwhm:width.fwhm,
        peakOrder:null,peakLabel:'',customColor:null,
        orderAnchor:false
      });
    }

    // Non-maximum suppression after RAW-I projection.
    candidates.sort((x,y)=>y.confidence-x.confidence || y.score-x.score);
    const kept=[];
    const minSep=Math.max(2*Math.abs(sweep.step||0.01),0.032);
    for(const c of candidates){
      const old=kept.find(k=>Math.abs(k.v-c.v)<minSep);
      if(!old){kept.push(c);continue;}
      // Prefer the candidate supported by more matched-filter scales.
      const cRank=(c.matchedScaleCount||0)*2+(c.confidence||0);
      const oRank=(old.matchedScaleCount||0)*2+(old.confidence||0);
      if(cRank>oRank){
        kept.splice(kept.indexOf(old),1,c);
      }
    }
    return kept.sort((x,y)=>x.v-y.v);
  }

  // ------------------------------------------------------------------
  // v3.11 pulse/read transient analyzer
  // Core idea mirrors DataDeal-V4: split into fixed repeated segments and
  // average a stable sub-window, but block size/phase are auto-detected.
  // ------------------------------------------------------------------
  function pulseHeaderIndex(headers,kind){
    const hs=(headers||[]).map(h=>String(h||'').toLowerCase());
    if(kind==='current'){
      let j=hs.findIndex(h=>/\bcurrent\b|(^|[^a-z])id(?:\W|$)|(^|[^a-z])ids?(?:\W|$)/i.test(h));
      if(j<0)j=hs.findIndex(h=>/(^|[^a-z])i(?:\W|$)/i.test(h));
      return j;
    }
    if(kind==='voltage'){
      let j=hs.findIndex(h=>/\bvd\b|\bvds\b|voltage|bias/i.test(h));
      if(j<0)j=hs.findIndex(h=>/(^|[^a-z])v(?:\W|$)/i.test(h)&&!/vg|gate/i.test(h));
      return j;
    }
    if(kind==='time'){
      return hs.findIndex(h=>/time|秒|时间/i.test(h));
    }
    return -1;
  }

  function medianAbsDeviation(values){
    const a=(values||[]).filter(Number.isFinite);
    if(!a.length)return NaN;
    const m=median(a);
    return median(a.map(v=>Math.abs(v-m)));
  }

  function groupNearbyIndices(indices,maxGap=3){
    const groups=[];
    for(const idx of indices){
      const g=groups.at(-1);
      if(!g||idx-g.at(-1)>maxGap)groups.push([idx]);
      else g.push(idx);
    }
    return groups;
  }

  function estimatePulseBlockSamples(voltage){
    if(!voltage||voltage.length<20)return NaN;
    const finite=voltage.filter(Number.isFinite);
    if(finite.length<20)return NaN;
    const vr=Math.max(...finite)-Math.min(...finite);
    const diffs=[];
    for(let k=1;k<voltage.length;k++){
      const d=Math.abs(voltage[k]-voltage[k-1]);
      if(Number.isFinite(d))diffs.push(d);
    }
    const dm=median(diffs)||0;
    const dn=medianAbsDeviation(diffs)||0;
    const threshold=Math.max(vr*.035,dm+8*dn,1e-9);
    const idx=[];
    for(let k=1;k<voltage.length;k++){
      const d=Math.abs(voltage[k]-voltage[k-1]);
      if(Number.isFinite(d)&&d>=threshold)idx.push(k);
    }
    const groups=groupNearbyIndices(idx,3);
    const changes=groups.map(g=>g[0]);
    const gaps=[];
    for(let k=1;k<changes.length;k++){
      const d=changes[k]-changes[k-1];
      if(d>=4&&d<=Math.max(400,voltage.length/3))gaps.push(d);
    }
    if(!gaps.length)return NaN;
    const rounded=Math.max(2,Math.round(median(gaps)));
    return rounded;
  }

  function estimateBlockOffset(voltage,blockSamples){
    const n=Math.max(2,Math.round(blockSamples));
    const finite=voltage.filter(Number.isFinite);
    const vr=finite.length?Math.max(...finite)-Math.min(...finite):0;
    const diffs=[];
    for(let k=1;k<voltage.length;k++){
      const d=Math.abs(voltage[k]-voltage[k-1]);
      if(Number.isFinite(d))diffs.push(d);
    }
    const dm=median(diffs)||0,dn=medianAbsDeviation(diffs)||0;
    const threshold=Math.max(vr*.035,dm+8*dn,1e-9);
    const residues=[];
    for(let k=1;k<voltage.length;k++){
      if(Math.abs(voltage[k]-voltage[k-1])>=threshold)residues.push(k%n);
    }
    if(!residues.length)return 0;
    const counts=new Array(n).fill(0);
    for(const r of residues)counts[r]++;
    let best=0;
    for(let r=1;r<n;r++)if(counts[r]>counts[best])best=r;
    return best;
  }

  function stableBlockAverage(values,start,end,startFraction=.25,endFraction=.75){
    const n=Math.max(0,end-start);
    if(!n)return NaN;
    let a=start+Math.floor(n*Math.max(0,Math.min(.95,startFraction)));
    let b=start+Math.ceil(n*Math.max(.05,Math.min(1,endFraction)));
    if(b<=a){a=start;b=end;}
    const arr=values.slice(a,b).filter(Number.isFinite);
    return arr.length?arr.reduce((s,v)=>s+v,0)/arr.length:NaN;
  }

  function analyzePulseReadData(file,options={}){
    const inspectOptions={
      ...defaultImportOptions(),
      ...(options.importOptions||{}),
      skipRows:Number(options.skipRows)||0,
      delimiter:options.delimiter||'auto',
      headerMode:options.headerMode||'auto'
    };
    const ins=inspectDataText(file,inspectOptions);
    if(ins.rowCount<8)throw new Error('有效数据行过少，无法识别脉冲。');

    const headers=ins.headers;
    let timeCol=Number.isFinite(Number(options.timeCol))?Number(options.timeCol):pulseHeaderIndex(headers,'time');
    let currentCol=Number.isFinite(Number(options.currentCol))?Number(options.currentCol):pulseHeaderIndex(headers,'current');
    let voltageCol=Number.isFinite(Number(options.voltageCol))?Number(options.voltageCol):pulseHeaderIndex(headers,'voltage');

    if(timeCol<0)timeCol=0;
    if(currentCol<0)currentCol=Math.min(1,headers.length-1);
    if(voltageCol<0)voltageCol=Math.min(headers.length-1,Math.max(2,currentCol+1));

    const rows=ins.numericRows.filter(r=>
      Number.isFinite(r.values[currentCol])&&Number.isFinite(r.values[voltageCol])
    );
    const time=rows.map((r,k)=>Number.isFinite(r.values[timeCol])?r.values[timeCol]:k);
    const current=rows.map(r=>r.values[currentCol]);
    const voltage=rows.map(r=>r.values[voltageCol]);

    let blockSamples=Math.round(Number(options.blockSamples)||0);
    if(blockSamples<=1)blockSamples=estimatePulseBlockSamples(voltage);
    if(!Number.isFinite(blockSamples)||blockSamples<2)throw new Error('无法自动识别单个平台点数，请在高级设置中手动指定。');

    let offset=Number.isFinite(Number(options.offsetSamples))
      ? Math.max(0,Math.round(Number(options.offsetSamples)))
      : estimateBlockOffset(voltage,blockSamples);
    offset=offset%blockSamples;

    const startFraction=Number.isFinite(Number(options.windowStartFraction))?Number(options.windowStartFraction):.25;
    const endFraction=Number.isFinite(Number(options.windowEndFraction))?Number(options.windowEndFraction):.75;

    const blocks=[];
    for(let start=offset,bi=0;start+blockSamples<=voltage.length;start+=blockSamples,bi++){
      const end=start+blockSamples;
      const vAvg=stableBlockAverage(voltage,start,end,startFraction,endFraction);
      const iAvg=stableBlockAverage(current,start,end,startFraction,endFraction);
      const tAvg=stableBlockAverage(time,start,end,startFraction,endFraction);
      if(!Number.isFinite(vAvg)||!Number.isFinite(iAvg))continue;
      blocks.push({
        blockIndex:bi,startIndex:start,endIndex:end-1,
        voltage:vAvg,current:iAvg,time:tAvg
      });
    }
    if(blocks.length<4)throw new Error('识别到的平台数量过少。');

    const parityStats=[0,1].map(parity=>{
      const vals=blocks.filter(b=>b.blockIndex%2===parity).map(b=>b.voltage);
      return {
        parity,
        count:vals.length,
        median:median(vals),
        mad:medianAbsDeviation(vals)
      };
    });
    parityStats.sort((a,b)=>{
      const am=Number.isFinite(a.mad)?a.mad:Infinity;
      const bm=Number.isFinite(b.mad)?b.mad:Infinity;
      return am-bm;
    });
    const readParity=Number.isFinite(Number(options.readParity))
      ? Math.abs(Math.round(Number(options.readParity)))%2
      : parityStats[0].parity;
    const readVals=blocks.filter(b=>b.blockIndex%2===readParity).map(b=>b.voltage);
    const readVoltage=median(readVals);

    const pairMode=['after','before'].includes(options.readPairMode)?options.readPairMode:'after';
    const points=[];
    const byIndex=new Map(blocks.map(b=>[b.blockIndex,b]));
    for(const pulseBlock of blocks.filter(b=>b.blockIndex%2!==readParity)){
      let readBlock=null;
      if(pairMode==='before')readBlock=byIndex.get(pulseBlock.blockIndex-1)||byIndex.get(pulseBlock.blockIndex+1);
      else readBlock=byIndex.get(pulseBlock.blockIndex+1)||byIndex.get(pulseBlock.blockIndex-1);
      if(!readBlock||readBlock.blockIndex%2!==readParity)continue;
      points.push({
        index:points.length,
        pulseVoltage:pulseBlock.voltage,
        pulseCurrent:pulseBlock.current,
        readVoltage:readBlock.voltage,
        readCurrent:readBlock.current,
        pulseTime:pulseBlock.time,
        readTime:readBlock.time,
        pulseBlockIndex:pulseBlock.blockIndex,
        readBlockIndex:readBlock.blockIndex
      });
    }

    return {
      fileName:file.name||'pulse-data',
      inspection:ins,
      columns:{timeCol,currentCol,voltageCol},
      blockSamples,
      offsetSamples:offset,
      readParity,
      readVoltage,
      windowStartFraction:startFraction,
      windowEndFraction:endFraction,
      pairMode,
      blocks,
      points,
      raw:{time,current,voltage}
    };
  }

  function peakMetrics(peak,sweep){
    const pts=sweep.points; const j=nearestIndex(pts.map(p=>p.v),peak.v); const p=pts[j];
    const leftIdx=nearestIndex(pts.map(p=>p.v),peak.widthLeft), rightIdx=nearestIndex(pts.map(p=>p.v),peak.widthRight);
    const lo=Math.min(leftIdx,rightIdx),hi=Math.max(leftIdx,rightIdx); const baseline=0.5*(Math.abs(pts[lo].i)+Math.abs(pts[hi].i));
    const amplitude=Math.max(0,Math.abs(p.i)-baseline); let area=0;
    for(let k=lo;k<hi;k++){const y1=Math.max(0,Math.abs(pts[k].i)-baseline),y2=Math.max(0,Math.abs(pts[k+1].i)-baseline);area+=0.5*(y1+y2)*(pts[k+1].v-pts[k].v);}
    return {...peak,amplitude,area,baseline,fwhm:Math.abs(peak.widthRight-peak.widthLeft)};
  }


  // ------------------------------------------------------------------
  // TER matrix / TER_max
  // Mirrors the logic of the supplied ter_matrix.py:
  //   1) use ORIGINAL acquisition order;
  //   2) mark each raw sample as up (+1) or down (-1);
  //   3) pair up/down at the SAME Vds within tolerance;
  //   4) R = abs(Vds / I);
  //   5) TER(high-low) = (R_high - R_low) / R_low * 100;
  //   6) TER_max(Vg) = max over Vds for each Vg.
  // ------------------------------------------------------------------

  function detectTerVoltageParameters(datasets){
    let globalMin=Infinity, globalMax=-Infinity, globalStep=Infinity;
    for(const ds of datasets||[]){
      const pts=ds.points||[];
      for(const p of pts){
        if(Number.isFinite(p.v)){
          globalMin=Math.min(globalMin,p.v);
          globalMax=Math.max(globalMax,p.v);
        }
      }
      for(let k=1;k<pts.length;k++){
        const d=Math.abs(pts[k].v-pts[k-1].v);
        if(Number.isFinite(d)&&d>1e-12)globalStep=Math.min(globalStep,d);
      }
    }
    if(!Number.isFinite(globalStep)||!Number.isFinite(globalMin)||!Number.isFinite(globalMax)||globalMax<=globalMin){
      throw new Error('无法从当前项目检测有效的 Vds 范围或步长。');
    }
    return {vmin:globalMin,vmax:globalMax,vstep:globalStep};
  }

  function sweepDirectionsRaw(points,tolerance){
    const dirs=new Int8Array(points.length);
    for(let index=0;index<points.length;index++){
      if(index>0 && Math.abs(points[index].v-points[index-1].v)>tolerance){
        dirs[index]=points[index].v>points[index-1].v?1:-1;
      }else if(index+1<points.length && Math.abs(points[index+1].v-points[index].v)>tolerance){
        dirs[index]=points[index+1].v>points[index].v?1:-1;
      }
    }
    return dirs;
  }

  function terVoltageGrid(vmin,vmax,step){
    if(!(vmin<0&&vmax>0))throw new Error('TER_max 要求 Vds 范围跨过 0 V。');
    if(!(step>0))throw new Error('Vds 步长必须大于 0。');
    const out=[];
    // Equivalent to np.arange(vmin, -step/2, step)
    for(let v=vmin, guard=0; v < -step/2 && guard<100000; v+=step,guard++){
      out.push(Number(v.toFixed(12)));
    }
    // Equivalent to np.arange(step, vmax + step/2, step)
    for(let v=step, guard=0; v <= vmax+step/2 && guard<100000; v+=step,guard++){
      out.push(Number(v.toFixed(12)));
    }
    return out;
  }

  function calculateTerHighLow(rUp,rDown){
    if(!Number.isFinite(rUp)||!Number.isFinite(rDown))return NaN;
    const low=Math.min(rUp,rDown), high=Math.max(rUp,rDown);
    return low!==0?(high-low)/low*100:NaN;
  }

  function processDatasetTer(dataset,targets,tolerance,currentFloor){
    const pts=dataset.points||[];
    const dirs=sweepDirectionsRaw(pts,tolerance);
    const records=[];
    for(const target of targets){
      let upIndex=-1,downIndex=-1;
      for(let k=0;k<pts.length;k++){
        if(Math.abs(pts[k].v-target)<=tolerance){
          if(upIndex<0&&dirs[k]===1)upIndex=k;
          if(downIndex<0&&dirs[k]===-1)downIndex=k;
          if(upIndex>=0&&downIndex>=0)break;
        }
      }
      const iUp=upIndex>=0?pts[upIndex].i:NaN;
      const iDown=downIndex>=0?pts[downIndex].i:NaN;
      const rUp=Number.isFinite(iUp)&&Math.abs(iUp)>currentFloor?Math.abs(target/iUp):NaN;
      const rDown=Number.isFinite(iDown)&&Math.abs(iDown)>currentFloor?Math.abs(target/iDown):NaN;
      const ter=Number.isFinite(rUp)&&Number.isFinite(rDown)?calculateTerHighLow(rUp,rDown):NaN;
      records.push({
        vg:dataset.vg,vds:target,
        iUp,iDown,rUp,rDown,ter,
        sourceFile:dataset.name
      });
    }
    return records;
  }

  function computeTerMatrix(datasets,options={}){
    if(!datasets?.length)throw new Error('当前项目没有可用于 TER_max 的数据。');
    const detected=detectTerVoltageParameters(datasets);
    const vmin=Number.isFinite(Number(options.vmin))?Number(options.vmin):detected.vmin;
    const vmax=Number.isFinite(Number(options.vmax))?Number(options.vmax):detected.vmax;
    const vstep=Number.isFinite(Number(options.vstep))&&Number(options.vstep)>0?Number(options.vstep):detected.vstep;
    const tolerance=Number.isFinite(Number(options.tolerance))&&Number(options.tolerance)>=0?Number(options.tolerance):vstep/20;
    const currentFloor=Number.isFinite(Number(options.currentFloor))&&Number(options.currentFloor)>0?Number(options.currentFloor):1e-15;
    const targets=terVoltageGrid(vmin,vmax,vstep);

    const records=[];
    for(const ds of datasets){
      records.push(...processDatasetTer(ds,targets,tolerance,currentFloor));
    }
    records.sort((x,y)=>(x.vg-y.vg)||(x.vds-y.vds));

    const vgs=[...new Set(records.map(r=>r.vg).filter(Number.isFinite))].sort((x,y)=>x-y);
    const matrix=vgs.map(vg=>targets.map(vds=>{
      const r=records.find(q=>q.vg===vg&&Math.abs(q.vds-vds)<=Math.max(1e-12,tolerance*0.01));
      return r?.ter??NaN;
    }));

    // TER_Max-Vg: for each Vg, maximize along the Vds axis.
    const terMaxByVg=[];
    for(const vg of vgs){
      const rows=records.filter(r=>r.vg===vg&&Number.isFinite(r.ter));
      if(!rows.length)continue;
      let best=rows[0];
      for(const r of rows){
        if(r.ter>best.ter)best=r;
      }
      terMaxByVg.push({
        vg,
        terMax:best.ter,
        vdsAtMax:best.vds,
        iUp:best.iUp,
        iDown:best.iDown,
        rUp:best.rUp,
        rDown:best.rDown,
        sourceFile:best.sourceFile
      });
    }

    // TER_Max-Vd: for each Vds, maximize along the Vg axis.
    const terMaxByVd=[];
    for(const vds of targets){
      const rows=records.filter(r=>Math.abs(r.vds-vds)<=Math.max(1e-12,tolerance*0.01)&&Number.isFinite(r.ter));
      if(!rows.length)continue;
      let best=rows[0];
      for(const r of rows){
        if(r.ter>best.ter)best=r;
      }
      terMaxByVd.push({
        vds,
        terMax:best.ter,
        vgAtMax:best.vg,
        iUp:best.iUp,
        iDown:best.iDown,
        rUp:best.rUp,
        rDown:best.rDown,
        sourceFile:best.sourceFile
      });
    }

    const missing=matrix.reduce((s,row)=>s+row.filter(v=>!Number.isFinite(v)).length,0);
    return {
      detected,
      used:{vmin,vmax,vstep,tolerance,currentFloor},
      targets,vgs,records,matrix,
      // Backward-compatible alias used by older project code.
      terMax:terMaxByVg,
      terMaxByVg,
      terMaxByVd,
      missing
    };
  }

  function interpolateSweepAtV(sweep,targetV){
    const pts=sweep?.points||[];
    if(!pts.length||!Number.isFinite(targetV))return null;
    const xs=pts.map(p=>p.v);
    const j=nearestIndex(xs,targetV);
    const p=pts[j];
    if(!p)return null;

    const exactTol=Math.max(1e-12,Math.abs(sweep.step||0)*0.05);
    if(Math.abs(p.v-targetV)<=exactTol){
      return {v:targetV,i:p.i,index:j,method:'sample'};
    }

    let a=j,b=j;
    if(p.v<targetV){a=j;b=Math.min(pts.length-1,j+1);}
    else {a=Math.max(0,j-1);b=j;}
    const p0=pts[a],p1=pts[b];
    if(!p0||!p1||p0.v===p1.v)return {v:targetV,i:p.i,index:j,method:'nearest'};
    if(targetV<Math.min(p0.v,p1.v)||targetV>Math.max(p0.v,p1.v))return {v:targetV,i:p.i,index:j,method:'nearest'};

    const f=(targetV-p0.v)/(p1.v-p0.v);
    return {v:targetV,i:p0.i+f*(p1.i-p0.i),index:j,method:'linear'};
  }

  function computeTerAtSameV(upSweep,downSweep,v,currentFloor=1e-15){
    if(!upSweep||!downSweep||!Number.isFinite(v)||Math.abs(v)<=1e-15)return null;
    const up=interpolateSweepAtV(upSweep,v);
    const down=interpolateSweepAtV(downSweep,v);
    if(!up||!down)return null;
    if(!Number.isFinite(up.i)||!Number.isFinite(down.i))return null;
    if(Math.abs(up.i)<=currentFloor||Math.abs(down.i)<=currentFloor)return null;

    const rUp=Math.abs(v/up.i),rDown=Math.abs(v/down.i);
    const ter=calculateTerHighLow(rUp,rDown);
    if(!Number.isFinite(ter))return null;
    return {
      v,ter,
      iUp:up.i,iDown:down.i,
      rUp,rDown,
      upMethod:up.method,downMethod:down.method
    };
  }

  function computeResonantTerForLabel(peaks,sweeps,label,visibleSweepIds=null,options={}){
    const vis=visibleSweepIds?new Set(visibleSweepIds):null;
    const currentFloor=Math.max(0,Number(options.currentFloor)||1e-15);

    const accepted=(peaks||[]).filter(p=>
      p.accepted &&
      p.peakLabel===label &&
      (!vis||vis.has(p.sweepId))
    );

    const sweepGroups=new Map();
    for(const sw of sweeps||[]){
      if(vis&&!vis.has(sw.id))continue;
      const key=Number.isFinite(sw.vg)?String(sw.vg):`nan::${sw.datasetPath}`;
      if(!sweepGroups.has(key))sweepGroups.set(key,{vg:sw.vg,up:null,down:null,sweeps:[]});
      const g=sweepGroups.get(key);
      g.sweeps.push(sw);
      if(sw.direction>0)g.up=sw;
      if(sw.direction<0)g.down=sw;
    }

    const byVg=new Map();
    for(const p of accepted){
      const key=Number.isFinite(p.vg)?String(p.vg):`nan::${p.datasetPath}`;
      if(!byVg.has(key))byVg.set(key,[]);
      byVg.get(key).push(p);
    }

    const out=[];
    for(const [key,candidates] of byVg){
      const g=sweepGroups.get(key);
      if(!g?.up||!g?.down)continue;

      // Union of resonance coordinates from BOTH scan directions.
      // A resonance is not omitted merely because one direction has no peak.
      const evaluated=[];
      for(const p of candidates){
        const same=computeTerAtSameV(g.up,g.down,p.v,currentFloor);
        if(!same)continue;
        evaluated.push({
          ...same,
          anchorPeakId:p.id,
          anchorDirection:p.direction,
          anchorLabel:p.peakLabel,
          anchorV:p.v
        });
      }
      if(!evaluated.length)continue;

      // Avoid double counting nearly identical forward/reverse Vpk values.
      evaluated.sort((x,y)=>x.v-y.v);
      const uniq=[];
      const mergeTol=Math.max(
        Math.abs(g.up.step||0),
        Math.abs(g.down.step||0),
        1e-6
      )*1.5;
      for(const e of evaluated){
        const near=uniq.find(q=>Math.abs(q.v-e.v)<=mergeTol);
        if(!near)uniq.push(e);
        else if(e.ter>near.ter)Object.assign(near,e);
      }

      const best=uniq.slice().sort((x,y)=>y.ter-x.ter)[0];
      out.push({
        vg:g.vg,
        label,
        ter:best.ter,
        vdAtTer:best.v,
        forwardI:best.iUp,
        reverseI:best.iDown,
        forwardV:best.v,
        reverseV:best.v,
        rUp:best.rUp,
        rDown:best.rDown,
        anchorPeakId:best.anchorPeakId,
        anchorDirection:best.anchorDirection,
        anchorV:best.anchorV,
        candidateCount:uniq.length,
        forwardPeakId:candidates.find(p=>p.direction>0)?.id||null,
        reversePeakId:candidates.find(p=>p.direction<0)?.id||null,
        candidates:uniq
      });
    }
    return out.sort((x,y)=>{
      if(Number.isFinite(x.vg)&&Number.isFinite(y.vg))return x.vg-y.vg;
      return 0;
    });
  }

  function computeTerForLabel(peaks,sweeps,label,visibleSweepIds=null){
    return computeResonantTerForLabel(peaks,sweeps,label,visibleSweepIds);
  }


  function preset(name){
    // User-facing presets deliberately share one simple "sensitivity" concept.
    // Thresholds are robust-evidence scores, not raw physical units.
    const sets={
      strict:{raw:5.8,snr:5.8,diff:5.2,detrend:5.0,curvature:5.2,dlog:5.0,dvdi:6.0,resistance:6.0},
      balanced:{raw:4.5,snr:4.5,diff:4.0,detrend:3.9,curvature:4.0,dlog:4.0,dvdi:5.0,resistance:5.0},
      sensitive:{raw:3.2,snr:3.2,diff:3.0,detrend:2.8,curvature:3.0,dlog:3.0,dvdi:4.0,resistance:4.2}
    };
    const key=sets[name]?name:'balanced';
    const s=sets[key],out={_preset:key};
    for(const k of Object.keys(s))out[k]={enabled:true,threshold:s[k]};
    // R and dV/dI are corroborating channels by default. They remain enabled
    // in the smart pipeline but cannot by themselves create an accepted peak.
    return out;
  }

  return {ALG_COLORS,ALG_SYMBOLS,IMPORT_ENCODING_LABELS,defaultImportOptions,normalizeImportOptions,inspectDataText,parseFlexibleData,parseVgFromImportHeader,parseCsv,parseVg,buildSweeps,transformSweep,detectPeaks,nearestIndex,peakMetrics,interpolateSweepAtV,computeTerAtSameV,computeResonantTerForLabel,computeTerForLabel,analyzePulseReadData,detectTerVoltageParameters,sweepDirectionsRaw,terVoltageGrid,calculateTerHighLow,processDatasetTer,computeTerMatrix,preset,median,mad,clamp};
});
