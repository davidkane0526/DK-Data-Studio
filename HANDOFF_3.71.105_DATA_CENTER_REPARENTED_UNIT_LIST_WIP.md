# HANDOFF — DK Data Studio 3.71.105 WIP

## 本轮目标

修复移动端 Data Center 在项目恢复后出现的异常：左侧已经显示“数据对象 86 个”，中央数据表也能够显示恢复数据，但对象条目内容仍不可见。同时保持 3.71.104 已修复的参数 Drawer 下拉菜单交互合同。

## 最终根因

项目数据本身没有丢失。计数和中央 DataTable 能正常恢复已经证明 Artifact Store 与项目解析链正常。

真正缺口位于 **可重排 PRIME 与动态 List Unit 的实例所有权**：Mobile Presenter 会把 `data-control` PRIME 从插件页面真实 reparent 到顶层 Drawer，而旧 Data Center 运行时仍可能通过 page / global ID selector 重新查找 `#dcArtifactList`。在 reparent、重挂载或存在旧同 ID 节点时，后续刷新无法保证命中 Unit 创建并当前可见的同一个列表实例。

与此同时，旧 List Unit 只提供裸 DOM 容器，动态集合的 staging、replaceChildren、title/meta/leading anatomy 仍由插件自己管理。这与“Presenter 可以移动 Surface、Unit 保持稳定身份”的架构目标不一致。

## 3.71.105 修复

### 1. List Unit 成为 retained dynamic collection owner

`units.list.create()` 现在返回稳定 List handle，而不仅是裸 element。正式能力包括：

- `element`
- `item(spec)`
- `items()`
- `setItems(items)`

`setItems()` 由 Core Unit 在离屏 stage 中完整物化条目，再原子替换 live list 内容。因此插件不再自己管理动态列表 DOM 提交。

### 2. ListItem 正式 anatomy

ListItem Unit 新增 Core-owned anatomy：

- `leading`
- `title`
- `meta`

Core 创建并拥有：

- `.dkds-list-item-leading`
- `.dkds-list-item-content`
- `.dkds-list-item-title`
- `.dkds-list-item-meta.dkds-meta`

插件只声明内容和局部语义，不再复制通用列表 typography / anatomy。

### 3. Data Center 保留 Unit 实例身份

Data Center Unit presentation 返回 `artifactListUnit` retained handle。feature runtime 始终使用该实例：

- 不再重新通过 page/global `#dcArtifactList` 查询动态列表；
- Presenter reparent 到 Drawer 后仍更新同一 List Unit；
- `renderArtifacts()` 只消费 bounded metadata；
- 完整 Artifact 仅在真正需要科学数据时读取；
- checkbox/title/meta 通过 ListItem spec 提交；
- catalog 更新通过 `artifactListUnit.setItems()` 原子完成。

专项测试显式构造“原页面存在旧同 ID 列表，而真实 List Unit 已被 Presenter reparent 到 Drawer”的场景，并确认更新只能进入 retained Unit 实例。

### 4. 3.71.104 Drawer popup 合同保持

Drawer 中 portaled select/context popup 继续作为 Drawer 的逻辑交互子树。点击 popup 条目不会触发 outside-tap 关闭 Drawer。

## 架构意义

本轮没有增加 Data Center 专用 Unit，也没有增加插件 ID 条件分支。Unit Catalog 仍为 **41 Units**，Layout recipes 仍为 **73**。

这一步把动态列表从“插件自己维护 DOM，Presenter 可能移动它”提升为“Unit 自己保持实例身份并拥有集合更新”。这更适合未来通过 Python/SDK 直接描述插件 UI：插件只需要提供条目数据，不需要知道 Surface 最终被 Presenter 放在哪里，也不需要自己维护 DOM 生命周期。

## 版本

- App: **3.71.105**
- Android versionCode: **245**
- SDK: **1.51.43**
- Plugin API: **1.19.0**
- Unit Templates: **2.5.38**
- Data Center: **1.15.37**

## 最终验证

在最终源码上完成：

- Main manifest: **499 / 499 PASS**
- Check manifest: **505 / 505 covered**
  - 499 shared main cases
  - 11 check-only cases
- Mobile: **131 / 131 PASS**
- clean-source Mobile（先删除全部 `src/generated`，再从源码 bootstrap）: **131 / 131 PASS**
- Static Visual Invariants: **87 / 87 PASS**
- SDK Harness: **PASS**
- Scientific parity: **PASS**
- Plugin Boundary: **0**
- Architecture Hygiene: **0 violations**
- Unit runtime/style ownership: **0 violations**
- Native Analysis strict audit: **0 violations**
- Unit semantic/cascade audit: **0 violations**
- Unit responsive/density audit: **41 Units / 73 recipes PASS**
- Plugin manifests/packages: **17 PASS**
- authored CSS: **44 files / 0 `!important`**

Clean-source 验证已从 `src/generated = 0` 开始，runtime / SDK authoring / plugin index 能自行重建，随后 Mobile 131/131 再次通过。

## 实机验收状态

**仍为 WIP。** 自动化和 clean-source bootstrap 已通过，但尚未把 Android 实机上的“86 个对象条目文字实际可见”冒充为已验收。

实机优先验证：

1. 使用原来能复现“数据对象 86 个但列表内容不可见”的项目，不清应用数据；
2. 打开 Data Center 的数据 Drawer；
3. 确认 86 个对象对应的条目标题/元信息实际可见；
4. 滚动和筛选后条目保持正常；
5. 参数 Drawer 中打开下拉菜单并选择条目，Drawer 仍保持打开。

只有实机确认通过后，才进入下一阶段的 **41 Unit 全插件覆盖 / 零特异化审计**。
