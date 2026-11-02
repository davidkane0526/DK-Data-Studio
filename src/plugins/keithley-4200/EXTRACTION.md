# 4200A 独立模块迁移计划（可验证的依赖清单）

本功能可能在未来从 DK Data Studio 中整体剥离为单独软件。这里记录当前实现的真实边界；**目前尚未完成独立 APK/EXE 的构建和运行**。

## 可直接迁移的逻辑

- `kxci-protocol.js`：只读 `*IDN? + NUL` 指令和身份解析。不依赖操作系统、Electron、React Native 或仪器输出命令，同时通过 CommonJS 提供独立 Node.js 调用。
- `measurement-model.js`：**仅仿真**参数验证和曲线数据，且可作为独立 Node.js 模块导入。不能宣称为实机测量功能。
- `plugin.js`：依赖 DKDS 插件服务、模块、项目持久化、界面与通用 TCP 适配接口。独立软件应替换适配器，不应复制整个 DKDS 主程序。

## 需要适配而不是直接复制的依赖

- Windows：`desktop/main-modules/tcp-runtime.js` 通用 TCP，`instrument-tcp-ipc.js` Electron IPC，`lan-kxci-relay.js` 对平板的只读 HTTP 中继。独立程序可复用纯 TCP 策略，但 IPC 和 UI 应重新注入。
- Android：`DkdsKeithleyEthernet.template` USB Ethernet 连接时按需恢复链路本地地址与单目标策略路由；`DkdsLanKxci.template` 只读网关；`withDkdsAndroidNativeHost.js` Expo/React Native 模块集成。剥离后应把两个模板移入独立 Android 模块，消除对 DKDS 通用 Native Host 的依赖。
- 安全和数据：当前中继只允许 `*IDN?\\0`；真实测量、输出电压、仪器原生文件和原生图像尚未实现。不得把模拟数据标注为原始数据。

## 防止未来剥离困难

1. 4200 专属协议只留在 `src/plugins/keithley-4200`，通用网络服务不写入 Keithley 型号、序列号或实验参数。
2. 连接凭据和实验配置独立保存，**未来迁移不得从主程序复制其他用户数据**。配对 Key 不应写进持久配置。
3. 独立应用须同时完成 Android 无 Root 网络能力、可选 Root 适配、Windows 有线/Wi-Fi、平板中继和设备通信回归。
4. 删除 4200 插件后应确保 DKDS 主程序其他页面、通用 TCP 服务和数据中心正常运行。
5. 参见 `extraction-manifest.json` 的跨平台文件清单。CI 验证模块加载、协议字节和 Windows 网卡策略；它们不能代替真正仪器的实机测试。


## 已可运行的源码级独立验证（只读）

现在不仅能导出源码，还能在 **Node.js 20+** 中完全不加载 DK Data Studio、
Electron 或 React Native，运行独立的 `tools/4200-extract/identify.js`。
此工具只允许显式 `--identify`，且只发送 `*IDN?\\0`，不会配置 SMU、电压、限流或写入数据。

在 DKDS 仓库根目录执行：

```powershell
node .\tools\4200-extract\extract.js --output "$env:TEMP\dkds-4200-standalone"
node "$env:TEMP\dkds-4200-standalone\tools\4200-extract\identify.js" --help
node "$env:TEMP\dkds-4200-standalone\tools\4200-extract\identify.js" --identify --host 169.254.111.118 --port 1225 --mode ethernet --serial 1498377
```

提取目录必须为空或不存在；它只包含独立功能需要的文件，且不会启动后台代理。
Windows 有线模式仍要求网卡具备可用 IPv4、正确的系统路由及仪器正在运行 KXCI。
若仅查看说明或离线验证，请只运行 `--help` 或 CI 测试，不连接任何物理仪器。

`tests/test-keithley-4200-standalone.js` 会从实际提取目录启动此命令，对本地仿真
TCP 服务发送字节 `2A 49 44 4E 3F 00` 并验证身份响应。它不访问真实设备。

**边界**：这证明独立的只读 CLI 已能运行，并不意味着 GUI、Android 或真实测量控制已完整剥离。
