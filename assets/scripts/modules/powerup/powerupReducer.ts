import { PowerUpType, POWERUP_SPECS } from '../../types/powerup';

export type ActivePowerUp = {
  readonly type: PowerUpType;
  readonly remainingMs: number;
  readonly charges: number;
};

export type PowerUpState = {
  readonly active: ReadonlyArray<ActivePowerUp>;
};

export type PowerUpAction =
  | { type: 'ACTIVATE'; powerupType: PowerUpType }
  | { type: 'TICK'; dtMs: number }
  | { type: 'USE_CHARGE'; powerupType: PowerUpType }
  | { type: 'EXPIRE'; powerupType: PowerUpType };

export function powerupReducer(state: PowerUpState, action: PowerUpAction): PowerUpState {
  switch (action.type) {
    case 'ACTIVATE': {
      const spec = POWERUP_SPECS[action.powerupType];
      const existing = state.active.find(a => a.type === action.powerupType);

      if (existing) {
        if (spec.duration > 0) {
          return {
            ...state,
            active: state.active.map(a =>
              a.type === action.powerupType
                ? { ...a, remainingMs: spec.duration }
                : a
            ),
          };
        } else {
          return {
            ...state,
            active: state.active.map(a =>
              a.type === action.powerupType
                ? { ...a, charges: a.charges + spec.charges }
                : a
            ),
          };
        }
      }

      return {
        ...state,
        active: [...state.active, {
          type: action.powerupType,
          remainingMs: spec.duration,
          charges: spec.charges,
        }],
      };
    }
    case 'TICK': {
      const newActive = state.active
        .map(a => ({
          ...a,
          remainingMs: a.remainingMs > 0 ? Math.max(0, a.remainingMs - action.dtMs) : 0,
        }))
        .filter(a => a.remainingMs > 0 || a.charges > 0);

      return { ...state, active: newActive };
    }
    case 'USE_CHARGE': {
      return {
        ...state,
        active: state.active.map(a =>
          a.type === action.powerupType
            ? { ...a, charges: Math.max(0, a.charges - 1) }
            : a
        ).filter(a => a.charges > 0 || a.remainingMs > 0),
      };
    }
    case 'EXPIRE': {
      return {
        ...state,
        active: state.active.filter(a => a.type !== action.powerupType),
      };
    }
    default:
      return state;
  }
}
