'use strict';
const {$, state}=require('./context');
const {diffArtifactRows, pushArtifactDeltaToActivityWindows, setStatus, snapshotArtifactRows}=require('./foundation');
const activeProjectTab=(...args)=>require('./project-tabs-history').activeProjectTab(...args);
const captureActiveProjectTab=(...args)=>require('./project-tabs-history').captureActiveProjectTab(...args);
const projectHistorySnapshot=(...args)=>require('./project-tabs-history').projectHistorySnapshot(...args);
const recordProjectHistory=(...args)=>require('./project-tabs-history').recordProjectHistory(...args);
const dataConsumerTargets=(...args)=>require('./import-workbench').dataConsumerTargets(...args);
const openImportWorkbench=(...args)=>require('./import-workbench').openImportWorkbench(...args);
const refreshOpenAnalysisPage=(...args)=>require('./workspace-super-shell').refreshOpenAnalysisPage(...args);
const renderAll=(...args)=>require('./workspace-super-shell').renderAll(...args);
const systemRedo=(...args)=>require('./floating-docks').systemRedo(...args);
const systemUndo=(...args)=>require('./floating-docks').systemUndo(...args);
const publishCapabilitySnapshot=(...args)=>require('./dedicated-plugin-windows').publishCapabilitySnapshot(...args);

async function importFiles(){
  openImportWorkbench();
}

function syncDatasetArtifacts({emit=true}={}){
  if(!state.artifactStore)state.artifactStore=window.DKDSData.createStore();
  window.DKDSData.syncLegacyDatasetArtifacts(state.artifactStore,state.datasets);
  const tab=activeProjectTab();if(tab)tab.artifactStore=state.artifactStore;
  if(emit)window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{artifacts:state.artifactStore.list()});
  return state.artifactStore;
}

function artifactHostApi(){
  const emit=payload=>{
    window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',payload);
    const collect=(entry,out={upserts:[],removedIds:[]})=>{
      if(!entry)return out;
      if(entry.type==='batch'){for(const child of entry.events||entry.changes||[])collect(child,out);return out;}
      if((entry.type==='add'||entry.type==='upsert'||entry.type==='publish')&&entry.artifact?.id)out.upserts.push(entry.artifact);
      else if(entry.type==='remove'&&entry.id)out.removedIds.push(String(entry.id));
      else if(entry.type==='clear')out.removedIds.push(...(entry.ids||[]).map(String));
      return out;
    };
    const delta=collect(payload);
    pushArtifactDeltaToActivityWindows(delta,`artifact-${String(payload?.type||'change')}`);
  };
  const api={
    list:options=>state.artifactStore?.list?.(options)||[],
    revision:kind=>state.artifactStore?.revision?.(kind)||0,
    get:id=>state.artifactStore?.get?.(id)||null,
    parents:id=>state.artifactStore?.parents?.(id)||[],
    children:id=>state.artifactStore?.children?.(id)||[],
    lineage:id=>state.artifactStore?.lineage?.(id)||null,
    add:(artifact,options)=>{const id=state.artifactStore.add(artifact,options);emit({type:'add',artifact:state.artifactStore.get(id)});return id;},
    upsert:artifact=>{const id=state.artifactStore.upsert(artifact);emit({type:'upsert',artifact:state.artifactStore.get(id)});return id;},
    publish:(artifact,options={})=>{const result=state.artifactStore.publish?.(artifact,options)||{id:state.artifactStore.upsert(artifact),changed:true};if(result.changed)emit({type:'publish',artifact:state.artifactStore.get(result.id)});return result;},
    batch:fn=>{const events=[];const batchApi={...api,add:(artifact,options)=>{const id=state.artifactStore.add(artifact,options);events.push({type:'add',artifact:state.artifactStore.get(id)});return id;},upsert:artifact=>{const id=state.artifactStore.upsert(artifact);events.push({type:'upsert',artifact:state.artifactStore.get(id)});return id;},publish:(artifact,options={})=>{const result=state.artifactStore.publish?.(artifact,options)||{id:state.artifactStore.upsert(artifact),changed:true};if(result.changed)events.push({type:'publish',artifact:state.artifactStore.get(result.id)});return result;},remove:id=>{const ok=state.artifactStore.remove(id);if(ok)events.push({type:'remove',id});return ok;}};const result=state.artifactStore.batch?state.artifactStore.batch(()=>fn?.(batchApi)):fn?.(batchApi);if(events.length)emit({type:'batch',events});return result;},
    remove:id=>{const ok=state.artifactStore.remove(id);if(ok)emit({type:'remove',id});return ok;},
    syncLegacy:()=>syncDatasetArtifacts(),
    serialize:()=>window.DKDSData.serializeStore(state.artifactStore,{includeTransient:false})
  };return api;
}

