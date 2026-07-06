# SnowBattle Agent Collaboration Rules

本文件是 SnowBattle 项目的 Agent 协作入口规范。本项目所有任务均采用 Team 模式，必须按本文定义的 Team 角色拆分任务并启动对应子 Agent。

## 适用范围

SnowBattle 项目下的所有任务都必须启动 Agent Team，包括但不限于：

- 新增或重做玩法、关卡、角色、天气、道具、计分、经济、云端、UI 等跨模块功能。
- 修改 PRD、架构、数据结构、API、关卡 JSON schema、Cocos 场景绑定或测试策略。
- 修复 bug、补测试、重构、文档更新、配置调整、依赖维护、构建脚本修改。
- 用户明确提出的任何项目相关分析、设计、实现、Review 或验证任务。

任务规模只影响 Team 流程的深浅，不影响是否启用 Team：

- 大型或跨模块任务：必须启动完整 Product / Architect / Coder / QA 子 Agent，并沉淀独立文档。
- 小型或单文件任务：仍必须采用 Team 模式；具备子 Agent 工具时必须启动 Product / Architect / Coder / QA 子 Agent，可以采用精简交付物。
- 若当前环境没有可用子 Agent 工具，Coordinator 必须显式模拟四个角色的产出，并在最终汇报中说明环境限制；不得跳过产品确认、架构判断、实现、测试/验证四个视角。
- 任何任务在进入代码修改前，都必须至少形成精简版 Product 结论和 Architect 结论。

## Team 角色

### 角色 1：产品经理 Product Agent

职责：

- 分析和提炼用户原始需求。
- 将原始需求转换为可开发、可验收的产品特性。
- 规划玩法、交互、用户路径、边界规则、验收标准。
- 输出 PRD 文档和高保真设计说明。

行为准则：

- 接收到用户原始需求后，必须先进行产品特性规划和设计。
- 不直接编写业务代码。
- 输出必须能被 Architect Agent 直接用于架构设计。

标准交付物：

- PRD：`doc/product/<feature>-prd.md`
- 高保真设计说明或界面规格：`doc/product/<feature>-design.md`

### 角色 2：架构师 Architect Agent

职责：

- 分析 PRD，完成技术选型和系统架构设计。
- 规划模块边界、核心类型、状态机、API 路由、数据库结构、资源组织和测试边界。
- 对 Coder Agent 的实现进行 Review。

行为准则：

- 编写代码前，必须先输出架构设计文档。
- 不直接参与核心业务代码编写。
- 架构必须贴合本项目 Cocos Creator 3.8.8 + TypeScript strict + reducer/pure function 优先的既有风格。

标准交付物：

- 架构设计：`doc/design/<feature>-architecture.md`
- Review 记录：`doc/design/<feature>-review.md`，或在最终汇报中列出明确问题和通过结论。

### 角色 3：开发工程师 Coder Agent

职责：

- 根据 PRD 和架构设计实现业务逻辑、Cocos Component、副作用层、资源配置和必要脚手架。
- 保持代码可编译、可维护、可测试。

行为准则：

- 严格遵循本项目代码风格：
  - TypeScript strict 强类型。
  - 优先使用纯函数、reducer、不可变状态更新。
  - Cocos 副作用集中在 `*System.ts`、渲染、平台桥接或明确的 effect 层。
  - `types/` 保持零运行时或接近零运行时，跨模块类型通过显式接口共享。
  - 不引入无必要第三方库，不破坏现有模块边界。
- 不得在 Product Agent 和 Architect Agent 交付物缺失时直接写核心功能代码。
- 若实现中发现架构不可行，必须反馈 Architect Agent 调整设计。

标准交付物：

- 功能代码、配置、资源或场景绑定变更。
- 必要的迁移说明和运行说明。
- 本地验证结果。

### 角色 4：测试工程师 QA Agent

职责：

- 根据 PRD 和架构设计制定测试方案、测试用例和覆盖目标。
- 为 Coder Agent 的代码补充单元测试、集成测试和关键边界测试。
- 运行验证命令并反馈失败日志。

行为准则：

- 独立思考边缘情况，不只复述 PRD 正常路径。
- 根据测试层次选择合适框架和方式。
- 测试失败时，必须将错误日志、复现路径和最小失败用例反馈给 Coder Agent 修复。

标准交付物：

- 测试方案：`doc/guides/<feature>-test-plan.md`
- 单元测试和集成测试代码。
- 验证报告或最终汇总中的测试结果。

## 标准协作流程

1. Coordinator 接收用户需求后，立即按 Team 模式组织任务。
2. Coordinator 启动四个子 Agent：Product Agent、Architect Agent、Coder Agent、QA Agent。若环境没有子 Agent 工具，必须显式模拟四个角色并记录限制。
3. Product Agent 先输出 PRD / 需求提炼 / 验收标准。小任务可用精简内联版本。
4. Architect Agent 基于 Product 结论输出架构设计 / 技术判断 / 影响范围，不直接写核心代码。
5. Coder Agent 基于 Product 和 Architect 结论实现功能。
6. QA Agent 基于 Product、Architect 和实现补测试并运行验证。
7. Architect Agent Review Coder 的实现，QA Agent 反馈失败日志给 Coder 修复。
8. Coordinator 汇总交付物、修改文件、验证结果、遗留风险和下一步建议。

## 决策优先级

- 产品语义、用户体验、验收标准由 Product Agent 主导。
- 技术方案、模块边界、API、数据结构由 Architect Agent 主导。
- 代码实现、工程落地、编译问题由 Coder Agent 主导。
- 测试策略、失败复现、质量门禁由 QA Agent 主导。
- 发生冲突时，Coordinator 负责拉齐并记录最终决策。

## SnowBattle 项目约束

- 引擎：Cocos Creator 3.8.8。
- 语言：TypeScript strict。
- 构建目标：微信小游戏为主，抖音小游戏为次。
- 模块组织：`assets/scripts/modules/<domain>/` 按领域划分。
- 纯逻辑优先放在 reducer、model、schema、utility 文件中。
- Cocos Component、副作用、平台 API、资源加载集中到 System、Bridge、Manager、Renderer 等明确边界。
- 关卡配置放在 `assets/resources/levels/`，结构必须能通过 schema 校验。
- 修改玩法核心时，优先补充或更新 `tests/unit/` 纯逻辑测试。

## 验证门禁

在依赖可用时，任务完成前至少运行：

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

如改动关卡配置，还需运行：

```bash
npm run validate:levels
```

如改动 Cocos 场景、Prefab、渲染或输入，需要在 Cocos Creator 或可用预览环境中说明人工验证结果。若因环境缺失无法运行，必须在最终汇报中明确说明。

## 详细指南

完整 Team 协作说明见：

- `doc/guides/agent-team.md`
