'use strict';

function drawerOverflowCompensation(node){
  if(!node)return 0;
  const box=Math.max(0,Number(node.getBoundingClientRect?.().height)||Number(node.clientHeight)||0);
  const scroll=Math.max(0,Number(node.scrollHeight)||0);
  return Math.max(0,Math.ceil(scroll-box));
}

module.exports=Object.freeze({drawerOverflowCompensation});
