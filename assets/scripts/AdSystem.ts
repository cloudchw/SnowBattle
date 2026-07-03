import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AdSystem')
export class AdSystem extends Component {
    @property
    rewardedAdUnitId: string = '';

    @property
    interstitialAdUnitId: string = '';

    private rewardedAd: any = null;
    private interstitialAd: any = null;

    start() {
        // 初始化广告系统
        this.setupAds();
    }

    setupAds() {
        console.log('AdSystem initialized');
        
        if (typeof wx !== 'undefined') {
            // 创建激励视频广告
            if (this.rewardedAdUnitId) {
                this.rewardedAd = wx.createRewardedVideoAd({
                    adUnitId: this.rewardedAdUnitId
                });
                
                this.rewardedAd.onClose((res) => {
                    if (res && res.isEnded) {
                        console.log('Rewarded video ad completed');
                        this.onRewardedAdComplete();
                    } else {
                        console.log('Rewarded video ad closed before completion');
                    }
                });
            }
            
            // 创建插屏广告
            if (this.interstitialAdUnitId) {
                this.interstitialAd = wx.createInterstitialAd({
                    adUnitId: this.interstitialAdUnitId
                });
            }
        }
    }

    showRewardedAd(): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.rewardedAd) {
                this.rewardedAd.show().catch(() => {
                    // 广告加载失败，重新加载
                    this.rewardedAd.load().then(() => {
                        this.rewardedAd.show();
                    });
                });
                
                // 监听广告关闭事件
                this.rewardedAd.onClose((res) => {
                    resolve(res && res.isEnded);
                });
            } else {
                console.log('Rewarded ad not available');
                resolve(false);
            }
        });
    }

    showInterstitialAd() {
        if (this.interstitialAd) {
            this.interstitialAd.show().catch(() => {
                // 广告加载失败，重新加载
                this.interstitialAd.load();
            });
        }
    }

    onRewardedAdComplete() {
        // 激励视频广告完成后的奖励逻辑
        console.log('Granting reward for watching ad');
        // 这里可以调用游戏管理器来发放奖励
    }

    update(deltaTime: number) {
        // 广告系统不需要每帧更新
    }
}