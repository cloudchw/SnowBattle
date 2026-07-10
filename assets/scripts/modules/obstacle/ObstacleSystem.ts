import { _decorator, Component, Prefab, view } from 'cc';
import { ObstacleType, ObstacleConfig, ObstacleRuntime } from '../../types/obstacle';
import { BALANCE } from '../../config/balance';
import { Pool } from '../../core/Pool';
import { Rect } from '../../utils/math';
import { RNG } from '../../utils/rng';
import {
  chooseObstaclePosition,
  chooseObstacleType,
  OBSTACLE_GROUND_Y,
  obstacleSpawnSpacing,
  shouldSpawnObstacle,
} from './obstacleSpawner';

const { ccclass, property } = _decorator;

const FALLBACK_VIEW_W = 960;

interface ObstaclePrefabConfig {
  type: ObstacleType;
  prefab: Prefab;
  width: number;
  height: number;
  isFatal: boolean;
}

@ccclass('ObstacleSystem')
export class ObstacleSystem extends Component {
  @property(Prefab) treePrefab: Prefab = null!;
  @property(Prefab) cliffPrefab: Prefab = null!;
  @property(Prefab) snowPilePrefab: Prefab = null!;
  @property(Prefab) icePrefab: Prefab = null!;
  @property(Prefab) rockPrefab: Prefab = null!;

  private obstacles: ObstacleRuntime[] = [];
  private pool!: Pool<ObstacleRuntime>;
  private nextId: number = 0;
  private rng: RNG = new RNG(12345);
  private lastSpawnX: number = 0;
  private nextSpawnSpacing: number = 0;

  private prefabConfigs: Map<ObstacleType, ObstaclePrefabConfig> = new Map();

  onLoad() {
    this.prefabConfigs.set('tree', { type: 'tree', prefab: this.treePrefab, width: 40, height: 80, isFatal: true });
    this.prefabConfigs.set('cliff', { type: 'cliff', prefab: this.cliffPrefab, width: 100, height: 30, isFatal: true });
    this.prefabConfigs.set('snow_pile', { type: 'snow_pile', prefab: this.snowPilePrefab, width: 60, height: 40, isFatal: false });
    this.prefabConfigs.set('ice', { type: 'ice', prefab: this.icePrefab, width: 120, height: 20, isFatal: false });
    this.prefabConfigs.set('rock', { type: 'rock', prefab: this.rockPrefab, width: 50, height: 50, isFatal: true });
    // skier 无独立 Prefab（渲染由 GameRenderer 按 spriteKey 处理），此处仅提供碰撞框与致命性。
    this.prefabConfigs.set('skier', { type: 'skier', prefab: null!, width: 40, height: 80, isFatal: true });

    this.pool = new Pool<ObstacleRuntime>(
      () => this.createRawObstacle(),
      (obs) => this.resetObstacle(obs),
      20
    );
  }

  initFromConfig(obstacles: ReadonlyArray<ObstacleConfig>): void {
    this.clear();
    obstacles.forEach(config => {
      const runtime = this.createObstacle(config.type, config.position[0], config.position[1]);
      runtime.state = config.state;
      this.obstacles.push(runtime);
    });
    const last = this.obstacles[this.obstacles.length - 1];
    this.lastSpawnX = last ? last.x : 0;
  }

  spawnForEndless(difficulty: number, playerX: number, playerSpeed: number = BALANCE.PLAYER.BASE_SPEED): void {
    const spawnX = playerX + this.viewportWidth();

    if (!shouldSpawnObstacle(this.lastSpawnX, spawnX, difficulty, playerSpeed, this.nextSpawnSpacing)) {
      return;
    }

    const type = chooseObstacleType(difficulty, () => this.rng.next());
    const [x, y] = chooseObstaclePosition(spawnX, difficulty, () => this.rng.next());
    const runtime = this.createObstacle(type, x, y);
    this.obstacles.push(runtime);
    this.lastSpawnX = x;
    this.nextSpawnSpacing = obstacleSpawnSpacing(difficulty, () => this.rng.next(), playerSpeed);
  }

  tick(dt: number, playerX: number): void {
    void dt;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (!obs) continue;

      const distToPlayer = Math.abs(obs.x - playerX);

      if (distToPlayer < BALANCE.OBSTACLE.DANGER_DISTANCE) {
        obs.state = 'danger';
      } else if (distToPlayer < BALANCE.OBSTACLE.WARNING_DISTANCE) {
        obs.state = 'warning';
      } else {
        obs.state = 'normal';
      }

      if (obs.x < playerX - this.viewportWidth()) {
        this.obstacles.splice(i, 1);
        this.pool.release(obs);
      }
    }
  }

  checkAllCollisions(playerBounds: Rect): ObstacleRuntime | null {
    for (const obs of this.obstacles) {
      const obsBounds: Rect = {
        x: obs.x - obs.width / 2,
        y: obs.y - obs.height / 2,
        width: obs.width,
        height: obs.height,
      };

      if (this.rectIntersects(playerBounds, obsBounds)) {
        return obs;
      }
    }
    return null;
  }

  checkPerfectDodges(playerX: number, playerY: number): number {
    let count = 0;
    for (const obs of this.obstacles) {
      if (obs.state === 'danger') {
        const dist = Math.sqrt(
          Math.pow(obs.x - playerX, 2) + Math.pow(obs.y - playerY, 2)
        );
        if (dist < BALANCE.OBSTACLE.PERFECT_DODGE_DISTANCE * 10) {
          count++;
        }
      }
    }
    return count;
  }

  getObstacles(): ReadonlyArray<ObstacleRuntime> {
    return this.obstacles;
  }

  clear(): void {
    this.obstacles.forEach(obs => this.pool.release(obs));
    this.obstacles = [];
    this.lastSpawnX = 0;
    this.nextSpawnSpacing = 0;
  }

  private createObstacle(type: ObstacleType, x: number, groundY: number): ObstacleRuntime {
    const config = this.prefabConfigs.get(type);
    const runtime = this.pool.acquire();
    runtime.id = this.nextId++;
    runtime.type = type;
    runtime.x = x;
    runtime.width = config?.width ?? 40;
    runtime.height = config?.height ?? 40;
    runtime.y = this.centerYFromGroundY(groundY, runtime.height);
    runtime.state = 'normal';
    runtime.isFatal = config?.isFatal ?? true;
    return runtime;
  }

  private createRawObstacle(): ObstacleRuntime {
    return {
      id: 0,
      type: 'tree',
      x: 0,
      y: 0,
      width: 40,
      height: 80,
      state: 'normal',
      isFatal: true,
    };
  }

  private resetObstacle(obs: ObstacleRuntime): void {
    obs.state = 'normal';
    obs.x = 0;
    obs.y = 0;
  }

  private centerYFromGroundY(groundY: number, height: number): number {
    return (groundY === OBSTACLE_GROUND_Y ? OBSTACLE_GROUND_Y : groundY) + height / 2;
  }

  private viewportWidth(): number {
    const w = view.getVisibleSize().width;
    return w > 0 ? w : FALLBACK_VIEW_W;
  }

  private rectIntersects(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
}
