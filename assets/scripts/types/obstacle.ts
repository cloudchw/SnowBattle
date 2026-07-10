export type ObstacleType = 'tree' | 'cliff' | 'hill' | 'skier' | 'snow_pile' | 'ice' | 'hot_spring' | 'rock';
export type ObstacleState = 'normal' | 'warning' | 'danger';

export interface ObstacleConfig {
  readonly type: ObstacleType;
  readonly position: readonly [number, number];
  readonly state: ObstacleState;
  readonly count?: number;
}

export interface ObstacleRuntime {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  state: ObstacleState;
  isFatal: boolean;
}
