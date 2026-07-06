# 《滑雪大冒险》（Snow Battle）系统架构设计文档

| 字段 | 值 |
|---|---|
| 文档版本 | **v3.1（2.5D / 团结引擎版）** |
| 创建日期 | 2026-06-14（v2.0）/ 2026-07-06（v3.1） |
| 依赖 PRD | `doc/product/prd.md` v3.1 |
| 文档状态 | **待评审** |
| 变更摘要 | 引擎 Cocos Creator→**团结引擎 Tuanjie**；语言 TS→**C#**；范式 函数式Reducer→**Unity MonoBehaviour 组件式**；视角保持 **2.5D 等距**；物理 自研→**团结引擎（2.5D 简化）** |

> **与 v3.0（真3D）的区别**：v3.0 用真 3D 第三人称跟随 + PhysX 刚体滑雪；v3.1 回归 **2.5D 等距固定视角 + 简化物理（车道+Trigger）**，降低性能/工期风险，玩法保留 v2.1 的手势操控。

---

## 0. 文档元信息

### 0.1 与 v2.0 的差异

| 维度 | v2.0（Cocos） | **v3.1（团结引擎）** |
|---|---|---|
| 引擎 | Cocos Creator 3.8.8 | **团结引擎 Tuanjie Engine** |
| 编程范式 | 函数式 Reducer | **Unity MonoBehaviour 组件式** |
| 渲染 | 2D 贴图 | **URP + 3D 模型 + 等距相机** |
| 物理 | 自研网格+触发器 | **团结 Collider/Trigger（2.5D 简化）** |
| 视角 | 2.5D 等距（2D 模拟） | **2.5D 等距（真 3D 模型 + 固定相机角度）** |
| 模块通信 | EventBus + 单例 | **C# 事件 + ScriptableObject + 单例 Manager** |

### 0.2 决策记录（ADR）

| # | 决策 | 选择 | 理由 |
|---|---|---|---|
| ADR-01 | 引擎 | **团结引擎 1.9.3** | 3D 渲染让 2.5D 更立体 + 国内小游戏支持 |
| ADR-02 | 渲染 | **URP** | 性能/画质平衡 |
| ADR-03 | 视角 | **2.5D 等距固定** | 保留策略性，规避真 3D 复杂度 |
| ADR-04 | 物理 | **2.5D 简化（车道+Trigger）** | 不用完整 PhysX 刚体，降低复杂度 |
| ADR-05 | 范式 | **MonoBehaviour 组件式** | 契合 Unity 生态 |
| ADR-06 | 后端 | 微信云开发（不变） | — |
| ADR-07 | 关卡分发 | 主包1-3章+CDN（不变） | — |
| ADR-08 | 操控 | 手势（不变） | 2.5D 适合手势 |

---

## 1. 总体架构

### 1.1 系统全景图

