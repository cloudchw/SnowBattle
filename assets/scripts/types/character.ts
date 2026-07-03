export type CharacterType = 'xiaoming' | 'snow_leopard' | 'ice_spirit' | 'storm_knight' | 'polar_explorer' | 'ski_master';

export interface CharacterStats {
  readonly speedMod: number;
  readonly jumpMod: number;
  readonly controlMod: number;
  readonly specialAbility: string;
}

export const CHARACTER_STATS: Readonly<Record<CharacterType, CharacterStats>> = {
  xiaoming:         { speedMod: 1.0, jumpMod: 1.0, controlMod: 1.0, specialAbility: '无' },
  snow_leopard:     { speedMod: 1.15,jumpMod: 1.0, controlMod: 0.9, specialAbility: '冲刺无敌2s' },
  ice_spirit:       { speedMod: 0.9, jumpMod: 1.3, controlMod: 1.0, specialAbility: '跳跃高度+30%' },
  storm_knight:     { speedMod: 1.0, jumpMod: 0.9, controlMod: 1.2, specialAbility: '转向灵敏+20%' },
  polar_explorer:   { speedMod: 1.1, jumpMod: 1.1, controlMod: 1.1, specialAbility: '全属性+10%' },
  ski_master:       { speedMod: 1.0, jumpMod: 1.0, controlMod: 1.0, specialAbility: '完美操控加分×2' },
};
