import { ObstacleRuntime } from '@types/obstacle';
import { Rect } from '@utils/math';

export type CollisionResult =
  | { hit: false }
  | { hit: true; obstacleType: ObstacleRuntime['type']; isFatal: boolean; position: { x: number; y: number } };

export function checkCollision(
  playerBounds: Rect,
  obstacle: ObstacleRuntime,
): CollisionResult {
  const obsBounds: Rect = {
    x: obstacle.x - obstacle.width / 2,
    y: obstacle.y - obstacle.height / 2,
    width: obstacle.width,
    height: obstacle.height,
  };

  if (rectIntersects(playerBounds, obsBounds)) {
    return {
      hit: true,
      obstacleType: obstacle.type,
      isFatal: obstacle.isFatal,
      position: { x: obstacle.x, y: obstacle.y },
    };
  }

  return { hit: false };
}

export function checkCollisionBatch(
  playerBounds: Rect,
  obstacles: ReadonlyArray<ObstacleRuntime>,
): CollisionResult {
  for (const obs of obstacles) {
    const result = checkCollision(playerBounds, obs);
    if (result.hit) {
      return result;
    }
  }
  return { hit: false };
}

function rectIntersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
