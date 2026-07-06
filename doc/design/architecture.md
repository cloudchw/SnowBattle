# 《滑雪大冒险》（Snow Battle）系统架构设计文档

| 字段 | 值 |
|---|---|
| 文档版本 | **v4.0（回归 Cocos 2D）** |
| 创建日期 | 2026-06-14（v2.0）/ 2026-07-06（v4.0 回归） |
| 依赖 PRD | `doc/product/prd.md` v4.0 |
| 适用阶段 | 技术选型最终确定 → M1 |
| 文档状态 | 已确认 |
| 变更记录 | v2.0 Cocos2.5D → v3.0 团结3D → v3.1 团结2.5D → **v4.0 回归 Cocos 2D**（无 3D 团队；Cocos 代码/50 关 JSON/云函数全复用、零迁移成本） |

---

## 0. 文档元信息

### 0.1 版本与状态

本文档为 M1 阶段交付物，覆盖 0–11 共 12 个章节。M2 启动前需经 PRD 团队 review 通过。任何对 PRD 锁定项（见 7 节）的偏离必须显式记录在 0.4 决策记录中并升级到产品负责人。

### 0.2 阅读对象

- **产品经理**：重点看 1.3（PRD 一致性映射）、9（风险应对）
- **Coder Agent**：重点看 2（项目结构）、3（模块 API）、4（类型系统）、5（后端 API）
- **QA Agent**：重点看 4（类型契约）、5（API schema）、8（测试策略）
- **主美**：重点看 6（美术规范与 naming convention）

### 0.3 与 PRD 的关键修正

本文档在以下几点与 PRD v2.1 存在事实性差异，以**最新官方规则为准**，PRD 后续需同步更新：

| 项目 | PRD 写法 | 最新事实（核实日期 2026-06-14） | 影响 | 处理 |
|---|---|---|---|---|
| 微信小游戏总包限制 | ≤ 20 MB | ≤ **30 MB**（已统一，不再区分虚拟支付） | 给美术/分包更大预算空间 | 7.1 预算按 30 MB 拆解，同时保留 20 MB 作为"保守档"目标 |
| Cocos Creator 版本 | 3.8.x（未指定小版本） | 当前最新 LTS = **3.8.8**（2025-12-16 发布） | 锁定小版本以避免 API 漂移 | 2.1 节锁定 3.8.8，CI 中固定 |

### 0.4 决策记录（ADR Summary）

| # | 决策 | 选择 | 不这么选的代价 |
|---|---|---|---|
| ADR-01 | 引擎 | Cocos Creator 3.8.8 LTS | Laya 社区小、TS 体验弱；PixiJS 无编辑器；Egret 更新停滞 |
| ADR-02 | 物理 | 自研轻量碰撞 + 高度图网格 | Box2D/Cannon.js 刚体昂贵、表现不可控 |
| ADR-03 | 后端 | 微信云开发 CloudBase | 自建后端 DevOps 成本高、与微信免鉴权能力不匹配 |
| ADR-04 | 语言 | TypeScript strict | JS 弱类型无法支撑 10 模块 + 50 关 + 周更的可维护性 |
| ADR-05 | 编程范式 | 函数式优先（纯函数 + Reducer），副作用隔离到 Effect 模块 | OOP 继承层级在 Cocos 组件生态下易产生上帝对象 |
| ADR-06 | 状态管理 | Cocos 内置 + 类 Reducer（不引第三方库） | zustand/mobx 引入额外包体和平台兼容风险 |
| ADR-07 | 关卡分发 | 主包只放 1-3 章，4 章起走 CDN | 主包塞满后无法热更，无法做周更 |
| ADR-08 | 总包预算 | 按 30 MB 上限设计，20 MB 为保守档 | 按旧 20 MB 设计会浪费新增的 10 MB 美术预算 |
| ADR-09 | 操控 | 手势操控（左屏跳/俯冲，右屏方向） | 虚拟按钮遮挡视野、沉浸感差 |
| ADR-10 | 视角 | 2.5D 等距 | 纯 2D 表现力弱；真 3D 性能开销大 |

---

## 1. 总体架构概览

### 1.1 系统全景图

```
┌──────────────────────────────────────────────────────────────────────┐
│                     客户端层（Cocos Creator 3.8.8）                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ InputSystem  │  │ LevelSystem  │  │ ObstacleSys  │  │UIFramework│ │
│  │ (手势识别)   │→ │  (状态机)    │→ │ (生成/碰撞)  │  │(HUD/菜单)│ │
│  └──────────────┘  └──────┬───────┘  └──────┬───────┘  └──────────┘ │
│                           │                 │                         │
│  ┌──────────────┐  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────────┐ │
│  │WeatherSystem │  │PlayerSystem  │  │CollectibleSys│  │Character │ │
│  │ (风/能见度)  │  │ (状态机)     │  │ (金币/道具)  │  │System    │ │
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
│                     云端层（微信云开发 CloudBase）                      │
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
│                     CDN 层（云存储 + 微信 CDN 加速）                    │
│  - 关卡 JSON 分包：levels/ch{N}/Lv_XXX.json                          │
│  - 美术资源分包：assets/ch{N}_textures.pac（4 章后）                  │
│  - 周更/热更：weekly/YYYYWW/*.json + hotfix/*.json                   │
└──────────────────────────────────────────────────────────────────────┘
```

**三层职责划分**：
- **客户端层**：所有玩法逻辑本地计算，零权威服务器，避免延迟
- **云端层**：只做存档/排行/关卡分发/埋点收集，无状态游戏逻辑
- **CDN 层**：纯静态资源分发，支持版本协商与回滚

### 1.2 技术栈最终决策表

| 维度 | 选型 | 版本/规格 | 锁定理由 |
|---|---|---|---|
| 游戏引擎 | Cocos Creator | **3.8.8 LTS**（2025-12-16 发布） | 微信小游戏官方首推，2.5D 友好 |
| 构建目标 | 微信小游戏（主） / 抖音小游戏（次） | wechatgame / bytedance-minigame | PRD 1.1 锁定 |
| 编程语言 | TypeScript | strict mode，`"strict": true` | PRD 4.8 锁定 |
| 物理 | 自研轻量碰撞 + 高度图 | 32×32 Grid | PRD 4.6 锁定，不引真物理 |
| 后端 | 微信云开发 CloudBase | 云函数 Node.js 18 + 云数据库 MongoDB 兼容 | PRD 4.7 锁定 |
| 数据格式 | JSON（关卡配置） | UTF-8，单文件 ≤ 50KB | 关卡热更需轻量 |
| 状态管理 | Cocos 内置 + 类 Reducer | 不引第三方库 | ADR-06 |
| 测试框架 | Jest | 29.x | PRD 4.10 锁定 |
| Lint | ESLint + @typescript-eslint | strict preset | 强类型约束的工程底线 |
| 构建 CI | GitHub Actions | node 18 + cocos-ci Docker | 见 8.3 |
| 包体上限 | 主包 ≤ 4MB / 总包 ≤ 30MB（保守 20MB） | 0.3 节修正后 | 微信官方现行规则 |

### 1.3 与 PRD 决策的一致性映射

| PRD 节 | 锁定项 | 本文档落实位置 | 一致性 |
|---|---|---|---|
| PRD 1.1 | Cocos Creator 3.8.x | 2.1（锁定 3.8.8） | OK |
| PRD 2.2 | 手势操控（左跳/俯冲，右方向） | 3.7 InputSystem | OK |
| PRD 2.3 | 障碍物状态系统（3色+隐藏） | 3.4 ObstacleSystem | OK |
| PRD 2.4 | 天气系统（6种天气） | 3.6 WeatherSystem | OK |
| PRD 2.5 | 道具系统（8种+组合） | 3.5 PowerUpSystem | OK |
| PRD 2.6 | 角色系统（6角色） | 3.8 CharacterSystem | OK |
| PRD 2.7 | 计分与星级 | 3.3 ScoringSystem | OK |
| PRD 3.x | 关卡 JSON 结构 + 章节 | 5.4 关卡热更 + 4.1 LevelConfig | OK |
| PRD 4.7 | 微信云开发 + 关卡热更 | 5.x（云函数/DB/存储/热更） | OK |
| PRD 4.8 | TypeScript 数据结构 | 4.1（扩展完整类型） | OK |
| PRD 4.9 | 性能预算 | 7.x（按 30MB 修正） | 偏离已记录 |
| PRD 4.10 | 埋点列表 | 3.10 AnalyticsService | OK |
| PRD 5.3 | 风险表 8 条 | 9 节逐条对应技术应对 | OK |
| PRD 5.4 | M1-M6 里程碑 | 10 节 M1 清单 + M2 启动条件 | OK |

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
| 升级策略 | 仅在 LTS 内升小版本（如 3.8.8 → 3.8.9），跨大版本需重新评估 |

### 2.2 完整目录树

遵循"函数式 + 强类型 + 模块边界清晰"，目录按域（domain）而非按技术分层组织：

