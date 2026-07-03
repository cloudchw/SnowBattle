import { BALANCE } from '../../config/balance';

export type ScoringState = {
  readonly score: number;
  readonly coinsCollected: number;
  readonly obstaclesDodged: number;
  readonly comboCount: number;
  readonly comboMax: number;
  readonly perfectDodges: number;
};

export type ScoringAction =
  | { type: 'DISTANCE_TICK'; meters: number }
  | { type: 'COIN_COLLECTED'; count: number }
  | { type: 'OBSTACLE_DODGED'; distance: number }
  | { type: 'COMBO_INCREMENT' }
  | { type: 'COMBO_BREAK' }
  | { type: 'POWERUP_USED' };

export function scoringReducer(state: ScoringState, action: ScoringAction): ScoringState {
  switch (action.type) {
    case 'DISTANCE_TICK':
      return {
        ...state,
        score: state.score + BALANCE.SCORING.DISTANCE_SCORE * action.meters,
      };
    case 'COIN_COLLECTED':
      return {
        ...state,
        score: state.score + BALANCE.SCORING.COIN_SCORE * action.count,
        coinsCollected: state.coinsCollected + action.count,
      };
    case 'OBSTACLE_DODGED': {
      const isPerfect = action.distance < BALANCE.OBSTACLE.PERFECT_DODGE_DISTANCE;
      const comboMultiplier = 1 + state.comboCount * BALANCE.SCORING.COMBO_MULTIPLIER;
      const baseScore = isPerfect ? BALANCE.SCORING.PERFECT_DODGE_SCORE : 10;
      return {
        ...state,
        score: state.score + Math.floor(baseScore * comboMultiplier),
        obstaclesDodged: state.obstaclesDodged + 1,
        comboCount: state.comboCount + 1,
        comboMax: Math.max(state.comboMax, state.comboCount + 1),
        perfectDodges: isPerfect ? state.perfectDodges + 1 : state.perfectDodges,
      };
    }
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
    case 'POWERUP_USED':
      return {
        ...state,
        score: state.score + BALANCE.SCORING.POWERUP_USE_SCORE,
      };
    default:
      return state;
  }
}

export function calculateComboMultiplier(comboCount: number): number {
  return 1.0 + comboCount * BALANCE.SCORING.COMBO_MULTIPLIER;
}

export function isPerfectDodge(obstacleDistance: number): boolean {
  return obstacleDistance < BALANCE.OBSTACLE.PERFECT_DODGE_DISTANCE;
}
