import type { FailReason } from './level';
import type { PowerUpType } from './powerup';

export type AnalyticsEvent =
  | { readonly name: 'app_launch'; readonly ts: number; readonly clientVersion: string }
  | { readonly name: 'load_complete'; readonly ts: number; readonly durationMs: number }
  | { readonly name: 'tutorial_complete'; readonly ts: number }
  | { readonly name: 'level_start'; readonly ts: number; readonly levelId: string; readonly mode: 'level' | 'endless' }
  | { readonly name: 'level_complete'; readonly ts: number; readonly levelId: string;
      readonly stars: 0|1|2|3; readonly timeUsedMs: number; readonly coinsCollected: number }
  | { readonly name: 'level_fail'; readonly ts: number; readonly levelId: string;
      readonly reason: FailReason; readonly progressPct: number }
  | { readonly name: 'gesture_used'; readonly ts: number; readonly gesture: string; readonly levelId: string }
  | { readonly name: 'powerup_used'; readonly ts: number; readonly powerupType: PowerUpType; readonly levelId: string }
  | { readonly name: 'pause'; readonly ts: number; readonly levelId: string }
  | { readonly name: 'revive_used'; readonly ts: number; readonly levelId: string; readonly via: 'ad' | 'coin' }
  | { readonly name: 'ad_expose'; readonly ts: number; readonly placement: string }
  | { readonly name: 'ad_complete'; readonly ts: number; readonly placement: string };
