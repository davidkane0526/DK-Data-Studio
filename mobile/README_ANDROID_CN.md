# DK Data Studio — React Native Android

这是 `plugin` 分支的 Android 可安装测试壳层。

## 技术结构

```text
React Native / Expo native shell
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

`npm run sync:web` 会把当前仓库的 `src/`、插件和共享科学计算引擎打包成 Android 本地 assets。安装后可以离线打开软件。

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
2. JDK 17。
3. Android Studio。
4. Android SDK / Platform Tools。
5. 设置：
   ```text
   ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
   ```
6. `platform-tools` 加入 `PATH`。

可检查：

```bat
node --version
java -version
adb version
echo %ANDROID_HOME%
```

## 最简单：生成可直接安装的 APK

在仓库根目录双击：

```text
DKDS.cmd android-build
```

脚本会：

```text
mobile\npm install
→ 创建/复用本机独立 release 签名
→ sync:web
→ expo prebuild --platform android --clean
→ gradlew assembleRelease
```

输出：

```text
mobile-dist\DK-Data-Studio.apk
```

这是独立 release 签名的 APK，可直接侧载到 Android 手机。首次构建会在 `%LOCALAPPDATA%\DKDataStudio\android-signing` 生成本机 release 签名，后续自动复用。若希望以后生成的 APK 能覆盖安装当前版本，请备份该目录。 从旧签名版本迁移到本版本时，首次安装可能需要先执行 `adb uninstall com.dk.datastudio`；这会清除旧版应用数据，之后同一 release 签名下可正常覆盖升级。

## Windows 环境自动识别

`DKDS.cmd android-check` 会自动查找 Android SDK、`adb` 和 JDK，不要求它们预先全部写入 PATH。Android Studio 的内置 `jbr` 也会作为 JDK 候选。如果最终仍提示没有完整 JDK，则机器上确实缺少可运行 Gradle 的 Java 环境。

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
```

执行系统级复制和“保存 / 分享”。

数据文件与工程文件现在通过 `expo-document-picker` 调用 Android 系统文档选择器；支持多文件选择，并将原始字节传回现有编码解析逻辑。

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

手机竖屏不应该强行缩成桌面布局；分析页和批量脉冲页面会改成单列。

## 已知测试阶段限制

1. 当前是 React Native 原生壳 + WebView 科学工作区，目的是先获得完整功能的可安装 Android 版本。
2. 文件导入依赖 Android WebView 文件选择器。
3. 大型 Plotly 图在低内存手机上可能比桌面慢。
4. Ctrl / 右键快捷路径在触摸端不能作为唯一操作方式；后续插件需继续增加长按/显式菜单。
5. Android APK 不使用桌面端 Electron 热更新机制。

## 后续原生化方向

不要重新写科学算法。

未来逐步把：
- 顶部导航；
- 文件工作区；
- 插件管理；
- 设置；
- 底部操作菜单

转成 React Native 原生组件。

科学图表/复杂数据交互可以继续使用 DOM/WebView，或按插件逐步替换为原生 React Native 图表。
