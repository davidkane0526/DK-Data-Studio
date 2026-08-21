'use strict';

function clean(value){return String(value||'').trim();}
function parse(value){
  const text=clean(value).replace(/^v/i,'');
  const m=text.match(/^(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?(?:-([0-9A-Za-z.-]+))?$/i);
  if(!m)return null;
  return {major:Number(m[1]),minor:m[2]===undefined||/[x*]/i.test(m[2])?null:Number(m[2]),patch:m[3]===undefined||/[x*]/i.test(m[3])?null:Number(m[3]),pre:m[4]||''};
}
function compare(a,b){
  const av=parse(a),bv=parse(b);if(!av||!bv)return clean(a).localeCompare(clean(b));
  for(const key of ['major','minor','patch']){const x=av[key]??0,y=bv[key]??0;if(x!==y)return x-y;}
  if(av.pre===bv.pre)return 0;if(!av.pre)return 1;if(!bv.pre)return -1;return av.pre.localeCompare(bv.pre);
}
function tuple(version){const v=parse(version);return v?[v.major,v.minor??0,v.patch??0]:null;}
function exactOrWildcard(version,pattern){
  const v=tuple(version),p=parse(pattern);if(!v||!p)return false;
  if(v[0]!==p.major)return false;if(p.minor!==null&&v[1]!==p.minor)return false;if(p.patch!==null&&v[2]!==p.patch)return false;return true;
}
function comparator(version,token){
  const raw=clean(token);if(!raw||raw==='*'||/^x$/i.test(raw))return true;
  if(raw.startsWith('^')){
    const base=parse(raw.slice(1));if(!base)return false;const low=`${base.major}.${base.minor??0}.${base.patch??0}`;
    let high;if(base.major>0)high=`${base.major+1}.0.0`;else if((base.minor??0)>0)high=`0.${(base.minor??0)+1}.0`;else high=`0.0.${(base.patch??0)+1}`;
    return compare(version,low)>=0&&compare(version,high)<0;
  }
  if(raw.startsWith('~')){
    const base=parse(raw.slice(1));if(!base)return false;const low=`${base.major}.${base.minor??0}.${base.patch??0}`;const high=base.minor===null?`${base.major+1}.0.0`:`${base.major}.${base.minor+1}.0`;
    return compare(version,low)>=0&&compare(version,high)<0;
  }
  const m=raw.match(/^(>=|<=|>|<|=)?\s*(.+)$/);if(!m)return false;const op=m[1]||'';const rhs=m[2];
  if(/[x*]/i.test(rhs)||parse(rhs)?.minor===null||parse(rhs)?.patch===null){if(op)return false;return exactOrWildcard(version,rhs);}
  const c=compare(version,rhs);return op==='>='?c>=0:op==='<='?c<=0:op==='>'?c>0:op==='<'?c<0:c===0;
}
function satisfies(version,range){
  const text=clean(range);if(!text||text==='*')return true;
  return text.split('||').some(group=>group.trim().split(/\s+/).filter(Boolean).every(token=>comparator(version,token)));
}
function validateRange(range){
  const text=clean(range);if(!text||text==='*')return true;
  try{return text.split('||').every(group=>group.trim().split(/\s+/).filter(Boolean).every(token=>{
    if(token==='*'||/^x$/i.test(token))return true;const body=token.replace(/^(?:>=|<=|>|<|=|\^|~)/,'');return !!parse(body);
  }));}catch{return false;}
}
module.exports={parse,compare,satisfies,validateRange};
