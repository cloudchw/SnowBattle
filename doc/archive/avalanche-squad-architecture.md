# 《雪炮突击队》（Avalanche Squad）架构设计文档

| 字段 | 值 |
|---|---|
| 文档版本 | v1.0 |
| 创建日期 | 2026-06-14 |
| 依赖 PRD | `docs/superpowers/specs/2026-06-14-avalanche-game-design.md` v1.0 |
| 适用阶段 | M1：架构设计 → M2：核心玩法 Demo |
| 文档状态 | 待评审 |
| 作者角色 | 架构师 Agent |
| 决策记录 | 本文档基于 PRD v1.0 的全部锁定项设计；事实性参数（引擎版本/包体限制/云 API）已通过 WebSearch 核实，详见 0.4 节 |

---

## 0. 文档元信息

### 0.1 版本与状态

本文档为 M1 阶段交付物，覆盖 0–10 共 11 个章节。M2 启动前需经 PRD 团队 review 通过。任何对 PRD 锁定项（见 7 节）的偏离必须显式记录在 0.4 决策记录中并升级到产品负责人。

### 0.2 阅读对象

- **产品经理**：重点看 1.3（PRD 一致性映射）、9（风险应对）
- **Coder Agent**：重点看 2（项目结构）、3（模块 API）、4（类型系统）、5（后端 API）
- **QA Agent**：重点看 4（类型契约）、5（API schema）、8（测试策略）
- **主美**：重点看 6（美术规范与 naming convention）

### 0.3 与 PRD 的关键修正

本文档在以下两点与 PRD v1.0 存在事实性差异，以**最新官方规则为准**，PRD 后续需同步更新：

| 项目 | PRD 写法 | 最新事实（核实日期 2026-06-14） | 影响 | 处理 |
|---|---|---|---|---|
| 微信小游戏总包限制 | ≤ 20 MB | ≤ **30 MB**（已统一，不再区分虚拟支付） | 给美术/分包更大预算空间 | 7.1 预算按 30 MB 拆解，同时保留 20 MB 作为"保守档"目标 |
| Cocos Creator 版本 | 3.8.x（未指定小版本） | 当前最新 LTS = **3.8.8**（2025-12-16 发布） | 锁定小版本以避免 API 漂移 | 2.1 节锁定 3.8.8，CI 中固定 |

### 0.4 决策记录（ADR Summary）

| # | 决策 | 选择 | 不这么选的代价 |
|---|---|---|---|
| ADR-01 | 引擎 | Cocos Creator 3.8.8 LTS | Laya 社区小、TS 体验弱；PixiJS 无编辑器；Egret 更新停滞 |
| ADR-02 | 物理 | 自研粒子流 + 高度图网格 | Cannon.js/Bullet 刚体昂贵、表现不可控、堆积难做（详见 PRD 4.6） |
| ADR-03 | 后端 | 微信云开发 CloudBase | 自建后端 DevOps 成本高、与微信免鉴权能力不匹配 |
| ADR-04 | 语言 | TypeScript strict | JS 弱类型无法支撑 10 模块 + 50 关 + 周更的可维护性 |
| ADR-05 | 编程范式 | 函数式优先（纯函数 + Reducer），副作用隔离到 Effect 模块 | OOP 继承层级在 Cocos 组件生态下易产生上帝对象 |
| ADR-06 | 状态管理 | Cocos 内置 + 类 Reducer（不引第三方库） | zustand/mobx 引入额外包体（≈10-20KB）和平台兼容风险 |
| ADR-07 | 关卡分发 | 主包只放 1-3 章，4 章起走 CDN | 主包塞满后无法热更，无法做周更 |
| ADR-08 | 总包预算 | 按 30 MB 上限设计，20 MB 为保守档 | 按旧 20 MB 设计会浪费新增的 10 MB 美术预算 |

---

## 1. 总体架构概览

### 1.1 系统全景图

```
┌──────────────────────────────────────────────────────────────────────┐
│                        客户端层（Cocos Creator 3.8.8）                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  InputSystem │  │ LevelSystem  │  │ CannonSystem │  │ UI/Sfx   │ │
│  │  (拖拽/缩放) │→ │  (状态机)    │→ │ (5 弹种/风偏)│  │ Framework│ │
│  └──────────────┘  └──────┬───────┘  └──────┬───────┘  └──────────┘ │
│                           │                 │                         │
│  ┌──────────────┐  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────────┐ │
│  │ WeatherSystem│  │SnowLayerSys  │← │AvalanchePhys │← │SkierSys  │ │
│  │ (风/能见度)  │  │ (3 视觉+3隐) │  │ (粒子+高度图)│  │(路径/入场)│ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │
│           │                                                            │
│  ┌────────▼────────────────────────────────────────────┐             │
│  │  CloudBridge  ──  AnalyticsService(埋点)             │             │
│  │  (登录/上报/排行/CDN 关卡拉取)                       │             │
│  └────────┬─────────────────────────────────┬──────────┘             │
└───────────┼─────────────────────────────────┼────────────────────────┘
            │ wx.cloud.callFunction          │ wx.cloud.downloadFile
            │ (HTTPS via 微信运行时)          │ (CDN)
┌───────────▼─────────────────────────────────▼────────────────────────┐
│                        云端层（微信云开发 CloudBase）                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐ │
│  │ 云函数 SCF │  │ 云数据库   │  │ 云存储 CDN │  │ 微信开放能力    │ │
│  │ login/     │  │ players    │  │ levels/    │  │ 激励视频/分享   │ │
│  │ reportLevel│  │ level_     │  │ weekly/    │  │ (免鉴权调用)    │ │
│  │ getRanking │  │ results    │  │ hotfix/    │  │                 │ │
│  │ getLevelCfg│  │ rankings   │  │ assets/    │  │                 │ │
│  │ reportAna  │  │ analytics  │  │            │  │                 │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
            ▲
            │ 配置/审计通过运营后台（CLI 或简易 Web Console）
┌───────────┴──────────────────────────────────────────────────────────┐
│                        CDN 层（云存储 + 微信 CDN 加速）                │
│  - 关卡 JSON 分包：levels/ch{N}/Lv_XXX.json                          │
│  - 美术资源分包：assets/ch{N}_textures.pac（4 章后）                  │
│  - 周更/热更：weekly/YYYYWW/*.json + hotfix/*.json                   │
└──────────────────────────────────────────────────────────────────────┘
```

**三层职责划分**：
- **客户端层**：所有玩法逻辑（含雪崩物理）本地计算，零权威服务器，避免延迟
- **云端层**：只做存档/排行/关卡分发/埋点收集，无状态游戏逻辑
- **CDN 层**：纯静态资源分发，支持版本协商与回滚

### 1.2 技术栈最终决策表

| 维度 | 选型 | 版本/规格 | 锁定理由（PRD 4.5-4.10） |
|---|---|---|---|
| 游戏引擎 | Cocos Creator | **3.8.8 LTS**（2025-12-16 发布） | PRD 4.5 锁定，微信小游戏官方首推，2.5D 友好 |
| 构建目标 | 微信小游戏（主） / 抖音小游戏（次） | wechatgame / bytedance-minigame | PRD 1.1 锁定 |
| 编程语言 | TypeScript | strict mode，`"strict": true` | PRD 4.8 锁定 |
| 物理 | 自研粒子流 + 高度图 | ~500 粒子 / 32×32 Grid | PRD 4.6 锁定，不引真物理 |
| 后端 | 微信云开发 CloudBase | 云函数 Node.js 18 + 云数据库 MongoDB 兼容 | PRD 4.7 锁定 |
| 数据格式 | JSON（关卡配置）/ MessagePack 备选 | UTF-8，单文件 ≤ 50KB | 关卡热更需轻量 |
| 状态管理 | Cocos 内置 + 类 Reducer | 不引第三方库 | ADR-06 |
| 测试框架 | Jest | 29.x | PRD 4.10 / QA Agent 行为准则锁定 |
| Lint | ESLint + @typescript-eslint | strict preset | 强类型约束的工程底线 |
| 构建 CI | GitHub Actions（或 GitLab CI） | node 18 + cocos-ci Docker | 见 8.3 |
| 包体上限 | 主包 ≤ 4MB / 总包 ≤ 30MB（保守 20MB） | 0.3 节修正后 | 微信官方现行规则 |

### 1.3 与 PRD 决策的一致性映射

| PRD 节 | 锁定项 | 本文档落实位置 | 一致性 |
|---|---|---|---|
| 4.5 | Cocos Creator 3.8.x | 2.1（锁定 3.8.8） | OK |
| 4.6 | 自研轻量雪崩物理 | 3.2（粒子流算法伪代码） | OK |
| 4.7 | 微信云开发 + 关卡热更 | 5.x（云函数/DB/存储/热更） | OK |
| 4.8 | TypeScript 数据结构 | 4.1（在 PRD 基础上扩展完整类型） | OK |
| 4.9 | 性能预算（4MB/20MB/60FPS/300MB） | 7.x（按 30MB 修正，0.3 已说明） | 偏离已记录 |
| 4.10 | 埋点列表 | 3.10 + 5.1 reportAnalytics schema | OK |
| 2.2 | 5 种炮弹系统 | 3.3 CannonSystem API | OK |
| 2.3 | 雪层 3 视觉 + 3 隐藏 | 3.4 SnowLayerSystem + 4.1 枚举 | OK |
| 2.4 | 雪崩物理（流向/堆积/连环） | 3.2 + 7.2 粒子降级 | OK |
| 2.5 | NPC 游客路径/入场/被埋 | 3.5 SkierSystem | OK |
| 2.6 | 拖拽瞄准 + 双指操作 | 3.7 InputSystem | OK |
| 2.7 | 计分失败 + 星级评定 | 3.1 LevelSystem 评定函数 | OK |
| 3.x | 关卡 JSON 结构 + 章节/Boss | 5.4 关卡热更 + 4.1 LevelConfig | OK |
| 5.3 | 风险表 8 条 | 9 节逐条对应技术应对 | OK |
| 5.4 | M1-M6 里程碑 | 10 节 M1 清单 + M2 启动条件 | OK |

---

## 2. Cocos Creator 项目结构

### 2.1 引擎版本与构建目标

| 项 | 值 |
|---|---|
| 引擎版本 | **Cocos Creator 3.8.8 LTS**（2025-12-16） |
| 固定方式 | `project.json` 中 `"engine": "3.8.8"`；CI 镜像 `cocos/ci:3.8.8` 固定 |
| 构建主目标 | 微信小游戏（`wechatgame`） |
| 构建次目标 | 抖音小游戏（`bytedance-minigame`） |
| 次目标优先级 | M2-M4 只验证编译通过，不深度适配；M5 提审前做完整适配 |
| 升级策略 | 仅在 LTS 内升小版本（如 3.8.8 → 3.8.9），跨大版本（4.x）需重新评估 |

**为何锁定到小版本**：3.8 系列在 3.8.0 → 3.8.8 之间有过 BC（如 Prefab 序列化、动画剪辑字段）变更，不锁小版本会导致团队成员间 Prefab 互踩。CI 固定镜像后，本地编辑器用版本管理器（如 nvm 风格的 cocos 版本工具）同步。

### 2.2 完整目录树

遵循"函数式 + 强类型 + 模块边界清晰"，目录按域（domain）而非按技术分层组织：

