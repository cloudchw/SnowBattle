# 快速参考卡

## 场景结构一览

```
Boot 场景
├── Canvas
│   ├── Background
│   └── GameApp
│       ├── LevelSystem
│       ├── PlayerSystem
│       ├── ObstacleSystem
│       │   ├── treePrefab (拖入)
│       │   ├── cliffPrefab (拖入)
│       │   ├── snowPilePrefab (拖入)
│       │   ├── icePrefab (拖入)
│       │   └── rockPrefab (拖入)
│       ├── WeatherSystem
│       ├── CollectibleSystem
│       ├── PowerUpSystem
│       ├── ScoringSystem
│       ├── CharacterSystem
│       ├── InputSystem
│       └── UIFramework
│           ├── HUD
│           │   ├── CountdownLabel
│           │   ├── CoinsLabel
│           │   ├── ScoreLabel
│           │   ├── ComboLabel
│           │   ├── HPLabel
│           │   ├── WeatherLabel
│           │   └── DistanceLabel
│           └── Buttons
│               ├── PauseButton
│               └── ResumeButton
```

## 组件绑定表

| 节点 | 组件 | 字段 | 绑定目标 |
|---|---|---|---|
| GameApp | GameApp | levelSystem | LevelSystem 节点 |
| GameApp | GameApp | playerSystem | PlayerSystem 节点 |
| GameApp | GameApp | obstacleSystem | ObstacleSystem 节点 |
| GameApp | GameApp | weatherSystem | WeatherSystem 节点 |
| GameApp | GameApp | collectibleSystem | CollectibleSystem 节点 |
| GameApp | GameApp | powerupSystem | PowerUpSystem 节点 |
| GameApp | GameApp | scoringSystem | ScoringSystem 节点 |
| GameApp | GameApp | characterSystem | CharacterSystem 节点 |
| GameApp | GameApp | inputSystem | InputSystem 节点 |
| GameApp | GameApp | uiFramework | UIFramework 节点 |
| ObstacleSystem | ObstacleSystem | treePrefab | obstacle_tree Prefab |
| ObstacleSystem | ObstacleSystem | cliffPrefab | obstacle_cliff Prefab |
| ObstacleSystem | ObstacleSystem | snowPilePrefab | obstacle_snow_pile Prefab |
| ObstacleSystem | ObstacleSystem | icePrefab | obstacle_ice Prefab |
| ObstacleSystem | ObstacleSystem | rockPrefab | obstacle_rock Prefab |
| UIFramework | UIFramework | countdownLabel | CountdownLabel 节点 |
| UIFramework | UIFramework | coinsLabel | CoinsLabel 节点 |
| UIFramework | UIFramework | scoreLabel | ScoreLabel 节点 |
| UIFramework | UIFramework | comboLabel | ComboLabel 节点 |
| UIFramework | UIFramework | hpLabel | HPLabel 节点 |
| UIFramework | UIFramework | weatherLabel | WeatherLabel 节点 |
| UIFramework | UIFramework | distanceLabel | DistanceLabel 节点 |

## Prefab 创建清单

| Prefab 名称 | 占位颜色 | 尺寸 |
|---|---|---|
| obstacle_tree | 绿色 | 40 x 80 |
| obstacle_cliff | 红色 | 100 x 30 |
| obstacle_snow_pile | 白色 | 60 x 40 |
| obstacle_ice | 蓝色 | 120 x 20 |
| obstacle_rock | 灰色 | 50 x 50 |
| coin_gold | 黄色 | 20 x 20 |
| player_xiaoming | 红色 | 40 x 80 |

## 节点创建步骤

### 创建节点
1. 右键父节点
2. 选择「创建」
3. 选择节点类型：
   - Empty Node: 空节点
   - 2D Object → Sprite: 带 Sprite 的节点
   - 2D Object → Label: 带 Label 的节点
   - 2D Object → Canvas: Canvas 节点

### 添加组件
1. 选中节点
2. 在「属性检查器」底部点击「添加组件」
3. 搜索组件名称
4. 点击添加

### 绑定引用
1. 选中带有组件的节点
2. 在「属性检查器」中找到组件字段
3. 将目标节点/资源从「层级管理器」或「资源管理器」拖入字段

## 项目设置

| 设置项 | 值 |
|---|---|
| 启动场景 | Boot |
| 设计分辨率 | 1920 x 1080 |
| 适配高度 | ✅ |
| 适配宽度 | ❌ |

## 运行测试

1. 点击顶部「播放」按钮
2. 游戏在浏览器中启动
3. 打开控制台查看输出

## 保存场景

- `Ctrl + S` 保存当前场景
- `Ctrl + Shift + S` 另存为

## 快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl + Z` | 撤销 |
| `Ctrl + Y` | 重做 |
| `Ctrl + S` | 保存 |
| `F` | 聚焦选中节点 |
| `W` | 移动工具 |
| `E` | 旋转工具 |
| `R` | 缩放工具 |
| `Delete` | 删除节点 |
