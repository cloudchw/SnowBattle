/* eslint-disable @typescript-eslint/no-explicit-any */
// 事件总线承载异构载荷（各 GameEvent 的参数形状不同），保留 any 以兼容任意回调签名与 emit 实参。
// 这是核心基础设施的边界妥协，非业务 any；具体类型安全由各 emit / 回调站点自行保证。

export enum GameEvent {
  PLAYER_JUMP = 'player_jump',
  PLAYER_DIVE = 'player_dive',
  PLAYER_MOVE_LEFT = 'player_move_left',
  PLAYER_MOVE_RIGHT = 'player_move_right',
  PLAYER_BRAKE = 'player_brake',
  PLAYER_BOOST = 'player_boost',
  PLAYER_HIT = 'player_hit',
  PLAYER_DEAD = 'player_dead',
  PLAYER_LAND = 'player_land',
  LEVEL_START = 'level_start',
  LEVEL_COMPLETE = 'level_complete',
  LEVEL_FAIL = 'level_fail',
  COIN_COLLECTED = 'coin_collected',
  POWERUP_COLLECTED = 'powerup_collected',
  POWERUP_EXPIRED = 'powerup_expired',
  WEATHER_CHANGE = 'weather_change',
  SCORE_UPDATE = 'score_update',
  COMBO_UPDATE = 'combo_update',
  OBSTACLE_DODGED = 'obstacle_dodged',
  UI_SHOW = 'ui_show',
  UI_HIDE = 'ui_hide',
}

type EventCallback = (...args: any[]) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<GameEvent, EventCallback[]> = new Map();

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on(event: GameEvent, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: GameEvent, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: GameEvent, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(...args));
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = EventBus.getInstance();