```
snow-battle/
├── assets/
│   ├── scripts/
│   │   ├── types/                          # 全局类型定义（无运行时代码）
│   │   │   ├── obstacle.ts                 # ObstacleType / ObstacleState
│   │   │   ├── weather.ts                  # WeatherType / WeatherConfig
│   │   │   ├── level.ts                    # LevelConfig / LevelResult
│   │   │   ├── player.ts                   # PlayerSave / PlayerState
│   │   │   ├── powerup.ts                  # PowerUpType / PowerUpConfig
│   │   │   ├── character.ts                # CharacterType / CharacterStats
│   │   │   ├── collectible.ts              # CoinType / CollectibleConfig
│   │   │   ├── analytics.ts                # AnalyticsEvent 联合类型
│   │   │   └── index.ts                    # re-export
│   │   ├── config/                         # 静态配置常量（编译期内联）
│   │   │   ├── obstacles.ts                # 8 种障碍物 spec 表
│   │   │   ├── powerups.ts                 # 8 种道具 spec 表
│   │   │   ├── characters.ts               # 6 角色属性表
│   │   │   ├── balance.ts                  # 星级阈值、速度系数等
│   │   │   ├── weather.ts                  # 天气效果系数表
│   │   │   ├── build-targets.ts            # 分包配置
│   │   │   └── env.ts                      # 云环境 ID / CDN base URL
│   │   ├── modules/                        # 10 大模块（与第 3 章一一对应）
│   │   │   ├── level/
│   │   │   │   ├── LevelSystem.ts          # 状态机 + Reducer
│   │   │   │   ├── levelReducer.ts         # 纯函数 reducer
│   │   │   │   ├── levelEffects.ts         # 副作用（场景切换/上报）
│   │   │   │   ├── starRating.ts           # 纯函数：星级评定
│   │   │   │   └── levelLoader.ts          # CDN 加载 + 校验
│   │   │   ├── player/
│   │   │   │   ├── PlayerSystem.ts         # 玩家状态机 + Cocos Component
│   │   │   │   ├── playerReducer.ts        # 纯函数：状态迁移
│   │   │   │   ├── playerPhysics.ts        # 纯函数：移动/重力/碰撞响应
│   │   │   │   └── terrainEffect.ts        # 纯函数：地形速度修正
│   │   │   ├── obstacle/
│   │   │   │   ├── ObstacleSystem.ts       # 障碍物管理 Cocos Component
│   │   │   │   ├── obstacleSpawner.ts      # 纯函数：生成策略
│   │   │   │   ├── obstacleStateReducer.ts # 纯函数：状态迁移
│   │   │   │   ├── collisionDetector.ts    # 纯函数：碰撞检测
│   │   │   │   └── obstaclePool.ts         # 对象池管理
│   │   │   ├── weather/
│   │   │   │   ├── WeatherSystem.ts        # 天气系统 Cocos Component
│   │   │   │   └── weatherModel.ts         # 纯函数：天气效果计算
│   │   │   ├── collectible/
│   │   │   │   ├── CollectibleSystem.ts    # 金币/道具收集管理
│   │   │   │   ├── collectibleSpawner.ts   # 纯函数：生成策略
│   │   │   │   └── magnetEffect.ts         # 纯函数：磁铁吸引计算
│   │   │   ├── powerup/
│   │   │   │   ├── PowerUpSystem.ts        # 道具效果管理
│   │   │   │   └── powerupReducer.ts       # 纯函数：效果叠加/过期
│   │   │   ├── scoring/
│   │   │   │   ├── ScoringSystem.ts        # 计分系统
│   │   │   │   ├── scoreReducer.ts         # 纯函数：分数计算
│   │   │   │   └── comboSystem.ts          # 纯函数：连击计算
│   │   │   ├── character/
│   │   │   │   ├── CharacterSystem.ts      # 角色管理
│   │   │   │   └── characterConfig.ts      # 角色属性配置
│   │   │   ├── input/
│   │   │   │   ├── InputSystem.ts          # 手势输入
│   │   │   │   └── gestureRecognizer.ts    # 纯函数：手势识别
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
│   │   │   ├── GameApp.ts                  # 入口单例
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
│   │   ├── characters/                     # player_*, skier_*
│   │   ├── obstacles/                      # tree_*, cliff_*, ice_*
│   │   ├── collectibles/                   # coin_*, powerup_*
│   │   ├── fx/                             # 特效 prefab
│   │   ├── ui/                             # HUD/菜单/结算
│   │   └── terrain/                        # 雪地/冰面/森林
│   ├── textures/
│   │   ├── characters/
│   │   ├── obstacles/
│   │   ├── terrain/
│   │   ├── ui/
│   │   └── fx/
│   ├── animations/
│   │   ├── player/                         # 角色动作库
│   │   ├── obstacles/
│   │   └── fx/
│   ├── audio/
│   │   ├── sfx/
│   │   ├── bgm/
│   │   └── voice/                          # 失败吐槽语音（如有）
│   ├── materials/
│   ├── shaders/                            # 天气后处理 shader
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
├── cloud-functions/                        # 微信云函数源码
│   ├── login/
│   ├── reportLevel/
│   ├── getRanking/
│   ├── getLevelConfig/
│   └── reportAnalytics/
├── docs/
│   ├── architecture/                       # 本文档
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
├── .github/workflows/ci.yml
├── README.md
├── PRD.md
└── ARCHITECTURE.md                         # 本文档
```

**关键组织原则**：
1. **types/ 零运行时**：纯类型文件，便于跨模块共享且不进打包
2. **modules/ 内部三件套**：每个模块 = `XxxSystem.ts`（Cocos Component，含副作用）+ 业务纯函数（`xxxReducer.ts` / `xxx.ts`）+ 配置（`xxxConfig.ts`）
3. **store/ 类 Reducer**：全局状态用纯函数 reducer，副作用集中在 `*Effects.ts`
4. **core/ 胶水最小化**：`GameApp` 是场景树唯一的根 Component

### 2.3 命名规范

| 类别 | 规范 | 示例 |
|---|---|---|
| 文件名 | kebab-case 或 PascalCase（模块主类 PascalCase，工具 camelCase） | `LevelSystem.ts`、`gestureRecognizer.ts` |
| TypeScript class / interface / type / enum | PascalCase | `LevelSystem`、`LevelConfig`、`ObstacleType` |
| 函数 / 方法 / 变量 | camelCase | `loadLevel`、`terrainEffect`、`particleCount` |
| 常量（编译期） | UPPER_SNAKE_CASE | `MAX_PARTICLES_HIGH = 500`、`JUMP_COOLDOWN` |
| 私有成员 | 前缀 `_`（仅副作用类） | `_obstaclePool` |
| 纯函数模块 | 名词或动名词，禁止 `Manager`/`Helper` 后缀 | `terrainEffect.ts`（不要 `TerrainHelper.ts`） |
| 副作用类 | 后缀 `System` 或 `Service` | `CloudBridge`、`AnalyticsService` |
| Component 类 | 后缀 `View` 或 `System` | `HudView`、`LevelSystem` |
| Prefab 文件 | `<域>_<名称>` | `obstacle_tree.prefab`、`powerup_shield.prefab` |
| 关卡 ID | `Lv_<三位序号>` | `Lv_015` |

**禁止**：`any`、`// @ts-ignore`（需经 review 显式批准）、`god class`（单类 > 400 行需拆分）。

### 2.4 资源分组

| 层级 | 存放位置 | 加载方式 | 包含内容 | 体积预算 |
|---|---|---|---|---|
| **主包内** | `assets/scenes/`、`assets/scripts/`、`assets/prefabs/ui/`、`assets/textures/ui/`、`assets/resources/levels/ch1_3/` | 引擎自动随主包 | Boot/Main 场景、全部脚本、基础 UI、第 1-3 章关卡 JSON + 贴图 | ≤ 4 MB |
| **本地分包 ch4_6** | `assets/bundles/ch4_6/` | `assetManager.loadBundle('ch4_6')` | 第 4-6 章贴图 + Prefab + 关卡 JSON | ≤ 4 MB |
| **本地分包 ch7_12** | `assets/bundles/ch7_12/` | 按需 loadBundle | 对应章节资源 | ≤ 4 MB |
| **本地分包 ch13_30** | `assets/bundles/ch13_30/` | 按需 loadBundle | 对应章节资源 | ≤ 6 MB |
| **本地分包 ch31_50** | `assets/bundles/ch31_50/` | 按需 loadBundle | 含 Boss 关 | ≤ 7 MB |
| **CDN 关卡 JSON** | 云存储 `levels/ch{N}/Lv_XXX.json` | `wx.cloud.downloadFile` | 纯数据，无美术 | 单文件 ≤ 50 KB |
| **CDN 周更** | 云存储 `weekly/YYYYWW/` | downloadFile + 版本协商 | 周更关卡数据 | 单包 ≤ 200 KB |
| **CDN 热更补丁** | 云存储 `hotfix/` | downloadFile | 平衡性调整、Bug 修复 | 单文件 ≤ 20 KB |

**美术资源热更注意**：含新美术资源的更新仍需重新提审，因此美术资源走"分包内"，**纯数据（JSON）走 CDN 才能免提审热更**。

---

## 3. 模块划分（核心章节）

每个模块统一描述：**职责边界 / 对内 API（纯函数）/ 对外 API（Cocos Component 副作用）/ 依赖 / 关键文件**。标 `// pure` 的接口承诺纯函数，标 `// effect` 的接口含副作用。

### 3.1 关卡系统模块（LevelSystem）