```
avalanche-squad/
├── assets/
│   ├── scripts/
│   │   ├── types/                          # 全局类型定义（无运行时代码）
│   │   │   ├── cannon.ts                   # CannonType / CannonSpec
│   │   │   ├── snow.ts                     # DangerZoneType / SnowState
│   │   │   ├── level.ts                    # LevelConfig / LevelResult
│   │   │   ├── player.ts                   # PlayerSave
│   │   │   ├── analytics.ts                # AnalyticsEvent 联合类型
│   │   │   └── index.ts                    # re-export
│   │   ├── config/                         # 静态配置常量（编译期内联）
│   │   │   ├── cannons.ts                  # 5 种炮弹 spec 表
│   │   │   ├── balance.ts                  # 星级阈值、风力系数等
│   │   │   ├── build-targets.ts            # 分包配置
│   │   │   └── env.ts                      # 云环境 ID / CDN base URL
│   │   ├── modules/                        # 10 大模块（与第 3 章一一对应）
│   │   │   ├── level/
│   │   │   │   ├── LevelSystem.ts          # 状态机 + Reducer
│   │   │   │   ├── levelReducer.ts         # 纯函数 reducer
│   │   │   │   ├── levelEffects.ts         # 副作用（场景切换/上报）
│   │   │   │   ├── starRating.ts           # 纯函数：星级评定
│   │   │   │   └── levelLoader.ts          # CDN 加载 + 校验
│   │   │   ├── avalanche/
│   │   │   │   ├── AvalancheSystem.ts
│   │   │   │   ├── particlePool.ts         # 粒子对象池
│   │   │   │   ├── heightField.ts          # 高度图网格（不可变更新）
│   │   │   │   ├── avalanchePhysics.ts     # 纯函数：粒子更新循环
│   │   │   │   └── avalancheConfig.ts      # 降级档位（500/300/150）
│   │   │   ├── cannon/
│   │   │   │   ├── CannonSystem.ts
│   │   │   │   ├── projectile.ts           # 纯函数：弹道积分
│   │   │   │   ├── windOffset.ts           # 纯函数：风偏移
│   │   │   │   └── ammoTracker.ts          # 弹药数 Reducer
│   │   │   ├── snow/
│   │   │   │   ├── SnowLayerSystem.ts
│   │   │   │   ├── snowStateReducer.ts     # 纯函数：状态迁移
│   │   │   │   └── vibrationPropagate.ts   # 纯函数：震动传导
│   │   │   ├── skier/
│   │   │   │   ├── SkierSystem.ts
│   │   │   │   ├── pathCurve.ts            # 纯函数：贝塞尔路径采样
│   │   │   │   └── skierSpawner.ts
│   │   │   ├── weather/
│   │   │   │   ├── WeatherSystem.ts
│   │   │   │   └── windModel.ts            # 纯函数：风公式
│   │   │   ├── input/
│   │   │   │   ├── InputSystem.ts          # 拖拽/双指手势
│   │   │   │   └── gestureRecognizer.ts
│   │   │   ├── ui/
│   │   │   │   ├── UIFramework.ts          # HUD/菜单/结算管理
│   │   │   │   ├── hudView.ts
│   │   │   │   ├── settlementView.ts
│   │   │   │   └── toastView.ts
│   │   │   ├── cloud/
│   │   │   │   ├── CloudBridge.ts          # 统一云端入口
│   │   │   │   ├── auth.ts                 # 登录
│   │   │   │   ├── report.ts               # 上报
│   │   │   │   ├── ranking.ts              # 排行榜
│   │   │   │   └── cdn.ts                  # CDN 关卡拉取
│   │   │   └── analytics/
│   │   │       ├── AnalyticsService.ts
│   │   │       ├── eventSchema.ts          # 事件 schema 校验
│   │   │       └── funnel.ts               # 漏斗定义
│   │   ├── store/                          # 全局状态（类 Reducer）
│   │   │   ├── appStore.ts                 # 根 store
│   │   │   ├── playerSlice.ts
│   │   │   ├── levelSlice.ts
│   │   │   └── settingsSlice.ts
│   │   ├── core/                           # 引擎层胶水
│   │   │   ├── GameApp.ts                  # 入口单例（唯一可被场景引用的根）
│   │   │   ├── ServiceLocator.ts           # 模块依赖注入
│   │   │   ├── Scheduler.ts                # 固定步长 tick
│   │   │   ├── Pool.ts                     # 泛型对象池
│   │   │   └── EventBus.ts                 # 类型安全事件总线
│   │   └── utils/                          # 纯函数工具
│   │       ├── math.ts                     # vec2/lerp/clamp
│   │       ├── rng.ts                      # 确定性随机（关卡种子）
│   │       ├── jsonSchema.ts               # 关卡 JSON 校验
│   │       └── perf.ts                     # FPS 探测/机型分级
│   ├── prefabs/
│   │   ├── characters/                     # boris_*, skier_*
│   │   ├── props/                          # cannon_*, flag_*
│   │   ├── fx/                             # 爆炸/雪崩特效 prefab
│   │   ├── ui/                             # HUD/菜单/结算
│   │   └── terrain/                        # 雪山/缓坡/终点
│   ├── textures/
│   │   ├── characters/
│   │   ├── terrain/
│   │   ├── ui/
│   │   └── fx/
│   ├── animations/
│   │   ├── boris/                          # 主角表情库
│   │   ├── skiers/
│   │   └── fx/
│   ├── audio/
│   │   ├── sfx/
│   │   ├── bgm/
│   │   └── voice/                          # 失败吐槽语音（如有）
│   ├── materials/
│   ├── shaders/                            # 雪崩流动/积雪堆积 shader
│   ├── scenes/
│   │   ├── Boot.scene                      # 启动/登录
│   │   ├── Main.scene                      # 单场景 + 多 Layer（推荐）
│   │   └── Settlement.scene                # （可选独立场景）
│   ├── resources/                          # 动态加载（resources.load）
│   │   └── levels/                         # 仅放第 1-3 章关卡 JSON
│   └── bundles/                            # Asset Bundle（分包）
│       ├── ch1_3/                          # 主包内（首启动）
│       ├── ch4_6/                          # 第 4-6 章
│       ├── ch7_12/
│       ├── ch13_30/
│       ├── ch31_50/                        # 含 Boss 关
│       └── weekly/                         # 周更关卡
├── cloud-functions/                        # 微信云函数源码（部署到 CloudBase）
│   ├── login/
│   ├── reportLevel/
│   ├── getRanking/
│   ├── getLevelConfig/
│   └── reportAnalytics/
├── docs/
│   ├── architecture/                       # 本文档
│   ├── superpowers/specs/                  # PRD
│   └── adr/                                # 架构决策记录
├── tests/
│   ├── unit/                               # Jest 单测
│   ├── integration/                        # 关卡加载/云函数 mock
│   └── fixtures/                           # 关卡 JSON 样例
├── tools/
│   ├── level-validator/                    # 关卡 JSON schema 校验 CLI
│   └── perf-profiler/                      # 帧率/内存采集
├── build/                                  # 构建输出（gitignore）
├── project.json                            # 引擎版本 + 构建配置
├── tsconfig.json                           # strict: true
├── jest.config.js
├── .eslintrc.cjs
├── .github/workflows/ci.yml                # CI 流水线
└── README.md
```

**关键组织原则**：
1. **types/ 零运行时**：纯类型文件，便于跨模块共享且不进打包
2. **modules/ 内部三件套**：每个模块 = `XxxSystem.ts`（Cocos Component，含副作用）+ 业务纯函数（`xxxReducer.ts` / `xxx.ts`）+ 配置（`xxxConfig.ts`）
3. **store/ 类 Reducer**：全局状态用纯函数 reducer，副作用集中在 `*Effects.ts`
4. **core/ 胶水最小化**：`GameApp` 是场景树唯一的根 Component，避免散落的 GameManager

### 2.3 命名规范

| 类别 | 规范 | 示例 |
|---|---|---|
| 文件名 | kebab-case 或 PascalCase（模块主类用 PascalCase，工具用 camelCase） | `LevelSystem.ts`、`heightField.ts` |
| TypeScript class / interface / type / enum | PascalCase | `LevelSystem`、`LevelConfig`、`CannonType` |
| 函数 / 方法 / 变量 | camelCase | `loadLevel`、`windOffset`、`particleCount` |
| 常量（编译期） | UPPER_SNAKE_CASE | `MAX_PARTICLES_HIGH = 500`、`WIND_OFFSET_COEFF` |
| 私有成员 | 前缀 `_`（仅副作用类） | `_particlePool` |
| 纯函数模块 | 名词或动名词，禁止 `Manager`/`Helper` 后缀 | `windOffset.ts`（不要 `WindHelper.ts`） |
| 副作用类 | 后缀 `System` 或 `Service` | `CloudBridge`、`AnalyticsService` |
| Component 类 | 后缀 `View` 或 `System` | `HudView`、`LevelSystem` |
| Prefab 文件 | `<域>_<名称>` | `cannon_standard.prefab`、`skier_goggles.prefab` |
| 关卡 ID | `Lv_<三位序号>` | `Lv_015` |

**禁止**：`any`、`// @ts-ignore`（需经 review 显式批准）、`god class`（单类 > 400 行需拆分）。

### 2.4 资源分组（resources/ vs 主包内 vs CDN 分包）

与 PRD 4.7 关卡热更机制对齐：

| 层级 | 存放位置 | 加载方式 | 包含内容 | 体积预算 |
|---|---|---|---|---|
| **主包内**（启动必需） | `assets/scenes/`、`assets/scripts/`、`assets/prefabs/ui/`、`assets/textures/ui/`、`assets/resources/levels/ch1_3/` | 引擎自动随主包 | Boot/Main 场景、全部脚本编译产物、基础 UI、第 1-3 章关卡 JSON + 贴图 | ≤ 4 MB |
| **本地分包 1**（ch4_6） | `assets/bundles/ch4_6/` | `assetManager.loadBundle('ch4_6')` | 第 4-6 章贴图 + Prefab + 关卡 JSON | ≤ 4 MB |
| **本地分包 2-N**（ch7_12, ch13_30, ch31_50） | `assets/bundles/<name>/` | 按需 loadBundle | 对应章节资源 | 各 ≤ 4 MB |
| **CDN 关卡 JSON**（4 章起可热更） | 云存储 `levels/ch{N}/Lv_XXX.json` | `wx.cloud.downloadFile` | 纯数据，无美术 | 单文件 ≤ 50 KB |
| **CDN 周更** | 云存储 `weekly/YYYYWW/` | downloadFile + 版本协商 | 周更关卡数据 | 单包 ≤ 200 KB |
| **CDN 热更补丁** | 云存储 `hotfix/` | downloadFile | 平衡性调整、Bug 修复数据 | 单文件 ≤ 20 KB |

**美术资源热更注意**（PRD 4.7 已提示）：含新美术资源的更新仍需重新提审，因此美术资源走"分包内"，**纯数据（JSON）走 CDN 才能免提审热更**。这意味着：周更关卡只能复用已有美术资产（如换贴图的雪场变体），新增独立美术资产需走分包发版流程。

---

## 3. 模块划分（核心章节）

每个模块统一描述：**职责边界 / 对内 API（纯函数）/ 对外 API（Cocos Component 副作用）/ 依赖 / 关键文件**。约定：标 `// pure` 的接口承诺纯函数（同输入同输出、无副作用），标 `// effect` 的接口含副作用。

### 3.1 关卡系统模块（LevelSystem）

**职责边界**：关卡生命周期编排。加载 CDN/本地关卡 JSON → 校验 → 进入状态机 → 各阶段调度其它模块 → 结算 → 上报。**不直接做**雪崩物理、弹道计算、UI 渲染（这些委托给对应模块）。

**状态机**（PRD 1.3 单关循环）：

```
Loading ─▶ Ready(观察) ─▶ Aiming(瞄准中) ─▶ Firing(发射中) ─▶ Settling(结算)
   │            │              │                  │                 │
   │            │ 倒计时归零/   │ 松手            │ 命中判定完成     │ 上报完成
   │            │ 全清判定      │                 │                  ▼
   │            ▼              ▼                  ▼             Result(Win/Lose)
   │      (循环回到 Ready 直到结束条件)                            │
   └─ Failed(加载失败)                                           重试/下一关
```

