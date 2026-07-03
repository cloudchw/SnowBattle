import { ObstacleRuntime, ObstacleState } from '@types/obstacle';
import { BALANCE } from '@config/balance';

export function updateObstacleState(
  obstacle: ObstacleRuntime,
  playerDistance: number,
): ObstacleRuntime {
  let newState: ObstacleState = 'normal';

  if (playerDistance < BALANCE.OBSTACLE.DANGER_DISTANCE) {
    newState = 'danger';
  } else if (playerDistance < BALANCE.OBSTACLE.WARNING_DISTANCE) {
    newState = 'warning';
  }

  if (newState === obstacle.state) {
    return obstacle;
  }

  return {
    ...obstacle,
    state: newState,
  };
}

export function getObstacleBounds(obstacle: ObstacleRuntime): { x: number; y: number; width: number; height: number } {
  return {
    x: obstacle.x - obstacle.width / 2,
    y: obstacle.y - obstacle.height / 2,
    width: obstacle.width,
    height: obstacle.height,
  };
}