**职责边界**：关卡生命周期编排。加载 CDN/本地关卡 JSON → 校验 → 进入状态机 → 各阶段调度其它模块 → 结算 → 上报。**不直接做**碰撞检测、UI 渲染、手势识别。

**状态机**（PRD 1.3 单关循环）：

```
Loading ─▶ Ready(观察) ─▶ Playing(滑行中) ─▶ Paused ─▶ Result(Win/Lose)
   │            │              │                 │            │
   │            │ 撞击/掉落/   │ 暂停按钮        │ 恢复       │ 重试/下一关
   │            │ 到达终点     │                 │            │
   │            ▼              ▼                 ▼            ▼
   │      (循环 Playing 直到结束条件)         Playing     返回菜单/重试
   └─ Failed(加载失败)                                   
```

**对内 API（纯函数）**：

```typescript
// level/levelReducer.ts — pure
export type LevelPhase = 'loading' | 'ready' | 'playing' | 'paused' | 'result';

export type LevelState = {
  readonly phase: LevelPhase;
  readonly config: LevelConfig;
  readonly elapsedMs: number;
  readonly countdownMs: number;
  readonly score: number;
  readonly coinsCollected: number;
  readonly obstaclesDodged: number;
  readonly comboCount: number;
  readonly comboMax: number;
  readonly activePowerUps: ReadonlyArray<{ type: PowerUpType; remainingMs: number }>;
  readonly playerState: PlayerState;
  readonly result: { stars: 0|1|2|3; win: boolean; failReason?: FailReason } | null;
};

export type LevelAction =
  | { type: 'LOADED'; config: LevelConfig }
  | { type: 'TICK'; dtMs: number }
  | { type: 'PLAYER_HIT'; damage: number }
  | { type: 'PLAYER_DEAD'; cause: FailReason }
  | { type: 'COIN_COLLECTED'; count: number }
  | { type: 'OBSTACLE_DODGED' }
  | { type: 'COMBO_INCREMENT' }
  | { type: 'COMBO_BREAK' }
  | { type: 'POWERUP_COLLECTED'; powerupType: PowerUpType }
  | { type: 'POWERUP_EXPIRED'; powerupType: PowerUpType }
  | { type: 'REACHED_END' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SETTLE' };

export function levelReducer(state: LevelState, action: LevelAction): LevelState; // pure
```

```typescript
// level/starRating.ts — pure
export function rateStars(
  config: LevelConfig,
  elapsedMs: number,
  coinsCollected: number,
  hitsTaken: number,
): 0 | 1 | 2 | 3;
```

**对外 API（Cocos Component，副作用）**：

```typescript
// level/LevelSystem.ts
@ccclass('LevelSystem')
export class LevelSystem extends Component {
  startLevel(levelId: string): Promise<void>;   // effect: 异步加载 + 校验 + 进入 ready
  startEndless(): void;                          // effect: 启动无尽模式
  retryLevel(): Promise<void>;                   // effect: 重置 reducer + 复位场景
  reportResult(): Promise<void>;                 // effect: 上报到云（委托 CloudBridge）
}
```

**依赖**：`CloudBridge`（加载/上报）、`PlayerSystem`、`ObstacleSystem`、`CollectibleSystem`、`WeatherSystem`、`UIFramework`、`AnalyticsService`。

**关键文件**：`assets/scripts/modules/level/{LevelSystem,levelReducer,levelEffects,starRating,levelLoader}.ts`

---

### 3.2 玩家系统模块（PlayerSystem）

**职责边界**：玩家状态机管理、移动/跳跃/俯冲逻辑、动画驱动、无敌帧处理。**不**做手势识别（那是 3.7）、不做碰撞检测（那是 3.4）。

**状态机**（PRD 2.2）：

```
                    ┌─────────────┐
                    │   idle      │
                    │  （待机）    │
                    └──────┬──────┘
                           │ 收到移动指令
                           ▼
                    ┌─────────────┐
              ┌─────│   running   │─────┐
              │     │  （滑行中）  │     │
              │     └──────┬──────┘     │
              │            │            │
         收到跳跃      收到俯冲     收到急停
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │ jumping  │ │ diving   │ │ braking  │
       │ （跳跃中）│ │ （俯冲中）│ │ （减速中）│
       └────┬─────┘ └────┬─────┘ └────┬─────┘
            │            │            │
            └────────────┼────────────┘
                         │ 动作结束 / 落地
                         ▼
                    ┌─────────────┐
                    │  invincible │ ← 被撞击后短暂无敌
                    │  （无敌中）  │
                    └──────┬──────┘
                           │ 无敌结束
                           ▼
                    ┌─────────────┐
                    │   dead      │
                    │  （死亡）    │
                    └─────────────┘
```

**对内 API（纯函数）**：

```typescript
// player/playerReducer.ts — pure
export type PlayerPhase = 'idle' | 'running' | 'jumping' | 'diving' | 'braking' | 'boosting' | 'invincible' | 'dead';

export type PlayerState = {
  readonly x: number;          // 横向位置（-1 左, 0 中, 1 右）
  readonly y: number;          // 纵向位置（高度）
  readonly speed: number;      // 当前速度
  readonly phase: PlayerPhase;
  readonly hp: number;
  readonly invincibleMs: number;
  readonly cooldowns: Readonly<{ jump: number; dive: number; brake: number; boost: number }>;
};

export type PlayerAction =
  | { type: 'JUMP' }
  | { type: 'DIVE' }
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'BRAKE' }
  | { type: 'BOOST' }
  | { type: 'TICK'; dtMs: number; terrainMod: number; weatherMod: number }
  | { type: 'HIT'; damage: number }
  | { type: 'LAND' }
  | { type: 'COOLDOWN_TICK'; dtMs: number };

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState; // pure
```

```typescript
// player/terrainEffect.ts — pure
export type TerrainType = 'snow' | 'ice' | 'uphill' | 'downhill' | 'hot_spring';
export function getTerrainSpeedModifier(terrain: TerrainType): number; // pure
export function getTerrainControlModifier(terrain: TerrainType): number; // pure
```

**对外 API（Cocos Component，副作用）**：

```typescript
// player/PlayerSystem.ts
@ccclass('PlayerSystem')
export class PlayerSystem extends Component {
  init(character: CharacterType): void;           // effect: 初始化角色属性
  applyInput(action: PlayerAction): void;          // effect: 应用输入 → dispatch reducer
  tick(dt: number): void;                         // effect: 每帧更新 → dispatch TICK
  getWorldPosition(): Vec2;                        // pure: 返回当前世界坐标
  onCollisionResponse(type: 'hit' | 'dodge'): void; // effect: 碰撞响应
}
```

**移动规则**：

| 地形 | 速度修正 | 控制修正 | 说明 |
|---|---|---|---|
| 平地雪面 | ×1.0 | ×1.0 | 基准 |
| 上坡 | ×0.7 | ×1.0 | 减速 |
| 下坡 | ×1.3 | ×1.0 | 加速 |
| 冰面 | ×1.2 | ×0.5 | 加速但失控 |
| 雪堆 | ×0.5 | ×1.0 | 撞碎减速 |
| 温泉 | ×0.8 | ×1.0 | 略减速 |

**天气影响**：

| 天气 | 速度修正 | 控制修正 |
|---|---|---|
| 晴天 | ×1.0 | ×1.0 |
| 小雪 | ×0.9 | ×0.9 |
| 暴风雪 | ×0.6 | ×0.5 |
| 大雾 | ×0.8 | ×0.8 |
| 夜间 | ×1.0 | ×0.9 |
| 狂风 | ×1.0 + 风偏移 | ×0.8 |

**依赖**：`CharacterSystem`（角色属性）、`WeatherSystem`（天气效果）。

**关键文件**：`assets/scripts/modules/player/{PlayerSystem,playerReducer,playerPhysics,terrainEffect}.ts`

---

### 3.3 计分系统模块（ScoringSystem）

**职责边界**：分数计算、连击管理、星级评定。**纯计算**，不持有游戏状态。

**对内 API（纯函数）**：

```typescript
// scoring/scoreReducer.ts — pure
export type ScoringState = {
  readonly score: number;
  readonly coinsCollected: number;
  readonly obstaclesDodged: number;
  readonly comboCount: number;
  readonly comboMax: number;
  readonly perfectDodges: number;  // 完美闪避次数
};

export type ScoringAction =
  | { type: 'DISTANCE_TICK'; meters: number }
  | { type: 'COIN_COLLECTED'; count: number }
  | { type: 'OBSTACLE_DODGED'; distance: number }  // distance 用于判定完美闪避
  | { type: 'COMBO_INCREMENT' }
  | { type: 'COMBO_BREAK' }
  | { type: 'POWERUP_USED' };

export function scoringReducer(state: ScoringState, action: ScoringAction): ScoringState; // pure
```

```typescript
// scoring/comboSystem.ts — pure
export function calculateComboMultiplier(comboCount: number): number;
// 返回 1.0 + comboCount * 0.1（如 10 连击 = ×2.0）

export function isPerfectDodge(obstacleDistance: number): boolean;
// 距障碍物 < 10px 时判定为完美闪避
```

**计分规则**（PRD 2.7）：

