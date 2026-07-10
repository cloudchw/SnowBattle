import {
  chooseObstaclePosition,
  OBSTACLE_GROUND_Y,
  obstacleSpawnSpacing,
  shouldSpawnObstacle,
} from '../../assets/scripts/modules/obstacle/obstacleSpawner';
import { BALANCE } from '../../assets/scripts/config/balance';

describe('obstacleSpawner', () => {
  it('places generated obstacles on the ski ground line', () => {
    const [x, y] = chooseObstaclePosition(960, 0.2, () => 0.75);

    expect(x).toBe(960);
    expect(y).toBe(OBSTACLE_GROUND_Y);
  });

  it('keeps spacing large enough for jump recovery at high speed', () => {
    const speed = BALANCE.PLAYER.MAX_SPEED;
    const minJumpRecoveryDistance = speed * (BALANCE.COOLDOWNS.JUMP / 1000);
    const spacing = obstacleSpawnSpacing(1, () => 0, speed);

    expect(spacing).toBeGreaterThan(minJumpRecoveryDistance);
  });

  it('does not spawn before the required spacing is reached', () => {
    // 第二参数是调用方算好的候选生成点 spawnX（= playerX + viewport），纯函数不再读取视口。
    expect(shouldSpawnObstacle(900, 960, 0, BALANCE.PLAYER.BASE_SPEED, 120)).toBe(false);
    expect(shouldSpawnObstacle(500, 960, 0, BALANCE.PLAYER.BASE_SPEED, 120)).toBe(true);
  });
});
