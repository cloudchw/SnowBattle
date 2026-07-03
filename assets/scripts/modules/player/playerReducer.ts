import { PlayerState, PlayerAction, PlayerPhase } from '../../types/player';
import { BALANCE } from '../../config/balance';
import { clamp } from '../../utils/math';

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'JUMP': {
      if (state.cooldowns.jump > 0) return state;
      if (state.phase !== 'running' && state.phase !== 'idle') return state;
      return {
        ...state,
        phase: 'jumping',
        y: state.y + BALANCE.PLAYER.JUMP_HEIGHT,
        cooldowns: { ...state.cooldowns, jump: BALANCE.COOLDOWNS.JUMP },
      };
    }
    case 'DIVE': {
      if (state.cooldowns.dive > 0) return state;
      if (state.phase !== 'jumping') return state;
      return {
        ...state,
        phase: 'diving',
        y: Math.max(0, state.y - BALANCE.PLAYER.DIVE_SPEED * 0.016),
        cooldowns: { ...state.cooldowns, dive: BALANCE.COOLDOWNS.DIVE },
      };
    }
    case 'MOVE_LEFT': {
      return {
        ...state,
        x: state.x - 50,
        phase: state.phase === 'idle' ? 'running' : state.phase,
      };
    }
    case 'MOVE_RIGHT': {
      return {
        ...state,
        x: state.x + 50,
        phase: state.phase === 'idle' ? 'running' : state.phase,
      };
    }
    case 'BRAKE': {
      if (state.cooldowns.brake > 0) return state;
      return {
        ...state,
        phase: 'braking',
        speed: state.speed * BALANCE.PLAYER.BRAKE_DECEL,
        cooldowns: { ...state.cooldowns, brake: BALANCE.COOLDOWNS.BRAKE },
      };
    }
    case 'BOOST': {
      if (state.cooldowns.boost > 0) return state;
      return {
        ...state,
        phase: 'boosting',
        speed: Math.min(state.speed * BALANCE.PLAYER.BOOST_ACCEL, BALANCE.PLAYER.MAX_SPEED),
        cooldowns: { ...state.cooldowns, boost: BALANCE.COOLDOWNS.BOOST },
      };
    }
    case 'TICK': {
      const speedMod = action.terrainMod * action.weatherMod;
      const newSpeed = clamp(state.speed * speedMod, 50, BALANCE.PLAYER.MAX_SPEED);
      const newY = state.phase === 'jumping' || state.phase === 'diving'
        ? Math.max(0, state.y - 200 * (action.dtMs / 1000))
        : 0;

      const newPhase: PlayerPhase = newY > 0 ? state.phase :
        (state.phase === 'jumping' || state.phase === 'diving' ? 'running' : state.phase);

      const newCooldowns = {
        jump: Math.max(0, state.cooldowns.jump - action.dtMs),
        dive: Math.max(0, state.cooldowns.dive - action.dtMs),
        brake: Math.max(0, state.cooldowns.brake - action.dtMs),
        boost: Math.max(0, state.cooldowns.boost - action.dtMs),
      };

      const newInvincibleMs = Math.max(0, state.invincibleMs - action.dtMs);

      return {
        ...state,
        speed: newSpeed,
        y: newY,
        phase: newPhase,
        cooldowns: newCooldowns,
        invincibleMs: newInvincibleMs,
      };
    }
    case 'HIT': {
      return {
        ...state,
        hp: state.hp - action.damage,
        invincibleMs: BALANCE.PLAYER.INVINCIBLE_DURATION,
        phase: 'invincible',
      };
    }
    case 'LAND': {
      return {
        ...state,
        y: 0,
        phase: 'running',
      };
    }
    default:
      return state;
  }
}
