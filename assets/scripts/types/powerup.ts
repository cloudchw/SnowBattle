export type PowerUpType = 'shield' | 'speed' | 'magnet' | 'ice_pick' | 'parachute' | 'flare' | 'snow_plow';

export interface PowerUpConfig {
  readonly type: PowerUpType;
  readonly position: readonly [number, number];
}

export interface PowerUpSpec {
  readonly type: PowerUpType;
  readonly displayName: string;
  readonly duration: number;
  readonly charges: number;
  readonly description: string;
}

export const POWERUP_SPECS: Readonly<Record<PowerUpType, PowerUpSpec>> = {
  shield:     { type: 'shield',     displayName: '护盾',     duration: 0,    charges: 1, description: '抵挡一次致命碰撞' },
  speed:      { type: 'speed',      displayName: '加速器',   duration: 5000, charges: 1, description: '临时提升速度50%' },
  magnet:     { type: 'magnet',     displayName: '磁铁',     duration: 8000, charges: 1, description: '自动吸引附近金币' },
  ice_pick:   { type: 'ice_pick',   displayName: '冰镐',     duration: 10000,charges: 1, description: '冰面上不失控' },
  parachute:  { type: 'parachute',  displayName: '降落伞',   duration: 0,    charges: 3, description: '跳跃后缓慢下落' },
  flare:      { type: 'flare',      displayName: '照明弹',   duration: 5000, charges: 1, description: '消除雾/暴风雪效果' },
  snow_plow:  { type: 'snow_plow',  displayName: '雪铲',     duration: 0,    charges: 1, description: '清除前方雪堆' },
};
