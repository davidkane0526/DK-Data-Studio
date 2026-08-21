# 工具类插件（Plugin API 1.15）

工具类插件用于提供轻量、跨工作台的通用命令，例如数据清理、单位转换、批处理辅助、文本/路径工具或其他不需要独立分析工作台的功能。

## Manifest

```json
{
  "pluginType": "tool",
  "apiVersion": "1.15.0",
  "requiresCore": ["ui.menus"]
}
```

`pluginType: "tool"` 是正式插件类别。Core 会为工具类插件提供默认图标，并把其菜单贡献统一归入应用顶部的“工具”下拉菜单。

## 注册工具动作

工具插件应注册命令，再把命令贡献给 Core 菜单：

```js
ctx.commands.register('com.example.tool.run', () => {
  // 执行工具逻辑
});

ctx.ui.menus.add({
  id: 'run',
  label: '运行工具',
  command: 'com.example.tool.run'
});
```

工具插件不需要自行创建顶层“工具”按钮，也不应直接操作顶部工具栏 DOM。对于 `pluginType: "tool"`，省略 `menu` 时 `ctx.ui.menus.add()` 默认进入顶部“工具”菜单。

## 与 Workbench / Algorithm 的区别

- `tool`：轻量通用工具，通过顶部“工具”菜单调用。
- `workbench`：有独立分析工作区，通常消费指定类型的数据 Artifact。
- `algorithm`：提供可版本化科学算法 Provider，本身不要求拥有 UI。

工具插件如需调用算法，应通过 `ctx.analysis.algorithms` 使用已注册 Provider，而不是复制算法实现。

## 默认图标

插件可声明自己的 `icon`。未声明时 Core 根据 `pluginType` 自动提供默认 icon；因此默认 icon 不是插件安装或运行的必填项。

完整示例见 `sdk/templates/tool-plugin/`。
