import { ObstacleType } from '../../types/obstacle';
import { BALANCE } from '../../config/balance';

export const OBSTACLE_GROUND_Y = 0;

const JUMP_RECOVERY_BUFFER = 96;
const RANDOM_SPACING_VARIANCE = 180;

/**
 * 判断是否应在 spawnX 处生成新障碍物。
 * 纯函数：候选生成点 spawnX 由调用方（ObstacleSystem）算好（= playerX + viewport）后注入，
 * 本模块不读取任何平台全局对象（window/view）。
 */
export function shouldSpawnObstacle(
  lastSpawnX: number,
  spawnX: number,
  difficulty: number,
  playerSpeed: number = BALANCE.PLAYER.BASE_SPEED,
  requiredSpacing?: number,
): boolean {
  const spacing = requiredSpacing ?? obstacleSpawnSpacing(difficulty, () => 0, playerSpeed);
  return spawnX - lastSpawnX >= spacing;
}

export function obstacleSpawnSpacing(
  difficulty: number,
  rng: () => number,
  playerSpeed: number = BALANCE.PLAYER.BASE_SPEED,
): number {
  const jumpRecoveryDistance = playerSpeed * (BALANCE.COOLDOWNS.JUMP / 1000);
  const jumpableSpacing = Math.max(BALANCE.OBSTACLE.MIN_SPACING, jumpRecoveryDistance + JUMP_RECOVERY_BUFFER);
  const difficultySpacing = BALANCE.OBSTACLE.BASE_SPACING - difficulty * BALANCE.OBSTACLE.SPACING_DECAY_PER_1000M;
  const baseSpacing = Math.max(jumpableSpacing, difficultySpacing);
  return baseSpacing + rng() * RANDOM_SPACING_VARIANCE;
}

/**
 * 按架构文档 3.4「无尽模式生成规则」的权重选择障碍物类型：
 * 树木 40% / 悬崖 15% / 雪堆 20% / 其他滑雪者 15% / 冰面 10%。
 * rock（落石）仍可由关卡配置放置，但不参与无尽随机生成。
 */
export function chooseObstacleType(
  difficulty: number,
  rng: () => number,
): ObstacleType {
  void difficulty;
  const types: ObstacleType[] = ['tree', 'cliff', 'snow_pile', 'skier', 'ice'];
  const weights = [0.4, 0.15, 0.2, 0.15, 0.1];
  const roll = rng();
  let cumulative = 0;
  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i] ?? 0;
    if (roll < cumulative) {
      return types[i] ?? 'tree';
    }
  }
  return 'tree';
}

export function chooseObstaclePosition(
  spawnX: number,
  difficulty: number,
  rng: () => number,
): [number, number] {
  void difficulty;
  void rng;
  return [spawnX, OBSTACLE_GROUND_Y];
}
