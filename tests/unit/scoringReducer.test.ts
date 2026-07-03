import { scoringReducer, ScoringState, ScoringAction } from '../../assets/scripts/modules/scoring/scoreReducer';

describe('scoringReducer', () => {
  const initialState: ScoringState = {
    score: 0,
    coinsCollected: 0,
    obstaclesDodged: 0,
    comboCount: 0,
    comboMax: 0,
    perfectDodges: 0,
  };

  it('should handle DISTANCE_TICK', () => {
    const action: ScoringAction = { type: 'DISTANCE_TICK', meters: 10 };
    const result = scoringReducer(initialState, action);
    expect(result.score).toBe(10);
  });

  it('should handle COIN_COLLECTED', () => {
    const action: ScoringAction = { type: 'COIN_COLLECTED', count: 5 };
    const result = scoringReducer(initialState, action);
    expect(result.coinsCollected).toBe(5);
    expect(result.score).toBe(50);
  });

  it('should handle OBSTACLE_DODGED', () => {
    const action: ScoringAction = { type: 'OBSTACLE_DODGED', distance: 15 };
    const result = scoringReducer(initialState, action);
    expect(result.obstaclesDodged).toBe(1);
    expect(result.comboCount).toBe(1);
  });

  it('should handle COMBO_BREAK', () => {
    const stateWithCombo = { ...initialState, comboCount: 5 };
    const action: ScoringAction = { type: 'COMBO_BREAK' };
    const result = scoringReducer(stateWithCombo, action);
    expect(result.comboCount).toBe(0);
  });

  it('should calculate combo multiplier correctly', () => {
    const stateWithCombo = { ...initialState, comboCount: 10 };
    const action: ScoringAction = { type: 'OBSTACLE_DODGED', distance: 15 };
    const result = scoringReducer(stateWithCombo, action);
    expect(result.comboCount).toBe(11);
  });
});