**对内 API（纯函数）**：

```typescript
// level/levelReducer.ts — pure
export type LevelState = {
  phase: 'loading' | 'ready' | 'aiming' | 'firing' | 'settling' | 'result';
  config: LevelConfig;
  remainingDangerZones: ReadonlySet<number>;     // 危险区索引
  ammoLeft: Readonly<Record<CannonType, number>>;
  selectedCannon: CannonType | null;
  countdownMs: number;                           // 剩余倒计时
  elapsedMs: number;                             // 已用时长
  attempt: number;                               // 第几次试发
  result: { stars: 0|1|2|3; win: boolean; failReason?: FailReason } | null;
};

export type LevelAction =
  | { type: 'LOADED'; config: LevelConfig }
  | { type: 'SELECT_CANNON'; cannon: CannonType }
  | { type: 'AIM_BEGIN' }
  | { type: 'FIRE'; target: Vec2; power: number }
  | { type: 'IMPACT'; zoneIndex: number; newSnowState: SnowState }
  | { type: 'TICK'; dtMs: number }
  | { type: 'SKIERS_ENTERED' }
  | { type: 'AVALANCHE_HIT'; target: 'cannon' | 'skier' | 'finish' }
  | { type: 'SETTLE' };

export function levelReducer(state: LevelState, action: LevelAction): LevelState; // pure
```

```typescript
// level/starRating.ts — pure
export function rateStars(
  config: LevelConfig,
  elapsedMs: number,
  ammoUsed: Readonly<Record<CannonType, number>>,
): 0 | 1 | 2 | 3;  // 与 PRD 2.7 星级门槛一致
```

**对外 API（Cocos Component，副作用）**：

```typescript
// level/LevelSystem.ts
@ccclass('LevelSystem')
export class LevelSystem extends Component {
  // effect: 拉起其它 System 协调
  startLevel(levelId: string): Promise<void>;   // effect: 异步加载 + 校验 + 进入 ready
  retryLevel(): Promise<void>;                  // effect: 重置 reducer + 复位场景
  reportResult(): Promise<void>;                // effect: 上报到云（委托 CloudBridge）
}
```

**依赖**：`CloudBridge`（加载/上报）、`CannonSystem`、`SnowLayerSystem`、`AvalanchePhysics`、`SkierSystem`、`WeatherSystem`、`UIFramework`、`AnalyticsService`。

**关键文件**：`assets/scripts/modules/level/{LevelSystem,levelReducer,levelEffects,starRating,levelLoader}.ts`

---

### 3.2 雪崩物理模块（AvalanchePhysics）

**职责边界**：核心爽点来源。维护粒子池 + 高度图，每帧推进粒子（重力、坡度、堆积），向雪层状态模块发出"波及"事件。**自研，不用真物理引擎**（PRD 4.6 锁定）。

**核心数据结构**：

```typescript
// avalanche/heightField.ts — pure
export interface HeightField {
  readonly grid: Readonly<Float32Array>;   // N×N 高度值，行优先
  readonly size: number;                    // 32 or 64
  readonly cellWorldSize: number;           // 每格世界尺寸
}
export function setHeight(hf: HeightField, x: number, z: number, v: number): HeightField; // pure, 不可变更新
export function gradient(hf: HeightField, x: number, z: number): Vec2;                    // pure, 返回梯度方向

// avalanche/particlePool.ts — effect（对象池本身有副作用，但更新逻辑是纯函数）
export interface AvalancheParticle {
  active: boolean;
  x: number; z: number; y: number;          // 世界坐标
  vx: number; vy: number; vz: number;
  mass: number;
  settled: boolean;                          // 是否已堆积
}
```

**对内 API（纯函数，每帧推进）**：

```typescript
// avalanche/avalanchePhysics.ts — pure
export interface PhysicsConfig {
  maxParticles: 500 | 300 | 150;            // 降级档位
  gravity: number;
  slopeAccelCoeff: number;
  settleThreshold: number;                   // 速度低于此值且在低梯度 → 堆积
  impactRadius: number;
  dt: number;                                // 固定步长（见 Scheduler）
}

/**
 * 单步推进所有活动粒子。pure: 同输入同输出。
 * 返回新粒子数组（不可变）+ 本次产生的"堆积增量"（要写回 HeightField）+ "波及"事件列表。
 */
export function stepParticles(
  particles: ReadonlyArray<AvalancheParticle>,
  hf: HeightField,
  cfg: PhysicsConfig,
): {
  particles: AvalancheParticle[];            // 新数组
  heightDeltas: ReadonlyArray<{ x: number; z: number; delta: number }>;
  impacts: ReadonlyArray<{ x: number; z: number; radius: number; force: number }>;
}; // pure
```

**对外 API（Cocos Component，副作用）**：

```typescript
// avalanche/AvalancheSystem.ts
@ccclass('AvalancheSystem')
export class AvalancheSystem extends Component {
  // effect: 由 CannonSystem 在命中临界层/穿甲弹时调用
  trigger(srcX: number, srcZ: number, force: number, type: CannonType): void;
  // effect: 每帧由 Scheduler 调用，推进物理并下发 impact 到 SnowLayerSystem
  tick(dt: number): void;
  // effect: 接入降级档位（由 perf.ts 探测机型后调用）
  setQualityTier(tier: 'high' | 'mid' | 'low'): void;
}
```

**雪崩粒子流更新循环伪代码**（核心算法，Coder 实现以此为骨架）：

```typescript
// pseudo: AvalancheSystem.tick 的纯函数内核
function stepParticles(particles, hf, cfg) {
  const out = particles.slice();               // 浅拷贝，逐个替换
  const heightDeltas = [];
  const impacts = [];

  for (let i = 0; i < particles.length; i++) {
    const p = out[i];
    if (!p.active) continue;

    // (1) 计算坡度方向（高度图梯度）
    const grad = gradient(hf, p.x, p.z);
    const slopeAccelX = -grad.x * cfg.slopeAccelCoeff;
    const slopeAccelZ = -grad.y * cfg.slopeAccelCoeff;

    // (2) 速度积分（半隐式 Euler，固定步长）
    p.vx += slopeAccelX * cfg.dt;
    p.vz += slopeAccelZ * cfg.dt;
    p.vy -= cfg.gravity * cfg.dt;             // 重力

    // (3) 位置积分
    p.x += p.vx * cfg.dt;
    p.z += p.vz * cfg.dt;
    p.y += p.vy * cfg.dt;

    // (4) 与地形碰撞：如果 y < 地形高度，吸附到地表并衰减
    const groundY = sampleHeight(hf, p.x, p.z);
    if (p.y < groundY) {
      p.y = groundY;
      p.vy = -p.vy * 0.2;                      // 弹性衰减
      p.vx *= 0.85; p.vz *= 0.85;
    }

    // (5) 堆积判定：速度低 + 梯度低 → 沉积到高度图
    const speed = Math.hypot(p.vx, p.vy, p.vz);
    const gradMag = Math.hypot(grad.x, grad.y);
    if (speed < cfg.settleThreshold && gradMag < 0.1) {
      p.settled = true;
      p.active = false;
      heightDeltas.push({ x: p.x, z: p.z, delta: +p.mass * 0.02 });
      continue;
    }

    // (6) 高速粒子产生 impact（波及其它雪层）
    if (speed > 8.0) {
      impacts.push({ x: p.x, z: p.z, radius: cfg.impactRadius, force: speed * p.mass });
    }
  }
  return { particles: out, heightDeltas, impacts };
}
```

**连环雪崩机制**（PRD 2.4 + Boss 关 49）：堆积增量 `heightDeltas` 会通过 `setHeight` 不可变更新到 `HeightField`，下一帧的 `gradient` 即反映新地形 → 弹道与雪崩流向因此偏移。无需额外机制，是数据流的自然结果。

**降级策略**：见 7.2。

**依赖**：`SnowLayerSystem`（下发 impact）、`Scheduler`（固定步长）。

**关键文件**：`assets/scripts/modules/avalanche/{AvalancheSystem,particlePool,heightField,avalanchePhysics,avalancheConfig}.ts`

---

### 3.3 弹道与炮弹模块（CannonSystem）

**职责边界**：5 种炮弹（PRD 2.2）的属性、发射、弹道积分（无预览，黑盒）、命中检测、风偏移、力度→初速度映射。

**对内 API（纯函数）**：

```typescript
// cannon/projectile.ts — pure
export interface ProjectileState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  type: CannonType;
  hasSplit: boolean;                          // 集束弹是否已分裂
  age: number;                                // 飞行时长（用于热熔弹融化判定）
}
export function stepProjectile(p: ProjectileState, wind: WindState, dt: number): ProjectileState; // pure
export function shouldSplit(p: ProjectileState): boolean;                                      // pure
export function detonate(p: ProjectileState): DetonationResult;                                 // pure

// cannon/windOffset.ts — pure（见 3.6 windModel）
export function applyWind(vx: number, vz: number, wind: WindState, type: CannonType): { vx: number; vz: number }; // pure

// config/cannons.ts — 编译期常量表
export const CANNON_SPECS: Readonly<Record<CannonType, CannonSpec>>;
export interface CannonSpec {
  type: CannonType;
  displayName: string;
  damage: number;
  blastRadius: number;
  vibration: number;                          // 震动传导强度
  windResistance: number;                     // 0=完全受风 1=不受风（抗风性，PRD 2.2）
  velocityMin: number;                        // 力度 0 → 初速度
  velocityMax: number;                        // 力度 1 → 初速度
  splitCount?: number;                        // 集束弹 = 5
  triggersAvalanche: boolean;                 // 热熔弹 = false
  deepPenetration?: boolean;                  // 穿甲弹 = true
}
```

**对外 API（副作用）**：

```typescript
// cannon/CannonSystem.ts
@ccclass('CannonSystem')
export class CannonSystem extends Component {
  // effect: LevelSystem 在 FIRE action 时调用
  fire(cannon: CannonType, direction: Vec2, power01: number): void;
  // effect: 选中炮弹（更新炮台外观 + HUD 高亮）
  select(cannon: CannonType): void;
  // effect: 弹药数变更通知（订阅 ammoTracker）
  onAmmoChanged(cb: (ammo: Readonly<Record<CannonType, number>>) => void): void;
}
```

**力度→初速度映射**：`v = lerp(spec.velocityMin, spec.velocityMax, power01)`，线性。**不提供预览**（PRD 2.6 锁定），玩家凭经验。

**风偏移公式**（见 3.6 详细推导）：
```
accel_wind = wind.force * WIND_OFFSET_COEFF * (1 - spec.windResistance)
vx += accel_wind * cos(wind.dir)
vz += accel_wind * sin(wind.dir)
```

**依赖**：`WeatherSystem`（获取风）、`AvalanchePhysics`（命中后触发）、`SnowLayerSystem`（命中检测）、`UIFramework`（HUD 弹药数）。

**关键文件**：`assets/scripts/modules/cannon/{CannonSystem,projectile,windOffset,ammoTracker}.ts` + `assets/scripts/config/cannons.ts`

---

### 3.4 雪层状态模块（SnowLayerSystem）

**职责边界**：维护每个 danger_zone 的状态（PRD 2.3：3 视觉状态 stable/unstable/critical + 3 隐藏类型 ice/deep_snow/hollow），处理震动传导、自然崩塌、被命中后的迁移。**不**做雪崩粒子模拟（那是 3.2）。

**对内 API（纯函数）**：

