# 旧文件清理说明

## ✅ 处理结果（2026-07-03 执行完毕）

全部 38 个旧版扁平脚本已处理，`assets/scripts/` 根目录已清空，代码统一收归 `modules/` 等按域组织的目录。

**第一批（26 个「已迁移」文件）**：确认对应新模块已实现后删除。

**第二批（12 个「待迁移」文件）**：逐个读码评估后分类处理——

- ✅ 迁移 6 个真实模块到新架构：
  - `AudioManager` → `modules/audio/`（保留 Component，有 AudioClip/AudioSource 资源依赖）
  - `AdSystem` → `modules/ads/`（改为纯 TS 单例，并修复 onClose 重复注册导致多次回调的 bug）
  - `IAPSystem` → `modules/economy/`（改为纯 TS 单例）
  - `ShareSystem` → `modules/social/`（改为纯 TS 单例）
  - `MainMenuUI` → `modules/ui/`（保留 Component，有按钮节点依赖）
  - `PerformanceMonitor` → `modules/monitoring/`（保留 Component，需每帧 update 采样）
- 🗑 删除 6 个无价值文件：
  - `GameTester`（空壳假测试，且引用已被删除的旧类 SkierController/GameManager 等）
  - `SubmissionSystem` / `LaunchMonitor` / `StoreAssetsPreparation`（方法体几乎全为 console.log 占位）
  - `TerrainGenerator`（Prefab + 定时器范式与新架构 gameLoop 的无尽生成冲突，迁移即孤儿）
  - `CompatibilityTester`（设备判断逻辑已被 `utils/perf.ts` 的 `detectDeviceTier` 完整覆盖且更准确）

> 以下为原始迁移映射，保留作为历史记录。

## 需要删除的旧文件

以下文件是旧版扁平结构的产物，与新架构不兼容，建议删除：

### 障碍物相关
- `Accelerator.ts` → 已迁移至 `modules/powerup/PowerUpSystem.ts`
- `CliffObstacle.ts` → 已迁移至 `modules/obstacle/ObstacleSystem.ts`
- `ObstacleBase.ts` → 已迁移至 `types/obstacle.ts`
- `ObstacleSpawner.ts` → 已迁移至 `modules/obstacle/obstacleSpawner.ts`
- `OtherSkierObstacle.ts` → 已迁移至 `modules/obstacle/ObstacleSystem.ts`
- `SlopeObstacle.ts` → 已迁移至 `modules/obstacle/ObstacleSystem.ts`
- `TreeObstacle.ts` → 已迁移至 `modules/obstacle/ObstacleSystem.ts`

### 收集物相关
- `Coin.ts` → 已迁移至 `modules/collectible/CollectibleSystem.ts`
- `CoinSpawner.ts` → 已迁移至 `modules/collectible/CollectibleSystem.ts`

### 道具相关
- `EnergyPack.ts` → 已迁移至 `modules/powerup/PowerUpSystem.ts`
- `Magnet.ts` → 已迁移至 `modules/powerup/PowerUpSystem.ts`
- `PowerUpBase.ts` → 已迁移至 `types/powerup.ts`
- `PowerUpSpawner.ts` → 已迁移至 `modules/collectible/CollectibleSystem.ts`
- `Shield.ts` → 已迁移至 `modules/powerup/PowerUpSystem.ts`

### 角色相关
- `CharacterBase.ts` → 已迁移至 `types/character.ts`
- `CharacterStats.ts` → 已迁移至 `types/character.ts`
- `CharacterUnlockSystem.ts` → 已迁移至 `modules/character/CharacterSystem.ts`
- `SkierController.ts` → 已迁移至 `modules/player/PlayerSystem.ts`

### 系统相关
- `GameManager.ts` → 已迁移至 `core/GameApp.ts`
- `AudioManager.ts` → 待迁移至 `modules/audio/AudioManager.ts`
- `CollisionDetector.ts` → 已迁移至 `modules/obstacle/collisionDetector.ts`
- `TerrainGenerator.ts` → 待迁移至 `modules/terrain/TerrainSystem.ts`
- `WeatherSystem.ts` → 已迁移至 `modules/weather/WeatherSystem.ts`

