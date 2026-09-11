(() => {
  function create({ctx,controller,visibleArtifacts}={}){
    if(!ctx?.data?.artifacts||!controller||typeof visibleArtifacts!=='function')throw new Error('Data Center artifact selection requires artifact store, controller and visibleArtifacts.');
    const selectionItem=a=>({type:'data-center.artifact',id:String(a?.id||''),value:{id:a?.id,kind:a?.kind,name:a?.name}});
    let anchorId='';
    const selectedIds=()=>new Set((controller.getSelection?.()?.items||[]).filter(row=>row?.type==='data-center.artifact').map(row=>String(row.id||'')).filter(Boolean));
    const selectedArtifacts=()=>{const selected=selectedIds();return ctx.data.artifacts.listMetadata({includeTransient:true}).filter(a=>selected.has(String(a.id)));};
    const contextArtifacts=target=>{if(!target)return [];const selected=selectedIds();if(selected.has(String(target.id))){const rows=selectedArtifacts();if(rows.length)return rows;}return [target];};
    const normalizeRows=rows=>{const input=Array.isArray(rows)?rows:[rows],out=[],seen=new Set();for(const a of input){const id=String(a?.id||'');if(!id||seen.has(id))continue;seen.add(id);out.push(a);}return out;};
    const selectRows=(rows,{focusId='',source='data-center-multi'}={})=>{const unique=normalizeRows(rows);if(focusId){const idx=unique.findIndex(a=>String(a.id)===String(focusId));if(idx>=0)unique.push(unique.splice(idx,1)[0]);}controller.selection?.selectMany?.(unique.map(selectionItem),{source});return unique;};
    const selectAll=({focusId=''}={})=>{const rows=visibleArtifacts();selectRows(rows,{focusId,source:'data-center-select-all'});anchorId=String(focusId||rows.at(-1)?.id||'');return rows;};
    const invert=()=>{const rows=visibleArtifacts(),selected=selectedIds(),next=rows.filter(a=>!selected.has(String(a.id)));selectRows(next,{focusId:next.at(-1)?.id||'',source:'data-center-invert'});if(next.length)anchorId=String(next.at(-1).id);return next;};
    const clear=()=>{controller.clearSelection?.({source:'data-center-clear'});anchorId='';return true;};
    const activate=(a,rows,event={})=>{const id=String(a?.id||'');if(!id)return false;const additive=!!(event.ctrlKey||event.metaKey),range=!!event.shiftKey;if(range){const anchorIndex=rows.findIndex(row=>String(row.id)===anchorId),index=rows.findIndex(row=>String(row.id)===id);if(anchorIndex>=0&&index>=0){const lo=Math.min(anchorIndex,index),hi=Math.max(anchorIndex,index),span=rows.slice(lo,hi+1);if(additive){const selected=selectedIds();selectRows(rows.filter(row=>selected.has(String(row.id))||span.some(item=>String(item.id)===String(row.id))),{focusId:id,source:'data-center-range-add'});}else selectRows(span,{focusId:id,source:'data-center-range'});}else controller.select?.({id:a.id,kind:a.kind,name:a.name},{source:'data-center-artifact'});}else if(additive){controller.selection?.select?.(selectionItem(a),{toggle:true,additive:true,source:'data-center-toggle'});anchorId=id;}else{controller.select?.({id:a.id,kind:a.kind,name:a.name},{source:'data-center-artifact'});anchorId=id;}return true;};
    const focusContext=a=>{if(!a)return false;const selected=selectedIds();if(selected.has(String(a.id)))controller.selection?.select?.(selectionItem(a),{additive:true,source:'data-center-context-focus'});else{controller.select?.({id:a.id,kind:a.kind,name:a.name},{source:'data-center-context'});anchorId=String(a.id);}return true;};
    const bindPaneShortcuts=({dom,page,pane,list,onSelectAll,onInvert,onClear}={})=>{
      if(!dom||!page||!pane)return false;let pointerInside=false;
      dom.on(pane,'pointerenter',()=>{pointerInside=true;});dom.on(pane,'pointerleave',()=>{pointerInside=false;});
      dom.on(pane,'selectstart',event=>{if(event.target?.closest?.('input,select,textarea,[contenteditable="true"]'))return;event.preventDefault();});
      dom.on(page,'keydown',event=>{if(event.target?.closest?.('input,select,textarea,[contenteditable="true"]'))return;const inPane=pointerInside||pane.contains?.(event.target);if(!inPane)return;const mod=event.ctrlKey||event.metaKey,key=String(event.key).toLowerCase();if(mod&&key==='a'){event.preventDefault();event.stopPropagation();onSelectAll?.();list?.focus?.({preventScroll:true});return;}if(mod&&key==='i'){event.preventDefault();event.stopPropagation();onInvert?.();return;}if(event.key==='Escape'){event.preventDefault();onClear?.();}},{capture:true});return true;
    };
    return Object.freeze({item:selectionItem,selectedIds,selectedArtifacts,contextArtifacts,normalizeRows,selectRows,selectAll,invert,clear,activate,focusContext,bindPaneShortcuts,anchor:()=>anchorId,setAnchor:value=>{anchorId=String(value||'');return anchorId;}});
  }
  window.DKDSPluginModules.define('builtin.data-center','artifact-selection',Object.freeze({create}));
})();
