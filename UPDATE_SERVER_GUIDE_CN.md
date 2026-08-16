# Graphene Resonance Studio v3.14 局域网热更新：最简单用法

v3.8 开始采用 **可信局域网简化模式**。

不再需要：

- 公钥
- 私钥
- Ed25519
- `SETUP_UPDATE_KEYS.cmd`
- `grs-release.sig`
- 记住或备份任何密钥

更新链路只有：

```text
服务器启动
→ 局域网自动发现
→ WebSocket 推送新版本
→ 客户端读取 latest.yml
→ electron-updater 下载
→ SHA512 校验安装包完整性
→ 用户点击“保存工程并重启安装”
```

> 这个模式适合你自己的实验室、办公室、宿舍等可信局域网。
> 它不提供“谁有资格发布更新”的密码学身份认证。
> 因此不要把更新服务器端口直接暴露到不可信公网。

---

## 一、第一次给同学安装当前 v3.14

由于旧 v3.7 客户端仍然要求 Ed25519 签名，而你已经不再保留旧密钥，
**从旧 v3.7 切到新 v3.8 需要人工安装一次新的 Setup。**

在你的电脑运行：

```text
BUILD_WINDOWS.cmd
```

构建完成后，把：

```text
dist\Graphene Resonance Studio-Setup-3.14.0.exe
```

发给同学安装。

从 v3.8.0 开始，以后的 3.14.1、3.14.2、3.14.0……就可以走新的无密钥局域网热更新。

---

## 二、启动更新服务器

在你的工程目录直接双击：

```text
START_UPDATE_SERVER.cmd
```

第一次如果没有 `node_modules`，它只会自动执行：

```text
npm install
```

然后直接启动服务器。

**不会再生成任何 key。**

默认：

```text
HTTP / WebSocket:
TCP 45880

自动发现:
UDP 239.255.42.99:45881
```

服务器状态页：

```text
http://你的电脑IP:45880/
```

例如：

```text
http://192.168.1.100:45880/
```

---

## 三、以后怎么发布更新

假设同学现在装的是：

```text
3.8.0
```

你修改程序后，运行：

```text
BUILD_AND_PUBLISH_UPDATE.cmd 3.14
```

当前是 3.14.0 时，`3.9` 会自动解析成：

```text
3.14.1
```

以后再运行：

```text
BUILD_AND_PUBLISH_UPDATE.cmd 3.14
```

就会成为：

```text
3.14.2
```

也可以精确指定：

```text
BUILD_AND_PUBLISH_UPDATE.cmd 3.14.3
```

脚本会自动：

```text
设置版本号
→ 构建 NSIS Setup / Portable
→ 生成 latest.yml 和 blockmap
→ 复制到 update-server\storage\releases\<version>\
→ 更新 current.json
→ 正在运行的服务器 WebSocket 推送
```

没有签名步骤，没有密钥步骤。

---

## 四、同学那边会发生什么

同学打开软件后会自动寻找局域网服务器。

发现新版本后：

```text
发现 3.14.1
→ electron-updater 读取 latest.yml
→ 下载 Setup
→ 按 latest.yml 中 SHA512 校验下载文件
→ 更新按钮提示“更新已就绪”
```

同学点击：

```text
保存工程并重启安装
```

即可。

---

## 五、如果自动发现不到

让同学打开软件：

```text
更新
→ 服务器设置
```

填写你的 IP，例如：

```text
http://192.168.1.100:45880
```

保存即可。

所以如果你想让流程最稳定，建议你的更新服务器电脑在路由器里使用固定局域网 IP。

---

## 六、Windows 防火墙

服务器电脑允许“专用网络”：

```text
TCP 45880
UDP 45881
```

如果 Windows 第一次运行 Node.js 时弹防火墙提示，允许：

```text
专用网络
```

即可。

---

## 七、最简单的日常流程

### 你

平时服务器：

```text
START_UPDATE_SERVER.cmd
```

改完软件：

```text
BUILD_AND_PUBLISH_UPDATE.cmd 3.14
```

### 同学

第一次安装：

```text
Graphene Resonance Studio-Setup-3.8.0.exe
```

以后：

```text
什么都不用做
→ 软件自动发现
→ 自动下载
→ 点击“保存工程并重启安装”
```

---

## 八、安全边界

v3.8 是为了简化实验室内部使用而采用的“可信 LAN”方案。

仍然保留：

- electron-builder `latest.yml`
- 安装文件 SHA512 完整性校验
- NSIS updater
- 不允许版本降级
- 版本专属 release 目录
- 原子发布目录
- HTTP Range
- WebSocket 推送
- multicast 自动发现

不再保留：

- Ed25519 发布者身份认证
- 私钥/公钥

因此：

```text
不要把 TCP 45880 暴露到互联网
不要连接陌生人提供的 update server URL
```

在你自己和同学共用的可信局域网里使用即可。
