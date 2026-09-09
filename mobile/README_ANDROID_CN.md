# DK Data Studio — React Native Android

这是 DK Data Studio 的 Android React Native 客户端源码。

## 技术结构

```text
React Native / Expo native shell
  ├─ model / theme
  ├─ header / navigation / status components
  ├─ sheets / native service UI
  └─ one shell style owner
        ↓
react-native-webview
        ↓
离线 android_asset/dkds/
        ↓
DK Data Studio plugin renderer
        ↓
src/science/* shared scientific engine
```

因此当前 Android 测试版不是“连接桌面端才能工作”的远程客户端。

正式入口会先把 `mobile/` 暂存到 `D:\PyDroidTemp`，再将当前仓库的 `src/`、插件和共享科学计算引擎打包成 Android 本地 assets。安装后可以离线打开软件，仓库内不会生成 `android/`、`node_modules/` 或 `assets/web/`。

## 当前版本基础

- Expo SDK 57
- React 19.2.3
- React Native 0.86.2
- react-native-webview 13.16.1
- New Architecture

## Windows 环境

仓库根目录也提供 `DKDS.cmd android-check`，可先检查 Node、Java、ANDROID_HOME、adb 与 Android SDK Platform 36。



建议：

1. Node.js 22.13 或更新的兼容版本。
2. Android SDK / Platform Tools。
3. Android Studio 可选。若系统没有 JDK，DKDS 会自动准备 Eclipse Temurin JDK 21。
4. `ANDROID_HOME` 和 `platform-tools` 的 `PATH` 均可由 DKDS 自动识别；工具会优先选择完整 SDK，也能识别仅安装了 Command-line Tools 的 SDK 根目录。
5. 执行 `android-build` 时，若缺少 Platform 36、Build-Tools 36.0.0、NDK 27.1.12297006 或 CMake 3.22.1，脚本会通过官方 `sdkmanager` 自动接受许可并安装固定版本。只想诊断而不安装时使用 `android-check`；需要禁止构建时自动补齐可设置 `DKDS_DISABLE_ANDROID_SDK_INSTALL=1`。

统一检查入口：

```bat
DKDS.cmd android-check
```

## 最简单：生成可直接安装的 APK

在仓库根目录双击：

```text
DKDS.cmd android-build
```

脚本会：

```text
自动发现或准备 Temurin JDK 21
→ 通过 sdkmanager 检查并补齐固定 Android SDK/NDK/CMake 组件
→ 将 mobile 源码暂存到 D:\PyDroidTemp
→ 复用 D:\PyDroidTemp 中的共享 node_modules
→ 运行移动架构测试和 TypeScript 检查
→ 创建/复用本机独立 release 签名
→ sync:web
→ expo prebuild --platform android（默认保留外部增量构建缓存）
→ gradlew assembleRelease --no-daemon --max-workers=4 -PreactNativeArchitectures=arm64-v8a
→ 校验 APK 内置移动运行时并输出大小与 SHA-256
```

Gradle 的 `--no-daemon` **并不保证完全不创建子 JVM**。Gradle 只有在当前 Launcher JVM 同时满足 Build JVM 的不可变参数和 instrumentation-agent 状态时，才会真正原进程执行。部分 Windows 安全策略会拒绝 Java→Java 子进程，从而出现 `CreateProcess error=5`。当前构建入口会读取生成的 `android/gradle.properties` 对齐 JVM 内存/编码参数，并在该次 no-daemon 构建中显式设置 `org.gradle.internal.instrumentation.agent=false` 与 `org.gradle.daemon=false`，使未加载 Gradle javaagent 的 wrapper client 与请求上下文保持一致。随后会先执行一次真实的 `gradlew help --no-daemon --info` 预检；只有确认没有出现 single-use Daemon 或 `Starting process 'Gradle build daemon'` 后才进入 `assembleRelease`。代理和共享 Gradle 缓存保持不变，临时 JVM 环境在构建结束后恢复。

输出：

```text
D:\PyDroidTemp\builds\dk-data-studio\DK-Data-Studio.apk
```

这是独立 release 签名的 APK，可直接侧载到 Android 手机。首次构建会在 `%LOCALAPPDATA%\DKDataStudio\android-signing` 生成本机 release 签名，后续自动复用。若希望以后生成的 APK 能覆盖安装当前版本，请备份该目录。 从旧签名版本迁移到本版本时，首次安装可能需要先执行 `adb uninstall com.dk.datastudio`；这会清除旧版应用数据，之后同一 release 签名下可正常覆盖升级。

