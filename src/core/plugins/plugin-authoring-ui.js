(() => {
  let host=null,refreshManager=async()=>true,bound=false,state=null;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const location=row=>row?.cellIndex!==undefined?`Cell ${Number(row.cellIndex)+1} · 行 ${row.line||'?'}`:`行 ${row?.line||'?'}`;
  const selected=()=>state?.report?.sourceModel?.functions?.find(row=>row.id===state.functionId)||null;

  function render(){
    const panel=$('#pluginManagerAuthoringPanel');if(!panel)return;
    if(!state){panel.classList.add('hidden');panel.innerHTML='';return;}
    panel.classList.remove('hidden');
    if(state.error){panel.innerHTML=`<div class="plugin-manager-authoring-head"><strong>Python / Jupyter 插件生成器</strong><button data-authoring-close type="button">关闭</button></div><div>${esc(state.error)}</div>`;panel.querySelector('[data-authoring-close]').onclick=close;return;}
    const funcs=state.report?.sourceModel?.functions||[],fn=selected();
    const diagnostics=(state.report?.diagnostics||[]).filter(row=>!row.functionId||row.functionId===fn?.id);
    const preview=fn?.blueprint?.preview||{};
    const workflow=state.report?.sourceModel?.workflow||{};
    const tablePlan=workflow.tableTransformPlan||{};
    const tableExecution=tablePlan.execution||{};

    const candidate=workflow.candidate||{};
    const hostCaps=(workflow.hostCapabilities||[]).join('、')||'无';
    const transforms=(workflow.transformFamilies||[]).join('、')||'无';
    const workflowDiagnostics=(workflow.diagnostics||[]).slice(0,12);
    const workflowIssues=workflowDiagnostics.length?`<div class="plugin-manager-authoring-workflow-issues">${workflowDiagnostics.map(item=>`<span><strong>${esc(item.code||'BLOCKER')}</strong> Cell ${esc(String(Number(item.cellIndex||0)+1))} · 行 ${esc(String(item.line||'?'))} · ${esc(item.call||item.message||'')}</span>`).join('')}</div>`:'';

    const workflowSummary=`<div class="plugin-manager-authoring-workflow"><strong>Source Workflow</strong><span>${esc(String(workflow.codeCellCount||0))} 个 code cell · ${esc(String(workflow.crossCellDependencyCount||0))} 条跨 Cell 依赖</span><span>Host 映射：${esc(hostCaps)}</span><span>待 lowering：${esc(transforms)}</span><span>状态：${esc(candidate.status||'—')}</span></div><div class="plugin-manager-authoring-ir"><strong>Table Transform IR</strong><span>${esc(String(tablePlan.lowerableStatementCount||0))} / ${esc(String(tablePlan.statementCount||0))} 条语句已结构化</span><span>覆盖率：${esc(String(Math.round(Number(tablePlan.coverage||0)*100)))}%</span><span>${tablePlan.buildable?'IR 已闭合':'仍有未 lowering 语句'}</span><span>${tableExecution.executable?'Core Task 可执行':'Core Task 尚有 blocker'}</span></div>${workflowIssues}`;
    const options=funcs.map(row=>`<option value="${esc(row.id)}" ${row.id===state.functionId?'selected':''}>${esc(row.name)} · ${esc(location(row))} · ${row.blueprint?.buildable?'可构建':'不可自动构建'}</option>`).join('');
    const args=(fn?.parameters||[]).map(row=>`${row.name}${row.annotation?`: ${row.annotation}`:''}${row.defaultSource!==undefined?` = ${row.defaultSource}`:''}`).join(', ');
    const issues=diagnostics.length?diagnostics.map(row=>`<div class="plugin-manager-authoring-diagnostic"><strong>${esc(row.code||'DIAGNOSTIC')}</strong><span>${esc(location(row))} · ${esc(row.message||'')}</span></div>`).join(''):'<div>该函数通过当前 Portable 子集与 Blueprint 自动映射检查。</div>';
    const outputs=(preview.outputs||[]).map(row=>`${row.kind}:${row.label}`).join('、')||'无自动投影视图';
    panel.innerHTML=`<div class="plugin-manager-authoring-head"><div><strong>Python / Jupyter 插件生成器</strong><span>${esc(state.name)} · Python ${esc(state.python?.version||'?')} · 静态解析，不执行源码</span></div><button data-authoring-close type="button">关闭</button></div>
      ${workflowSummary}\n      <div class="plugin-manager-authoring-grid"><section><label>候选函数<select data-authoring-function>${options||'<option>未发现顶层函数</option>'}</select></label><div class="plugin-manager-authoring-signature"><strong>签名</strong><code>${esc(fn?`${fn.name}(${args})${fn.returnAnnotation?` -> ${fn.returnAnnotation}`:''}`:'—')}</code></div><div class="plugin-manager-authoring-diagnostics">${issues}</div></section>
      <section><strong>Declarative Blueprint 预览</strong><div class="plugin-manager-authoring-preview"><span>参数：${esc((preview.parameters||[]).map(row=>row.label).join('、')||'无')}</span><span>数据列输入：${esc((preview.artifactInputs||[]).join('、')||'无')}</span><span>输出：${esc(outputs)}</span><span>Unit-first：${preview.unitFirst?'是':'—'} · 私有 CSS：${preview.privateCss?'是':'否'}</span></div><details><summary>查看 Blueprint JSON</summary><pre>${esc(JSON.stringify(fn?.blueprint?.spec||{},null,2))}</pre></details></section></div>
      <div class="plugin-manager-authoring-actions"><button data-authoring-build class="primary" type="button" ${fn?.blueprint?.buildable?'':'disabled'}>Build + Validate</button><button data-authoring-export data-dkds-native-save="export" type="button" ${state.build?'':'disabled'}>导出 .dkplugin</button><button data-authoring-install type="button" ${state.build?'':'disabled'}>直接安装</button><span>${state.build?`已验证 ${esc(state.build.manifest?.id||'')}@${esc(state.build.manifest?.version||'')}`:'尚未构建'}</span></div>`;
    const select=panel.querySelector('[data-authoring-function]');if(select)select.onchange=()=>{state.functionId=select.value;state.build=null;render();};
    panel.querySelector('[data-authoring-close]').onclick=close;
    const build=panel.querySelector('[data-authoring-build]');if(build)build.onclick=()=>void buildSelected();
    const exp=panel.querySelector('[data-authoring-export]');if(exp)exp.onclick=()=>void exportPackage();
    const install=panel.querySelector('[data-authoring-install]');if(install)install.onclick=()=>void installPackage();
  }
  function close(){state=null;render();}
  async function open(){
    const api=window.electronAPI;if(!api?.pluginAuthoringSelectSource)return;
    host?.setStatus?.('正在静态分析 Python / Jupyter 源码…');
    const result=await api.pluginAuthoringSelectSource();if(result?.canceled)return;
    if(!result?.ok){state={error:result?.error?.message||'源码分析失败。'};render();host?.setStatus?.(state.error);return;}
    const funcs=result.report?.sourceModel?.functions||[],preferred=funcs.find(row=>row.blueprint?.buildable)||funcs[0]||null;
    state={token:result.token,name:result.name,python:result.python,report:result.report,functionId:preferred?.id||'',build:null};render();
    host?.setStatus?.(`已分析 ${result.name}：${funcs.length} 个函数，${result.report?.buildableFunctionCount||0} 个可自动构建。`);
  }
  async function buildSelected(){
    if(!state?.token||!state.functionId)return;host?.setStatus?.('正在生成、构建并执行生产插件合同验证…');
    const result=await window.electronAPI.pluginAuthoringBuild({token:state.token,functionId:state.functionId});
    if(!result?.ok){state.build=null;render();host?.setStatus?.(`构建失败：${result?.error?.message||'未知错误'}`);return;}
    state.build=result;render();host?.setStatus?.(`Build + Validate 通过：${result.manifest.id}@${result.manifest.version}`);
  }
  async function exportPackage(){
    if(!state?.build)return;try{const saved=await window.electronAPI.pluginAuthoringExport({token:state.token});if(saved)host?.setStatus?.(`已导出 ${saved.name}`);}catch(err){host?.setStatus?.(`导出失败：${err.message}`);}
  }
  async function installPackage(){
    if(!state?.build)return;const manifest=state.build.manifest||{};
    const yes=await window.DKDSUI?.dialogs?.confirm?.({title:'安装生成的插件',message:`安装 ${manifest.name||manifest.id} v${manifest.version||''}？该包已经通过生产 Plugin Manager 合同验证。`,cancelLabel:'取消',confirmLabel:'安装'});if(!yes)return;
    const result=await window.electronAPI.pluginAuthoringInstall({token:state.token});if(!result?.ok){host?.setStatus?.(`安装失败：${result?.error?.message||'未知错误'}`);return;}
    await refreshManager({silent:true});window.DKDSPlugins?.activities?.refresh?.();host?.setStatus?.(result.requiresRestart?'插件已安装；重启后启用。':'插件已安装并载入。');
  }
  function bind(){if(bound)return;bound=true;const button=$('#pluginManagerAuthorPythonBtn');if(button){button.hidden=!window.electronAPI?.pluginAuthoringSelectSource;button.onclick=()=>void open();}}
  window.DKDSPluginAuthoringUI=Object.freeze({configure(options={}){host=options.host||host;refreshManager=options.refresh||refreshManager;bind();render();},open,render});
})();
