# GRS 开发工具箱

根目录只保留两个 Windows 入口：

```text
GRS_GUI.cmd   推荐：图形界面
GRS.cmd       命令行统一入口
```

## GRS_GUI.cmd

双击后按用途分为：

- 常用：启动开发版、安装/修复依赖、工具环境诊断、完整检查、测试、Windows 构建、打开目录
- Android：环境检查、构建 APK、连接设备运行、安装 APK
- 局域网更新：启动服务器、发布、构建并发布、自启动管理
- 插件与维护：插件索引、插件校验、工程检查、示例目录

长时间构建动作会打开独立 PowerShell 窗口，因此 GUI 不会因为 Gradle / electron-builder 输出而假死。

## GRS.cmd

不带参数会显示文本菜单：

```bat
GRS.cmd
```

也可以直接执行：

```bat
GRS.cmd dev
GRS.cmd install-deps
GRS.cmd doctor
GRS.cmd check
GRS.cmd test
GRS.cmd build-windows
GRS.cmd android-check
GRS.cmd android-build
GRS.cmd android-run
GRS.cmd android-install
GRS.cmd update-server
GRS.cmd publish-update
GRS.cmd build-publish-update -Version 3.20.0-plugin.3
GRS.cmd update-autostart-install
GRS.cmd update-autostart-remove
GRS.cmd plugin-index
GRS.cmd plugin-validate
```

所有实际逻辑都在 `tools/windows/grs-tools.ps1`，不要再新增一个功能一个 CMD。

## Windows PowerShell 兼容性

`tools/windows/*.ps1` 以 UTF-8 BOM 保存，以兼容 Windows PowerShell 5.1 的中文脚本读取。命令执行器使用显式 `-Arguments` 参数，不要改回 `$Args`；WinForms 布局也不要再使用依赖表达式解析的 `New-Object System.Drawing.Point(...)` 绝对坐标写法。