| 事件 | 得分 | 说明 |
|---|---|---|
| 距离 | 1 分/米 | 基础分 |
| 金币 | 10 分/个 | 收集得分 |
| 完美闪避 | 50 分/次 | 距障碍物 < 10px 时躲避 |
| 连击加成 | ×(1 + 连击数 × 0.1) | 连续躲避叠加 |
| 道具使用 | 20 分/次 | 使用道具得分 |

**对外 API（副作用）**：

```typescript
// scoring/ScoringSystem.ts
@ccclass('ScoringSystem')
export class ScoringSystem extends Component {
  onCoinCollected(count: number): void;    // effect: dispatch
  onObstacleDodged(distance: number): void; // effect: dispatch
  onPowerUpUsed(): void;                   // effect: dispatch
  getScore(): number;                      // pure
  getCombo(): number;                      // pure
}
```

**依赖**：`LevelSystem`（订阅状态变化）。

**关键文件**：`assets/scripts/modules/scoring/{ScoringSystem,scoreReducer,comboSystem}.ts`

---

### 3.4 障碍物系统模块（ObstacleSystem）

**职责边界**：障碍物生命周期管理（生成 → 状态更新 → 碰撞检测 → 回收）。**不**做玩家移动（3.2）、不做天气效果（3.6）。

**障碍物状态机**（PRD 2.3）：

```
生成（spawn）
    │
    ▼
┌──────────┐
│  normal  │ ← 默认状态，正常颜色
│ （安全）  │
└────┬─────┘
     │ 进入警告范围（距玩家 200-100px）
     ▼
┌──────────┐
│ warning  │ ← 黄色脉动动画
│ （警告）  │
└────┬─────┘
     │ 进入危险范围（距玩家 < 100px）
     ▼
┌──────────┐
│  danger  │ ← 红色强烈脉动 + 碎石下落
│ （危险）  │
└────┬─────┘
     │
     ├── 被玩家躲避 → 保持 danger → 移出屏幕 → 回收
     └── 与玩家碰撞 → 触发碰撞处理 → 回收
```

**对内 API（纯函数）**：

```typescript
// obstacle/obstacleSpawner.ts — pure
export function shouldSpawnObstacle(
  lastSpawnX: number,
  currentX: number,
  difficulty: number,  // 0-1，随距离递增
): boolean; // pure

export function chooseObstacleType(
  difficulty: number,
  rng: () => number,  // 确定性随机
): ObstacleType; // pure
```

```typescript
// obstacle/obstacleStateReducer.ts — pure
export function updateObstacleState(
  obstacle: ObstacleRuntime,
  playerDistance: number,
): ObstacleRuntime; // pure

export type ObstacleRuntime = {
  readonly id: number;
  readonly type: ObstacleType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  state: ObstacleState;
  hiddenType?: 'ice_crack' | 'snow预警' | '暗冰';
};
```

```typescript
// obstacle/collisionDetector.ts — pure
export type CollisionResult =
  | { hit: false }
  | { hit: true; obstacleType: ObstacleType; isFatal: boolean; position: Vec2 };

export function checkCollision(
  playerBounds: { x: number; y: number; width: number; height: number },
  obstacle: ObstacleRuntime,
): CollisionResult; // pure
```

**障碍物类型配置**：

| 类型 | 碰撞框 | 致命性 | 特殊效果 |
|---|---|---|---|
| 树木 | 窄高矩形 | 致命 | 无 |
| 悬崖 | 宽扁矩形（底部） | 致命 | 掉落动画 |
| 山坡 | 梯形 | 非致命 | 速度修正 |
| 其他滑雪者 | 人物大小 | 致命 | 随机变向 |
| 雪堆 | 方形 | 非致命 | 撞碎效果 + 减速 |
| 冰面 | 区域触发器 | 非致命 | 失控效果 |
| 温泉 | 区域触发器 | 非致命 | 减速效果 |
| 落石 | 圆形 | 致命 | 从上方掉落 |

**无尽模式生成规则**：
- 基础间距：200px
- 随距离递减：每 1000m 间距 -10px，最小间距 80px
- 类型权重：树木 40% / 悬崖 15% / 雪堆 20% / 其他滑雪者 15% / 冰面 10%
- 安全通道：始终保证至少一条可通过路径

**对外 API（副作用）**：

```typescript
// obstacle/ObstacleSystem.ts
@ccclass('ObstacleSystem')
export class ObstacleSystem extends Component {
  initFromConfig(obstacles: ReadonlyArray<ObstacleConfig>): void; // effect: 关卡模式初始化
  spawnForEndless(difficulty: number): void;                       // effect: 无尽模式随机生成
  tick(dt: number, playerX: number): void;                        // effect: 状态更新 + 回收
  checkAllCollisions(playerBounds: Rect): CollisionResult;         // effect: 批量碰撞检测
}
```

**依赖**：`LevelSystem`（关卡配置）、`PlayerSystem`（玩家位置）。

**关键文件**：`assets/scripts/modules/obstacle/{ObstacleSystem,obstacleSpawner,obstacleStateReducer,collisionDetector,obstaclePool}.ts`

---

### 3.5 道具系统模块（PowerUpSystem）

**职责边界**：道具效果激活/失效管理、效果叠加规则。

**对内 API（纯函数）**：

```typescript
// powerup/powerupReducer.ts — pure
export type ActivePowerUp = {
  readonly type: PowerUpType;
  readonly remainingMs: number;
  readonly charges: number;  // 降落伞等多次使用的道具
};

export type PowerUpState = {
  readonly active: ReadonlyArray<ActivePowerUp>;
};

export type PowerUpAction =
  | { type: 'ACTIVATE'; powerupType: PowerUpType }
  | { type: 'TICK'; dtMs: number }
  | { type: 'USE_CHARGE'; powerupType: PowerUpType }
  | { type: 'EXPIRE'; powerupType: PowerUpType };

export function powerupReducer(state: PowerUpState, action: PowerUpAction): PowerUpState; // pure
```

**道具配置**：

| 道具 | 持续时间 | 效果 | 可叠加 |
|---|---|---|---|
| 护盾 | 一次性 | 抵挡一次致命碰撞 | 否（新替换旧） |
| 加速器 | 5 秒 | 速度 ×1.5 | 否（刷新时间） |
| 磁铁 | 8 秒 | 吸引半径 200px 内金币 | 否（刷新时间） |
| 冰镐 | 10 秒 | 冰面不失控 | 否（刷新时间） |
| 降落伞 | 3 次跳跃 | 跳跃后缓慢下落 | 是（次数叠加） |
| 照明弹 | 5 秒 | 消除雾/暴风雪效果 | 否（刷新时间） |
| 雪铲 | 一次性 | 清除前方 3 个雪堆 | 否 |

**对外 API（副作用）**：

```typescript
// powerup/PowerUpSystem.ts
@ccclass('PowerUpSystem')
export class PowerUpSystem extends Component {
  collect(powerupType: PowerUpType): void;  // effect: dispatch ACTIVATE
  tick(dt: number): void;                    // effect: dispatch TICK
  useCharge(type: PowerUpType): boolean;     // effect: 消耗次数，返回是否成功
  hasActive(type: PowerUpType): boolean;     // pure
}
```

**依赖**：`PlayerSystem`（应用效果）、`WeatherSystem`（照明弹效果）。

**关键文件**：`assets/scripts/modules/powerup/{PowerUpSystem,powerupReducer}.ts`

---

### 3.6 天气系统模块（WeatherSystem）

**职责边界**：天气状态管理、视觉效果渲染、游戏数值影响。**纯函数模型** + 副作用渲染分离。

**对内 API（纯函数）**：

```typescript
// weather/weatherModel.ts — pure
export interface WeatherConfig {
  readonly type: WeatherType;
  readonly visibility: number;    // 0-1
  readonly speedMod: number;      // 速度修正系数
  readonly controlMod: number;    // 控制修正系数
  readonly windForce: number;     // 0-5
  readonly windDir: number;       // 0-359 度
}

export const WEATHER_CONFIGS: Readonly<Record<WeatherType, WeatherConfig>>;

export function getSpeedModifier(weather: WeatherType): number; // pure
export function getControlModifier(weather: WeatherType): number; // pure
export function getVisibility(weather: WeatherType): number; // pure
export function getWindOffset(weather: WeatherType, playerDir: number): number; // pure
```

**对外 API（Cocos Component，副作用）**：

```typescript
// weather/WeatherSystem.ts
@ccclass('WeatherSystem')
export class WeatherSystem extends Component {
  init(config: WeatherConfig): void;           // effect: 设置视觉效果
  changeWeather(type: WeatherType, duration: number): void; // effect: 切换天气
  current(): WeatherConfig;                     // pure
  tick(dt: number): void;                      // effect: 更新粒子效果
  enableStormMode(): void;                     // effect: Boss 关暴风雪
}
```

**天气配置表**：

| 天气 | 能见度 | 速度修正 | 控制修正 | 风力 | 视觉效果 |
|---|---|---|---|---|---|
| 晴天 | 100% | ×1.0 | ×1.0 | 无 | 明亮阳光 |
| 小雪 | 80% | ×0.9 | ×0.9 | 1级 | 雪花粒子 |
| 暴风雪 | 30% | ×0.6 | ×0.5 | 4级 | 暴风雪+模糊 |
| 大雾 | 20% | ×0.8 | ×0.8 | 无 | 半透明雾层 |
| 夜间 | 50% | ×1.0 | ×0.9 | 无 | 暗色调+路灯 |
| 狂风 | 90% | ×1.0 | ×0.8 | 3级 | 风向旗帜+方向偏移 |