```
┌──────────────────────────────────────────────────────────────────┐
│          客户端层（团结引擎 Tuanjie / C# / URP / 2.5D 等距）       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │ InputMgr │→│PlayerCtrl│→│ObstacleMgr│ │WeatherCtrl│ │UIManager││
│  │(手势)    │ │(车道控制 │ │(3D模型+  │ │(粒子+后处 │ │(UGUI)  ││
│  │          │ │ +动画)   │ │ Trigger) │ │ 理)       │ │        ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘│
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐                │
│  │ LevelMgr │ │CollectMgr│ │ IsoCamera(等距)  │                │
│  │(关卡状态)│ │(金币/道具│ │ (固定角度俯视3D) │                │
│  └──────────┘ └──────────┘ └──────────────────┘                │
│        │                                                          │
│  ┌─────▼──────────────────────────────────────┐                  │
│  │  CloudBridge + AnalyticsService（C# 单例）   │                  │
│  └─────┬──────────────────────────┬───────────┘                  │
└────────┼──────────────────────────┼──────────────────────────────┘
         │ wx.cloud.callFunction    │ wx.cloud.downloadFile
┌────────▼──────────────────────────▼──────────────────────────────┐
│          云端层（微信云开发 CloudBase，与 v2.0 一致）              │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈

| 维度 | 选型 |
|---|---|
| 引擎 | **团结引擎 Tuanjie Engine** |
| 渲染 | **URP**（3D 模型 + 等距相机） |
| 语言 | **C#** |
| 物理 | **团结 Collider/Trigger（2.5D 简化）** |
| 视角 | **等距相机**（正交或固定角度透视） |
| UI | **UGUI** |
| 资源 | **Resources / Addressables** |
| 后端 | 微信云开发（不变） |

---

## 2. 项目结构（团结引擎）

```
SnowBattle/
├── Assets/
│   ├── Scenes/                # Boot / Main / MainMenu (.unity)
│   ├── Scripts/
│   │   ├── Core/              # GameApp, IsoCamera, Scheduler
│   │   ├── Player/            # PlayerController（车道+动画）
│   │   ├── Obstacle/          # ObstacleManager, ObstacleTrigger
│   │   ├── Weather/           # WeatherController（粒子+Volume）
│   │   ├── Collectible/       # CollectibleManager
│   │   ├── Level/             # LevelManager（关卡状态机）
│   │   ├── UI/                # UGUI HUD/菜单
│   │   ├── Cloud/             # CloudBridge（微信云）
│   │   ├── Analytics/         # 埋点
│   │   └── Types/             # C# 数据类型
│   ├── Prefabs/               # 角色/障碍/金币/UI 预制体
│   ├── Models/                # 3D 模型（低面，等距视角用）
│   ├── Animations/            # 角色动画
│   ├── Materials/             # URP 材质
│   ├── ParticleSystems/       # 雪/风/特效
│   ├── Resources/
│   │   └── levels/ch1_3/      # 关卡 JSON（复用 v2.1）
│   └── ScriptableObjects/     # 配置（角色/道具/平衡）
├── Packages/
├── ProjectSettings/
└── cloud-functions/           # 微信云函数（复用）
```

---

## 3. 核心模块

### 3.1 等距相机（**2.5D 核心**）

```csharp
public class IsoCamera : MonoBehaviour {
    public Transform target;          // 跟随玩家
    public Vector3 offset = new Vector3(0, 10, -10);  // 等距俯视角度
    public float followSpeed = 5f;

    void LateUpdate() {
        var pos = target.position + offset;
        transform.position = Vector3.Lerp(transform.position, pos, followSpeed * Time.deltaTime);
        // 固定旋转（等距角度，如 X=45°）
        transform.rotation = Quaternion.Euler(45, 0, 0);
    }
}
```

### 3.2 PlayerController（**2.5D 车道控制**）

```csharp
public class PlayerController : MonoBehaviour {
    [SerializeField] private float speed = 10f;
    [SerializeField] private float laneWidth = 2f;   // 车道宽度
    [SerializeField] private Animator animator;

    private int currentLane = 1;   // -1/0/1 三车道，或连续
    private float yVelocity;       // 跳跃垂直速度

    void Update() {
        // 前进（z 轴）
        transform.position += Vector3.forward * speed * Time.deltaTime;
        // 车道插值（左右移动）
        var targetX = currentLane * laneWidth;
        var pos = transform.position;
        pos.x = Mathf.Lerp(pos.x, targetX, 5f * Time.deltaTime);
        // 跳跃（垂直）
        yVelocity += Physics.gravity.y * Time.deltaTime;
        pos.y += yVelocity * Time.deltaTime;
        if (pos.y < 0) { pos.y = 0; yVelocity = 0; }
        transform.position = pos;
    }

    public void MoveLeft()  { currentLane = Mathf.Max(-1, currentLane - 1); }
    public void MoveRight() { currentLane = Mathf.Min(1, currentLane + 1); }
    public void Jump()      { if (transform.position.y < 0.1f) yVelocity = 8f; }
    public void Dive()      { yVelocity = -8f; }
}
```

### 3.3 ObstacleManager（**3D 模型 + Trigger**）

```csharp
public class ObstacleTrigger : MonoBehaviour {
    public ObstacleType type;
    void OnTriggerEnter(Collider other) {
        if (other.CompareTag("Player"))
            EventBus.OnPlayerHit?.Invoke(type);
    }
}
```

### 3.4 其他模块（C# 重写，职责同 v2.0）

| 模块 | 实现 |
|---|---|
| Weather | **WeatherController + ParticleSystem + Volume（后处理）** |
| Collectible | **CollectibleManager（Prefab + Trigger 收集）** |
| Level | **LevelManager（加载 JSON + 状态机）** |
| UI | **UGUI Canvas** |
| Cloud/Analytics | **C# 静态单例** |
| Input | **InputManager（滑屏手势）** |

---

## 4. 类型系统（**C#，坐标 [x,y] 与 v2.1 兼容**）

```csharp
public enum ObstacleType { Tree, Cliff, Hill, Skier, SnowPile, Ice, HotSpring, Rock }
public enum WeatherType { Clear, LightSnow, Blizzard, Fog, Night, Wind }

