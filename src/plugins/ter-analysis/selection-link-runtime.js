(() => {
  // TER-specific projection between canonical source-scan references and the
  // plugin's local point/highlight state. Cross-view transport remains owned
  // by Core InteractionRuntime; this module never observes global events.
  function create({sourceScanReference,nearlyEqual,selectionReferences=null}){
    const close=typeof nearlyEqual==='function'?nearlyEqual:(a,b)=>Number(a)===Number(b);
    const resolve=typeof sourceScanReference==='function'?sourceScanReference:()=>null;
    const sameRef=(a,b)=>!!a&&!!b&&String(a.artifactId||'')===String(b.artifactId||'')&&String(a.seriesId||'')===String(b.seriesId||'');
    const finite=value=>{const n=Number(value);return Number.isFinite(n)?n:null;};
    function sourceScanEntity(selection){
      if(!selection)return null;const preferred=Number(selection.scanDirection)<0?-1:1,ref=resolve(selection.vg,selection.sourceFile,preferred)||resolve(selection.vg,selection.sourceFile,-preferred);if(!ref?.artifactId||!ref?.seriesId)return null;let id='';try{id=String(selectionReferences?.identity?.(ref)||'');}catch{}if(!id)id=`${String(ref.artifactId)}::${String(ref.seriesId)}`;return {id,type:'data.sweep',ref,metadata:{selectionRole:'source-scan',vg:Number(selection.vg),sourceFile:String(selection.sourceFile||'')}};
    }
    function sourceScans(result){
      const records=Array.isArray(result?.records)?result.records:[];
      return (result?.vgs||[]).map(vg=>{
        const row=records.find(item=>close(item?.vg,vg))||null;
        const source=String(row?.sourceFile||'');
        const ref=resolve(vg,source,1)||resolve(vg,source,-1);
        return ref?{ref,type:'data.sweep',role:'source-scan',meta:{label:`Vg=${Number(vg).toPrecision(6)} V${source?` · ${source}`:''}`}}:null;
      });
    }
    function matchSelection(snapshot,groups=[]){
      const focus=snapshot?.focus||snapshot?.items?.at?.(-1)||null;
      const ref=focus?.ref||null;
      if(String(focus?.type||'')!=='data.sweep'||!ref?.artifactId||!ref?.seriesId)return null;
      for(const group of groups||[]){
        for(const direction of [1,-1]){
          const candidate=resolve(group?.vg,group?.sourceFile,direction);
          if(sameRef(ref,candidate))return {group,direction,ref:candidate};
        }
      }
      return null;
    }
    function resistancePoint(event,result,groups=[]){
      const point=event?.points?.[0]||null;
      const curve=Number(point?.curveNumber);
      if(!Number.isInteger(curve)||curve<0)return null;
      const group=groups[Math.floor(curve/2)]||null;if(!group)return null;
      const vds=finite(point?.x);if(vds===null)return null;
      let rows=(group.rows||[]).filter(row=>close(row?.vds,vds));
      if(group.sourceFile){const exact=rows.filter(row=>String(row?.sourceFile||'')===String(group.sourceFile));if(exact.length)rows=exact;}
      if(!rows.length){
        rows=(result?.records||[]).filter(row=>close(row?.vg,group.vg)&&close(row?.vds,vds));
        if(group.sourceFile){const exact=rows.filter(row=>String(row?.sourceFile||'')===String(group.sourceFile));if(exact.length)rows=exact;}
      }
      const row=rows[0]||null;
      return {vg:Number(group.vg),vds,rUp:row?.rUp,rDown:row?.rDown,ter:row?.ter,sourceFile:String(row?.sourceFile||group.sourceFile||''),scanDirection:curve%2===0?1:-1,id:`rv:${String(group.sourceFile||'')}:${Number(group.vg)}:${vds}`,selectionType:'ter.rv-point'};
    }
    return Object.freeze({sourceScans,sourceScanEntity,matchSelection,resistancePoint});
  }
  window.DKDSPluginModules.define('builtin.ter-analysis','selection-link-runtime',Object.freeze({create}));
})();
