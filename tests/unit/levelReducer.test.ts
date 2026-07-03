import { levelReducer, LevelState, LevelAction } from '../../assets/scripts/modules/level/levelReducer';

describe('levelReducer', () => {
  const mockConfig = {
    id: 'Lv_001',
    name: 'Test Level',
    chapter: 1,
    terrain: 'snow',
    mode: 'level' as const,
    weather: { type: 'clear' as const, visibility: 1.0, speedMod: 1.0, controlMod: 1.0, windForce: 0, windDir: 0 },
    obstacles: [],
    collectibles: { coins: { count: 0, pattern: 'line' }, powerups: [] },
    goals: { primary: 'reach_end' as const, secondary: {} },
    stars_threshold: { time_3star: 30, time_2star: 45, coins_3star: 10, coins_2star: 5 },
    difficulty: 0.1,
  };

  const initialState: LevelState = {
    phase: 'loading',
    config: mockConfig,
    elapsedMs: 0,
    countdownMs: 60000,
    score: 0,
    coinsCollected: 0,
    obstaclesDodged: 0,
    comboCount: 0,
    comboMax: 0,
    activePowerUps: [],
    result: null,
  };

  it('should handle LOADED', () => {
    const action: LevelAction = { type: 'LOADED', config: mockConfig };
    const result = levelReducer(initialState, action);
    expect(result.phase).toBe('ready');
  });

  it('should handle TICK', () => {
    const playingState = { ...initialState, phase: 'playing' as const };
    const action: LevelAction = { type: 'TICK', dtMs: 1000 };
    const result = levelReducer(playingState, action);
    expect(result.elapsedMs).toBe(1000);
    expect(result.countdownMs).toBe(59000);
  });

  it('should not TICK if not playing', () => {
    const action: LevelAction = { type: 'TICK', dtMs: 1000 };
    const result = levelReducer(initialState, action);
    expect(result.elapsedMs).toBe(0);
  });

  it('should handle COIN_COLLECTED', () => {
    const action: LevelAction = { type: 'COIN_COLLECTED', count: 3 };
    const result = levelReducer(initialState, action);
    expect(result.coinsCollected).toBe(3);
    expect(result.score).toBe(30);
  });

  it('should handle REACHED_END', () => {
    const action: LevelAction = { type: 'REACHED_END' };
    const result = levelReducer(initialState, action);
    expect(result.phase).toBe('result');
    expect(result.result?.win).toBe(true);
  });

  it('should handle PAUSE and RESUME', () => {
    const playingState = { ...initialState, phase: 'playing' as const };
    const pauseResult = levelReducer(playingState, { type: 'PAUSE' });
    expect(pauseResult.phase).toBe('paused');
    const resumeResult = levelReducer(pauseResult, { type: 'RESUME' });
    expect(resumeResult.phase).toBe('playing');
  });
});
