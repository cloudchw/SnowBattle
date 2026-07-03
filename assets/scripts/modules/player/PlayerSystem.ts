import { _decorator, Component, Vec2 as CocosVec2 } from 'cc';
import { PlayerState, PlayerAction } from '@types/player';
import { CharacterType, CHARACTER_STATS } from '@types/character';
import { BALANCE } from '@config/balance';
import { eventBus, GameEvent } from '@core/EventBus';
import { clamp } from '@utils/math';

const { ccclass, property } = _decorator;

const initialState: PlayerState = {
  x: 0,
  y: 0,
  speed: BALANCE.PLAYER.BASE_SPEED,
  phase: 'idle',
  hp: 1,
  invincibleMs: 0,
  cooldowns: { jump: 0, dive: 0, brake: 0, boost: 0 },
};

@ccclass('PlayerSystem')
export class PlayerSystem extends Component {
  private state: PlayerState = { ...initialState };
  private character: CharacterType = 'xiaoming';
  private terrainMod: number = 1.0;
  private weatherMod: number = 1.0;
  private controlMod: number = 1.0;

  init(character: CharacterType): void {
    this.character = character;
    this.state = { ...initialState };
    this.terrainMod = 1.0;
    this.weatherMod = 1.0;
    this.controlMod = CHARACTER_STATS[character].controlMod;
  }

  getState(): Readonly<PlayerState> {
    return this.state;
  }

  getWorldPosition(): CocosVec2 {
    return new CocosVec2(this.state.x, this.state.y);
  }

  applyInput(action: PlayerAction): void {
    this.state = this.reduce(this.state, action);
  }

  tick(dt: number): void {
    const action: PlayerAction = {
      type: 'TICK',
      dtMs: dt,
      terrainMod: this.terrainMod,
      weatherMod: this.weatherMod,
      controlMod: this.controlMod,
    };
    this.state = this.reduce(this.state, action);
  }

  setTerrainMod(mod: number): void {
    this.terrainMod = mod;
  }

  setWeatherMod(mod: number): void {
    this.weatherMod = mod;
  }

  onCollisionResponse(type: 'hit' | 'dodge'): void {
    if (type === 'hit') {
      if (this.state.invincibleMs > 0) return;

      const action: PlayerAction = { type: 'HIT', damage: 1 };
      this.state = this.reduce(this.state, action);

      if (this.state.hp <= 0) {
        eventBus.emit(GameEvent.PLAYER_DEAD, 'obstacle_hit');
      } else {
        eventBus.emit(GameEvent.PLAYER_HIT, 1);
      }
    }
  }

  private reduce(state: PlayerState, action: PlayerAction): PlayerState {
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
          y: Math.max(0, state.y - BALANCE.PLAYER.DIVE_SPEED * (action.dtMs / 1000)),
          cooldowns: { ...state.cooldowns, dive: BALANCE.COOLDOWNS.DIVE },
        };
      }
      case 'MOVE_LEFT': {
        return {
          ...state,
          x: state.x - 50 * this.controlMod,
          phase: state.phase === 'idle' ? 'running' : state.phase,
        };
      }
      case 'MOVE_RIGHT': {
        return {
          ...state,
          x: state.x + 50 * this.controlMod,
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

        const newPhase = newY > 0 ? state.phase : (state.phase === 'jumping' || state.phase === 'diving' ? 'running' : state.phase);

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
}
