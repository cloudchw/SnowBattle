import type { CharacterType } from './character';
import type { PowerUpType } from './powerup';

export interface PlayerSave {
  readonly uid: string;
  readonly nickname: string;
  readonly avatar: string;
  readonly coins: number;
  readonly unlockedLevels: number;
  readonly stars: Readonly<Record<number, 0 | 1 | 2 | 3>>;
  readonly unlockedCharacters: ReadonlyArray<CharacterType>;
  readonly equippedCharacter: CharacterType;
  readonly tutorialCompleted: boolean;
  readonly dailyChallenge: { readonly date: string; readonly score: number };
  readonly settings: { readonly bgmVolume: number; readonly sfxVolume: number; readonly vibration: boolean };
  readonly lastLogin: number;
  readonly totalPlayTime: number;
  readonly lastSyncTs: number;
}

export type PlayerPhase = 'idle' | 'running' | 'jumping' | 'diving' | 'braking' | 'boosting' | 'invincible' | 'dead';

export interface PlayerState {
  readonly x: number;
  readonly y: number;
  readonly speed: number;
  readonly phase: PlayerPhase;
  readonly hp: number;
  readonly invincibleMs: number;
  readonly cooldowns: Readonly<{ jump: number; dive: number; brake: number; boost: number }>;
}

export type PlayerAction =
  | { type: 'JUMP' }
  | { type: 'DIVE' }
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'BRAKE' }
  | { type: 'BOOST' }
  | { type: 'TICK'; dtMs: number; terrainMod: number; weatherMod: number; controlMod: number }
  | { type: 'HIT'; damage: number }
  | { type: 'LAND' }
  | { type: 'COOLDOWN_TICK'; dtMs: number };