**依赖**：`UIFramework`（HUD 天气显示）、`PlayerSystem`（消费者）。

**关键文件**：`assets/scripts/modules/weather/{WeatherSystem,weatherModel}.ts`

---

### 3.7 输入系统模块（InputSystem）

**职责边界**：手势识别（左屏跳/俯冲，右屏方向）、双指缩放/旋转。识别手势后转成领域事件，**不**直接操作任何业务对象。

**手势识别规则**：

| 手势 | 判定条件 | 触发动作 | 冷却时间 |
|---|---|---|---|
| 上滑 | 左半屏，垂直位移 ≥ 50px，时间 < 0.3s | 跳跃 | 0.8s |
| 下滑 | 左半屏，垂直位移 ≥ 50px，时间 < 0.3s | 俯冲 | 0.6s |
| 左滑 | 右半屏，水平位移 ≥ 30px | 左移 | 无 |
| 右滑 | 右半屏，水平位移 ≥ 30px | 右移 | 无 |
| 右下滑 | 右半屏，垂直位移 ≥ 40px | 急停 | 2.0s |
| 右上滑 | 右半屏，垂直位移 ≥ 40px | 加速 | 3.0s |
| 双指捏合 | 两指距离缩小 ≥ 20% | 缩放视角 | 无 |
| 双指旋转 | 两指角度变化 ≥ 10° | 旋转视角 | 无 |

**新手教学过滤**：

| 关卡段 | 开放手势 | 关闭手势 |
|---|---|---|
| 1-3 关 | 上滑、左滑、右滑 | 下滑、急停、加速 |
| 4-6 关 | + 下滑 | 急停、加速 |
| 7-10 关 | + 急停、加速 | - |
| 11+ 关 | 全部开放 | - |

**对内 API（纯函数）**：

```typescript
// input/gestureRecognizer.ts — pure
export interface TouchSample { readonly x: number; readonly y: number; readonly t: number; }
export interface GestureResult {
  readonly direction: 'up' | 'down' | 'left' | 'right' | 'down_right' | 'up_right' | null;
  readonly length: number;
  readonly duration: number;
  readonly screen: 'left' | 'right';
}

export function recognizeGesture(samples: ReadonlyArray<TouchSample>): GestureResult | null; // pure
export function classifyPinch(touches: ReadonlyArray<Touch[]>): 'zoom' | 'rotate' | null; // pure
```

**对外 API（副作用）**：

```typescript
// input/InputSystem.ts
@ccclass('InputSystem')
export class InputSystem extends Component {
  onGesture(cb: (gesture: GestureResult) => void): void;    // effect: 注册手势回调
  onPinch(cb: (kind: 'zoom'|'rotate', value: number) => void): void; // effect: 注册缩放回调
  setTutorialFilter(allowedGestures: ReadonlySet<string>): void; // effect: 新手过滤
  isEnabled(): boolean;                                       // pure
  setEnabled(enabled: boolean): void;                         // effect
}
```

**依赖**：`PlayerSystem`（消费手势）、`UIFramework`（视觉反馈）。

**关键文件**：`assets/scripts/modules/input/{InputSystem,gestureRecognizer}.ts`

---

### 3.8 角色系统模块（CharacterSystem）

**职责边界**：角色属性管理、解锁条件、装备切换。

**角色配置**：

| 角色 | 速度 | 跳跃 | 控制 | 特殊能力 | 解锁条件 |
|---|---|---|---|---|---|
| 小明 | ⭐⭐ | ⭐⭐ | ⭐⭐ | 无 | 免费 |
| 雪豹 | ⭐⭐⭐ | ⭐⭐ | ⭐ | 冲刺无敌 2s | 1000 金币 |
| 冰精灵 | ⭐ | ⭐⭐⭐ | ⭐⭐ | 跳跃高度 +30% | 通关第 10 关 |
| 暴风骑士 | ⭐⭐ | ⭐ | ⭐⭐⭐ | 转向灵敏 +20% | 通关第 20 关 |
| 极地探险家 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 全属性 +10% | 通关第 30 关 |
| 滑雪大师 | ⭐⭐ | ⭐⭐ | ⭐⭐ | 完美操控加分 ×2 | 全 3 星通关 |

**对内 API（纯函数）**：

```typescript
// character/characterConfig.ts — pure
export interface CharacterStats {
  readonly speedMod: number;      // 速度修正（每级 +5%）
  readonly jumpMod: number;       // 跳跃高度修正（每级 +8%）
  readonly controlMod: number;    // 转向灵敏度修正（每级 +6%）
  readonly specialAbility: string;
}

export const CHARACTER_STATS: Readonly<Record<CharacterType, CharacterStats>>;
export function canUnlock(character: CharacterType, playerSave: PlayerSave): boolean; // pure
```

**对外 API（副作用）**：

```typescript
// character/CharacterSystem.ts
@ccclass('CharacterSystem')
export class CharacterSystem extends Component {
  equip(character: CharacterType): void;           // effect: 切换角色
  getStats(): CharacterStats;                       // pure
  getUnlockedCharacters(): ReadonlyArray<CharacterType>; // pure
  tryUnlock(character: CharacterType): boolean;     // effect: 尝试解锁
}
```

**依赖**：`CloudBridge`（存档同步）。

**关键文件**：`assets/scripts/modules/character/{CharacterSystem,characterConfig}.ts`

---

### 3.9 收集物系统模块（CollectibleSystem）

**职责边界**：金币/道具的生成、碰撞判定、磁铁吸引效果。

**对内 API（纯函数）**：

```typescript
// collectible/collectibleSpawner.ts — pure
export function generateCoinPattern(
  pattern: string,
  startPos: Vec2,
  rng: () => number,
): ReadonlyArray<Vec2>; // pure

export function shouldSpawnPowerUp(
  difficulty: number,
  rng: () => number,
): PowerUpType | null; // pure
```

```typescript
// collectible/magnetEffect.ts — pure
export function calculateMagnetPull(
  playerPos: Vec2,
  coinPos: Vec2,
  magnetRadius: number,
  dt: number,
): Vec2; // pure, 返回偏移量
```

**对外 API（副作用）**：

```typescript
// collectible/CollectibleSystem.ts
@ccclass('CollectibleSystem')
export class CollectibleSystem extends Component {
  initFromConfig(config: LevelConfig['collectibles']): void; // effect
  spawnForEndless(difficulty: number): void;                 // effect
  tick(dt: number, playerPos: Vec2, hasMagnet: boolean): void; // effect
  checkCollection(playerBounds: Rect): { coins: number; powerup: PowerUpType | null }; // effect
}
```

**依赖**：`PlayerSystem`（位置）、`PowerUpSystem`（磁铁状态）。

**关键文件**：`assets/scripts/modules/collectible/{CollectibleSystem,collectibleSpawner,magnetEffect}.ts`

---

### 3.10 UI 框架模块（UIFramework）

**职责边界**：HUD（顶部时间/金币/分数/道具槽）、菜单、结算页、Toast 提示。**纯展示**，不持有业务状态。

**对外 API（副作用）**：

```typescript
// ui/UIFramework.ts
@ccclass('UIFramework')
export class UIFramework extends Component {
  // HUD 数据绑定
  setCountdown(ms: number): void;
  setCoins(count: number): void;
  setScore(score: number): void;
  setCombo(combo: number): void;
  setHP(hp: number): void;
  setPowerUps(powerups: ReadonlyArray<{ type: PowerUpType; remainingMs: number }>): void;
  setWeather(type: WeatherType): void;
  // 暂停/恢复
  showPauseMenu(): Promise<'resume' | 'restart' | 'quit'>;
  // 结算页
  showSettlement(result: LevelState['result']): Promise<'retry' | 'next' | 'revive' | 'menu'>;
  // Toast
  toast(msg: string, duration?: number): void;
  // 新手提示
  showTutorialStep(step: number): Promise<void>;
}
```

**布局**：横屏 16:9，顶部 HUD + 底部辅助按钮，手势区域半透明。

**依赖**：所有模块（订阅状态）。

**关键文件**：`assets/scripts/modules/ui/{UIFramework,hudView,settlementView,toastView}.ts`

---

### 3.11 云对接模块（CloudBridge）

**职责边界**：封装所有 `wx.cloud.*` 调用，统一错误处理、重试、超时、本地缓存。**不**做业务判断。

**对外 API（副作用）**：

```typescript
// cloud/CloudBridge.ts
export class CloudBridge {
  login(): Promise<{ uid: string; token: string }>;
  getLevelConfig(levelId: string, clientVersion: number): Promise<{ config: LevelConfig; serverVersion: number; patch?: object }>;
  reportLevel(result: LevelResult): Promise<{ ok: boolean; awardedStars: number }>;
  getRanking(scope: 'global' | 'friends', limit?: number): Promise<RankEntry[]>;
  reportAnalytics(events: ReadonlyArray<AnalyticsEvent>): Promise<{ ok: boolean }>;
  syncPlayerSave(save: PlayerSave): Promise<{ ok: boolean }>;
  loadPlayerSave(): Promise<PlayerSave | null>;
}
```

