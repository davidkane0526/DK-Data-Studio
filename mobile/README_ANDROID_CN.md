# Graphene Resonance Studio — React Native Android

这是 `plugin` 分支的 Android 可安装测试壳层。

## 技术结构

```text
React Native / Expo native shell
        ↓
react-native-webview
        ↓
离线 android_asset/grs/
        ↓
Graphene Resonance Studio plugin renderer
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

仓库根目录也提供 `GRS.cmd android-check`，可先检查 Node、Java、ANDROID_HOME、adb 与 Android SDK Platform 36。



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
GRS.cmd android-build
```

脚本会：

```text
mobile\npm install
→ sync:web
→ expo prebuild --platform android --clean
→ gradlew assembleDebug
```

输出：

```text
mobile-dist\Graphene-Resonance-Studio-debug.apk
```

这是 debug APK，可直接侧载到 Android 手机。

## USB 直接编译并安装

手机：

```text
开发者选项
→ USB 调试
```

USB 连接后运行：

```text
GRS.cmd android-run
```

或者先编译 APK，再运行：

```text
GRS.cmd android-install
```

## 手动命令

```bat
cd mobile
npm install
npm run sync:web
npx expo prebuild --platform android --clean
npx expo run:android
```

只生成 APK：

```bat
cd mobile
npm run sync:web
npx expo prebuild --platform android --clean
cd android
gradlew.bat assembleDebug
```

## EAS 云端 APK

`eas.json` 已包含：

```json
{
  "preview": {
    "distribution": "internal",
    "android": {
      "buildType": "apk"
    }
  }
}
```

安装 EAS CLI 并登录后：

```bat
cd mobile
npm run sync:web
eas build --platform android --profile preview
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
.grs-pointer-coarse
.grs-size-compact / medium / large
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