默认构建不会删除 `D:\PyDroidTemp\builds\dk-data-studio-work\mobile\android`，Gradle/CMake/Metro 可以复用上一次的外部中间产物，因此修改 JS/CSS 后不必每次进行完整冷编译。仓库中的 `mobile/` 仍然不会出现生成文件。只有需要排查原生配置或缓存问题时才使用：

```bat
set DKDS_ANDROID_CLEAN=1
DKDS.cmd android-build
```

该变量只会清理 `D:\PyDroidTemp` 中经过路径校验的 Android 暂存工程，不会清理仓库源码。关闭当前命令窗口即可恢复默认增量模式。

## Windows 环境自动识别与 JDK 自动准备

`DKDS.cmd android-check` 会自动查找 Android SDK、`adb` 和已有 JDK，不要求它们预先全部写入 PATH。Android Studio 的内置 `jbr` 也会作为候选。

如果系统没有完整 JDK，DKDS 会从 Eclipse Adoptium 官方稳定 API 下载 Eclipse Temurin JDK 21，并校验官方 SHA-256 后解压到：

```text
%DK_TOOL_ROOT%\Java\temurin-21\current
```

这是用户目录中的 DKDS 私有工具链，不修改系统 Java 安装，也不要求管理员权限；后续 Android 构建直接复用。首次下载需要联网。若明确希望禁用自动准备，可设置 `DKDS_DISABLE_MANAGED_JDK=1`。

## USB 直接编译并安装

手机：

```text
开发者选项
→ USB 调试
```

USB 连接后运行：

```text
DKDS.cmd android-run
```

或者先编译 APK，再运行：

```text
DKDS.cmd android-install
```

## 命令行入口

若不使用 GUI，也请从仓库根目录调用 DKDS 工具，以确保使用同一套 release 签名：

```bat
DKDS.cmd android-build
DKDS.cmd android-run
DKDS.cmd android-install
```

也可以在 `mobile` 目录执行：

```bat
npm run apk:release
npm run android
```

这两个 npm 命令同样会转回 DKDS Windows 工具，不会绕过 release 签名流程。

## EAS 云端 APK

`eas.json` 的 `production` 已设置 `android.buildType = "apk"`，因此生产构建直接输出 APK。EAS 使用其自身管理的生产签名，不使用本机 DKDS 签名。

安装 EAS CLI 并登录后：

```bat
cd mobile
npm run sync:web
eas build --platform android --profile production
```

得到可直接安装的 APK。

## Native bridge

WebView 中的软件仍使用统一的 `window.electronAPI` 抽象。

Android 模式下：

```text
复制文本
保存 CSV
保存 JSON 工程
导出 SVG
导出 PNG
```

会通过 `window.ReactNativeWebView.postMessage()` 转给 React Native。

React Native 使用：

```text
expo-clipboard
expo-file-system
expo-sharing
Android Storage Access Framework 原生模块
```

执行系统级复制和“保存 / 分享”。

数据文件与工程文件优先通过原生 `ACTION_OPEN_DOCUMENT` 调用 Android Storage Access Framework，支持多文件、第三方文件管理器与云盘文档提供方；`ACTION_CREATE_DOCUMENT` 负责新建工程/导出文件，后续保存可继续写入持久 URI。选择时只向共享渲染器返回原生文件句柄，实际字节在解析某个文件时才按需读取，避免批量文件被一次性转换并占满内存。`expo-document-picker` 仅作为兼容回退。

React Native 原生壳负责：

- 竖屏底部导航和横屏窄侧栏；
- 工程状态与工程快捷操作；
- 从 Core 插件注册表动态生成的活动菜单；
- Android 返回键、前后台生命周期和 WebView 渲染进程恢复；
- 将插件 `ctx.ui.actions`（包括 TER 计算等命令）映射到原生“操作”面板；
- “更多”、插件管理、主题与保存/分享操作。

Android 被 Core 标识为 Native Client，不会被当作 LAN Web Client。APK 会自行启动随包离线工作区，不依赖桌面端或网页服务。

## SDK 插件在 Android 上的安装

插件管理器可以通过 Android 系统文档选择器安装 SDK 生成的同一个 `.dkplugin` 文件，不需要“转换成移动端插件”。包会在安装前校验文本包结构、安全相对路径、Plugin API 1.x、脚本/样式入口以及 true-TOP/tool 的工作区契约，然后保存到应用私有存储，由同一个 Core Plugin Kernel 加载。

