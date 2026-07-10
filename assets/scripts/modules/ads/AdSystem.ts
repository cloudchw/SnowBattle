/**
 * 广告系统（纯 TS 单例，参照 CloudBridge）。
 * 封装微信小游戏的激励视频与插屏广告。
 * 无节点/资源依赖，不挂 Component。
 */

/** wx.createRewardedVideoAd 返回句柄的最小形状。 */
interface RewardedVideoAd {
  onClose(cb: (res: { isEnded?: boolean }) => void): void;
  offClose(cb: (res: { isEnded?: boolean }) => void): void;
  show(): Promise<void>;
  load(): Promise<void>;
}

/** wx.createInterstitialAd 返回句柄的最小形状。 */
interface InterstitialAd {
  show(): Promise<void>;
  load(): Promise<void>;
}

export class AdSystem {
  private static instance: AdSystem;

  private rewardedAdUnitId: string = '';
  private interstitialAdUnitId: string = '';
  private rewardedAd: RewardedVideoAd | null = null;
  private interstitialAd: InterstitialAd | null = null;

  static getInstance(): AdSystem {
    if (!AdSystem.instance) {
      AdSystem.instance = new AdSystem();
    }
    return AdSystem.instance;
  }

  /** 配置广告位 ID 并预创建广告实例（wx 环境下）。 */
  configure(opts: { rewardedAdUnitId?: string; interstitialAdUnitId?: string }): void {
    if (opts.rewardedAdUnitId !== undefined) this.rewardedAdUnitId = opts.rewardedAdUnitId;
    if (opts.interstitialAdUnitId !== undefined) this.interstitialAdUnitId = opts.interstitialAdUnitId;
    this.ensureAds();
  }

  private ensureAds(): void {
    if (typeof wx === 'undefined') return;
    if (this.rewardedAdUnitId && !this.rewardedAd) {
      this.rewardedAd = wx.createRewardedVideoAd({ adUnitId: this.rewardedAdUnitId });
    }
    if (this.interstitialAdUnitId && !this.interstitialAd) {
      this.interstitialAd = wx.createInterstitialAd({ adUnitId: this.interstitialAdUnitId });
    }
  }

  /**
   * 展示激励视频广告。
   * resolve(true) 表示用户完整观看、可发放奖励。
   * 修复旧版 onClose 重复注册导致多次回调的问题：每次展示前绑定、回调后解绑。
   */
  showRewardedAd(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof wx === 'undefined' || !this.rewardedAd) {
        resolve(false);
        return;
      }
      const ad = this.rewardedAd;
      const onClose = (res: { isEnded?: boolean }) => {
        ad.offClose(onClose);
        resolve(!!res.isEnded);
      };
      ad.onClose(onClose);
      ad.show().catch(() => {
        ad.load()
          .then(() => ad.show())
          .catch(() => {
            ad.offClose(onClose);
            resolve(false);
          });
      });
    });
  }

  showInterstitialAd(): void {
    if (typeof wx === 'undefined' || !this.interstitialAd) return;
    const ad = this.interstitialAd;
    ad.show().catch(() => {
      ad.load();
    });
  }
}

export const adSystem = AdSystem.getInstance();
