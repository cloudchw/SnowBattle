# 滑雪大冒险 (Snow Battle) - 开发指南

## 环境要求

| 软件 | 版本 | 用途 |
|---|---|---|
| Cocos Creator | **3.8.8 LTS** | 游戏引擎 |
| Node.js | 16+ | 包管理 |
| VS Code | 最新 | 代码编辑 |
| 微信开发者工具 | 最新 | 小游戏预览 |

## 快速开始

### 1. 安装 Cocos Creator 3.8.8

下载地址：https://www.cocos.com/creator-download

选择 **Cocos Creator 3.8.8 LTS** 版本。

### 2. 打开项目

1. 启动 Cocos Creator
2. 选择「打开项目」
3. 选择 `D:\GitHub\SnowBattle` 目录
4. 等待项目导入完成

### 3. 创建场景

在 Cocos Creator 编辑器中：

1. 右键 `assets/scenes` → 「创建」→ 「Scene」
2. 命名为 `Boot`（启动场景）
3. 再创建一个场景 `Main`（主游戏场景）

### 4. 配置 Boot 场景

在 `Boot` 场景中：

1. 创建空节点 `GameApp`
2. 添加组件 `GameApp`（从 `assets/scripts/core/GameApp.ts`）
3. 在 `GameApp` 组件中拖入各子系统节点

### 5. 配置 Main 场景

在 `Main` 场景中：

1. 创建 `Canvas` 节点（UI 根节点）
2. 创建游戏逻辑节点，挂载各 System 组件
3. 创建 UI 节点（HUD、按钮等）
4. 创建 Prefab 节点（障碍物、金币等）

### 6. 运行游戏

1. 在 Cocos Creator 中打开 `Boot` 场景
2. 点击顶部「播放」按钮
3. 游戏在浏览器中运行

## 项目结构

```
snow-battle/
├── assets/
│   ├── scripts/
│   │   ├── types/          # 类型定义（8个文件）
│   │   ├── config/         # 游戏配置
│   │   ├── core/           # 核心系统
│   │   ├── modules/        # 业务模块（12个子模块）
│   │   ├── store/          # 全局状态
│   │   └── utils/          # 工具函数
│   ├── scenes/             # 场景文件
│   ├── resources/          # 动态加载资源
│   │   └── levels/ch1_3/   # 关卡配置
│   ├── prefabs/            # 预制体
│   ├── textures/           # 贴图
│   ├── audio/              # 音频
│   └── animations/         # 动画
├── cloud-functions/        # 云函数
├── tests/                  # 测试
└── tools/                  # 工具
```

## 开发流程

### M2 阶段（当前）

**目标**：1 个可玩 Demo，含核心玩法

**已完成**：
- ✅ 项目结构搭建
- ✅ TypeScript 类型定义
- ✅ 核心模块实现
- ✅ 1 个关卡配置（Lv_001）

**待完成**：
- ❌ Cocos Creator 场景搭建
- ❌ Prefab 创建（障碍物、金币、UI）
- ❌ 动画配置
- ❌ 音效集成
- ❌ 真机调试

### 创建 Prefab

1. 在 `assets/prefabs/` 下创建预制体
2. 挂载对应的组件脚本
3. 配置 Sprite、Animation 等

### 添加关卡

1. 在 `assets/resources/levels/ch1_3/` 下创建 JSON 文件
2. 参考 `Lv_001.json` 格式
3. 使用 `validateLevelConfig()` 验证

## 核心模块说明

| 模块 | 文件 | 职责 |
|---|---|---|
| InputSystem | `modules/input/InputSystem.ts` | 手势识别 |
| PlayerSystem | `modules/player/PlayerSystem.ts` | 玩家状态机 |
| ObstacleSystem | `modules/obstacle/ObstacleSystem.ts` | 障碍物管理 |
| WeatherSystem | `modules/weather/WeatherSystem.ts` | 天气系统 |
| ScoringSystem | `modules/scoring/ScoringSystem.ts` | 计分系统 |
| LevelSystem | `modules/level/LevelSystem.ts` | 关卡系统 |
| UIFramework | `modules/ui/UIFramework.ts` | UI 管理 |
| CloudBridge | `modules/cloud/CloudBridge.ts` | 云服务 |
| AnalyticsService | `modules/analytics/AnalyticsService.ts` | 埋点 |

## 构建微信小游戏

1. 选择「项目」→「构建发布」
2. 发布平台选择「微信小游戏」
3. 填写 AppID（测试可用空）
4. 点击「构建」
5. 用微信开发者工具打开 `build/wechatgame/`

## 调试技巧

### 浏览器调试
- 打开 Chrome DevTools
- 查看 Console 输出
- 使用 Network 面板监控云函数调用

### 真机调试
1. 微信开发者工具 → 「真机调试」
2. 扫码预览

### 性能分析
- Cocos Creator → 「性能分析器」
- 关注 FPS、内存、Draw Call

## 常见问题

### Q: 项目打不开？
A: 确保使用 Cocos Creator 3.8.8 LTS 版本。

### Q: TypeScript 报错？
A: 确保 `tsconfig.json` 存在且 `strict: true`。

### Q: 场景为空？
A: 需要在编辑器中手动创建节点和组件。

## 下一步

1. 在 Cocos Creator 中创建场景
2. 创建 Prefab（障碍物、金币、角色）
3. 配置动画和音效
4. 真机测试
5. 优化性能

## 参考文档

- [Cocos Creator 3.8 文档](https://docs.cocos.com/creator/3.8/manual/zh/)
- [微信小游戏开发指南](https://developers.weixin.qq.com/minigame/dev/guide/)
- [项目架构文档](ARCHITECTURE.md)
- [产品需求文档](PRD.md)
