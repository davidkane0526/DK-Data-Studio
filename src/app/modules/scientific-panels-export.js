'use strict';

function configure(){return module.exports;}

async function saveChartImage(plotId,defaultName,format){
  if(typeof window.DKDSCharts?.saveImage!=='function')throw new Error('Scientific Chart export runtime unavailable.');
  return window.DKDSCharts.saveImage(plotId,defaultName,format);
}

module.exports=Object.freeze({configure,saveChartImage});
