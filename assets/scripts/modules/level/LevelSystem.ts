import { _decorator, Component, resources, JsonAsset } from 'cc';
import { LevelConfig, LevelResult, FailReason } from '@types/level';
import { LevelState, LevelPhase, LevelAction, levelReducer } from './levelReducer';
import { rateStars } from './starRating';
import { eventBus, GameEvent } from '@core/EventBus';

const { ccclass, property } = _decorator;

@ccclass('LevelSystem')
export class LevelSystem extends Component {
  private state: LevelState | null = null;
  private levelCache: Map<string, LevelConfig> = new Map();

  getState(): LevelState | null {
    return this.state;
  }

  async startLevel(levelId: string): Promise<void> {
    let config = this.levelCache.get(levelId);

    if (!config) {
      config = await this.loadLevelConfig(levelId);
      if (config) {
        this.levelCache.set(levelId, config);
      }
    }

    if (!config) {
      console.error(`Failed to load level: ${levelId}`);
      return;
    }

    this.state = {
      phase: 'loading',
      config,
      elapsedMs: 0,
      countdownMs: config.goals.secondary.time_limit ? config.goals.secondary.time_limit * 1000 : Infinity,
      score: 0,
      coinsCollected: 0,
      obstaclesDodged: 0,
      comboCount: 0,
      comboMax: 0,
      activePowerUps: [],
      result: null,
    };

    this.state = levelReducer(this.state, { type: 'LOADED', config });
    eventBus.emit(GameEvent.LEVEL_START, levelId, config.mode);
  }

  startEndless(): void {
    const config: LevelConfig = {
      id: 'endless',
      name: '无尽模式',
      chapter: 0,
      terrain: 'endless_snow',
      mode: 'endless',
      weather: { type: 'clear', visibility: 1.0, speedMod: 1.0, controlMod: 1.0, windForce: 0, windDir: 0 },
      obstacles: [],
      collectibles: { coins: { count: 0, pattern: 'line' }, powerups: [] },
      goals: { primary: 'survive_time', secondary: {} },
      stars_threshold: { time_3star: 0, time_2star: 0, coins_3star: 0, coins_2star: 0 },
      difficulty: 0,
    };

    this.state = {
      phase: 'loading',
      config,
      elapsedMs: 0,
      countdownMs: Infinity,
      score: 0,
      coinsCollected: 0,
      obstaclesDodged: 0,
      comboCount: 0,
      comboMax: 0,
      activePowerUps: [],
      result: null,
    };

    this.state = levelReducer(this.state, { type: 'LOADED', config });
    eventBus.emit(GameEvent.LEVEL_START, 'endless', 'endless');
  }

  tick(dt: number): void {
    if (!this.state || this.state.phase !== 'playing') return;

    this.state = levelReducer(this.state, { type: 'TICK', dtMs: dt });
  }

  onPlayerHit(damage: number): void {
    if (!this.state) return;
    this.state = levelReducer(this.state, { type: 'PLAYER_HIT', damage });
  }

  onPlayerDead(cause: FailReason): void {
    if (!this.state) return;
    this.state = levelReducer(this.state, { type: 'PLAYER_DEAD', cause });
    this.settle();
  }

  onCoinCollected(count: number): void {
    if (!this.state) return;
    this.state = levelReducer(this.state, { type: 'COIN_COLLECTED', count });
  }

  onObstacleDodged(): void {
    if (!this.state) return;
    this.state = levelReducer(this.state, { type: 'OBSTACLE_DODGED' });
  }

  onReachedEnd(): void {
    if (!this.state) return;
    this.state = levelReducer(this.state, { type: 'REACHED_END' });
    this.settle();
  }

  pause(): void {
    if (!this.state) return;
    this.state = levelReducer(this.state, { type: 'PAUSE' });
  }

  resume(): void {
    if (!this.state) return;
    this.state = levelReducer(this.state, { type: 'RESUME' });
  }

  private settle(): void {
    if (!this.state) return;

    const stars = rateStars(
      this.state.config,
      this.state.elapsedMs,
      this.state.coinsCollected,
      this.state.config.goals.secondary.time_limit ? this.state.config.goals.secondary.time_limit * 1000 : this.state.elapsedMs,
    );

    this.state = levelReducer(this.state, { type: 'SETTLE' });

    const result: LevelResult = {
      levelId: this.state.config.id,
      success: this.state.result?.win ?? false,
      stars,
      timeUsedMs: this.state.elapsedMs,
      coinsCollected: this.state.coinsCollected,
      obstaclesDodged: this.state.obstaclesDodged,
      comboMax: this.state.comboMax,
      failReason: this.state.result?.failReason,
      timestamp: Date.now(),
      clientVersion: 1,
    };

    if (result.success) {
      eventBus.emit(GameEvent.LEVEL_COMPLETE, result);
    } else {
      eventBus.emit(GameEvent.LEVEL_FAIL, result);
    }
  }

  private async loadLevelConfig(levelId: string): Promise<LevelConfig | null> {
    return new Promise((resolve) => {
      resources.load(`levels/ch1_3/${levelId}`, JsonAsset, (err, asset) => {
        if (err) {
          console.error(`Failed to load level config: ${levelId}`, err);
          resolve(null);
          return;
        }
        resolve(asset.json as LevelConfig);
      });
    });
  }
}