function commitOwnerArtifactMutation(beforeRows,type='project-history'){
  const delta=diffArtifactRows(beforeRows,snapshotArtifactRows());
  if(delta.upserts.length||delta.removedIds.length){
    window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type,artifactDelta:delta,artifacts:snapshotArtifactRows()});
    pushArtifactDeltaToActivityWindows(delta,type);
  }
  const tab=activeProjectTab();if(tab)tab.artifactStore=state.artifactStore;
  void publishCapabilitySnapshot();renderAll();refreshOpenAnalysisPage();captureActiveProjectTab();
  return delta;
}
function applyArtifactHistoryPatch(patch={},type='history-artifact'){
  const before=snapshotArtifactRows();
  const upserts=Array.isArray(patch.upserts)?patch.upserts:[],removedIds=Array.isArray(patch.removedIds)?patch.removedIds:[];
  state.artifactStore?.batch?.(api=>{for(const id of removedIds)api.remove?.(String(id));for(const artifact of upserts)if(artifact?.id)api.upsert?.(window.DKDSData.deepClone(artifact));});
  commitOwnerArtifactMutation(before,type);return true;
}
function snapshotProjectDataState(){return {datasets:window.DKDSData.deepClone(state.datasets||[]),artifacts:snapshotArtifactRows().map(window.DKDSData.deepClone)};}
function restoreProjectDataState(snapshot,type='history-data-restore'){
  const before=snapshotArtifactRows();
  state.datasets=window.DKDSData.deepClone(snapshot?.datasets||[]);
  state.artifactStore=window.DKDSData.createStore((snapshot?.artifacts||[]).map(window.DKDSData.deepClone));
  syncDatasetArtifacts({emit:false});
  commitOwnerArtifactMutation(before,type);return true;
}
function projectHistoryHostApi(){
  return {
    state:()=>projectHistorySnapshot(),
    undo:()=>systemUndo(),
    redo:()=>systemRedo(),
    commitArtifactMutation(payload={}){
      const label=String(payload.label||'数据对象修改'),beforePatch=payload.before&&typeof payload.before==='object'?payload.before:{upserts:[],removedIds:[]},afterPatch=payload.after&&typeof payload.after==='object'?payload.after:{upserts:[],removedIds:[]};
      applyArtifactHistoryPatch(afterPatch,'history-artifact-commit');
      recordProjectHistory({label,metadata:{kind:'artifact'},undo:()=>applyArtifactHistoryPatch(beforePatch,'history-artifact-undo'),redo:()=>applyArtifactHistoryPatch(afterPatch,'history-artifact-redo')});
      return {updated:true,state:projectHistorySnapshot()};
    }
  };
}

