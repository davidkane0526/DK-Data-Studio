(() => {
  DKDSPlugins.define({
  "id": "com.example.raw-prominence-detector",
  "name": "Raw Prominence Detector Example",
  "version": "1.0.0",
  "apiVersion": "1.19.0",
  "pluginType": "algorithm",
  "entry": "plugin.js",
  "styles": [
    "style.css"
  ],
  "platformPresentation": {
    "desktop": {
      "mode": "shared"
    },
    "mobile": {
      "mode": "shared"
    }
  },
  "enabled": false,
  "order": 500,
  "description": "External versioned peak-detector SDK example. Not intended to outperform the built-in robust detector.",
  "capabilities": [
    "analysis.algorithm",
    "analysis.peak-detector"
  ],
  "requiresCore": [
    "analysis.algorithms"
  ],
  "algorithmProvider": true,
  "algorithmCategories": [
    "peak-detector"
  ],
  "algorithmProvides": [
    {
      "category": "peak-detector",
      "id": "example-raw-prominence-v1",
      "version": "1.0.0",
      "title": "Example · Raw Prominence"
    }
  ]
}, async ctx => {
    const parameterSchema={
      fields:[
        {id:'minProminence',type:'number',label:'最小相对 prominence',default:0.08,min:0,max:1,step:0.01},
        {id:'minSpacingV',type:'number',label:'最小峰间距 (V)',default:0.05,min:0,step:0.005}
      ]
    };
    ctx.analysis.algorithms.register('example-raw-prominence-v1',{
      category:'peak-detector',
      version:'1.0.0',
      title:'Example · Raw Prominence',
      description:'Developer example only. Detects local maxima in |I| and returns raw sampled coordinates.',
      default:false,
      inputTypes:['science.iv.raw'],
      outputTypes:['science.resonance.peak-set'],
      parameterSchema,
      metadata:{
        shortName:'Example',
        evidence:{rawExample:{key:'rawExample',label:'Raw local prominence',glyph:'◇',symbol:'diamond-open'}}
      },
      defaultSettings(){return {minProminence:0.08,minSpacingV:0.05};},
      run(sweep,{parameters={},range=null}={}){
        const pts=sweep?.points||[];
        if(pts.length<3)return [];
        const ys=pts.map(p=>Math.abs(Number(p.i)||0));
        const ymax=Math.max(...ys,1e-30);
        const threshold=Math.max(0,Number(parameters.minProminence)||0)*ymax;
        const minSpacing=Math.max(0,Number(parameters.minSpacingV)||0);
        const raw=[];
        for(let j=1;j<pts.length-1;j++){
          const p=pts[j];
          if(range){
            if(Number.isFinite(range.vMin)&&p.v<range.vMin)continue;
            if(Number.isFinite(range.vMax)&&p.v>range.vMax)continue;
            if(Number.isFinite(range.iMin)&&p.i<range.iMin)continue;
            if(Number.isFinite(range.iMax)&&p.i>range.iMax)continue;
          }
          if(!(ys[j]>=ys[j-1]&&ys[j]>ys[j+1]))continue;
          const prominence=Math.max(0,ys[j]-0.5*(ys[j-1]+ys[j+1]));
          if(prominence<threshold)continue;
          raw.push({index:j,prominence,score:prominence/Math.max(threshold,1e-30)});
        }
        raw.sort((a,b)=>b.score-a.score);
        const kept=[];
        for(const row of raw){
          const p=pts[row.index];
          if(kept.some(k=>Math.abs(k.v-p.v)<minSpacing))continue;
          const left=Math.max(0,row.index-1),right=Math.min(pts.length-1,row.index+1);
          kept.push({
            id:`${sweep.id}::external-example::${row.index}`,
            sweepId:sweep.id,datasetPath:sweep.datasetPath,vg:sweep.vg,direction:sweep.direction,
            index:row.index,v:p.v,i:p.i,accepted:true,manual:false,locked:false,
            algorithms:['rawExample'],primaryAlgorithm:'rawExample',
            score:row.score,confidence:Math.min(1,row.score/4),supportCount:1,
            supportChannels:['rawExample'],supportScales:[],prominence:row.prominence,
            widthLeft:pts[left].v,widthRight:pts[right].v,fwhm:Math.abs(pts[right].v-pts[left].v),
            peakOrder:null,peakLabel:'',customColor:null,orderAnchor:false
          });
        }
        return kept.sort((a,b)=>a.v-b.v);
      }
    });
    return {};
  });
})();
