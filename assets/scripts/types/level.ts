import type { ObstacleConfig } from './obstacle';
import type { WeatherConfig } from './weather';
import type { PowerUpType } from './powerup';

export interface LevelConfig {
  readonly id: string;
  readonly name: string;
  readonly chapter: number;
  readonly terrain: string;
  readonly mode: 'level' | 'endless';
  readonly weather: WeatherConfig;
  readonly obstacles: ReadonlyArray<ObstacleConfig>;
  readonly collectibles: {
    readonly coins: { readonly count: number; readonly pattern: string };
    readonly powerups: ReadonlyArray<PowerUpConfig>;
  };
  readonly goals: {
    readonly primary: 'reach_end' | 'survive_time' | 'collect_coins';
    readonly secondary: Record<string, number>;
  };
  readonly stars_threshold: {
    readonly time_3star: number;
    readonly time_2star: number;
    readonly coins_3star: number;
    readonly coins_2star: number;
  };
  readonly difficulty: number;
}

export type FailReason = 'obstacle_hit' | 'cliff_fall' | 'other_skier_hit' | 'avalanche_buried';

export interface LevelResult {
  readonly levelId: string;
  readonly success: boolean;
  readonly stars: 0 | 1 | 2 | 3;
  readonly timeUsedMs: number;
  readonly coinsCollected: number;
  readonly obstaclesDodged: number;
  readonly comboMax: number;
  readonly failReason?: FailReason;
  readonly timestamp: number;
  readonly clientVersion: number;
}
