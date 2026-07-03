import { PlayerSave } from '@types/player';
import { LevelConfig } from '@types/level';

export type AppAction =
  | { type: 'SET_PLAYER'; player: PlayerSave }
  | { type: 'UPDATE_COINS'; coins: number }
  | { type: 'UNLOCK_LEVEL'; levelId: number }
  | { type: 'SET_STARS'; levelId: number; stars: 0 | 1 | 2 | 3 }
  | { type: 'EQUIP_CHARACTER'; character: string }
  | { type: 'SET_CURRENT_LEVEL'; level: LevelConfig | null }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppState['settings']> };

export interface AppState {
  player: PlayerSave;
  currentLevel: LevelConfig | null;
  settings: {
    bgmVolume: number;
    sfxVolume: number;
    vibration: boolean;
  };
  network: 'online' | 'offline';
}

const defaultPlayer: PlayerSave = {
  uid: '',
  nickname: '玩家',
  avatar: '',
  coins: 0,
  unlockedLevels: 1,
  stars: {},
  unlockedCharacters: ['xiaoming'],
  equippedCharacter: 'xiaoming',
  tutorialCompleted: false,
  dailyChallenge: { date: '', score: 0 },
  settings: { bgmVolume: 0.6, sfxVolume: 0.8, vibration: true },
  lastLogin: Date.now(),
  totalPlayTime: 0,
  lastSyncTs: Date.now(),
};

const initialState: AppState = {
  player: defaultPlayer,
  currentLevel: null,
  settings: { bgmVolume: 0.6, sfxVolume: 0.8, vibration: true },
  network: 'online',
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PLAYER':
      return { ...state, player: action.player };
    case 'UPDATE_COINS':
      return { ...state, player: { ...state.player, coins: action.coins } };
    case 'UNLOCK_LEVEL':
      return {
        ...state,
        player: {
          ...state.player,
          unlockedLevels: Math.max(state.player.unlockedLevels, action.levelId),
        },
      };
    case 'SET_STARS':
      return {
        ...state,
        player: {
          ...state.player,
          stars: {
            ...state.player.stars,
            [action.levelId]: Math.max(state.player.stars[action.levelId] ?? 0, action.stars),
          },
        },
      };
    case 'EQUIP_CHARACTER':
      return {
        ...state,
        player: { ...state.player, equippedCharacter: action.character as any },
      };
    case 'SET_CURRENT_LEVEL':
      return { ...state, currentLevel: action.level };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    default:
      return state;
  }
}
