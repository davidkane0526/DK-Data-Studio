(function(root,factory){
  'use strict';
  const api=Object.freeze(factory());root.DKDSTransferVthAnalysis=api;const modules=root.DKDSPluginModules;if(modules?.define&&!modules.get?.('com.dkds.transfer-vth-lab','analysis-runtime'))modules.define('com.dkds.transfer-vth-lab','analysis-runtime',api);
})(typeof window!=='undefined'?window:globalThis,function(){

  const finite=v=>Number.isFinite(Number(v));
  const num=(v,f=NaN)=>finite(v)?Number(v):f;
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const defaults=()=>({method:'linear-window',branch:'auto',targetCurrent:4e-10,lowCurrent:2e-10,highCurrent:2e-9,absoluteCurrent:true,logY:true,showAllCurves:true});

  function pointsOfArtifact(artifact){
    if(!artifact)return [];
    if(artifact.kind==='data.table'){
      const columns=Array.isArray(artifact.columns)?artifact.columns:[];
      const x=columns.find(c=>c.role==='x')||columns.find(c=>/^(vg|gate|gate.?voltage|voltage|vd|x)$/i.test(String(c.key||c.name||'')))||columns[0];
      const y=columns.find(c=>c.role==='y')||columns.find(c=>/^(id|drain.?current|current|i|y)$/i.test(String(c.key||c.name||'')))||columns[1];
      if(!x||!y)return [];
      const n=Math.min(x.values?.length||0,y.values?.length||0),out=[];
      for(let i=0;i<n;i++){const xv=num(x.values[i]),yv=num(y.values[i]);if(finite(xv)&&finite(yv))out.push({x:xv,y:yv,index:i});}
      return out;
    }
    const xs=artifact.x||artifact.voltage||artifact.vg,ys=artifact.y||artifact.current||artifact.id;
    if(Array.isArray(xs)&&Array.isArray(ys)){const out=[];for(let i=0;i<Math.min(xs.length,ys.length);i++){const x=num(xs[i]),y=num(ys[i]);if(finite(x)&&finite(y))out.push({x,y,index:i});}return out;}
    return [];
  }

  function findTurn(points){let direction=0,opposite=0;for(let i=1;i<points.length;i++){const dx=points[i].x-points[i-1].x;if(Math.abs(dx)<1e-15)continue;const sign=Math.sign(dx);if(!direction){direction=sign;continue;}if(sign===-direction)opposite++;else opposite=0;if(opposite>=2)return Math.max(1,i-opposite);}return -1;}
  function branches(points){const turn=findTurn(points);if(turn<1||turn>=points.length-2)return[{id:'single',label:'单扫描',points}];return[{id:'first',label:'第一扫描段',points:points.slice(0,turn+1)},{id:'second',label:'第二扫描段',points:points.slice(turn)}];}
  function regress(rows){const n=rows.length;if(n<2)return null;let sx=0,sy=0,sxx=0,sxy=0;for(const p of rows){sx+=p.x;sy+=p.current;sxx+=p.x*p.x;sxy+=p.x*p.current;}const den=n*sxx-sx*sx;if(Math.abs(den)<1e-30)return null;const slope=(n*sxy-sx*sy)/den,intercept=(sy-slope*sx)/n,mean=sy/n;let ssTot=0,ssRes=0;for(const p of rows){const predicted=slope*p.x+intercept;ssTot+=(p.current-mean)**2;ssRes+=(p.current-predicted)**2;}return{slope,intercept,r2:ssTot>0?1-ssRes/ssTot:1,n};}
  function analyzeSegment(segment,p,manualWindow=null){
    const target=num(p.targetCurrent),low=num(p.lowCurrent),high=num(p.highCurrent),useAbs=p.absoluteCurrent!==false;
    if(!finite(target)||(useAbs&&target<=0))return{ok:false,status:'目标电流无效',branch:segment.label};
    let rows=segment.points.map(q=>({...q,current:useAbs?Math.abs(q.y):q.y})).filter(q=>finite(q.current));
    if(Array.isArray(manualWindow)&&manualWindow.length>=2){const a=Math.min(num(manualWindow[0]),num(manualWindow[1])),b=Math.max(num(manualWindow[0]),num(manualWindow[1]));if(finite(a)&&finite(b))rows=rows.filter(q=>q.x>=a&&q.x<=b);}
    if(p.method==='interpolation'){
      for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i],da=a.current-target,db=b.current-target;if(da===0)return{ok:true,method:'interpolation',vth:a.x,n:1,r2:null,branch:segment.label,branchId:segment.id,targetCurrent:target,fitWindow:[a.x,a.x],fitPoints:[a],status:'完成'};if(da*db<=0&&b.current!==a.current){const v=a.x+(target-a.current)*(b.x-a.x)/(b.current-a.current);return{ok:true,method:'interpolation',vth:v,n:2,r2:null,branch:segment.label,branchId:segment.id,targetCurrent:target,fitWindow:[Math.min(a.x,b.x),Math.max(a.x,b.x)],fitPoints:[a,b],status:'完成'};}}
      return{ok:false,status:'目标电流未被扫描段跨越',branch:segment.label,n:rows.length};
    }
    if(!finite(low)||!finite(high)||low>=high)return{ok:false,status:'拟合电流范围无效',branch:segment.label};
    const selected=rows.filter(q=>q.current>=low&&q.current<=high),fit=regress(selected);if(!fit||Math.abs(fit.slope)<1e-30)return{ok:false,status:'拟合区间有效点不足',branch:segment.label,n:selected.length};
    const vth=(target-fit.intercept)/fit.slope;if(!finite(vth))return{ok:false,status:'无法计算 Vth',branch:segment.label,n:selected.length};const xs=selected.map(q=>q.x);
    return{ok:true,method:'linear-window',vth,n:fit.n,r2:fit.r2,slope:fit.slope,intercept:fit.intercept,branch:segment.label,branchId:segment.id,targetCurrent:target,fitWindow:[Math.min(...xs),Math.max(...xs)],fitPoints:selected,status:'完成'};
  }
  function analyzeCurve(curve,p,manualWindow=null){const segs=branches(curve.points);if(p.branch==='all'||segs.length===1)return analyzeSegment({id:'all',label:segs.length===1?'单扫描':'全部数据',points:curve.points},p,manualWindow);if(p.branch==='first')return analyzeSegment(segs[0],p,manualWindow);if(p.branch==='second')return analyzeSegment(segs[1]||segs[0],p,manualWindow);const results=segs.map(seg=>analyzeSegment(seg,p,manualWindow)),valid=results.filter(r=>r.ok);if(!valid.length)return results[0]||{ok:false,status:'无有效扫描段'};if(p.method==='linear-window')valid.sort((a,b)=>(num(b.r2,-Infinity)-num(a.r2,-Infinity))||(b.n-a.n));return valid[0];}

  return {finite,num,clone,defaults,pointsOfArtifact,findTurn,branches,regress,analyzeSegment,analyzeCurve};
});
