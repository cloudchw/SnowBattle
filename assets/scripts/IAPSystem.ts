import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('IAPSystem')
export class IAPSystem extends Component {
    @property
    products: any[] = [];

    private purchaseHistory: any[] = [];

    start() {
        // 初始化内购系统
        this.setupIAP();
    }

    setupIAP() {
        console.log('IAPSystem initialized');
        this.loadProducts();
    }

    loadProducts() {
        if (typeof wx !== 'undefined') {
            // 获取商品信息
            wx.getProducts({
                productIds: this.products.map(p => p.id),
                success: (res) => {
                    console.log('Products loaded:', res.products);
                    this.products = res.products;
                },
                fail: (err) => {
                    console.log('Load products failed:', err);
                }
            });
        }
    }

    purchase(productId: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (typeof wx !== 'undefined') {
                wx.requestMidoPayment({
                    productId: productId,
                    success: () => {
                        console.log('Purchase success:', productId);
                        this.purchaseHistory.push({
                            productId: productId,
                            timestamp: Date.now()
                        });
                        this.onPurchaseComplete(productId);
                        resolve(true);
                    },
                    fail: (err) => {
                        console.log('Purchase failed:', err);
                        resolve(false);
                    }
                });
            } else {
                console.log('WeChat API not available');
                resolve(false);
            }
        });
    }

    onPurchaseComplete(productId: string) {
        // 购买完成后的处理逻辑
        console.log('Processing purchase:', productId);
        // 这里可以调用游戏管理器来解锁内容
    }

    restorePurchases(): Promise<any[]> {
        return new Promise((resolve) => {
            // 恢复购买记录
            console.log('Restoring purchases...');
            resolve(this.purchaseHistory);
        });
    }

    isProductPurchased(productId: string): boolean {
        return this.purchaseHistory.some(p => p.productId === productId);
    }

    update(deltaTime: number) {
        // 内购系统不需要每帧更新
    }
}