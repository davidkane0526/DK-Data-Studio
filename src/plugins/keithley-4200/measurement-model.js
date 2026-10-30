(() => {
  'use strict';
  const KEY='com.dkds.keithley-4200';
  const modes=['iv','transfer','output','timed'];
  const directions=['forward','reverse','roundtrip'];
  const speeds=['fast','normal','quiet'];
  const number=(value,label)=>{const n=Number(value);if(!Number.isFinite(n))throw Error(label+' 必须是有限数值');return n;};
  const range=(value,label,min,max,int=false)=>{const n=number(value,label);if(n<min||n>max||(int&&!Number.isInteger(n)))throw Error(label+' 超出允许的配置范围');return n;};
  function validatePlan(value={}){
    const mode=String(value.mode||'iv'),direction=String(value.direction||'forward'),speed=String(value.speed||'normal');
    if(!modes.includes(mode)||!directions.includes(direction)||!speeds.includes(speed))throw Error('不支持的测试模式、方向或速度');
    const loops=range(value.loops??1,'循环次数',1,1000,true);
    const points=range(value.points??101,'单程点数',2,5001,true);
    const startV=range(value.startV??-1,'起始电压',-200,200);
    const stopV=range(value.stopV??1,'结束电压',-200,200);
    const complianceA=range(value.complianceA??1e-4,'电流限值',1e-12,1);
    const delayMs=range(value.delayMs??0,'点间延迟',0,60000);
    const sourceSmU=range(value.sourceSmU??1,'源 SMU',1,9,true);
    const measureSmU=range(value.measureSmU??2,'测量 SMU',1,9,true);
    const gateSmU=range(value.gateSmU??3,'栅极 SMU',1,9,true);
    const gateBiasV=range(value.gateBiasV??0,'栅压',-200,200);
    if(new Set([sourceSmU,measureSmU,gateSmU]).size!==3)throw Error('源、测量及栅极不能选择相同 SMU 端口');
    const perCycle=mode==='timed'?points:points+(direction==='roundtrip'?points-1:0);
    if(loops*perCycle>250000)throw Error('总采样点超出 250000 点，请减少循环或点数');
    return Object.freeze({schema:'dkds.4200.plan.v1',mode,direction,speed,loops,points,startV,stopV,complianceA,delayMs,sourceSmU,measureSmU,gateSmU,gateBiasV,perCycle,totalPoints:loops*perCycle,hardwareVerified:false,executable:false});
  }
  function sample(plan,index){
    const p=plan,cycle=Math.floor(index/p.perCycle)+1,position=index%p.perCycle;
    let t=position/(p.points-1);
    if(p.direction==='roundtrip'&&position>=p.points)t=(p.perCycle-position-1)/(p.points-1);
    else if(p.direction==='reverse')t=1-t;
    const x=p.mode==='timed'?position:p.startV+(p.stopV-p.startV)*t;
    return {cycle,point:position+1,x,voltageV:p.mode==='timed'?p.startV:x};
  }
  function createDataset(plan,device=null){
    return {schema:'dkds.4200.dataset.v1',createdAt:new Date().toISOString(),source:'simulation',device,plan,columns:['cycle','point','elapsed_s','set_v','read_v','read_a','status'],rows:[],complete:false,stopped:false};
  }
  function append(dataset,sampleRow){
    if(dataset.complete)throw Error('不能写入已结束的数据集');
    const r={cycle:sampleRow.cycle,point:sampleRow.point,elapsed_s:number(sampleRow.elapsed_s,'时间'),set_v:number(sampleRow.set_v,'源电压'),read_v:number(sampleRow.read_v,'测量电压'),read_a:number(sampleRow.read_a,'测量电流'),status:String(sampleRow.status||'ok')};
    dataset.rows.push(r);return r;
  }
  function csv(dataset){
    const q=x=>{if(x===null||x===undefined)return '';const s=String(x);return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
    return [dataset.columns.join(','),...dataset.rows.map(r=>dataset.columns.map(k=>q(r[k])).join(','))].join('\n')+'\n';
  }
  window.DKDSPluginModules.define(KEY,'measurement-model',Object.freeze({validatePlan,sample,createDataset,append,csv,modes,directions,speeds}));
})();