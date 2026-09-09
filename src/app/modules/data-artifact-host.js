'use strict';
const {$, state}=require('./context');
const {diffArtifactRows, pushArtifactDeltaToActivityWindows, setStatus, snapshotArtifactRows}=require('./foundation');
let deps=null;
function configure(next){deps=next;return module.exports;}
const activeProjectTab=(...args)=>deps.projectTabs.activeProjectTab(...args);
const captureActiveProjectTab=(...args)=>deps.projectTabs.captureActiveProjectTab(...args);
const projectHistorySnapshot=(...args)=>deps.projectTabs.projectHistorySnapshot(...args);
const recordProjectHistory=(...args)=>deps.projectTabs.recordProjectHistory(...args);
const dataConsumerTargets=(...args)=>deps.imports.dataConsumerTargets(...args);
const openImportWorkbench=(...args)=>deps.imports.openImportWorkbench(...args);
const refreshOpenAnalysisPage=(...args)=>deps.workspace.refreshOpenAnalysisPage(...args);
const renderAll=(...args)=>deps.workspace.renderAll(...args);
const systemRedo=(...args)=>deps.docks.systemRedo(...args);
const systemUndo=(...args)=>deps.docks.systemUndo(...args);
const publishCapabilitySnapshot=(...args)=>deps.windows.publishCapabilitySnapshot(...args);

async function importFiles(){
  openImportWorkbench();
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
    const delta=collect(payload);pushArtifactDeltaToActivityWindows(delta,`artifact-${String(payload?.type||'change')}`);
  };
  const api={
    list:options=>state.artifactStore?.list?.(options)||[],revision:kind=>state.artifactStore?.revision?.(kind)||0,get:id=>state.artifactStore?.get?.(id)||null,
    parents:id=>state.artifactStore?.parents?.(id)||[],children:id=>state.artifactStore?.children?.(id)||[],lineage:id=>state.artifactStore?.lineage?.(id)||null,
    add:(artifact,options)=>{const id=state.artifactStore.add(artifact,options);emit({type:'add',artifact:state.artifactStore.get(id)});return id;},
    upsert:artifact=>{const id=state.artifactStore.upsert(artifact);emit({type:'upsert',artifact:state.artifactStore.get(id)});return id;},
    publish:(artifact,options={})=>{const result=state.artifactStore.publish?.(artifact,options)||{id:state.artifactStore.upsert(artifact),changed:true};if(result.changed)emit({type:'publish',artifact:state.artifactStore.get(result.id)});return result;},
    batch:fn=>{const events=[];const batchApi={...api,add:(artifact,options)=>{const id=state.artifactStore.add(artifact,options);events.push({type:'add',artifact:state.artifactStore.get(id)});return id;},upsert:artifact=>{const id=state.artifactStore.upsert(artifact);events.push({type:'upsert',artifact:state.artifactStore.get(id)});return id;},publish:(artifact,options={})=>{const result=state.artifactStore.publish?.(artifact,options)||{id:state.artifactStore.upsert(artifact),changed:true};if(result.changed)events.push({type:'publish',artifact:state.artifactStore.get(result.id)});return result;},remove:id=>{const ok=state.artifactStore.remove(id);if(ok)events.push({type:'remove',id});return ok;}};const result=state.artifactStore.batch?state.artifactStore.batch(()=>fn?.(batchApi)):fn?.(batchApi);if(events.length)emit({type:'batch',events});return result;},
    remove:id=>{const ok=state.artifactStore.remove(id);if(ok)emit({type:'remove',id});return ok;},serialize:()=>window.DKDSData.serializeStore(state.artifactStore,{includeTransient:false})
  };return api;
}

function commitOwnerArtifactMutation(beforeRows,type='project-history'){
  const delta=diffArtifactRows(beforeRows,snapshotArtifactRows());
  if(delta.upserts.length||delta.removedIds.length){window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type,artifactDelta:delta,artifacts:snapshotArtifactRows()});pushArtifactDeltaToActivityWindows(delta,type);}
  const tab=activeProjectTab();if(tab)tab.artifactStore=state.artifactStore;void publishCapabilitySnapshot();renderAll();refreshOpenAnalysisPage();captureActiveProjectTab();return delta;
}
function applyArtifactHistoryPatch(patch={},type='history-artifact'){
  const before=snapshotArtifactRows(),upserts=Array.isArray(patch.upserts)?patch.upserts:[],removedIds=Array.isArray(patch.removedIds)?patch.removedIds:[];
  state.artifactStore?.batch?.(api=>{for(const id of removedIds)api.remove?.(String(id));for(const artifact of upserts)if(artifact?.id)api.upsert?.(window.DKDSData.deepClone(artifact));});commitOwnerArtifactMutation(before,type);return true;
}
function snapshotProjectDataState(){return {artifacts:snapshotArtifactRows().map(window.DKDSData.deepClone)};}
function restoreProjectDataState(snapshot,type='history-data-restore'){
  const before=snapshotArtifactRows();state.artifactStore=window.DKDSData.createStore((snapshot?.artifacts||[]).map(window.DKDSData.deepClone));commitOwnerArtifactMutation(before,type);return true;
}
function projectArtifactSnapshotApi(){
  return {
    revision:()=>Number(state.artifactStore?.revision?.()||0),
    list:(options={})=>(state.artifactStore?.list?.({includeTransient:options?.includeTransient!==false})||[]).map(row=>window.DKDSData.deepClone(row)),
    get:id=>{const row=state.artifactStore?.get?.(String(id||''));return row?window.DKDSData.deepClone(row):null;}
  };
}