[System.Serializable]
public class Obstacle {
    public ObstacleType type;
    public float[] position;   // [x, y]，等距映射到 3D
    public string state;
}

[System.Serializable]
public class LevelConfig {
    public string id, name, terrain;
    public WeatherType weather;
    public List<Obstacle> obstacles;
    public CollectibleConfig collectibles;
    public Goals goals;
    public StarThreshold stars_threshold;
}
```

> **关卡 JSON 与 v2.1 完全兼容**，50 关直接复用。

---

## 5. 后端（**与 v2.0 一致**）

微信云开发：云函数（login/reportLevel/getRanking/getLevelCfg/reportAnalytics）+ 云数据库 + 云存储 CDN。关卡热更：主包 1-3 章，4 章后 CDN。

---

## 6. 性能预算（**2.5D**）

| 指标 | 目标 | 手段 |
|---|---|---|
| 主包 | ≤4MB | 引擎裁剪、ASTC、分包 |
| 总包 | ≤20-25MB | 分包 + Addressables |
| 帧率 | 60FPS（低端30） | LOD、GPU Instancing（障碍/金币）、SRP Batcher |
| Draw Call | ≤80 | 静态/动态批处理 |
| 内存 | ≤300MB | 资源卸载 |

**降级**：高（全特效）/ 中（关后处理）/ 低（降分辨率+关粒子）。

---

## 7. 迁移计划

### 7.1 Cocos 代码

当前 `assets/scripts/`（Cocos/TS）→ 归档 `legacy-cocos/` 或 git 分支。团结项目从零。

### 7.2 复用

| 资产 | 复用 |
|---|---|
| 关卡 JSON（50 关） | ✅ 直接（[x,y] 不变） |
| 云函数 | ✅ 直接 |
| 设计（障碍/道具/角色） | ✅ |
| Cocos TS 代码 | ❌ 弃用 |

### 7.3 里程碑（**~18 周**）

| 阶段 | 周 | 交付 |
|---|---|---|
| M0：PRD+架构审核 | 0 | 本文档 |
| M1：团结项目搭建 | 1-2 | 工程骨架 + 小游戏导出验证 |
| M2：2.5D 核心玩法 Demo | 3-7 | 1 关 2.5D（滑雪+手势+障碍+等距相机） |
| M3：3D 美术资产 | 6-15 | 低面模型/动画/粒子 |
| M4：内测（30 关） | 14-17 | 30 关+全机制+UI |
| M5：提审（50 关） | 17-18 | 全量 |
| M6：上线迭代 | 19+ | 数据驱动 |

---

## 8. 已确认决策（产品负责人已审核确认）

| # | 决策项 | 锁定值 | 落实位置 |
|---|---|---|---|
| 1 | 团结引擎版本 | **Tuanjie 1.9.3** | ADR-01、技术栈表 |
| 2 | 等距相机 | **透视（轻微纵深）** | IsoCamera（camera.orthographic=false） |
| 3 | 物理简化 | **车道 + Trigger** | PlayerController（车道插值）+ ObstacleTrigger |
| 4 | 3D 美术 | **外包** | M1 出美术需求文档，M3 前锁定供应商 |
| 5 | Cocos 旧代码 | **归档 git 分支**（如 `legacy/cocos-2d`） | 迁移计划 7.1 |
| 6 | 资源管理 | **Resources 起步，M2 评估 Addressables** | 关卡 JSON 用 Resources，后续视包体决定 |

---

**文档结束。v3.1 架构已确认，启动 M1（团结项目搭建）。**
