import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ShareSystem')
export class ShareSystem extends Component {
    @property
    shareTitle: string = '滑雪大冒险';

    @property
    shareImageUrl: string = '';

    start() {
        // 初始化分享系统
        this.setupShare();
    }

    setupShare() {
        console.log('ShareSystem initialized');
        this.setupShareMenu();
    }

    setupShareMenu() {
        if (typeof wx !== 'undefined') {
            // 显示分享按钮
            wx.showShareMenu({
                withShareTicket: true,
                menus: ['shareAppMessage', 'shareTimeline']
            });

            // 监听分享事件
            wx.onShareAppMessage(() => {
                return {
                    title: this.shareTitle,
                    imageUrl: this.shareImageUrl
                };
            });
        }
    }

    shareToFriend(title?: string, imageUrl?: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (typeof wx !== 'undefined') {
                wx.shareAppMessage({
                    title: title || this.shareTitle,
                    imageUrl: imageUrl || this.shareImageUrl,
                    success: () => {
                        console.log('Share success');
                        resolve(true);
                    },
                    fail: (err) => {
                        console.log('Share failed:', err);
                        resolve(false);
                    }
                });
            } else {
                console.log('WeChat API not available');
                resolve(false);
            }
        });
    }

    shareToTimeline(title?: string, imageUrl?: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (typeof wx !== 'undefined') {
                wx.shareTimeline({
                    title: title || this.shareTitle,
                    imageUrl: imageUrl || this.shareImageUrl,
                    success: () => {
                        console.log('Share to timeline success');
                        resolve(true);
                    },
                    fail: (err) => {
                        console.log('Share to timeline failed:', err);
                        resolve(false);
                    }
                });
            } else {
                console.log('WeChat API not available');
                resolve(false);
            }
        });
    }

    update(deltaTime: number) {
        // 分享系统不需要每帧更新
    }
}