```typescript
// snow/snowStateReducer.ts — pure
export type SnowState = 'stable' | 'unstable' | 'critical' | 'cleared';

export interface SnowZoneRuntime {
  readonly zoneId: number;
  readonly config: DangerZone;                 // 来自 LevelConfig
  state: SnowState;
  hiddenType: DangerZoneType;                  // ice/deep_snow/hollow（'critical'/'unstable' 时存在）
  vibration: number;                           // 当前累积震动值
  hp: number;                                  // 剩余血量
}

export type SnowAction =
  | { type: 'IMPACT'; zoneId: number; force: number; cannon: CannonType }
  | { type: 'VIBRATION_PROPAGATE'; fromZoneId: number; force: number }
  | { type: 'NATURAL_DECAY'; dt: number }      // critical 状态随时间累积崩塌概率
  | { type: 'AUTO_COLLAPSE'; zoneId: number }; // 倒计时归零触发（PRD 2.3）

export function snowReducer(state: SnowZoneRuntime[], action: SnowAction): SnowZoneRuntime[]; // pure

// snow/vibrationPropagate.ts — pure
export function propagateVibration(
  zones: ReadonlyArray<SnowZoneRuntime>,
  srcX: number, srcZ: number, force: number,
): ReadonlyArray<{ zoneId: number; addedVibration: number }>; // pure, 距离衰减
```

**状态迁移规则**（与 PRD 2.3 对齐，纯函数实现）：

| 当前 | 触发 | 新状态 |
|---|---|---|
| stable | 标准弹命中 | 不变（稳定层安全） |
| unstable | 标准弹命中 / vibration > 阈值 | cleared |
| unstable | 重炮/穿甲震动 | critical（连锁） |
| critical | 任何命中 / 自然崩塌 | 触发雪崩 + cleared |
| ice | 重炮命中 | cleared（标准弹无效） |
| deep_snow | 多次命中（集束效率低） | cleared |
| hollow | 穿甲弹命中 | 触发深层雪崩 + cleared |

**对外 API（副作用）**：

```typescript
// snow/SnowLayerSystem.ts
@ccclass('SnowLayerSystem')
export class SnowLayerSystem extends Component {
  // effect: LevelSystem 在 LOADED 后初始化所有 zone
  initZones(config: LevelConfig): void;
  // effect: 接收 AvalancheSystem 下发的 impact
  onImpact(x: number, z: number, force: number, cannon: CannonType): void;
  // effect: 接收 CannonSystem 命中
  onDirectHit(zoneId: number, cannon: CannonType): void;
  // effect: 每帧推进 natural decay
  tick(dt: number): void;
}
```

**依赖**：`AvalanchePhysics`（触发雪崩）、`LevelSystem`（汇报 cleared 状态）。

**关键文件**：`assets/scripts/modules/snow/{SnowLayerSystem,snowStateReducer,vibrationPropagate}.ts`

---

### 3.5 NPC 游客模块（SkierSystem）

**职责边界**：游客生成、沿预设路径移动、入场倒计时、被埋判定（PRD 2.5）。路径在关卡开始时高亮显示给玩家（不控制）。

**对内 API（纯函数）**：

```typescript
// skier/pathCurve.ts — pure
export interface PathCurve {
  readonly id: string;                         // LevelConfig.skiers.path
  readonly samples: ReadonlyArray<Vec2>;       // 预采样点（Cubic Bezier 离散化）
}
export function sampleAt(curve: PathCurve, t: number): Vec2;        // pure, t∈[0,1]
export function totalLength(curve: PathCurve): number;              // pure

// skier/skierState.ts — pure
export interface SkierState {
  id: number;
  curveId: string;
  progress: number;                            // 0~1 沿路径
  speed: number;
  style: 1 | 2 | 3 | 4 | 5;                    // PRD 4.1 五种造型
  alive: boolean;
}
export function stepSkier(s: SkierState, curve: PathCurve, dt: number): SkierState; // pure
```

**对外 API（副作用）**：

```typescript
// skier/SkierSystem.ts
@ccclass('SkierSystem')
export class SkierSystem extends Component {
  // effect: LevelSystem LOADED 后初始化 + 显示路径高亮
  init(config: LevelConfig): void;
  // effect: 倒计时归零时入场（PRD 2.5）
  enterAll(): void;
  // effect: AvalancheSystem 雪崩波及时调用
  onBuried(skierId: number): void;            // 触发被埋动画 + LevelSystem 失败
  // effect: 到达终点
  onFinish(skierId: number): void;
  tick(dt: number): void;
}
```

**依赖**：`LevelSystem`（失败上报）、`AvalanchePhysics`（波及判定）、`UIFramework`（HUD 游客计数）。

**关键文件**：`assets/scripts/modules/skier/{SkierSystem,pathCurve,skierSpawner}.ts`

---

### 3.6 环境 / 风模块（WeatherSystem）

**职责边界**：风向、风力、能见度（雪雾）的模型与可视化（PRD 2.6 风向旗 + HUD）。**纯函数模型** + 副作用渲染分离。

**对内 API（纯函数）**：

```typescript
// weather/windModel.ts — pure
export interface WindState {
  dirDeg: number;                              // 0=北，顺时针
  force: number;                               // 1-5 级（PRD 3.3）
  snowFog: number;                             // 0-1 能见度衰减
}
export function windAcceleration(wind: WindState): { ax: number; az: number }; // pure, 转加速度
// 风力 → 加速度系数（与 3.3 windOffset 共享）
export const WIND_OFFSET_COEFF = 0.6;          // 可被 balance.ts 覆盖用于 A/B（PRD 5.3 风力应对）
```

**对外 API（副作用）**：

```typescript
// weather/WeatherSystem.ts
@ccclass('WeatherSystem')
export class WeatherSystem extends Component {
  init(wind: WindState): void;                 // effect: 设置风向旗 prefab + HUD
  // effect: 暴风雪关卡（PRD 3.4 第 50 关）随机扰动风力
  enableStormMode(): void;
  // effect: 返回当前风（CannonSystem 订阅）
  current(): WindState;
}
```

**风公式**（PRD 2.6 横风偏移、逆风减程、顺风增程）：
- 横风：`ax = windForce * sin(relAngle) * (1 - cannon.windResistance) * WIND_OFFSET_COEFF`
- 顺风（与运动同向分量）：`v_along += windForce * cos(relAngle) * 0.5`
- 逆风：上式 cos < 0，自动减速

**风险应对**（PRD 5.3 风力过复杂）：`WIND_OFFSET_COEFF` 通过 CDN `hotfix/balance.json` 热更，无需发版即可降低 30% 风力影响。

**依赖**：`UIFramework`（HUD/旗）、`CannonSystem`（消费者）。

**关键文件**：`assets/scripts/modules/weather/{WeatherSystem,windModel}.ts`

---

### 3.7 输入 / UX 模块（InputSystem）

**职责边界**：拖拽方向 + 力度（PRD 2.6）、双指缩放、双指旋转（±45°）。识别手势后转成领域事件，**不**直接操作任何业务对象。

**对内 API（纯函数，手势识别）**：

```typescript
// input/gestureRecognizer.ts — pure
export interface DragSample { x: number; y: number; t: number; }
export interface RecognizedDrag {
  delta: Vec2;                                 // 从按下到当前的位移（屏幕坐标）
  length: number;                              // 拖拽长度（→ 力度）
  duration: number;
}
export function recognizeDrag(samples: ReadonlyArray<DragSample>): RecognizedDrag | null; // pure
export function classifyPinch(touches: ReadonlyArray<Touch[]>): 'zoom' | 'rotate' | null; // pure
```

**对外 API（副作用）**：

```typescript
// input/InputSystem.ts
@ccclass('InputSystem')
export class InputSystem extends Component {
  // effect: 监听 Node Touch 事件，转换为 DragSample
  // effect: 拖拽时调用 UIFramework 显示方向箭头 + 力度条
  // effect: 松手时调用 CannonSystem.fire(direction, power01)
  onDragStart(cb: () => void): void;
  onDragMove(cb: (d: RecognizedDrag) => void): void;
  onDragEnd(cb: (d: RecognizedDrag) => void): void;
  onPinch(cb: (kind: 'zoom'|'rotate', value: number) => void): void;
}
```

**关键约束**：拖拽起点任意位置，但方向箭头始终从**炮位**出发（PRD 2.6）。力度 0-1 通过 `drag.length / MAX_DRAG_LENGTH` clamp 到 [0,1]。

**依赖**：`CannonSystem`、`UIFramework`、Camera（缩放/旋转）。

**关键文件**：`assets/scripts/modules/input/{InputSystem,gestureRecognizer}.ts`

---

### 3.8 UI 框架模块（UIFramework）

**职责边界**：HUD（顶部倒计时/游客/分数/弹药 + 风向数据 + 旗）、菜单、结算页、Toast 提示的展示与切换。**纯展示**，不持有业务状态（订阅 store/模块）。

**对外 API（副作用，Cocos Component）**：

```typescript
// ui/UIFramework.ts
@ccclass('UIFramework')
export class UIFramework extends Component {
  // effect: HUD 数据绑定
  setCountdown(ms: number): void;
  setSkierCount(alive: number, total: number): void;
  setAmmo(ammo: Readonly<Record<CannonType, number>>): void;
  setWind(wind: WindState): void;
  // effect: 拖拽瞄准 UI
  showAimArrow(from: Vec2, direction: Vec2, power01: number): void;
  hideAimArrow(): void;
  // effect: 结算页
  showSettlement(result: LevelState['result']): Promise<'retry' | 'next' | 'revive'>;
  // effect: Toast
  toast(msg: string, duration?: number): void;
  // effect: 暂停菜单
  showPauseMenu(): Promise<'resume' | 'restart' | 'quit'>;
}
```

**布局**：遵循 PRD 4.3 竖屏 9:16，顶部 HUD + 底部辅助按钮，战场居中。

**依赖**：所有模块（订阅状态）。

**关键文件**：`assets/scripts/modules/ui/{UIFramework,hudView,settlementView,toastView}.ts` + `assets/prefabs/ui/`

---

### 3.9 云对接模块（CloudBridge）

**职责边界**：封装所有 `wx.cloud.*` 调用，统一错误处理、重试、超时、本地缓存。**不**做业务判断（如星级计算在本地完成，只上报）。

**对外 API（副作用）**：

```typescript
// cloud/CloudBridge.ts
export class CloudBridge {
  // effect: 登录（首次启动）
  login(): Promise<{ uid: string; token: string }>;
  // effect: 拉取关卡配置（带版本协商）
  getLevelConfig(levelId: string, clientVersion: number): Promise<{ config: LevelConfig; serverVersion: number; patch?: object }>;
  // effect: 上报单局结果
  reportLevel(result: LevelResult): Promise<{ ok: boolean }>;
  // effect: 排行榜
  getRanking(scope: 'global' | 'friends', limit?: number): Promise<RankEntry[]>;
  // effect: 埋点批量上报
  reportAnalytics(events: ReadonlyArray<AnalyticsEvent>): Promise<{ ok: boolean }>;
  // effect: 玩家存档同步
  syncPlayerSave(save: PlayerSave): Promise<{ ok: boolean }>;
  loadPlayerSave(): Promise<PlayerSave | null>;
}
```

**实现要点**：
- 所有云函数调用走 `wx.cloud.callFunction`（小程序运行时免鉴权）
- 关卡 JSON 大文件走 `wx.cloud.downloadFile`（CDN 加速）
- 离线缓存：`wx.setStorageSync` 最近 5 关的 config，断网时回退
- 重试：指数退避，最多 3 次，超时 8s

**依赖**：`AnalyticsService`（埋点上报共享通道）。

**关键文件**：`assets/scripts/modules/cloud/{CloudBridge,auth,report,ranking,cdn}.ts`

---

### 3.10 埋点 SDK 模块（AnalyticsService）

**职责边界**：实现 PRD 4.10 全部埋点（漏斗 / 关卡级 / 行为 / 变现占位）。本地批量缓冲 + 定时/退出时 flush 到云函数 `reportAnalytics`。