**实现要点**：
- 所有云函数调用走 `wx.cloud.callFunction`（小程序运行时免鉴权）
- 关卡 JSON 大文件走 `wx.cloud.downloadFile`（CDN 加速）
- 离线缓存：`wx.setStorageSync` 最近 5 关的 config
- 重试：指数退避，最多 3 次，超时 8s

**关键文件**：`assets/scripts/modules/cloud/{CloudBridge,auth,report,ranking,cdn}.ts`

---

### 3.12 埋点 SDK 模块（AnalyticsService）

**职责边界**：实现 PRD 4.10 全部埋点。本地批量缓冲 + 定时/退出时 flush。

**对内 API（类型安全事件定义）**：

```typescript
// analytics/eventSchema.ts — 类型定义
export type AnalyticsEvent =
  | { readonly name: 'app_launch'; readonly ts: number; readonly clientVersion: string }
  | { readonly name: 'load_complete'; readonly ts: number; readonly durationMs: number }
  | { readonly name: 'tutorial_complete'; readonly ts: number }
  | { readonly name: 'level_start'; readonly ts: number; readonly levelId: string; readonly mode: 'level' | 'endless' }
  | { readonly name: 'level_complete'; readonly ts: number; readonly levelId: string; readonly stars: 0|1|2|3; readonly timeUsedMs: number; readonly coinsCollected: number }
  | { readonly name: 'level_fail'; readonly ts: number; readonly levelId: string; readonly reason: FailReason; readonly progressPct: number }
  | { readonly name: 'gesture_used'; readonly ts: number; readonly gesture: string; readonly levelId: string }
  | { readonly name: 'powerup_used'; readonly ts: number; readonly powerupType: PowerUpType; readonly levelId: string }
  | { readonly name: 'pause'; readonly ts: number; readonly levelId: string }
  | { readonly name: 'revive_used'; readonly ts: number; readonly levelId: string; readonly via: 'ad' | 'coin' }
  | { readonly name: 'ad_expose'; readonly ts: number; readonly placement: string }
  | { readonly name: 'ad_complete'; readonly ts: number; readonly placement: string };

export type FailReason = 'obstacle_hit' | 'cliff_fall' | 'other_skier_hit' | 'avalanche_buried';
```

**对外 API（副作用）**：

```typescript
// analytics/AnalyticsService.ts
export class AnalyticsService {
  track(event: AnalyticsEvent): void;
  flush(): Promise<void>;
  setUserId(uid: string): void;
  funnel(node: 'launch' | 'loaded' | 'tutorial' | 'lv1' | 'lv5' | 'lv10' | 'lv20'): void;
}
```

**漏斗定义**（PRD 4.10）：启动 → 加载完成 → 教程完成 → 第 1 关 → 第 5 关（新手过渡）→ 第 10 关（周留关键）→ 第 20 关。

**关键文件**：`assets/scripts/modules/analytics/{AnalyticsService,eventSchema,funnel}.ts`

---

## 4. 数据结构与 TypeScript 类型系统

### 4.1 完整类型定义

PRD 4.8 已给出核心类型，本节**扩展为可编译的完整类型骨架**。

```typescript
// types/obstacle.ts
export type ObstacleType = 'tree' | 'cliff' | 'hill' | 'skier' | 'snow_pile' | 'ice' | 'hot_spring' | 'rock';
export type ObstacleState = 'normal' | 'warning' | 'danger';

export interface ObstacleConfig {
  readonly type: ObstacleType;
  readonly position: readonly [number, number];
  readonly state: ObstacleState;
  readonly count?: number;
}
```

```typescript
// types/weather.ts
export type WeatherType = 'clear' | 'light_snow' | 'blizzard' | 'fog' | 'night' | 'wind';

export interface WeatherConfig {
  readonly type: WeatherType;
  readonly visibility: number;
  readonly speedMod: number;
  readonly controlMod: number;
  readonly windForce: number;
  readonly windDir: number;
}
```

```typescript
// types/powerup.ts
export type PowerUpType = 'shield' | 'speed' | 'magnet' | 'ice_pick' | 'parachute' | 'flare' | 'snow_plow';

export interface PowerUpConfig {
  readonly type: PowerUpType;
  readonly position: readonly [number, number];
}
```

```typescript
// types/character.ts
export type CharacterType = 'xiaoming' | 'snow_leopard' | 'ice_spirit' | 'storm_knight' | 'polar_explorer' | 'ski_master';

export interface CharacterStats {
  readonly speedMod: number;
  readonly jumpMod: number;
  readonly controlMod: number;
  readonly specialAbility: string;
}
```

```typescript
// types/level.ts
import type { ObstacleConfig } from './obstacle';
import type { WeatherConfig } from './weather';
import type { PowerUpType } from './powerup';

export interface LevelConfig {
  readonly id: string;
  readonly name: string;
  readonly chapter: number;
  readonly terrain: string;
  readonly mode: 'level' | 'endless';
  readonly weather: WeatherConfig;
  readonly obstacles: ReadonlyArray<ObstacleConfig>;
  readonly collectibles: {
    readonly coins: { readonly count: number; readonly pattern: string };
    readonly powerups: ReadonlyArray<PowerUpConfig>;
  };
  readonly goals: {
    readonly primary: 'reach_end' | 'survive_time' | 'collect_coins';
    readonly secondary: Record<string, number>;
  };
  readonly stars_threshold: {
    readonly time_3star: number;
    readonly time_2star: number;
    readonly coins_3star: number;
    readonly coins_2star: number;
  };
  readonly npc_skiers?: {
    readonly count: number;
    readonly speed: number;
    readonly path: string;
  };
  readonly difficulty: number;  // 0-1，用于无尽模式生成
}

export type FailReason = 'obstacle_hit' | 'cliff_fall' | 'other_skier_hit' | 'avalanche_buried';

export interface LevelResult {
  readonly levelId: string;
  readonly success: boolean;
  readonly stars: 0 | 1 | 2 | 3;
  readonly timeUsedMs: number;
  readonly coinsCollected: number;
  readonly obstaclesDodged: number;
  readonly comboMax: number;
  readonly failReason?: FailReason;
  readonly timestamp: number;
  readonly clientVersion: number;
}
```

```typescript
// types/player.ts
import type { CharacterType } from './character';

export interface PlayerSave {
  readonly uid: string;
  readonly nickname: string;
  readonly avatar: string;
  readonly coins: number;
  readonly unlockedLevels: number;
  readonly stars: Readonly<Record<number, 0 | 1 | 2 | 3>>;
  readonly unlockedCharacters: ReadonlyArray<CharacterType>;
  readonly equippedCharacter: CharacterType;
  readonly tutorialCompleted: boolean;
  readonly dailyChallenge: { readonly date: string; readonly score: number };
  readonly settings: { readonly bgmVolume: number; readonly sfxVolume: number; readonly vibration: boolean };
  readonly lastLogin: number;
  readonly totalPlayTime: number;
  readonly lastSyncTs: number;
}
```

```typescript
// types/analytics.ts
import type { FailReason } from './level';
import type { PowerUpType } from './powerup';

export type AnalyticsEvent =
  | { readonly name: 'app_launch'; readonly ts: number; readonly clientVersion: string }
  | { readonly name: 'load_complete'; readonly ts: number; readonly durationMs: number }
  | { readonly name: 'tutorial_complete'; readonly ts: number }
  | { readonly name: 'level_start'; readonly ts: number; readonly levelId: string; readonly mode: 'level' | 'endless' }
  | { readonly name: 'level_complete'; readonly ts: number; readonly levelId: string;
      readonly stars: 0|1|2|3; readonly timeUsedMs: number; readonly coinsCollected: number }
  | { readonly name: 'level_fail'; readonly ts: number; readonly levelId: string;
      readonly reason: FailReason; readonly progressPct: number }
  | { readonly name: 'gesture_used'; readonly ts: number; readonly gesture: string; readonly levelId: string }
  | { readonly name: 'powerup_used'; readonly ts: number; readonly powerupType: PowerUpType; readonly levelId: string }
  | { readonly name: 'pause'; readonly ts: number; readonly levelId: string }
  | { readonly name: 'revive_used'; readonly ts: number; readonly levelId: string; readonly via: 'ad' | 'coin' }
  | { readonly name: 'ad_expose'; readonly ts: number; readonly placement: string }
  | { readonly name: 'ad_complete'; readonly ts: number; readonly placement: string };
```

```typescript
// types/state.ts
export interface AppRootState {
  readonly player: PlayerSave;
  readonly currentLevel: LevelConfig | null;
  readonly settings: { readonly sfxVolume: number; readonly bgmVolume: number; readonly vibration: boolean };
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

### 4.2 函数式编程约定

| 约定 | 实践 | 反模式（禁止） |
|---|---|---|
| 不可变数据 | `readonly` 字段 + spread 更新；reducer 返回新对象 | 直接 `obj.field = x` 修改入参 |
| 纯函数优先 | 业务逻辑全部位于 `xxxReducer.ts` / `xxx.ts`（pure） | 在 reducer 内调用 `wx.cloud.*` / `node.active = ...` |
| 副作用隔离 | 仅 `*System.ts`（Cocos Component）/ `*Effects.ts` 可有副作用 | 纯函数模块 import Cocos `Component` |
| 显式错误 | 用 `Result<T, E>` 联合类型，禁 `throw` 业务错误 | `try/catch` 吞错静默 |
| 类型驱动 | 先写 interface 再写实现；用 exhaustive check 防 union 漏分支 | `switch` 不带 `default: never` |

### 4.3 状态管理方案

**决策：Cocos 内置 + 类 Reducer，不引第三方库**（ADR-06）。

```typescript
// store/appStore.ts
export class AppStore {
  private state: AppRootState;
  private listeners = new Set<(s: AppRootState) => void>();

