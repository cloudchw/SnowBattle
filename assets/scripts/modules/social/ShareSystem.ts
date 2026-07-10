/**
 * 分享系统（纯 TS 单例，参照 CloudBridge）。
 * 封装微信小游戏分享到好友/朋友圈。
 */

export class ShareSystem {
  private static instance: ShareSystem;
  private shareTitle: string = '滑雪大冒险';
  private shareImageUrl: string = '';
  private menuReady = false;

  static getInstance(): ShareSystem {
    if (!ShareSystem.instance) {
      ShareSystem.instance = new ShareSystem();
    }
    return ShareSystem.instance;
  }

  configure(opts: { title?: string; imageUrl?: string }): void {
    if (opts.title !== undefined) this.shareTitle = opts.title;
    if (opts.imageUrl !== undefined) this.shareImageUrl = opts.imageUrl;
  }

  /** 注册分享菜单与默认分享内容；幂等，仅生效一次。 */
  setupShareMenu(): void {
    if (this.menuReady || typeof wx === 'undefined') return;
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    });
    wx.onShareAppMessage(() => ({
      title: this.shareTitle,
      imageUrl: this.shareImageUrl,
    }));
    this.menuReady = true;
  }

  shareToFriend(title?: string, imageUrl?: string): Promise<boolean> {
    return this.doShare('shareAppMessage', title, imageUrl);
  }

  shareToTimeline(title?: string, imageUrl?: string): Promise<boolean> {
    return this.doShare('shareTimeline', title, imageUrl);
  }

  private doShare(api: string, title?: string, imageUrl?: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof wx === 'undefined') {
        resolve(false);
        return;
      }
      wx[api]({
        title: title ?? this.shareTitle,
        imageUrl: imageUrl ?? this.shareImageUrl,
        success: () => resolve(true),
        fail: () => resolve(false),
      });
    });
  }
}

export const shareSystem = ShareSystem.getInstance();
