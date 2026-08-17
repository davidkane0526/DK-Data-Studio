# GRS 局域网更新指南

推荐不再寻找多个 CMD。根目录只使用：

```text
GRS_GUI.cmd   图形化开发/构建工具
GRS.cmd       命令行统一入口
```

## 图形界面

双击 `GRS_GUI.cmd`，进入“局域网更新”页：

- 启动更新服务器
- 发布已有构建
- 输入版本号后“构建并发布”
- 安装/移除更新服务器自启动

## 命令行等价操作

```bat
GRS.cmd update-server
GRS.cmd build-windows
GRS.cmd publish-update
GRS.cmd build-publish-update -Version 3.20.0-plugin.2
GRS.cmd update-autostart-install
GRS.cmd update-autostart-remove
```

服务实现位于：

```text
services/update-server/
```

发布内容位于：

```text
services/update-server/storage/releases/<version>/
```

当前仍是可信局域网简化模式：没有发布签名密钥；安装包由 `electron-updater` 按 `latest.yml` 中的 SHA512 校验完整性。不要把 TCP 45880 暴露给不可信互联网。
