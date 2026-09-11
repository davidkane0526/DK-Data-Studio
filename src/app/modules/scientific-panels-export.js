'use strict';
const {$}=require('./context');

function configure(){return module.exports;}

async function saveChartImage(plotId,defaultName,format){
  const data=await window.DKDSCharts.toImage(plotId,{format,width:1500,height:950,scale:format==='png'?2:1});
  if(format==='svg'){
    const raw=data.split(',')[1]||'';
    const content=decodeURIComponent(raw);
    return window.electronAPI.saveText({defaultName:`${defaultName}.svg`,content,filters:[{name:'SVG',extensions:['svg']}],source:'core.scientific-export.image.svg'});
  }
  const base64=data.split(',')[1]||'';
  return window.electronAPI.saveBase64({defaultName:`${defaultName}.png`,base64,filters:[{name:'PNG',extensions:['png']}],source:'core.scientific-export.image.png'});
}

module.exports=Object.freeze({configure,saveChartImage});