function dataSourceHostApi(){
  const assignmentsFor=value=>{
    if(value?.metadata&&Object.prototype.hasOwnProperty.call(value.metadata,'dataAssignments'))return Array.isArray(value.metadata.dataAssignments)?value.metadata.dataAssignments.map(String).filter(Boolean):[];
    return Object.prototype.hasOwnProperty.call(value||{},'assignments')?(Array.isArray(value.assignments)?value.assignments.map(String).filter(Boolean):[]):['*'];
  };
  const matchesConsumer=(value,consumer)=>{const id=String(consumer||'').trim();if(!id)return true;const rows=assignmentsFor(value);return rows.includes('*')||rows.includes(id);};
  const sameStringSet=(a,b)=>{const left=[...new Set((a||[]).map(String))].sort(),right=[...new Set((b||[]).map(String))].sort();return left.length===right.length&&left.every((value,index)=>value===right[index]);};
  const genericImports=()=> (state.artifactStore?.list?.({includeTransient:true})||[]).filter(a=>a?.metadata?.importedSource===true&&a?.metadata?.adapter!=='legacy-dataset');
  const legacyDescriptors=()=>state.datasets.map(dataset=>({
    path:String(dataset?.path||dataset?.name||''),
    name:String(dataset?.name||dataset?.path||'data'),
    sourcePath:String(dataset?.sourcePath||dataset?.path||''),
    sourceName:String(dataset?.sourceName||dataset?.name||''),
    vg:Number.isFinite(Number(dataset?.vg))?Number(dataset.vg):null,
    points:Array.isArray(dataset?.points)?dataset.points.length:0,
    excluded:dataset?.excluded===true,
    assignments:assignmentsFor(dataset),
    semanticType:'science.transport.iv',
    kind:'data.table',
    importerId:'flexible-text',
    artifactId:window.DKDSData?.stableId?.('legacy-table',String(dataset?.path||dataset?.name||'dataset'))||''
  }));
  const genericDescriptors=()=>genericImports().map(artifact=>({
    path:String(artifact.id),name:String(artifact.name||artifact.id),sourcePath:String(artifact?.source?.path||''),sourceName:String(artifact?.source?.name||artifact.name||''),
    vg:null,points:Number(artifact?.rowCount||artifact?.length)||0,excluded:artifact?.metadata?.excluded===true||artifact?.metadata?.sourceExcluded===true,
    assignments:assignmentsFor(artifact),semanticType:String(artifact?.semanticType||artifact?.metadata?.dataType||''),kind:String(artifact.kind||''),
    importerId:String(artifact?.metadata?.importerId||''),artifactId:String(artifact.id)
  }));
  const list=(options={})=>[...legacyDescriptors(),...genericDescriptors()].filter(row=>matchesConsumer(row,options?.consumer||options?.pluginId));
  const locateLegacy=ref=>{const row=ref&&typeof ref==='object'?ref:{path:ref};if(row?.artifactId)return null;const path=String(row?.path||''),sourcePath=String(row?.sourcePath||'');return state.datasets.find(dataset=>(path&&String(dataset?.path||dataset?.name||'')===path)||(sourcePath&&String(dataset?.sourcePath||'')===sourcePath))||null;};
  const locateGeneric=ref=>{const row=ref&&typeof ref==='object'?ref:{path:ref};const id=String(row?.artifactId||row?.path||''),sourcePath=String(row?.sourcePath||'');return genericImports().filter(a=>(id&&String(a.id)===id)||(sourcePath&&String(a?.source?.path||'')===sourcePath)||(id&&String(a?.source?.path||'')===id));};
  const commitLegacy=(type,dataset)=>{
    syncDatasetArtifacts({emit:false});
    const artifactId=window.DKDSData?.stableId?.('legacy-table',String(dataset?.path||dataset?.name||'dataset'))||'';
    const changed=artifactId?state.artifactStore?.get?.(artifactId):null;
    const delta={upserts:changed?[changed]:[],removedIds:[]};
    window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type,sourcePath:String(dataset?.sourcePath||dataset?.path||''),artifactDelta:delta,artifacts:state.artifactStore?.list?.({includeTransient:true})||[]});
    pushArtifactDeltaToActivityWindows(delta,type);
    void publishCapabilitySnapshot();
    renderAll();refreshOpenAnalysisPage();captureActiveProjectTab();return list();
  };
  const commitGeneric=(type,artifacts=[])=>{
    const changed=(artifacts||[]).map(row=>state.artifactStore?.get?.(row?.id)).filter(Boolean);
    const delta={upserts:changed,removedIds:[]};
    window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type,sourcePath:String(changed[0]?.source?.path||artifacts[0]?.source?.path||''),artifactDelta:delta,artifacts:state.artifactStore?.list?.({includeTransient:true})||[]});
    pushArtifactDeltaToActivityWindows(delta,type);
    void publishCapabilitySnapshot();
    renderAll();refreshOpenAnalysisPage();captureActiveProjectTab();return list();
  };
  return {
    list,
    targets:()=>dataConsumerTargets(),
    setAssignments(ref,pluginIds=[]){
      const ids=[...new Set((Array.isArray(pluginIds)?pluginIds:[]).map(String).map(x=>x.trim()).filter(Boolean))],historyRef=window.DKDSData.deepClone(ref);
      const dataset=locateLegacy(ref);
      if(dataset){const previous=assignmentsFor(dataset);if(sameStringSet(previous,ids))return {updated:false,assignments:[...previous],sources:list()};dataset.assignments=ids;commitLegacy('source-assignments',dataset);recordProjectHistory({label:`数据用途 · ${dataset.name||dataset.path}`,metadata:{kind:'data-source',operation:'assignments'},undo:()=>dataSourceHostApi().setAssignments(historyRef,previous),redo:()=>dataSourceHostApi().setAssignments(historyRef,ids)});setStatus(ids.length?`已更新数据用途：${dataset.name||dataset.path}`:`已设为仅数据中心：${dataset.name||dataset.path}`);return {updated:true,assignments:[...ids],sources:list()};}
      const artifacts=locateGeneric(ref);if(!artifacts.length)return {updated:false,sources:list()};const previous=assignmentsFor(artifacts[0]);if(sameStringSet(previous,ids))return {updated:false,assignments:[...previous],sources:list()};
      state.artifactStore?.batch?.(api=>{for(const artifact of artifacts)api.upsert?.({...artifact,metadata:{...(artifact.metadata||{}),dataAssignments:[...ids]}});});
      commitGeneric('source-assignments',artifacts);recordProjectHistory({label:`数据用途 · ${artifacts[0].name||artifacts[0].id}`,metadata:{kind:'data-source',operation:'assignments'},undo:()=>dataSourceHostApi().setAssignments(historyRef,previous),redo:()=>dataSourceHostApi().setAssignments(historyRef,ids)});setStatus(ids.length?`已更新数据用途：${artifacts[0].name||artifacts[0].id}`:`已设为仅数据中心：${artifacts[0].name||artifacts[0].id}`);return {updated:true,assignments:[...ids],sources:list()};
    },
    rename(ref,label){
      const name=String(label||'').trim();if(!name)return {updated:false,sources:list()};const historyRef=window.DKDSData.deepClone(ref),dataset=locateLegacy(ref);
      if(dataset){const previous=String(dataset.name||dataset.path||'');if(previous===name)return {updated:false,sources:list()};dataset.name=name;commitLegacy('source-rename',dataset);recordProjectHistory({label:`修改数据标签 · ${name}`,metadata:{kind:'data-source',operation:'rename'},undo:()=>dataSourceHostApi().rename(historyRef,previous),redo:()=>dataSourceHostApi().rename(historyRef,name)});setStatus(`源数据标签已修改为：${name}`);return {updated:true,sources:list()};}
      const artifacts=locateGeneric(ref);if(!artifacts.length)return {updated:false,sources:list()};const previous=String(artifacts[0].name||artifacts[0].id);if(previous===name)return {updated:false,sources:list()};state.artifactStore?.batch?.(api=>artifacts.forEach((artifact,index)=>api.upsert?.({...artifact,name:index?artifact.name:name})));commitGeneric('source-rename',artifacts);recordProjectHistory({label:`修改数据标签 · ${name}`,metadata:{kind:'data-source',operation:'rename'},undo:()=>dataSourceHostApi().rename(historyRef,previous),redo:()=>dataSourceHostApi().rename(historyRef,name)});setStatus(`源数据标签已修改为：${name}`);return {updated:true,sources:list()};
    },
    setExcluded(ref,value=true){
      const historyRef=window.DKDSData.deepClone(ref),dataset=locateLegacy(ref);if(dataset){const previous=dataset.excluded===true;if(previous===!!value)return {updated:false,excluded:previous,sources:list()};dataset.excluded=!!value;commitLegacy('source-exclude',dataset);recordProjectHistory({label:`${value?'排除':'恢复'}数据 · ${dataset.name||dataset.path}`,metadata:{kind:'data-source',operation:'exclude'},undo:()=>dataSourceHostApi().setExcluded(historyRef,previous),redo:()=>dataSourceHostApi().setExcluded(historyRef,!!value)});setStatus(`${dataset.excluded?'已排除':'已恢复'}源数据：${dataset.name||dataset.path}`);return {updated:true,excluded:dataset.excluded,sources:list()};}
      const artifacts=locateGeneric(ref);if(!artifacts.length)return {updated:false,sources:list()};const previous=artifacts[0]?.metadata?.excluded===true||artifacts[0]?.metadata?.sourceExcluded===true;if(previous===!!value)return {updated:false,excluded:previous,sources:list()};state.artifactStore?.batch?.(api=>artifacts.forEach(artifact=>api.upsert?.({...artifact,metadata:{...(artifact.metadata||{}),excluded:!!value}})));commitGeneric('source-exclude',artifacts);recordProjectHistory({label:`${value?'排除':'恢复'}数据 · ${artifacts[0].name||artifacts[0].id}`,metadata:{kind:'data-source',operation:'exclude'},undo:()=>dataSourceHostApi().setExcluded(historyRef,previous),redo:()=>dataSourceHostApi().setExcluded(historyRef,!!value)});setStatus(`${value?'已排除':'已恢复'}源数据：${artifacts[0].name||artifacts[0].id}`);return {updated:true,excluded:!!value,sources:list()};
    },
    remove(refs){
      const requested=Array.isArray(refs)?refs:[refs],historyBefore=snapshotProjectDataState();
      const outcome=window.DKDSData?.removeLegacyDatasets?.(state.artifactStore,state.datasets,requested)||{datasets:state.datasets,removed:[],removedArtifactIds:[]};
      state.datasets=outcome.datasets||[];
      const genericRoots=[...new Map(requested.flatMap(ref=>locateGeneric(ref)).map(a=>[a.id,a])).values()];
      const genericRemoveIds=new Set();for(const root of genericRoots){for(const child of (state.artifactStore?.lineage?.(root.id)?.descendants||[]))if(child?.id)genericRemoveIds.add(String(child.id));if(root?.id)genericRemoveIds.add(String(root.id));}
      if(genericRemoveIds.size)state.artifactStore?.batch?.(api=>{for(const id of [...genericRemoveIds].reverse())api.remove?.(id);});
      const tab=activeProjectTab();if(tab)tab.artifactStore=state.artifactStore;
      const removedCount=(outcome.removed?.length||0)+genericRoots.length;
      if(removedCount){const removedArtifactIds=[...(outcome.removedArtifactIds||[]),...genericRemoveIds].map(String);const delta={upserts:[],removedIds:removedArtifactIds};window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type:'source-remove',removed:[...(outcome.removed||[]).map(row=>row.path),...genericRoots.map(row=>row.id)],removedArtifactIds,artifactDelta:delta,artifacts:state.artifactStore?.list?.({includeTransient:true})||[]});pushArtifactDeltaToActivityWindows(delta,'source-remove');void publishCapabilitySnapshot();renderAll();refreshOpenAnalysisPage();captureActiveProjectTab();const historyAfter=snapshotProjectDataState();recordProjectHistory({label:`删除 ${removedCount} 个源数据对象`,metadata:{kind:'data-source',operation:'remove'},undo:()=>restoreProjectDataState(historyBefore,'history-source-remove-undo'),redo:()=>restoreProjectDataState(historyAfter,'history-source-remove-redo')});setStatus(`已移除 ${removedCount} 个源数据对象。`);}
      return {removed:[...(outcome.removed||[]).map(row=>({path:row.path,name:row.name,sourcePath:row.sourcePath||row.path})),...genericRoots.map(a=>({path:a.id,name:a.name,sourcePath:a?.source?.path||''}))],removedArtifactIds:[...(outcome.removedArtifactIds||[]),...genericRemoveIds],sources:list()};
    }
  };
}

function pluginUiContext(){
  return {
    activityId:window.DKDSPlugins?.activities?.active?.()||null,
    state,
    projectPath:state.projectPath,
    datasets:state.datasets,
    artifacts:state.artifactStore,
    platform:window.DKDSPlatform?.profile||null
  };
}

module.exports=Object.freeze({importFiles, syncDatasetArtifacts, artifactHostApi, commitOwnerArtifactMutation, applyArtifactHistoryPatch, snapshotProjectDataState, restoreProjectDataState, projectHistoryHostApi, dataSourceHostApi, pluginUiContext});
