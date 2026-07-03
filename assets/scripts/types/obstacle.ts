export type ObstacleType = 'tree' | 'cliff' | 'hill' | 'skier' | 'snow_pile' | 'ice' | 'hot_spring' | 'rock';
export type ObstacleState = 'normal' | 'warning' | 'danger';

export interface ObstacleConfig {
  readonly type: ObstacleType;
  readonly position: readonly [number, number];
  readonly state: ObstacleState;
  readonly count?: number;
}

export interface ObstacleRuntime {
  readonly id: number;
  readonly type: ObstacleType;
  x: number;
  y: number;
  readonly width: number;
  readonly height: number;
  state: ObstacleState;
  readonly isFatal: boolean;
}
