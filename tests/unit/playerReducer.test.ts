import { playerReducer, PlayerState, PlayerAction } from '../../assets/scripts/modules/player/playerReducer';
import { BALANCE } from '../../assets/scripts/config/balance';

describe('playerReducer', () => {
  const initialState: PlayerState = {
    x: 0,
    y: 0,
    speed: BALANCE.PLAYER.BASE_SPEED,
    phase: 'idle',
    hp: 1,
    invincibleMs: 0,
    cooldowns: { jump: 0, dive: 0, brake: 0, boost: 0 },
  };

  it('should handle JUMP from idle', () => {
    const action: PlayerAction = { type: 'JUMP' };
    const result = playerReducer(initialState, action);
    expect(result.phase).toBe('jumping');
    expect(result.y).toBeGreaterThan(0);
  });

  it('should not JUMP if cooldown is active', () => {
    const stateWithCooldown = {
      ...initialState,
      cooldowns: { ...initialState.cooldowns, jump: 500 },
    };
    const action: PlayerAction = { type: 'JUMP' };
    const result = playerReducer(stateWithCooldown, action);
    expect(result.phase).toBe('idle');
  });

  it('should handle MOVE_LEFT', () => {
    const action: PlayerAction = { type: 'MOVE_LEFT' };
    const result = playerReducer(initialState, action);
    expect(result.x).toBeLessThan(0);
    expect(result.phase).toBe('running');
  });

  it('should handle MOVE_RIGHT', () => {
    const action: PlayerAction = { type: 'MOVE_RIGHT' };
    const result = playerReducer(initialState, action);
    expect(result.x).toBeGreaterThan(0);
    expect(result.phase).toBe('running');
  });

  it('should handle HIT', () => {
    const action: PlayerAction = { type: 'HIT', damage: 1 };
    const result = playerReducer(initialState, action);
    expect(result.hp).toBe(0);
    expect(result.invincibleMs).toBeGreaterThan(0);
  });

  it('should handle TICK', () => {
    const runningState = { ...initialState, phase: 'running' as const };
    const action: PlayerAction = {
      type: 'TICK',
      dtMs: 16,
      terrainMod: 1.0,
      weatherMod: 1.0,
      controlMod: 1.0,
    };
    const result = playerReducer(runningState, action);
    expect(result.phase).toBe('running');
  });
});