**对内 API（类型安全事件定义）**：

```typescript
// analytics/eventSchema.ts — 类型定义
export type AnalyticsEvent =
  | { name: 'app_launch'; ts: number; clientVersion: string }
  | { name: 'load_complete'; ts: number; durationMs: number }
  | { name: 'tutorial_complete'; ts: number }
  | { name: 'level_start'; ts: number; levelId: string }
  | { name: 'level_complete'; ts: number; levelId: string; stars: 0|1|2|3; timeUsedMs: number; ammoUsed: Record<CannonType, number> }
  | { name: 'level_fail'; ts: number; levelId: string; reason: FailReason; progressPct: number }
  | { name: 'cannon_used'; ts: number; cannon: CannonType; levelId: string }
  | { name: 'pause'; ts: number; levelId: string }
  | { name: 'hint_used'; ts: number; levelId: string }
  | { name: 'revive_used'; ts: number; levelId: string; via: 'ad' | 'coin' }
  | { name: 'ad_expose'; ts: number; placement: string }
  | { name: 'ad_complete'; ts: number; placement: string };

export type FailReason = 'timeout' | 'avalanche_hit_cannon' | 'avalanche_hit_skier' | 'avalanche_hit_finish';
```

**对外 API（副作用）**：

```typescript
// analytics/AnalyticsService.ts
export class AnalyticsService {
  track(event: AnalyticsEvent): void;                    // effect: 入本地缓冲队列
  flush(): Promise<void>;                                // effect: 批量上报到 CloudBridge
  setUserId(uid: string): void;                          // effect: 后续事件附带 uid
  // effect: 关键漏斗节点（PRD 4.10）的便捷封装
  funnel(node: 'launch'|'loaded'|'tutorial'|'lv1'|'lv3'|'lv7'|'lv14'): void;
}
```

**漏斗定义**（PRD 4.10）：启动 → 加载完成 → 教程完成 → 第 1 关 → 第 3 关 → 第 7 关（次日留存关键）→ 第 14 关（周留）。

**触发时机**：`LevelSystem` 在 phase 切换时调用 `track`；`UIFramework` 在按钮点击时调用；`CloudBridge.login` 完成后调用 `setUserId`。

**依赖**：`CloudBridge`（上报通道）。

**关键文件**：`assets/scripts/modules/analytics/{AnalyticsService,eventSchema,funnel}.ts`

---

## 4. 数据结构与 TypeScript 类型系统

### 4.1 完整类型定义（在 PRD 4.8 基础上扩展）

PRD 4.8 已给出 6 个核心类型，本节**扩展为可编译的完整类型骨架**。Coder 应将以下代码原样落到 `assets/scripts/types/*.ts`，并通过 `tsc --strict` 检查。

```typescript
// types/cannon.ts
export type CannonType = 'standard' | 'heavy' | 'cluster' | 'thermo' | 'ap';

export interface CannonSpec {
  readonly type: CannonType;
  readonly displayName: string;
  readonly damage: number;
  readonly blastRadius: number;
  readonly vibration: number;
  readonly windResistance: number;        // 0~1
  readonly velocityMin: number;
  readonly velocityMax: number;
  readonly splitCount?: number;
  readonly triggersAvalanche: boolean;
  readonly deepPenetration?: boolean;
}
```

```typescript
// types/snow.ts
export type DangerZoneType =
  | 'critical'
  | 'unstable'
  | 'stable'
  | 'ice'
  | 'deep_snow'
  | 'hollow';

export interface DangerZone {
  readonly type: DangerZoneType;
  readonly position: readonly [number, number];
  readonly size: number;
}

// 运行时状态（不在 JSON 中持久化）
export type SnowState = 'stable' | 'unstable' | 'critical' | 'cleared';

export interface SnowZoneRuntime {
  readonly zoneId: number;
  readonly config: DangerZone;
  state: SnowState;
  hiddenType: DangerZoneType;
  vibration: number;
  hp: number;
}
```

```typescript
// types/level.ts
import type { CannonType } from './cannon';
import type { DangerZone } from './snow';

export interface Weather {
  readonly wind_dir: number;              // 0-359 度
  readonly wind_force: number;            // 0-5 级
  readonly snow_fog: number;              // 0-1
}

export interface SkiersConfig {
  readonly count: number;
  readonly speed: number;
  readonly delay_seconds: number;
  readonly path: string;
}

export interface StarsThreshold {
  readonly time_3star: number;
  readonly time_2star: number;
  readonly ammo_3star_pct: number;
  readonly ammo_2star_pct: number;
}

export interface LevelConfig {
  readonly id: string;
  readonly name: string;
  readonly chapter: number;
  readonly terrain: string;
  readonly weather: Weather;
  readonly danger_zones: readonly DangerZone[];
  readonly skiers: SkiersConfig;
  readonly ammo: Readonly<Record<CannonType, number>>;
  readonly stars_threshold: StarsThreshold;
}

export type FailReason =
  | 'timeout'
  | 'avalanche_hit_cannon'
  | 'avalanche_hit_skier'
  | 'avalanche_hit_finish';

export interface LevelResult {
  readonly levelId: string;
  readonly success: boolean;
  readonly stars: 0 | 1 | 2 | 3;
  readonly timeUsedMs: number;
  readonly ammoUsed: Readonly<Record<CannonType, number>>;
  readonly failReason?: FailReason;
  readonly timestamp: number;
  readonly clientVersion: number;
}
```

```typescript
// types/player.ts
import type { CannonType } from './cannon';

export interface PlayerSave {
  readonly uid: string;
  readonly coins: number;
  readonly unlockedLevels: number;
  readonly stars: Readonly<Record<number, 0 | 1 | 2 | 3>>;
  readonly cannonUpgrades: Readonly<Record<CannonType, number>>;
  readonly tutorialCompleted: boolean;
  readonly dailyChallenge: { readonly date: string; readonly score: number };
  readonly lastSyncTs: number;
}
```

```typescript
// types/analytics.ts
import type { CannonType } from './cannon';
import type { FailReason } from './level';

export type AnalyticsEvent =
  | { readonly name: 'app_launch'; readonly ts: number; readonly clientVersion: string }
  | { readonly name: 'load_complete'; readonly ts: number; readonly durationMs: number }
  | { readonly name: 'tutorial_complete'; readonly ts: number }
  | { readonly name: 'level_start'; readonly ts: number; readonly levelId: string }
  | { readonly name: 'level_complete'; readonly ts: number; readonly levelId: string;
      readonly stars: 0|1|2|3; readonly timeUsedMs: number;
      readonly ammoUsed: Readonly<Record<CannonType, number>> }
  | { readonly name: 'level_fail'; readonly ts: number; readonly levelId: string;
      readonly reason: FailReason; readonly progressPct: number }
  | { readonly name: 'cannon_used'; readonly ts: number; readonly cannon: CannonType; readonly levelId: string }
  | { readonly name: 'pause'; readonly ts: number; readonly levelId: string }
  | { readonly name: 'hint_used'; readonly ts: number; readonly levelId: string }
  | { readonly name: 'revive_used'; readonly ts: number; readonly levelId: string; readonly via: 'ad'|'coin' }
  | { readonly name: 'ad_expose'; readonly ts: number; readonly placement: string }
  | { readonly name: 'ad_complete'; readonly ts: number; readonly placement: string };
```

```typescript
// types/state.ts — 状态机类型（LevelState 见 3.1，这里补充全局）
export interface AppRootState {
  readonly player: PlayerSave;
  readonly currentLevel: LevelConfig | null;
  readonly settings: { sfxVolume: number; bgmVolume: number; haptic: boolean };
  readonly network: 'online' | 'offline';
}
```

**`tsconfig.json` 关键项**：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "readonly": true,
    "target": "ES2017",
    "module": "ESNext",
    "moduleResolution": "Node",
    "experimentalDecorators": true,
    "skipLibCheck": true
  }
}
```

**`exactOptionalPropertyTypes` + `readonly`** 是项目类型严格度底线，所有接口字段默认 `readonly`，需要可变时显式标注。

### 4.2 函数式编程约定

| 约定 | 实践 | 反模式（禁止） |
|---|---|---|
| 不可变数据 | `readonly` 字段 + spread 更新；reducer 返回新对象 | 直接 `obj.field = x` 修改入参 |
| 纯函数优先 | 业务逻辑全部位于 `xxxReducer.ts` / `xxx.ts`（pure） | 在 reducer 内调用 `wx.cloud.*` / `node.active = ...` |
| 副作用隔离 | 仅 `*System.ts`（Cocos Component）/ `*Effects.ts` 可有副作用 | 纯函数模块 import Cocos `Component` |
| 显式错误 | 用 `Result<T, E>` 联合类型，禁 `throw` 业务错误（除参数校验） | `try/catch` 吞错静默 |
| 类型驱动 | 先写 interface 再写实现；用 exhaustive check 防 union 漏分支 | `switch` 不带 `default: never` |

**Result 类型示例**：

```typescript
// utils/result.ts — pure
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> { return { ok: true, value }; }
export function err<E>(error: E): Result<never, E> { return { ok: false, error }; }
```

### 4.3 状态管理方案

**决策：Cocos 内置 + 类 Reducer，不引第三方库**（ADR-06）。

```typescript
// store/appStore.ts
export class AppStore {
  private state: AppRootState;
  private listeners = new Set<(s: AppRootState) => void>();

  dispatch(action: AppAction): void {            // effect
    this.state = appReducer(this.state, action); // pure
    this.listeners.forEach(l => l(this.state));
  }
  subscribe(cb: (s: AppRootState) => void): () => void { // effect
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  getState(): AppRootState { return this.state; }
}
```

**为何不引 zustand/mobx**：
- **包体**：zustand ≈ 1KB 但带 ESModule 兼容层；mobx ≈ 15KB。主包 4MB 预算紧张
- **平台风险**：第三方库在小游戏运行时偶有 Proxy/Reflect 兼容问题（mobx 依赖 Proxy）
- **Cocos 集成**：Cocos Component 已有 `@property` 装饰器，第三方库的双向绑定与 Cocos 生命周期错位
- **代价**：自写 Reducer + subscribe 约 80 行代码，可接受

**性能**：每次 dispatch 浅拷贝顶层对象（嵌套字段仍 `readonly` 引用共享），订阅者用 `===` 比较跳过未变字段，O(listeners) 而非 O(state)。

---

## 5. 后端 API 与数据库设计（微信云开发 CloudBase）

### 5.1 云函数列表

5 个云函数对应 PRD 4.7 三大能力（登录/上报/排行 + 关卡分发 + 埋点）。所有函数 Node.js 18，部署在 CloudBase。

#### 5.1.1 `login` — 登录

```typescript
// 请求（客户端 wx.cloud.callFunction）
interface LoginRequest {
  // 无显式参数，wx 运行时自动注入 openid（云函数端 wxContext.OPENID）
}

// 响应
interface LoginResponse {
  uid: string;                              // = openid（脱敏后作为玩家唯一 ID）
  token: string;                            // 会话 token（CloudBase 内部）
  isNewUser: boolean;
  save: PlayerSave | null;                  // 已有存档则返回，新用户为 null
}

// 云函数伪代码（cloud-functions/login/index.js）
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const existing = await db.collection('players').where({ _id: OPENID }).get();
  if (existing.data.length === 0) {
    const newSave: PlayerSave = {
      uid: OPENID, coins: 0, unlockedLevels: 1, stars: {},
      cannonUpgrades: { standard: 0, heavy: 0, cluster: 0, thermo: 0, ap: 0 },
      tutorialCompleted: false, dailyChallenge: { date: '', score: 0 },
      lastSyncTs: Date.now(),
    };
    await db.collection('players').add({ data: { _id: OPENID, ...newSave } });
    return { uid: OPENID, token: OPENID, isNewUser: true, save: newSave };
  }
  return { uid: OPENID, token: OPENID, isNewUser: false, save: existing.data[0] };
};
```

#### 5.1.2 `reportLevel` — 单局结果上报

```typescript
// 请求
interface ReportLevelRequest {
  result: LevelResult;                       // 完整对局结果
  clientVersion: number;
}

