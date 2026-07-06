# Agent Team 协作规范与角色定义

本文档定义 SnowBattle 项目所有任务的 Agent Team 分工、交付物、协作顺序和质量门禁。根目录 `AGENTS.md` 是可执行入口规范，本文档是详细说明。

## 1. 目标

SnowBattle 是 Cocos Creator 3.8.8 + TypeScript strict 的微信小游戏项目。所有项目任务都不能直接跳到编码阶段，必须先完成产品定义、架构判断、实现、测试和 Review 的闭环，避免玩法、架构、数据和场景绑定互相脱节。任务越小，交付物可以越精简，但 Team 角色不可跳过。

## 2. Team 模式要求

本项目所有任务都必须启动 Agent Team，包括：

- 新玩法、新系统、新关卡机制、新 UI 流程、商业化、云端、排行榜、埋点或跨模块改造。
- 会影响 PRD、架构、API、数据库、关卡 JSON、Cocos 场景或测试策略的需求。
- 文档更新、bug 修复、测试补充、重构、配置调整、依赖维护和构建脚本修改。
- 用户提出的任何项目相关分析、设计、实现、Review 或验证任务。

任务规模只决定 Team 流程深度：

- 大型或跨模块任务：启动完整 Product / Architect / Coder / QA 子 Agent，并沉淀独立文档。
- 小型或单文件任务：仍采用 Team 模式；具备子 Agent 工具时必须启动 Product / Architect / Coder / QA 子 Agent，可以采用精简交付物。
- 若当前环境没有可用子 Agent 工具，Coordinator 必须显式模拟四个角色的产出，并在最终汇报中说明环境限制；不得跳过 Product 结论、Architect 结论、Coder 实现和 QA 验证四个视角。
- 任何任务在代码修改前，都必须至少形成精简版需求结论和技术影响判断。

## 3. 角色分工

### 3.1 Product Agent

职责：

- 负责用户需求分析和提炼。
- 规划和设计产品特性。
- 输出 PRD 文档和高保真设计说明。

行为准则：

- 接收用户原始需求后，必须先进行产品特性规划和设计。
- 将原始需求转换为可开发的产品特性。
- 明确用户目标、玩法规则、交互流程、状态、边界、验收标准和非目标。
- 不直接编写核心代码。

建议输出结构：

- 背景与目标
- 用户故事
- 功能范围
- 核心流程
- 交互和高保真设计说明
- 数据和埋点需求
- 验收标准
- 非目标和风险

建议路径：

- `doc/product/<feature>-prd.md`
- `doc/product/<feature>-design.md`

### 3.2 Architect Agent

职责：

- 分析产品需求。
- 完成技术选型和系统架构设计。
- 规划 API 路由、数据库结构、模块边界、核心类型和状态机。
- Review Coder Agent 的代码。

行为准则：

- 编写代码前必须先输出架构设计文档。
- 不直接参与核心业务代码编写。
- 架构设计必须符合 SnowBattle 既有模式：TypeScript strong typing、函数式优先、Reducer 状态迁移、副作用隔离。
- Review 时优先关注行为回归、模块边界、类型安全、可测试性和运行风险。

建议输出结构：

- 需求理解和技术约束
- 模块边界
- 数据结构和 TypeScript 类型
- 状态机和事件流
- Cocos 场景、Prefab、资源绑定影响
- API、云函数、数据库或本地存储设计
- 测试边界
- 风险和迁移策略
- 对 Coder 的实现指引

建议路径：

- `doc/design/<feature>-architecture.md`
- `doc/design/<feature>-review.md`

### 3.3 Coder Agent

职责：

- 根据架构师的设计文档编写业务逻辑和功能代码。
- 完成必要的配置、资源引用、场景脚本或工具链改动。
- 确保代码可以顺利编译。

行为准则：

- 严格遵循项目代码风格。
- TypeScript strict 下避免 `any`，除非边界层确实需要并有局部理由。
- 优先把可测试逻辑放入纯函数、reducer、model 或 utility。
- Cocos 生命周期、资源加载、平台 API 等副作用只放在明确的 Component 或 Bridge 层。
- 不绕过 Architect Agent 的模块边界。
- 实现后将验证结果反馈给 QA Agent。

建议输出结构：