  dispatch(action: AppAction): void {
    this.state = appReducer(this.state, action);
    this.listeners.forEach(l => l(this.state));
  }
  subscribe(cb: (s: AppRootState) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  getState(): AppRootState { return this.state; }
}
```

---

## 5. 后端 API 与数据库设计（微信云开发 CloudBase）

### 5.1 云函数列表

5 个云函数，所有函数 Node.js 18，部署在 CloudBase。

#### 5.1.1 `login` — 登录

```typescript
// 请求
interface LoginRequest { /* 无参数，wx 运行时自动注入 openid */ }

// 响应
interface LoginResponse {
  uid: string;
  token: string;
  isNewUser: boolean;
  save: PlayerSave | null;
}
```

#### 5.1.2 `reportLevel` — 单局结果上报

```typescript
// 请求
interface ReportLevelRequest {
  result: LevelResult;
  clientVersion: number;
}

// 响应
interface ReportLevelResponse {
  ok: boolean;
  awardedStars: number;
  awardedCoins: number;
  updatedBestStars: 0 | 1 | 2 | 3;
}
```

#### 5.1.3 `getRanking` — 排行榜

```typescript
// 请求
interface GetRankingRequest {
  scope: 'global' | 'friends';
  metric: 'total_stars' | 'level_stars';
  levelId?: string;
  limit?: number;
  cursor?: string;
}

// 响应
interface RankEntry {
  uid: string;
  nickname: string;
  avatar?: string;
  score: number;
  rank: number;
}
interface GetRankingResponse {
  entries: RankEntry[];
  nextCursor?: string;
  myRank?: number;
}
```

#### 5.1.4 `getLevelConfig` — 关卡配置拉取

```typescript
// 请求
interface GetLevelConfigRequest {
  levelId: string;
  clientVersion: number;
}

// 响应
interface GetLevelConfigResponse {
  action: 'use_cache' | 'download' | 'apply_patch';
  cdnUrl?: string;
  config?: LevelConfig;
  patch?: object;
  serverVersion: number;
}
```

#### 5.1.5 `reportAnalytics` — 埋点批量上报

```typescript
// 请求
interface ReportAnalyticsRequest {
  events: ReadonlyArray<AnalyticsEvent>;
  clientVersion: number;
}

// 响应
interface ReportAnalyticsResponse {
  ok: boolean;
  accepted: number;
  rejected?: number;
}
```

### 5.2 云数据库表结构

#### `players` — 玩家存档

```typescript
interface PlayerDoc {
  _id: string;           // = openid
  uid: string;
  nickname: string;
  avatar: string;
  coins: number;
  unlockedLevels: number;
  stars: Record<string, 0|1|2|3>;
  unlockedCharacters: string[];
  equippedCharacter: string;
  tutorialCompleted: boolean;
  dailyChallenge: { date: string; score: number };
  settings: { bgmVolume: number; sfxVolume: number; vibration: boolean };
  lastSyncTs: number;
  createdAt: number;
  totalStars: number;    // 反范式，由云函数维护
}
```

**索引**：`_id`（主键）、`totalStars`（desc）— 全局排行榜、`createdAt`（desc）

#### `level_results` — 单局记录

```typescript
interface LevelResultDoc {
  _id: auto;
  uid: string;
  levelId: string;
  success: boolean;
  stars: 0|1|2|3;
  timeUsedMs: number;
  coinsCollected: number;
  obstaclesDodged: number;
  comboMax: number;
  failReason?: string;
  clientVersion: number;
  ts: number;
}
```

**索引**：复合 `(levelId, ts desc)` — 关卡级统计；`(uid, levelId, stars desc)` — 玩家最佳；TTL 90 天

#### `rankings` — 排行榜快照

```typescript
interface RankDoc {
  _id: auto;
  uid: string;
  metric: 'total_stars' | 'level_stars';
  scope: 'global';
  levelId?: string;
  score: number;
  rank: number;
  updatedAt: number;
}
```

**索引**：复合 `(scope, metric, levelId?, rank asc)`

**刷新策略**：定时触发器每天 0 点全量重算。

#### `analytics_events` — 埋点事件

```typescript
interface AnalyticsEventDoc {
  _id: auto;
  uid: string;
  name: string;
  payload: object;
  ts: number;
  clientVersion: number;
  dateStr: string;  // 'YYYY-MM-DD'
}
```

**索引**：复合 `(name, dateStr)` — 漏斗分析；`(uid, ts)` — 用户行为；TTL 180 天

#### `level_configs` — 关卡版本元数据

```typescript
interface LevelConfigMetaDoc {
  _id: string;           // = levelId
  levelId: string;
  version: number;
  cdnPath: string;
  sha256: string;
  sizeBytes: number;
  status: 'active' | 'deprecated' | 'beta';
  updatedAt: number;
}
```

### 5.3 云存储桶结构

| 路径前缀 | 内容 | 热更频次 |
|---|---|---|
| `levels/ch{N}/Lv_XXX.json` | 第 N 章关卡 JSON | 章节发布后稳定 |
| `weekly/YYYYWW/` | 周更关卡 | 每周 |
| `hotfix/balance.json` | 平衡性补丁 | 按需 |
| `hotfix/Lv_XXX.patch.json` | 单关补丁 | 紧急修复 |
| `assets/ch{N}_textures.pac` | 美术资源分包 | 章节发布 |

### 5.4 关卡热更策略

**版本协商流程**：

```
1. 客户端读本地缓存 version_local（无则 0）
2. callFunction('getLevelConfig', { levelId, clientVersion: version_local })
3. 服务端查 level_configs[levelId].version
4. 三分支：
   - 相同 → action='use_cache'
   - 有补丁 → action='apply_patch'，返回 patch
   - 大改 → action='download'，返回 cdnUrl
5. 下载后用 sha256 校验
6. 写本地缓存 + version_local
```

**增量更新**：用 JSON Merge Patch（RFC 7396）实现 `apply_patch`。

**回滚机制**：`level_configs.status = 'deprecated'` 秒级下线；客户端 fallback 到本地缓存。

### 5.5 数据安全与权限规则

| 集合 | 读 | 写 |
|---|---|---|
| `players` | 仅 `doc._id == auth.openid` | 仅 `doc._id == auth.openid` |
| `level_results` | 仅自己的记录 | 仅自己写 |
| `rankings` | 全局可读 | 仅云函数写 |
| `analytics_events` | 不可读（仅云函数） | 任何人可写自己的 |
| `level_configs` | 全局可读 | 仅云函数写 |

---

## 6. 美术规范与 naming convention

### 6.1 美术资产命名规范

| 域 | 前缀 | 示例 |
|---|---|---|
| 玩家角色 | `player_` | `player_xiaoming_idle.prefab` |
| NPC 滑雪者 | `skier_` | `skier_goggles.prefab` |
| 场景地形 | `terrain_` | `terrain_forest_a.prefab` |
| 障碍物 | `obstacle_` | `obstacle_tree.prefab`、`obstacle_cliff.prefab` |
| 收集物 | `coin_`、`powerup_` | `coin_gold.prefab`、`powerup_shield.prefab` |
| UI | `ui_` | `ui_hud_bg.png`、`ui_btn_pause.prefab` |
| 特效 | `fx_` | `fx_jump.prefab`、`fx_hit.prefab` |
| 音效 | `sfx_` | `sfx_jump.mp3` |
| BGM | `bgm_` | `bgm_chapter_1.mp3` |

### 6.2 资源规格

| 类型 | 格式 | 压缩 | 注意 |
|---|---|---|---|
| Sprite（2D） | PNG / WebP | tinypng + ASTC 6x6 | UI 用 PNG，背景用 WebP |
| Prefab | `.prefab` | - | 严禁循环引用 |
| AnimationClip | `.anim` | - | 帧率固定 30 FPS |
| Audio（SFX） | MP3 / OGG | 128 kbps，单声道 | |
| Audio（BGM） | MP3 | 96 kbps，立体声 | |

### 6.3 分辨率与压缩策略

**目标分辨率**：横屏 16:9，基准 1920 × 1080。

**适配策略**：
- Cocos Canvas 模式 `FIT_HEIGHT`
- 安全区域：左右留 40px

**贴图三档**：

| 档位 | 适用机型 | ASTC | 单贴图上限 | 总贴图预算 |
|---|---|---|---|---|
| 高 | iPhone 12+ / 中高端安卓 | 4x4 | 1024² | 60 MB |
| 中 | iPhone 8 / 中端安卓 | 6x6 | 512² | 40 MB |
| 低 | 老旧机型 | 8x8 | 256² | 25 MB |

**主包美术预算**：≤ 2.5 MB（剩 1.5 MB 给脚本+引擎运行时）。

---

## 7. 性能预算与降级策略

### 7.1 主包 / 分包大小预算分配

按 30 MB 总预算（保守 20 MB）拆解：

| 模块 | 主包（≤4MB） | 分包合计（≤26MB / 保守 16MB） |
|---|---|---|
| 引擎运行时 + 编译后脚本 | 1.2 MB | - |
| Boot/Main 场景 + 基础 UI | 0.8 MB | - |
| 第 1-3 章关卡 JSON | 0.1 MB | - |
| 第 1-3 章美术 | 1.5 MB | - |
| 分包 ch4_6 | - | 3.0 MB |
| 分包 ch7_12 | - | 3.5 MB |
| 分包 ch13_30 | - | 6.0 MB |
| 分包 ch31_50 | - | 7.5 MB |
| 分包 weekly | - | 2.0 MB |
| 公共音频 BGM | - | 4.0 MB |
| **合计** | **3.6 MB** | **26 MB** |

### 7.2 帧率降级策略

| 档位 | 机型判定 | 粒子上限 | 目标 FPS |
|---|---|---|---|
| high | GPU 评 ≥ 80 / 内存 ≥ 4GB | 150 | 60 |
| mid | GPU 评 40-80 / 内存 2-4GB | 80 | 30-45 |
| low | GPU 评 < 40 / 内存 < 2GB | 30 | 30 |

**运行时降级**：FPS 持续低于目标 80% 持续 3 秒 → 自动降一档；恢复后再升档（防抖 10 秒）。

### 7.3 内存预算

| 项 | 预算 | 池化策略 |
|---|---|---|
| 贴图 | 120 MB | LRU 缓存，未使用 60s 卸载 |
| 障碍物/金币/特效 | 40 MB | 对象池预分配 |
| 引擎 + 脚本 | 60 MB | - |
| 微信运行时 | 50 MB | - |
| **合计** | **~300 MB** | - |

### 7.4 启动时长优化

PRD 4.9：≤ 3s（4G）。

| 阶段 | 预算 | 优化手段 |
|---|---|---|
| 主包下载 | 0.8s | 主包 3.6MB，CDN 加速 |
| 引擎 + 脚本初始化 | 0.6s | 裁剪未用引擎模块 |
| Boot 场景加载 | 0.4s | 仅显示 Logo + 进度条 |
| 登录 + 玩家存档 | 0.5s | 并行：login 与首场景加载并行 |
| Main 场景 + 第 1 章分包 | 0.7s | 首场景精简 |
| **合计** | **3.0s** | |

---

## 8. 测试与 CI/CD 策略

### 8.1 单元测试框架

**Jest 29.x**。

**覆盖率目标**：

| 模块 | 覆盖率目标 | 优先级 |
|---|---|---|
| `obstacle/`（碰撞检测/状态迁移） | ≥ 90% | 最高 |
| `player/`（物理/地形效果） | ≥ 90% | 最高 |
| `level/`（reducer/星级） | ≥ 85% | 高 |
| `scoring/`（计分/连击） | ≥ 85% | 高 |
| `weather/`（天气模型） | ≥ 80% | 中 |
| `input/`（手势识别） | ≥ 80% | 中 |
| `collectible/`（生成策略） | ≥ 80% | 中 |
| `cloud/`、`analytics/`、`ui/` | ≥ 50% | 低 |

### 8.2 CI 流水线

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
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run validate:levels
      - uses: codecov/codecov-action@v3
  build:
    needs: lint-typecheck-test
    runs-on: ubuntu-latest
    container: cocos/ci:3.8.8
    steps:
      - run: npm run build:wechat
      - run: npm run check:size
      - uses: actions/upload-artifact@v3
        with: { name: wechat-build, path: build/wechatgame/ }
```

### 8.3 灰度发布与 A/B 实验

- 微信小游戏原生支持按用户百分比灰度
- 关卡热更走 `level_configs.status`：`beta` → 10% → 全量 `active`
- A/B 实验配置走 `hotfix/experiments.json`，按 `uid % 100` 分桶

---

## 9. 风险与技术债登记

### 9.1 PRD 5.3 风险表的技术应对

| PRD 风险 | 级别 | 技术应对 |
|---|---|---|
| 手势操控体验不达标 | 高 | 3.7 InputSystem + 新手过滤 + 备选虚拟按钮方案 |
| 2.5D 读地形难度大 | 高 | 障碍物预警色 + 光柱提示 + 新手期更亮色 |
| 天气机制过复杂劝退 | 中 | `WIND_OFFSET_COEFF` 走 CDN 热更 + A/B 验证 |
| 小程序性能不达标 | 中 | 三档降级 + 对象池 + 启动优化 |
| 美术资产超工期 | 中 | 第 8 周盘点，超 20% 削减 ch31_50 |
| 关卡难度曲线失准 | 中 | 上线后 `level_results` 聚合通关率，2 周快速迭代 |
| 微信审核被卡 | 低 | 喜剧化撞击动画，预留双版本 |
| 变现模型决策推迟 | 低 | 埋点已占位，数据齐后启用 |

### 9.2 已知技术债登记

| # | 技术债 | 引入原因 | 偿还时机 |
|---|---|---|---|
| TD-01 | 抖音小游戏适配未深度做 | M2-M4 仅验证编译 | M5 提审前 2 周 |
| TD-02 | 排行榜物化（非实时） | 实时聚合成本高 | DAU > 10w 时改实时 |
| TD-03 | 关卡补丁用 JSON Merge Patch 浅合并 | 简单优先 | 出现深层嵌套需求时换 JSON Patch |
| TD-04 | 撞击动画双版本预制 | 微信审核风险 | 上线后看审核反馈 |
| TD-05 | 物理用简单碰撞（非精确） | 性能优先 | 若出现穿透 Bug 再升级 |
| TD-06 | 未引入 ECS 架构 | 50 关规模够用 | M6 后扩展大型玩法时重构 |

---

## 10. M1 交付清单与 M2 启动条件

### 10.1 M1 交付物清单

| # | 交付物 | 状态 |
|---|---|---|
| 1 | 本架构设计文档（0-11 节齐全） | 完成 |
| 2 | TypeScript 类型定义骨架（4.1 节全部类型） | 待 Coder 落地 |
| 3 | Cocos Creator 项目模板（目录树 + tsconfig + eslint） | 待 Coder 落地 |
| 4 | 云函数骨架（5.1 节 5 个函数签名） | 待 Coder 落地 |
| 5 | 关卡 JSON Schema 校验工具 | 待 Coder 落地 |
| 6 | CI 流水线配置 | 待 Coder 落地 |
| 7 | 美术 naming guide（6.1-6.3 节） | 完成 |

### 10.2 M2（核心玩法 Demo）启动条件

1. M1 交付物全部通过 review
2. Cocos Creator 3.8.8 项目模板创建完成
3. tsconfig.json strict 模式开启，`tsc --noEmit` 零错误
4. 类型定义骨架落地
5. CI 流水线绿灯
6. 云开发环境开通
7. 第 1 关 `Lv_001.json` 样例通过 schema 校验

### 10.3 端到端时序图（关卡加载 → 游玩 → 结算 → 上报）

```
玩家         UIFramework    LevelSystem    CloudBridge   ObstacleSys   WeatherSys    AnalyticsService
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
 │               │               │──initObstacles▶│             │              │                │
 │               │               │──initWeather─▶│              │              ├──init────────▶│
 │               │               │ funnel('lv1') │              │              │                ├─track
 │               │◀──showHUD─────┤               │              │              │                │
 │ 观察地形       │               │ phase=ready   │              │              │                │
 │◀──渲染─────────┤               │               │              │              │                │
 │               │               │               │              │              │                │
 │ 手势操控       │               │               │              │              │                │
 ├─touch────────▶│ onGesture     │               │              │              │                │
 │               │─showFeedback─▶│ dispatch input│              │              │                │
 │               │               │ phase=playing │              │              │                │
 │               │               │──tick────────▶│              │              │                │
 │               │               │               │              │ 状态更新      │                │
 │               │               │               │              │ 碰撞检测      │                │
 │               │               │ dispatch HIT/DODGE          │              │                │
 │               │               │               │              │              │                │
 │ (循环滑行直到结束条件)                                                        │                │
 │               │               │ dispatch REACHED_END / PLAYER_DEAD          │                │
 │               │               │ rateStars()    │              │              │                │
 │               │               │ phase=result   │              │              │                │
 │               │◀──showSettlement───────────────┤              │              │                │
 │               │               │ reportLevel    │              │              │                │
 │               │               ├──────────────▶│              │              │                │
 │               │               │               │ 云函数校验    │              │                │
 │               │               │◀──awardedStars┤              │              │                │
 │               │               │ level_complete 埋点                                          ├─track+flush
 │ 选择下一关     │               │               │              │              │                │
 ├──────────────▶│               │               │              │              │                │
```

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

### 11.2 修订历史

| 版本 | 日期 | 作者 | 变更 |
|---|---|---|---|
| v1.0 | 2026-06-14 | 架构师 Agent | 初版 |
| v2.0 | 2026-06-14 | 架构师 Agent | 按参考文档标准重写，增加完整模块设计/API/数据库/测试/风险 |

---

**文档结束。请 PRD 团队 review，确认通过后归档并启动 M2 阶段。**