// 响应
interface ReportLevelResponse {
  ok: boolean;
  awardedStars: number;                      // 服务端校验后实际记入的星数（防作弊）
  awardedCoins: number;                      // 服务端计算的奖励金币
  updatedBestStars: 0 | 1 | 2 | 3;           // 该关历史最高星数
}

// 云函数关键逻辑（伪）
// 1. 服务端用 result.levelId 反查该关 stars_threshold，校验 result.stars 是否合理（防作弊）
// 2. 更新 players.stars[levelId] = max(旧, 新)
// 3. 写 level_results 记录（用于排行榜/统计）
// 4. 计算 coins 奖励（stars * 50 + bonus）
```

#### 5.1.3 `getRanking` — 排行榜

```typescript
// 请求
interface GetRankingRequest {
  scope: 'global' | 'friends';
  metric: 'total_stars' | 'level_stars';
  levelId?: string;                          // metric=level_stars 时必填
  limit?: number;                            // 默认 50，最大 100
  cursor?: string;                           // 分页游标
}

// 响应
interface RankEntry {
  uid: string;
  nickname: string;                          // 微信昵称（云函数 wxContext 可拿，需用户授权）
  avatar?: string;
  score: number;                             // 总星数 / 关卡星数
  rank: number;
}
interface GetRankingResponse {
  entries: RankEntry[];
  nextCursor?: string;
  myRank?: number;                           // 调用者自己的排名
}
```

#### 5.1.4 `getLevelConfig` — 关卡配置拉取（含版本协商）

```typescript
// 请求
interface GetLevelConfigRequest {
  levelId: string;
  clientVersion: number;                     // 客户端当前缓存的该关版本号
}

// 响应
interface GetLevelConfigResponse {
  action: 'use_cache' | 'download' | 'apply_patch';
  cdnUrl?: string;                           // action=download 时，返回云存储 CDN URL
  config?: LevelConfig;                      // 小关卡可直接内嵌（<50KB）
  patch?: object;                            // action=apply_patch 时，增量补丁
  serverVersion: number;
}

// 版本协商逻辑
// if (clientVersion === serverVersion) → action: 'use_cache'（304 等价）
// else if (变化小且可用补丁) → action: 'apply_patch'
// else → action: 'download'，返回 CDN URL
```

#### 5.1.5 `reportAnalytics` — 埋点批量上报

```typescript
// 请求
interface ReportAnalyticsRequest {
  events: ReadonlyArray<AnalyticsEvent>;     // 批量（建议 20-50 条/批）
  clientVersion: number;
}

// 响应
interface ReportAnalyticsResponse {
  ok: boolean;
  accepted: number;                          // 实际写入数
  rejected?: number;                         // schema 校验失败数
}
```

#### 5.1.6 `syncPlayerSave`（可选，5.1.1 login 已隐式同步）— 存档同步

```typescript
interface SyncPlayerSaveRequest { save: PlayerSave; }
interface SyncPlayerSaveResponse { ok: boolean; mergedSave: PlayerSave; conflictResolved: 'client_wins' | 'server_wins' | 'merged'; }
// 冲突策略：以 lastSyncTs 较新者为准；金币/stars 取 max
```

### 5.2 云数据库表结构

CloudBase 云数据库为 MongoDB 兼容文档型。`_id` 即主键。

#### `players` — 玩家存档

```typescript
interface PlayerDoc {
  _id: string;                               // = openid
  uid: string;
  coins: number;
  unlockedLevels: number;
  stars: Record<string, 0|1|2|3>;            // key = levelId
  cannonUpgrades: Record<CannonType, number>;
  tutorialCompleted: boolean;
  dailyChallenge: { date: string; score: number };
  lastSyncTs: number;
  createdAt: number;
  // 反范式（用于排行榜，避免 join）
  totalStars: number;                        // 由云函数维护 = sum(stars)
}
```

**索引**：
- `_id`（主键，自带）
- `totalStars`（desc）— 全局排行榜
- `createdAt`（desc）— 新玩家统计

#### `level_results` — 单局记录（用于统计 + 反作弊审计）

```typescript
interface LevelResultDoc {
  _id: auto;
  uid: string;
  levelId: string;
  success: boolean;
  stars: 0|1|2|3;
  timeUsedMs: number;
  ammoUsed: Record<CannonType, number>;
  failReason?: FailReason;
  clientVersion: number;
  ts: number;
}
```

**索引**：
- 复合索引 `(levelId, ts desc)` — 关卡级统计（通关率/失败原因）
- 复合索引 `(uid, levelId, stars desc)` — 玩家该关最佳记录
- `ts`（desc）— 近 N 天聚合（TTL 90 天自动清理）

#### `rankings` — 排行榜快照（定期物化，避免实时聚合）

```typescript
interface RankDoc {
  _id: auto;
  uid: string;
  metric: 'total_stars' | 'level_stars';
  scope: 'global';
  levelId?: string;                          // metric=level_stars 时
  score: number;
  rank: number;
  updatedAt: number;
}
```

**索引**：复合 `(scope, metric, levelId?, rank asc)` — 排行榜读取。

**刷新策略**：定时触发器（cron `0 0 * * *`）每天 0 点全量重算。

#### `analytics_events` — 埋点事件

```typescript
interface AnalyticsEventDoc {
  _id: auto;
  uid: string;
  name: string;                              // AnalyticsEvent['name']
  payload: object;                           // 原始事件字段
  ts: number;
  clientVersion: number;
  // 分片键（大数据量优化）
  dateStr: string;                           // 'YYYY-MM-DD'，便于按天聚合
}
```

**索引**：
- 复合 `(name, dateStr)` — 漏斗分析
- `(uid, ts)` — 用户行为序列
- TTL：180 天自动清理（埋点不需要永久保存）

#### `level_configs` — 关卡版本元数据（CDN URL 指针）

```typescript
interface LevelConfigMetaDoc {
  _id: string;                               // = levelId
  levelId: string;
  version: number;
  cdnPath: string;                           // 云存储路径 levels/ch4/Lv_015.json
  sha256: string;                            // 完整性校验
  sizeBytes: number;
  status: 'active' | 'deprecated' | 'beta';
  updatedAt: number;
}
```

**索引**：`status` + `levelId`。

### 5.3 云存储桶结构

| 路径前缀 | 内容 | 访问方式 | 热更频次 |
|---|---|---|---|
| `levels/ch{N}/Lv_XXX.json` | 第 N 章关卡 JSON | downloadFile + CDN | 章节发布后稳定 |
| `weekly/YYYYWW/` | 周更关卡（PRD 3.5） | downloadFile | 每周 |
| `hotfix/balance.json` | 平衡性补丁（风力系数/星级阈值微调） | downloadFile，启动时拉 | 按需 |
| `hotfix/Lv_XXX.patch.json` | 单关补丁 | downloadFile + apply_patch | 紧急修复 |
| `assets/ch{N}_textures.pac` | 美术资源分包（非热更，需发版） | loadBundle | 章节发布 |

**CDN 配置**：所有 JSON 设置 `Cache-Control: max-age=300`（5 分钟），保证版本协商生效；美术资源 `max-age=31536000`（一年，靠文件名 hash 失效）。

### 5.4 关卡热更策略

**版本协商流程**（客户端首次进入关卡 N）：

```
1. 客户端读本地缓存 version_local（无则 0）
2. callFunction('getLevelConfig', { levelId, clientVersion: version_local })
3. 服务端查 level_configs[levelId].version
4. 三分支：
   - 相同 → action='use_cache'，客户端用本地缓存
   - 有补丁 → action='apply_patch'，返回 patch，客户端合并
   - 大改 → action='download'，返回 cdnUrl，客户端 wx.cloud.downloadFile
