(() => {
  if(window.DKDSScientificTransforms)return;
  const VERSION='1.2.0';
  const registry=new Map();
  const ownerIndex=new Map();
  const pipelineBindings=new Map();
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return value;}}};
  const safeArray=value=>Array.isArray(value)?value:(value===undefined||value===null?[]:[value]);
  const finite=value=>Number.isFinite(Number(value));
  const normalizedId=value=>String(value||'').trim();
  const normalizeList=value=>[...new Set(safeArray(value).map(v=>String(v||'').trim()).filter(Boolean))];
  const sanitizeToken=value=>String(value||'').replace(/[^a-z0-9._-]+/gi,'-').replace(/^-+|-+$/g,'')||'transform';
  const normalizeAlgorithmRef=(value,category='')=>{
    if(!value)return null;
    if(typeof value==='string'){const text=normalizedId(value),at=text.lastIndexOf('@');return Object.freeze({id:at>0?text.slice(0,at):text,version:at>0?text.slice(at+1):'',category:normalizedId(category)});}
    const id=normalizedId(value.id||value.algorithmId);if(!id)return null;
    return Object.freeze({id,version:normalizedId(value.version||value.algorithmVersion),category:normalizedId(value.category||category)});
  };
  const executeAlgorithmSync=(ref,input,options={})=>{
    const normalized=normalizeAlgorithmRef(ref,options.category);
    const algorithms=window.DKDSScientificAlgorithms;
    if(!normalized||!algorithms?.resolve||!algorithms?.run)return null;
    const resolved=algorithms.resolve(normalized,{category:normalized.category});
    if(!resolved)return null;
    const value=algorithms.run({id:resolved.id,version:resolved.version,category:resolved.category},input,options);
    if(value&&typeof value.then==='function')throw new Error(`Scientific transform requires a local synchronous Algorithm Provider: ${resolved.id}@${resolved.version}`);
    return {value,algorithm:Object.freeze({pluginId:resolved.owner,algorithmId:resolved.id,algorithmVersion:resolved.version,category:resolved.category,title:resolved.title})};
  };

  function normalizeSweep(value){
    if(!value||typeof value!=='object')return null;
    if(Array.isArray(value.points))return value;
    if(value.kind==='data.table'&&Array.isArray(value.columns)){
      const xColumn=value.columns.find(c=>c?.role==='x')||value.columns[0],yColumn=value.columns.find(c=>c?.role==='y')||value.columns[1],groupColumn=value.columns.find(c=>c?.role==='group');
      if(xColumn&&yColumn){
        const x=safeArray(xColumn.values),y=safeArray(yColumn.values),n=Math.min(x.length,y.length),points=[];
        for(let index=0;index<n;index++)points.push({v:Number(x[index]),i:Number(y[index]),index});
        const groupValues=safeArray(groupColumn?.values).map(Number).filter(Number.isFinite);
        return normalizeSweep({id:value.id,name:value.name,x:points.map(p=>p.v),y:points.map(p=>p.i),vg:groupValues[0],metadata:{...(value.metadata||{}),xName:xColumn.name||xColumn.key||'X',xUnit:xColumn.unit||'',yName:yColumn.name||yColumn.key||'Y',yUnit:yColumn.unit||'',groupName:groupColumn?.name||groupColumn?.key||'Group',groupUnit:groupColumn?.unit||''}});
      }
    }
    if(Array.isArray(value.x)&&Array.isArray(value.y)){
      const n=Math.min(value.x.length,value.y.length),points=[];
      for(let index=0;index<n;index++)points.push({v:Number(value.x[index]),i:Number(value.y[index]),index});
      const diffs=[];for(let i=1;i<points.length;i++){const d=Math.abs(points[i].v-points[i-1].v);if(Number.isFinite(d)&&d>1e-15)diffs.push(d);}
      diffs.sort((a,b)=>a-b);const step=diffs.length?diffs[Math.floor(diffs.length/2)]:0;
      return {...value,points,step:Number(value.step)||step,direction:Number(value.direction)||0,vg:finite(value.vg)?Number(value.vg):(finite(value.metadata?.vg)?Number(value.metadata.vg):NaN),datasetName:String(value.datasetName||value.name||''),datasetPath:String(value.datasetPath||value.id||value.name||'')};
    }
    return null;
  }

  function sweepsFromInput(input){
    const rows=safeArray(input).filter(Boolean),out=[];
    const data=window.DKDSData,science=window.DKDSScience;
    for(const row of rows){
      // A transport data.table can contain an up sweep and a down sweep in one
      // artifact.  Treating the complete table as one direction=0 curve makes
      // directional scalar-field algorithms reject every sample and produces
      // an all-missing heatmap.  Expand tables through the canonical transport
      // dataset -> buildSweeps path before considering the direct-curve fallback.
      if(row?.kind==='data.table'&&typeof data?.transportDatasetsFromArtifacts==='function'&&typeof science?.buildSweeps==='function'){
        const datasets=data.transportDatasetsFromArtifacts([row])||[];
        const expanded=datasets.flatMap(dataset=>science.buildSweeps(dataset)||[]).filter(Boolean);
        if(expanded.length){out.push(...expanded);continue;}
      }
      const direct=normalizeSweep(row);if(direct)out.push(direct);
    }
    return out;
  }

  function register(owner,id,spec={}){
    const o=String(owner||'plugin'),name=normalizedId(id);if(!name)throw new Error('Scientific transform id required.');
    const existing=registry.get(name);if(existing&&existing.owner!==o)throw new Error(`Scientific transform ${name} is already owned by ${existing.owner}.`);
    const outputType=normalizedId(spec.outputType||spec.semanticType),fieldType=normalizedId(spec.fieldType||'science.scalar-field');
    const row=Object.freeze({
      id:name,owner:o,title:String(spec.title||spec.label||name),label:String(spec.label||spec.title||name),version:String(spec.version||'1.0.0'),
      outputType,fieldType,quantity:String(spec.quantity||''),unit:String(spec.unit||''),diverging:spec.diverging!==false,
      tags:Object.freeze(normalizeList(spec.tags)),inputTypes:Object.freeze(normalizeList(spec.inputTypes||['science.iv.raw','data.sweep'])),
      transformKey:String(spec.transformKey||name),parameterSchema:spec.parameterSchema||null,metadata:Object.freeze({...spec.metadata}),
      algorithmRef:normalizeAlgorithmRef(spec.algorithmRef),fieldAlgorithmRef:normalizeAlgorithmRef(spec.fieldAlgorithmRef),
      run:typeof spec.run==='function'?spec.run:null,field:typeof spec.field==='function'?spec.field:null,public:spec.public!==false,supportsScalarField:spec.supportsScalarField!==false
    });
    registry.set(name,row);if(!ownerIndex.has(o))ownerIndex.set(o,new Set());ownerIndex.get(o).add(name);
    for(const binding of pipelineBindings.values())installDefinition(binding,row);
    return row;
  }
  function unregister(owner,id){const name=normalizedId(id),row=registry.get(name);if(!row||row.owner!==String(owner||''))return false;registry.delete(name);ownerIndex.get(row.owner)?.delete(name);for(const binding of pipelineBindings.values())uninstallDefinition(binding,row);return true;}
  function removeOwner(owner){const o=String(owner||'');for(const id of [...(ownerIndex.get(o)||[])])unregister(o,id);ownerIndex.delete(o);pipelineBindings.delete(o);}
  function get(id){return registry.get(normalizedId(id))||null;}
  function resolve(value){const raw=normalizedId(value);if(registry.has(raw))return registry.get(raw);for(const row of registry.values())if(row.outputType===raw||row.fieldType===raw||row.transformKey===raw)return row;return null;}
  function list(query={}){const q=query&&typeof query==='object'?query:{};const tags=normalizeList(q.tags||q.tag);return [...registry.values()].filter(row=>(q.public===undefined||row.public===!!q.public)&&(!q.owner||row.owner===q.owner)&&(!q.outputType||row.outputType===q.outputType)&&(!q.fieldType||row.fieldType===q.fieldType)&&(!q.supportsScalarField||row.supportsScalarField)&&(!tags.length||tags.every(tag=>row.tags.includes(tag))));}

  function runCurve(id,input,options={}){
    const row=resolve(id);if(!row)throw new Error(`Scientific transform not found: ${id}`);const sweep=normalizeSweep(input);if(!sweep)throw new Error(`${row.id}: expected a sweep/curve input.`);
    const science=window.DKDSScience;const parameters=clone(options.parameters||options.transformOptions||{});
    const provider=executeAlgorithmSync(row.algorithmRef,sweep,{...options,category:row.algorithmRef?.category||'',parameters,transform:{id:row.id,transformKey:row.transformKey,outputType:row.outputType,fieldType:row.fieldType}});
    const result=provider?.value??(row.run?row.run(sweep,{...options,parameters,transform:row}):science?.transformSweep?.(sweep,row.transformKey,parameters));
    if(!result)throw new Error(`${row.id}: transform returned no result.`);
    return {...result,type:row.id,transformId:row.id,semanticType:row.outputType||result.semanticType||'',label:result.label||row.label,unit:result.unit||row.unit,quantity:row.quantity,diverging:row.diverging,algorithm:provider?.algorithm||result.algorithm||null};
  }

  function runScalarField(id,input,options={}){
    const row=resolve(id);if(!row)throw new Error(`Scientific transform not found: ${id}`);if(!row.supportsScalarField)throw new Error(`${row.id}: scalar-field projection is not supported.`);
    const sweeps=sweepsFromInput(input),science=window.DKDSScience;
    const targets=safeArray(options.targets).map(Number).filter(Number.isFinite),groups=safeArray(options.vgs||options.groups).map(Number).filter(Number.isFinite);
    const params={...clone(options),type:row.transformKey,transformId:row.id,vgs:groups,targets,transformAlgorithmRef:row.algorithmRef};delete params.groups;
    const provider=executeAlgorithmSync(row.fieldAlgorithmRef,sweeps,{...options,category:row.fieldAlgorithmRef?.category||'',parameters:params,targets,groups,transform:{id:row.id,transformKey:row.transformKey,outputType:row.outputType,fieldType:row.fieldType,algorithmRef:row.algorithmRef}});
    const result=provider?.value??(row.field?row.field(sweeps,params,{transform:row}):science?.computeSweepScalarField?.(sweeps,targets,groups,params));
    if(!result)throw new Error(`${row.id}: scalar-field transform returned no result.`);
    return {...result,type:row.id,transformId:row.id,semanticType:row.fieldType||'science.scalar-field',label:result.label||row.label,unit:result.unit||row.unit,quantity:row.quantity,diverging:row.diverging,algorithm:provider?.algorithm||result.algorithm||null,transformAlgorithmRef:row.algorithmRef||result.transformAlgorithmRef||null};
  }

  function curveArtifact(row,input,result,context={}){
    const data=window.DKDSData,sweep=normalizeSweep(input);if(!data?.createTransform||!sweep)return null;
    const x=(result.points||[]).map(p=>p.v),y=(result.points||[]).map(p=>p.y),sourceId=String(input?.id||sweep?.id||sweep?.datasetPath||'sweep');
    return data.createTransform({id:`scientific.transform:${sanitizeToken(context.owner)}:${sanitizeToken(row.id)}:${sanitizeToken(sourceId)}`,name:result.label||row.label,semanticType:row.outputType,x,y,xName:sweep.metadata?.xName||'X',yName:result.label||row.label,xUnit:sweep.metadata?.xUnit||'',yUnit:result.unit||row.unit,transform:row.id,parameters:clone(context.parameters||{}),metadata:{scientificTransform:{id:row.id,quantity:row.quantity,diverging:row.diverging,algorithmRef:row.algorithmRef||null},algorithm:result.algorithm||null}});
  }
  function fieldArtifact(row,result,context={}){
    const data=window.DKDSData;if(!data?.createMatrix)return null;const direction=Number(result.direction)<0?-1:1;
    return data.createMatrix({id:`scientific.field:${sanitizeToken(context.owner)}:${sanitizeToken(row.id)}:${direction}`,name:`${result.label||row.label} · ${direction<0?'反扫':'正扫'}`,semanticType:row.fieldType||'science.scalar-field',x:result.targets||[],y:result.vgs||[],z:result.matrix||[],xName:context.xName||'X',yName:context.groupName||'Group',valueName:result.label||row.label,xUnit:context.xUnit||'',yUnit:context.groupUnit||'',valueUnit:result.unit||row.unit,parameters:{transformId:row.id,direction,...clone(context.parameters||{})},metadata:{scientificTransform:{id:row.id,outputType:row.outputType,fieldType:row.fieldType,quantity:row.quantity,diverging:row.diverging,algorithmRef:row.algorithmRef||null,fieldAlgorithmRef:row.fieldAlgorithmRef||null},algorithm:result.algorithm||null}});
  }
  function curveStageId(row){return `transform.${row.id}`;}
  function fieldStageId(row){return `scalar-field.${row.id}`;}
  function installDefinition(binding,row){
    if(!row.public||!binding?.pipeline?.register)return;
    const pipeline=binding.pipeline,owner=binding.owner;
    const curveId=curveStageId(row),fieldId=fieldStageId(row);
    if(!pipeline.get?.(curveId))pipeline.register(curveId,{title:row.title,kind:'transform',inputTypes:row.inputTypes,outputTypes:row.outputType?[row.outputType]:[],outputKinds:['data.transform'],cacheLimit:8,
      run:(input,{parameters})=>{const source=safeArray(input)[0];const value=runCurve(row.id,source,{parameters});const artifact=curveArtifact(row,source,value,{owner,parameters});return {artifacts:artifact?[artifact]:[],value};},
      selection:({artifacts})=>artifacts.map(a=>({type:row.outputType||'data.transform',id:a.id,ref:{artifactId:a.id}})),
      project:({value,artifacts})=>({kind:'curve',artifactId:artifacts[0]?.id||'',traces:[{x:(value?.points||[]).map(p=>p.v),y:(value?.points||[]).map(p=>p.y),type:'scatter',mode:'lines',name:value?.label||row.label}],axes:{x:{name:'Vd',unit:'V'},y:{name:value?.label||row.label,unit:value?.unit||row.unit}},semanticType:row.outputType,transformId:row.id})
    });
    if(row.supportsScalarField&&!pipeline.get?.(fieldId))pipeline.register(fieldId,{title:`${row.title} scalar field`,kind:'transform',inputTypes:['data.table','data.sweep'],outputTypes:[row.fieldType||'science.scalar-field'],outputKinds:['result.matrix'],allowEmptyInput:true,cacheLimit:6,
      run:(input,{parameters})=>{const value=runScalarField(row.id,input,parameters||{});const artifact=fieldArtifact(row,value,{owner,parameters});return {artifacts:artifact?[artifact]:[],value};},
      project:({value,artifacts})=>({kind:'heatmap',artifactId:artifacts[0]?.id||'',traces:[{x:value?.targets||[],y:value?.vgs||[],z:value?.matrix||[],type:'heatmap'}],axes:{x:{name:'Vd',unit:'V'},y:{name:'Vg',unit:'V'},z:{name:value?.label||row.label,unit:value?.unit||row.unit}},semanticType:row.fieldType||'science.scalar-field',sourceSemanticType:row.outputType,transformId:row.id,diverging:row.diverging})
    });
  }
  function uninstallDefinition(binding,row){try{binding.pipeline?.unregister?.(curveStageId(row));}catch{}try{binding.pipeline?.unregister?.(fieldStageId(row));}catch{}}
  function installPipeline(owner,pipeline){const o=String(owner||'plugin');if(!pipeline?.register)return false;const binding={owner:o,pipeline};pipelineBindings.set(o,binding);for(const row of registry.values())installDefinition(binding,row);return true;}

  function createScope(owner){
    const o=String(owner||'plugin');
    return Object.freeze({version:VERSION,owner:o,register:(id,spec)=>register(o,id,spec),unregister:id=>unregister(o,id),get,resolve,list,runCurve,runScalarField,installPipeline:pipeline=>installPipeline(o,pipeline),curveStageId:id=>{const row=resolve(id);return row?curveStageId(row):'';},fieldStageId:id=>{const row=resolve(id);return row?fieldStageId(row):'';}});
  }


  window.DKDSScientificTransforms=Object.freeze({VERSION,createScope,register,unregister,removeOwner,get,resolve,list,runCurve,runScalarField,installPipeline,curveStageId:id=>{const row=resolve(id);return row?curveStageId(row):'';},fieldStageId:id=>{const row=resolve(id);return row?fieldStageId(row):'';}});
})();
