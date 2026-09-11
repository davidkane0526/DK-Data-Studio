# SUPER / TOP Workspace Contract（Plugin API 1.19）

本文档描述 v3.67.6 冻结后的 SUPER/TOP 契约。旧版 `split + left/main` TopWorkspace 合同以及以 `ctx.ui.prime/sub` 组织页面结构的方式不再用于新的 Workspace。

## 1. 一个插件只有一套 Workspace 实现

TOP 与 SUPER 共享同一 Controller、状态、科学渲染器和 `PluginWorkspace`。宿主只决定它是在独立窗口还是主界面中呈现。插件不得维护 Desktop/Mobile 或 TOP/SUPER 两套业务实现。

## 2. TOP 必须注册 Activity 与语义 Presentation Contract

```js
ctx.ui.activities.add({
  id:'example',
  openMode:'window',
  onActivate:()=>ctx.workspace.openPage('examplePage')
});

ctx.ui.topWorkspace.register({
  id:'example',
  activity:'example',
  label:'Example',
  layout:{
    mode:'native',
    root:{selector:'#examplePage .dkds-plugin-workspace'},
    primary:{id:'main',presentationRole:'scientific-primary',priority:100,collapsible:false},
    prime:[{id:'data-control',presentationRole:'data-control',priority:90,collapsible:true}],
    sub:[{id:'detail',presentationRole:'scientific-secondary',priority:60,collapsible:true}]
  }
});
```

`topWorkspace.layout` 只描述跨平台语义。允许的 `presentationRole` 为：

- `scientific-primary`
- `data-primary`
- `utility-primary`
- `data-control`
- `inspector`
- `scientific-secondary`

`priority` 与 `collapsible` 也是语义提示。**禁止**在 TopWorkspace Surface 中声明 `placement`、`placements`、`defaultPlacement`，也禁止用 `left/right/bottom` 表达平台结构。

## 3. PRIMARY / PRIME / SUB 的实际页面结构由 PluginWorkspace 实现

```js
const wb=ctx.ui.workspaceSurface.create(root,{activity:'example'});
wb.registerPrimary({id:'main',mainNode});
wb.registerPrime({
  id:'data-control',
  existingNode:controls,
  presentationRole:'data-control',
  defaultPlacement:'left',
  placements:['left','right','bottom','global']
});
```

这里的 `defaultPlacement/placements` 属于 Desktop Workbench 运行布局，只存在于实际 Surface 实现中，不进入 Core Presentation Model。MobilePresenter 根据 `presentationRole` 自己映射为 `main / sheet / rail / route`。

Plugin API 1.19 的 PRIMARY 只有主 Surface，不再支持 `leftNode/leftHtml`。独立参数区、Inspector、次级科学视图必须注册为 PRIME/SUB。

## 4. 关于 `ctx.ui.prime` / `ctx.ui.sub`

这两个低层 contribution facade 为 Plugin API 1.19 已公开表面的一部分，因此 v3.67.6 不在补丁版本中破坏性删除。但它们**不是新的 Workspace 页面构成路径**，第一方插件和 SDK 模板不得用它们组织 TOP/SUPER 页面。新的 Workspace 一律使用 `ctx.ui.workspaceSurface` 的 PRIMARY/PRIME/SUB，并由 `ctx.ui.topWorkspace` 提供唯一语义合同。

## 5. 平台边界

```text
Plugin domain / state / ScientificPlot
        ↓
PluginWorkspace semantic surfaces
        ↓
Core Presentation Model
     ┌──┴──┐
Desktop   Mobile Presenter
     ↓       ↓
Desktop   Mobile shell
```

禁止 `ctx.ui.desktop` / `ctx.ui.mobile`。输入统一映射为 Interaction Intent；Mobile Host 不允许通过 Desktop DOM/CSS 反向推断状态。
