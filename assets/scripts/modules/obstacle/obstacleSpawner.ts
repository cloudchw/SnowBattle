import { ObstacleType } from '../../types/obstacle';
import { BALANCE } from '../../config/balance';

export function shouldSpawnObstacle(
  lastSpawnX: number,
  currentX: number,
  difficulty: number,
): boolean {
  const spawnX = currentX + (typeof window !== 'undefined' ? window.innerWidth : 1920);
  const spacing = BALANCE.OBSTACLE.BASE_SPACING - difficulty * BALANCE.OBSTACLE.SPACING_DECAY_PER_1000M;
  const minSpacing = Math.max(spacing, BALANCE.OBSTACLE.MIN_SPACING);
  return spawnX - lastSpawnX >= minSpacing;
}

export function chooseObstacleType(
  difficulty: number,
  rng: () => number,
): ObstacleType {
  const types: ObstacleType[] = ['tree', 'snow_pile', 'cliff', 'rock', 'ice'];
  const weights = [0.4, 0.25, 0.15, 0.15, 0.05];
  const roll = rng();
  let cumulative = 0;
  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) {
      return types[i];
    }
  }
  return 'tree';
}

export function chooseObstaclePosition(
  spawnX: number,
  difficulty: number,
  rng: () => number,
): [number, number] {
  const minY = 100;
  const maxY = (typeof window !== 'undefined' ? window.innerHeight : 1080) - 100;
  const y = minY + rng() * (maxY - minY);
  return [spawnX, y];
}