- 算法 Provider、数据导入器、普通 workbench：直接复用共享注册表和科学引擎；
- `ctx.ui.actions`：自动进入原生“操作”面板；
- PRIMARY / PRIME / SUB：由统一移动布局映射；
- 使用 Electron/Node 私有 API、查找桌面按钮或只支持鼠标的插件：不能直接跨平台，需改用 Plugin API 的 host/platform/input 服务。

移动端自身直接启动离线原生壳工作区，不会把 `file://` 渲染器误报成网页端。“更多 → 在浏览器打开网页版”会按需启动只绑定 `127.0.0.1` 的本机 HTTP 服务，并在 Android 系统浏览器中打开独立网页版；它不会向局域网暴露，也不会改变 Native Client 身份。

## 当前 Android 交互原则

触摸屏会自动进入：

```text
.dkds-pointer-coarse
.dkds-size-compact / medium / large
```

并自动增加：
- 曲线命中宽度；
- 峰位命中半径；
- 最近曲线容差；
- 拖动阈值；
- 按钮触摸面积。

手机竖屏不应该强行缩成桌面布局；分析页和批量脉冲页面会改成无重叠的单列。PRIME 的 inline/float 保持原语义，竖屏 left/right 转为侧栏、bottom 保持底栏；横屏空间足够时恢复插件或用户选择的左/右/底部原位置。

## 已知测试阶段限制

1. 当前是 React Native 原生壳 + WebView 科学工作区，目的是先获得完整功能的可安装 Android 版本。
2. 文件导入依赖 Android 系统文档提供方；未注册到系统文档界面的文件管理器不会出现在来源列表中。
3. 大型 D3 科学图在低内存手机上可能比桌面慢。
4. Ctrl / 右键快捷路径在触摸端不能作为唯一操作方式；后续插件需继续增加长按/显式菜单。
5. Android APK 不使用桌面端 Electron 热更新机制。

## 后续原生化方向

不要重新写科学算法。

导航、工程命令、插件活动菜单和底部操作菜单已经由 React Native 承担。后续优先增强原生文件/工程浏览和参数设置表单。

科学图表/复杂数据交互可以继续使用 DOM/WebView，或按插件逐步替换为原生 React Native 图表。

## 紧凑壳层与文件访问

竖屏顶部合并为一个横向栏：先显示文字式项目标签和裸 `+`，随后固定显示 **导入 / 数据 / 工作区 / 分析 / 插件** 五个一级文字入口，再通过分隔线显示当前插件的 PRIMARY/PRIME/SUB 与操作按钮；插件按钮空间不足时自动收纳到“更多”。撤销 / 恢复 / 参数属于右侧当前工作区工具，不参与五个一级入口的顺序。绿色 Core 就绪圆点不再单独占位，载入状态由加载页和底部状态栏表达。

底部不再重复建立一排原生导航按钮；全局一级入口统一归入顶部文字命令栏。原桌面状态栏中的插件/系统状态项保留，并按可用宽度执行优先级收纳，展开面板置于 PRIME 之上。数据/参数抽屉支持点外部收起和拖边调宽，PRIME 左、右、底部面板使用加宽的边缘触摸分隔条调节尺寸。“更多”中提供按项目隔离的操作历史、撤销与重做。按住后向上或向左滑动分别映射为方向键上、方向键左。Android 手势导航指示条由沉浸式系统栏配置隐藏。

文件选择使用 Android Storage Access Framework 的系统文档界面，可显示设备文件、第三方文件管理器和已注册的云盘提供方。选择结果保留为 provider URI 句柄并申请持久读取权限，渲染器按需读取并在完成后释放；新建与保存使用可持久写入的文档 URI。系统选择器属于交互式长事务，不再使用会在用户选文件期间误报的 15 秒命令超时。
## v3.67.0 Presentation Architecture

移动端壳现在消费 Core Presentation Model 经 Mobile Presenter 输出的状态。Activity、PRIMARY/PRIME/SUB、Actions 与 Status 均来自 Core Registry / app-state provider，不再由 Mobile Host 通过桌面 DOM、CSS 可见性或页面 ID 反向推断。触摸手势由 Mobile Gesture Adapter 转为统一 Interaction Intent；Plugin API 仍只有一套。
