(() => {
  DKDSPlugins.define({
    id:'com.example.raw-prominence-detector',
    name:'Raw Prominence Detector Example',
    version:'0.1.0',
    apiVersion:'1.2.0',
    source:'external',
    enabled:false,
    order:500,
    description:'SDK example: raw-sample local maxima with a prominence threshold.',
    capabilities:['analysis.peak-detector']
  }, async ctx => {
    const S=window.DKDSScience;

    ctx.analysis.detectors.register('example-raw-prominence-v1',{
      name:'Example · Raw Prominence',
      shortName:'Example',
      description:'Developer example only. Detects local maxima in |I| and returns raw sampled coordinates.',
      default:false,
      evidence:{
        rawExample:{key:'rawExample',label:'Raw local prominence',glyph:'◇',symbol:'diamond-open'}
      },
      parameterSchema:{
        fields:[
          {id:'minProminence',type:'number',label:'最小相对 prominence',default:0.08,min:0,max:1,step:0.01},
          {id:'minSpacingV',type:'number',label:'最小峰间距 (V)',default:0.05,min:0,step:0.005}
        ]
      },
      defaultSettings(){return {minProminence:0.08,minSpacingV:0.05};},
      detect(sweep,settings={},options={}){
        const pts=sweep?.points||[];
        if(pts.length<3)return [];
        const ys=pts.map(p=>Math.abs(Number(p.i)||0));
        const ymax=Math.max(...ys,1e-30);
        const threshold=Math.max(0,Number(settings.minProminence)||0)*ymax;
        const minSpacing=Math.max(0,Number(settings.minSpacingV)||0);
        const range=options?.range||null;
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
            id:`${sweep.id}::external-example::${Date.now()}::${row.index}`,
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
