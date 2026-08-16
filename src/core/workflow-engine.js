(() => {
  const D=window.GRSData;let adapter={getProvider:()=>null,listProviders:()=>[],emit:()=>{}};
  const registryKind={processor:'workflow.processors',analyzer:'workflow.analyzers',chart:'charts.renderers'};
  function configure(next={}){adapter={...adapter,...next};}
  function normalizeProvider(type,id,spec={}){
    if(!['processor','analyzer','chart'].includes(type))throw new Error(`Unsupported workflow provider type: ${type}`);
    if(!id)throw new Error(`${type} provider id is required.`);
    if(type!=='chart'&&typeof spec.run!=='function')throw new Error(`${type} provider ${id} requires run().`);
    if(type==='chart'&&typeof spec.render!=='function'&&typeof spec.buildSpec!=='function')throw new Error(`chart provider ${id} requires render() or buildSpec().`);
    return {id,name:spec.name||id,description:spec.description||'',version:spec.version||'1.0.0',inputKinds:spec.inputKinds||[],outputKinds:spec.outputKinds||[],parameterSchema:spec.parameterSchema||{fields:[]},...spec};
  }
  function getProvider(type,id){return adapter.getProvider?.(registryKind[type],id)||null;}
  function listProviders(type){return adapter.listProviders?.(registryKind[type])||[];}
  function nodeRefs(node){const refs=[];for(const v of Object.values(node.inputs||{})){if(typeof v==='string')refs.push(v);}return refs;}
  function parseRef(ref){const s=String(ref||'');if(s.startsWith('input:'))return {scope:'input',id:s.slice(6)};if(s.startsWith('node:')){const rest=s.slice(5),idx=rest.indexOf(':');return idx<0?{scope:'node',id:rest,key:null}:{scope:'node',id:rest.slice(0,idx),key:rest.slice(idx+1)};}return {scope:'literal',value:ref};}
  function resolveRef(ref,inputs,nodeResults){const r=parseRef(ref);if(r.scope==='input')return inputs[r.id];if(r.scope==='node'){const v=nodeResults.get(r.id);return r.key?v?.[r.key]:v;}return r.value;}
  function validateRecipe(recipe){
    const errors=[];if(!recipe?.id)errors.push('Recipe id is required.');const ids=new Set();
    for(const node of recipe?.nodes||[]){if(!node.id)errors.push('Every node requires id.');else if(ids.has(node.id))errors.push(`Duplicate node id: ${node.id}`);else ids.add(node.id);if(!registryKind[node.type])errors.push(`Unsupported node type: ${node.type}`);if(!node.provider)errors.push(`Node ${node.id||'?'} requires provider.`);}
    return {ok:!errors.length,errors};
  }
  function executionOrder(recipe){
    const nodes=recipe.nodes||[],byId=new Map(nodes.map(n=>[n.id,n])),deps=new Map(nodes.map(n=>[n.id,new Set()]));
    for(const n of nodes)for(const ref of nodeRefs(n)){const p=parseRef(ref);if(p.scope==='node'){if(!byId.has(p.id))throw new Error(`Node ${n.id} references missing node ${p.id}.`);deps.get(n.id).add(p.id);}}
    const out=[],ready=[...nodes.filter(n=>deps.get(n.id).size===0)];const done=new Set();
    while(ready.length){const n=ready.shift();if(done.has(n.id))continue;done.add(n.id);out.push(n);for(const q of nodes){if(done.has(q.id))continue;deps.get(q.id).delete(n.id);if(!deps.get(q.id).size)ready.push(q);}}
    if(out.length!==nodes.length)throw new Error('Workflow contains a cycle.');return out;
  }
  function decorateArtifacts(value,{node,provider,parameters,inputArtifacts,executionId}){
    if(D?.isArtifact?.(value)){
      const last=value.provenance?.at?.(-1);
      if(last?.providerId===provider.id){
        const out=D.deepClone(value);const row=out.provenance.at(-1);row.environment={...(row.environment||{}),executionId,nodeId:node.id};row.inputs=[...new Set([...(row.inputs||[]),...inputArtifacts.map(a=>a.id)])];return out;
      }
      return D.withProvenance(value,{type:node.type,label:`${provider.name||provider.id}`,providerId:provider.id,pluginId:provider.pluginId||'',version:provider.version||'',parameters,inputs:inputArtifacts.map(a=>a.id),environment:{executionId,nodeId:node.id}});
    }
    if(Array.isArray(value))return value.map(v=>decorateArtifacts(v,{node,provider,parameters,inputArtifacts,executionId}));
    if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=decorateArtifacts(v,{node,provider,parameters,inputArtifacts,executionId});return out;}
    return value;
  }
  function collectArtifacts(value,out=[]){if(D?.isArtifact?.(value))out.push(value);else if(Array.isArray(value))for(const v of value)collectArtifacts(v,out);else if(value&&typeof value==='object')for(const v of Object.values(value))collectArtifacts(v,out);return out;}

  function resolveParameterBindings(value,recipeParameters){
    if(typeof value==='string'&&value.startsWith('param:'))return recipeParameters[value.slice(6)];
    if(Array.isArray(value))return value.map(v=>resolveParameterBindings(v,recipeParameters));
    if(value&&typeof value==='object'){if(Object.keys(value).length===1&&Object.prototype.hasOwnProperty.call(value,'$param'))return recipeParameters[value.$param];const out={};for(const [k,v] of Object.entries(value))out[k]=resolveParameterBindings(v,recipeParameters);return out;}
    return value;
  }

  async function run(recipe,{inputs={},parameters={},context={},signal=null,onProgress=null}={}){
    const valid=validateRecipe(recipe);if(!valid.ok)throw new Error(valid.errors.join(' '));
    const recipeParameters={...window.GRSParameters?.defaultValues?.(recipe.parameterSchema||{fields:[]},recipe.defaultParameters||{}),...parameters};
    const recipeValidation=window.GRSParameters?.validate?.(recipe.parameterSchema||{fields:[]},recipeParameters,{inputs,...context});if(recipeValidation&&!recipeValidation.ok)throw new Error(`Recipe parameters: ${Object.values(recipeValidation.errors).join(' ')}`);
    const order=executionOrder(recipe);const executionId=D?.makeId?.('workflow')||`workflow:${Date.now()}`;const nodeResults=new Map();const startedAt=new Date().toISOString();adapter.emit?.('workflow:started',{executionId,recipe,parameters:recipeParameters});
    for(let index=0;index<order.length;index++){
      if(signal?.aborted)throw new DOMException('Workflow aborted.','AbortError');const node=order[index];const provider=getProvider(node.type,node.provider);if(!provider)throw new Error(`Provider not found for ${node.type}: ${node.provider}`);
      const resolvedInputs={};if(Object.keys(node.inputs||{}).length){for(const [k,ref] of Object.entries(node.inputs))resolvedInputs[k]=resolveRef(ref,inputs,nodeResults);}else if(index>0)resolvedInputs.input=nodeResults.get(order[index-1].id);else resolvedInputs.input=inputs.main??Object.values(inputs)[0];
      const inputArtifacts=collectArtifacts(resolvedInputs);if(provider.inputKinds?.length&&!inputArtifacts.length)throw new Error(`Node ${node.id}: ${provider.name} requires an artifact of kind ${provider.inputKinds.join(' / ')}, but no typed artifact was provided.`);if(provider.inputKinds?.length&&!inputArtifacts.every(a=>provider.inputKinds.includes(a.kind)))throw new Error(`Node ${node.id}: ${provider.name} requires ${provider.inputKinds.join(' / ')}, received ${[...new Set(inputArtifacts.map(a=>a.kind))].join(' / ')}.`);
      const nodeParameters=resolveParameterBindings(node.parameters||{},recipeParameters);const parameters={...(provider.defaultParameters||{}),...nodeParameters};const vr=window.GRSParameters?.validate?.(provider.parameterSchema||{fields:[]},parameters,{inputs:resolvedInputs,...context});if(vr&&!vr.ok)throw new Error(`Node ${node.id}: ${Object.values(vr.errors).join(' ')}`);
      onProgress?.({executionId,index,total:order.length,node,provider,phase:'running'});adapter.emit?.('workflow:node-started',{executionId,node,provider});
      let result;if(node.type==='chart'){result=provider.buildSpec?await provider.buildSpec({inputs:resolvedInputs,parameters,context,signal,execution:{id:executionId,recipeId:recipe.id,nodeId:node.id}}):{kind:'chart.render-request',providerId:provider.id,inputs:resolvedInputs,parameters};}else result=await provider.run({inputs:resolvedInputs,parameters,context,signal,execution:{id:executionId,recipeId:recipe.id,nodeId:node.id}});
      const decorated=decorateArtifacts(result,{node,provider,parameters,inputArtifacts,executionId});const outputArtifacts=collectArtifacts(decorated);if(provider.outputKinds?.length&&!outputArtifacts.length)throw new Error(`Node ${node.id}: ${provider.name} must return an artifact of kind ${provider.outputKinds.join(' / ')}, but returned no typed artifact.`);if(provider.outputKinds?.length&&!outputArtifacts.every(a=>provider.outputKinds.includes(a.kind)))throw new Error(`Node ${node.id}: ${provider.name} returned unsupported artifact kind ${[...new Set(outputArtifacts.map(a=>a.kind))].join(' / ')}.`);nodeResults.set(node.id,decorated);adapter.emit?.('workflow:node-completed',{executionId,node,provider,result:decorated});onProgress?.({executionId,index:index+1,total:order.length,node,provider,phase:'completed'});
    }
    const outputs={};if(recipe.outputs&&Object.keys(recipe.outputs).length){for(const [k,ref] of Object.entries(recipe.outputs))outputs[k]=resolveRef(ref,inputs,nodeResults);}else if(order.length)outputs.result=nodeResults.get(order.at(-1).id);else outputs.result=inputs.main??Object.values(inputs)[0];
    const result={id:executionId,recipeId:recipe.id,recipeVersion:recipe.version||'1.0.0',parameters:recipeParameters,startedAt,completedAt:new Date().toISOString(),outputs,nodeResults:Object.fromEntries(nodeResults)};adapter.emit?.('workflow:completed',result);return result;
  }

  function buildSequentialRecipe({id='custom.workflow',name='Custom workflow',version='1.0.0',steps=[],inputName='main',workspace={}}={}){
    let previous=`input:${inputName}`;const nodes=steps.map((step,index)=>{const node={id:step.id||`step-${index+1}`,type:step.type||'processor',provider:step.provider,parameters:step.parameters||{},inputs:step.inputs||{input:previous}};previous=`node:${node.id}`;return node;});return {schema:1,id,name,version,inputs:[{id:inputName}],nodes,outputs:{result:previous},workspace};
  }

  window.GRSWorkflow={registryKind,configure,normalizeProvider,getProvider,listProviders,validateRecipe,executionOrder,run,buildSequentialRecipe};
})();
