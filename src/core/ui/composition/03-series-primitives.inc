
  const SERIES_PALETTE=Object.freeze(['#3366cc','#dc3912','#109618','#ff9900','#0099c6','#990099','#66aa00','#dd4477','#22aa99','#994499','#316395','#b82e2e']);
  function compactSeriesLabel(value=''){
    let text=String(value??'').trim();if(!text)return '';
    text=text.replace(/\\/g,'/');
    if(text.includes('/')){const parts=text.split('/').filter(Boolean);text=parts.at(-1)||text;}
    text=text.replace(/\.(csv|txt|dat|tsv|xlsx?|json)$/i,'');
    text=text.replace(/^file:\/\//i,'').trim();
    return text.length>42?`${text.slice(0,19)}…${text.slice(-19)}`:text;
  }
