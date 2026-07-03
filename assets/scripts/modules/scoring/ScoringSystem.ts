import { _decorator, Component } from 'cc';
import { ScoringState, ScoringAction } from './scoreReducer';
import { BALANCE } from '../../config/balance';
import { eventBus, GameEvent } from '../../core/EventBus';

const { ccclass, property } = _decorator;

const initialScoringState: ScoringState = {
  score: 0,
  coinsCollected: 0,
  obstaclesDodged: 0,
  comboCount: 0,
  comboMax: 0,
  perfectDodges: 0,
};

@ccclass('ScoringSystem')
export class ScoringSystem extends Component {
  private state: ScoringState = { ...initialScoringState };

  reset(): void {
    this.state = { ...initialScoringState };
  }

  getState(): Readonly<ScoringState> {
    return this.state;
  }

  onDistanceTick(meters: number): void {
    this.state = this.reduce(this.state, { type: 'DISTANCE_TICK', meters });
  }

  onCoinCollected(count: number): void {
    this.state = this.reduce(this.state, { type: 'COIN_COLLECTED', count });
    eventBus.emit(GameEvent.COIN_COLLECTED, count, this.state.coinsCollected);
  }

  onObstacleDodged(distance: number): void {
    this.state = this.reduce(this.state, { type: 'OBSTACLE_DODGED', distance });
    eventBus.emit(GameEvent.OBSTACLE_DODGED, distance);
  }

  onPowerUpUsed(): void {
    this.state = this.reduce(this.state, { type: 'POWERUP_USED' });
  }

  onComboBreak(): void {
    this.state = this.reduce(this.state, { type: 'COMBO_BREAK' });
    eventBus.emit(GameEvent.COMBO_UPDATE, this.state.comboCount);
  }

  getScore(): number {
    return this.state.score;
  }

  getCombo(): number {
    return this.state.comboCount;
  }

  private reduce(state: ScoringState, action: ScoringAction): ScoringState {
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
}