### UI 相关
- `GameOverUI.ts` → 已迁移至 `modules/ui/UIFramework.ts`
- `GameplayUI.ts` → 已迁移至 `modules/ui/UIFramework.ts`
- `MainMenuUI.ts` → 待迁移至 `modules/ui/MainMenuUI.ts`

### 网络相关
- `AdSystem.ts` → 待迁移至 `modules/ads/AdSystem.ts`
- `IAPSystem.ts` → 待迁移至 `modules/economy/IAPSystem.ts`
- `LeaderboardSystem.ts` → 已迁移至 `modules/cloud/CloudBridge.ts`
- `ShareSystem.ts` → 待迁移至 `modules/social/ShareSystem.ts`
- `WeChatLogin.ts` → 已迁移至 `modules/cloud/CloudBridge.ts`

### 测试相关
- `CompatibilityTester.ts` → 待迁移至 `tests/`
- `GameTester.ts` → 待迁移至 `tests/`
- `LaunchMonitor.ts` → 待迁移至 `modules/monitoring/`
- `PerformanceMonitor.ts` → 待迁移至 `modules/monitoring/`

### 其他
- `DayNightCycle.ts` → 已整合至 `modules/weather/WeatherSystem.ts`
- `StoreAssetsPreparation.ts` → 待迁移至 `modules/store/`
- `SubmissionSystem.ts` → 待迁移至 `modules/cloud/`

## 清理命令

```bash
# 删除旧的障碍物文件
rm assets/scripts/Accelerator.ts
rm assets/scripts/CliffObstacle.ts
rm assets/scripts/ObstacleBase.ts
rm assets/scripts/ObstacleSpawner.ts
rm assets/scripts/OtherSkierObstacle.ts
rm assets/scripts/SlopeObstacle.ts
rm assets/scripts/TreeObstacle.ts

# 删除旧的收集物文件
rm assets/scripts/Coin.ts
rm assets/scripts/CoinSpawner.ts

# 删除旧的道具文件
rm assets/scripts/EnergyPack.ts
rm assets/scripts/Magnet.ts
rm assets/scripts/PowerUpBase.ts
rm assets/scripts/PowerUpSpawner.ts
rm assets/scripts/Shield.ts

# 删除旧的角色文件
rm assets/scripts/CharacterBase.ts
rm assets/scripts/CharacterStats.ts
rm assets/scripts/CharacterUnlockSystem.ts
rm assets/scripts/SkierController.ts

# 删除旧的系统文件
rm assets/scripts/GameManager.ts
rm assets/scripts/CollisionDetector.ts
rm assets/scripts/TerrainGenerator.ts
rm assets/scripts/WeatherSystem.ts

# 删除旧的UI文件
rm assets/scripts/GameOverUI.ts
rm assets/scripts/GameplayUI.ts
rm assets/scripts/MainMenuUI.ts

# 删除旧的网络文件
rm assets/scripts/AdSystem.ts
rm assets/scripts/IAPSystem.ts
rm assets/scripts/LeaderboardSystem.ts
rm assets/scripts/ShareSystem.ts
rm assets/scripts/WeChatLogin.ts

# 删除旧的测试文件
rm assets/scripts/CompatibilityTester.ts
rm assets/scripts/GameTester.ts
rm assets/scripts/LaunchMonitor.ts
rm assets/scripts/PerformanceMonitor.ts

# 删除其他旧文件
rm assets/scripts/DayNightCycle.ts
rm assets/scripts/StoreAssetsPreparation.ts
rm assets/scripts/SubmissionSystem.ts
```

## 注意事项

1. 删除前请备份重要文件
2. 确认新模块已正确实现后再删除旧文件
3. 如果项目依赖旧文件，需要先修改引用
