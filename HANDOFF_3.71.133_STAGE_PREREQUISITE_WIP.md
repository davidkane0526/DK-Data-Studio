# DK Data Studio — HANDOFF 3.71.133 WIP

## 基线与版本

从已发布 dev 3.71.132 / 67340626b5dff6b9e8c201381fd55f0c4aa7e615 重建；此前 3.71.133 本地 WIP 不在当前环境内。

目标 App 3.71.133 / SDK 1.51.90 / Plugin API 1.19.0 / Unit Templates 2.5.38 / Android versionCode 273。

## 当前改动

1. sdk/python/dkds_source_import.py：从已有 canonical Artifact Stage DAG 构造 dkds.stage-execution-plan.v1；Stage 包含 stageId/actionId/taskId、prerequisiteStageIds、prerequisiteTaskIds、expectedArtifacts。
2. sdk/python/dkds_plugin_gen.py：校验该合同与现有 Core Task 的一一对应关系；生成单个共享 Stage Action prerequisite scheduler。
3. 执行时递归完成前置 Stage，保留 Core Task Runner 和 ArtifactStore；在同一执行链和并发链内去重；失败或 Artifact 缺失/类型不符立即中止下游。
4. 前置 Stage 执行 Task 但不触发非目标的剪贴板/CSV Host effects；单独点击 Stage 保留原效果。
5. 不使用过往 Artifact 进行跨次缓存，动态参数和数据源每次重新计算。
6. 非 DAG Python 单任务插件不生成 scheduler；未添加 Run All，以遵守 8 Action 公共合同。
7. 新增 tests/test-phase-f-prerequisite-scheduling.js；将历史 multi-action、artifact stage chaining 和 typed boundary 测试加入统一 test manifest。

## 验证状态

**WIP，未把未经验证的内容宣称为通过。**

待执行完整 Phase F generator regression、npm test/check、架构门禁、Windows Run project checks / Windows process-tree exit 与 Android arm64 build + APK verify。

若遇到 CI 失败，优先核查测试执行时 Task handler 返回、artifact metadata 的 exact 校验、Stage fan-in 和 Host effect suppression。不得以移除测试或降低 Core 约束的方式通过门禁。

## 永久要求

保留唯一 Core Task Runner、ArtifactStore、Unit/Presenter/Workspace ownership；不写插件 ID 特化、私有 CSS、第二套 Notebook 隐藏状态。

## 交付门槛

完成后核对 dev HEAD 的精确提交 SHA，Windows Portable、Android APK 与 Release 绑定一致，Windows Actions 清洁项目 ZIP 内仅此最新 HANDOFF。