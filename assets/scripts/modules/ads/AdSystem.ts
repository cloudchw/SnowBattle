/**
 * 广告系统（纯 TS 单例，参照 CloudBridge）。
 * 封装微信小游戏的激励视频与插屏广告。
 * 无节点/资源依赖，不挂 Component。
 */
export class AdSystem {
  private static instance: AdSystem;

  private rewardedAdUnitId: string = '';
  private interstitialAdUnitId: string = '';
  private rewardedAd: any = null;
  private interstitialAd: any = null;

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
      this.rewardedAd = (wx as any).createRewardedVideoAd({ adUnitId: this.rewardedAdUnitId });
    }
    if (this.interstitialAdUnitId && !this.interstitialAd) {
      this.interstitialAd = (wx as any).createInterstitialAd({ adUnitId: this.interstitialAdUnitId });
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
      const onClose = (res: any) => {
        ad.offClose(onClose);
        resolve(!!(res && res.isEnded));
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
    this.interstitialAd.show().catch(() => {
      this.interstitialAd.load();
    });
  }
}

export const adSystem = AdSystem.getInstance();
