'use strict';

function versionParts(value){
  const match=String(value||'0.0.0').trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if(!match)return {major:0,minor:0,patch:0,pre:''};
  return {major:Number(match[1]),minor:Number(match[2]),patch:Number(match[3]),pre:String(match[4]||'')};
}
function compareVersions(a,b){
  const left=versionParts(a),right=versionParts(b);
  for(const key of ['major','minor','patch'])if(left[key]!==right[key])return left[key]>right[key]?1:-1;
  if(left.pre===right.pre)return 0;
  if(!left.pre)return 1;
  if(!right.pre)return -1;
  const la=left.pre.split('.'),lb=right.pre.split('.'),n=Math.max(la.length,lb.length);
  for(let i=0;i<n;i++){
    if(la[i]===undefined)return -1;if(lb[i]===undefined)return 1;
    const an=/^\d+$/.test(la[i]),bn=/^\d+$/.test(lb[i]);
    if(an&&bn){const av=Number(la[i]),bv=Number(lb[i]);if(av!==bv)return av>bv?1:-1;continue;}
    if(an!==bn)return an?-1:1;
    if(la[i]!==lb[i])return la[i]>lb[i]?1:-1;
  }
  return 0;
}
function isNewerVersion(candidateVersion,currentVersion){return compareVersions(candidateVersion,currentVersion)>0;}
function isNewerThanBuiltin(pkg,builtinVersion){return isNewerVersion(pkg?.manifest?.version,builtinVersion);}

module.exports={compareVersions,isNewerVersion,isNewerThanBuiltin};