5. 下载后用 sha256 校验（level_configs.sha256）
6. 写本地缓存 + version_local
```

**增量更新**：用 JSON Merge Patch（RFC 7396）实现 `apply_patch`，简单且人肉可读。例：

```json
// Lv_015.patch.json
{ "ammo": { "standard": 4 }, "stars_threshold": { "time_3star": 22 } }
```

客户端 `Object.assign(deepClone(cached), patch)`。

**回滚机制**：
- `level_configs.status = 'deprecated'` 可秒级下线坏关卡
- 客户端 fallback 到本地缓存（最近 5 关）
- 紧急回滚通过 `hotfix/` 覆盖发布（CDN 5 分钟生效）

**防作弊**：服务端 `reportLevel` 反查 `level_configs` 的 `stars_threshold`，校验 `result.stars` 是否与 `timeUsedMs`/`ammoUsed` 匹配；不匹配则降级 `awardedStars`。

### 5.5 数据安全与权限规则

CloudBase 安全规则（mini-app 端规则）：

| 集合 | 读 | 写 | 说明 |
|---|---|---|---|
| `players` | 仅 `doc._id == auth.openid` | 仅 `doc._id == auth.openid` | 玩家存档私有 |
| `level_results` | 仅自己的记录（`doc.uid == auth.openid`） | 仅自己写 | 历史记录私有，排行榜走物化 `rankings` |
| `rankings` | 全局可读 | 仅云函数（管理员）写 | 排行榜全局可读 |
| `analytics_events` | 不可读（仅云函数） | 任何人可写自己的（`auth.openid` 注入 uid） | 埋点写入开放，读取仅内部 |
| `level_configs` | 全局可读 | 仅云函数写 | 关卡元数据全局可读 |

**敏感数据**：
- `openid` 不直接暴露给前端（云函数注入 `uid`，前端只持有 `uid`）
- 微信昵称/头像需用户授权（`wx.getUserProfile`），仅在前端缓存，不入库
- 金币/星数等数值由服务端计算，客户端只发"我打了几星"，不发"我加了多少钱"

**审计**：`level_results` 保留 90 天，可用于反作弊回溯；`analytics_events` 保留 180 天。

---

## 6. 美术规范与 naming convention

### 6.1 美术资产命名规范

统一前缀 + 域 + 名称 + 变体的格式：`<域前缀>_<名称>_<变体>`。

| 域 | 前缀 | 示例 | 说明 |
|---|---|---|---|
| 主角 | `boris_` | `boris_idle.prefab`、`boris_aim.anim` | 鲍里斯表情/动作 |
| NPC 游客 | `skier_` | `skier_goggles.prefab`、`skier_goggles_buried.anim` | 5 种造型见 PRD 4.1 |
| 场景 | `terrain_` | `terrain_twin_peaks_a.prefab` | 与 LevelConfig.terrain 字段对齐 |
| 道具 | `prop_` | `prop_flag_finish.prefab`、`prop_wind_flag.prefab` | 终点旗、风向旗 |
| 炮台 | `cannon_` | `cannon_standard.prefab` | 5 种炮管外观（PRD 4.2） |
| 炮弹 | `ammo_` | `ammo_standard.png`、`ammo_heavy.png` | HUD 图标 |
| UI | `ui_` | `ui_hud_bg.png`、`ui_btn_pause.prefab` | 屏幕/按钮/背景 |
| 特效 | `fx_` | `fx_explosion_standard.prefab`、`fx_avalanche_wake.anim` | 5 爆炸 + 3 雪崩 + 2 风 + 10 UI |
| 音效 | `sfx_` | `sfx_cannon_fire_standard.mp3` | |
| BGM | `bgm_` | `bgm_chapter_1.mp3` | 按章节 |
| 雪层状态 | `snow_` | `snow_critical_pulse.anim` | 黄/红脉动 + 裂纹 |

**变体约定**：`_a`/`_b`/`_c` 表示同主题的不同布局变体；`_buried`/`_idle`/`_aim`/`_hit` 表示动画状态。

### 6.2 Sprite / Prefab / AnimationClip / Audio 资源组织

详见 2.2 目录树 `assets/textures/`、`prefabs/`、`animations/`、`audio/`。补充规范：

| 类型 | 格式 | 压缩 | 注意 |
|---|---|---|---|
| Sprite（2D） | PNG / WebP | tinypng + ASTC 6x6（移动端） | UI 用 PNG，背景用 WebP |
| Texture（3D 贴图） | JPG / KTX2 | ASTC 4x4（高）/ 6x6（中）/ 8x8（低） | 见 6.4 三档 |
| Prefab | `.prefab`（Cocos 原生） | - | 严禁循环引用 |
| AnimationClip | `.anim` | - | 帧率固定 30 FPS（节省内存） |
| Audio（SFX） | MP3 / OGG | 128 kbps，单声道 | 短音效用 MP3 |
| Audio（BGM） | MP3 | 96 kbps，立体声 | 长曲用 MP3 |

### 6.3 与 PRD 4.4 资产清单（~180 张）对应表

| PRD 类别 | 数量 | 命名域 | 本文档目录 |
|---|---|---|---|
| 角色立绘 + 表情库（6 主角 ×5 + 5 NPC ×3） | ~45 | `boris_*` / `skier_*` | `prefabs/characters/` + `animations/` |
| 场景 prefab（6 章 ×3 变体） | 18 | `terrain_*` | `prefabs/terrain/` |
| UI 屏 | ~25 | `ui_*` | `prefabs/ui/` |
| 弹药/道具图标 | 30 | `ammo_*` / `prop_*` | `textures/ui/` |
| 特效序列帧（5+3+2+10） | 20 | `fx_*` | `prefabs/fx/` + `textures/fx/` |
| 失败/过场动画 | 9 | `fx_ending_*` / `boris_buried_*` | `animations/` |
| **合计** | **~180**（PRD 4.4） | - | - |

### 6.4 分辨率与压缩策略

**目标分辨率**：竖屏 9:16，基准 750 × 1624（iPhone 中端设计稿）。

**适配策略**：
- Cocos Canvas 模式 `FIT_WIDTH`（宽度撑满，高度自适应）
- 安全区域：顶部留 88px（刘海/状态栏），底部留 100px（Home Indicator）
- 老旧 16:9 设备上下黑边可接受

**贴图三档**：

| 档位 | 适用机型 | ASTC | 单贴图上限 | 总贴图预算 |
|---|---|---|---|---|
| 高 | iPhone 12+ / 中高端安卓 | 4x4 | 1024² | 60 MB |
| 中 | iPhone 8 / 中端安卓 | 6x6 | 512² | 40 MB |
| 低 | 老旧机型（PRD 5.3 强制最低配置） | 8x8 | 256² | 25 MB |

**降级触发**：`utils/perf.ts` 启动时探测设备内存/GPU，匹配档位并加载对应 Asset Bundle 后缀（`_high`/`_mid`/`_low`）。

**主包美术预算**：≤ 2.5 MB（剩 1.5 MB 给脚本+引擎运行时）。

---

## 7. 性能预算与降级策略

### 7.1 主包 / 分包大小预算分配

按 0.3 修正后的 30 MB 总预算（保守档 20 MB）拆解：

| 模块 | 主包（≤4MB） | 分包合计（≤26MB / 保守 16MB） | 说明 |
|---|---|---|---|
| 引擎运行时 + 编译后脚本 | 1.2 MB | - | Cocos 引擎裁剪 + 全部 TS 编译产物 |
| Boot/Main 场景 + 基础 UI | 0.8 MB | - | 启动必需 |
| 第 1-3 章关卡 JSON | 0.1 MB | - | resources/levels/ch1_3/ |
| 第 1-3 章美术（terrain + 角色 + fx） | 1.5 MB | - | 主包内美术 |
| 分包 ch4_6 | - | 3.0 MB | |
| 分包 ch7_12 | - | 3.5 MB | |
| 分包 ch13_30 | - | 6.0 MB | 18 关，最大 |
| 分包 ch31_50 | - | 7.5 MB | 含 Boss 关大型雪山 |
| 分包 weekly（占位） | - | 2.0 MB | 周更预留 |
| 公共音频 BGM（按章节分包） | - | 4.0 MB | 每章 1 首 BGM |
| **合计** | **3.6 MB**（留 0.4MB 余量） | **26 MB**（保守 16MB） | - |

**分包加载策略**：进入关卡选界面时预加载下一章节分包；首次启动只加载主包。

### 7.2 帧率降级策略

PRD 4.9 要求 60 FPS（低端 30 FPS）。雪崩粒子是最大变量。

| 档位 | 机型判定 | 粒子上限 | 物理步长 | 目标 FPS |
|---|---|---|---|---|
| high | GPU 评 ≥ 80 / 内存 ≥ 4GB | 500 | 1/60s | 60 |
| mid | GPU 评 40-80 / 内存 2-4GB | 300 | 1/30s（插值渲染） | 30-45 |
| low | GPU 评 < 40 / 内存 < 2GB | 150 | 1/30s | 30 |

**判定逻辑**（`utils/perf.ts`）：
```typescript
// pseudo: 启动时探测
function detectTier(): 'high'|'mid'|'low' {
  const mem = wx.getDeviceInfo().memoryMB;        // 微信运行时
  const gpuScore = estimateGpuByBenchmark();      // 启动跑一个 100ms 微基准
  if (mem >= 4096 && gpuScore >= 80) return 'high';
  if (mem >= 2048 && gpuScore >= 40) return 'mid';
  return 'low';
}
```

**运行时降级**：FPS 持续低于目标 80% 持续 3 秒 → 自动降一档；恢复后再升档（防抖 10 秒）。

**其它降级项**：
- 雪崩粒子用 Sprite + GPU Instancing（不用真实 ParticleSystem，CPU 友好）
- 阴影：high 启用实时阴影，mid/low 用烘焙阴影贴图
- 能见度（暴风雪）：high 用全屏后处理，mid/low 用半透明覆盖层

### 7.3 内存预算

PRD 4.9：内存峰值 ≤ 300 MB。

| 项 | 预算 | 池化策略 |
|---|---|---|
| 贴图 | 120 MB | LRU 缓存，未使用 60s 卸载 |
| 雪崩粒子 | 30 MB（500 × 60B） | 对象池预分配，永不 GC |
| 游戏对象（炮弹/游客/特效） | 40 MB | 对象池 |
| 引擎 + 脚本 | 60 MB | - |
| 微信运行时 | 50 MB | - |
| **合计** | **300 MB** | - |

**对象池设计**（`core/Pool.ts`）：
```typescript
export class Pool<T> {
  constructor(private factory: () => T, private reset: (t: T) => void, initialSize: number);
  acquire(): T;
  release(t: T): void;
}
```
所有频繁创建销毁的对象（粒子、炮弹、特效 prefab）走 Pool，零运行时 allocation。

### 7.4 启动时长优化

PRD 4.9：≤ 3s（4G）。拆解：

| 阶段 | 预算 | 优化手段 |
|---|---|---|
| 主包下载 | 0.8s | 主包 3.6MB，CDN 加速 |
| 引擎 + 脚本初始化 | 0.6s | 裁剪未用引擎模块（3D 物理、VideoPlayer 全裁） |
| Boot 场景加载 | 0.4s | 仅显示 Logo + 进度条 |
| 登录 + 玩家存档 | 0.5s | 并行：login 与首场景加载并行 |
| Main 场景 + 第 1 章分包 | 0.7s | 首场景精简，shader 预编译在 Boot 后台进行 |
| **合计** | **3.0s** | |

**Shader 预编译**：启动时后台渲染一个含全部 shader 的隐藏 Quad，触发编译，避免首帧卡顿。

**延迟加载**：BGM、章节分包在玩家进入对应界面时才加载，不阻塞首屏。

---

## 8. 测试与 CI/CD 策略

### 8.1 单元测试框架

**Jest 29.x**（PRD 4.10 / QA Agent 行为准则锁定）。

**覆盖率目标**：

| 模块 | 覆盖率目标 | 优先级 |
|---|---|---|
| `avalanche/`（纯函数物理） | ≥ 90% | 最高（核心爽点） |
| `cannon/`（弹道/风偏） | ≥ 90% | 最高 |
| `level/`（reducer/星级） | ≥ 85% | 高 |
| `snow/`（状态迁移） | ≥ 85% | 高 |
| `skier/`（路径采样） | ≥ 80% | 中 |
| `weather/`、`input/`（纯函数部分） | ≥ 70% | 中 |
| `cloud/`、`analytics/`、`ui/`（副作用，集成测试覆盖） | ≥ 50% | 低 |

**测试组织**：`tests/unit/<module>/<file>.test.ts` 镜像 `assets/scripts/modules/` 结构。

**纯函数测试范式**：
```typescript
// tests/unit/cannon/windOffset.test.ts
describe('applyWind', () => {
  it('standard 弹在 3 级东风下应向 +x 偏移', () => {
    const result = applyWind(10, 0, { dirDeg: 90, force: 3, snowFog: 0 }, 'standard');
    expect(result.vx).toBeGreaterThan(10);
  });
  it('ap 弹抗风性强，应几乎不偏移', () => {
    const result = applyWind(10, 0, { dirDeg: 90, force: 3, snowFog: 0 }, 'ap');
    expect(Math.abs(result.vx - 10)).toBeLessThan(0.5);
  });
});
```

### 8.2 集成测试方案

**云函数本地模拟**：用 `tcb-service-sdk` 的本地环境或 `wx-server-sdk` mock。

```typescript
// tests/integration/reportLevel.test.ts
describe('reportLevel 云函数', () => {
  beforeAll(() => setupLocalCloudBase());  // 启动本地 MongoDB 内存版 + 函数
  it('应拒绝 stars 与 timeUsed 不匹配的作弊上报', async () => {
    const fakeResult: LevelResult = {
      levelId: 'Lv_015', success: true, stars: 3, timeUsedMs: 1000,  // 远小于 3 星门槛
      ammoUsed: {...}, timestamp: Date.now(), clientVersion: 1,
    };
    const res = await callFunction('reportLevel', { result: fakeResult });
    expect(res.awardedStars).toBeLessThan(3);  // 服务端降级
  });
});
```

**关卡 JSON 校验**：`tools/level-validator/` CLI，用 ajv 校验所有 `tests/fixtures/levels/*.json` 是否符合 4.1 节 `LevelConfig` 推导的 JSON Schema。

### 8.3 CI 流水线

GitHub Actions（或 GitLab CI），`.github/workflows/ci.yml`：

```yaml
name: CI
on: [push, pull_request]
jobs:
  lint-typecheck-test:
    runs-on: ubuntu-latest
    container: cocos/ci:3.8.8
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint                  # ESLint + tsc --noEmit
      - run: npm run typecheck             # 严格类型检查
      - run: npm run test:unit             # Jest 单测 + 覆盖率
      - run: npm run test:integration      # 云函数集成（本地 mock）
      - run: npm run validate:levels       # 关卡 JSON schema 校验
      - uses: codecov/codecov-action@v3    # 覆盖率上报
  build:
    needs: lint-typecheck-test
    runs-on: ubuntu-latest
    container: cocos/ci:3.8.8
    steps:
      - run: npm run build:wechat          # 构建微信小游戏包
      - run: npm run check:size            # 检查包体不超 4MB/30MB
      - uses: actions/upload-artifact@v3
        with: { name: wechat-build, path: build/wechatgame/ }
```

**门禁**：lint/typecheck/test 任一失败阻断合并；覆盖率低于目标时告警但不阻断（首期宽容，逐步收紧）。

### 8.4 灰度发布与 A/B 实验

对齐 PRD 5.4 M6 阶段（上线 + 数据驱动迭代）。

**灰度发布**：
- 微信小游戏原生支持按用户百分比灰度
- 关卡热更走 `level_configs.status`：`beta` → 10% 用户 → 全量 `active`

**A/B 实验框架**：
- 实验配置走 `hotfix/experiments.json`，CDN 下发
- 客户端启动时拉取，按 `uid % 100` 分桶
- 关键实验位：风力系数（PRD 5.3 风险应对）、星级阈值、教程顺序
- 数据采集复用 `analytics_events`，加 `experiment` 字段

```typescript
// pseudo
const exp = await getExperimentConfig();
const bucket = exp['wind_coeff_ab']?.buckets[hashUid(uid) % 100] ?? 'control';
WIND_OFFSET_COEFF = bucket === 'low' ? 0.4 : 0.6;
analytics.setExperiment({ wind_coeff_ab: bucket });
```

---

## 9. 风险与技术债登记

### 9.1 PRD 5.3 风险表的技术应对

| PRD 风险 | 级别 | 技术应对（本文档落实位置） |
|---|---|---|
| 雪崩物理表现不达标 | 高 | 3.2 自研粒子流 + 7.2 三档降级 + PRD 第 4 周"最小可玩原型"专项验收；不达标时降级方案：粒子数减半 / 改 2D 侧视角（保持 HeightField 接口不变） |
| 2.5D 读地形难度大 | 高 | 6.1 新手期更亮预警色 + 危险层光柱（垂直光柱标位置）；`danger_zones.position` 同时驱动 2D 小地图 overlay |
| 风力机制过复杂劝退 | 中 | 3.6 `WIND_OFFSET_COEFF` 走 CDN `hotfix/balance.json` 热更，无需发版即可降 30%；8.4 A/B 框架验证 |
| 小程序性能不达标 | 中 | 7.2 三档降级自动切换 + 7.3 对象池零 allocation + 7.4 启动优化；最低配置在启动时弹出提示 |
| 美术资产超工期 | 中 | 6.3 资产清单对应表已建立工程基线；第 8 周（PRD 5.4 M3 中期）做盘点，超 20% 则 ch31_50 分包削减，Boss 关降为周更 |
| 关卡难度曲线失准 | 中 | 8.1 关卡 JSON schema 校验保证数据正确；上线后 `level_results` 聚合通关率，2 周内快速迭代星级阈值（热更） |
| 微信审核被卡 | 低 | 9.2 技术债登记"暴力元素替换"；美术命名预留 `fx_ending_comic_*` 喜剧版本，可一键替换 |
| 变现模型决策推迟 | 低 | 埋点 `ad_expose`/`ad_complete` 已占位（3.10），数据齐后启用；商业模式不影响 M1-M5 架构 |

### 9.2 已知技术债登记

| # | 技术债 | 引入原因 | 偿还时机 | 影响 |
|---|---|---|---|---|
| TD-01 | 抖音小游戏适配未深度做 | M2-M4 仅验证编译 | M5 提审前 2 周 | 次目标，可接受 |
| TD-02 | 排行榜物化（非实时） | 实时聚合成本高 | DAU > 10w 时改实时 TopN | 玩家体验：每日 0 点更新 |
| TD-03 | 关卡补丁用 JSON Merge Patch（RFC 7396）浅合并 | 简单优先 | 若出现深层嵌套需求（如 danger_zones 数组局部改）则换 JSON Patch（RFC 6902） | 当前关卡结构扁平，够用 |
| TD-04 | 暴力/喜剧动画双版本预制 | 微信审核风险 | 上线后看审核反馈，若一次过则删除暴力版 | 包体冗余 ~1MB |
| TD-05 | `wx.getUserProfile` 昵称仅前端缓存 | 隐私合规 | 商业化阶段若需好友排行榜再入库 | 排行榜昵称显示可能缺失 |
| TD-06 | 物理用半隐式 Euler（非 RK4） | 性能优先 | 若出现"雪崩穿透地形"Bug 再升级 | 视觉抖动风险 |
| TD-07 | 未引入 ECS 架构 | 50 关规模 OOP/函数式够用 | 若 M6 后扩展大型玩法（如多人）再重构 | 现架构可平滑迁移到 ECS |
| TD-08 | 美术资源三档需人工维护 | 自动化管线投入大 | 美术资产稳定后建 CI 自动转档 | 美术工作量 ×3（已计入 PRD 4.4 人天） |

---

## 10. M1 交付清单与 M2 启动条件

### 10.1 M1 交付物清单

| # | 交付物 | 状态 | 路径 |
|---|---|---|---|
| 1 | 本架构设计文档（0-10 节齐全） | 完成 | `docs/architecture/2026-06-14-architecture-design.md` |
| 2 | TypeScript 类型定义骨架（4.1 节全部类型） | 待 Coder 落地 | `assets/scripts/types/{cannon,snow,level,player,analytics,state}.ts` |
| 3 | Cocos Creator 项目模板（目录树 + tsconfig + eslint） | 待 Coder 落地 | 项目根 |
| 4 | 云函数骨架（5.1 节 5 个函数签名 + 伪代码） | 待 Coder 落地 | `cloud-functions/{login,reportLevel,getRanking,getLevelConfig,reportAnalytics}/` |
| 5 | 关卡 JSON Schema 校验工具 | 待 Coder 落地 | `tools/level-validator/` |
| 6 | CI 流水线配置（8.3 节） | 待 Coder 落地 | `.github/workflows/ci.yml` |
| 7 | 美术 naming guide（6.1-6.4 节） | 完成（本文档） | 本文档第 6 章 |

**M1 不交付**：业务逻辑实现、可玩 Demo、美术资产（这些是 M2/M3 交付物）。

### 10.2 M2（核心玩法 Demo）启动条件

Coder Agent 启动 M2 编码前，以下必须就绪：

1. **M1 交付物全部通过 review**（PRD 团队 + 架构师签字）
2. **Cocos Creator 3.8.8 项目模板创建完成**，能 `npm run build:wechat` 成功产出空包
3. **tsconfig.json strict 模式开启**，`tsc --noEmit` 零错误
4. **类型定义骨架（4.1 节）落地**，全部 export 可被 import
5. **CI 流水线绿灯**（lint + typecheck + 空测试套件通过）
6. **云开发环境开通**，5 个云函数能本地 `tcb` 部署成功（即使返回 mock 数据）
7. **第 1 关 `Lv_001.json` 样例**通过 schema 校验（QA 协助）

**M2 范围**（PRD 5.4）：1 关可玩 Demo，含全部 5 种炮弹、雪崩物理、风向。**不含**：完整 UI、50 关、云对接深度集成（仅 mock）。

### 10.3 端到端时序图（关卡加载 → 游玩 → 结算 → 上报）

```
玩家         UIFramework    LevelSystem    CloudBridge   AvalancheSys   SnowLayerSys   AnalyticsService
 │               │               │               │              │              │                │
 │ 进入Lv_015     │               │               │              │              │                │
 ├──────────────▶│ startLevel    │               │              │              │                │
 │               │──────────────▶│               │              │              │                │
 │               │               │ getLevelConfig│              │              │                │
 │               │               ├──────────────▶│              │              │                │
 │               │               │               │ 版本协商      │              │                │
 │               │               │◀──config──────┤              │              │                │
 │               │               │               │              │              │                │
 │               │               │ 校验JSON      │              │              │                │
 │               │               │ dispatch LOADED              │              │                │
 │               │               │──initZones──▶ │              │              ├──initZones────▶│
 │               │               │──initSkiers─▶ │              │              │                │
 │               │               │──initWeather▶ │              │              │                │
 │               │               │ funnel('lv1') │              │              │                ├─track
 │               │◀──showHUD─────┤               │              │              │                │
 │ 观察地形       │               │ phase=ready   │              │              │                │
 │◀──渲染─────────┤               │               │              │              │                │
 │               │               │               │              │              │                │
 │ 拖拽瞄准       │               │               │              │              │                │
 ├─touch────────▶│ onDragMove    │               │              │              │                │
 │               │─showAimArrow─▶│ dispatch AIM_BEGIN          │              │                │
 │               │               │ phase=aiming  │              │              │                │
 │ 松手           │ onDragEnd     │               │              │              │                │
 ├──────────────▶│──────────────▶│ dispatch FIRE │              │              │                │
 │               │               │──fire────────▶│              │              │                │
 │               │               │               │              │ CannonSys 计算弹道            │
 │               │               │               │              │ 命中临界层                     │
 │               │               │               │              │──trigger────▶│                │
 │               │               │               │              │              │ onImpact       │
 │               │               │               │              │              │─snowReducer──▶│
 │               │               │               │              │              │ 触发雪崩        │
 │               │               │               │              │◀─impact──────┤                │
 │               │               │               │              │ tick 粒子流    │                │
 │               │               │ dispatch IMPACT             │              │                │
 │               │               │ phase=firing→ready          │              │                │
 │               │               │ cannon_used 埋点                            │                ├─track
 │               │               │               │              │              │                │
 │ (循环 FIRE 直到全清)                                                            │                │
 │               │               │ dispatch SETTLE (全清)                      │                │
 │               │               │ rateStars()    │              │              │                │
 │               │               │ phase=result   │              │              │                │
 │               │◀──showSettlement───────────────┤              │              │                │
 │               │               │ reportLevel    │              │              │                │
 │               │               ├──────────────▶│              │              │                │
 │               │               │               │ 云函数校验    │              │                │
 │               │               │               │ 写DB         │              │                │
 │               │               │◀──awardedStars┤              │              │                │
 │               │               │ level_complete 埋点                                          ├─track+flush
 │ 选择下一关     │               │               │              │              │                │
 ├──────────────▶│               │               │              │              │                │
```

**关键不变量**：
- 所有业务逻辑走 reducer（pure），时序图中的 dispatch 即 reducer 入口
- 副作用（CloudBridge / 渲染）只在 System 层
- 埋点在关键节点（level_start / level_complete / cannon_used / level_fail）触发

---

## 11. 附录

### 11.1 术语表

| 缩写 | 全称 | 说明 |
|---|---|---|
| PRD | Product Requirements Document | 产品需求文档 |
| ADR | Architecture Decision Record | 架构决策记录 |
| Reducer | - | 纯函数 (state, action) => state |
| CDN | Content Delivery Network | 内容分发网络 |
| CloudBase | - | 微信云开发 |
| Asset Bundle | - | Cocos 资源分包 |
| LTS | Long Term Support | 长期支持版本 |
| ASTC | Adaptive Scalable Texture Compression | 贴图压缩格式 |
| TTL | Time To Live | 数据库自动过期 |

### 11.2 参考链接

- [Cocos Creator 3.8 用户手册](https://docs.cocos.com/creator/3.8/manual/zh/)
- [Cocos Creator 下载页（3.8.8 LTS）](https://www.cocos.com/creator-download)
- [Cocos 小游戏分包指南](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/subpackage.html)
- [微信小游戏代码包限制](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/code-package.html)
- [微信小游戏分包加载](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/subPackage/useSubPackage.html)
- [微信云开发官网](https://cloud.weixin.qq.com/cloudbase)
- [CloudBase 官方文档](https://docs.cloudbase.net/)

### 11.3 修订历史

| 版本 | 日期 | 作者 | 变更 |
|---|---|---|---|
| v1.0 | 2026-06-14 | 架构师 Agent | 初版（M1 交付） |

---

**文档结束。请 PRD 团队 review，确认通过后归档并启动 M2 阶段（Coder Agent 接手）。**


