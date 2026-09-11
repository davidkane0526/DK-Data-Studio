'use strict';
const {state, active}=require('../context');
const {createDomainCommandRuntime}=require('./domain');
const {assertId,getRegistry,addCleanup,registerContribution}=require('../registry');
const {refreshActivityVisibility}=require('../activity/shell');
const {reflowContextToolbar}=require('../shell/context-toolbar');


  function toolbarHost(group) {
    return document.querySelector(`[data-plugin-toolbar="${group}"]`)
      || document.querySelector('#pluginToolbarAnalysis')
      || null;
  }

  function createToolbarButton(pluginId, spec) {
    const group = spec.group || 'analysis';
    const mount = toolbarHost(group);
    if (!mount) throw new Error(`Toolbar mount not found: ${group}`);

    const button = document.createElement('button');
    button.type = 'button';
    button.id = spec.id || `${pluginId}__${spec.command || spec.label}`;
    button.className = `toolbar-btn plugin-toolbar-btn ${spec.className || ''}`.trim();
    button.textContent = spec.label || spec.id || pluginId;
    button.setAttribute('aria-label',String(spec.label||spec.title||spec.id||pluginId));
    button.dataset.pluginId = pluginId;
    button.dataset.pluginOrder = String(Number(spec.order) || 100);
    button.dataset.pluginPriority = String(Number(spec.priority) || 0);
    button.dataset.pluginSection = String(spec.section || '');
    button.dataset.pluginActivity = spec.activity || '';
    button.dataset.dkdsComponentIdentity = 'toolbarAction';
    button.dataset.dkdsComponentIdentityOwner = 'core-component';
    const declaredVariant=String(spec.variant||spec.tone||'').trim();
    const classVariant=['primary','secondary','selected','active','quiet','destructive'].find(name=>String(spec.className||'').split(/\s+/).includes(name))||'';
    const variant=declaredVariant||classVariant;if(variant){button.dataset.dkdsComponentVariant=variant;button.dataset.dkdsComponentVariantOwner='core-component';}

    button.addEventListener('click', async event => {
      try {
        // System toolbar commands operate on the active SUPER workspace. If a
        // transient system page such as Plugin Manager is covering it, restore
        // the plugin root first; the command can then open its PRIME/SUB view.
        if(spec.activity)state.host?.ensurePluginWorkspaceVisible?.(spec.activity);
        if (spec.onClick) await spec.onClick(event);
        else if (spec.command) await runCommand(spec.command, { event });
      } catch (err) {
        console.error(`[DKDS plugin toolbar:${pluginId}]`, err);
        state.host?.setStatus?.(`插件 ${pluginId} 执行失败：${err.message}`);
      }
    });

    const siblings = [...mount.querySelectorAll('.plugin-toolbar-btn')];
    const before = siblings.find(el => Number(el.dataset.pluginOrder || 100) > Number(spec.order || 100));
    mount.insertBefore(button, before || null);
    addCleanup(pluginId, () => button.remove());
    refreshActivityVisibility();
    queueMicrotask(reflowContextToolbar);
    return button;
  }

  const domainCommands=createDomainCommandRuntime({
    artifacts:()=>state.host?.artifacts||null,
    resolveCommand:id=>getRegistry('commands').get(String(id||''))||null
  });

  function registerCommand(pluginId, id, handler, meta={}, pluginVersion='', artifactAccess=null) {
    assertId(id, 'command id');
    if(typeof handler!=='function')throw new Error(`Command handler must be a function: ${id}`);
    const reg = getRegistry('commands');
    if (reg.has(id)) throw new Error(`Command already registered: ${id}`);
    const row={id,handler,meta:meta&&typeof meta==='object'?meta:{},pluginId,pluginVersion:String(pluginVersion||''),artifactAccess};
    reg.set(id,row);
    return addCleanup(pluginId, () => reg.delete(id));
  }

  function inferCommandSource(args,context={}){
    if(context?.source)return String(context.source);
    if(args?.event)return 'ui';
    const source=String(args?.source||'');
    if(source.startsWith('mobile'))return 'ui';
    if(source.includes('action')||source.includes('toolbar')||source.includes('button'))return 'ui';
    return 'ui';
  }
  async function runCommand(id, args={}, context={}) {
    const cmd = getRegistry('commands').get(id);
    if (!cmd) throw new Error(`Command not found: ${id}`);
    const source=inferCommandSource(args,context);
    if(source!=='ui'&&!domainCommands.describe(cmd))throw new Error(`Command is not exposed as a validated domain command: ${id}`);
    return await domainCommands.execute(cmd,args,{...context,source});
  }
  function commandList(){return [...getRegistry('commands').values()].map(row=>domainCommands.describe(row)).filter(Boolean).sort((a,b)=>a.domain.localeCompare(b.domain)||a.id.localeCompare(b.id));}
  function commandGet(id){const row=getRegistry('commands').get(String(id||''));return row?domainCommands.describe(row):null;}
  function commandHistory(query={}){return domainCommands.history(query);}
  function replayCommand(executionId,options={}){return domainCommands.replay(executionId,options);}


module.exports=Object.freeze({toolbarHost, createToolbarButton, registerCommand, runCommand, commandList, commandGet, commandHistory, replayCommand, registerContribution});
