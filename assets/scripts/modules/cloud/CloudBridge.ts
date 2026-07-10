import { LevelResult } from '../../types/level';
import { PlayerSave } from '../../types/player';
import { AnalyticsEvent } from '../../types/analytics';

export interface RankEntry {
  uid: string;
  nickname: string;
  avatar?: string;
  score: number;
  rank: number;
}

/** wx.cloud.callFunction 成功回调载荷的最小形状。 */
interface WxCallFunctionResult<T> {
  result: T;
}

export class CloudBridge {
  private static instance: CloudBridge;
  private uid: string = '';

  static getInstance(): CloudBridge {
    if (!CloudBridge.instance) {
      CloudBridge.instance = new CloudBridge();
    }
    return CloudBridge.instance;
  }

  async login(): Promise<{ uid: string; token: string }> {
    if (typeof wx === 'undefined') {
      this.uid = 'mock_user_' + Date.now();
      return { uid: this.uid, token: 'mock_token' };
    }

    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'login',
        success: (res: WxCallFunctionResult<{ uid: string; token: string }>) => {
          this.uid = res.result.uid;
          resolve(res.result);
        },
        fail: () => {
          this.uid = 'fallback_user';
          resolve({ uid: this.uid, token: 'fallback_token' });
        },
      });
    });
  }

  async reportLevel(result: LevelResult): Promise<{ ok: boolean; awardedStars: number }> {
    if (typeof wx === 'undefined') {
      return { ok: true, awardedStars: result.stars };
    }

    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'reportLevel',
        data: { result, clientVersion: result.clientVersion },
        success: (res: WxCallFunctionResult<{ ok: boolean; awardedStars: number }>) => resolve(res.result),
        fail: () => resolve({ ok: false, awardedStars: 0 }),
      });
    });
  }

  async getRanking(scope: 'global' | 'friends', limit: number = 50): Promise<RankEntry[]> {
    if (typeof wx === 'undefined') {
      return [];
    }

    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'getRanking',
        data: { scope, limit },
        success: (res: WxCallFunctionResult<{ entries: RankEntry[] }>) => resolve(res.result.entries || []),
        fail: () => resolve([]),
      });
    });
  }

  async reportAnalytics(events: ReadonlyArray<AnalyticsEvent>): Promise<{ ok: boolean }> {
    if (typeof wx === 'undefined') {
      return { ok: true };
    }

    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'reportAnalytics',
        data: { events, clientVersion: 1 },
        success: () => resolve({ ok: true }),
        fail: () => resolve({ ok: false }),
      });
    });
  }

  async syncPlayerSave(save: PlayerSave): Promise<{ ok: boolean }> {
    if (typeof wx === 'undefined') {
      return { ok: true };
    }

    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'syncPlayerSave',
        data: { save },
        success: () => resolve({ ok: true }),
        fail: () => resolve({ ok: false }),
      });
    });
  }

  async loadPlayerSave(): Promise<PlayerSave | null> {
    if (typeof wx === 'undefined') {
      return null;
    }

    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'login',
        success: (res: WxCallFunctionResult<{ save?: PlayerSave | null }>) => {
          resolve(res.result.save || null);
        },
        fail: () => resolve(null),
      });
    });
  }

  getUid(): string {
    return this.uid;
  }
}

export const cloudBridge = CloudBridge.getInstance();
