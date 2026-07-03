import { LevelConfig, FailReason } from '@types/level';

export type LevelPhase = 'loading' | 'ready' | 'playing' | 'paused' | 'result';

export type LevelState = {
  readonly phase: LevelPhase;
  readonly config: LevelConfig;
  readonly elapsedMs: number;
  readonly countdownMs: number;
  readonly score: number;
  readonly coinsCollected: number;
  readonly obstaclesDodged: number;
  readonly comboCount: number;
  readonly comboMax: number;
  readonly activePowerUps: ReadonlyArray<{ type: string; remainingMs: number }>;
  readonly result: { stars: 0|1|2|3; win: boolean; failReason?: FailReason } | null;
};

export type LevelAction =
  | { type: 'LOADED'; config: LevelConfig }
  | { type: 'TICK'; dtMs: number }
  | { type: 'PLAYER_HIT'; damage: number }
  | { type: 'PLAYER_DEAD'; cause: FailReason }
  | { type: 'COIN_COLLECTED'; count: number }
  | { type: 'OBSTACLE_DODGED' }
  | { type: 'COMBO_INCREMENT' }
  | { type: 'COMBO_BREAK' }
  | { type: 'POWERUP_COLLECTED'; powerupType: string }
  | { type: 'POWERUP_EXPIRED'; powerupType: string }
  | { type: 'REACHED_END' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SETTLE' };

export function levelReducer(state: LevelState, action: LevelAction): LevelState {
  switch (action.type) {
    case 'LOADED':
      return {
        ...state,
        phase: 'ready',
        config: action.config,
      };
    case 'TICK':
      if (state.phase !== 'playing') return state;
      return {
        ...state,
        elapsedMs: state.elapsedMs + action.dtMs,
        countdownMs: state.countdownMs > 0 ? Math.max(0, state.countdownMs - action.dtMs) : state.countdownMs,
      };
    case 'PLAYER_HIT':
      return state;
    case 'PLAYER_DEAD':
      return {
        ...state,
        phase: 'result',
        result: { stars: 0, win: false, failReason: action.cause },
      };
    case 'COIN_COLLECTED':
      return {
        ...state,
        coinsCollected: state.coinsCollected + action.count,
        score: state.score + action.count * 10,
      };
    case 'OBSTACLE_DODGED':
      return {
        ...state,
        obstaclesDodged: state.obstaclesDodged + 1,
        comboCount: state.comboCount + 1,
        comboMax: Math.max(state.comboMax, state.comboCount + 1),
        score: state.score + 10 * (1 + state.comboCount * 0.1),
      };
    case 'COMBO_INCREMENT':
      return {
        ...state,
        comboCount: state.comboCount + 1,
        comboMax: Math.max(state.comboMax, state.comboCount + 1),
      };
    case 'COMBO_BREAK':
      return {
        ...state,
        comboCount: 0,
      };
    case 'REACHED_END':
      return {
        ...state,
        phase: 'result',
        result: { stars: 1, win: true },
      };
    case 'PAUSE':
      return {
        ...state,
        phase: 'paused',
      };
    case 'RESUME':
      return {
        ...state,
        phase: 'playing',
      };
    case 'SETTLE':
      return state;
    default:
      return state;
  }
}