function projectHistoryHostApi(){return {state:()=>projectHistorySnapshot(),undo:()=>systemUndo(),redo:()=>systemRedo(),commitArtifactMutation(payload={}){const label=String(payload.label||'数据对象修改'),beforePatch=payload.before&&typeof payload.before==='object'?payload.before:{upserts:[],removedIds:[]},afterPatch=payload.after&&typeof payload.after==='object'?payload.after:{upserts:[],removedIds:[]};applyArtifactHistoryPatch(afterPatch,'history-artifact-commit');recordProjectHistory({label,metadata:{kind:'artifact'},undo:()=>applyArtifactHistoryPatch(beforePatch,'history-artifact-undo'),redo:()=>applyArtifactHistoryPatch(afterPatch,'history-artifact-redo')});return {updated:true,state:projectHistorySnapshot()};}};}

function dataSourceHostApi(){
  const assignmentsFor=value=>value?.metadata&&Object.prototype.hasOwnProperty.call(value.metadata,'dataAssignments')?(Array.isArray(value.metadata.dataAssignments)?value.metadata.dataAssignments.map(String).filter(Boolean):[]):['*'];
  const matchesConsumer=(value,consumer)=>{const id=String(consumer||'').trim();if(!id)return true;const rows=assignmentsFor(value);return rows.includes('*')||rows.includes(id);};
  const sameStringSet=(a,b)=>{const left=[...new Set((a||[]).map(String))].sort(),right=[...new Set((b||[]).map(String))].sort();return left.length===right.length&&left.every((value,index)=>value===right[index]);};
  const sourceArtifacts=()=> (state.artifactStore?.list?.({includeTransient:true})||[]).filter(a=>a?.metadata?.importedSource===true);
  const descriptor=artifact=>({path:String(artifact?.metadata?.seriesPath||artifact.id),name:String(artifact.name||artifact.id),sourcePath:String(artifact?.source?.path||''),sourceName:String(artifact?.source?.name||artifact.name||''),vg:Number.isFinite(Number(artifact?.metadata?.vg))?Number(artifact.metadata.vg):null,points:Number(artifact?.rowCount||artifact?.length)||0,excluded:artifact?.metadata?.excluded===true,assignments:assignmentsFor(artifact),semanticType:String(artifact?.semanticType||artifact?.metadata?.dataType||''),kind:String(artifact.kind||''),importerId:String(artifact?.metadata?.importerId||''),artifactId:String(artifact.id)});
  const list=(options={})=>sourceArtifacts().map(descriptor).filter(row=>matchesConsumer({metadata:{dataAssignments:row.assignments}},options?.consumer||options?.pluginId));
  const locate=ref=>{const row=ref&&typeof ref==='object'?ref:{path:ref},id=String(row?.artifactId||''),path=String(row?.path||''),sourcePath=String(row?.sourcePath||'');let exact=sourceArtifacts().filter(a=>(id&&String(a.id)===id)||(path&&(String(a.id)===path||String(a?.metadata?.seriesPath||'')===path)));if(exact.length)return exact;if(sourcePath)return sourceArtifacts().filter(a=>String(a?.source?.path||'')===sourcePath);return [];};
  const commit=(type,artifacts=[])=>{const changed=(artifacts||[]).map(row=>state.artifactStore?.get?.(row?.id)).filter(Boolean),delta={upserts:changed,removedIds:[]};window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type,sourcePath:String(changed[0]?.source?.path||artifacts[0]?.source?.path||''),artifactDelta:delta,artifacts:state.artifactStore?.list?.({includeTransient:true})||[]});pushArtifactDeltaToActivityWindows(delta,type);void publishCapabilitySnapshot();renderAll();refreshOpenAnalysisPage();captureActiveProjectTab();return list();};
  return {list,targets:()=>dataConsumerTargets(),
    setAssignments(ref,pluginIds=[]){const ids=[...new Set((Array.isArray(pluginIds)?pluginIds:[]).map(String).map(x=>x.trim()).filter(Boolean))],historyRef=window.DKDSData.deepClone(ref),artifacts=locate(ref);if(!artifacts.length)return {updated:false,sources:list()};const previous=assignmentsFor(artifacts[0]);if(sameStringSet(previous,ids))return {updated:false,assignments:[...previous],sources:list()};state.artifactStore?.batch?.(api=>artifacts.forEach(a=>api.upsert?.({...a,metadata:{...(a.metadata||{}),dataAssignments:[...ids]}})));commit('source-assignments',artifacts);recordProjectHistory({label:`数据用途 · ${artifacts[0].name||artifacts[0].id}`,metadata:{kind:'data-source',operation:'assignments'},undo:()=>dataSourceHostApi().setAssignments(historyRef,previous),redo:()=>dataSourceHostApi().setAssignments(historyRef,ids)});setStatus(ids.length?`已更新数据用途：${artifacts[0].name||artifacts[0].id}`:`已设为仅数据中心：${artifacts[0].name||artifacts[0].id}`);return {updated:true,assignments:[...ids],sources:list()};},
    rename(ref,label){const name=String(label||'').trim();if(!name)return {updated:false,sources:list()};const historyRef=window.DKDSData.deepClone(ref),artifacts=locate(ref);if(!artifacts.length)return {updated:false,sources:list()};const previous=String(artifacts[0].name||artifacts[0].id);if(previous===name)return {updated:false,sources:list()};state.artifactStore?.batch?.(api=>artifacts.forEach((a,index)=>api.upsert?.({...a,name:index?a.name:name})));commit('source-rename',artifacts);recordProjectHistory({label:`修改数据标签 · ${name}`,metadata:{kind:'data-source',operation:'rename'},undo:()=>dataSourceHostApi().rename(historyRef,previous),redo:()=>dataSourceHostApi().rename(historyRef,name)});setStatus(`源数据标签已修改为：${name}`);return {updated:true,sources:list()};},
    setExcluded(ref,value=true){const historyRef=window.DKDSData.deepClone(ref),artifacts=locate(ref);if(!artifacts.length)return {updated:false,sources:list()};const previous=artifacts[0]?.metadata?.excluded===true;if(previous===!!value)return {updated:false,excluded:previous,sources:list()};state.artifactStore?.batch?.(api=>artifacts.forEach(a=>api.upsert?.({...a,metadata:{...(a.metadata||{}),excluded:!!value}})));commit('source-exclude',artifacts);recordProjectHistory({label:`${value?'排除':'恢复'}数据 · ${artifacts[0].name||artifacts[0].id}`,metadata:{kind:'data-source',operation:'exclude'},undo:()=>dataSourceHostApi().setExcluded(historyRef,previous),redo:()=>dataSourceHostApi().setExcluded(historyRef,!!value)});setStatus(`${value?'已排除':'已恢复'}源数据：${artifacts[0].name||artifacts[0].id}`);return {updated:true,excluded:!!value,sources:list()};},
    remove(refs){const requested=Array.isArray(refs)?refs:[refs],historyBefore=snapshotProjectDataState(),roots=[...new Map(requested.flatMap(ref=>locate(ref)).map(a=>[a.id,a])).values()],removeIds=new Set();for(const root of roots){for(const child of (state.artifactStore?.lineage?.(root.id)?.descendants||[]))if(child?.id)removeIds.add(String(child.id));if(root?.id)removeIds.add(String(root.id));}if(removeIds.size)state.artifactStore?.batch?.(api=>{for(const id of [...removeIds].reverse())api.remove?.(id);});const tab=activeProjectTab();if(tab)tab.artifactStore=state.artifactStore;if(roots.length){const delta={upserts:[],removedIds:[...removeIds]};window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type:'source-remove',removed:roots.map(row=>row.id),removedArtifactIds:[...removeIds],artifactDelta:delta,artifacts:state.artifactStore?.list?.({includeTransient:true})||[]});pushArtifactDeltaToActivityWindows(delta,'source-remove');void publishCapabilitySnapshot();renderAll();refreshOpenAnalysisPage();captureActiveProjectTab();const historyAfter=snapshotProjectDataState();recordProjectHistory({label:`删除 ${roots.length} 个源数据对象`,metadata:{kind:'data-source',operation:'remove'},undo:()=>restoreProjectDataState(historyBefore,'history-source-remove-undo'),redo:()=>restoreProjectDataState(historyAfter,'history-source-remove-redo')});setStatus(`已移除 ${roots.length} 个源数据对象。`);}return {removed:roots.map(a=>({path:a?.metadata?.seriesPath||a.id,name:a.name,sourcePath:a?.source?.path||''})),removedArtifactIds:[...removeIds],sources:list()};}
  };
}

function pluginUiContext(){
  return {
    activityId:window.DKDSPlugins?.activities?.active?.()||null,
    state,
    projectPath:state.projectPath,
    artifacts:state.artifactStore,
    platform:window.DKDSPlatform?.profile||null
  };
}

module.exports=Object.freeze({configure, importFiles, artifactHostApi, commitOwnerArtifactMutation, applyArtifactHistoryPatch, snapshotProjectDataState, restoreProjectDataState, projectArtifactSnapshotApi, projectHistoryHostApi, dataSourceHostApi, pluginUiContext});
