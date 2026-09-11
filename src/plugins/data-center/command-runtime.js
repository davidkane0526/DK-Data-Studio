(() => {
  'use strict';
  const ID='builtin.data-center.derive-column';

  const formulaSchema=Object.freeze({fields:[
    {id:'name',type:'text',label:'新列名称',default:'Derived',required:true,placeholder:'例如 Resistance'},
    {id:'formula',type:'formula',label:'公式',default:'abs(Vd / Id)',required:true,rows:2,description:'支持列 key/名称，也可用 [带空格的列名]。函数：abs, sqrt, log10, exp, min, max, pow, clamp, ifelse…'},
    {id:'unit',type:'text',label:'单位',default:'',placeholder:'例如 Ω'},
    {id:'role',type:'select',label:'角色',default:'derived',options:[{value:'derived',label:'派生量'},{value:'x',label:'X'},{value:'y',label:'Y'},{value:'group',label:'分组'},{value:'',label:'未指定'}]},
    {id:'replace',type:'boolean',label:'同名列存在时替换',default:false}
  ]});
  function installFormula(ctx,{model:D,formula:F}={}){
    if(!D||!F)throw new Error('Data Center formula runtime requires data model/formula engine.');
    ctx.workflow.processors.register('formula.derived-column',{name:'公式派生列',description:'用安全公式表达式生成新的 DataTable 数值列。',inputKinds:['data.table'],outputKinds:['data.table'],parameterSchema:formulaSchema,run({inputs,parameters}){const table=inputs.table||inputs.input||Object.values(inputs)[0];return F.deriveColumn(table,{...parameters,providerId:'formula.derived-column',pluginId:ctx.manifest.id,version:ctx.manifest.version}).table;}});
    return formulaSchema;
  }
  function register(ctx,options={}){
    const D=options.model;
    if(!D)throw new Error('Data Center command runtime requires data model.');
    const capture=payload=>{
      const meta=options.activeMeta?.();
      const artifactId=String(payload?.artifactId||meta?.id||'');
      const parameters=payload?.parameters&&typeof payload.parameters==='object'
        ? D.deepClone(payload.parameters)
        : (()=>{const panel=options.panel?.(),valid=panel?.validate?.();if(valid&&!valid.ok)throw new Error('公式参数存在错误。');return D.deepClone(panel?.getValue?.()||{});})();
      return {artifactId,parameters};
    };
    const handler=async({artifactId,parameters})=>{
      const input=ctx.data.artifacts.get(String(artifactId||''));
      if(!input||input.kind!=='data.table')throw new Error('公式派生列需要有效的 DataTable 输入。');
      const recipe=ctx.workflow.buildSequentialRecipe({id:'quick.formula',name:'Quick formula',steps:[{type:'processor',provider:'formula.derived-column',parameters:D.deepClone(parameters||{})}]});
      const exec=await ctx.workflow.run(recipe,{inputs:{main:input}}),output=exec.outputs.result;
      if(!D.isArtifact(output))throw new Error('公式处理器没有返回 DataTable Artifact。');
      ctx.data.artifacts.upsert(output);options.onOutput?.(output,exec);return output;
    };
    ctx.commands.register(ID,handler,{domainCommand:{domain:'data-processing',version:'1.0.0',title:'公式派生列',replayable:true,inputSchema:{type:'object',properties:{artifactId:{type:'string'},parameters:{type:'object'}}},captureArgs:capture,inputs:args=>[{artifactId:args.artifactId,role:'main'}],algorithm:()=>({category:'workflow.processor',id:'formula.derived-column',version:ctx.manifest.version,provider:`${ctx.manifest.id}@${ctx.manifest.version}`}),parameters:args=>args.parameters||{},outputs:result=>result?.id?[{artifactId:result.id,role:'result'}]:[]}});
    return ID;
  }
  window.DKDSPluginModules.define('builtin.data-center','command-runtime',Object.freeze({ID,formulaSchema,installFormula,register}));
})();
