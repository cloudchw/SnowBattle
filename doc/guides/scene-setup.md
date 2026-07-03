# Cocos Creator 场景搭建指南

## 第一步：创建场景

1. 在 Cocos Creator 编辑器中，右键 `assets/scenes` 文件夹
2. 选择「创建」→「Scene」
3. 命名为 `Boot`
4. 双击打开 `Boot` 场景

## 第二步：创建 Boot 场景结构

在 `Boot` 场景中创建以下节点：

### 2.1 创建 Canvas 节点

1. 右键场景根节点 → 「创建」→「2D Object」→「Canvas」
2. Canvas 会自动添加 `cc.Canvas` 和 `cc.Widget` 组件
3. 在 Canvas 属性中设置：
   - Design Resolution: 1920 x 1080
   - Fit Height: ✅ 勾选
   - Fit Width: ❌ 取消勾选

### 2.2 创建 GameApp 节点

1. 右键 Canvas → 「创建」→「Empty Node」
2. 命名为 `GameApp`
3. 在属性检查器中点击「添加组件」→ 搜索 `GameApp` 并添加

### 2.3 创建子系统节点

在 `GameApp` 节点下创建以下子节点：

```
GameApp
├── LevelSystem
├── PlayerSystem
├── ObstacleSystem
├── WeatherSystem
├── CollectibleSystem
├── PowerUpSystem
├── ScoringSystem
├── CharacterSystem
├── InputSystem
└── UIFramework
```

每个节点的操作：
1. 右键 `GameApp` → 「创建」→「Empty Node」
2. 命名为对应名称
3. 在属性检查器中点击「添加组件」→ 搜索对应脚本并添加

### 2.4 绑定组件引用

在 `GameApp` 节点的 `GameApp` 组件属性中，将各子节点拖入对应字段：

| 字段名 | 拖入节点 |
|---|---|
| levelSystem | LevelSystem |
| playerSystem | PlayerSystem |
| obstacleSystem | ObstacleSystem |
| weatherSystem | WeatherSystem |
| collectibleSystem | CollectibleSystem |
| powerupSystem | PowerUpSystem |
| scoringSystem | ScoringSystem |
| characterSystem | CharacterSystem |
| inputSystem | InputSystem |
| uiFramework | UIFramework |

### 2.5 创建 UI 节点

在 `UIFramework` 节点下创建 UI 元素：

```
UIFramework
├── HUD
│   ├── CountdownLabel
│   ├── CoinsLabel
│   ├── ScoreLabel
│   ├── ComboLabel
│   ├── HPLabel
│   ├── WeatherLabel
│   └── DistanceLabel
└── Buttons
    ├── PauseButton
    └── ResumeButton
```

每个 Label 节点的操作：
1. 右键 `UIFramework` → 「创建」→「2D Object」→「Label」
2. 命名为对应名称
3. 在 `Label` 组件中设置：
   - String: 初始文本（如 "60s"、"0"）
   - Font Size: 36
   - Color: 白色
   - Horizontal Align: CENTER
   - Vertical Align: CENTER

### 2.6 绑定 UI 引用

在 `UIFramework` 组件属性中，将各 Label 节点拖入对应字段：

| 字段名 | 拖入节点 |
|---|---|
| countdownLabel | CountdownLabel |
| coinsLabel | CoinsLabel |
| scoreLabel | ScoreLabel |
| comboLabel | ComboLabel |
| hpLabel | HPLabel |
| weatherLabel | WeatherLabel |
| distanceLabel | DistanceLabel |

## 第三步：创建障碍物 Prefab

### 3.1 创建树木障碍物

1. 在 `assets/prefabs/obstacles` 文件夹中右键 → 「创建」→「Prefab」
2. 命名为 `obstacle_tree`
3. 双击打开 Prefab
4. 在 Prefab 根节点添加 `Sprite` 组件
5. 创建一个临时的绿色方块作为占位图
6. 保存 Prefab

### 3.2 创建其他障碍物

重复上述步骤，创建：
- `obstacle_cliff`（红色方块）
- `obstacle_snow_pile`（白色方块）
- `obstacle_ice`（蓝色方块）
- `obstacle_rock`（灰色方块）

### 3.3 绑定 Prefab 到 ObstacleSystem

在 `ObstacleSystem` 节点的组件属性中，将各 Prefab 拖入对应字段：

| 字段名 | 拖入 Prefab |
|---|---|
| treePrefab | obstacle_tree |
| cliffPrefab | obstacle_cliff |
| snowPilePrefab | obstacle_snow_pile |
| icePrefab | obstacle_ice |
| rockPrefab | obstacle_rock |

## 第四步：创建金币 Prefab

1. 在 `assets/prefabs/collectibles` 文件夹中右键 → 「创建」→「Prefab」
2. 命名为 `coin_gold`
3. 双击打开 Prefab
4. 添加 `Sprite` 组件，使用黄色圆形作为占位图
5. 保存 Prefab

## 第五步：创建玩家角色 Prefab

1. 在 `assets/prefabs/characters` 文件夹中右键 → 「创建」→「Prefab」
2. 命名为 `player_xiaoming`
3. 双击打开 Prefab
4. 添加 `Sprite` 组件，使用红色方块作为占位图
5. 保存 Prefab

## 第六步：创建游戏场景

1. 右键 `assets/scenes` → 「创建」→「Scene」
2. 命名为 `Main`
3. 双击打开 `Main` 场景

### 6.1 复制场景结构

从 `Boot` 场景复制以下节点到 `Main` 场景：
- Canvas（包含所有 UI 节点）
- GameApp（包含所有子系统）

### 6.2 添加游戏背景

1. 右键 Canvas → 「创建」→「2D Object」→「Sprite」
2. 命名为 `Background`
3. 在 `Sprite` 组件中设置：
   - Size Mode: CUSTOM
   - Width: 1920
   - Height: 1080
4. 使用白色或浅蓝色作为背景色

### 6.3 添加玩家角色

1. 右键 Canvas → 「创建」→「2D Object」→「Sprite」
2. 命名为 `Player`
3. 在 `Sprite` 组件中设置：
   - Size Mode: CUSTOM
   - Width: 40
   - Height: 80
4. 使用红色作为玩家颜色
5. 将 `Player` 节点位置设置为 (0, 0, 0)

## 第七步：配置场景启动顺序

1. 在 Cocos Creator 中选择「项目」→「项目设置」
2. 选择「项目数据」标签
3. 设置「启动场景」为 `Boot`

## 第八步：运行测试

1. 点击 Cocos Creator 顶部的「播放」按钮
2. 游戏应该在浏览器中启动
3. 检查控制台是否有错误输出

## 调试技巧

### 查看节点树

在「层级管理器」中查看完整的节点树结构。

### 修改属性

在「属性检查器」中修改节点和组件的属性。

### 查看资源

在「资源管理器」中查看和管理项目资源。

### 控制台输出

在「控制台」中查看日志和错误信息。

## 常见问题

### Q: 组件脚本找不到？

A: 确保脚本文件在 `assets/scripts` 目录下，且文件名与类名一致。

### Q: Prefab 无法添加组件？

A: 确保 Prefab 处于编辑状态（双击打开）。

### Q: 场景运行后黑屏？

A: 检查是否有 JavaScript 错误，查看控制台输出。

### Q: UI 不显示？

A: 确保 Canvas 节点存在，且 UI 节点是 Canvas 的子节点。

## 下一步

1. 完成场景搭建后，替换占位图为真实美术资源
2. 添加动画效果
3. 添加音效
4. 真机测试