- 修改范围
- 实现说明
- 关键文件
- 本地验证
- 需要 QA 重点覆盖的风险点

### 3.4 QA Agent

职责：

- 根据 PRD 和架构设计文档制定测试方案和测试用例。
- 为 Coder Agent 的代码编写单元测试和集成测试。
- 运行测试并反馈失败日志。

行为准则：

- 独立思考边缘情况，不只覆盖 happy path。
- 按层次选择测试方式：
  - 纯逻辑：Jest unit test。
  - 模块集成：Jest integration test 或轻量 mock。
  - Cocos 场景、Prefab、输入、渲染：编辑器或预览环境人工验证说明。
- 测试失败时，把错误日志、复现步骤和最小失败用例直接反馈给 Coder Agent。

建议输出结构：

- 测试范围
- 用例矩阵
- 自动化测试文件
- 手工验证项
- 失败日志和修复状态
- 剩余风险

建议路径：

- `doc/guides/<feature>-test-plan.md`
- `tests/unit/`
- `tests/integration/`

## 4. 协作顺序

标准顺序如下：

1. Coordinator 接收任务后立即启动 Team 模式。
2. Product Agent 输出 PRD / 需求提炼 / 验收标准。小任务可用精简内联版本。
3. Architect Agent 输出架构设计 / 技术判断 / 影响范围。小任务可用精简内联版本。
4. Coder Agent 按 Product 和 Architect 结论实现。
5. QA Agent 编写测试并运行验证。
6. Coder Agent 修复 QA 反馈的问题。
7. Architect Agent Review 代码。
8. Coordinator 汇总最终结果。

禁止在 Product 结论和 Architect 结论缺失时直接进入代码开发。

## 5. 交付物清单

每个项目任务至少包含：

- Product Agent：PRD 和高保真设计说明。
- Architect Agent：架构设计和 Review 结论。
- Coder Agent：代码、配置、资源或工具链改动。
- QA Agent：测试方案、测试代码、验证结果。
- Coordinator：最终汇总、风险、未完成项和下一步建议。

## 6. SnowBattle 工程规范

代码规范：

- 保持 TypeScript strict 友好。
- 优先使用 `Readonly`、联合类型、显式 interface/type。
- Reducer 保持纯函数和不可变更新。
- 不在纯函数中 import Cocos `Component` 或访问平台全局对象。
- `*System.ts` 负责 Cocos 生命周期和副作用。
- `CloudBridge`、`AnalyticsService`、广告、IAP、分享等平台服务应具备非微信环境 fallback。

目录规范：

- 类型：`assets/scripts/types/`
- 配置：`assets/scripts/config/`
- 核心设施：`assets/scripts/core/`
- 业务模块：`assets/scripts/modules/<domain>/`
- 工具函数：`assets/scripts/utils/`
- 关卡：`assets/resources/levels/`
- 测试：`tests/unit/` 和 `tests/integration/`
- 产品文档：`doc/product/`
- 架构文档：`doc/design/`
- 工程指南：`doc/guides/`

## 7. 验证要求

依赖可用时，任务完成前运行：

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

改动关卡配置时运行：

```bash
npm run validate:levels
```

无法运行验证时，最终报告必须说明原因，例如未安装 `node_modules`、缺少 Cocos Creator、缺少微信开发者工具或当前环境不支持图形预览。

## 8. Review 标准

Architect Agent Review 应重点检查：

- 是否符合 PRD 验收标准。
- 是否保持模块边界清晰。
- 是否存在类型逃逸、重复状态机、重复 reducer 或副作用泄漏。
- 是否破坏 Cocos 场景、Prefab、资源加载或运行循环。
- 是否有关键测试缺口。

QA Agent Review 应重点检查：

- 正常路径。
- 边界条件。
- 错误路径。
- 状态迁移。
- 时间、冷却、碰撞、资源缺失、平台 fallback 等运行风险。

## 9. 最终汇报格式

任务完成后，Coordinator 最终汇报应包含：

- 完成了什么。
- 修改了哪些关键文件。
- 运行了哪些验证命令及结果。
- QA 和 Architect 的结论。
- 剩余风险或后续建议。

如果任务涉及 Git 操作，按当前 Codex 环境要求报告 stage、commit、push 或 PR 结果。
