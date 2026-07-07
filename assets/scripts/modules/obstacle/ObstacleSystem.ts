import { _decorator, Component, Prefab } from 'cc';
import { ObstacleType, ObstacleConfig, ObstacleRuntime } from '../../types/obstacle';
import { BALANCE } from '../../config/balance';
import { Pool } from '../../core/Pool';
import { Rect } from '../../utils/math';
import { RNG } from '../../utils/rng';

const { ccclass, property } = _decorator;

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

  private prefabConfigs: Map<ObstacleType, ObstaclePrefabConfig> = new Map();

  onLoad() {
    this.prefabConfigs.set('tree', { type: 'tree', prefab: this.treePrefab, width: 40, height: 80, isFatal: true });
    this.prefabConfigs.set('cliff', { type: 'cliff', prefab: this.cliffPrefab, width: 100, height: 30, isFatal: true });
    this.prefabConfigs.set('snow_pile', { type: 'snow_pile', prefab: this.snowPilePrefab, width: 60, height: 40, isFatal: false });
    this.prefabConfigs.set('ice', { type: 'ice', prefab: this.icePrefab, width: 120, height: 20, isFatal: false });
    this.prefabConfigs.set('rock', { type: 'rock', prefab: this.rockPrefab, width: 50, height: 50, isFatal: true });

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
    this.lastSpawnX = obstacles.length > 0 ? obstacles[obstacles.length - 1].position[0] : 0;
  }

  spawnForEndless(difficulty: number, playerX: number): void {
    const spawnX = playerX + window.innerWidth;

    if (spawnX - this.lastSpawnX < this.getSpacing(difficulty)) {
      return;
    }

    const type = this.chooseObstacleType(difficulty);
    const y = this.rng.nextFloat(100, window.innerHeight - 100);
    const runtime = this.createObstacle(type, spawnX, y);
    this.obstacles.push(runtime);
    this.lastSpawnX = spawnX;
  }

  tick(dt: number, playerX: number): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      const distToPlayer = Math.abs(obs.x - playerX);

      if (distToPlayer < BALANCE.OBSTACLE.DANGER_DISTANCE) {
        obs.state = 'danger';
      } else if (distToPlayer < BALANCE.OBSTACLE.WARNING_DISTANCE) {
        obs.state = 'warning';
      } else {
        obs.state = 'normal';
      }

      if (obs.x < playerX - window.innerWidth) {
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
  }

  private createObstacle(type: ObstacleType, x: number, y: number): ObstacleRuntime {
    const config = this.prefabConfigs.get(type);
    const runtime = this.pool.acquire();
    runtime.id = this.nextId++;
    runtime.type = type;
    runtime.x = x;
    runtime.y = y;
    runtime.width = config?.width ?? 40;
    runtime.height = config?.height ?? 40;
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

  private getSpacing(difficulty: number): number {
    const spacing = BALANCE.OBSTACLE.BASE_SPACING - difficulty * 100;
    return Math.max(spacing, BALANCE.OBSTACLE.MIN_SPACING);
  }

  private chooseObstacleType(difficulty: number): ObstacleType {
    const types: ObstacleType[] = ['tree', 'snow_pile', 'cliff', 'rock', 'ice'];
    const weights = [0.4, 0.25, 0.15, 0.15, 0.05];
    const roll = this.rng.next();
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (roll < cumulative) {
        return types[i];
      }
    }
    return 'tree';
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
